mod common;
use axum::http::StatusCode;
use serde_json::json;

// ── Helper ────────────────────────────────────────────────────────────────────

async fn save_document(
    app: axum::Router,
    token: &str,
    ws_id: &str,
    path: &str,
    content: &str,
) -> serde_json::Value {
    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/save"),
        Some(token),
        Some(json!({
            "relativePath": path,
            "content": content,
            "title": path.trim_end_matches(".md"),
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "save_document failed: {body}");
    body
}

/// Save a document at `path`, delete it (moves to trash), and return the trash_id.
async fn put_in_trash(app: axum::Router, token: &str, ws_id: &str, path: &str) -> String {
    save_document(app.clone(), token, ws_id, path, "# Trash me").await;

    // Resolve the document_id by listing documents.
    let (_, list) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents"),
        Some(token),
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

    // Delete the document — this moves it to trash.
    common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}"),
        Some(token),
        None,
    )
    .await;

    // Resolve the trash_id from the trash list.
    let (_, trash_list) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/trash"),
        Some(token),
        None,
    )
    .await;
    trash_list
        .as_array()
        .unwrap()
        .iter()
        .find(|t| t["relativePath"].as_str() == Some(path))
        .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string()
}

// ── List trash ────────────────────────────────────────────────────────────────

// 1. GET trash on a fresh workspace returns an empty array.
#[tokio::test]
async fn list_trash_empty() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/trash"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.as_array().unwrap().is_empty());
}

// 2. After deleting a document it appears in the trash list.
#[tokio::test]
async fn list_trash_after_delete() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    put_in_trash(app.clone(), &token, &ws_id, "to-trash.md").await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/trash"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let items = body.as_array().unwrap();
    assert!(!items.is_empty());
    assert!(items
        .iter()
        .any(|t| t["relativePath"].as_str() == Some("to-trash.md")));
}

// 3. GET trash without a token returns 401.
#[tokio::test]
async fn list_trash_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/trash"),
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

// ── Restore ───────────────────────────────────────────────────────────────────

// 4. POST restore returns 200 and the restored CloudDocument.
#[tokio::test]
async fn restore_from_trash() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let trash_id = put_in_trash(app.clone(), &token, &ws_id, "restore-me.md").await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/trash/{trash_id}/restore"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK, "restore response: {body}");
    // The response must be a CloudDocument with the restored path and a sync clock.
    let path = body["relativePath"].as_str().unwrap_or("");
    assert!(
        path == "restore-me.md" || path.contains("restore-me"),
        "unexpected relativePath: {path}"
    );
    assert!(body["updatedClock"].as_i64().unwrap_or(0) > 0);
}

// 5. After a restore the document re-appears in the active document list.
#[tokio::test]
async fn restore_creates_document() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let trash_id = put_in_trash(app.clone(), &token, &ws_id, "back-again.md").await;

    common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/trash/{trash_id}/restore"),
        Some(&token),
        None,
    )
    .await;

    let (status, list) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/documents"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let docs = list.as_array().unwrap();
    assert!(
        docs.iter().any(|d| d["relativePath"]
            .as_str()
            .unwrap_or("")
            .contains("back-again")),
        "restored document not found in doc list: {list}"
    );
}

// 6. POST restore for an unknown trash_id returns 404.
#[tokio::test]
async fn restore_not_found() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/trash/nonexistent-trash-id/restore"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

// 7. POST restore without a token returns 401.
#[tokio::test]
async fn restore_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let trash_id = put_in_trash(app.clone(), &token, &ws_id, "unauth-restore.md").await;

    let (status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/trash/{trash_id}/restore"),
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

// ── Permanent delete (single item) ───────────────────────────────────────────

// 8. DELETE /trash/:trash_id returns 204.
#[tokio::test]
async fn permanent_delete_item() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let trash_id = put_in_trash(app.clone(), &token, &ws_id, "perm-delete.md").await;

    let (status, _) = common::req(
        app,
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/trash/{trash_id}"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::NO_CONTENT);
}

// 9. After permanent delete the item is gone from the trash list.
#[tokio::test]
async fn permanent_delete_removes_from_trash() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let trash_id = put_in_trash(app.clone(), &token, &ws_id, "gone-forever.md").await;

    common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/trash/{trash_id}"),
        Some(&token),
        None,
    )
    .await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/trash"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let items = body.as_array().unwrap();
    assert!(
        !items.iter().any(|t| t["id"].as_str() == Some(&trash_id)),
        "permanently deleted item still present in trash"
    );
}

#[tokio::test]
async fn permanent_delete_does_not_make_later_document_clock_go_backwards() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let trash_id = put_in_trash(app.clone(), &token, &ws_id, "clock-source.md").await;

    common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/trash/{trash_id}"),
        Some(&token),
        None,
    )
    .await;

    let (status, pull_body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/pull"),
        Some(&token),
        Some(json!({ "sinceClock": 0, "sinceTrashEventClock": 0 })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "pull response: {pull_body}");
    let trash_cursor = pull_body["trash"]["trashCursor"].as_i64().unwrap_or(0);
    assert!(trash_cursor > 0, "trash cursor should advance: {pull_body}");

    let saved = save_document(app, &token, &ws_id, "after-delete.md", "# Later").await;
    let next_document_clock = saved["updatedClock"].as_i64().unwrap_or(0);

    assert!(
        next_document_clock > trash_cursor,
        "document clock should stay ahead of trash cursor: document={next_document_clock}, trash={trash_cursor}"
    );
}

// 10. DELETE /trash/:trash_id for a non-existent id returns 404.
#[tokio::test]
async fn permanent_delete_not_found() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _) = common::req(
        app,
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/trash/nonexistent-item-id"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ── Empty trash ───────────────────────────────────────────────────────────────

// 11. DELETE /trash (empty all) returns 204.
#[tokio::test]
async fn empty_trash() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    put_in_trash(app.clone(), &token, &ws_id, "doc-one.md").await;
    put_in_trash(app.clone(), &token, &ws_id, "doc-two.md").await;

    let (status, _) = common::req(
        app,
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/trash"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::NO_CONTENT);
}

// 12. After emptying trash the list is empty.
#[tokio::test]
async fn empty_trash_empties_all() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    put_in_trash(app.clone(), &token, &ws_id, "alpha.md").await;
    put_in_trash(app.clone(), &token, &ws_id, "beta.md").await;

    common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/trash"),
        Some(&token),
        None,
    )
    .await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/trash"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(
        body.as_array().unwrap().is_empty(),
        "trash should be empty after empty-trash, got: {body}"
    );
}

// 13. DELETE /trash without a token returns 401.
#[tokio::test]
async fn empty_trash_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _) = common::req(
        app,
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/trash"),
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}
