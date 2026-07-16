//! Card comments, rebuilt on the document model (unification v2).
//!
//! A comment hangs off the card's vault DOCUMENT (`documents.id`), not a kanban
//! row — cards are `.md` documents now. Comments are a cloud feature; the
//! desktop reaches them through the same REST API when the vault is bound.
//!
//! Threading is one level deep: a reply's `parent_id` always points at the ROOT
//! comment of its thread (replying to a reply re-parents to the root). Resolve
//! state lives on the root and folds the whole thread. Reactions are per-user
//! per-emoji toggles.
//!
//! Endpoints:
//!   GET    /api/v1/workspaces/:workspace_id/documents/:document_id/comments
//!   POST   /api/v1/workspaces/:workspace_id/documents/:document_id/comments
//!   PATCH  /api/v1/workspaces/:workspace_id/comments/:comment_id
//!   DELETE /api/v1/workspaces/:workspace_id/comments/:comment_id
//!   POST   /api/v1/workspaces/:workspace_id/comments/:comment_id/reactions
//!   POST   /api/v1/workspaces/:workspace_id/comments/:comment_id/resolve

use std::collections::HashMap;

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::middleware::auth::extract_user;
use crate::AppState;

const MAX_COMMENT: usize = 16_000;
const MAX_EMOJI: usize = 32;

