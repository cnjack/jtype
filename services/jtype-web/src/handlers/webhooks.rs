//! Webhook registration + outbound delivery enqueue (document-backed board).
//!
//! Endpoints (owner/admin only):
//!   GET    /api/v1/workspaces/:workspace_id/webhooks
//!   POST   /api/v1/workspaces/:workspace_id/webhooks
//!   DELETE /api/v1/workspaces/:workspace_id/webhooks/:webhook_id
//!
//! On create the plaintext `secret` is returned ONCE; thereafter only a mask.
//! `enqueue_event` is called from `handlers::document::save_document` when a card
//! `.md` (with `board:` frontmatter) is written; the `tasks::webhook_delivery`
//! worker signs (HMAC-SHA256) and POSTs. Board scope is the card's LOGICAL board
//! id (frontmatter `board`), or all boards when `board_ref` is NULL.

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::{MySql, Pool, Row};
use uuid::Uuid;

use crate::error::AppError;
use crate::handlers::workspace::require_workspace_role;
use crate::middleware::auth::extract_user;
use crate::AppState;

const MAX_NAME: usize = 160;
const MAX_URL: usize = 2048;
const MAX_WEBHOOKS_PER_WORKSPACE: i64 = 20;

/// Truncate to at most `max` bytes without splitting a UTF-8 char.
fn clamp_str(s: &str, max: usize) -> String {
    if s.len() <= max {
        return s.to_string();
    }
    let mut idx = max;
    while idx > 0 && !s.is_char_boundary(idx) {
        idx -= 1;
    }
    s[..idx].to_string()
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Webhook {
    pub id: String,
    /// Board logical id this webhook is scoped to; null = all boards.
    pub board_ref: Option<String>,
    pub name: String,
    pub target_url: String,
    pub event_types: Vec<String>,
    pub enabled: bool,
    pub secret_masked: String,
    pub last_delivery_at: Option<String>,
    pub last_status: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebhookCreated {
    #[serde(flatten)]
    pub webhook: Webhook,
    /// Plaintext secret — returned only on create.
    pub secret: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWebhookRequest {
    pub name: String,
    pub target_url: String,
    #[serde(default)]
    pub board_ref: Option<String>,
    #[serde(default)]
    pub event_types: Vec<String>,
}

fn row_to_webhook(r: &sqlx::mysql::MySqlRow) -> Result<Webhook, AppError> {
    let event_types: JsonValue = r.try_get("event_types")?;
    let events = match event_types {
        JsonValue::Array(a) => a.into_iter().filter_map(|v| v.as_str().map(String::from)).collect(),
        _ => Vec::new(),
    };
    Ok(Webhook {
        id: r.try_get("id")?,
        board_ref: r.try_get("board_ref")?,
        name: r.try_get("name")?,
        target_url: r.try_get("target_url")?,
        event_types: events,
        enabled: r.try_get::<i8, _>("enabled")? != 0,
        secret_masked: "whsec_••••".into(),
        last_delivery_at: r.try_get("last_delivery_at")?,
        last_status: r.try_get("last_status")?,
        created_at: r.try_get("created_at")?,
    })
}

const SELECT_WEBHOOK: &str = r#"SELECT id, board_ref, name, target_url, event_types, enabled,
       CAST(last_delivery_at AS CHAR) AS last_delivery_at, last_status,
       CAST(created_at AS CHAR) AS created_at
FROM webhooks"#;

pub(crate) fn is_blocked_v4(ip: std::net::Ipv4Addr) -> bool {
    ip.is_loopback()
        || ip.is_private()
        || ip.is_link_local()
        || ip.is_unspecified()
        || ip.is_broadcast()
        || ip.octets()[0] == 0
}

pub(crate) fn is_blocked_v6(ip: std::net::Ipv6Addr) -> bool {
    // Normalize IPv4-mapped (`::ffff:a.b.c.d`) and compat (`::a.b.c.d`) forms and
    // apply the v4 rules — otherwise `::ffff:169.254.169.254` etc. slip past.
    if let Some(v4) = ip.to_ipv4_mapped().or_else(|| ip.to_ipv4()) {
        return is_blocked_v4(v4);
    }
    ip.is_loopback()
        || ip.is_unspecified()
        || (ip.segments()[0] & 0xfe00) == 0xfc00 // ULA fc00::/7
        || (ip.segments()[0] & 0xffc0) == 0xfe80 // link-local fe80::/10
}

/// True when an IP literal is an SSRF target we refuse. Shared with the delivery
/// worker for a resolve-time re-check (DNS-rebinding defense).
pub(crate) fn is_blocked_ip(ip: std::net::IpAddr) -> bool {
    match ip {
        std::net::IpAddr::V4(v4) => is_blocked_v4(v4),
        std::net::IpAddr::V6(v6) => is_blocked_v6(v6),
    }
}

/// Reject SSRF targets (internal/loopback/private hosts) and non-HTTPS URLs.
fn validate_target_url(raw: &str) -> Result<(), AppError> {
    let parsed = url::Url::parse(raw).map_err(|_| AppError::BadRequest("invalid target_url".into()))?;
    if parsed.scheme() != "https" {
        return Err(AppError::BadRequest("target_url must be https://".into()));
    }
    let blocked = || AppError::BadRequest("target_url host is not allowed".into());
    match parsed.host().ok_or_else(blocked)? {
        url::Host::Ipv4(ip) => {
            if is_blocked_v4(ip) {
                return Err(blocked());
            }
        }
        url::Host::Ipv6(ip) => {
            if is_blocked_v6(ip) {
                return Err(blocked());
            }
        }
        url::Host::Domain(d) => {
            let d = d.to_ascii_lowercase();
            if d == "localhost" || d.ends_with(".localhost") || d.ends_with(".local") || d.ends_with(".internal") {
                return Err(blocked());
            }
            match d.parse::<std::net::IpAddr>() {
                Ok(std::net::IpAddr::V4(v4)) if is_blocked_v4(v4) => return Err(blocked()),
                Ok(std::net::IpAddr::V6(v6)) if is_blocked_v6(v6) => return Err(blocked()),
                _ => {}
            }
        }
    }
    Ok(())
}

pub async fn list_webhooks(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin"]).await?;
    let rows = sqlx::query(&format!("{SELECT_WEBHOOK} WHERE workspace_id = ? ORDER BY created_at DESC"))
        .bind(&workspace_id)
        .fetch_all(&state.pool)
        .await?;
    let out = rows.iter().map(row_to_webhook).collect::<Result<Vec<_>, _>>()?;
    Ok(Json(out).into_response())
}

pub async fn create_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(workspace_id): Path<String>,
    Json(payload): Json<CreateWebhookRequest>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin"]).await?;

    let name = clamp_str(payload.name.trim(), MAX_NAME);
    if name.is_empty() {
        return Err(AppError::BadRequest("name cannot be empty".into()));
    }
    let target_url = clamp_str(payload.target_url.trim(), MAX_URL);
    validate_target_url(&target_url)?;
    let events: Vec<String> = payload
        .event_types
        .iter()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    if events.is_empty() {
        return Err(AppError::BadRequest("event_types cannot be empty".into()));
    }
    // board_ref is the board's logical id (frontmatter `board`); an empty string
    // means "all boards" → store NULL.
    let board_ref = payload
        .board_ref
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM webhooks WHERE workspace_id = ?")
        .bind(&workspace_id)
        .fetch_one(&state.pool)
        .await?;
    if count >= MAX_WEBHOOKS_PER_WORKSPACE {
        return Err(AppError::BadRequest("too many webhooks for this workspace".into()));
    }

    let id = Uuid::new_v4().to_string();
    let secret = format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
    let events_json = serde_json::to_value(&events).unwrap_or(JsonValue::Array(vec![]));
    sqlx::query(
        "INSERT INTO webhooks (id, workspace_id, board_ref, name, target_url, secret, event_types, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&workspace_id)
    .bind(&board_ref)
    .bind(&name)
    .bind(&target_url)
    .bind(&secret)
    .bind(&events_json)
    .bind(&user.id)
    .execute(&state.pool)
    .await?;

    let row = sqlx::query(&format!("{SELECT_WEBHOOK} WHERE id = ?"))
        .bind(&id)
        .fetch_one(&state.pool)
        .await?;
    Ok(Json(WebhookCreated { webhook: row_to_webhook(&row)?, secret }).into_response())
}

pub async fn delete_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((workspace_id, webhook_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let user = extract_user(&state.pool, &headers).await?;
    require_workspace_role(&state.pool, &workspace_id, &user.id, &["owner", "admin"]).await?;
    let res = sqlx::query("DELETE FROM webhooks WHERE id = ? AND workspace_id = ?")
        .bind(&webhook_id)
        .bind(&workspace_id)
        .execute(&state.pool)
        .await?;
    if res.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(axum::http::StatusCode::NO_CONTENT.into_response())
}

/// Queue a delivery for every enabled webhook in the workspace that subscribes to
/// `event_type` (exact match or `"*"`) and is scoped to this board (`board_ref`,
/// the card's logical board id) or all boards. Best-effort: errors are logged.
pub async fn enqueue_event(
    pool: &Pool<MySql>,
    workspace_id: &str,
    board_ref: Option<&str>,
    event_type: &str,
    payload: JsonValue,
) {
    let rows = match sqlx::query(
        "SELECT id, event_types FROM webhooks WHERE workspace_id = ? AND enabled = 1 AND (board_ref IS NULL OR board_ref = ?)",
    )
    .bind(workspace_id)
    .bind(board_ref)
    .fetch_all(pool)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            eprintln!("webhook enqueue query failed: {e}");
            return;
        }
    };
    for r in rows {
        let webhook_id: String = match r.try_get("id") {
            Ok(v) => v,
            Err(_) => continue,
        };
        let events: JsonValue = r.try_get("event_types").unwrap_or(JsonValue::Null);
        let subscribed = matches!(&events, JsonValue::Array(a) if a.iter().any(|v| v.as_str() == Some(event_type) || v.as_str() == Some("*")));
        if !subscribed {
            continue;
        }
        let delivery_id = Uuid::new_v4().to_string();
        if let Err(e) = sqlx::query(
            "INSERT INTO webhook_deliveries (id, webhook_id, workspace_id, event_type, payload) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&delivery_id)
        .bind(&webhook_id)
        .bind(workspace_id)
        .bind(event_type)
        .bind(&payload)
        .execute(pool)
        .await
        {
            eprintln!("webhook enqueue insert failed: {e}");
        }
    }
}
