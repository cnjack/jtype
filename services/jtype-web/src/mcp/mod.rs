//! Model Context Protocol (MCP) server for jtype-web.
//!
//! Exposes JType workspaces — Markdown documents *and* kanban boards — to MCP
//! clients (Claude, Cursor, jcode, …) over **Streamable HTTP** at `POST /mcp`.
//!
//! Design: MCP tools do **not** re-implement DB queries. Each `tools/call`
//! builds an internal `http::Request` (forwarding the caller's `Authorization`
//! bearer) and runs it through a clone of the existing API [`Router`] via
//! `tower::ServiceExt::oneshot` — the same mechanism the integration tests use.
//! This reuses all tested handler logic (RBAC, sqlx CAST handling, lamport
//! clocks, version history, WS broadcasts) with zero duplication.

pub mod oauth;
pub mod tools;

use axum::{
    body::{Body, Bytes},
    extract::State,
    http::{header, HeaderMap, Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde_json::{json, Value};
use sqlx::{MySql, Pool};
use tower::ServiceExt;

use crate::error::AppError;
use crate::middleware::auth::extract_user;

/// Latest MCP protocol revision this server speaks.
pub const PROTOCOL_VERSION: &str = "2025-06-18";

/// State for the MCP + OAuth routes. Cheaply cloneable (Router/Pool/String).
#[derive(Clone)]
pub struct McpState {
    /// A fully-stated clone of the API router, used for in-process dispatch.
    pub api: Router,
    pub pool: Pool<MySql>,
    pub public_base_url: String,
}

/// Build the MCP + OAuth-discovery router. Merge this with the API router.
pub fn router(state: McpState) -> Router {
    Router::new()
        .route("/mcp", post(handle_mcp).get(mcp_get).delete(mcp_delete))
        .route(
            "/.well-known/oauth-protected-resource",
            get(oauth::protected_resource_metadata),
        )
        .route(
            "/.well-known/oauth-protected-resource/mcp",
            get(oauth::protected_resource_metadata),
        )
        .route(
            "/.well-known/oauth-authorization-server",
            get(oauth::authorization_server_metadata),
        )
        // OAuth 2.1 authorization-code + PKCE + dynamic client registration.
        .route("/oauth/register", post(oauth::register_client))
        .route("/oauth/authorize", get(oauth::authorize_page))
        .route("/api/oauth/authorize", post(oauth::authorize_approve))
        // Device grant (RFC 8628).
        .route(
            "/api/oauth/device_authorization",
            post(oauth::device_authorization),
        )
        .route("/api/oauth/token", post(oauth::token))
        .with_state(state)
}

/// `GET /mcp` — we do not offer a server-initiated SSE stream.
async fn mcp_get() -> Response {
    (StatusCode::METHOD_NOT_ALLOWED, "GET not supported; POST JSON-RPC to /mcp").into_response()
}

/// `DELETE /mcp` — stateless server, nothing to tear down.
async fn mcp_delete() -> Response {
    StatusCode::NO_CONTENT.into_response()
}

/// 401 challenge pointing clients at the protected-resource metadata (MCP auth spec).
fn unauthorized(base: &str) -> Response {
    let challenge = format!(
        "Bearer resource_metadata=\"{}/.well-known/oauth-protected-resource\"",
        base.trim_end_matches('/')
    );
    (
        StatusCode::UNAUTHORIZED,
        [(header::WWW_AUTHENTICATE, challenge)],
        Json(json!({
            "jsonrpc": "2.0",
            "id": Value::Null,
            "error": { "code": -32001, "message": "authentication required" }
        })),
    )
        .into_response()
}

fn bearer_from(headers: &HeaderMap) -> Option<String> {
    headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
}

/// `POST /mcp` — JSON-RPC 2.0 over Streamable HTTP. Returns a single JSON
/// response (we never need to open an SSE stream for these tools).
async fn handle_mcp(State(st): State<McpState>, headers: HeaderMap, body: Bytes) -> Response {
    // Authenticate the whole endpoint (MCP resource server).
    let Some(token) = bearer_from(&headers) else {
        return unauthorized(&st.public_base_url);
    };
    if extract_user(&st.pool, &headers).await.is_err() {
        return unauthorized(&st.public_base_url);
    }

    let parsed: Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(_) => return parse_error().into_response(),
    };

    // Batch (array) support — process each message, return an array.
    if let Value::Array(items) = parsed {
        if items.is_empty() {
            // JSON-RPC 2.0: an empty batch is itself an Invalid Request.
            return Json(err(Value::Null, -32600, "invalid request")).into_response();
        }
        let mut out = Vec::new();
        for item in items {
            if let Some(resp) = dispatch(&st, &token, item).await {
                out.push(resp);
            }
        }
        // A batch of only notifications produces no responses → no body.
        if out.is_empty() {
            return StatusCode::ACCEPTED.into_response();
        }
        return Json(Value::Array(out)).into_response();
    }

    match dispatch(&st, &token, parsed).await {
        Some(resp) => Json(resp).into_response(),
        // Notifications get no body.
        None => StatusCode::ACCEPTED.into_response(),
    }
}

/// Dispatch a single JSON-RPC message. Returns `None` for notifications.
async fn dispatch(st: &McpState, token: &str, msg: Value) -> Option<Value> {
    // A non-object message (bare scalar / nested array) is an Invalid Request.
    if !msg.is_object() {
        return Some(err(Value::Null, -32600, "invalid request"));
    }
    let id = msg.get("id").cloned();
    let method = msg.get("method").and_then(|m| m.as_str()).unwrap_or("");
    let params = msg.get("params").cloned().unwrap_or(Value::Null);

    // Notifications (no id) — acknowledge silently.
    if id.is_none() {
        return None;
    }
    let id = id.unwrap();

    match method {
        "initialize" => Some(ok(
            id,
            json!({
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": { "tools": { "listChanged": false } },
                "serverInfo": { "name": "jtype", "version": env!("CARGO_PKG_VERSION") },
                "instructions": "JType notes (Markdown documents) and kanban boards. Call list_workspaces first to get a workspace_id, then use note_* and card/board tools."
            }),
        )),
        "ping" => Some(ok(id, json!({}))),
        "tools/list" => Some(ok(id, json!({ "tools": tools::catalog() }))),
        "tools/call" => {
            let name = params
                .get("name")
                .and_then(|n| n.as_str())
                .unwrap_or("")
                .to_string();
            let args = params.get("arguments").cloned().unwrap_or(json!({}));
            let result = tools::call(st, token, &name, args).await;
            Some(ok(id, result))
        }
        _ => Some(err(id, -32601, &format!("method not found: {method}"))),
    }
}

fn ok(id: Value, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}

fn err(id: Value, code: i64, message: &str) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } })
}

