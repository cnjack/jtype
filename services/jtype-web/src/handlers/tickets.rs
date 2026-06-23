//! Jira-style ticket links (`/browse/OCCSV-3371`) — see internal-docs/kanban/ticket-links.md.
//!
//! The per-card number lives ONLY in the cloud index (`card_tickets`), keyed by the
//! card's `documents.id`; `board_sequences` is the sole, monotonic allocator. The
//! `ticket_key` + `number` are snapshotted so a minted id is stable forever.
//!   POST /api/v1/workspaces/:workspace_id/tickets/allocate  {relativePath, ticketKey}
//!   GET  /api/v1/workspaces/:workspace_id/tickets                 → all tickets (doc→ticket map)
//!   GET  /api/v1/workspaces/:workspace_id/tickets/:ticket         → resolve OCCSV-3371 → card

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::middleware::auth::extract_user;
use crate::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AllocateRequest {
    pub relative_path: String,
    pub ticket_key: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ticket {
    pub document_id: String,
    pub relative_path: Option<String>,
    pub ticket_key: String,
    pub number: i64,
    /// The full id, e.g. `OCCSV-3371`.
    pub ticket: String,
}

/// A board ticket key: 2–16 uppercase letters/digits, leading letter.
fn validate_ticket_key(raw: &str) -> Result<String, AppError> {
    let key = raw.trim().to_ascii_uppercase();
    let ok = key.len() >= 2
        && key.len() <= 16
        && key.chars().next().is_some_and(|c| c.is_ascii_alphabetic())
        && key.chars().all(|c| c.is_ascii_alphanumeric());
    if !ok {
        return Err(AppError::BadRequest("invalid ticketKey".into()));
    }
    Ok(key)
}

async fn resolve_document_id(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    relative_path: &str,
) -> Result<String, AppError> {
    sqlx::query_scalar::<_, String>("SELECT id FROM documents WHERE workspace_id = ? AND relative_path = ?")
        .bind(workspace_id)
        .bind(relative_path)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound)
}

pub async fn allocate(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<AllocateRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor"]).await?;

    let ticket_key = validate_ticket_key(&payload.ticket_key)?;
    let document_id = resolve_document_id(&state.pool, &workspace_id, &payload.relative_path).await?;

    let mut tx = state.pool.begin().await?;

    // Idempotent: a document is allocated exactly one ticket for its lifetime.
    if let Some(row) = sqlx::query("SELECT ticket_key, number FROM card_tickets WHERE document_id = ?")
        .bind(&document_id)
        .fetch_optional(&mut *tx)
        .await?
    {
        let key: String = row.try_get("ticket_key")?;
        let number: i64 = row.try_get("number")?;
        tx.commit().await?;
        return Ok(Json(Ticket {
            relative_path: Some(payload.relative_path),
            ticket: format!("{key}-{number}"),
            ticket_key: key,
            number,
            document_id,
        })
        .into_response());
    }

    // Atomic monotonic counter (LAST_INSERT_ID is connection-scoped; the tx pins it).
    sqlx::query(
        "INSERT INTO board_sequences (workspace_id, ticket_key, last_number) VALUES (?, ?, LAST_INSERT_ID(1)) ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)",
    )
    .bind(&workspace_id)
    .bind(&ticket_key)
    .execute(&mut *tx)
    .await?;
    // CAST AS SIGNED: LAST_INSERT_ID() is BIGINT UNSIGNED, which sqlx refuses to
    // decode into i64 (mirrors next_workspace_clock in document.rs).
    let number: i64 = sqlx::query_scalar("SELECT CAST(LAST_INSERT_ID() AS SIGNED)").fetch_one(&mut *tx).await?;

    let id = Uuid::new_v4().to_string();
    let insert = sqlx::query("INSERT INTO card_tickets (id, workspace_id, document_id, ticket_key, number) VALUES (?, ?, ?, ?, ?)")
        .bind(&id)
        .bind(&workspace_id)
        .bind(&document_id)
        .bind(&ticket_key)
        .bind(number)
        .execute(&mut *tx)
        .await;

    match insert {
        Ok(_) => {
            tx.commit().await?;
            Ok(Json(Ticket {
                relative_path: Some(payload.relative_path),
                ticket: format!("{ticket_key}-{number}"),
                ticket_key,
                number,
                document_id,
            })
            .into_response())
        }
        // Lost a concurrent allocation for the same document_id: roll back our
        // counter bump (so no number is wasted) and return the winner's ticket —
        // a document is allocated exactly one ticket for its lifetime.
        Err(sqlx::Error::Database(db)) if db.is_unique_violation() => {
            tx.rollback().await?;
            let row = sqlx::query("SELECT ticket_key, number FROM card_tickets WHERE document_id = ?")
                .bind(&document_id)
                .fetch_one(&state.pool)
                .await?;
            let key: String = row.try_get("ticket_key")?;
            let num: i64 = row.try_get("number")?;
            Ok(Json(Ticket {
                relative_path: Some(payload.relative_path),
                ticket: format!("{key}-{num}"),
                ticket_key: key,
                number: num,
                document_id,
            })
            .into_response())
        }
        Err(e) => Err(e.into()),
    }
}

