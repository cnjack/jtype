use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use sqlx::Row;
use uuid::Uuid;

use crate::db::models::*;
use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::middleware::auth::extract_user;
use crate::util::*;
use crate::AppState;

pub async fn sync_legacy(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<SyncWorkspaceRequest>,
) -> Result<Json<SyncWorkspaceResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    if payload.workspace_name.trim().is_empty() {
        return Err(AppError::BadRequest("workspaceName is required".to_string()));
    }

    let mut tx = state.pool.begin().await?;
    let workspace_id =
        crate::handlers::workspace::upsert_workspace(&mut tx, &user.id, &payload.workspace_name)
            .await?;
    sqlx::query("DELETE FROM documents WHERE workspace_id = ?")
        .bind(&workspace_id)
        .execute(&mut *tx)
        .await?;

    for doc in &payload.documents {
        if !is_markdown_path(&doc.relative_path) {
            continue;
        }
        let document_id = Uuid::new_v4().to_string();
        let title = if doc.title.trim().is_empty() {
            extract_title(&doc.content).unwrap_or_else(|| doc.relative_path.clone())
        } else {
            doc.title.clone()
        };
        let status = normalize_status(&doc.status, &doc.content);
        let content_hash = sha256_hex(&doc.content);
        sqlx::query(
            r#"INSERT INTO documents (id, workspace_id, relative_path, title, status, content_hash, content)
               VALUES (?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(document_id)
        .bind(&workspace_id)
        .bind(&doc.relative_path)
        .bind(title)
        .bind(status)
        .bind(content_hash)
        .bind(&doc.content)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;

    let workspace_slug: String = sqlx::query("SELECT COALESCE(slug, LOWER(REPLACE(name, ' ', '-'))) AS slug FROM workspaces WHERE id = ?")
        .bind(&workspace_id)
        .fetch_one(&state.pool)
        .await?
        .try_get("slug")?;

    Ok(Json(SyncWorkspaceResponse {
        workspace_id,
        workspace_name: payload.workspace_name,
        document_count: payload.documents.len(),
        site_url: workspace_site_url(&state.public_base_url, &user.username, &workspace_slug),
    }))
}

pub async fn pull(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<SyncPullRequest>,
) -> Result<Json<SyncPullResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor", "viewer"]).await?;
    let since_clock = payload.since_clock.unwrap_or(0);
    let documents = load_documents_since(&state.pool, &workspace_id, since_clock).await?;
    let deleted_paths = load_deleted_paths_since(&state.pool, &workspace_id, since_clock).await?;
    if let Some(device_id) = payload.device_id.as_deref() {
        let next_clock = documents
            .iter()
            .map(|d| d.updated_clock)
            .chain(deleted_paths.iter().map(|d| d.deleted_clock))
            .max()
            .unwrap_or(since_clock);
        upsert_sync_cursor(&state.pool, &workspace_id, device_id, next_clock).await?;
    }
    let conflicts = load_open_conflicts(&state.pool, &workspace_id).await?;
    Ok(Json(SyncPullResponse {
        workspace_id,
        documents,
        deleted_paths,
        conflicts,
    }))
}

pub async fn push(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<SyncPushRequest>,
) -> Result<Json<SyncPushResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;
    let mut accepted = 0;
    let mut conflicts = Vec::new();
    let device_id = payload.device_id.clone();

    for doc in payload.documents {
        match crate::handlers::document::save_document_version(&state.pool, &workspace_id, &user, doc, "desktop").await? {
            crate::handlers::document::SaveDocumentOutcome::Saved(_) => accepted += 1,
            crate::handlers::document::SaveDocumentOutcome::Conflict(c) => conflicts.push(c),
        }
    }

    let documents = load_documents_since(&state.pool, &workspace_id, 0).await?;
    if let Some(device_id) = device_id.as_deref() {
        let next_clock = documents.iter().map(|d| d.updated_clock).max().unwrap_or(0);
        upsert_sync_cursor(&state.pool, &workspace_id, device_id, next_clock).await?;
    }
    Ok(Json(SyncPushResponse {
        workspace_id,
        accepted,
        documents,
        conflicts,
    }))
}

