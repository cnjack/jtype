mod common;
use axum::http::StatusCode;
use serde_json::json;

// ── helpers ──────────────────────────────────────────────────────────────────

/// Save a document and return its document_id.
async fn setup_doc(app: axum::Router, token: &str, ws_id: &str, path: &str) -> String {
    common::save_doc(app.clone(), token, ws_id, path, "# Hello\n\nContent").await;
    let (_, list) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents"),
        Some(token),
        None,
    )
    .await;
    list.as_array()
        .unwrap()
        .iter()
        .find(|d| d["relativePath"].as_str() == Some(path))
        .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string()
}

// ── Theme API ─────────────────────────────────────────────────────────────────

// 1. GET /api/themes — no auth required, returns at least 5 themes
#[tokio::test]
async fn list_themes_returns_themes() {
    let (app, _pool) = common::setup().await;

    let (status, body) = common::req(app, "GET", "/api/themes", None, None).await;

    assert_eq!(status, StatusCode::OK);
    let themes = body.as_array().expect("expected array");
    assert!(themes.len() >= 5, "expected at least 5 themes, got {}", themes.len());

    // All themes must have an id and name
    for theme in themes {
        assert!(
            theme["id"].as_str().is_some(),
            "theme missing id: {theme}"
        );
        assert!(
            theme["name"].as_str().is_some(),
            "theme missing name: {theme}"
        );
    }
}

// 2. Verify well-known theme IDs are present
#[tokio::test]
async fn list_themes_includes_known_ids() {
    let (app, _pool) = common::setup().await;

    let (status, body) = common::req(app, "GET", "/api/themes", None, None).await;
    assert_eq!(status, StatusCode::OK);

    let ids: Vec<&str> = body
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|t| t["id"].as_str())
        .collect();

    for expected in &["default", "academic", "terminal", "paper", "tokyo"] {
        assert!(
            ids.contains(expected),
            "theme '{}' not in list: {:?}",
            expected,
            ids
        );
    }
}

// ── Site Settings API ─────────────────────────────────────────────────────────

// 3. GET /site — lazy-creates site with default theme
#[tokio::test]
async fn get_site_settings_returns_defaults() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/site"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(body["theme"].as_str().is_some(), "expected theme field");
    assert_eq!(body["theme"].as_str().unwrap(), "default");
}

// 4. PUT /site — updates theme
#[tokio::test]
async fn update_site_settings_changes_theme() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app.clone(),
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/site"),
        Some(&token),
        Some(json!({ "theme": "academic" })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["theme"].as_str().unwrap(), "academic");

    // Verify GET reflects the change
    let (get_status, get_body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/site"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(get_status, StatusCode::OK);
    assert_eq!(get_body["theme"].as_str().unwrap(), "academic");
}

// 5. PUT /site — setting name and footer
#[tokio::test]
async fn update_site_settings_name_and_footer() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/site"),
        Some(&token),
        Some(json!({
            "name": "My Awesome Site",
            "footerHtml": "<p>© 2025 Me</p>"
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["name"].as_str().unwrap(), "My Awesome Site");
}

// 6. PUT /site — invalid theme returns 400
#[tokio::test]
async fn update_site_settings_invalid_theme_rejected() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _body) = common::req(
        app,
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/site"),
        Some(&token),
        Some(json!({ "theme": "nonexistent_theme_xyz" })),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// 7. GET /site without auth — 401
#[tokio::test]
async fn get_site_settings_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/site"),
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

// ── Publish API ───────────────────────────────────────────────────────────────

// 8. POST /publish — creates published_page snapshot
#[tokio::test]
async fn publish_document_creates_snapshot() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let doc_id = setup_doc(app.clone(), &token, &ws_id, "snap.md").await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/publish"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(body["isPublished"].as_bool().unwrap_or(false));
    assert!(body["publishedAt"].as_str().is_some());
}

