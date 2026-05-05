mod common;
use axum::http::StatusCode;
use serde_json::json;

/// Save a document and return its document_id by listing the workspace documents.
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

// ---------------------------------------------------------------------------
// Status update tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn update_status_to_published() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "doc.md";
    let doc_id = setup_doc(app.clone(), &token, &ws_id, path).await;

    let (status, body) = common::req(
        app,
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/status"),
        Some(&token),
        Some(json!({ "status": "published" })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"].as_str().unwrap(), "published");
}

#[tokio::test]
async fn update_status_to_archived() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "archive-me.md";
    let doc_id = setup_doc(app.clone(), &token, &ws_id, path).await;

    let (status, body) = common::req(
        app,
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/status"),
        Some(&token),
        Some(json!({ "status": "archived" })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"].as_str().unwrap(), "archived");
}

#[tokio::test]
async fn update_status_to_draft() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "back-to-draft.md";
    let doc_id = setup_doc(app.clone(), &token, &ws_id, path).await;

    // First publish the document.
    common::req(
        app.clone(),
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/status"),
        Some(&token),
        Some(json!({ "status": "published" })),
    )
    .await;

    // Then revert to draft.
    let (status, body) = common::req(
        app,
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/status"),
        Some(&token),
        Some(json!({ "status": "draft" })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"].as_str().unwrap(), "draft");
}

#[tokio::test]
async fn update_status_invalid() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "invalid-status.md";
    let doc_id = setup_doc(app.clone(), &token, &ws_id, path).await;

    let (status, _body) = common::req(
        app,
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/status"),
        Some(&token),
        Some(json!({ "status": "review" })),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn update_status_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "no-auth.md";
    let doc_id = setup_doc(app.clone(), &token, &ws_id, path).await;

    // No token provided.
    let (status, _body) = common::req(
        app,
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/status"),
        None,
        Some(json!({ "status": "published" })),
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn update_status_not_found() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let nonexistent_id = "00000000-0000-0000-0000-000000000000";

    let (status, _body) = common::req(
        app,
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/documents/{nonexistent_id}/status"),
        Some(&token),
        Some(json!({ "status": "published" })),
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ---------------------------------------------------------------------------
// Version history tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn list_versions_after_save() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "versioned.md";
    let doc_id = setup_doc(app.clone(), &token, &ws_id, path).await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/versions"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let versions = body.as_array().unwrap();
    assert!(
        !versions.is_empty(),
        "expected at least one version after save"
    );
}

#[tokio::test]
async fn list_versions_multiple_saves() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "multi-save.md";

    // First save (creates the document).
    common::save_doc(app.clone(), &token, &ws_id, path, "# Version 1").await;

    // Retrieve the document id.
    let (_, list) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents"),
        Some(&token),
        None,
    )
    .await;
    let doc_id = list
        .as_array()
        .unwrap()
        .iter()
        .find(|d| d["relativePath"].as_str() == Some(path))
        .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();

    // Two more saves with different content.
    common::save_doc(app.clone(), &token, &ws_id, path, "# Version 2\n\nMore content.").await;
    common::save_doc(
        app.clone(),
        &token,
        &ws_id,
        path,
        "# Version 3\n\nEven more content.",
    )
    .await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/versions"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let versions = body.as_array().unwrap();
    assert!(
        versions.len() >= 3,
        "expected at least 3 versions, got {}",
        versions.len()
    );
}

#[tokio::test]
async fn list_versions_content_correct() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "content-check.md";
    let content = "# Specific Content\n\nThis is the tracked content.";

    // Save with known content and capture the content hash returned by save_doc.
    let saved = common::save_doc(app.clone(), &token, &ws_id, path, content).await;
    let expected_hash = saved["contentHash"].as_str().unwrap().to_string();

    // Get the document id.
    let (_, list) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents"),
        Some(&token),
        None,
    )
    .await;
    let doc_id = list
        .as_array()
        .unwrap()
        .iter()
        .find(|d| d["relativePath"].as_str() == Some(path))
        .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/versions"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let versions = body.as_array().unwrap();
    assert!(!versions.is_empty(), "expected at least one version");

    // The most recent version (first in reverse-chronological order) should
    // match the content hash returned when the document was saved.
    let first_hash = versions[0]["contentHash"].as_str().unwrap();
    assert_eq!(
        first_hash, expected_hash,
        "content hash of latest version should match the saved document"
    );
}

#[tokio::test]
async fn list_versions_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "unauth-versions.md";
    let doc_id = setup_doc(app.clone(), &token, &ws_id, path).await;

    // No token provided.
    let (status, _body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/versions"),
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn list_versions_not_found() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let nonexistent_id = "00000000-0000-0000-0000-000000000000";

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents/{nonexistent_id}/versions"),
        Some(&token),
        None,
    )
    .await;

    // The server may return 404 or an empty array; both are acceptable.
    let is_not_found = status == StatusCode::NOT_FOUND;
    let is_empty_ok = status == StatusCode::OK
        && body.as_array().map(|a| a.is_empty()).unwrap_or(false);
    assert!(
        is_not_found || is_empty_ok,
        "expected 404 or empty 200 for unknown document, got {}",
        status
    );
}
