//! Card handlers — the most complex part of the kanban module.
//!
//! Endpoints:
//!   GET    /api/v1/workspaces/:workspace_id/kanban/boards/:board_id/cards
//!   POST   /api/v1/workspaces/:workspace_id/kanban/boards/:board_id/cards
//!   PATCH  /api/v1/workspaces/:workspace_id/kanban/cards/:card_id
//!   POST   /api/v1/workspaces/:workspace_id/kanban/boards/:board_id/cards/move
//!   POST   /api/v1/workspaces/:workspace_id/kanban/cards/:card_id/archive
//!   POST   /api/v1/workspaces/:workspace_id/kanban/cards/:card_id/restore
//!   DELETE /api/v1/workspaces/:workspace_id/kanban/cards/:card_id  (admin+)
//!
//! Concurrency: PATCH and POST /move (if base_updated_clock is provided) use
//! optimistic locking — return 409 with the latest snapshot on stale write.

use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::Row;
use uuid::Uuid;

use super::board::{header_device_id, load_card_label_ids, load_label_ids_for_cards};
use super::{clamp_str, next_workspace_clock, normalize_due_at, validate_assignee, validate_priority, validate_uuid};
use crate::db::models::*;
use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::hub::WorkspaceEvent;
use crate::middleware::auth::extract_user;
use crate::AppState;

const MAX_CARD_TITLE: usize = 512;
const MAX_CARD_DESCRIPTION: usize = 16 * 1024 * 1024 - 1; // MEDIUMTEXT cap
const TRASH_RETENTION_DAYS: i64 = 30;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCardsQuery {
    #[serde(default)]
    pub include_archived: bool,
}

// ── list_cards ──

pub async fn list_cards(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, board_id)): Path<(String, String)>,
    Query(q): Query<ListCardsQuery>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    // Verify board belongs to workspace
    let exists: Option<String> = sqlx::query_scalar(
        "SELECT id FROM kanban_boards WHERE id = ? AND workspace_id = ?",
    )
    .bind(&board_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?;
    if exists.is_none() {
        return Err(AppError::NotFound);
    }

    let archived_filter = if q.include_archived {
        "" // no filter — include everything
    } else {
        "AND archived_at IS NULL"
    };

    let sql = format!(
        r#"SELECT id, workspace_id, board_id, column_id, title, description, position, priority,
                  CAST(due_at AS CHAR) AS due_at, assignee_user_id, properties_extra,
                  created_by_user_id, updated_clock, version_id,
                  CAST(archived_at AS CHAR) AS archived_at,
                  CAST(created_at AS CHAR) AS created_at, CAST(updated_at AS CHAR) AS updated_at
           FROM kanban_cards
           WHERE board_id = ? {archived_filter}
           ORDER BY column_id ASC, position ASC"#,
    );

    let rows = sqlx::query(&sql)
        .bind(&board_id)
        .fetch_all(&state.pool)
        .await?;

    let card_ids: Vec<String> = rows
        .iter()
        .filter_map(|r| r.try_get::<String, _>("id").ok())
        .collect();
    let mut labels_by_card = load_label_ids_for_cards(&state.pool, &card_ids).await?;
    let mut cards: Vec<KanbanCard> = Vec::with_capacity(rows.len());
    for r in rows {
        let card_id: String = r.try_get("id")?;
        let label_ids = labels_by_card.remove(&card_id).unwrap_or_default();
        cards.push(KanbanCard {
            id: card_id,
            workspace_id: r.try_get("workspace_id")?,
            board_id: r.try_get("board_id")?,
            column_id: r.try_get("column_id")?,
            title: r.try_get("title")?,
            description: r.try_get("description")?,
            position: r.try_get("position")?,
            priority: r.try_get("priority")?,
            due_at: r.try_get::<Option<String>, _>("due_at")?,
            assignee_user_id: r.try_get("assignee_user_id")?,
            properties_extra: r.try_get("properties_extra")?,
            label_ids,
            created_by_user_id: r.try_get("created_by_user_id")?,
            updated_clock: r.try_get("updated_clock")?,
            version_id: r.try_get("version_id")?,
            archived_at: r.try_get::<Option<String>, _>("archived_at")?,
            created_at: r.try_get::<String, _>("created_at")?,
            updated_at: r.try_get::<String, _>("updated_at")?,
        });
    }

    Ok(Json(cards).into_response())
}

// ── create_card ──

