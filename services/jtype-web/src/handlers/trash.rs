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
use crate::hub::WorkspaceEvent;
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
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

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
    let device_id = headers
        .get("x-device-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let doc = restore_trash_item_core(
        &state.pool,
        &state.hub,
        &workspace_id,
        &user.id,
        device_id.as_deref(),
        &trash_id,
        super::extract_session_id(&headers).as_deref(),
    )
    .await?;

    Ok(Json(doc))
}

/// Core restore logic shared by the REST handler and sync trash operations.
pub async fn restore_trash_item_core(
    pool: &sqlx::Pool<sqlx::MySql>,
    hub: &crate::hub::ConnectionHub,
    workspace_id: &str,
    user_id: &str,
    device_id: Option<&str>,
    trash_id: &str,
    exclude_session: Option<&str>,
) -> Result<CloudDocument, AppError> {
    let row = sqlx::query(
        r#"SELECT document_id, relative_path, title, content, content_hash, version_id
           FROM document_trash
           WHERE id = ? AND workspace_id = ? AND restored_at IS NULL"#,
    )
    .bind(trash_id)
    .bind(workspace_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let relative_path: String = row.try_get("relative_path")?;
    let title: String = row.try_get("title")?;
    let content: String = row.try_get("content")?;
    let content_hash: String = row.try_get("content_hash")?;

    let existing =
        sqlx::query("SELECT id FROM documents WHERE workspace_id = ? AND relative_path = ?")
            .bind(workspace_id)
            .bind(&relative_path)
            .fetch_optional(pool)
            .await?;

    if existing.is_some() {
        sqlx::query("DELETE FROM documents WHERE workspace_id = ? AND relative_path = ?")
            .bind(workspace_id)
            .bind(&relative_path)
            .execute(pool)
            .await?;
    }

    let final_relative_path = relative_path.clone();

    let document_id = Uuid::new_v4().to_string();
    let version_id = Uuid::new_v4().to_string();

    super::document::ensure_workspace_budget(pool, workspace_id, &final_relative_path, &content)
        .await?;

    let mut tx = pool.begin().await?;

    let next_clock = super::document::next_workspace_clock(&mut tx, workspace_id).await?;

    sqlx::query(
        r#"INSERT INTO documents (id, workspace_id, relative_path, title, status, content_hash, content, updated_clock, current_version_id)
           VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)"#,
    )
    .bind(&document_id)
    .bind(workspace_id)
    .bind(&final_relative_path)
    .bind(&title)
    .bind(&content_hash)
    .bind(&content)
    .bind(next_clock)
    .bind(&version_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"INSERT INTO document_versions (id, workspace_id, document_id, parent_version_id, author_user_id, source, content_hash, content)
           VALUES (?, ?, ?, NULL, ?, 'system', ?, ?)"#,
    )
    .bind(&version_id)
    .bind(workspace_id)
    .bind(&document_id)
    .bind(user_id)
    .bind(&content_hash)
    .bind(&content)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"UPDATE document_trash SET restored_at = CURRENT_TIMESTAMP,
           restored_by_device_id = ?, restored_by_user_id = ?, restored_clock = ?
           WHERE id = ?"#,
    )
    .bind(device_id)
    .bind(user_id)
    .bind(next_clock)
    .bind(trash_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    hub.publish_to_workspace(
        workspace_id,
        WorkspaceEvent::DocumentTrashed {
            workspace_id: workspace_id.to_string(),
            source_session_id: exclude_session.map(|s| s.to_string()),
            relative_path,
            action: "restored".to_string(),
            event_clock: next_clock,
        },
        exclude_session,
    )
    .await;

    Ok(CloudDocument {
        relative_path: final_relative_path,
        title,
        status: "draft".to_string(),
        content,
        content_hash,
        version_id,
        updated_clock: next_clock,
    })
}

