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
use crate::hub::WorkspaceEvent;
use crate::middleware::auth::extract_user;
use crate::util::*;
use crate::AppState;

pub async fn pull(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<SyncPullRequest>,
) -> Result<Json<SyncPullResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;
    let since_clock = payload.since_clock.unwrap_or(0);
    let folders =
        crate::handlers::folder::load_folders_since(&state.pool, &workspace_id, since_clock)
            .await?;
    let deleted_folders = crate::handlers::folder::load_deleted_folders_since(
        &state.pool,
        &workspace_id,
        since_clock,
    )
    .await?;
    let documents = load_documents_since(&state.pool, &workspace_id, since_clock).await?;
    let deleted_paths = load_deleted_paths_since(&state.pool, &workspace_id, since_clock).await?;
    if let Some(device_id) = payload.device_id.as_deref() {
        let next_clock = folders
            .iter()
            .map(|f| f.updated_clock)
            .chain(deleted_folders.iter().map(|f| f.deleted_clock))
            .chain(documents.iter().map(|d| d.updated_clock))
            .chain(deleted_paths.iter().map(|d| d.deleted_clock))
            .max()
            .unwrap_or(since_clock);
        upsert_sync_cursor(&state.pool, &workspace_id, device_id, next_clock).await?;
    }
    let conflicts = load_open_conflicts(&state.pool, &workspace_id).await?;

    // Load trash sync data if requested
    let trash = if payload.since_trash_event_clock.is_some() {
        let since_trash_clock = payload.since_trash_event_clock.unwrap_or(0);
        Some(load_trash_sync_data(&state.pool, &workspace_id, since_trash_clock).await?)
    } else {
        None
    };

    Ok(Json(SyncPullResponse {
        workspace_id,
        folders,
        deleted_folders,
        documents,
        deleted_paths,
        conflicts,
        trash,
    }))
}

