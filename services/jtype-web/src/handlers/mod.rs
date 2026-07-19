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
pub mod push;
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

/// Restrict client-provided source values to the version/event contract.
/// Callers choose the fallback that matches their endpoint (web-facing REST
/// defaults to web; desktop/mobile sync defaults to desktop).
pub fn normalize_client_type<'a>(client_type: Option<&'a str>, fallback: &'a str) -> &'a str {
    match client_type {
        Some("desktop") => "desktop",
        Some("mobile") => "mobile",
        Some("web") => "web",
        _ => fallback,
    }
}

pub fn extract_client_type<'a>(headers: &'a axum::http::HeaderMap, fallback: &'a str) -> &'a str {
    normalize_client_type(
        headers
            .get("x-client-type")
            .and_then(|value| value.to_str().ok()),
        fallback,
    )
}

#[cfg(test)]
mod tests {
    use super::normalize_client_type;

    #[test]
    fn client_type_is_restricted_to_supported_sources() {
        assert_eq!(normalize_client_type(Some("desktop"), "web"), "desktop");
        assert_eq!(normalize_client_type(Some("mobile"), "web"), "mobile");
        assert_eq!(normalize_client_type(Some("web"), "desktop"), "web");
        assert_eq!(normalize_client_type(Some("unknown"), "desktop"), "desktop");
        assert_eq!(normalize_client_type(None, "web"), "web");
    }
}