fn parse_error() -> Json<Value> {
    Json(json!({
        "jsonrpc": "2.0", "id": Value::Null,
        "error": { "code": -32700, "message": "parse error" }
    }))
}

// ── In-process API dispatch ─────────────────────────────────────────────────

/// Run an internal request through the API router, forwarding the bearer token.
/// Returns `(status, parsed-json-body)`.
pub(crate) async fn call_api(
    api: &Router,
    method: Method,
    uri: &str,
    token: &str,
    body: Option<Value>,
) -> Result<(StatusCode, Value), AppError> {
    let body_bytes = match &body {
        Some(v) => serde_json::to_vec(v).map_err(|e| AppError::Server(e.to_string()))?,
        None => Vec::new(),
    };
    let request = axum::http::Request::builder()
        .method(method)
        .uri(uri)
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::AUTHORIZATION, format!("Bearer {token}"))
        // Document `source` is an enum (desktop|web|system); MCP writes record as `web`.
        .header("x-client-type", "web")
        .body(Body::from(body_bytes))
        .map_err(|e| AppError::Server(e.to_string()))?;

    let response = api
        .clone()
        .oneshot(request)
        .await
        .map_err(|e| AppError::Server(e.to_string()))?;
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), 16 * 1024 * 1024)
        .await
        .map_err(|e| AppError::Server(e.to_string()))?;
    let value = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes)
            .unwrap_or_else(|_| Value::String(String::from_utf8_lossy(&bytes).into()))
    };
    Ok((status, value))
}
