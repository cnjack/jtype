use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
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

pub async fn list_documents(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Json<Vec<DocumentListItem>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let rows = sqlx::query(
        r#"SELECT id, relative_path, title, status, content_hash, updated_clock, current_version_id
           FROM documents WHERE workspace_id = ? ORDER BY relative_path"#,
    )
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;

    let docs = rows
        .into_iter()
        .map(|row| DocumentListItem {
            id: row.try_get("id").unwrap_or_default(),
            relative_path: row.try_get("relative_path").unwrap_or_default(),
            title: row.try_get("title").unwrap_or_default(),
            status: row.try_get("status").unwrap_or_default(),
            content_hash: row.try_get("content_hash").unwrap_or_default(),
            updated_clock: row.try_get("updated_clock").unwrap_or(0),
            version_id: row.try_get("current_version_id").unwrap_or(None),
        })
        .collect();

    Ok(Json(docs))
}

pub async fn get_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, document_id)): Path<(String, String)>,
) -> Result<Json<CloudDocument>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let row = sqlx::query(
        r#"SELECT relative_path, title, status, content, content_hash,
                  COALESCE(current_version_id, id) AS version_id, updated_clock
           FROM documents WHERE id = ? AND workspace_id = ?"#,
    )
    .bind(&document_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(CloudDocument {
        relative_path: row.try_get("relative_path")?,
        title: row.try_get("title")?,
        status: row.try_get("status")?,
        content: row.try_get("content")?,
        content_hash: row.try_get("content_hash")?,
        version_id: row.try_get("version_id")?,
        updated_clock: row.try_get("updated_clock")?,
    }))
}

pub async fn update_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, document_id)): Path<(String, String)>,
    Json(payload): Json<UpdateDocumentStatusRequest>,
) -> Result<Json<DocumentListItem>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let status = match payload.status.trim().to_ascii_lowercase().as_str() {
        "draft" => "draft",
        "published" => "published",
        "archived" => "archived",
        _ => {
            return Err(AppError::BadRequest(
                "status must be draft, published, or archived".to_string(),
            ))
        }
    };

    // Fetch previous status before updating
    let prev_row = sqlx::query(
        "SELECT status, relative_path FROM documents WHERE id = ? AND workspace_id = ?",
    )
    .bind(&document_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let previous_status: String = prev_row.try_get("status")?;
    let relative_path: String = prev_row.try_get("relative_path")?;

    let result = sqlx::query("UPDATE documents SET status = ? WHERE id = ? AND workspace_id = ?")
        .bind(status)
        .bind(&document_id)
        .bind(&workspace_id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    let row = sqlx::query(
        r#"SELECT id, relative_path, title, status, content_hash, updated_clock, current_version_id
           FROM documents WHERE id = ? AND workspace_id = ?"#,
    )
    .bind(&document_id)
    .bind(&workspace_id)
    .fetch_one(&state.pool)
    .await?;

    state
        .hub
        .publish(
            &workspace_id,
            WorkspaceEvent::DocumentStatusChanged {
                workspace_id: workspace_id.clone(),
                source_session_id: None,
                relative_path,
                document_id: document_id.clone(),
                status: status.to_string(),
                previous_status,
            },
        )
        .await;

    Ok(Json(DocumentListItem {
        id: row.try_get("id")?,
        relative_path: row.try_get("relative_path")?,
        title: row.try_get("title")?,
        status: row.try_get("status")?,
        content_hash: row.try_get("content_hash")?,
        updated_clock: row.try_get("updated_clock")?,
        version_id: row.try_get("current_version_id").unwrap_or(None),
    }))
}

pub async fn delete_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, document_id)): Path<(String, String)>,
) -> Result<StatusCode, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;
    let device_id = headers
        .get("x-device-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let mut tx = state.pool.begin().await?;

    let row = sqlx::query(
        r#"SELECT relative_path, title, content, content_hash, COALESCE(current_version_id, id) AS version_id
           FROM documents WHERE id = ? AND workspace_id = ? FOR UPDATE"#,
    )
    .bind(&document_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    let relative_path: String = row.try_get("relative_path")?;
    let title: String = row.try_get("title")?;
    let content: String = row.try_get("content")?;
    let content_hash: String = row.try_get("content_hash")?;
    let version_id: String = row.try_get("version_id")?;

    let trash_id = Uuid::new_v4().to_string();
    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;

    sqlx::query(
        r#"INSERT INTO document_trash (id, workspace_id, document_id, relative_path, title, content, content_hash, version_id, deleted_by_user_id, deleted_by_device_id, source_device_id, source_user_id, deleted_clock, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY))"#,
    )
    .bind(&trash_id)
    .bind(&workspace_id)
    .bind(&document_id)
    .bind(&relative_path)
    .bind(&title)
    .bind(&content)
    .bind(&content_hash)
    .bind(&version_id)
    .bind(&user.id)
    .bind(&device_id)
    .bind(&device_id)
    .bind(&user.id)
    .bind(next_clock)
    .execute(&mut *tx)
    .await?;

    sqlx::query("DELETE FROM documents WHERE id = ? AND workspace_id = ?")
        .bind(&document_id)
        .bind(&workspace_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    state
        .hub
        .publish(
            &workspace_id,
            WorkspaceEvent::DocumentDeleted {
                workspace_id: workspace_id.clone(),
                source_session_id: None,
                relative_path,
                deleted_clock: next_clock,
            },
        )
        .await;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_versions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, document_id)): Path<(String, String)>,
) -> Result<Json<Vec<DocumentVersionResponse>>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let rows = sqlx::query(
        r#"SELECT id, parent_version_id, source, content_hash, content, created_at
           FROM document_versions
           WHERE document_id = ? AND workspace_id = ?
           ORDER BY created_at DESC
           LIMIT 50"#,
    )
    .bind(&document_id)
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;

    let versions = rows
        .into_iter()
        .map(|row| DocumentVersionResponse {
            id: row.try_get("id").unwrap_or_default(),
            parent_version_id: row.try_get("parent_version_id").unwrap_or(None),
            source: row.try_get("source").unwrap_or_default(),
            content_hash: row.try_get("content_hash").unwrap_or_default(),
            content: row.try_get("content").unwrap_or_default(),
            created_at: row.try_get::<String, _>("created_at").unwrap_or_default(),
        })
        .collect();

    Ok(Json(versions))
}