pub async fn list_tickets(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor", "viewer"]).await?;

    let rows = sqlx::query(
        r#"SELECT t.document_id, t.ticket_key, t.number, d.relative_path
           FROM card_tickets t
           JOIN documents d ON d.id = t.document_id
           WHERE t.workspace_id = ?"#,
    )
    .bind(&workspace_id)
    .fetch_all(&state.pool)
    .await?;
    let out = rows
        .iter()
        .map(row_to_ticket)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(Json(out).into_response())
}

pub async fn resolve_ticket(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, ticket)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin", "editor", "viewer"]).await?;

    let (key, number) = ticket
        .rsplit_once('-')
        .and_then(|(k, n)| n.parse::<i64>().ok().map(|num| (k.to_ascii_uppercase(), num)))
        .ok_or_else(|| AppError::BadRequest("invalid ticket".into()))?;

    let row = sqlx::query(
        r#"SELECT t.document_id, t.ticket_key, t.number, d.relative_path
           FROM card_tickets t
           JOIN documents d ON d.id = t.document_id
           WHERE t.workspace_id = ? AND t.ticket_key = ? AND t.number = ?"#,
    )
    .bind(&workspace_id)
    .bind(&key)
    .bind(number)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(Json(row_to_ticket(&row)?).into_response())
}

/// Workspace-agnostic resolve for the bare `/browse/OCCSV-3371` URL: finds the
/// ticket in any workspace the caller is an active member of.
pub async fn browse(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(ticket): Path<String>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    let (key, number) = ticket
        .rsplit_once('-')
        .and_then(|(k, n)| n.parse::<i64>().ok().map(|num| (k.to_ascii_uppercase(), num)))
        .ok_or_else(|| AppError::BadRequest("invalid ticket".into()))?;

    let row = sqlx::query(
        r#"SELECT t.workspace_id, t.document_id, d.relative_path
           FROM card_tickets t
           JOIN documents d ON d.id = t.document_id
           JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
               AND wm.user_id = ? AND wm.status = 'active'
           WHERE t.ticket_key = ? AND t.number = ?
           LIMIT 1"#,
    )
    .bind(&user.id)
    .bind(&key)
    .bind(number)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(serde_json::json!({
        "workspaceId": row.try_get::<String, _>("workspace_id")?,
        "documentId": row.try_get::<String, _>("document_id")?,
        "relativePath": row.try_get::<String, _>("relative_path")?,
        "ticket": format!("{key}-{number}"),
    }))
    .into_response())
}

fn row_to_ticket(r: &sqlx::mysql::MySqlRow) -> Result<Ticket, AppError> {
    let key: String = r.try_get("ticket_key")?;
    let number: i64 = r.try_get("number")?;
    Ok(Ticket {
        document_id: r.try_get("document_id")?,
        relative_path: r.try_get("relative_path")?,
        ticket: format!("{key}-{number}"),
        ticket_key: key,
        number,
    })
}
