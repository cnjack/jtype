mod common;
use axum::http::StatusCode;
use serde_json::json;
use std::time::Duration;

// 1. Save a new document — assert 200 + CloudDocument fields present
#[tokio::test]
async fn save_document_creates_new() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/save"),
        Some(&token),
        Some(json!({ "relativePath": "notes.md", "content": "# Hello\n\nWorld" })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(!body["documentId"].as_str().unwrap_or("").is_empty());
    assert_eq!(body["relativePath"].as_str().unwrap(), "notes.md");
    assert!(!body["versionId"].as_str().unwrap_or("").is_empty());
    assert!(!body["contentHash"].as_str().unwrap_or("").is_empty());
    assert!(body["updatedClock"].as_i64().unwrap_or(0) >= 0);
}

// 2. Save same path twice — second response contains updated content
#[tokio::test]
async fn save_document_updates_existing() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let created =
        common::save_doc(app.clone(), &token, &ws_id, "update.md", "original content").await;
    let document_id = created["documentId"]
        .as_str()
        .expect("create response documentId")
        .to_string();

    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/save"),
        Some(&token),
        Some(json!({ "relativePath": "update.md", "content": "updated content" })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["documentId"], document_id);
    assert_eq!(body["relativePath"].as_str().unwrap(), "update.md");
    assert_eq!(body["content"].as_str().unwrap(), "updated content");

    let (status, unchanged) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/save"),
        Some(&token),
        Some(json!({ "relativePath": "update.md", "content": "updated content" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(unchanged["documentId"], document_id);
    assert_eq!(unchanged["mergeStatus"], "unchanged");
}

#[tokio::test]
async fn save_document_id_guard_and_create_only_prevent_wrong_overwrite() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let created = common::save_doc(app.clone(), &token, &ws_id, "guarded.md", "original").await;
    let document_id = created["documentId"].as_str().unwrap();

    let (status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/save"),
        Some(&token),
        Some(json!({
            "documentId": "not-the-document-id",
            "relativePath": "guarded.md",
            "content": "must not overwrite"
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/save"),
        Some(&token),
        Some(json!({
            "relativePath": "guarded.md",
            "content": "must not overwrite either",
            "createOnly": true
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (status, current) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents/{document_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(current["content"], "original");
}

#[tokio::test]
async fn concurrent_saves_with_same_base_hash_do_not_silently_overwrite() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let created = common::save_doc(app.clone(), &token, &ws_id, "race.md", "original").await;
    let document_id = created["documentId"].as_str().unwrap().to_string();
    let base_hash = created["contentHash"].as_str().unwrap().to_string();
    let endpoint = format!("/api/v1/workspaces/{ws_id}/documents/save");

    let first = common::req(
        app.clone(),
        "POST",
        &endpoint,
        Some(&token),
        Some(json!({
            "documentId": document_id,
            "relativePath": "race.md",
            "content": "first writer",
            "baseContentHash": base_hash
        })),
    );
    let second = common::req(
        app.clone(),
        "POST",
        &endpoint,
        Some(&token),
        Some(json!({
            "documentId": document_id,
            "relativePath": "race.md",
            "content": "second writer",
            "baseContentHash": base_hash
        })),
    );
    let ((first_status, first_body), (second_status, second_body)) =
        tokio::join!(first, second);

    let statuses = [first_status, second_status];
    assert_eq!(
        statuses
            .iter()
            .filter(|status| **status == StatusCode::OK)
            .count(),
        1,
        "exactly one writer must win: first={first_body}, second={second_body}"
    );
    assert_eq!(
        statuses
            .iter()
            .filter(|status| **status == StatusCode::BAD_REQUEST)
            .count(),
        1,
        "stale writer must be rejected: first={first_body}, second={second_body}"
    );

    let (status, current) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents/{document_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(
        matches!(
            current["content"].as_str(),
            Some("first writer") | Some("second writer")
        ),
        "unexpected final content: {current}"
    );
}

#[tokio::test]
async fn unchanged_save_rechecks_after_a_concurrent_commit() {
    let (app, pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let created = common::save_doc(app.clone(), &token, &ws_id, "noop-race.md", "original").await;
    let document_id = created["documentId"].as_str().unwrap().to_string();
    let base_hash = created["contentHash"].as_str().unwrap().to_string();

    // Hold the row so the unchanged request can perform its optimistic read
    // but must wait at the final locked current-state check.
    let mut writer = pool.begin().await.unwrap();
    sqlx::query("SELECT id FROM documents WHERE id = ? FOR UPDATE")
        .bind(&document_id)
        .fetch_one(&mut *writer)
        .await
        .unwrap();

    let request_app = app.clone();
    let request_token = token.clone();
    let request_ws_id = ws_id.clone();
    let request_document_id = document_id.clone();
    let unchanged = tokio::spawn(async move {
        common::req(
            request_app,
            "POST",
            &format!("/api/v1/workspaces/{request_ws_id}/documents/save"),
            Some(&request_token),
            Some(json!({
                "documentId": request_document_id,
                "relativePath": "noop-race.md",
                "content": "original",
                "baseContentHash": base_hash
            })),
        )
        .await
    });

    tokio::time::sleep(Duration::from_millis(200)).await;
    assert!(
        !unchanged.is_finished(),
        "unchanged save must wait for its locked current-state check"
    );

    sqlx::query(
        "UPDATE documents SET content = ?, content_hash = ? WHERE id = ? AND workspace_id = ?",
    )
    .bind("concurrent content")
    .bind("concurrent-content-hash")
    .bind(&document_id)
    .bind(&ws_id)
    .execute(&mut *writer)
    .await
    .unwrap();
    writer.commit().await.unwrap();

    let (status, body) = unchanged.await.unwrap();
    assert_eq!(
        status,
        StatusCode::BAD_REQUEST,
        "stale unchanged response must be rejected: {body}"
    );
}

// 3. Title extracted from H1 when not provided
#[tokio::test]
async fn save_document_extracts_title_from_h1() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/save"),
        Some(&token),
        Some(json!({ "relativePath": "titled.md", "content": "# My Title\n\nBody" })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["title"].as_str().unwrap(), "My Title");
}

// 4. Explicit title overrides any H1 extraction
#[tokio::test]
async fn save_document_with_explicit_title() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/save"),
        Some(&token),
        Some(json!({
            "relativePath": "override.md",
            "content": "# Ignored Heading\n\nBody",
            "title": "Override"
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["title"].as_str().unwrap(), "Override");
}

// 5. PUT without auth token — 401
#[tokio::test]
async fn save_document_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/save"),
        None,
        Some(json!({ "relativePath": "notes.md", "content": "hello" })),
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

// 6. List documents when workspace has no docs — empty array
#[tokio::test]
async fn list_documents_empty() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.as_array().unwrap().len(), 0);
}

// 7. Saved document appears in list with correct relativePath
#[tokio::test]
async fn list_documents_shows_saved() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    common::save_doc(app.clone(), &token, &ws_id, "listed.md", "content").await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let list = body.as_array().unwrap();
    assert!(!list.is_empty());
    let found = list
        .iter()
        .any(|d| d["relativePath"].as_str().unwrap_or("") == "listed.md");
    assert!(found, "expected 'listed.md' in document list");
}

// 8. GET list without token — 401
#[tokio::test]
async fn list_documents_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents"),
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

// 9. GET /documents/:id returns full document with matching content
#[tokio::test]
async fn get_document_success() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    common::save_doc(app.clone(), &token, &ws_id, "fetch.md", "# Fetch Me").await;

    // Get the document id from the list
    let (list_status, list_body) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(list_status, StatusCode::OK);
    let doc_id = list_body
        .as_array()
        .unwrap()
        .iter()
        .find(|d| d["relativePath"].as_str().unwrap_or("") == "fetch.md")
        .and_then(|d| d["id"].as_str())
        .expect("document not found in list")
        .to_string();

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["documentId"], doc_id);
    assert_eq!(body["relativePath"].as_str().unwrap(), "fetch.md");
    assert_eq!(body["content"].as_str().unwrap(), "# Fetch Me");
}

// 10. GET /documents/:id with nonexistent id — 404
#[tokio::test]
async fn get_document_not_found() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let nonexistent_id = "00000000-0000-0000-0000-000000000000";
    let (status, _body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents/{nonexistent_id}"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

// 11. DELETE a document — 204, document moves to trash
#[tokio::test]
async fn delete_document_success() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    common::save_doc(app.clone(), &token, &ws_id, "delete-me.md", "bye").await;

    // Fetch the document id from the list
    let (list_status, list_body) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(list_status, StatusCode::OK);
    let doc_id = list_body
        .as_array()
        .unwrap()
        .iter()
        .find(|d| d["relativePath"].as_str().unwrap_or("") == "delete-me.md")
        .and_then(|d| d["id"].as_str())
        .expect("document not found in list")
        .to_string();

    let (status, _body) = common::req(
        app,
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::NO_CONTENT);
}

// 12. DELETE nonexistent document id — 404
#[tokio::test]
async fn delete_document_not_found() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let nonexistent_id = "00000000-0000-0000-0000-000000000000";
    let (status, _body) = common::req(
        app,
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/documents/{nonexistent_id}"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

// 13. DELETE without auth token — 401
#[tokio::test]
async fn delete_document_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    common::save_doc(app.clone(), &token, &ws_id, "unauth-delete.md", "content").await;

    let (list_status, list_body) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(list_status, StatusCode::OK);
    let doc_id = list_body
        .as_array()
        .unwrap()
        .iter()
        .find(|d| d["relativePath"].as_str().unwrap_or("") == "unauth-delete.md")
        .and_then(|d| d["id"].as_str())
        .expect("document not found in list")
        .to_string();

    let (status, _body) = common::req(
        app,
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}"),
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

// 14. Viewer role cannot PUT a document — 403
#[tokio::test]
async fn save_document_viewer_forbidden() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    // Owner creates a viewer invite
    let (invite_status, invite_body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites"),
        Some(&token1),
        Some(json!({ "role": "viewer" })),
    )
    .await;
    assert_eq!(
        invite_status,
        StatusCode::OK,
        "invite creation failed: {invite_body}"
    );
    let invite_token = invite_body["inviteToken"].as_str().unwrap().to_string();

    // User2 accepts the invite
    let (accept_status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspace-invites/{invite_token}/accept"),
        Some(&token2),
        None,
    )
    .await;
    assert_eq!(accept_status, StatusCode::OK, "invite accept failed");

    // User2 (viewer) tries to save a document
    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/save"),
        Some(&token2),
        Some(json!({ "relativePath": "viewer-doc.md", "content": "should fail" })),
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
}