// ── Internal helpers ──

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum MergeStatus {
    Accepted,
    Merged,
    Unchanged,
}

pub enum SaveDocumentOutcome {
    Saved(CloudDocument, MergeStatus),
    Conflict(SyncConflict),
}

pub async fn save_document_version(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    user: &AuthUser,
    payload: CloudSaveDocumentRequest,
    source: &str,
) -> Result<SaveDocumentOutcome, AppError> {
    let relative_path = normalize_relative_markdown_path(&payload.relative_path)?;
    let content_hash = sha256_hex(&payload.content);
    let title = payload
        .title
        .as_deref()
        .filter(|v| !v.trim().is_empty())
        .map(str::to_string)
        .or_else(|| extract_title(&payload.content))
        .unwrap_or_else(|| relative_path.clone());
    let status = normalize_status(payload.status.as_deref().unwrap_or(""), &payload.content);

    let current = sqlx::query(
        r#"SELECT id, content, content_hash, current_version_id, updated_clock
           FROM documents WHERE workspace_id = ? AND relative_path = ?"#,
    )
    .bind(workspace_id)
    .bind(&relative_path)
    .fetch_optional(pool)
    .await?;

    if let Some(row) = current {
        let document_id: String = row.try_get("id")?;
        let cloud_hash: String = row.try_get("content_hash")?;
        let cloud_content: String = row.try_get("content")?;
        let parent_version_id: Option<String> = row.try_get("current_version_id")?;
        let base_matches = payload
            .base_content_hash
            .as_deref()
            .map(|h| h == cloud_hash)
            .unwrap_or(true);

        if !base_matches && cloud_hash != content_hash {
            if let Some(base_content) = payload.base_content.as_deref() {
                match smart_three_way_merge(base_content, &payload.content, &cloud_content) {
                    MergeResult::Merged(merged) => {
                        let doc = save_merged_document(
                            pool,
                            workspace_id,
                            user,
                            &document_id,
                            &relative_path,
                            &title,
                            status,
                            &merged,
                            parent_version_id.as_deref(),
                            None,
                            source,
                        )
                        .await?;
                        return Ok(SaveDocumentOutcome::Saved(doc, MergeStatus::Merged));
                    }
                    MergeResult::Conflict { conflict_ranges } => {
                        let conflict = create_sync_conflict_with_ranges(
                            pool,
                            workspace_id,
                            &document_id,
                            &relative_path,
                            payload,
                            cloud_content,
                            Some(&conflict_ranges),
                        )
                        .await?;
                        return Ok(SaveDocumentOutcome::Conflict(conflict));
                    }
                }
            }
            let conflict = create_sync_conflict(
                pool,
                workspace_id,
                &document_id,
                &relative_path,
                payload,
                cloud_content,
            )
            .await?;
            return Ok(SaveDocumentOutcome::Conflict(conflict));
        }

        if cloud_hash == content_hash {
            let current_clock: i64 = row.try_get("updated_clock")?;
            return Ok(SaveDocumentOutcome::Saved(
                CloudDocument {
                    relative_path,
                    title,
                    status: status.to_string(),
                    content: payload.content,
                    content_hash,
                    version_id: parent_version_id.unwrap_or_default(),
                    updated_clock: current_clock,
                },
                MergeStatus::Unchanged,
            ));
        }
        let saved = save_merged_document(
            pool,
            workspace_id,
            user,
            &document_id,
            &relative_path,
            &title,
            status,
            &payload.content,
            parent_version_id.as_deref(),
            None,
            source,
        )
        .await?;
        return Ok(SaveDocumentOutcome::Saved(saved, MergeStatus::Accepted));
    }

    ensure_workspace_budget(pool, workspace_id, &relative_path, &payload.content).await?;
    let mut tx = pool.begin().await?;
    let document_id = Uuid::new_v4().to_string();
    let version_id = Uuid::new_v4().to_string();
    let next_clock = next_workspace_clock(&mut tx, workspace_id).await?;
    sqlx::query(
        r#"INSERT INTO documents (id, workspace_id, relative_path, title, status, content_hash, content, updated_clock, current_version_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             title = VALUES(title),
             status = VALUES(status),
             content_hash = VALUES(content_hash),
             content = VALUES(content),
             updated_clock = VALUES(updated_clock),
             current_version_id = VALUES(current_version_id)"#,
    )
    .bind(&document_id)
    .bind(workspace_id)
    .bind(&relative_path)
    .bind(&title)
    .bind(status)
    .bind(&content_hash)
    .bind(&payload.content)
    .bind(next_clock)
    .bind(&version_id)
    .execute(&mut *tx)
    .await?;
    insert_document_version(
        &mut tx,
        &version_id,
        workspace_id,
        &document_id,
        None,
        None,
        &user.id,
        source,
        &content_hash,
        &payload.content,
    )
    .await?;
    tx.commit().await?;

    Ok(SaveDocumentOutcome::Saved(
        CloudDocument {
            relative_path,
            title,
            status: status.to_string(),
            content: payload.content,
            content_hash,
            version_id,
            updated_clock: next_clock,
        },
        MergeStatus::Accepted,
    ))
}

