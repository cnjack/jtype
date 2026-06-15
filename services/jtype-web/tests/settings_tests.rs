mod common;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::{MySql, Pool};

/// Register a user and promote them to admin. Returns the token.
async fn make_admin(app: axum::Router, pool: &Pool<MySql>) -> String {
    let username = common::uid();
    let (token, _) = common::register_user(app, &username).await;
    sqlx::query("UPDATE users SET role = 'admin' WHERE username = ?")
        .bind(&username)
        .execute(pool)
        .await
        .unwrap();
    token
}

#[tokio::test]
async fn storage_settings_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (status, _) =
        common::req(app, "GET", "/api/admin/settings/storage", None, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn storage_settings_forbidden_for_non_admin() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;

    let (get_status, _) =
        common::req(app.clone(), "GET", "/api/admin/settings/storage", Some(&token), None).await;
    assert_eq!(get_status, StatusCode::FORBIDDEN);

    let (put_status, _) = common::req(
        app,
        "PUT",
        "/api/admin/settings/storage",
        Some(&token),
        Some(json!({ "localDir": "/tmp/nope" })),
    )
    .await;
    assert_eq!(put_status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn storage_settings_get_shape() {
    let (app, pool) = common::setup().await;
    let token = make_admin(app.clone(), &pool).await;

    let (status, body) =
        common::req(app, "GET", "/api/admin/settings/storage", Some(&token), None).await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body["activeBackend"].as_str().is_some(), "{body}");
    assert!(body["bucket"].as_str().is_some(), "{body}");
    assert!(body["secretKeySet"].as_bool().is_some(), "{body}");
    // The secret value itself must never be returned.
    assert!(body.get("secretKey").is_none(), "secret leaked: {body}");
    assert!(body["sources"]["bucket"].as_str().is_some(), "{body}");
}

#[tokio::test]
async fn storage_settings_rejects_bad_endpoint() {
    let (app, pool) = common::setup().await;
    let token = make_admin(app.clone(), &pool).await;

    let (status, _) = common::req(
        app,
        "PUT",
        "/api/admin/settings/storage",
        Some(&token),
        Some(json!({ "endpoint": "ftp://example.com" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

/// Writing a non-empty local_dir persists it (DB-sourced) and selects the local
/// backend, while a *cleared* endpoint is treated as unset (NOT DB-sourced) and
/// falls through to env/default — an empty row no longer overrides env. This is
/// the only test that mutates the (global, singleton) `server_settings` rows.
#[tokio::test]
async fn storage_settings_put_local_persists_and_clears_endpoint_override() {
    // Ensure no ambient S3 endpoint leaks in, so the empty endpoint
    // deterministically resolves to the local backend (empty = skip now).
    std::env::remove_var("JTYPED_STORAGE_ENDPOINT");
    let (app, pool) = common::setup().await;
    let token = make_admin(app.clone(), &pool).await;

    let dir = format!(
        "{}/jtype-test-storage-{}",
        std::env::temp_dir().display(),
        common::uid()
    );

    let (status, body) = common::req(
        app.clone(),
        "PUT",
        "/api/admin/settings/storage",
        Some(&token),
        Some(json!({ "endpoint": "", "localDir": dir })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "put failed: {body}");
    assert_eq!(body["activeBackend"].as_str(), Some("local"), "{body}");
    assert_eq!(body["localDir"].as_str(), Some(dir.as_str()), "{body}");
    // The non-empty local_dir is DB-sourced; the cleared endpoint is skipped,
    // so it is NOT reported as DB-sourced (falls through to env/default).
    assert_ne!(body["sources"]["endpoint"].as_str(), Some("db"), "{body}");
    assert_eq!(body["sources"]["localDir"].as_str(), Some("db"), "{body}");

    let (status, body) =
        common::req(app, "GET", "/api/admin/settings/storage", Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["localDir"].as_str(), Some(dir.as_str()), "{body}");
    assert_eq!(body["sources"]["localDir"].as_str(), Some("db"), "{body}");
}