pub async fn push(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<SyncPushRequest>,
) -> Result<Json<SyncPushResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;
    let mut accepted = 0;
    let mut conflicts = Vec::new();
    let device_id = payload.device_id.clone();
    let mut push_docs: Vec<SyncPushDocument> = Vec::new();
    let mut deleted_paths: Vec<DeletedPath> = Vec::new();

    if !payload.folders.is_empty() {
        let mut tx = state.pool.begin().await?;
        let mut changed_folder = false;
        for folder in payload.folders {
            changed_folder |= crate::handlers::folder::upsert_folder_with_ancestors(
                &mut tx,
                &workspace_id,
                &folder.relative_path,
            )
            .await?;
        }
        tx.commit().await?;
        if changed_folder {
            accepted += 1;
            state
                .hub
                .publish(
                    &workspace_id,
                    WorkspaceEvent::SyncRequired {
                        reason: "folder-changed".to_string(),
                    },
                )
                .await;
        }
    }

    for doc in payload.documents {
        match crate::handlers::document::save_document_version(
            &state.pool,
            &workspace_id,
            &user,
            doc,
            "desktop",
        )
        .await?
        {
            crate::handlers::document::SaveDocumentOutcome::Saved(doc, status) => {
                accepted += 1;
                if status != crate::handlers::document::MergeStatus::Unchanged {
                    state
                        .hub
                        .publish(
                            &workspace_id,
                            WorkspaceEvent::DocumentChanged {
                                source_session_id: String::new(),
                                relative_path: doc.relative_path.clone(),
                                content_hash: doc.content_hash.clone(),
                                updated_clock: doc.updated_clock,
                                edited_by: user.username.clone(),
                                source: "desktop".to_string(),
                                device_id: device_id.clone(),
                            },
                        )
                        .await;
                }
                push_docs.push(SyncPushDocument {
                    doc,
                    merge_status: match status {
                        crate::handlers::document::MergeStatus::Accepted => "accepted".to_string(),
                        crate::handlers::document::MergeStatus::Merged => "merged".to_string(),
                        crate::handlers::document::MergeStatus::Unchanged => {
                            "unchanged".to_string()
                        }
                    },
                });
            }
            crate::handlers::document::SaveDocumentOutcome::Conflict(c) => conflicts.push(c),
        }
    }

    for deleted in payload.deleted_paths {
        if let Some(deleted_path) = trash_document_by_relative_path(
            &state.pool,
            &workspace_id,
            &user,
            &deleted.relative_path,
            device_id.as_deref(),
        )
        .await?
        {
            accepted += 1;
            state
                .hub
                .publish(
                    &workspace_id,
                    WorkspaceEvent::DocumentTrashed {
                        source_session_id: String::new(),
                        relative_path: deleted_path.relative_path.clone(),
                        action: "trashed".to_string(),
                    },
                )
                .await;
            deleted_paths.push(deleted_path);
        }
    }

    // Process trash operations (restore, permanent delete, empty)
    for op in payload.trash_operations {
        match process_trash_operation(
            &state.pool,
            &state.hub,
            &workspace_id,
            &user,
            device_id.as_deref(),
            op,
        )
        .await
        {
            Ok(_) => accepted += 1,
            Err(_) => { /* idempotent — skip errors */ }
        }
    }

    let folders =
        crate::handlers::folder::load_folders_since(&state.pool, &workspace_id, 0).await?;
    let documents = load_documents_since(&state.pool, &workspace_id, 0).await?;
    if let Some(device_id) = device_id.as_deref() {
        let next_clock = folders
            .iter()
            .map(|f| f.updated_clock)
            .chain(documents.iter().map(|d| d.updated_clock))
            .chain(deleted_paths.iter().map(|d| d.deleted_clock))
            .max()
            .unwrap_or(0);
        upsert_sync_cursor(&state.pool, &workspace_id, device_id, next_clock).await?;
    }
    Ok(Json(SyncPushResponse {
        workspace_id,
        accepted,
        folders,
        documents: push_docs,
        deleted_paths,
        conflicts,
    }))
}

pub async fn list_conflicts(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<Vec<SyncConflictResponse>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let rows = sqlx::query(
        r#"SELECT id, relative_path, local_content, cloud_content, base_content, conflict_ranges
           FROM sync_conflicts WHERE workspace_id = ? AND status = 'open'
           ORDER BY created_at DESC"#,
    )
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;

    let mut conflicts = Vec::new();
    // Deduplicate: keep only the latest conflict per relative_path
    let mut seen = std::collections::HashSet::new();
    for row in &rows {
        let relative_path: String = row.try_get("relative_path")?;
        if !seen.insert(relative_path.clone()) {
            continue;
        }
        conflicts.push(SyncConflictResponse {
            conflict_id: row.try_get("id")?,
            relative_path,
            local_content: row.try_get("local_content")?,
            cloud_content: row.try_get("cloud_content")?,
            base_content: row.try_get("base_content").ok(),
            conflict_ranges: row
                .try_get::<Option<String>, _>("conflict_ranges")
                .ok()
                .flatten(),
        });
    }

    Ok(Json(conflicts))
}