pub async fn create_card(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, board_id)): Path<(String, String)>,
    Json(payload): Json<CreateKanbanCardRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let title = clamp_str(payload.title.trim(), MAX_CARD_TITLE);
    if title.is_empty() {
        return Err(AppError::BadRequest("card title cannot be empty".into()));
    }
    let description = payload
        .description
        .as_deref()
        .map(|d| clamp_str(d, MAX_CARD_DESCRIPTION));
    let priority = match payload.priority.as_deref() {
        Some(p) => validate_priority(p)?.to_string(),
        None => "none".to_string(),
    };
    let due_at = match payload.due_at.as_deref() {
        Some(d) => Some(normalize_due_at(d)?),
        None => None,
    };
    validate_assignee(&state.pool, &workspace_id, payload.assignee_user_id.as_deref()).await?;
    // Client-generated id reused on both ends (design §11.11); absent → generated.
    let card_id = match payload.id.as_deref() {
        Some(id) => { validate_uuid(id)?; id.to_string() }
        None => Uuid::new_v4().to_string(),
    };

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let mut tx = state.pool.begin().await?;

    // Verify column belongs to board belongs to workspace
    let col_info: Option<(String, String)> = sqlx::query_as(
        r#"SELECT c.id, c.board_id
           FROM kanban_columns c
           JOIN kanban_boards b ON b.id = c.board_id
           WHERE c.id = ? AND b.id = ? AND b.workspace_id = ?"#,
    )
    .bind(&payload.column_id)
    .bind(&board_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?;
    let (_col_id_check, _board_id_check) = col_info.ok_or(AppError::NotFound)?;

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;

    // Append to end of column
    let next_pos: i32 = sqlx::query_scalar(
        r#"SELECT COALESCE(MAX(position), -1) + 1 FROM kanban_cards
           WHERE column_id = ? AND archived_at IS NULL"#,
    )
    .bind(&payload.column_id)
    .fetch_one(&mut *tx)
    .await?;

    let version_id = Uuid::new_v4().to_string();

    sqlx::query(
        r#"INSERT INTO kanban_cards
           (id, workspace_id, board_id, column_id, title, description, position, priority,
            due_at, assignee_user_id, properties_extra, created_by_user_id, updated_clock, version_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&card_id)
    .bind(&workspace_id)
    .bind(&board_id)
    .bind(&payload.column_id)
    .bind(&title)
    .bind(&description)
    .bind(next_pos)
    .bind(&priority)
    .bind(due_at.as_deref())
    .bind(payload.assignee_user_id.as_deref())
    .bind(payload.properties_extra.clone())
    .bind(&user.id)
    .bind(next_clock)
    .bind(&version_id)
    .execute(&mut *tx)
    .await?;

    // Labels
    if let Some(label_ids) = &payload.label_ids {
        for lid in label_ids {
            // Ensure label belongs to this board
            let ok: Option<String> = sqlx::query_scalar(
                "SELECT id FROM kanban_labels WHERE id = ? AND board_id = ?",
            )
            .bind(lid)
            .bind(&board_id)
            .fetch_optional(&mut *tx)
            .await?;
            if ok.is_none() {
                return Err(AppError::BadRequest(format!(
                    "label {} does not belong to this board",
                    lid
                )));
            }
            sqlx::query(
                "INSERT INTO kanban_card_labels (card_id, label_id) VALUES (?, ?)",
            )
            .bind(&card_id)
            .bind(lid)
            .execute(&mut *tx)
            .await?;
        }
    }

    tx.commit().await?;

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanCardUpdated {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id: board_id.clone(),
                column_id: payload.column_id.clone(),
                card_id: card_id.clone(),
                title: title.clone(),
                position: next_pos,
                priority: priority.clone(),
                updated_clock: next_clock,
                edited_by: user.username.clone(),
                source: "web".to_string(),
                device_id,
            },
            session_id.as_deref(),
        )
        .await;

    super::webhook::enqueue_event(
        &state.pool,
        &workspace_id,
        &board_id,
        "kanban:card-updated",
        json!({ "event": "kanban:card-updated", "cardId": card_id, "boardId": board_id }),
    )
    .await;

    // Re-fetch with DB timestamps
    fetch_card_response(&state, &workspace_id, &card_id).await
}

// ── patch_card (with optional optimistic lock) ──