/// Truncate to at most `max` bytes without splitting a UTF-8 char.
fn clamp_str(s: &str, max: usize) -> String {
    if s.len() <= max {
        return s.to_string();
    }
    let mut idx = max;
    while idx > 0 && !s.is_char_boundary(idx) {
        idx -= 1;
    }
    s[..idx].to_string()
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReactionSummary {
    pub emoji: String,
    pub count: i64,
    /// Whether the requesting user reacted with this emoji.
    pub mine: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardComment {
    pub id: String,
    pub document_id: String,
    pub author_user_id: String,
    pub author: Option<String>,
    pub body: String,
    pub parent_id: Option<String>,
    pub resolved_at: Option<String>,
    pub resolved_by: Option<String>,
    pub reactions: Vec<ReactionSummary>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCommentRequest {
    pub body: String,
    /// Root comment id to reply to (one-level threading).
    pub parent_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCommentRequest {
    pub body: String,
}

#[derive(Debug, Deserialize)]
pub struct ReactionRequest {
    pub emoji: String,
}

#[derive(Debug, Deserialize)]
pub struct ResolveRequest {
    pub resolved: bool,
}

const SELECT_COMMENT: &str = r#"SELECT c.id, c.document_id, c.author_user_id, u.username AS author, c.body,
       c.parent_id, CAST(c.resolved_at AS CHAR) AS resolved_at, c.resolved_by,
       CAST(c.created_at AS CHAR) AS created_at, CAST(c.updated_at AS CHAR) AS updated_at
FROM card_comments c
LEFT JOIN users u ON u.id = c.author_user_id"#;

fn row_to_comment(r: &sqlx::mysql::MySqlRow) -> Result<CardComment, AppError> {
    Ok(CardComment {
        id: r.try_get("id")?,
        document_id: r.try_get("document_id")?,
        author_user_id: r.try_get("author_user_id")?,
        author: r.try_get("author")?,
        body: r.try_get("body")?,
        parent_id: r.try_get("parent_id")?,
        resolved_at: r.try_get("resolved_at")?,
        resolved_by: r.try_get("resolved_by")?,
        reactions: Vec::new(),
        created_at: r.try_get("created_at")?,
        updated_at: r.try_get("updated_at")?,
    })
}

/// Attach per-comment reaction summaries (count + whether `user_id` reacted).
async fn attach_reactions(
    pool: &sqlx::Pool<sqlx::MySql>,
    comments: &mut [CardComment],
    user_id: &str,
) -> Result<(), AppError> {
    if comments.is_empty() {
        return Ok(());
    }
    let ids: Vec<String> = comments.iter().map(|c| c.id.clone()).collect();
    let placeholders = vec!["?"; ids.len()].join(",");
    let sql = format!(
        "SELECT comment_id, emoji, COUNT(*) AS n, MAX(user_id = ?) AS mine \
         FROM comment_reactions WHERE comment_id IN ({placeholders}) \
         GROUP BY comment_id, emoji ORDER BY MIN(created_at) ASC"
    );
    let mut q = sqlx::query(&sql).bind(user_id);
    for id in &ids {
        q = q.bind(id);
    }
    let rows = q.fetch_all(pool).await?;
    let mut by_comment: HashMap<String, Vec<ReactionSummary>> = HashMap::new();
    for r in &rows {
        let comment_id: String = r.try_get("comment_id")?;
        let mine: i32 = r.try_get("mine")?;
        by_comment.entry(comment_id).or_default().push(ReactionSummary {
            emoji: r.try_get("emoji")?,
            count: r.try_get("n")?,
            mine: mine != 0,
        });
    }
    for c in comments.iter_mut() {
        if let Some(rs) = by_comment.remove(&c.id) {
            c.reactions = rs;
        }
    }
    Ok(())
}

async fn ensure_document_in_workspace(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    document_id: &str,
) -> Result<(), AppError> {
    let exists: Option<String> =
        sqlx::query_scalar("SELECT id FROM documents WHERE id = ? AND workspace_id = ?")
            .bind(document_id)
            .bind(workspace_id)
            .fetch_optional(pool)
            .await?;
    if exists.is_none() {
        return Err(AppError::NotFound);
    }
    Ok(())
}

/// Load a comment scoped to the workspace or 404.
async fn load_comment(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    comment_id: &str,
) -> Result<sqlx::mysql::MySqlRow, AppError> {
    sqlx::query("SELECT id, document_id, author_user_id, parent_id FROM card_comments WHERE id = ? AND workspace_id = ?")
        .bind(comment_id)
        .bind(workspace_id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound)
}

pub async fn list_comments(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, document_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor", "viewer"]).await?;
    ensure_document_in_workspace(&state.pool, &workspace_id, &document_id).await?;

    let rows = sqlx::query(&format!("{SELECT_COMMENT} WHERE c.document_id = ? ORDER BY c.created_at ASC"))
        .bind(&document_id)
        .fetch_all(&state.pool)
        .await?;
    let mut out = rows.iter().map(row_to_comment).collect::<Result<Vec<_>, _>>()?;
    attach_reactions(&state.pool, &mut out, &user.id).await?;
    Ok(Json(out).into_response())
}

pub async fn create_comment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, document_id)): Path<(String, String)>,
    Json(payload): Json<CreateCommentRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;
    ensure_document_in_workspace(&state.pool, &workspace_id, &document_id).await?;

    let body = clamp_str(payload.body.trim(), MAX_COMMENT);
    if body.is_empty() {
        return Err(AppError::BadRequest("comment cannot be empty".into()));
    }

    // Replies attach to the thread ROOT: replying to a reply re-parents so
    // threading stays one level deep.
    let parent_id = match payload.parent_id.as_deref().filter(|p| !p.is_empty()) {
        None => None,
        Some(pid) => {
            let parent = load_comment(&state.pool, &workspace_id, pid).await?;
            let parent_doc: String = parent.try_get("document_id")?;
            if parent_doc != document_id {
                return Err(AppError::BadRequest("parent comment belongs to another card".into()));
            }
            let grandparent: Option<String> = parent.try_get("parent_id")?;
            Some(grandparent.unwrap_or_else(|| pid.to_string()))
        }
    };

    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO card_comments (id, workspace_id, document_id, author_user_id, body, parent_id) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(&id)
        .bind(&workspace_id)
        .bind(&document_id)
        .bind(&user.id)
        .bind(&body)
        .bind(&parent_id)
        .execute(&state.pool)
        .await?;

    let row = sqlx::query(&format!("{SELECT_COMMENT} WHERE c.id = ?"))
        .bind(&id)
        .fetch_one(&state.pool)
        .await?;
    Ok(Json(row_to_comment(&row)?).into_response())
}

pub async fn update_comment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, comment_id)): Path<(String, String)>,
    Json(payload): Json<UpdateCommentRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;

    let row = load_comment(&state.pool, &workspace_id, &comment_id).await?;
    let author: String = row.try_get("author_user_id")?;
    // Only the author edits their comment (unlike delete, no admin override —
    // moderation is removal, not rewriting someone's words).
    if author != user.id {
        return Err(AppError::Forbidden);
    }

    let body = clamp_str(payload.body.trim(), MAX_COMMENT);
    if body.is_empty() {
        return Err(AppError::BadRequest("comment cannot be empty".into()));
    }
    sqlx::query("UPDATE card_comments SET body = ? WHERE id = ?")
        .bind(&body)
        .bind(&comment_id)
        .execute(&state.pool)
        .await?;

    let row = sqlx::query(&format!("{SELECT_COMMENT} WHERE c.id = ?"))
        .bind(&comment_id)
        .fetch_one(&state.pool)
        .await?;
    let mut out = vec![row_to_comment(&row)?];
    attach_reactions(&state.pool, &mut out, &user.id).await?;
    Ok(Json(out.remove(0)).into_response())
}

