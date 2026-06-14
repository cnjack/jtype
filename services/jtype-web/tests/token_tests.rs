//! Tests for scoped MCP-token management (`/api/me/tokens`) and scope enforcement.

mod common;

use axum::http::StatusCode;
use serde_json::json;

async fn mcp_ok(app: axum::Router, token: &str) -> StatusCode {
    let (status, _) = common::req(
        app,
        "POST",
        "/mcp",
        Some(token),
        Some(json!({"jsonrpc":"2.0","id":1,"method":"initialize"})),
    )
    .await;
    status
}

#[tokio::test]
async fn mint_list_and_use_mcp_token() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (full, _) = common::register_user(app.clone(), &username).await;

    // Full-scope session mints a scoped, expiring MCP token.
    let (status, body) = common::req(
        app.clone(),
        "POST",
        "/api/me/tokens",
        Some(&full),
        Some(json!({ "label": "jcode", "ttlDays": 30 })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["scope"], "mcp");
    let mcp_token = body["token"].as_str().unwrap().to_string();
    assert!(!mcp_token.is_empty());

    // It authenticates the MCP endpoint.
    assert_eq!(mcp_ok(app.clone(), &mcp_token).await, StatusCode::OK);

    // It shows up in the token list with scope + label.
    let (status, list) = common::req(app.clone(), "GET", "/api/me/tokens", Some(&full), None).await;
    assert_eq!(status, StatusCode::OK);
    let tokens = list["tokens"].as_array().unwrap();
    let mcp_entry = tokens
        .iter()
        .find(|t| t["scope"] == "mcp")
        .expect("mcp token listed");
    assert_eq!(mcp_entry["label"], "jcode");
    assert!(mcp_entry["expiresAt"].is_string(), "mcp token should expire");
}

#[tokio::test]
async fn mcp_token_cannot_mint_more_tokens() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (full, _) = common::register_user(app.clone(), &username).await;

    let (_s, body) = common::req(
        app.clone(),
        "POST",
        "/api/me/tokens",
        Some(&full),
        Some(json!({ "label": "agent" })),
    )
    .await;
    let mcp_token = body["token"].as_str().unwrap().to_string();

    // An MCP-scoped token must not be able to spawn more tokens (containment).
    let (status, _) = common::req(
        app,
        "POST",
        "/api/me/tokens",
        Some(&mcp_token),
        Some(json!({ "label": "nope" })),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn revoking_a_token_disables_it() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (full, _) = common::register_user(app.clone(), &username).await;

    let (_s, body) = common::req(
        app.clone(),
        "POST",
        "/api/me/tokens",
        Some(&full),
        Some(json!({ "label": "revoke-me" })),
    )
    .await;
    let mcp_token = body["token"].as_str().unwrap().to_string();
    assert_eq!(mcp_ok(app.clone(), &mcp_token).await, StatusCode::OK);

    // Find the token id (its hash) from the list and revoke it.
    let (_s, list) = common::req(app.clone(), "GET", "/api/me/tokens", Some(&full), None).await;
    let id = list["tokens"]
        .as_array()
        .unwrap()
        .iter()
        .find(|t| t["scope"] == "mcp")
        .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();

    let (status, _) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/me/tokens/{id}"),
        Some(&full),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // The revoked token no longer authenticates.
    assert_eq!(mcp_ok(app, &mcp_token).await, StatusCode::UNAUTHORIZED);
}