pub async fn patch_card(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, card_id)): Path<(String, String)>,
    Json(payload): Json<UpdateKanbanCardRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    // Validate inputs before taking any lock (pure, no DB access).
    let new_title = match payload.title.as_deref() {
        Some(t) => {
            let v = clamp_str(t.trim(), MAX_CARD_TITLE);
            if v.is_empty() {
                return Err(AppError::BadRequest("card title cannot be empty".into()));
            }
            Some(v)
        }
        None => None,
    };
    let new_priority = match payload.priority.as_deref() {
        Some(p) => Some(validate_priority(p)?.to_string()),
        None => None,
    };
    // Outer Some = field present in patch; inner Option = set-or-clear.
    let new_due_at: Option<Option<String>> = match &payload.due_at {
        Some(Some(d)) => Some(Some(normalize_due_at(d)?)),
        Some(None) => Some(None),
        None => None,
    };
    if let Some(Some(a)) = &payload.assignee_user_id {
        validate_assignee(&state.pool, &workspace_id, Some(a)).await?;
    }

    let mut tx = state.pool.begin().await?;

    // Lock the card row, verify ownership, and load current state inside the tx
    // so the optimistic-lock check and the write are atomic (no TOCTOU window).
    let current_row = sqlx::query(
        r#"SELECT c.id, c.workspace_id, c.board_id, c.column_id, c.title, c.description, c.position,
                  c.priority, CAST(c.due_at AS CHAR) AS due_at, c.assignee_user_id, c.properties_extra,
                  c.created_by_user_id, c.updated_clock, c.version_id,
                  CAST(c.archived_at AS CHAR) AS archived_at,
                  CAST(c.created_at AS CHAR) AS created_at, CAST(c.updated_at AS CHAR) AS updated_at
           FROM kanban_cards c
           JOIN kanban_boards b ON b.id = c.board_id
           WHERE c.id = ? AND b.workspace_id = ?
           FOR UPDATE"#,
    )
    .bind(&card_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    let current_clock: i64 = current_row.try_get("updated_clock")?;
    let current_priority: String = current_row.try_get("priority")?;
    let current_column_id: String = current_row.try_get("column_id")?;
    let current_board_id: String = current_row.try_get("board_id")?;
    let current_position: i32 = current_row.try_get("position")?;

    // Optimistic lock check (inside the tx; an early return rolls it back).
    if let Some(base) = payload.base_updated_clock {
        if base != current_clock && !payload.force.unwrap_or(false) {
            // Build current snapshot
            let current_label_ids = load_card_label_ids(&state.pool, &card_id).await?;
            let latest = KanbanCard {
                id: card_id.clone(),
                workspace_id: workspace_id.clone(),
                board_id: current_board_id.clone(),
                column_id: current_column_id.clone(),
                title: current_row.try_get("title")?,
                description: current_row.try_get("description")?,
                position: current_position,
                priority: current_priority.clone(),
                due_at: current_row.try_get::<Option<String>, _>("due_at")?,
                assignee_user_id: current_row.try_get("assignee_user_id")?,
                properties_extra: current_row.try_get("properties_extra")?,
                label_ids: current_label_ids,
                created_by_user_id: current_row.try_get("created_by_user_id")?,
                updated_clock: current_clock,
                version_id: current_row.try_get("version_id")?,
                archived_at: current_row.try_get::<Option<String>, _>("archived_at")?,
                created_at: current_row.try_get::<String, _>("created_at")?,
                updated_at: current_row.try_get::<String, _>("updated_at")?,
            };
            return Ok((
                StatusCode::CONFLICT,
                Json(KanbanConflictResponse {
                    error: "conflict",
                    card_id: card_id.clone(),
                    latest,
                    base_updated_clock: Some(base),
                }),
            )
                .into_response());
        }
    }

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;
    let new_version = Uuid::new_v4().to_string();

    if let Some(t) = &new_title {
        sqlx::query("UPDATE kanban_cards SET title = ? WHERE id = ?")
            .bind(t)
            .bind(&card_id)
            .execute(&mut *tx)
            .await?;
    }
    if let Some(d_opt) = &payload.description {
        match d_opt {
            Some(d) => {
                sqlx::query("UPDATE kanban_cards SET description = ? WHERE id = ?")
                    .bind(clamp_str(d, MAX_CARD_DESCRIPTION))
                    .bind(&card_id)
                    .execute(&mut *tx)
                    .await?;
            }
            None => {
                sqlx::query("UPDATE kanban_cards SET description = NULL WHERE id = ?")
                    .bind(&card_id)
                    .execute(&mut *tx)
                    .await?;
            }
        }
    }
    if let Some(p) = &new_priority {
        sqlx::query("UPDATE kanban_cards SET priority = ? WHERE id = ?")
            .bind(p)
            .bind(&card_id)
            .execute(&mut *tx)
            .await?;
    }
    if let Some(due_opt) = &new_due_at {
        match due_opt {
            Some(d) => {
                sqlx::query("UPDATE kanban_cards SET due_at = ? WHERE id = ?")
                    .bind(d)
                    .bind(&card_id)
                    .execute(&mut *tx)
                    .await?;
            }
            None => {
                sqlx::query("UPDATE kanban_cards SET due_at = NULL WHERE id = ?")
                    .bind(&card_id)
                    .execute(&mut *tx)
                    .await?;
            }
        }
    }
    if let Some(assignee_opt) = &payload.assignee_user_id {
        match assignee_opt {
            Some(a) => {
                sqlx::query("UPDATE kanban_cards SET assignee_user_id = ? WHERE id = ?")
                    .bind(a)
                    .bind(&card_id)
                    .execute(&mut *tx)
                    .await?;
            }
            None => {
                sqlx::query("UPDATE kanban_cards SET assignee_user_id = NULL WHERE id = ?")
                    .bind(&card_id)
                    .execute(&mut *tx)
                    .await?;
            }
        }
    }
    if let Some(extra) = &payload.properties_extra {
        sqlx::query("UPDATE kanban_cards SET properties_extra = ? WHERE id = ?")
            .bind(extra.clone())
            .bind(&card_id)
            .execute(&mut *tx)
            .await?;
    }
    if let Some(label_ids) = &payload.label_ids {
        // Replace label set
        sqlx::query("DELETE FROM kanban_card_labels WHERE card_id = ?")
            .bind(&card_id)
            .execute(&mut *tx)
            .await?;
        for lid in label_ids {
            let ok: Option<String> = sqlx::query_scalar(
                "SELECT id FROM kanban_labels WHERE id = ? AND board_id = ?",
            )
            .bind(lid)
            .bind(&current_board_id)
            .fetch_optional(&mut *tx)
            .await?;
            if ok.is_none() {
                return Err(AppError::BadRequest(format!(
                    "label {} does not belong to this board",
                    lid
                )));
            }
            sqlx::query("INSERT INTO kanban_card_labels (card_id, label_id) VALUES (?, ?)")
                .bind(&card_id)
                .bind(lid)
                .execute(&mut *tx)
                .await?;
        }
    }

    sqlx::query("UPDATE kanban_cards SET updated_clock = ?, version_id = ? WHERE id = ?")
        .bind(next_clock)
        .bind(&new_version)
        .bind(&card_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    let final_title = new_title.unwrap_or_else(|| {
        current_row.try_get::<String, _>("title").unwrap_or_default()
    });
    let final_priority = new_priority.unwrap_or(current_priority);

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanCardUpdated {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id: current_board_id.clone(),
                column_id: current_column_id.clone(),
                card_id: card_id.clone(),
                title: final_title.clone(),
                position: current_position,
                priority: final_priority.clone(),
                updated_clock: next_clock,
                edited_by: user.username.clone(),
                source: "web".to_string(),
                device_id,
            },
            session_id.as_deref(),
        )
        .await;

    fetch_card_response(&state, &workspace_id, &card_id).await
}

