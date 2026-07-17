//! Shared test helpers for jtype-web integration tests.
//!
//! Every test file starts with:
//!   mod common;
//! and calls `common::setup().await` to get a (Router, Pool) pair.

#![allow(dead_code)]

use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use serde_json::{json, Value};
use sqlx::{MySql, Pool};
use tower::ServiceExt;
use uuid::Uuid;

// ── DB / App setup ────────────────────────────────────────────────────────────

pub async fn setup_db() -> Pool<MySql> {
    let url = std::env::var("TEST_DATABASE_URL")
        .or_else(|_| std::env::var("JTYPED_DATABASE_URL"))
        .unwrap_or_else(|_| "mysql://jtype:jtype-local@127.0.0.1:3306/jtype".to_string());

    let pool = sqlx::mysql::MySqlPoolOptions::new()
        .max_connections(3)
        .connect(&url)
        .await
        .expect("Cannot connect to test DB. Set TEST_DATABASE_URL.");

    jtype_web::db::migrations::run_all(&pool)
        .await
        .expect("Migration failed");

    pool
}

/// Returns (app_router, pool) — call once per #[tokio::test].
pub async fn setup() -> (Router, Pool<MySql>) {
    let pool = setup_db().await;
    let app = jtype_web::build_router(pool.clone(), "http://localhost:13345".to_string());
    (app, pool)
}

/// Returns (app_router, pool, hub) — use when testing WS event notifications.
pub async fn setup_with_hub() -> (Router, Pool<MySql>, jtype_web::hub::ConnectionHub) {
    let pool = setup_db().await;
    let (app, hub) =
        jtype_web::build_router_with_hub(pool.clone(), "http://localhost:13345".to_string());
    (app, pool, hub)
}

// ── Unique name helpers ───────────────────────────────────────────────────────

/// Generate a unique username safe for MySQL (alpha, <= 30 chars).
pub fn uid() -> String {
    let s = Uuid::new_v4().simple().to_string();
    format!("t{}", &s[..13]) // "t" + 13 hex = 14 chars, always valid
}

/// Unique workspace name.
pub fn wname() -> String {
    format!("WS {}", &Uuid::new_v4().simple().to_string()[..8])
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

/// Send a request and return (status, response_json).
/// Pass `body = None` for empty body (GET, DELETE without payload).
pub async fn req(
    app: Router,
    method: &str,
    uri: &str,
    token: Option<&str>,
    body: Option<Value>,
) -> (StatusCode, Value) {
    let body_bytes = match &body {
        Some(v) => serde_json::to_vec(v).unwrap(),
        None => vec![],
    };

    let mut builder = Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json");

    if let Some(t) = token {
        builder = builder.header("authorization", format!("Bearer {t}"));
    }

    let request = builder.body(Body::from(body_bytes)).unwrap();
    let response = app.oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), 10 * 1024 * 1024)
        .await
        .unwrap();
    let json = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes)
            .unwrap_or_else(|_| Value::String(String::from_utf8_lossy(&bytes).into()))
    };
    (status, json)
}

/// Same as `req` but identifies the caller's platform in the shared REST
/// contract. Mobile source tests use this to exercise the real router.
pub async fn req_with_client_type(
    app: Router,
    method: &str,
    uri: &str,
    token: Option<&str>,
    body: Option<Value>,
    client_type: &str,
) -> (StatusCode, Value) {
    let body_bytes = match &body {
        Some(value) => serde_json::to_vec(value).unwrap(),
        None => vec![],
    };
    let mut builder = Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json")
        .header("x-client-type", client_type);
    if let Some(value) = token {
        builder = builder.header("authorization", format!("Bearer {value}"));
    }
    let response = app
        .oneshot(builder.body(Body::from(body_bytes)).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), 10 * 1024 * 1024)
        .await
        .unwrap();
    let json = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes)
            .unwrap_or_else(|_| Value::String(String::from_utf8_lossy(&bytes).into()))
    };
    (status, json)
}

/// Same as `req` but attaches `X-Session-Id` header (used to test sender exclusion).
pub async fn req_with_session(
    app: Router,
    method: &str,
    uri: &str,
    token: Option<&str>,
    body: Option<Value>,
    session_id: Option<&str>,
) -> (StatusCode, Value) {
    let body_bytes = match &body {
        Some(v) => serde_json::to_vec(v).unwrap(),
        None => vec![],
    };

    let mut builder = Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json");

    if let Some(t) = token {
        builder = builder.header("authorization", format!("Bearer {t}"));
    }
    if let Some(s) = session_id {
        builder = builder.header("x-session-id", s);
    }

    let request = builder.body(Body::from(body_bytes)).unwrap();
    let response = app.oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), 10 * 1024 * 1024)
        .await
        .unwrap();
    let json = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes)
            .unwrap_or_else(|_| Value::String(String::from_utf8_lossy(&bytes).into()))
    };
    (status, json)
}

// ── Seed helpers ──────────────────────────────────────────────────────────────

/// Register a user. Returns (token, username).
pub async fn register_user(app: Router, username: &str) -> (String, String) {
    let (status, body) = req(
        app,
        "POST",
        "/api/register",
        None,
        Some(json!({ "username": username, "password": "TestPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "register failed: {body}");
    (
        body["token"].as_str().unwrap().to_string(),
        body["username"].as_str().unwrap().to_string(),
    )
}

/// Login and return token.
pub async fn login(app: Router, username: &str) -> String {
    let (status, body) = req(
        app,
        "POST",
        "/api/login",
        None,
        Some(json!({ "username": username, "password": "TestPass1!" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "login failed: {body}");
    body["token"].as_str().unwrap().to_string()
}

/// Create a workspace and return its id.
pub async fn create_workspace(app: Router, token: &str, name: &str) -> String {
    let (status, body) = req(
        app,
        "POST",
        "/api/v1/workspaces",
        Some(token),
        Some(json!({ "name": name })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "create_workspace failed: {body}");
    body["id"].as_str().unwrap().to_string()
}

/// Save a document via PUT /api/v1/workspaces/:wid/documents and return the response body.
pub async fn save_doc(
    app: Router,
    token: &str,
    workspace_id: &str,
    path: &str,
    content: &str,
) -> Value {
    let (status, body) = req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/documents/save"),
        Some(token),
        Some(json!({
            "relativePath": path,
            "content": content,
            "title": path.trim_end_matches(".md"),
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "save_doc failed: {body}");
    body
}

/// Move a document to trash. Returns the trash id.
pub async fn trash_doc(app: Router, token: &str, workspace_id: &str, document_id: &str) -> String {
    let (status, body) = req(
        app,
        "DELETE",
        &format!("/api/v1/workspaces/{workspace_id}/documents/{document_id}"),
        Some(token),
        None,
    )
    .await;
    assert!(
        status == StatusCode::NO_CONTENT || status == StatusCode::OK,
        "trash_doc failed: {body}"
    );
    // list trash to find the new item
    body["id"].as_str().unwrap_or("").to_string()
}
