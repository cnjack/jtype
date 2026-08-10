//! Per-Card Activity backed by the durable `kanban_events` log.
//!
//! New events expose structured actor/client/token provenance and field-level
//! changes. Cards created before the event schema fall back to their existing
//! document version history, so the timeline never starts out blank.

use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value as JsonValue};
use sqlx::Row;

use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::middleware::auth::extract_user;
use crate::AppState;

const DEFAULT_LIMIT: i64 = 100;
const MAX_LIMIT: i64 = 200;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityQuery {
    pub limit: Option<i64>,
    /// Optional descending cursor. The next page contains sequence values
    /// strictly less than this value.
    pub before_sequence: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEvent {
    pub id: String,
    pub kind: String,
    pub at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor: Option<JsonValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client: Option<JsonValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<JsonValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changes: Option<JsonValue>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityResponse {
    pub events: Vec<ActivityEvent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_sequence: Option<i64>,
    pub has_more: bool,
}

/// `GET /api/v1/workspaces/:workspace_id/documents/:document_id/activity`
pub async fn list_activity(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, document_id)): Path<(String, String)>,
    Query(query): Query<ActivityQuery>,
) -> Result<Json<ActivityResponse>, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(
        &state.pool,
        &workspace_id,
        &user.id,
        &["owner", "admin", "editor", "viewer"],
    )
    .await?;

    let limit = query.limit.unwrap_or(DEFAULT_LIMIT);
    if !(1..=MAX_LIMIT).contains(&limit) {
        return Err(AppError::BadRequest(format!(
            "limit must be between 1 and {MAX_LIMIT}"
        )));
    }
    if query.before_sequence.is_some_and(|sequence| sequence <= 0) {
        return Err(AppError::BadRequest(
            "beforeSequence must be greater than zero".to_string(),
        ));
    }

    let rows = sqlx::query(
        r#"SELECT id, sequence, event_type, actor, changes, payload,
                  DATE_FORMAT(
                    TIMESTAMPADD(MICROSECOND,
                      CAST(UNIX_TIMESTAMP(created_at) * 1000000 AS SIGNED),
                      '1970-01-01 00:00:00'),
                    '%Y-%m-%dT%H:%i:%s.%fZ') AS event_at
           FROM kanban_events
           WHERE workspace_id = ? AND document_id = ?
             AND (? IS NULL OR sequence < ?)
           ORDER BY sequence DESC
           LIMIT ?"#,
    )
    .bind(&workspace_id)
    .bind(&document_id)
    .bind(query.before_sequence)
    .bind(query.before_sequence)
    .bind(limit + 1)
    .fetch_all(&state.pool)
    .await?;

    if !rows.is_empty() || query.before_sequence.is_some() {
        let has_more = rows.len() as i64 > limit;
        let mut events = Vec::with_capacity(rows.len().min(limit as usize));
        let mut next_sequence = None;
        for row in rows.into_iter().take(limit as usize) {
            let sequence: i64 = row.try_get("sequence")?;
            next_sequence = Some(sequence);
            let payload: JsonValue = row.try_get("payload")?;
            let kind = payload
                .get("domainEvent")
                .and_then(JsonValue::as_str)
                .map(str::to_string)
                .unwrap_or(row.try_get("event_type")?);
            let actor = row
                .try_get::<Option<JsonValue>, _>("actor")?
                .or_else(|| payload.get("actor").cloned());
            let changes = row
                .try_get::<Option<JsonValue>, _>("changes")?
                .or_else(|| payload.get("changes").cloned());
            events.push(ActivityEvent {
                id: row.try_get("id")?,
                kind,
                at: row.try_get("event_at")?,
                actor,
                client: payload.get("client").cloned(),
                token: payload.get("token").cloned(),
                changes,
            });
        }
        return Ok(Json(ActivityResponse {
            events,
            next_sequence,
            has_more,
        }));
    }

    legacy_version_activity(&state, &workspace_id, &document_id, limit).await
}

async fn legacy_version_activity(
    state: &AppState,
    workspace_id: &str,
    document_id: &str,
    limit: i64,
) -> Result<Json<ActivityResponse>, AppError> {
    let rows = sqlx::query(
        r#"SELECT v.id, v.parent_version_id, v.author_user_id, v.source,
                  DATE_FORMAT(
                    TIMESTAMPADD(MICROSECOND,
                      CAST(UNIX_TIMESTAMP(v.created_at) * 1000000 AS SIGNED),
                      '1970-01-01 00:00:00'),
                    '%Y-%m-%dT%H:%i:%s.%fZ') AS event_at,
                  u.username AS author_username
           FROM document_versions v
           LEFT JOIN users u ON u.id = v.author_user_id
           WHERE v.workspace_id = ? AND v.document_id = ?
           ORDER BY v.created_at DESC, v.id DESC
           LIMIT ?"#,
    )
    .bind(workspace_id)
    .bind(document_id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    if rows.is_empty() {
        let exists: Option<String> =
            sqlx::query_scalar("SELECT id FROM documents WHERE workspace_id = ? AND id = ?")
                .bind(workspace_id)
                .bind(document_id)
                .fetch_optional(&state.pool)
                .await?;
        if exists.is_none() {
            return Err(AppError::NotFound);
        }
    }

    let mut events = Vec::with_capacity(rows.len());
    for row in rows {
        let parent_version_id: Option<String> = row.try_get("parent_version_id")?;
        let author_user_id: String = row.try_get("author_user_id")?;
        let author_username = row
            .try_get::<Option<String>, _>("author_username")?
            .unwrap_or_else(|| "Unknown user".to_string());
        let source: String = row.try_get("source")?;
        events.push(ActivityEvent {
            id: row.try_get("id")?,
            kind: if parent_version_id.is_none() {
                "card.created".to_string()
            } else {
                "card.updated".to_string()
            },
            at: row.try_get("event_at")?,
            actor: Some(json!({
                "kind": "user",
                "userId": author_user_id,
                "label": author_username,
            })),
            client: Some(json!({ "kind": source })),
            token: None,
            changes: None,
        });
    }

    Ok(Json(ActivityResponse {
        events,
        next_sequence: None,
        // Legacy history has no stable sequence cursor. It is intentionally a
        // bounded compatibility snapshot rather than a misleading pagination
        // contract.
        has_more: false,
    }))
}
