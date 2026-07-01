use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
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
        r#"SELECT id, relative_path, title, is_published, content_hash, updated_clock, current_version_id
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
            is_published: row.try_get::<i8, _>("is_published").unwrap_or(0) != 0,
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
        r#"SELECT relative_path, title, is_published, content, content_hash,
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
        is_published: row.try_get::<i8, _>("is_published").unwrap_or(0) != 0,
        content: row.try_get("content")?,
        content_hash: row.try_get("content_hash")?,
        version_id: row.try_get("version_id")?,
        updated_clock: row.try_get("updated_clock")?,
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

    let session_id = super::extract_session_id(&headers);
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::DocumentTrashed {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                relative_path,
                action: "trashed".to_string(),
                event_clock: next_clock,
                source: "desktop".to_string(),
                device_id: device_id.clone(),
            },
            session_id.as_deref(),
        )
        .await;

    Ok(StatusCode::NO_CONTENT)
}

/// REST endpoint: POST /api/v1/workspaces/:workspace_id/documents/save
///
/// Saves or creates a single document with three-way merge support.
/// Replaces the deprecated WS `document:save` operation.
pub async fn save_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<CloudSaveDocumentRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let client_type = headers
        .get("x-client-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("web");
    let device_id = headers
        .get("x-device-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let session_id = super::extract_session_id(&headers);

    match save_document_version(&state.pool, &workspace_id, &user, payload, client_type).await? {
        SaveDocumentOutcome::Saved(doc, merge_status) => {
            state
                .hub
                .publish_to_workspace(
                    &workspace_id,
                    WorkspaceEvent::DocumentChanged {
                        workspace_id: workspace_id.clone(),
                        source_session_id: session_id.clone(),
                        relative_path: doc.relative_path.clone(),
                        content_hash: doc.content_hash.clone(),
                        updated_clock: doc.updated_clock,
                        edited_by: user.username.clone(),
                        source: client_type.to_string(),
                        device_id,
                    },
                    session_id.as_deref(),
                )
                .await;

            Ok(Json(serde_json::json!({
                "relativePath": doc.relative_path,
                "title": doc.title,
                "content": doc.content,
                "contentHash": doc.content_hash,
                "versionId": doc.version_id,
                "updatedClock": doc.updated_clock,
                "isPublished": doc.is_published,
                "mergeStatus": merge_status,
            }))
            .into_response())
        }
        SaveDocumentOutcome::Conflict(c) => {
            Ok((
                StatusCode::CONFLICT,
                Json(serde_json::json!({
                    "error": "conflict",
                    "conflictId": c.conflict_id,
                    "relativePath": c.relative_path,
                })),
            )
                .into_response())
        }
    }
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
        r#"SELECT v.id, v.parent_version_id, v.source, v.content_hash, v.content,
                  CAST(v.created_at AS CHAR) AS created_at, u.username AS author_username
           FROM document_versions v
           LEFT JOIN users u ON u.id = v.author_user_id
           WHERE v.document_id = ? AND v.workspace_id = ?
           ORDER BY v.created_at DESC
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
            author_username: row.try_get("author_username").unwrap_or(None),
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

/// Persist a document version, then fire the re-homed kanban webhook for card
/// saves. The trigger lives HERE (not only in the REST `save_document`) so the
/// content write paths that flow through this wrapper — REST, desktop sync push,
/// live collaborative edits — notify on a real card change. Paths that persist
/// via [`save_merged_document`] directly (notably conflict resolution) do NOT
/// fire here; they call [`fire_card_webhook`] explicitly after the merged save.
pub async fn save_document_version(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    user: &AuthUser,
    payload: CloudSaveDocumentRequest,
    source: &str,
) -> Result<SaveDocumentOutcome, AppError> {
    let outcome = save_document_version_inner(pool, workspace_id, user, payload, source).await?;
    if let SaveDocumentOutcome::Saved(doc, status) = &outcome {
        // Unchanged = a no-op re-save; don't fire on those.
        if !matches!(status, MergeStatus::Unchanged) {
            fire_card_webhook(pool, workspace_id, doc, &user.username).await;
        }
    }
    Ok(outcome)
}

/// Fire a `kanban:card-updated` webhook for a saved card (`.md` carrying `board:`
/// frontmatter), scoped to the board's logical id. Best-effort — never affects
/// the save; a non-card document is a no-op.
pub(crate) async fn fire_card_webhook(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    doc: &CloudDocument,
    editor: &str,
) {
    if !doc.relative_path.to_ascii_lowercase().ends_with(".md") {
        return;
    }
    let fm = jtype_core::parse_frontmatter(&doc.content);
    let Some(board_ref) = fm.get("board").map(String::as_str).filter(|b| !b.is_empty()) else {
        return;
    };
    let payload = serde_json::json!({
        "event": "kanban:card-updated",
        "workspaceId": workspace_id,
        "board": board_ref,
        "card": {
            "path": doc.relative_path,
            "title": fm.get("title").cloned().unwrap_or_default(),
            "status": fm.get("status").cloned().unwrap_or_default(),
            "priority": fm.get("priority"),
            "assignee": fm.get("assignee"),
            "due": fm.get("due"),
        },
        "editedBy": editor,
        "updatedClock": doc.updated_clock,
    });
    // Push (outbound webhooks) and pull (board SSE feed) fire from the same
    // trigger so both stay in lock-step. The SSE side is live-only — publish is a
    // no-op when no client is currently subscribed to this board.
    crate::board_events::global().publish(workspace_id, board_ref, payload.to_string());
    crate::handlers::webhooks::enqueue_event(pool, workspace_id, Some(board_ref), "kanban:card-updated", payload).await;
}

async fn save_document_version_inner(
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
                    is_published: false,
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
        r#"INSERT INTO documents (id, workspace_id, relative_path, title, content_hash, content, updated_clock, current_version_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             title = VALUES(title),
             content_hash = VALUES(content_hash),
             content = VALUES(content),
             updated_clock = VALUES(updated_clock),
             current_version_id = VALUES(current_version_id)"#,
    )
    .bind(&document_id)
    .bind(workspace_id)
    .bind(&relative_path)
    .bind(&title)
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
            is_published: false,
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
        r#"UPDATE documents SET title = ?, content_hash = ?, content = ?, updated_clock = ?, current_version_id = ?
           WHERE id = ? AND workspace_id = ?"#,
    )
    .bind(title)
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
        is_published: false,
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
    let result = sqlx::query(
        r#"UPDATE workspaces
           SET sync_clock = LAST_INSERT_ID(sync_clock + 1),
               updated_at = updated_at
           WHERE id = ?"#,
    )
    .bind(workspace_id)
    .execute(&mut **tx)
    .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    let row = sqlx::query("SELECT CAST(LAST_INSERT_ID() AS SIGNED) AS next_clock")
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
