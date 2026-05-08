mod common;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::{MySql, Pool};

// ── Local helpers ─────────────────────────────────────────────────────────────

/// Register a user and immediately promote them to admin via direct SQL.
/// Returns (token, username).
async fn make_admin(app: axum::Router, pool: &Pool<MySql>) -> (String, String) {
    let username = common::uid();
    let (token, _) = common::register_user(app, &username).await;
    sqlx::query("UPDATE users SET role = 'admin' WHERE username = ?")
        .bind(&username)
        .execute(pool)
        .await
        .unwrap();
    (token, username)
}

/// GET /api/me/profile and return the user's id field.
async fn get_user_id(app: axum::Router, token: &str) -> String {
    let (_, body) = common::req(app, "GET", "/api/me/profile", Some(token), None).await;
    body["id"].as_str().unwrap().to_string()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn admin_list_users_as_admin() {
    let (app, pool) = common::setup().await;
    let (admin_token, _) = make_admin(app.clone(), &pool).await;

    let (status, body) =
        common::req(app, "GET", "/api/admin/users", Some(&admin_token), None).await;

    assert_eq!(status, StatusCode::OK);
    let arr = body.as_array().expect("expected JSON array");
    assert!(arr.len() >= 1);
    // Spot-check fields on the first entry
    let first = &arr[0];
    assert!(first["id"].as_str().is_some(), "missing id: {first}");
    assert!(
        first["username"].as_str().is_some(),
        "missing username: {first}"
    );
    assert!(first["role"].as_str().is_some(), "missing role: {first}");
}

#[tokio::test]
async fn admin_list_users_forbidden() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;

    let (status, _) = common::req(app, "GET", "/api/admin/users", Some(&token), None).await;

    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn admin_list_users_unauthorized() {
    let (app, _pool) = common::setup().await;

    let (status, _) = common::req(app, "GET", "/api/admin/users", None, None).await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn admin_get_user_detail() {
    let (app, pool) = common::setup().await;
    let (admin_token, _) = make_admin(app.clone(), &pool).await;

    // Register a second user and get their id
    let username2 = common::uid();
    let (token2, _) = common::register_user(app.clone(), &username2).await;
    let user2_id = get_user_id(app.clone(), &token2).await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/admin/users/{user2_id}"),
        Some(&admin_token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["username"].as_str().unwrap(), username2);
    assert!(body["id"].as_str().is_some());
}

#[tokio::test]
async fn admin_get_user_not_found() {
    let (app, pool) = common::setup().await;
    let (admin_token, _) = make_admin(app.clone(), &pool).await;

    let (status, _) = common::req(
        app,
        "GET",
        "/api/admin/users/nonexistent-id-that-does-not-exist",
        Some(&admin_token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn admin_update_user_disable() {
    let (app, pool) = common::setup().await;
    let (admin_token, _) = make_admin(app.clone(), &pool).await;

    let username2 = common::uid();
    let (token2, _) = common::register_user(app.clone(), &username2).await;
    let user2_id = get_user_id(app.clone(), &token2).await;

    let (status, body) = common::req(
        app,
        "PUT",
        &format!("/api/admin/users/{user2_id}"),
        Some(&admin_token),
        Some(json!({ "enabled": false })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "update failed: {body}");
    assert_eq!(
        body["enabled"].as_bool().unwrap(),
        false,
        "expected enabled=false: {body}"
    );
}

#[tokio::test]
async fn admin_update_user_disabled_cannot_login() {
    let (app, pool) = common::setup().await;
    let (admin_token, _) = make_admin(app.clone(), &pool).await;

    let username2 = common::uid();
    let (token2, _) = common::register_user(app.clone(), &username2).await;
    let user2_id = get_user_id(app.clone(), &token2).await;

    // Disable user2
    let (status, body) = common::req(
        app.clone(),
        "PUT",
        &format!("/api/admin/users/{user2_id}"),
        Some(&admin_token),
        Some(json!({ "enabled": false })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "disable failed: {body}");

    // Attempt login as disabled user2
    let (login_status, _) = common::req(
        app,
        "POST",
        "/api/login",
        None,
        Some(json!({ "username": username2, "password": "TestPass1!" })),
    )
    .await;

    assert_eq!(login_status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn admin_list_workspaces() {
    let (app, pool) = common::setup().await;
    let (admin_token, _) = make_admin(app.clone(), &pool).await;

    // Create a workspace as a regular user
    let username2 = common::uid();
    let (token2, _) = common::register_user(app.clone(), &username2).await;
    let ws_name = common::wname();
    common::create_workspace(app.clone(), &token2, &ws_name).await;

    let (status, body) = common::req(
        app,
        "GET",
        "/api/admin/workspaces",
        Some(&admin_token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let arr = body.as_array().expect("expected JSON array");
    assert!(arr.len() >= 1);
    // Spot-check fields
    let first = &arr[0];
    assert!(first["id"].as_str().is_some(), "missing id: {first}");
    assert!(first["name"].as_str().is_some(), "missing name: {first}");
}

#[tokio::test]
async fn admin_get_stats() {
    let (app, pool) = common::setup().await;
    let (admin_token, _) = make_admin(app.clone(), &pool).await;

    let (status, body) =
        common::req(app, "GET", "/api/admin/stats", Some(&admin_token), None).await;

    assert_eq!(status, StatusCode::OK, "stats failed: {body}");
    assert!(
        body["totalUsers"].as_u64().is_some(),
        "missing totalUsers: {body}"
    );
    assert!(
        body["totalWorkspaces"].as_u64().is_some(),
        "missing totalWorkspaces: {body}"
    );
    assert!(
        body["totalDocuments"].as_u64().is_some(),
        "missing totalDocuments: {body}"
    );
    assert!(
        body["totalStorageBytes"].as_u64().is_some(),
        "missing totalStorageBytes: {body}"
    );
    assert!(
        body["totalDomains"].as_u64().is_some(),
        "missing totalDomains: {body}"
    );
}

#[tokio::test]
async fn admin_update_user_role() {
    let (app, pool) = common::setup().await;
    let (admin_token, _) = make_admin(app.clone(), &pool).await;

    let username2 = common::uid();
    let (token2, _) = common::register_user(app.clone(), &username2).await;
    let user2_id = get_user_id(app.clone(), &token2).await;

    // Verify user2 starts as a regular user
    let (status, body) = common::req(
        app.clone(),
        "GET",
        &format!("/api/admin/users/{user2_id}"),
        Some(&admin_token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["role"].as_str().unwrap(), "user");

    // Promote user2 to admin
    let (status, body) = common::req(
        app,
        "PUT",
        &format!("/api/admin/users/{user2_id}"),
        Some(&admin_token),
        Some(json!({ "role": "admin" })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "promote failed: {body}");
    assert_eq!(
        body["role"].as_str().unwrap(),
        "admin",
        "expected role=admin: {body}"
    );
}
