mod common;

use axum::http::StatusCode;
use serde_json::json;

// 1. POST /api/oauth/device/start returns deviceCode, userCode, verificationUrl
#[tokio::test]
async fn device_start_returns_codes() {
    let (app, _pool) = common::setup().await;
    let (status, body) = common::req(
        app,
        "POST",
        "/api/oauth/device/start",
        None,
        Some(json!({ "deviceId": "test-device-1" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(!body["deviceCode"].as_str().unwrap_or("").is_empty());
    assert!(!body["userCode"].as_str().unwrap_or("").is_empty());
    assert!(body["verificationUrl"]
        .as_str()
        .unwrap_or("")
        .contains("/oauth/device"));
}

// 2. deviceId is optional — empty body `{}` should still succeed
#[tokio::test]
async fn device_start_no_device_id() {
    let (app, _pool) = common::setup().await;
    let (status, body) = common::req(
        app,
        "POST",
        "/api/oauth/device/start",
        None,
        Some(json!({})),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(!body["deviceCode"].as_str().unwrap_or("").is_empty());
    assert!(!body["userCode"].as_str().unwrap_or("").is_empty());
}

// 3. Polling immediately after start (not yet approved) returns 400 "authorization pending"
#[tokio::test]
async fn device_poll_pending() {
    let (app, _pool) = common::setup().await;
    let (start_status, start_body) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/device/start",
        None,
        Some(json!({ "deviceId": "pending-device" })),
    )
    .await;
    assert_eq!(start_status, StatusCode::OK);
    let device_code = start_body["deviceCode"].as_str().unwrap().to_string();

    let (poll_status, poll_body) = common::req(
        app,
        "POST",
        "/api/oauth/device/poll",
        None,
        Some(json!({ "deviceCode": device_code })),
    )
    .await;
    assert_eq!(poll_status, StatusCode::BAD_REQUEST);
    let msg = poll_body.as_str().unwrap_or(
        poll_body["message"]
            .as_str()
            .unwrap_or(poll_body["error"].as_str().unwrap_or("")),
    );
    assert!(
        msg.to_lowercase().contains("authorization pending"),
        "unexpected body: {poll_body}"
    );
}

// 4. Full flow: start → register user → approve → poll → 200 + token
#[tokio::test]
async fn device_full_flow() {
    let (app, _pool) = common::setup().await;

    // Start device flow
    let (start_status, start_body) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/device/start",
        None,
        Some(json!({ "deviceId": "full-flow-device" })),
    )
    .await;
    assert_eq!(start_status, StatusCode::OK);
    let device_code = start_body["deviceCode"].as_str().unwrap().to_string();
    let user_code = start_body["userCode"].as_str().unwrap().to_string();

    // Register a user and get their token
    let username = common::uid();
    let (user_token, _) = common::register_user(app.clone(), &username).await;

    // Approve the device code using the user's token
    let (approve_status, _) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/device/approve",
        Some(&user_token),
        Some(json!({ "userCode": user_code })),
    )
    .await;
    assert_eq!(approve_status, StatusCode::NO_CONTENT);

    // Poll — should now return 200 with a session token
    let (poll_status, poll_body) = common::req(
        app,
        "POST",
        "/api/oauth/device/poll",
        None,
        Some(json!({ "deviceCode": device_code })),
    )
    .await;
    assert_eq!(poll_status, StatusCode::OK);
    assert!(!poll_body["token"].as_str().unwrap_or("").is_empty());
}

// 5. Polling with an unknown deviceCode returns 404
#[tokio::test]
async fn device_poll_invalid_code() {
    let (app, _pool) = common::setup().await;
    let (status, _body) = common::req(
        app,
        "POST",
        "/api/oauth/device/poll",
        None,
        Some(json!({ "deviceCode": "this-code-does-not-exist-at-all" })),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// 6. Approving a non-existent userCode returns 404
#[tokio::test]
async fn device_approve_invalid_user_code() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (user_token, _) = common::register_user(app.clone(), &username).await;

    let (status, _body) = common::req(
        app,
        "POST",
        "/api/oauth/device/approve",
        Some(&user_token),
        Some(json!({ "userCode": "ZZZZZZ" })),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// 7. Approving without a Bearer token returns 401
#[tokio::test]
async fn device_approve_no_auth() {
    let (app, _pool) = common::setup().await;

    // Start a flow so we have a real userCode
    let (start_status, start_body) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/device/start",
        None,
        Some(json!({ "deviceId": "no-auth-device" })),
    )
    .await;
    assert_eq!(start_status, StatusCode::OK);
    let user_code = start_body["userCode"].as_str().unwrap().to_string();

    let (status, _body) = common::req(
        app,
        "POST",
        "/api/oauth/device/approve",
        None, // no Bearer token
        Some(json!({ "userCode": user_code })),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

// 8. After a successful poll, the device code is consumed — a second poll returns 404
#[tokio::test]
async fn device_poll_consumed() {
    let (app, _pool) = common::setup().await;

    // Start device flow
    let (start_status, start_body) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/device/start",
        None,
        Some(json!({ "deviceId": "consumed-device" })),
    )
    .await;
    assert_eq!(start_status, StatusCode::OK);
    let device_code = start_body["deviceCode"].as_str().unwrap().to_string();
    let user_code = start_body["userCode"].as_str().unwrap().to_string();

    // Register + approve
    let username = common::uid();
    let (user_token, _) = common::register_user(app.clone(), &username).await;
    let (approve_status, _) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/device/approve",
        Some(&user_token),
        Some(json!({ "userCode": user_code })),
    )
    .await;
    assert_eq!(approve_status, StatusCode::NO_CONTENT);

    // First poll — succeeds
    let (first_poll_status, _) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/device/poll",
        None,
        Some(json!({ "deviceCode": &device_code })),
    )
    .await;
    assert_eq!(first_poll_status, StatusCode::OK);

    // Second poll with the same deviceCode — must be 404 (consumed)
    let (second_poll_status, _) = common::req(
        app,
        "POST",
        "/api/oauth/device/poll",
        None,
        Some(json!({ "deviceCode": device_code })),
    )
    .await;
    assert_eq!(second_poll_status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn mcp_device_code_cannot_be_exchanged_by_desktop_poll() {
    let (app, _pool) = common::setup().await;
    let request = axum::http::Request::builder()
        .method("POST")
        .uri("/api/oauth/device_authorization")
        .header("content-type", "application/x-www-form-urlencoded")
        .body(axum::body::Body::from("client_id=mcp"))
        .unwrap();
    let response = tower::ServiceExt::oneshot(app.clone(), request)
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(response.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let started: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let device_code = started["device_code"].as_str().unwrap().to_string();
    let user_code = started["user_code"].as_str().unwrap().to_string();

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

    let (status, _) = common::req(
        app,
        "POST",
        "/api/oauth/device/poll",
        None,
        Some(json!({ "deviceCode": device_code })),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn desktop_device_code_cannot_be_exchanged_by_mcp_token_endpoint() {
    let (app, _pool) = common::setup().await;
    let (start_status, start_body) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/device/start",
        None,
        Some(json!({ "deviceId": "desktop-cross-flow" })),
    )
    .await;
    assert_eq!(start_status, StatusCode::OK);
    let device_code = start_body["deviceCode"].as_str().unwrap();
    let user_code = start_body["userCode"].as_str().unwrap();

    let username = common::uid();
    let (user_token, _) = common::register_user(app.clone(), &username).await;
    let (approve_status, _) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/device/approve",
        Some(&user_token),
        Some(json!({ "userCode": user_code })),
    )
    .await;
    assert_eq!(approve_status, StatusCode::NO_CONTENT);

    let body = format!(
        "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code&device_code={device_code}"
    );
    let request = axum::http::Request::builder()
        .method("POST")
        .uri("/api/oauth/token")
        .header("content-type", "application/x-www-form-urlencoded")
        .body(axum::body::Body::from(body))
        .unwrap();
    let response = tower::ServiceExt::oneshot(app, request).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
