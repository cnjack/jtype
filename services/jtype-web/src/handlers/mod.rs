pub mod activity;
pub mod admin;
pub mod assets;
pub mod blobs;
pub mod auth;
pub mod comments;
pub mod document;
pub mod domain;
pub mod folder;
pub mod kanban_events;
pub mod live;
pub mod mail;
pub mod mcp_token;
pub mod member;
pub mod oauth;
pub mod publish;
pub mod settings;
pub mod site;
pub mod sync;
pub mod tickets;
pub mod trash;
pub mod user;
pub mod webhooks;
pub mod workspace;

/// Extract the optional WS session ID from `X-Session-Id` header.
/// REST clients that hold an active WS connection should send this header
/// so the server can exclude them from the resulting broadcast.
pub fn extract_session_id(headers: &axum::http::HeaderMap) -> Option<String> {
    headers
        .get("x-session-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}