pub async fn save_merged_document(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    user: &AuthUser,
    document_id: &str,
    relative_path: &str,
    title: &str,
    status: &str,
    content: &str,
    parent_version_id: Option<&str>,
    base_version_id: Option<&str>,
    source: &str,
) -> Result<CloudDocument, AppError> {
    ensure_workspace_budget(pool, workspace_id, relative_path, content).await?;
    let content_hash = sha256_hex(content);
    let mut tx = pool.begin().await?;
    let version_id = Uuid::new_v4().to_string();
    let next_clock = next_workspace_clock(&mut tx, workspace_id).await?;
    sqlx::query(
        r#"UPDATE documents SET title = ?, status = ?, content_hash = ?, content = ?, updated_clock = ?, current_version_id = ?
           WHERE id = ? AND workspace_id = ?"#,
    )
    .bind(title)
    .bind(status)
    .bind(&content_hash)
    .bind(content)
    .bind(next_clock)
    .bind(&version_id)
    .bind(document_id)
    .bind(workspace_id)
    .execute(&mut *tx)
    .await?;
    insert_document_version(
        &mut tx,
        &version_id,
        workspace_id,
        document_id,
        parent_version_id,
        base_version_id,
        &user.id,
        source,
        &content_hash,
        content,
    )
    .await?;
    tx.commit().await?;

    Ok(CloudDocument {
        relative_path: relative_path.to_string(),
        title: title.to_string(),
        status: status.to_string(),
        content: content.to_string(),
        content_hash,
        version_id,
        updated_clock: next_clock,
    })
}