pub async fn resolve_conflict(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, conflict_id)): Path<(String, String)>,
    Json(payload): Json<ResolveConflictRequest>,
) -> Result<Json<CloudDocument>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

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
        "manual_merge" => payload.content.ok_or_else(|| {
            AppError::BadRequest("content is required for manual merge".to_string())
        })?,
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
            let outcome = crate::handlers::document::save_document_version(
                &state.pool,
                &workspace_id,
                &user,
                save,
                "system",
            )
            .await?;
            sqlx::query("UPDATE sync_conflicts SET status = 'resolved', resolution = 'keep_both', resolved_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(&conflict_id)
                .execute(&state.pool)
                .await?;
            return match outcome {
                crate::handlers::document::SaveDocumentOutcome::Saved(doc, _) => {
                    state
                        .hub
                        .publish(
                            &workspace_id,
                            WorkspaceEvent::DocumentChanged {
                                source_session_id: String::new(),
                                relative_path: doc.relative_path.clone(),
                                content_hash: doc.content_hash.clone(),
                                updated_clock: doc.updated_clock,
                                edited_by: user.username.clone(),
                                source: "system".to_string(),
                                device_id: None,
                            },
                        )
                        .await;
                    Ok(Json(doc))
                }
                crate::handlers::document::SaveDocumentOutcome::Conflict(_) => Err(
                    AppError::Server("failed to keep both conflict versions".to_string()),
                ),
            };
        }
        _ => {
            return Err(AppError::BadRequest(
                "resolution must be accept_local, accept_cloud, keep_both, or manual_merge"
                    .to_string(),
            ))
        }
    };

    let title = extract_title(&content).unwrap_or_else(|| relative_path.clone());
    let saved = crate::handlers::document::save_merged_document(
        &state.pool,
        &workspace_id,
        &user,
        &document_id,
        &relative_path,
        &title,
        normalize_status("", &content),
        &content,
        None,
        None,
        "system",
    )
    .await?;
    sqlx::query("UPDATE sync_conflicts SET status = 'resolved', resolution = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&resolution)
        .bind(&conflict_id)
        .execute(&state.pool)
        .await?;

    // Broadcast the resolved document so other connected clients refresh.
    state
        .hub
        .publish(
            &workspace_id,
            WorkspaceEvent::DocumentChanged {
                source_session_id: String::new(),
                relative_path: saved.relative_path.clone(),
                content_hash: saved.content_hash.clone(),
                updated_clock: saved.updated_clock,
                edited_by: user.username.clone(),
                source: "system".to_string(),
                device_id: None,
            },
        )
        .await;

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

async fn trash_document_by_relative_path(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    user: &AuthUser,
    relative_path: &str,
    device_id: Option<&str>,
) -> Result<Option<DeletedPath>, AppError> {
    let relative_path = normalize_relative_markdown_path(relative_path)?;
    let mut tx = pool.begin().await?;

    let row = sqlx::query(
        r#"SELECT id, title, content, content_hash, COALESCE(current_version_id, id) AS version_id
           FROM documents
           WHERE workspace_id = ? AND relative_path = ?
           FOR UPDATE"#,
    )
    .bind(workspace_id)
    .bind(&relative_path)
    .fetch_optional(&mut *tx)
    .await?;

    let Some(row) = row else {
        tx.commit().await?;
        return Ok(None);
    };

    let document_id: String = row.try_get("id")?;
    let title: String = row.try_get("title")?;
    let content: String = row.try_get("content")?;
    let content_hash: String = row.try_get("content_hash")?;
    let version_id: String = row.try_get("version_id")?;
    let trash_id = Uuid::new_v4().to_string();
    let next_clock = crate::handlers::document::next_workspace_clock(&mut tx, workspace_id).await?;

    sqlx::query(
        r#"INSERT INTO document_trash (id, workspace_id, document_id, relative_path, title, content, content_hash, version_id, deleted_by_user_id, deleted_by_device_id, source_device_id, source_user_id, deleted_clock, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY))"#,
    )
    .bind(&trash_id)
    .bind(workspace_id)
    .bind(&document_id)
    .bind(&relative_path)
    .bind(&title)
    .bind(&content)
    .bind(&content_hash)
    .bind(&version_id)
    .bind(&user.id)
    .bind(device_id)
    .bind(device_id)
    .bind(&user.id)
    .bind(next_clock)
    .execute(&mut *tx)
    .await?;

    sqlx::query("DELETE FROM documents WHERE id = ? AND workspace_id = ?")
        .bind(&document_id)
        .bind(workspace_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;
    Ok(Some(DeletedPath {
        relative_path,
        deleted_clock: next_clock,
    }))
}

async fn load_trash_sync_data(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    since_trash_event_clock: i64,
) -> Result<TrashSyncData, AppError> {
    let events = load_trash_events_since(pool, workspace_id, since_trash_event_clock).await?;
    let items = load_all_undeleted_trash_items(pool, workspace_id).await?;
    let trash_cursor = events
        .last()
        .map(|e| e.event_clock)
        .unwrap_or(since_trash_event_clock);

    // Find expired items (where expires_at < NOW() in the DB)
    let expired_rows = sqlx::query(
        r#"SELECT id FROM document_trash
           WHERE workspace_id = ? AND restored_at IS NULL AND expires_at < CURRENT_TIMESTAMP"#,
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await?;
    let expired_trash_ids: Vec<String> = expired_rows
        .into_iter()
        .filter_map(|row| row.try_get("id").ok())
        .collect();

    Ok(TrashSyncData {
        items,
        events,
        expired_trash_ids,
        trash_cursor,
    })
}

async fn load_trash_events_since(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    since_clock: i64,
) -> Result<Vec<TrashEvent>, AppError> {
    let rows = sqlx::query(
        r#"SELECT id, event_type, event_clock, event_data,
                  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
           FROM trash_events
           WHERE workspace_id = ? AND event_clock > ?
           ORDER BY event_clock"#,
    )
    .bind(workspace_id)
    .bind(since_clock)
    .fetch_all(pool)
    .await?;
    rows.into_iter()
        .map(|row| {
            Ok(TrashEvent {
                id: row.try_get("id")?,
                event_type: row.try_get("event_type")?,
                event_clock: row.try_get("event_clock")?,
                event_data: row
                    .try_get::<String, _>("event_data")
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or(serde_json::json!({})),
                created_at: row.try_get("created_at")?,
            })
        })
        .collect()
}

async fn load_all_undeleted_trash_items(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
) -> Result<Vec<TrashSyncItem>, AppError> {
    let rows = sqlx::query(
        r#"SELECT id, document_id, relative_path, title, content_hash,
                  deleted_by_user_id, source_device_id, source_user_id,
                  DATE_FORMAT(deleted_at, '%Y-%m-%d %H:%i:%s') as deleted_at,
                  DATE_FORMAT(expires_at, '%Y-%m-%d %H:%i:%s') as expires_at,
                  deleted_clock
           FROM document_trash
           WHERE workspace_id = ? AND restored_at IS NULL
           ORDER BY deleted_at DESC"#,
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await?;
    rows.into_iter()
        .map(|row| {
            Ok(TrashSyncItem {
                id: row.try_get("id")?,
                document_id: row.try_get("document_id")?,
                relative_path: row.try_get("relative_path")?,
                title: row.try_get("title")?,
                content_hash: row.try_get("content_hash")?,
                deleted_by_user_id: row.try_get("deleted_by_user_id")?,
                source_device_id: row.try_get("source_device_id").ok(),
                source_user_id: row.try_get("source_user_id").ok(),
                deleted_at: row.try_get("deleted_at")?,
                expires_at: row.try_get("expires_at")?,
                deleted_clock: row.try_get("deleted_clock")?,
            })
        })
        .collect()
}

pub async fn process_trash_operation(
    pool: &sqlx::Pool<sqlx::MySql>,
    hub: &crate::hub::NotificationHub,
    workspace_id: &str,
    user: &AuthUser,
    device_id: Option<&str>,
    operation: TrashOperation,
) -> Result<(), AppError> {
    match operation {
        TrashOperation::Restore { trash_id } => {
            let row = sqlx::query(
                r#"SELECT document_id, relative_path, title, content, content_hash, version_id
                   FROM document_trash
                   WHERE id = ? AND workspace_id = ? AND restored_at IS NULL"#,
            )
            .bind(&trash_id)
            .bind(workspace_id)
            .fetch_optional(pool)
            .await?;
            let Some(row) = row else {
                return Ok(());
            };
            let relative_path: String = row.try_get("relative_path")?;
            let title: String = row.try_get("title")?;
            let content: String = row.try_get("content")?;
            let content_hash: String = row.try_get("content_hash")?;
            let document_id = Uuid::new_v4().to_string();
            let version_id = Uuid::new_v4().to_string();

            let mut tx = pool.begin().await?;
            let next_clock =
                crate::handlers::document::next_workspace_clock(&mut tx, workspace_id).await?;

            let existing = sqlx::query(
                "SELECT id FROM documents WHERE workspace_id = ? AND relative_path = ?",
            )
            .bind(workspace_id)
            .bind(&relative_path)
            .fetch_optional(&mut *tx)
            .await?;

            if existing.is_some() {
                sqlx::query("DELETE FROM documents WHERE workspace_id = ? AND relative_path = ?")
                    .bind(workspace_id)
                    .bind(&relative_path)
                    .execute(&mut *tx)
                    .await?;
            }

            let final_path = relative_path;

            sqlx::query(
                r#"INSERT INTO documents (id, workspace_id, relative_path, title, status, content_hash, content, updated_clock, current_version_id)
                   VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)"#,
            )
            .bind(&document_id)
            .bind(workspace_id)
            .bind(&final_path)
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
            .bind(&user.id)
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
            .bind(&user.id)
            .bind(next_clock)
            .bind(&trash_id)
            .execute(&mut *tx)
            .await?;

            tx.commit().await?;

            hub.publish(
                workspace_id,
                WorkspaceEvent::DocumentTrashed {
                    source_session_id: String::new(),
                    relative_path: final_path,
                    action: "restored".to_string(),
                },
            )
            .await;

            Ok(())
        }
        TrashOperation::PermanentDelete { trash_id } => {
            let mut tx = pool.begin().await?;
            let next_clock =
                crate::handlers::document::next_workspace_clock(&mut tx, workspace_id).await?;

            let row = sqlx::query(
                "SELECT relative_path FROM document_trash WHERE id = ? AND workspace_id = ?",
            )
            .bind(&trash_id)
            .bind(workspace_id)
            .fetch_optional(&mut *tx)
            .await?;

            let result =
                sqlx::query("DELETE FROM document_trash WHERE id = ? AND workspace_id = ?")
                    .bind(&trash_id)
                    .bind(workspace_id)
                    .execute(&mut *tx)
                    .await?;

            if result.rows_affected() > 0 {
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
            }

            tx.commit().await?;

            if let Some(r) = row {
                let relative_path: String = r.try_get("relative_path")?;
                hub.publish(
                    workspace_id,
                    WorkspaceEvent::DocumentDeleted {
                        source_session_id: String::new(),
                        relative_path,
                        deleted_clock: next_clock,
                    },
                )
                .await;
            }

            Ok(())
        }
        TrashOperation::EmptyTrash => {
            let mut tx = pool.begin().await?;
            let next_clock =
                crate::handlers::document::next_workspace_clock(&mut tx, workspace_id).await?;

            let rows = sqlx::query(
                "SELECT relative_path FROM document_trash WHERE workspace_id = ? AND restored_at IS NULL",
            )
            .bind(workspace_id)
            .fetch_all(&mut *tx)
            .await?;

            sqlx::query(
                "DELETE FROM document_trash WHERE workspace_id = ? AND restored_at IS NULL",
            )
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

            for row in rows {
                if let Ok(relative_path) = row.try_get::<String, _>("relative_path") {
                    hub.publish(
                        workspace_id,
                        WorkspaceEvent::DocumentDeleted {
                            source_session_id: String::new(),
                            relative_path,
                            deleted_clock: next_clock,
                        },
                    )
                    .await;
                }
            }

            Ok(())
        }
    }
}
