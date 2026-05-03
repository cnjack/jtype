use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::Row;
use uuid::Uuid;

use crate::db::models::*;
use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::middleware::auth::extract_user;
use crate::AppState;

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashItem {
    pub id: String,
    pub document_id: String,
    pub relative_path: String,
    pub title: String,
    pub content_hash: String,
    pub deleted_by_user_id: String,
    pub deleted_at: String,
    pub expires_at: String,
}

pub async fn list_trash(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<Vec<TrashItem>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor", "viewer"]).await?;

    let rows = sqlx::query(
        r#"SELECT id, document_id, relative_path, title, content_hash,
                  deleted_by_user_id, deleted_at, expires_at
           FROM document_trash
           WHERE workspace_id = ? AND restored_at IS NULL
           ORDER BY deleted_at DESC"#,
    )
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;

    let items: Vec<TrashItem> = rows
        .into_iter()
        .map(|row| TrashItem {
            id: row.try_get("id").unwrap_or_default(),
            document_id: row.try_get("document_id").unwrap_or_default(),
            relative_path: row.try_get("relative_path").unwrap_or_default(),
            title: row.try_get("title").unwrap_or_default(),
            content_hash: row.try_get("content_hash").unwrap_or_default(),
            deleted_by_user_id: row.try_get("deleted_by_user_id").unwrap_or_default(),
            deleted_at: row.try_get("deleted_at").unwrap_or_default(),
            expires_at: row.try_get("expires_at").unwrap_or_default(),
        })
        .collect();

    Ok(Json(items))
}

pub async fn restore_from_trash(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path((workspace_id, trash_id)): Path<(String, String)>,
) -> Result<Json<CloudDocument>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;

    let row = sqlx::query(
        r#"SELECT document_id, relative_path, title, content, content_hash, version_id
           FROM document_trash
           WHERE id = ? AND workspace_id = ? AND restored_at IS NULL"#,
    )
    .bind(&trash_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let relative_path: String = row.try_get("relative_path")?;
    let title: String = row.try_get("title")?;
    let content: String = row.try_get("content")?;
    let content_hash: String = row.try_get("content_hash")?;

    let existing = sqlx::query(
        "SELECT id FROM documents WHERE workspace_id = ? AND relative_path = ?",
    )
    .bind(&workspace_id)
    .bind(&relative_path)
    .fetch_optional(&state.pool)
    .await?;

    let final_relative_path = if existing.is_some() {
        let stem = relative_path
            .strip_suffix(".md")
            .map(|s| format!("{} (restored).md", s.trim_end_matches(' ').trim_end_matches('(')))
            .unwrap_or_else(|| format!("{} (restored)", relative_path));
        let mut candidate = stem.clone();
        let mut suffix = 1;
        loop {
            let collision = sqlx::query(
                "SELECT id FROM documents WHERE workspace_id = ? AND relative_path = ?",
            )
            .bind(&workspace_id)
            .bind(&candidate)
            .fetch_optional(&state.pool)
            .await?;
            if collision.is_none() { break; }
            suffix += 1;
            candidate = format!("{} ({}).md", stem.trim_end_matches(".md"), suffix);
        }
        candidate
    } else {
        relative_path.clone()
    };

    let document_id = Uuid::new_v4().to_string();
    let version_id = Uuid::new_v4().to_string();

    super::document::ensure_workspace_budget(&state.pool, &workspace_id, &final_relative_path, &content)
        .await?;

    let mut tx = state.pool.begin().await?;

    let next_clock_row = sqlx::query(
        "SELECT COALESCE(MAX(updated_clock), 0) + 1 AS next_clock FROM documents WHERE workspace_id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&mut *tx)
    .await?;
    let next_clock: i64 = next_clock_row.try_get("next_clock")?;

    sqlx::query(
        r#"INSERT INTO documents (id, workspace_id, relative_path, title, status, content_hash, content, updated_clock, current_version_id)
           VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)"#,
    )
    .bind(&document_id)
    .bind(&workspace_id)
    .bind(&final_relative_path)
    .bind(&title)
    .bind(&content_hash)
    .bind(&content)
    .bind(next_clock)
    .bind(&version_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"INSERT INTO document_versions (id, workspace_id, document_id, parent_version_id, source, content_hash, content)
           VALUES (?, ?, ?, NULL, 'system', ?, ?)"#,
    )
    .bind(&version_id)
    .bind(&workspace_id)
    .bind(&document_id)
    .bind(&content_hash)
    .bind(&content)
    .execute(&mut *tx)
    .await?;

    sqlx::query("UPDATE document_trash SET restored_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&trash_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(Json(CloudDocument {
        relative_path: final_relative_path,
        title,
        status: "draft".to_string(),
        content,
        content_hash,
        version_id,
        updated_clock: next_clock,
    }))
}

pub async fn permanent_delete(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path((workspace_id, trash_id)): Path<(String, String)>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;

    let result = sqlx::query("DELETE FROM document_trash WHERE id = ? AND workspace_id = ?")
        .bind(&trash_id)
        .bind(&workspace_id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}

pub async fn empty_trash(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;

    sqlx::query("DELETE FROM document_trash WHERE workspace_id = ? AND restored_at IS NULL")
        .bind(&workspace_id)
        .execute(&state.pool)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}