// ── move_card (across columns / reorder within column) ──

pub async fn move_card(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, _board_id)): Path<(String, String)>,
    Json(payload): Json<MoveKanbanCardRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let mut tx = state.pool.begin().await?;

    // Lock the card row and load current state inside the tx so the optimistic-lock
    // check and the position rewrite are atomic (no TOCTOU window).
    let current = sqlx::query(
        r#"SELECT c.board_id, c.column_id, c.updated_clock,
                  CAST(c.archived_at AS CHAR) AS archived_at
           FROM kanban_cards c
           JOIN kanban_boards b ON b.id = c.board_id
           WHERE c.id = ? AND b.workspace_id = ?
           FOR UPDATE"#,
    )
    .bind(&payload.card_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;
    let current_board_id: String = current.try_get("board_id")?;
    let current_column_id: String = current.try_get("column_id")?;
    let current_clock: i64 = current.try_get("updated_clock")?;
    let current_archived: Option<String> = current.try_get("archived_at")?;
    if current_archived.is_some() {
        return Err(AppError::BadRequest("cannot move archived card; restore first".into()));
    }

    // Optional optimistic lock (inside the tx; an early return rolls it back).
    if let Some(base) = payload.base_updated_clock {
        if base != current_clock && !payload.force.unwrap_or(false) {
            let latest = fetch_card_value(&state, &workspace_id, &payload.card_id).await?;
            return Ok((
                StatusCode::CONFLICT,
                Json(KanbanConflictResponse {
                    error: "conflict",
                    card_id: payload.card_id.clone(),
                    latest,
                    base_updated_clock: Some(base),
                }),
            )
                .into_response());
        }
    }

    // Verify target column belongs to same board and same workspace.
    let target_col: Option<(String, String)> = sqlx::query_as(
        r#"SELECT c.id, c.board_id
           FROM kanban_columns c
           JOIN kanban_boards b ON b.id = c.board_id
           WHERE c.id = ? AND b.workspace_id = ?"#,
    )
    .bind(&payload.target_column_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?;
    let (_tcid, target_board_id) = target_col.ok_or(AppError::NotFound)?;
    if target_board_id != current_board_id {
        return Err(AppError::BadRequest(
            "cannot move card across boards via this endpoint".into(),
        ));
    }

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;
    let new_version = Uuid::new_v4().to_string();

    if payload.target_column_id == current_column_id {
        // Reorder within the same column
        // Simple approach: shift others and place this card at target_position
        // Pull all cards in target column (active only) ordered by position
        let mut all_ids: Vec<(String, i32)> = sqlx::query_as(
            r#"SELECT id, position FROM kanban_cards
               WHERE column_id = ? AND archived_at IS NULL
               ORDER BY position ASC
               FOR UPDATE"#,
        )
        .bind(&payload.target_column_id)
        .fetch_all(&mut *tx)
        .await?;
        // Remove the moving card
        all_ids.retain(|(id, _)| id != &payload.card_id);
        let target_idx = (payload.target_position as usize).min(all_ids.len());
        all_ids.insert(target_idx, (payload.card_id.clone(), 0));

        for (i, (id, _)) in all_ids.iter().enumerate() {
            sqlx::query("UPDATE kanban_cards SET position = ? WHERE id = ?")
                .bind(i as i32)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }
    } else {
        // Move across columns: compact source column and place in target
        // Compact source
        let source_cards: Vec<(String,)> = sqlx::query_as(
            r#"SELECT id FROM kanban_cards
               WHERE column_id = ? AND archived_at IS NULL AND id <> ?
               ORDER BY position ASC
               FOR UPDATE"#,
        )
        .bind(&current_column_id)
        .bind(&payload.card_id)
        .fetch_all(&mut *tx)
        .await?;
        for (i, (id,)) in source_cards.iter().enumerate() {
            sqlx::query("UPDATE kanban_cards SET position = ? WHERE id = ?")
                .bind(i as i32)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }

        // Insert into target column
        let target_cards: Vec<(String,)> = sqlx::query_as(
            r#"SELECT id FROM kanban_cards
               WHERE column_id = ? AND archived_at IS NULL
               ORDER BY position ASC
               FOR UPDATE"#,
        )
        .bind(&payload.target_column_id)
        .fetch_all(&mut *tx)
        .await?;
        let target_idx = (payload.target_position as usize).min(target_cards.len());

        // Shift target cards at and after target_idx
        let mut new_target: Vec<String> = target_cards.into_iter().map(|(s,)| s).collect();
        new_target.insert(target_idx, payload.card_id.clone());
        for (i, id) in new_target.iter().enumerate() {
            sqlx::query(
                r#"UPDATE kanban_cards SET position = ?, column_id = CASE WHEN id = ? THEN ? ELSE column_id END
                   WHERE id = ?"#,
            )
            .bind(i as i32)
            .bind(id)
            .bind(&payload.target_column_id)
            .bind(id)
            .execute(&mut *tx)
            .await?;
        }
    }

    sqlx::query("UPDATE kanban_cards SET updated_clock = ?, version_id = ? WHERE id = ?")
        .bind(next_clock)
        .bind(&new_version)
        .bind(&payload.card_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    // Refetch final card
    let card = fetch_card_value(&state, &workspace_id, &payload.card_id).await?;
    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanCardUpdated {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id: card.board_id.clone(),
                column_id: card.column_id.clone(),
                card_id: card.id.clone(),
                title: card.title.clone(),
                position: card.position,
                priority: card.priority.clone(),
                updated_clock: next_clock,
                edited_by: user.username.clone(),
                source: "web".to_string(),
                device_id,
            },
            session_id.as_deref(),
        )
        .await;

    super::webhook::enqueue_event(
        &state.pool,
        &workspace_id,
        &card.board_id,
        "kanban:card-updated",
        json!({ "event": "kanban:card-updated", "cardId": card.id, "boardId": card.board_id }),
    )
    .await;

    Ok(Json(card).into_response())
}

// ── archive_card ──

pub async fn archive_card(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, card_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let mut tx = state.pool.begin().await?;

    let row = sqlx::query(
        r#"SELECT c.id, c.workspace_id, c.board_id, c.column_id, c.title, c.description, c.priority,
                  c.position, CAST(c.due_at AS CHAR) AS due_at, c.assignee_user_id,
                  c.properties_extra, c.created_by_user_id
           FROM kanban_cards c
           JOIN kanban_boards b ON b.id = c.board_id
           WHERE c.id = ? AND b.workspace_id = ?
           FOR UPDATE"#,
    )
    .bind(&card_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    let already_archived: Option<String> =
        sqlx::query_scalar("SELECT archived_at FROM kanban_cards WHERE id = ?")
            .bind(&card_id)
            .fetch_one(&mut *tx)
            .await?;
    if already_archived.is_some() {
        return Err(AppError::BadRequest("card already archived".into()));
    }

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;
    let trash_id = Uuid::new_v4().to_string();
    let column_id: String = row.try_get("column_id")?;
    let board_id: String = row.try_get("board_id")?;
    let label_ids = load_card_label_ids(&state.pool, &card_id).await?;
    let label_ids_json = serde_json::to_value(&label_ids).unwrap_or(serde_json::json!([]));

    sqlx::query(
        r#"INSERT INTO kanban_card_trash
           (id, workspace_id, card_id, board_id, column_id, title, description, priority,
            position, due_at, assignee_user_id, properties_extra, label_ids,
            created_by_user_id, archived_by_user_id, archived_by_device_id, source_device_id, source_user_id,
            archived_clock, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                   DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))"#,
    )
    .bind(&trash_id)
    .bind(&workspace_id)
    .bind(&card_id)
    .bind(&board_id)
    .bind(&column_id)
    .bind(row.try_get::<String, _>("title")?)
    .bind(row.try_get::<Option<String>, _>("description")?)
    .bind(row.try_get::<String, _>("priority")?)
    .bind(row.try_get::<i32, _>("position")?)
    .bind(row.try_get::<Option<String>, _>("due_at")?)
    .bind(row.try_get::<Option<String>, _>("assignee_user_id")?)
    .bind(row.try_get::<Option<serde_json::Value>, _>("properties_extra")?)
    .bind(&label_ids_json)
    .bind(row.try_get::<String, _>("created_by_user_id")?)
    .bind(&user.id)
    .bind(&device_id)
    .bind(&device_id)
    .bind(&user.id)
    .bind(next_clock)
    .bind(TRASH_RETENTION_DAYS)
    .execute(&mut *tx)
    .await?;

    // Mark the card as archived (do NOT delete — restore needs it)
    sqlx::query("UPDATE kanban_cards SET archived_at = CURRENT_TIMESTAMP, updated_clock = ? WHERE id = ?")
        .bind(next_clock)
        .bind(&card_id)
        .execute(&mut *tx)
        .await?;

    // Compact the source column so the archived card leaves no positional gap
    // (keeps archive consistent with move_card's compaction).
    let remaining: Vec<(String,)> = sqlx::query_as(
        r#"SELECT id FROM kanban_cards
           WHERE column_id = ? AND archived_at IS NULL
           ORDER BY position ASC"#,
    )
    .bind(&column_id)
    .fetch_all(&mut *tx)
    .await?;
    for (i, (id,)) in remaining.iter().enumerate() {
        sqlx::query("UPDATE kanban_cards SET position = ? WHERE id = ?")
            .bind(i as i32)
            .bind(id)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanCardArchived {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id: board_id.clone(),
                card_id: card_id.clone(),
                column_id: column_id.clone(),
                archived_clock: next_clock,
                source: "web".to_string(),
                device_id: device_id.clone(),
            },
            session_id.as_deref(),
        )
        .await;

    super::webhook::enqueue_event(
        &state.pool,
        &workspace_id,
        &board_id,
        "kanban:card-archived",
        json!({ "event": "kanban:card-archived", "cardId": card_id, "boardId": board_id }),
    )
    .await;

    Ok(Json(json!({
        "id": trash_id,
        "cardId": card_id,
        "workspaceId": workspace_id,
        "boardId": board_id,
        "columnId": column_id,
        "archivedByUserId": user.id,
        "archivedByDeviceId": device_id,
        "archivedClock": next_clock,
    }))
    .into_response())
}

// ── restore_card ──

pub async fn restore_card(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, card_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor"],
    )
    .await?;

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let mut tx = state.pool.begin().await?;

    // Pick the current (un-restored) trash row deterministically. A card can be
    // archived → restored → archived again, leaving several trash rows; only the
    // most recent un-restored one represents the active archival to undo.
    let trash_row = sqlx::query(
        r#"SELECT id, column_id, label_ids
           FROM kanban_card_trash
           WHERE card_id = ? AND workspace_id = ? AND restored_at IS NULL
           ORDER BY archived_clock DESC
           LIMIT 1
           FOR UPDATE"#,
    )
    .bind(&card_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    let trash_id: String = trash_row.try_get("id")?;
    let target_column_id: String = trash_row.try_get("column_id")?;
    let label_ids_json: serde_json::Value = trash_row.try_get("label_ids")?;
    let label_ids: Vec<String> = serde_json::from_value(label_ids_json).unwrap_or_default();

    // Lock the card row and confirm it is actually archived.
    let card_row = sqlx::query(
        r#"SELECT CAST(archived_at AS CHAR) AS archived_at FROM kanban_cards
           WHERE id = ? AND workspace_id = ? FOR UPDATE"#,
    )
    .bind(&card_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;
    let archived_at: Option<String> = card_row.try_get("archived_at")?;
    if archived_at.is_none() {
        return Err(AppError::BadRequest("card is not archived".into()));
    }

    // Verify the original column still exists.
    let column_exists: Option<String> = sqlx::query_scalar(
        r#"SELECT c.id FROM kanban_columns c
           JOIN kanban_boards b ON b.id = c.board_id
           WHERE c.id = ? AND b.workspace_id = ?"#,
    )
    .bind(&target_column_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?;
    if column_exists.is_none() {
        return Err(AppError::BadRequest(
            "original column was deleted; cannot auto-restore".into(),
        ));
    }

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;
    let new_version = Uuid::new_v4().to_string();

    // Append to the end of the target column (active cards only); the card's old
    // frozen position may now collide with cards added while it was archived.
    let new_pos: i32 = sqlx::query_scalar(
        r#"SELECT COALESCE(MAX(position), -1) + 1 FROM kanban_cards
           WHERE column_id = ? AND archived_at IS NULL"#,
    )
    .bind(&target_column_id)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"UPDATE kanban_cards
           SET archived_at = NULL, column_id = ?, position = ?, updated_clock = ?, version_id = ?
           WHERE id = ?"#,
    )
    .bind(&target_column_id)
    .bind(new_pos)
    .bind(next_clock)
    .bind(&new_version)
    .bind(&card_id)
    .execute(&mut *tx)
    .await?;

    // Restore label associations (in case they were lost)
    sqlx::query("DELETE FROM kanban_card_labels WHERE card_id = ?")
        .bind(&card_id)
        .execute(&mut *tx)
        .await?;
    for lid in &label_ids {
        sqlx::query("INSERT IGNORE INTO kanban_card_labels (card_id, label_id) VALUES (?, ?)")
            .bind(&card_id)
            .bind(lid)
            .execute(&mut *tx)
            .await?;
    }

    sqlx::query(
        r#"UPDATE kanban_card_trash
           SET restored_at = CURRENT_TIMESTAMP, restored_by_user_id = ?,
               restored_by_device_id = ?, restored_clock = ?
           WHERE id = ?"#,
    )
    .bind(&user.id)
    .bind(&device_id)
    .bind(next_clock)
    .bind(&trash_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanCardRestored {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id: String::new(), // resolved by subscriber via get_board
                card_id: card_id.clone(),
                column_id: target_column_id.clone(),
                restored_clock: next_clock,
                source: "web".to_string(),
                device_id,
            },
            session_id.as_deref(),
        )
        .await;

    fetch_card_response(&state, &workspace_id, &card_id).await
}

// ── hard_delete_card (admin+) ──

pub async fn delete_card(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, card_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin"],
    )
    .await?;

    let device_id = header_device_id(&headers);
    let session_id = crate::handlers::extract_session_id(&headers);

    let mut tx = state.pool.begin().await?;

    let row = sqlx::query(
        r#"SELECT c.board_id, c.column_id
           FROM kanban_cards c
           JOIN kanban_boards b ON b.id = c.board_id
           WHERE c.id = ? AND b.workspace_id = ?
           FOR UPDATE"#,
    )
    .bind(&card_id)
    .bind(&workspace_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;
    let board_id: String = row.try_get("board_id")?;
    let column_id: String = row.try_get("column_id")?;

    let next_clock = next_workspace_clock(&mut tx, &workspace_id).await?;

    // Hard delete (cascades to kanban_card_labels AND kanban_card_trash if present)
    sqlx::query("DELETE FROM kanban_cards WHERE id = ?")
        .bind(&card_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    state
        .hub
        .publish_to_workspace(
            &workspace_id,
            WorkspaceEvent::KanbanCardDeleted {
                workspace_id: workspace_id.clone(),
                source_session_id: session_id.clone(),
                board_id,
                card_id,
                column_id,
                deleted_clock: next_clock,
                source: "web".to_string(),
                device_id,
            },
            session_id.as_deref(),
        )
        .await;

    Ok(StatusCode::NO_CONTENT.into_response())
}

// ── list_card_trash (archived cards with audit metadata) ──

pub async fn list_card_trash(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, board_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    // Verify board belongs to workspace
    let exists: Option<String> = sqlx::query_scalar(
        "SELECT id FROM kanban_boards WHERE id = ? AND workspace_id = ?",
    )
    .bind(&board_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?;
    if exists.is_none() {
        return Err(AppError::NotFound);
    }

    // Only active (un-restored, not-yet-expired) archival rows.
    let rows = sqlx::query(
        r#"SELECT id, card_id, workspace_id, board_id, column_id, title, description, priority, position,
                  CAST(due_at AS CHAR) AS due_at, assignee_user_id, label_ids,
                  archived_by_user_id, archived_by_device_id, source_device_id, source_user_id,
                  archived_clock, CAST(archived_at AS CHAR) AS archived_at,
                  CAST(expires_at AS CHAR) AS expires_at,
                  CAST(restored_at AS CHAR) AS restored_at, restored_by_user_id,
                  restored_by_device_id, restored_clock
           FROM kanban_card_trash
           WHERE board_id = ? AND workspace_id = ?
             AND restored_at IS NULL AND expires_at > CURRENT_TIMESTAMP
           ORDER BY archived_at DESC"#,
    )
    .bind(&board_id)
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;

    let mut items: Vec<KanbanCardTrashItem> = Vec::with_capacity(rows.len());
    for r in rows {
        let label_ids_json: serde_json::Value =
            r.try_get("label_ids").unwrap_or_else(|_| serde_json::json!([]));
        let label_ids: Vec<String> = serde_json::from_value(label_ids_json).unwrap_or_default();
        items.push(KanbanCardTrashItem {
            id: r.try_get("id")?,
            card_id: r.try_get("card_id")?,
            workspace_id: r.try_get("workspace_id")?,
            board_id: r.try_get("board_id")?,
            column_id: r.try_get("column_id")?,
            title: r.try_get("title")?,
            description: r.try_get("description")?,
            priority: r.try_get("priority")?,
            position: r.try_get("position")?,
            due_at: r.try_get::<Option<String>, _>("due_at")?,
            assignee_user_id: r.try_get("assignee_user_id")?,
            label_ids,
            archived_by_user_id: r.try_get("archived_by_user_id")?,
            archived_by_device_id: r.try_get("archived_by_device_id")?,
            source_device_id: r.try_get("source_device_id")?,
            source_user_id: r.try_get("source_user_id")?,
            archived_clock: r.try_get("archived_clock")?,
            archived_at: r.try_get::<String, _>("archived_at")?,
            expires_at: r.try_get::<String, _>("expires_at")?,
            restored_at: r.try_get::<Option<String>, _>("restored_at")?,
            restored_by_user_id: r.try_get("restored_by_user_id")?,
            restored_by_device_id: r.try_get("restored_by_device_id")?,
            restored_clock: r.try_get("restored_clock")?,
        });
    }

    Ok(Json(items).into_response())
}

// ── Shared helpers ──

pub(crate) async fn fetch_card_response(
    state: &AppState,
    workspace_id: &str,
    card_id: &str,
) -> Result<Response, AppError> {
    let card = fetch_card_value(state, workspace_id, card_id).await?;
    Ok(Json(card).into_response())
}

pub(crate) async fn fetch_card_value(
    state: &AppState,
    workspace_id: &str,
    card_id: &str,
) -> Result<KanbanCard, AppError> {
    let r = sqlx::query(
        r#"SELECT c.id, c.workspace_id, c.board_id, c.column_id, c.title, c.description, c.position,
                  c.priority, CAST(c.due_at AS CHAR) AS due_at, c.assignee_user_id, c.properties_extra,
                  c.created_by_user_id, c.updated_clock, c.version_id,
                  CAST(c.archived_at AS CHAR) AS archived_at,
                  CAST(c.created_at AS CHAR) AS created_at, CAST(c.updated_at AS CHAR) AS updated_at
           FROM kanban_cards c
           JOIN kanban_boards b ON b.id = c.board_id
           WHERE c.id = ? AND b.workspace_id = ?"#,
    )
    .bind(card_id)
    .bind(workspace_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let label_ids = load_card_label_ids(&state.pool, card_id).await?;
    Ok(KanbanCard {
        id: r.try_get("id")?,
        workspace_id: r.try_get("workspace_id")?,
        board_id: r.try_get("board_id")?,
        column_id: r.try_get("column_id")?,
        title: r.try_get("title")?,
        description: r.try_get("description")?,
        position: r.try_get("position")?,
        priority: r.try_get("priority")?,
        due_at: r.try_get::<Option<String>, _>("due_at")?,
        assignee_user_id: r.try_get("assignee_user_id")?,
        properties_extra: r.try_get("properties_extra")?,
        label_ids,
        created_by_user_id: r.try_get("created_by_user_id")?,
        updated_clock: r.try_get("updated_clock")?,
        version_id: r.try_get("version_id")?,
        archived_at: r.try_get::<Option<String>, _>("archived_at")?,
        created_at: r.try_get::<String, _>("created_at")?,
        updated_at: r.try_get::<String, _>("updated_at")?,
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KanbanActivityEvent {
    /// One of: created | updated | archived | restored.
    pub kind: String,
    pub at: String,
    pub by: Option<String>,
}

/// Derive a card's activity timeline from existing data — no activity table.
/// Combines kanban_cards (created / last-updated) with kanban_card_trash
/// (archive / restore audit). Newest first.
pub async fn card_activity(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, card_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let card = sqlx::query(
        r#"SELECT CAST(c.created_at AS CHAR) AS created_at,
                  CAST(c.updated_at AS CHAR) AS updated_at,
                  cu.username AS created_by
           FROM kanban_cards c
           JOIN users cu ON cu.id = c.created_by_user_id
           WHERE c.id = ? AND c.workspace_id = ?"#,
    )
    .bind(&card_id)
    .bind(&workspace_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let created_at: String = card.try_get("created_at")?;
    let updated_at: String = card.try_get("updated_at")?;
    let created_by: Option<String> = card.try_get("created_by")?;

    let mut events = vec![KanbanActivityEvent {
        kind: "created".into(),
        at: created_at.clone(),
        by: created_by,
    }];
    if updated_at != created_at {
        events.push(KanbanActivityEvent { kind: "updated".into(), at: updated_at, by: None });
    }

    let trash = sqlx::query(
        r#"SELECT CAST(t.archived_at AS CHAR) AS archived_at,
                  au.username AS archived_by,
                  CAST(t.restored_at AS CHAR) AS restored_at,
                  ru.username AS restored_by
           FROM kanban_card_trash t
           JOIN users au ON au.id = t.archived_by_user_id
           LEFT JOIN users ru ON ru.id = t.restored_by_user_id
           WHERE t.card_id = ? AND t.workspace_id = ?"#,
    )
    .bind(&card_id)
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;
    for r in trash {
        if let Some(at) = r.try_get::<Option<String>, _>("archived_at")? {
            events.push(KanbanActivityEvent { kind: "archived".into(), at, by: r.try_get("archived_by")? });
        }
        if let Some(at) = r.try_get::<Option<String>, _>("restored_at")? {
            events.push(KanbanActivityEvent { kind: "restored".into(), at, by: r.try_get("restored_by")? });
        }
    }

    // Newest first (zero-padded timestamp strings sort lexically).
    events.sort_by(|a, b| b.at.cmp(&a.at));
    Ok(Json(events).into_response())
}
