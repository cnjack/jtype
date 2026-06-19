mod common;

use axum::http::StatusCode;
use serde_json::json;

#[tokio::test]
async fn get_profile_success() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let (status, body) = common::req(app, "GET", "/api/me/profile", Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["username"].as_str().unwrap(), username);
    assert!(body["role"].as_str().is_some());
    assert!(body["siteTitle"].as_str().is_some());
}

#[tokio::test]
async fn get_profile_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (status, _body) = common::req(app, "GET", "/api/me/profile", None, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn update_profile_display_name() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let (status, body) = common::req(
        app,
        "PUT",
        "/api/me/profile",
        Some(&token),
        Some(json!({ "displayName": "Test Display" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["displayName"].as_str().unwrap(), "Test Display");
}

#[tokio::test]
async fn update_profile_email() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let email = format!("{username}@example.com");
    let (status, body) = common::req(
        app,
        "PUT",
        "/api/me/profile",
        Some(&token),
        Some(json!({ "email": &email })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["email"].as_str().unwrap(), email);
}

#[tokio::test]
async fn update_profile_invalid_email() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let (status, _body) = common::req(
        app,
        "PUT",
        "/api/me/profile",
        Some(&token),
        Some(json!({ "email": "notanemail" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn update_profile_clear_email() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let email = format!("{username}@example.com");

    // First set an email
    let (status, _) = common::req(
        app.clone(),
        "PUT",
        "/api/me/profile",
        Some(&token),
        Some(json!({ "email": &email })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Then clear it
    let (status, body) = common::req(
        app,
        "PUT",
        "/api/me/profile",
        Some(&token),
        Some(json!({ "email": "" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(body["email"].is_null() || body["email"].as_str().map_or(true, |s| s.is_empty()));
}

#[tokio::test]
async fn update_site_title() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let (status, body) = common::req(
        app,
        "PUT",
        "/api/me/site",
        Some(&token),
        Some(json!({ "siteTitle": "My Awesome Site" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["siteTitle"].as_str().unwrap(), "My Awesome Site");
}

#[tokio::test]
async fn update_site_title_empty() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let (status, _body) = common::req(
        app,
        "PUT",
        "/api/me/site",
        Some(&token),
        Some(json!({ "siteTitle": "" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn get_storage() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let (status, body) = common::req(app, "GET", "/api/me/storage", Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);
    assert!(body["totalBudgetBytes"].is_number());
    assert!(body["totalUsedBytes"].is_number());
}

#[tokio::test]
async fn get_devices() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let (status, body) = common::req(app, "GET", "/api/me/devices", Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.is_array());
}
