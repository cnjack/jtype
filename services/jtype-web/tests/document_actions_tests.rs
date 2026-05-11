mod common;
use axum::http::StatusCode;

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
// Publish action tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn publish_document_sets_is_published() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "doc.md";
    let doc_id = setup_doc(app.clone(), &token, &ws_id, path).await;

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
}

#[tokio::test]
async fn unpublish_document_clears_is_published() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "unpub.md";
    let doc_id = setup_doc(app.clone(), &token, &ws_id, path).await;

    // First publish.
    common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/publish"),
        Some(&token),
        None,
    )
    .await;

    // Then unpublish.
    let (status, _body) = common::req(
        app,
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/publish"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::NO_CONTENT);
}

#[tokio::test]
async fn get_publish_status_before_publish() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "status-check.md";
    let doc_id = setup_doc(app.clone(), &token, &ws_id, path).await;

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

#[tokio::test]
async fn get_publish_status_after_publish() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "pub-status.md";
    let doc_id = setup_doc(app.clone(), &token, &ws_id, path).await;

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

#[tokio::test]
async fn publish_document_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = "no-auth.md";
    let doc_id = setup_doc(app.clone(), &token, &ws_id, path).await;

    // No token provided.
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

#[tokio::test]
async fn publish_document_not_found() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let nonexistent_id = "00000000-0000-0000-0000-000000000000";

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/{nonexistent_id}/publish"),
        Some(&token),
        None,
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
    common::save_doc(
        app.clone(),
        &token,
        &ws_id,
        path,
        "# Version 2\n\nMore content.",
    )
    .await;
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
    let is_empty_ok =
        status == StatusCode::OK && body.as_array().map(|a| a.is_empty()).unwrap_or(false);
    assert!(
        is_not_found || is_empty_ok,
        "expected 404 or empty 200 for unknown document, got {}",
        status
    );
}
