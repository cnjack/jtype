//! Tests for the MCP OAuth surface: discovery metadata + the RFC 8628 device
//! authorization grant (`/api/oauth/device_authorization`, `/api/oauth/token`).

mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use serde_json::{json, Value};
use tower::ServiceExt;

/// POST an `application/x-www-form-urlencoded` body; return (status, json).
async fn form_post(app: Router, uri: &str, body: &str) -> (StatusCode, Value) {
    let request = Request::builder()
        .method("POST")
        .uri(uri)
        .header("content-type", "application/x-www-form-urlencoded")
        .body(Body::from(body.to_string()))
        .unwrap();
    let response = app.oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
    let json = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes)
            .unwrap_or_else(|_| Value::String(String::from_utf8_lossy(&bytes).into()))
    };
    (status, json)
}

#[tokio::test]
async fn protected_resource_metadata_advertises_mcp() {
    let (app, _pool) = common::setup().await;
    let (status, body) = common::req(
        app,
        "GET",
        "/.well-known/oauth-protected-resource",
        None,
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(body["resource"].as_str().unwrap().ends_with("/mcp"));
    assert!(body["authorization_servers"].as_array().unwrap().len() >= 1);
}

#[tokio::test]
async fn authorization_server_metadata_advertises_device_grant() {
    let (app, _pool) = common::setup().await;
    let (status, body) = common::req(
        app,
        "GET",
        "/.well-known/oauth-authorization-server",
        None,
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(body["device_authorization_endpoint"]
        .as_str()
        .unwrap()
        .ends_with("/api/oauth/device_authorization"));
    assert!(body["token_endpoint"].as_str().unwrap().ends_with("/api/oauth/token"));
    let grants = body["grant_types_supported"].as_array().unwrap();
    assert!(grants
        .iter()
        .any(|g| g == "urn:ietf:params:oauth:grant-type:device_code"));
}

#[tokio::test]
async fn device_grant_full_flow_mints_mcp_token() {
    let (app, _pool) = common::setup().await;

    // 1. Start device authorization (RFC 8628 §3.1).
    let (status, body) = form_post(app.clone(), "/api/oauth/device_authorization", "client_id=mcp").await;
    assert_eq!(status, StatusCode::OK, "device_authorization: {body}");
    let device_code = body["device_code"].as_str().unwrap().to_string();
    let user_code = body["user_code"].as_str().unwrap().to_string();
    assert!(body["verification_uri_complete"].as_str().unwrap().contains(&user_code));

    // 2. Polling before approval → 400 authorization_pending.
    let (status, body) = form_post(
        app.clone(),
        "/api/oauth/token",
        &format!("grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code={device_code}"),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"], "authorization_pending");

    // 3. A real user approves the code.
    let username = common::uid();
    let (user_token, _) = common::register_user(app.clone(), &username).await;
    let (status, _) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/device/approve",
        Some(&user_token),
        Some(json!({ "userCode": user_code })),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // 4. Token exchange now yields an access token.
    let (status, body) = form_post(
        app.clone(),
        "/api/oauth/token",
        &format!("grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code={device_code}"),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "token: {body}");
    assert_eq!(body["token_type"], "Bearer");
    let access_token = body["access_token"].as_str().unwrap().to_string();
    assert!(!access_token.is_empty());

    // 5. The minted token authenticates the MCP endpoint.
    let (status, init) = common::req(
        app,
        "POST",
        "/mcp",
        Some(&access_token),
        Some(json!({"jsonrpc":"2.0","id":1,"method":"initialize"})),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(init["result"]["serverInfo"]["name"], "jtype");
}

#[tokio::test]
async fn token_rejects_bad_grant_and_unknown_code() {
    let (app, _pool) = common::setup().await;

    let (status, body) = form_post(app.clone(), "/api/oauth/token", "grant_type=password").await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"], "unsupported_grant_type");

    let (status, body) = form_post(
        app,
        "/api/oauth/token",
        "grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=nope-not-real",
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"], "invalid_grant");
}