// 9. GET /publish (status) after publishing shows isPublished=true
#[tokio::test]
async fn get_publish_status_after_publish_shows_published() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let doc_id = setup_doc(app.clone(), &token, &ws_id, "published.md").await;

    common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/publish"),
        Some(&token),
        None,
    )
    .await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/publish"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(body["isPublished"].as_bool().unwrap_or(false));
    assert!(body["publishedAt"].as_str().is_some());
}

// 10. DELETE /publish — removes snapshot and clears flag
#[tokio::test]
async fn unpublish_removes_snapshot() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let doc_id = setup_doc(app.clone(), &token, &ws_id, "tounpub.md").await;

    // Publish
    common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/publish"),
        Some(&token),
        None,
    )
    .await;

    // Unpublish
    let (del_status, _) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/publish"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(del_status, StatusCode::NO_CONTENT);

    // Status should now be unpublished
    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/publish"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(!body["isPublished"].as_bool().unwrap_or(true));
}

// 11. GET /published — lists all published pages for the workspace
#[tokio::test]
async fn list_published_returns_published_pages() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let doc_id1 = setup_doc(app.clone(), &token, &ws_id, "page1.md").await;
    let doc_id2 = setup_doc(app.clone(), &token, &ws_id, "page2.md").await;

    common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id1}/publish"),
        Some(&token),
        None,
    )
    .await;
    common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id2}/publish"),
        Some(&token),
        None,
    )
    .await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/published"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let pages = body.as_array().expect("expected array of published pages");
    assert!(pages.len() >= 2, "expected at least 2 published pages");
}

// 12. POST /publish-batch — batch-publish multiple documents
#[tokio::test]
async fn publish_batch_publishes_multiple_docs() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let doc_id1 = setup_doc(app.clone(), &token, &ws_id, "batch1.md").await;
    let doc_id2 = setup_doc(app.clone(), &token, &ws_id, "batch2.md").await;
    let doc_id3 = setup_doc(app.clone(), &token, &ws_id, "batch3.md").await;

    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/publish-batch"),
        Some(&token),
        Some(json!({
            "documentIds": [doc_id1, doc_id2, doc_id3]
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let published_list = body["published"].as_array().expect("expected published array");
    assert_eq!(published_list.len(), 3);

    // Verify all are listed as published
    let (list_status, list_body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/published"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(list_status, StatusCode::OK);
    let pages = list_body.as_array().unwrap();
    assert!(pages.len() >= 3, "expected at least 3 published pages");
}

// 13. POST /preview — returns rendered HTML for given content + theme
#[tokio::test]
async fn preview_returns_html() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/preview"),
        Some(&token),
        Some(json!({
            "content": "# Preview Test\n\nThis is a preview.",
            "theme": "default"
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let html = body.as_str().unwrap_or_else(|| body["html"].as_str().unwrap_or(""));
    assert!(
        html.contains("<html") || html.contains("<!DOCTYPE"),
        "expected HTML document in preview response"
    );
}

// 14. POST /preview — invalid theme returns 400
#[tokio::test]
async fn preview_invalid_theme_returns_400() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/preview"),
        Some(&token),
        Some(json!({
            "content": "# Test",
            "theme": "invalid_theme_xyz"
        })),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// 15. POST /publish without auth — 401
#[tokio::test]
async fn publish_document_without_auth_returns_401() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let doc_id = setup_doc(app.clone(), &token, &ws_id, "noauth.md").await;

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/publish"),
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

// 16. Re-publishing updates the snapshot (idempotent)
#[tokio::test]
async fn republish_updates_snapshot() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let doc_id = setup_doc(app.clone(), &token, &ws_id, "repub.md").await;

    // First publish
    let (s1, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/publish"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(s1, StatusCode::OK);

    // Save new content
    common::save_doc(app.clone(), &token, &ws_id, "repub.md", "# Updated Content").await;

    // Publish again
    let (s2, body2) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/publish"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(s2, StatusCode::OK);
    assert!(body2["isPublished"].as_bool().unwrap_or(false));
}
