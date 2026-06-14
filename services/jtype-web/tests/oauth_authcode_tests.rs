//! Tests for the OAuth 2.1 authorization-code + PKCE + Dynamic Client
//! Registration flow (the path Claude.ai / Cursor use for one-click connectors).

mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use serde_json::{json, Value};
use tower::ServiceExt;

// RFC 7636 Appendix B example PKCE pair.
const VERIFIER: &str = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE: &str = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const REDIRECT: &str = "https://claude.ai/api/mcp/auth_callback";

async fn form_post(app: Router, uri: &str, body: &str) -> (StatusCode, Value) {
    let request = Request::builder()
        .method("POST")
        .uri(uri)
        .header("content-type", "application/x-www-form-urlencoded")
        .body(Body::from(body.to_string()))
        .unwrap();
    let response = app.oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), 1 << 20).await.unwrap();
    let json = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).unwrap_or(Value::String(String::from_utf8_lossy(&bytes).into()))
    };
    (status, json)
}

async fn register_client(app: Router) -> String {
    let (status, body) = common::req(
        app,
        "POST",
        "/oauth/register",
        None,
        Some(json!({ "client_name": "Test Connector", "redirect_uris": [REDIRECT] })),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "DCR failed: {body}");
    body["client_id"].as_str().unwrap().to_string()
}

#[tokio::test]
async fn metadata_advertises_authcode_and_pkce() {
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
    assert!(body["authorization_endpoint"].as_str().unwrap().ends_with("/oauth/authorize"));
    assert!(body["registration_endpoint"].as_str().unwrap().ends_with("/oauth/register"));
    let grants = body["grant_types_supported"].as_array().unwrap();
    assert!(grants.iter().any(|g| g == "authorization_code"));
    let pkce = body["code_challenge_methods_supported"].as_array().unwrap();
    assert!(pkce.iter().any(|m| m == "S256"));
}

#[tokio::test]
async fn full_authcode_pkce_flow() {
    let (app, _pool) = common::setup().await;
    let client_id = register_client(app.clone()).await;

    // The consent page renders for a valid request.
    let (status, _) = common::req(
        app.clone(),
        "GET",
        &format!("/oauth/authorize?response_type=code&client_id={client_id}&redirect_uri={REDIRECT}&code_challenge={CHALLENGE}&code_challenge_method=S256&scope=mcp&state=xyz"),
        None,
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // A logged-in user approves → we get an auth code in the redirect.
    let username = common::uid();
    let (user_token, _) = common::register_user(app.clone(), &username).await;
    let (status, body) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/authorize",
        Some(&user_token),
        Some(json!({
            "client_id": client_id, "redirect_uri": REDIRECT,
            "code_challenge": CHALLENGE, "code_challenge_method": "S256",
            "scope": "mcp", "state": "xyz"
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    let redirect = body["redirect"].as_str().unwrap();
    assert!(redirect.starts_with(REDIRECT) && redirect.contains("state=xyz"));
    let code = redirect
        .split("code=")
        .nth(1)
        .unwrap()
        .split('&')
        .next()
        .unwrap()
        .to_string();

    // Exchange the code (with the matching verifier) for a token.
    let (status, tok) = form_post(
        app.clone(),
        "/api/oauth/token",
        &format!("grant_type=authorization_code&code={code}&redirect_uri={REDIRECT}&code_verifier={VERIFIER}&client_id={client_id}"),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "token exchange failed: {tok}");
    assert_eq!(tok["token_type"], "Bearer");
    assert_eq!(tok["scope"], "mcp");
    assert!(tok["expires_in"].as_i64().unwrap() > 0, "token should expire");
    let access = tok["access_token"].as_str().unwrap().to_string();

    // The minted token authenticates the MCP endpoint.
    let (status, init) = common::req(
        app,
        "POST",
        "/mcp",
        Some(&access),
        Some(json!({"jsonrpc":"2.0","id":1,"method":"initialize"})),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(init["result"]["serverInfo"]["name"], "jtype");
}

#[tokio::test]
async fn pkce_mismatch_is_rejected() {
    let (app, _pool) = common::setup().await;
    let client_id = register_client(app.clone()).await;
    let username = common::uid();
    let (user_token, _) = common::register_user(app.clone(), &username).await;

    let (_s, body) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/authorize",
        Some(&user_token),
        Some(json!({
            "client_id": client_id, "redirect_uri": REDIRECT,
            "code_challenge": CHALLENGE, "code_challenge_method": "S256", "scope": "mcp"
        })),
    )
    .await;
    let redirect = body["redirect"].as_str().unwrap();
    let code = redirect.split("code=").nth(1).unwrap().split('&').next().unwrap();

    // Wrong verifier → invalid_grant.
    let (status, tok) = form_post(
        app,
        "/api/oauth/token",
        &format!("grant_type=authorization_code&code={code}&redirect_uri={REDIRECT}&code_verifier=the-wrong-verifier-entirely&client_id={client_id}"),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(tok["error"], "invalid_grant");
}

#[tokio::test]
async fn authorize_requires_login_and_dcr_validates() {
    let (app, _pool) = common::setup().await;
    let client_id = register_client(app.clone()).await;

    // Approve without a bearer → 401.
    let (status, _) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/authorize",
        None,
        Some(json!({ "client_id": client_id, "redirect_uri": REDIRECT, "code_challenge": CHALLENGE })),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    // Unregistered redirect_uri → 400.
    let username = common::uid();
    let (user_token, _) = common::register_user(app.clone(), &username).await;
    let (status, _) = common::req(
        app.clone(),
        "POST",
        "/api/oauth/authorize",
        Some(&user_token),
        Some(json!({ "client_id": client_id, "redirect_uri": "https://evil.example/cb", "code_challenge": CHALLENGE })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // DCR with no redirect_uris → 400.
    let (status, _) = common::req(
        app,
        "POST",
        "/oauth/register",
        None,
        Some(json!({ "client_name": "bad" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}
