//! Durable, board-scoped Kanban event pull.
//!
//! Card saves append to `kanban_events` using the document's workspace-monotonic
//! `updated_clock` as `sequence`. Consumers persist `nextSequence` and request
//! events strictly after it, so a disconnect or transient downstream failure
//! does not lose the event as it can with the live-only SSE feed.

use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::Row;

use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::middleware::auth::extract_user;
use crate::AppState;

const DEFAULT_LIMIT: i64 = 100;
const MAX_LIMIT: i64 = 1_000;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PullQuery {
    pub after_sequence: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PullResponse {
    pub events: Vec<JsonValue>,
    pub next_sequence: i64,
    pub has_more: bool,
}

/// `GET /api/v1/workspaces/:workspace_id/boards/:board_ref/events/pull`
///
/// Returns up to `limit` events whose sequence is strictly greater than
/// `afterSequence`, ordered oldest first. Both full and `mcp`-scoped bearer
/// tokens are accepted; workspace membership remains mandatory.
pub async fn pull(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, board_ref)): Path<(String, String)>,
    Query(query): Query<PullQuery>,
) -> Result<Json<PullResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let after_sequence = query.after_sequence.unwrap_or(0);
    if after_sequence < 0 {
        return Err(AppError::BadRequest(
            "afterSequence must be zero or greater".into(),
        ));
    }
    let limit = query.limit.unwrap_or(DEFAULT_LIMIT);
    if !(1..=MAX_LIMIT).contains(&limit) {
        return Err(AppError::BadRequest(format!(
            "limit must be between 1 and {MAX_LIMIT}"
        )));
    }

    // Fetch one extra row to report `hasMore` without ever advancing the cursor
    // past an event that was not returned to the caller.
    let rows = sqlx::query(
        r#"SELECT sequence, payload
           FROM kanban_events
           WHERE workspace_id = ? AND board_ref = ? AND sequence > ?
           ORDER BY sequence ASC
           LIMIT ?"#,
    )
    .bind(&workspace_id)
    .bind(&board_ref)
    .bind(after_sequence)
    .bind(limit + 1)
    .fetch_all(&state.pool)
    .await?;

    let has_more = rows.len() as i64 > limit;
    let mut events = Vec::with_capacity(rows.len().min(limit as usize));
    let mut next_sequence = after_sequence;
    for row in rows.into_iter().take(limit as usize) {
        next_sequence = row.try_get("sequence")?;
        events.push(row.try_get("payload")?);
    }

    Ok(Json(PullResponse {
        events,
        next_sequence,
        has_more,
    }))
}

/// Append one immutable event to the durable pull log.
pub async fn persist(
    tx: &mut sqlx::Transaction<'_, sqlx::MySql>,
    event_id: &str,
    workspace_id: &str,
    board_ref: &str,
    document_id: Option<&str>,
    sequence: i64,
    event_type: &str,
    actor: &JsonValue,
    changes: &JsonValue,
    payload: &JsonValue,
) -> Result<(), AppError> {
    sqlx::query(
        r#"INSERT INTO kanban_events
           (id, workspace_id, sequence, board_ref, document_id, event_type, actor, changes, payload)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(event_id)
    .bind(workspace_id)
    .bind(sequence)
    .bind(board_ref)
    .bind(document_id)
    .bind(event_type)
    .bind(actor)
    .bind(changes)
    .bind(payload)
    .execute(&mut **tx)
    .await?;
    Ok(())
}
