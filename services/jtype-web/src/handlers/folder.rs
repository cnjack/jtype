use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use sqlx::Row;
use uuid::Uuid;

use crate::db::models::*;
use crate::error::AppError;
use crate::handlers::document::next_workspace_clock;
use crate::handlers::workspace::require_workspace_role;
use crate::hub::WorkspaceEvent;
use crate::middleware::auth::extract_user;
use crate::util::normalize_folder_path;
use crate::AppState;

pub async fn list_folders(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<Vec<FolderListItem>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    Ok(Json(
        load_folders_since(&state.pool, &workspace_id, 0).await?,
    ))
}

pub async fn create_folder(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<CreateFolderRequest>,
) -> Result<Json<FolderListItem>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let relative_path = normalize_folder_path(&payload.relative_path)?;
    let mut tx = state.pool.begin().await?;
    upsert_folder_with_ancestors(&mut tx, &workspace_id, &relative_path).await?;
    tx.commit().await?;

    let folder = load_folder_by_path(&state.pool, &workspace_id, &relative_path).await?;
    let session_id = super::extract_session_id(&headers);
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::SyncRequired {
                workspace_id: workspace_id.clone(),
                reason: "folder-changed".to_string(),
            },
            session_id.as_deref(),
        )
        .await;
    Ok(Json(folder))
}

pub async fn delete_folder(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, folder_id)): Path<(String, String)>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let row = sqlx::query(
        "SELECT relative_path FROM workspace_folders WHERE id = ? AND workspace_id = ?",
    )
    .bind(&folder_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let relative_path: String = row.try_get("relative_path")?;

    let mut tx = state.pool.begin().await?;
    record_folder_deletion(&mut tx, &workspace_id, &relative_path).await?;
    sqlx::query(
        r#"DELETE FROM workspace_folders
           WHERE workspace_id = ? AND (relative_path = ? OR relative_path LIKE ?)"#,
    )
    .bind(&workspace_id)
    .bind(&relative_path)
    .bind(format!("{relative_path}/%"))
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;

    let session_id = super::extract_session_id(&headers);
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::SyncRequired {
                workspace_id: workspace_id.clone(),
                reason: "folder-changed".to_string(),
            },
            session_id.as_deref(),
        )
        .await;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn upsert_folder_with_ancestors(
    tx: &mut sqlx::Transaction<'_, sqlx::MySql>,
    workspace_id: &str,
    relative_path: &str,
) -> Result<bool, AppError> {
    let relative_path = normalize_folder_path(relative_path)?;
    let mut current = String::new();
    let mut changed = false;
    for segment in relative_path.split('/') {
        if !current.is_empty() {
            current.push('/');
        }
        current.push_str(segment);
        changed |= upsert_single_folder(tx, workspace_id, &current).await?;
    }
    Ok(changed)
}

pub async fn load_folders_since(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    since_clock: i64,
) -> Result<Vec<FolderListItem>, AppError> {
    let rows = sqlx::query(
        r#"SELECT id, relative_path, updated_clock
           FROM workspace_folders
           WHERE workspace_id = ? AND updated_clock > ?
           ORDER BY relative_path"#,
    )
    .bind(workspace_id)
    .bind(since_clock)
    .fetch_all(pool)
    .await?;

    rows.into_iter()
        .map(|row| {
            Ok(FolderListItem {
                id: row.try_get("id")?,
                relative_path: row.try_get("relative_path")?,
                updated_clock: row.try_get("updated_clock")?,
            })
        })
        .collect()
}

pub async fn load_deleted_folders_since(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    since_clock: i64,
) -> Result<Vec<DeletedFolder>, AppError> {
    let rows = sqlx::query(
        r#"SELECT relative_path, deleted_clock
           FROM workspace_folder_deletions
           WHERE workspace_id = ? AND deleted_clock > ?
           ORDER BY deleted_clock"#,
    )
    .bind(workspace_id)
    .bind(since_clock)
    .fetch_all(pool)
    .await?;

    rows.into_iter()
        .map(|row| {
            Ok(DeletedFolder {
                relative_path: row.try_get("relative_path")?,
                deleted_clock: row.try_get("deleted_clock")?,
            })
        })
        .collect()
}

async fn upsert_single_folder(
    tx: &mut sqlx::Transaction<'_, sqlx::MySql>,
    workspace_id: &str,
    relative_path: &str,
) -> Result<bool, AppError> {
    let folder_id = Uuid::new_v4().to_string();
    let clock = next_workspace_clock(tx, workspace_id).await?;
    // Atomic upsert — avoids TOCTOU race when concurrent requests both insert the same path.
    // rows_affected == 1 means a new row was inserted; == 2 means an existing row was updated
    // (MySQL's ON DUPLICATE KEY UPDATE counts as 2 affected rows).
    let result = sqlx::query(
        r#"INSERT INTO workspace_folders (id, workspace_id, relative_path, updated_clock)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE updated_clock = VALUES(updated_clock)"#,
    )
    .bind(&folder_id)
    .bind(workspace_id)
    .bind(relative_path)
    .bind(clock)
    .execute(&mut **tx)
    .await?;

    let inserted = result.rows_affected() == 1;
    if inserted {
        sqlx::query(
            "DELETE FROM workspace_folder_deletions WHERE workspace_id = ? AND relative_path = ?",
        )
        .bind(workspace_id)
        .bind(relative_path)
        .execute(&mut **tx)
        .await?;
    }
    Ok(inserted)
}

pub async fn record_folder_deletion(
    tx: &mut sqlx::Transaction<'_, sqlx::MySql>,
    workspace_id: &str,
    relative_path: &str,
) -> Result<(), AppError> {
    let clock = next_workspace_clock(tx, workspace_id).await?;
    sqlx::query(
        r#"INSERT INTO workspace_folder_deletions (workspace_id, relative_path, deleted_clock)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE deleted_clock = VALUES(deleted_clock), deleted_at = CURRENT_TIMESTAMP"#,
    )
    .bind(workspace_id)
    .bind(relative_path)
    .bind(clock)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Normalize, record tombstone, and remove live rows from workspace_folders.
/// Mirrors the REST delete_folder handler but takes a relative path directly.
pub async fn delete_folder_by_path(
    tx: &mut sqlx::Transaction<'_, sqlx::MySql>,
    workspace_id: &str,
    relative_path: &str,
) -> Result<(), AppError> {
    let relative_path = crate::util::normalize_folder_path(relative_path)?;
    record_folder_deletion(tx, workspace_id, &relative_path).await?;
    sqlx::query(
        r#"DELETE FROM workspace_folders
           WHERE workspace_id = ? AND (relative_path = ? OR relative_path LIKE ?)"#,
    )
    .bind(workspace_id)
    .bind(&relative_path)
    .bind(format!("{relative_path}/%"))
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn load_folder_by_path(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    relative_path: &str,
) -> Result<FolderListItem, AppError> {
    let row = sqlx::query(
        "SELECT id, relative_path, updated_clock FROM workspace_folders WHERE workspace_id = ? AND relative_path = ?",
    )
    .bind(workspace_id)
    .bind(relative_path)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(FolderListItem {
        id: row.try_get("id")?,
        relative_path: row.try_get("relative_path")?,
        updated_clock: row.try_get("updated_clock")?,
    })
}