pub async fn resolve_conflict(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, conflict_id)): Path<(String, String)>,
    Json(payload): Json<ResolveConflictRequest>,
) -> Result<Json<CloudDocument>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;

    let row = sqlx::query(
        r#"SELECT document_id, relative_path, base_content, local_content, cloud_content
           FROM sync_conflicts WHERE id = ? AND workspace_id = ? AND status = 'open'"#,
    )
    .bind(&conflict_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let document_id: String = row.try_get("document_id")?;
    let relative_path: String = row.try_get("relative_path")?;
    let local_content: String = row.try_get("local_content")?;
    let cloud_content: String = row.try_get("cloud_content")?;
    let resolution = payload.resolution.trim().to_ascii_lowercase();
    let content = match resolution.as_str() {
        "accept_local" => local_content,
        "accept_cloud" => cloud_content,
        "manual_merge" => payload.content.ok_or_else(|| AppError::BadRequest("content is required for manual merge".to_string()))?,
        "keep_both" => {
            let sibling_path = conflict_sibling_path(&relative_path);
            let save = CloudSaveDocumentRequest {
                relative_path: sibling_path,
                title: None,
                status: Some("draft".to_string()),
                content: local_content,
                base_content_hash: None,
                base_content: None,
            };
            let outcome = crate::handlers::document::save_document_version(&state.pool, &workspace_id, &user, save, "system").await?;
            sqlx::query("UPDATE sync_conflicts SET status = 'resolved', resolution = 'keep_both', resolved_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(&conflict_id)
                .execute(&state.pool)
                .await?;
            return match outcome {
                crate::handlers::document::SaveDocumentOutcome::Saved(doc) => Ok(Json(doc)),
                crate::handlers::document::SaveDocumentOutcome::Conflict(_) => {
                    Err(AppError::Server("failed to keep both conflict versions".to_string()))
                }
            };
        }
        _ => return Err(AppError::BadRequest("resolution must be accept_local, accept_cloud, keep_both, or manual_merge".to_string())),
    };

    let title = extract_title(&content).unwrap_or_else(|| relative_path.clone());
    let saved = crate::handlers::document::save_merged_document(
        &state.pool, &workspace_id, &user, &document_id, &relative_path,
        &title, normalize_status("", &content), &content, None, None, "system",
    )
    .await?;
    sqlx::query("UPDATE sync_conflicts SET status = 'resolved', resolution = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&resolution)
        .bind(&conflict_id)
        .execute(&state.pool)
        .await?;
    Ok(Json(saved))
}

// ── Helpers ──

async fn load_documents_since(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    since_clock: i64,
) -> Result<Vec<CloudDocument>, AppError> {
    let rows = sqlx::query(
        r#"SELECT relative_path, title, status, content, content_hash,
                  COALESCE(current_version_id, id) AS version_id, updated_clock
           FROM documents WHERE workspace_id = ? AND updated_clock > ?
           ORDER BY relative_path"#,
    )
    .bind(workspace_id)
    .bind(since_clock)
    .fetch_all(pool)
    .await?;
    rows.into_iter()
        .map(|row| {
            Ok(CloudDocument {
                relative_path: row.try_get("relative_path")?,
                title: row.try_get("title")?,
                status: row.try_get("status")?,
                content: row.try_get("content")?,
                content_hash: row.try_get("content_hash")?,
                version_id: row.try_get("version_id")?,
                updated_clock: row.try_get("updated_clock")?,
            })
        })
        .collect()
}

async fn upsert_sync_cursor(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    device_id: &str,
    last_seen_clock: i64,
) -> Result<(), AppError> {
    let device_id = device_id.trim();
    if device_id.is_empty() {
        return Ok(());
    }
    sqlx::query(
        r#"INSERT INTO workspace_sync_cursors (workspace_id, device_id, last_seen_clock)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE last_seen_clock = GREATEST(last_seen_clock, VALUES(last_seen_clock)), updated_at = CURRENT_TIMESTAMP"#,
    )
    .bind(workspace_id)
    .bind(device_id)
    .bind(last_seen_clock)
    .execute(pool)
    .await?;
    Ok(())
}

async fn load_open_conflicts(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
) -> Result<Vec<SyncConflict>, AppError> {
    let rows = sqlx::query(
        r#"SELECT id, relative_path, base_content, local_content, cloud_content, conflict_ranges
           FROM sync_conflicts WHERE workspace_id = ? AND status = 'open'
           ORDER BY created_at DESC"#,
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await?;
    rows.into_iter()
        .map(|row| {
            Ok(SyncConflict {
                conflict_id: row.try_get("id")?,
                relative_path: row.try_get("relative_path")?,
                base_content: row.try_get("base_content")?,
                local_content: row.try_get("local_content")?,
                cloud_content: row.try_get("cloud_content")?,
                conflict_ranges: row.try_get("conflict_ranges")?,
            })
        })
        .collect()
}

async fn load_deleted_paths_since(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    since_clock: i64,
) -> Result<Vec<DeletedPath>, AppError> {
    if since_clock == 0 {
        return Ok(Vec::new());
    }
    let rows = sqlx::query(
        r#"SELECT relative_path, deleted_clock
           FROM document_trash
           WHERE workspace_id = ? AND deleted_clock > ? AND restored_at IS NULL
           ORDER BY deleted_clock"#,
    )
    .bind(workspace_id)
    .bind(since_clock)
    .fetch_all(pool)
    .await?;
    rows.into_iter()
        .map(|row| {
            Ok(DeletedPath {
                relative_path: row.try_get("relative_path")?,
                deleted_clock: row.try_get("deleted_clock")?,
            })
        })
        .collect()
}
