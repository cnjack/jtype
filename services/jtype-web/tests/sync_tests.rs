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
        body["documents"]
            .as_array()
            .map(|a| a.is_empty())
            .unwrap_or(false),
        "documents should be empty"
    );
    assert!(
        body["deletedPaths"]
            .as_array()
            .map(|a| a.is_empty())
            .unwrap_or(false),
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
    let docs = body["documents"]
        .as_array()
        .expect("documents should be an array");
    assert!(!docs.is_empty(), "should return at least one document");
    let found = docs
        .iter()
        .any(|d| d["relativePath"].as_str() == Some("hello.md"));
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
    let docs = body["documents"]
        .as_array()
        .expect("documents should be an array");
    let found = docs
        .iter()
        .any(|d| d["relativePath"].as_str() == Some("filter.md"));
    assert!(
        !found,
        "already-seen document should be filtered out by sinceClock"
    );
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
    let (app, pool) = common::setup().await;
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
                    "content": "---\ntitle: Pushed\nboard: sync-created\nstatus: todo\n---\n\n# Pushed",
                    "title": "pushed"
                }
            ]
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "push should return 200: {body}");
    assert_eq!(body["workspaceId"].as_str().unwrap(), ws_id);
    assert_eq!(
        body["accepted"].as_i64().unwrap_or(0),
        1,
        "one document should be accepted"
    );
    let docs = body["documents"]
        .as_array()
        .expect("documents should be an array");
    assert!(!docs.is_empty(), "documents array should not be empty");
    let found = docs
        .iter()
        .any(|d| d["relativePath"].as_str() == Some("pushed.md"));
    assert!(found, "pushed document should appear in response");
    let document_id = docs[0]["documentId"].as_str().unwrap();
    let projected_board: String = sqlx::query_scalar(
        "SELECT CAST(board_ref AS CHAR CHARACTER SET utf8mb4) FROM board_document_memberships WHERE workspace_id = ? AND document_id = ?",
    )
    .bind(&ws_id)
    .bind(document_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(projected_board, "sync-created");
}

// 6. push_updates_existing — save doc via PUT, push same path with new content, assert accepted=1
#[tokio::test]
async fn push_updates_existing() {
    let (app, pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let saved = common::save_doc(
        app.clone(),
        &token,
        &ws_id,
        "existing.md",
        "---\ntitle: Existing\nboard: sync-old\nstatus: todo\n---\n\n# Original",
    )
    .await;
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
                    "content": "---\ntitle: Existing\nboard: sync-new\nstatus: todo\n---\n\n# Updated via push",
                    "title": "existing",
                    "baseContentHash": content_hash
                }
            ]
        })),
    )
    .await;

    assert_eq!(
        status,
        StatusCode::OK,
        "push update should return 200: {body}"
    );
    assert_eq!(
        body["accepted"].as_i64().unwrap_or(0),
        1,
        "update should be accepted"
    );
    let document_id = saved["documentId"].as_str().unwrap();
    let projected_board: String = sqlx::query_scalar(
        "SELECT CAST(board_ref AS CHAR CHARACTER SET utf8mb4) FROM board_document_memberships WHERE workspace_id = ? AND document_id = ?",
    )
    .bind(&ws_id)
    .bind(document_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(projected_board, "sync-new");
}

// 7. push_deleted_paths — save doc, push with deletedPaths=[{relativePath}], assert 200
#[tokio::test]
async fn push_deleted_paths() {
    let (app, pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let saved = common::save_doc(
        app.clone(),
        &token,
        &ws_id,
        "to-delete.md",
        "---\ntitle: Delete me\nboard: sync-board\nstatus: todo\n---\n\nDelete me",
    )
    .await;
    let document_id = saved["documentId"].as_str().unwrap().to_string();

    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(json!({
            "documents": [],
            "deletedPaths": [{ "relativePath": "to-delete.md" }]
        })),
    )
    .await;

    assert_eq!(
        status,
        StatusCode::OK,
        "push with deletedPaths should return 200: {body}"
    );
    assert_eq!(body["workspaceId"].as_str().unwrap(), ws_id);

    let (activity_status, activity) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents/{document_id}/activity"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(activity_status, StatusCode::OK, "{activity}");
    assert_eq!(activity["events"][0]["kind"], "card.deleted");
    assert_eq!(activity["events"][0]["client"]["kind"], "desktop");
    let membership_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM board_document_memberships WHERE workspace_id = ? AND document_id = ?",
    )
    .bind(&ws_id)
    .bind(&document_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(membership_count, 0);
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

// 10. push_empty_trash_operation — push with trashOperations=[{ "type": "empty_trash" }], assert 200
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

    assert_eq!(
        status,
        StatusCode::OK,
        "push with empty_trash operation should return 200: {body}"
    );
    assert_eq!(body["workspaceId"].as_str().unwrap(), ws_id);
}
