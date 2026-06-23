//! Card comment handlers (DB board).
//!
//! Endpoints:
//!   GET    /api/v1/workspaces/:workspace_id/kanban/cards/:card_id/comments
//!   POST   /api/v1/workspaces/:workspace_id/kanban/cards/:card_id/comments
//!   DELETE /api/v1/workspaces/:workspace_id/kanban/comments/:comment_id
//!
//! Comments are a DB-board feature (file boards keep discussion in the note body).

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use super::clamp_str;
use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::middleware::auth::extract_user;
use crate::AppState;

const MAX_COMMENT: usize = 16_000;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KanbanComment {
    pub id: String,
    pub card_id: String,
    pub author_user_id: String,
    pub author: Option<String>,
    pub body: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCommentRequest {
    pub body: String,
}

const SELECT_COMMENT: &str = r#"SELECT c.id, c.card_id, c.author_user_id, u.username AS author, c.body,
       CAST(c.created_at AS CHAR) AS created_at, CAST(c.updated_at AS CHAR) AS updated_at
FROM kanban_card_comments c
LEFT JOIN users u ON u.id = c.author_user_id"#;

fn row_to_comment(r: &sqlx::mysql::MySqlRow) -> Result<KanbanComment, AppError> {
    Ok(KanbanComment {
        id: r.try_get("id")?,
        card_id: r.try_get("card_id")?,
        author_user_id: r.try_get("author_user_id")?,
        author: r.try_get("author")?,
        body: r.try_get("body")?,
        created_at: r.try_get("created_at")?,
        updated_at: r.try_get("updated_at")?,
    })
}

async fn ensure_card_in_workspace(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    card_id: &str,
) -> Result<(), AppError> {
    let exists: Option<String> =
        sqlx::query_scalar("SELECT id FROM kanban_cards WHERE id = ? AND workspace_id = ?")
            .bind(card_id)
            .bind(workspace_id)
            .fetch_optional(pool)
            .await?;
    if exists.is_none() {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub async fn list_comments(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, card_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor", "viewer"]).await?;
    ensure_card_in_workspace(&state.pool, &workspace_id, &card_id).await?;

    let rows = sqlx::query(&format!("{SELECT_COMMENT} WHERE c.card_id = ? ORDER BY c.created_at ASC"))
        .bind(&card_id)
        .fetch_all(&state.pool)
        .await?;
    let out = rows.iter().map(row_to_comment).collect::<Result<Vec<_>, _>>()?;
    Ok(Json(out).into_response())
}

pub async fn create_comment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, card_id)): Path<(String, String)>,
    Json(payload): Json<CreateCommentRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;
    ensure_card_in_workspace(&state.pool, &workspace_id, &card_id).await?;

    let body = clamp_str(payload.body.trim(), MAX_COMMENT);
    if body.is_empty() {
        return Err(AppError::BadRequest("comment cannot be empty".into()));
    }

    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO kanban_card_comments (id, workspace_id, card_id, author_user_id, body) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&workspace_id)
    .bind(&card_id)
    .bind(&user.id)
    .bind(&body)
    .execute(&state.pool)
    .await?;

    let row = sqlx::query(&format!("{SELECT_COMMENT} WHERE c.id = ?"))
        .bind(&id)
        .fetch_one(&state.pool)
        .await?;
    Ok(Json(row_to_comment(&row)?).into_response())
}

pub async fn delete_comment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, comment_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;

    let row = sqlx::query("SELECT author_user_id FROM kanban_card_comments WHERE id = ? AND workspace_id = ?")
        .bind(&comment_id)
        .bind(&workspace_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    let author: String = row.try_get("author_user_id")?;
    // Authors delete their own; admins/owners may delete any.
    if author != user.id {
        require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin"]).await?;
    }

    sqlx::query("DELETE FROM kanban_card_comments WHERE id = ?")
        .bind(&comment_id)
        .execute(&state.pool)
        .await?;
    Ok(axum::http::StatusCode::NO_CONTENT.into_response())
}