pub async fn permanent_delete(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path((workspace_id, trash_id)): Path<(String, String)>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    permanent_delete_core(
        &state.pool,
        &state.hub,
        &workspace_id,
        &trash_id,
        super::extract_session_id(&headers).as_deref(),
    )
    .await
}

/// Core permanent-delete logic shared by the REST handler and sync trash operations.
pub async fn permanent_delete_core(
    pool: &sqlx::Pool<sqlx::MySql>,
    hub: &crate::hub::ConnectionHub,
    workspace_id: &str,
    trash_id: &str,
    exclude_session: Option<&str>,
) -> Result<StatusCode, AppError> {
    let mut tx = pool.begin().await?;
    let next_clock = crate::handlers::document::next_workspace_clock(&mut tx, workspace_id).await?;

    let relative_path: Option<String> =
        sqlx::query("SELECT relative_path FROM document_trash WHERE id = ? AND workspace_id = ?")
            .bind(trash_id)
            .bind(workspace_id)
            .fetch_optional(&mut *tx)
            .await?
            .and_then(|r| r.try_get("relative_path").ok());

    let result = sqlx::query("DELETE FROM document_trash WHERE id = ? AND workspace_id = ?")
        .bind(trash_id)
        .bind(workspace_id)
        .execute(&mut *tx)
        .await?;

    if result.rows_affected() == 0 {
        tx.commit().await?;
        return Err(AppError::NotFound);
    }

    let event_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO trash_events (id, workspace_id, event_type, event_data, event_clock)
           VALUES (?, ?, 'permanent_delete_item', ?, ?)"#,
    )
    .bind(&event_id)
    .bind(workspace_id)
    .bind(serde_json::json!({ "trashId": trash_id }).to_string())
    .bind(next_clock)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    if let Some(rp) = relative_path {
        hub.publish_to_workspace(
            workspace_id,
            WorkspaceEvent::DocumentDeleted {
                workspace_id: workspace_id.to_string(),
                source_session_id: exclude_session.map(|s| s.to_string()),
                relative_path: rp,
                deleted_clock: next_clock,
            },
            exclude_session,
        )
        .await;
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn empty_trash(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    empty_trash_core(
        &state.pool,
        &state.hub,
        &workspace_id,
        super::extract_session_id(&headers).as_deref(),
    )
    .await
}

/// Core empty-trash logic shared by the REST handler and sync trash operations.
pub async fn empty_trash_core(
    pool: &sqlx::Pool<sqlx::MySql>,
    hub: &crate::hub::ConnectionHub,
    workspace_id: &str,
    exclude_session: Option<&str>,
) -> Result<StatusCode, AppError> {
    let mut tx = pool.begin().await?;
    let next_clock = crate::handlers::document::next_workspace_clock(&mut tx, workspace_id).await?;

    let trash_rows = sqlx::query(
        "SELECT relative_path FROM document_trash WHERE workspace_id = ? AND restored_at IS NULL",
    )
    .bind(workspace_id)
    .fetch_all(&mut *tx)
    .await?;
    let trash_paths: Vec<String> = trash_rows
        .into_iter()
        .filter_map(|r| r.try_get("relative_path").ok())
        .collect();

    sqlx::query("DELETE FROM document_trash WHERE workspace_id = ? AND restored_at IS NULL")
        .bind(workspace_id)
        .execute(&mut *tx)
        .await?;

    let event_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO trash_events (id, workspace_id, event_type, event_data, event_clock)
           VALUES (?, ?, 'empty_trash', '{}', ?)"#,
    )
    .bind(&event_id)
    .bind(workspace_id)
    .bind(next_clock)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    for rp in trash_paths {
        hub.publish_to_workspace(
            workspace_id,
            WorkspaceEvent::DocumentDeleted {
                workspace_id: workspace_id.to_string(),
                source_session_id: exclude_session.map(|s| s.to_string()),
                relative_path: rp,
                deleted_clock: next_clock,
            },
            exclude_session,
        )
        .await;
    }

    Ok(StatusCode::NO_CONTENT)
}