pub async fn delete_comment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, comment_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;

    let row = load_comment(&state.pool, &workspace_id, &comment_id).await?;
    let author: String = row.try_get("author_user_id")?;
    // Authors delete their own; admins/owners may delete any.
    if author != user.id {
        require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin"]).await?;
    }

    sqlx::query("DELETE FROM card_comments WHERE id = ?")
        .bind(&comment_id)
        .execute(&state.pool)
        .await?;
    Ok(axum::http::StatusCode::NO_CONTENT.into_response())
}

/// Toggle the caller's reaction: reacting twice with the same emoji removes it.
/// Responds with the comment's updated reaction summary.
pub async fn toggle_reaction(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, comment_id)): Path<(String, String)>,
    Json(payload): Json<ReactionRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;
    load_comment(&state.pool, &workspace_id, &comment_id).await?;

    let emoji = clamp_str(payload.emoji.trim(), MAX_EMOJI);
    if emoji.is_empty() {
        return Err(AppError::BadRequest("emoji cannot be empty".into()));
    }

    let deleted = sqlx::query("DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND emoji = ?")
        .bind(&comment_id)
        .bind(&user.id)
        .bind(&emoji)
        .execute(&state.pool)
        .await?;
    if deleted.rows_affected() == 0 {
        sqlx::query("INSERT INTO comment_reactions (id, workspace_id, comment_id, user_id, emoji) VALUES (?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind(&workspace_id)
            .bind(&comment_id)
            .bind(&user.id)
            .bind(&emoji)
            .execute(&state.pool)
            .await?;
    }

    let row = sqlx::query(&format!("{SELECT_COMMENT} WHERE c.id = ?"))
        .bind(&comment_id)
        .fetch_one(&state.pool)
        .await?;
    let mut out = vec![row_to_comment(&row)?];
    attach_reactions(&state.pool, &mut out, &user.id).await?;
    Ok(Json(out.remove(0)).into_response())
}

/// Resolve / unresolve a thread. Applies to the thread root (resolving a reply
/// resolves its root). Any editor may resolve — it marks the discussion done,
/// like resolving a review thread.
pub async fn resolve_comment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, comment_id)): Path<(String, String)>,
    Json(payload): Json<ResolveRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;

    let row = load_comment(&state.pool, &workspace_id, &comment_id).await?;
    let parent: Option<String> = row.try_get("parent_id")?;
    let root_id = parent.unwrap_or_else(|| comment_id.clone());

    if payload.resolved {
        sqlx::query("UPDATE card_comments SET resolved_at = CURRENT_TIMESTAMP, resolved_by = ? WHERE id = ?")
            .bind(&user.id)
            .bind(&root_id)
            .execute(&state.pool)
            .await?;
    } else {
        sqlx::query("UPDATE card_comments SET resolved_at = NULL, resolved_by = NULL WHERE id = ?")
            .bind(&root_id)
            .execute(&state.pool)
            .await?;
    }

    let row = sqlx::query(&format!("{SELECT_COMMENT} WHERE c.id = ?"))
        .bind(&root_id)
        .fetch_one(&state.pool)
        .await?;
    let mut out = vec![row_to_comment(&row)?];
    attach_reactions(&state.pool, &mut out, &user.id).await?;
    Ok(Json(out.remove(0)).into_response())
}
