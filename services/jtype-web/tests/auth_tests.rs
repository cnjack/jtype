mod common;

use axum::http::StatusCode;
use jtype_web::util::sha256_hex;
use serde_json::json;

#[tokio::test]
async fn register_success() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (status, body) = common::req(
        app,
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": &username, "password": "TestPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(!body["token"].as_str().unwrap_or("").is_empty());
    assert_eq!(body["username"].as_str().unwrap(), username);
    assert!(body["role"].as_str().is_some());
}

#[tokio::test]
async fn register_duplicate_username() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    common::register_user(app.clone(), &username).await;
    let (status, _body) = common::req(
        app,
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": &username, "password": "TestPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn register_invalid_username_too_short() {
    let (app, _pool) = common::setup().await;
    let (status, _body) = common::req(
        app,
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": "ab", "password": "TestPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn register_invalid_username_spaces() {
    let (app, _pool) = common::setup().await;
    let (status, _body) = common::req(
        app,
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": "bad name", "password": "TestPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn register_invalid_password_too_short() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (status, _body) = common::req(
        app,
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": &username, "password": "abc" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn login_success() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    common::register_user(app.clone(), &username).await;
    let (status, body) = common::req(
        app,
        "POST",
        "/api/login",
        None,
        Some(json!({ "username": &username, "password": "TestPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(!body["token"].as_str().unwrap_or("").is_empty());
    assert_eq!(body["username"].as_str().unwrap(), username);
}

#[tokio::test]
async fn login_wrong_password() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    common::register_user(app.clone(), &username).await;
    let (status, _body) = common::req(
        app,
        "POST",
        "/api/login",
        None,
        Some(json!({ "username": &username, "password": "WrongPass99!" })),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn login_unknown_user() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (status, _body) = common::req(
        app,
        "POST",
        "/api/login",
        None,
        Some(json!({ "username": &username, "password": "TestPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn get_me_success() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let (status, body) = common::req(app, "GET", "/api/me", Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["username"].as_str().unwrap(), username);
}

#[tokio::test]
async fn get_me_no_token() {
    let (app, _pool) = common::setup().await;
    let (status, _body) = common::req(app, "GET", "/api/me", None, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn get_me_bad_token() {
    let (app, _pool) = common::setup().await;
    let (status, _body) = common::req(app, "GET", "/api/me", Some("not-a-valid-token"), None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn get_me_expired_session() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let token_hash = sha256_hex(&token);

    sqlx::query(
        "UPDATE sessions SET expires_at = CURRENT_TIMESTAMP - INTERVAL 1 SECOND WHERE token_hash = ?",
    )
    .bind(token_hash)
    .execute(&pool)
    .await
    .expect("expire session");

    let (status, _body) = common::req(app, "GET", "/api/me", Some(&token), None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}
