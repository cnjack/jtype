mod common;
use axum::http::StatusCode;
use serde_json::json;

// 1. pull_empty_workspace — create ws, pull with sinceClock=0, assert 200, documents=[] deletedPaths=[]
#[tokio::test]
async fn pull_empty_workspace() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/pull"),
        Some(&token),
        Some(json!({ "sinceClock": 0 })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["workspaceId"].as_str().unwrap(), ws_id);
    assert!(
        body["documents"].as_array().map(|a| a.is_empty()).unwrap_or(false),
        "documents should be empty"
    );
    assert!(
        body["deletedPaths"].as_array().map(|a| a.is_empty()).unwrap_or(false),
        "deletedPaths should be empty"
    );
}

// 2. pull_returns_saved_documents — save doc, pull with sinceClock=0, assert doc appears
#[tokio::test]
async fn pull_returns_saved_documents() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    common::save_doc(app.clone(), &token, &ws_id, "hello.md", "# Hello World").await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/pull"),
        Some(&token),
        Some(json!({ "sinceClock": 0 })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let docs = body["documents"].as_array().expect("documents should be an array");
    assert!(!docs.is_empty(), "should return at least one document");
    let found = docs.iter().any(|d| d["relativePath"].as_str() == Some("hello.md"));
    assert!(found, "saved document should appear in pull response");
}

// 3. pull_since_clock_filters — save doc, pull with sinceClock=updatedClock, assert 0 documents
#[tokio::test]
async fn pull_since_clock_filters() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let saved = common::save_doc(app.clone(), &token, &ws_id, "filter.md", "# Filter").await;
    let updated_clock = saved["updatedClock"].as_i64().unwrap_or(0);

    // Pull with sinceClock = updatedClock: "since" is exclusive, so docs with clock <= sinceClock are excluded
    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/pull"),
        Some(&token),
        Some(json!({ "sinceClock": updated_clock })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let docs = body["documents"].as_array().expect("documents should be an array");
    let found = docs.iter().any(|d| d["relativePath"].as_str() == Some("filter.md"));
    assert!(!found, "already-seen document should be filtered out by sinceClock");
}

// 4. pull_with_trash_clock_returns_trash — pull with sinceTrashEventClock=0, assert 200 + trash field
#[tokio::test]
async fn pull_with_trash_clock_returns_trash() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/pull"),
        Some(&token),
        Some(json!({ "sinceClock": 0, "sinceTrashEventClock": 0 })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(
        !body["trash"].is_null(),
        "trash field should be present when sinceTrashEventClock is provided"
    );
}

// 5. push_new_document — push with one document, assert 200, accepted=1, doc in response
#[tokio::test]
async fn push_new_document() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(json!({
            "documents": [
                {
                    "relativePath": "pushed.md",
                    "content": "# Pushed",
                    "title": "pushed"
                }
            ]
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "push should return 200: {body}");
    assert_eq!(body["workspaceId"].as_str().unwrap(), ws_id);
    assert_eq!(body["accepted"].as_i64().unwrap_or(0), 1, "one document should be accepted");
    let docs = body["documents"].as_array().expect("documents should be an array");
    assert!(!docs.is_empty(), "documents array should not be empty");
    let found = docs.iter().any(|d| d["relativePath"].as_str() == Some("pushed.md"));
    assert!(found, "pushed document should appear in response");
}

// 6. push_updates_existing — save doc via PUT, push same path with new content, assert accepted=1
#[tokio::test]
async fn push_updates_existing() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let saved = common::save_doc(app.clone(), &token, &ws_id, "existing.md", "# Original").await;
    let content_hash = saved["contentHash"].as_str().unwrap_or("").to_string();

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(json!({
            "documents": [
                {
                    "relativePath": "existing.md",
                    "content": "# Updated via push",
                    "title": "existing",
                    "baseContentHash": content_hash
                }
            ]
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "push update should return 200: {body}");
    assert_eq!(body["accepted"].as_i64().unwrap_or(0), 1, "update should be accepted");
}

// 7. push_deleted_paths — save doc, push with deletedPaths=[{relativePath}], assert 200
#[tokio::test]
async fn push_deleted_paths() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    common::save_doc(app.clone(), &token, &ws_id, "to-delete.md", "# Delete me").await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(json!({
            "documents": [],
            "deletedPaths": [{ "relativePath": "to-delete.md" }]
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "push with deletedPaths should return 200: {body}");
    assert_eq!(body["workspaceId"].as_str().unwrap(), ws_id);
}

// 8. push_unauthorized — push without token, assert 401
#[tokio::test]
async fn push_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        None,
        Some(json!({ "documents": [] })),
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

// 9. pull_unauthorized — pull without token, assert 401
#[tokio::test]
async fn pull_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/pull"),
        None,
        Some(json!({ "sinceClock": 0 })),
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

// 10. sync_legacy_creates_workspace — POST /api/sync/workspace, assert 200, documentCount matches
#[tokio::test]
async fn sync_legacy_creates_workspace() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_name = common::wname();

    let (status, body) = common::req(
        app,
        "POST",
        "/api/sync/workspace",
        Some(&token),
        Some(json!({
            "workspaceName": ws_name,
            "documents": [
                { "relativePath": "doc1.md", "title": "Doc 1", "status": "active", "content": "# Doc 1" },
                { "relativePath": "doc2.md", "title": "Doc 2", "status": "active", "content": "# Doc 2" }
            ]
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "legacy sync should return 200: {body}");
    assert_eq!(body["workspaceName"].as_str().unwrap(), ws_name);
    assert_eq!(body["documentCount"].as_i64().unwrap_or(0), 2, "documentCount should match uploaded docs");
    assert!(body["workspaceId"].as_str().is_some(), "workspaceId should be present");
}

// 11. sync_legacy_replaces_documents — sync workspace twice, second call replaces all docs
#[tokio::test]
async fn sync_legacy_replaces_documents() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_name = common::wname();

    // First sync: 2 docs
    let (status, _body) = common::req(
        app.clone(),
        "POST",
        "/api/sync/workspace",
        Some(&token),
        Some(json!({
            "workspaceName": ws_name,
            "documents": [
                { "relativePath": "a.md", "title": "A", "status": "active", "content": "# A" },
                { "relativePath": "b.md", "title": "B", "status": "active", "content": "# B" }
            ]
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Second sync: only 1 doc — replaces all
    let (status, body) = common::req(
        app,
        "POST",
        "/api/sync/workspace",
        Some(&token),
        Some(json!({
            "workspaceName": ws_name,
            "documents": [
                { "relativePath": "c.md", "title": "C", "status": "active", "content": "# C" }
            ]
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "second legacy sync should return 200: {body}");
    assert_eq!(
        body["documentCount"].as_i64().unwrap_or(0),
        1,
        "second sync should replace all; documentCount should be 1"
    );
}

// 12. sync_legacy_unauthorized — POST /api/sync/workspace without token, assert 401
#[tokio::test]
async fn sync_legacy_unauthorized() {
    let (app, _pool) = common::setup().await;

    let (status, _body) = common::req(
        app,
        "POST",
        "/api/sync/workspace",
        None,
        Some(json!({
            "workspaceName": common::wname(),
            "documents": []
        })),
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

// 13. push_empty_trash_operation — push with trashOperations=[{ "type": "empty_trash" }], assert 200
#[tokio::test]
async fn push_empty_trash_operation() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(json!({
            "documents": [],
            "trashOperations": [{ "type": "empty_trash" }]
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "push with empty_trash operation should return 200: {body}");
    assert_eq!(body["workspaceId"].as_str().unwrap(), ws_id);
}