async fn insert_document_version(
    tx: &mut sqlx::Transaction<'_, sqlx::MySql>,
    version_id: &str,
    workspace_id: &str,
    document_id: &str,
    parent_version_id: Option<&str>,
    base_version_id: Option<&str>,
    author_user_id: &str,
    source: &str,
    content_hash: &str,
    content: &str,
) -> Result<(), AppError> {
    sqlx::query(
        r#"INSERT INTO document_versions (id, workspace_id, document_id, parent_version_id, base_version_id, author_user_id, source, content_hash, content)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(version_id)
    .bind(workspace_id)
    .bind(document_id)
    .bind(parent_version_id)
    .bind(base_version_id)
    .bind(author_user_id)
    .bind(source)
    .bind(content_hash)
    .bind(content)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn next_workspace_clock(
    tx: &mut sqlx::Transaction<'_, sqlx::MySql>,
    workspace_id: &str,
) -> Result<i64, AppError> {
    let row = sqlx::query(
        r#"SELECT GREATEST(
                COALESCE((SELECT MAX(updated_clock) FROM documents WHERE workspace_id = ?), 0),
                COALESCE((SELECT MAX(deleted_clock) FROM document_trash WHERE workspace_id = ?), 0),
                COALESCE((SELECT MAX(updated_clock) FROM workspace_folders WHERE workspace_id = ?), 0),
                COALESCE((SELECT MAX(deleted_clock) FROM workspace_folder_deletions WHERE workspace_id = ?), 0)
            ) + 1 AS next_clock"#,
    )
    .bind(workspace_id)
    .bind(workspace_id)
    .bind(workspace_id)
    .bind(workspace_id)
    .fetch_one(&mut **tx)
    .await?;
    Ok(row.try_get("next_clock")?)
}

pub async fn ensure_workspace_budget(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    relative_path: &str,
    next_content: &str,
) -> Result<(), AppError> {
    let row = sqlx::query(
        r#"SELECT COALESCE(w.storage_budget_bytes, 1073741824) AS budget,
                   CAST(COALESCE(SUM(CASE WHEN d.relative_path <> ? THEN OCTET_LENGTH(d.content) ELSE 0 END), 0) AS SIGNED) AS used_bytes
           FROM workspaces w
           LEFT JOIN documents d ON d.workspace_id = w.id
           WHERE w.id = ?
           GROUP BY w.id, w.storage_budget_bytes"#,
    )
    .bind(relative_path)
    .bind(workspace_id)
    .fetch_one(pool)
    .await?;
    let budget: i64 = row.try_get("budget")?;
    let used_bytes: i64 = row.try_get("used_bytes")?;
    let next_bytes = next_content.as_bytes().len() as i64;
    if used_bytes + next_bytes > budget {
        return Err(AppError::BadRequest(format!(
            "workspace storage budget exceeded: {} of {} bytes",
            used_bytes + next_bytes,
            budget
        )));
    }
    Ok(())
}

async fn create_sync_conflict(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    document_id: &str,
    relative_path: &str,
    payload: CloudSaveDocumentRequest,
    cloud_content: String,
) -> Result<SyncConflict, AppError> {
    create_sync_conflict_with_ranges(
        pool,
        workspace_id,
        document_id,
        relative_path,
        payload,
        cloud_content,
        None,
    )
    .await
}

async fn create_sync_conflict_with_ranges(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    document_id: &str,
    relative_path: &str,
    payload: CloudSaveDocumentRequest,
    cloud_content: String,
    conflict_ranges: Option<&Vec<crate::util::ConflictRange>>,
) -> Result<SyncConflict, AppError> {
    let conflict_id = Uuid::new_v4().to_string();
    let ranges_json: Option<serde_json::Value> = conflict_ranges.and_then(|ranges| {
        if ranges.is_empty() {
            None
        } else {
            serde_json::to_value(ranges).ok()
        }
    });
    sqlx::query(
        r#"INSERT INTO sync_conflicts (id, workspace_id, document_id, relative_path, base_content, local_content, cloud_content, conflict_ranges)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&conflict_id)
    .bind(workspace_id)
    .bind(document_id)
    .bind(relative_path)
    .bind(&payload.base_content)
    .bind(&payload.content)
    .bind(&cloud_content)
    .bind(&ranges_json)
    .execute(pool)
    .await?;
    Ok(SyncConflict {
        conflict_id,
        relative_path: relative_path.to_string(),
        local_content: payload.content,
        cloud_content,
        base_content: payload.base_content,
        conflict_ranges: ranges_json,
    })
}
