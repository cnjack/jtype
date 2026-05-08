mod common;
use axum::http::StatusCode;
use serde_json::json;

#[tokio::test]
async fn folder_api_creates_and_lists_empty_folder() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/folders"),
        Some(&token),
        Some(json!({ "relativePath": "projects/ideas" })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "create folder failed: {body}");
    assert_eq!(body["relativePath"].as_str(), Some("projects/ideas"));
    assert!(body["updatedClock"].as_i64().unwrap_or(0) > 0);

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/folders"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let folders = body.as_array().expect("folders should be an array");
    assert!(folders
        .iter()
        .any(|f| f["relativePath"].as_str() == Some("projects")));
    assert!(folders
        .iter()
        .any(|f| f["relativePath"].as_str() == Some("projects/ideas")));
}

#[tokio::test]
async fn folder_api_rejects_reserved_paths() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/folders"),
        Some(&token),
        Some(json!({ "relativePath": ".jtype/cache" })),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn sync_push_and_pull_include_empty_folders() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(json!({
            "folders": [{ "relativePath": "empty" }],
            "documents": []
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "sync push failed: {body}");
    assert!(body["folders"]
        .as_array()
        .unwrap()
        .iter()
        .any(|f| f["relativePath"].as_str() == Some("empty")));

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/pull"),
        Some(&token),
        Some(json!({ "sinceClock": 0 })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(body["folders"]
        .as_array()
        .unwrap()
        .iter()
        .any(|f| f["relativePath"].as_str() == Some("empty")));
    assert!(body["documents"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn sync_pull_returns_deleted_folders_after_cursor() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, created) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/folders"),
        Some(&token),
        Some(json!({ "relativePath": "archive" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let cursor = created["updatedClock"].as_i64().unwrap();
    let folder_id = created["id"].as_str().unwrap();

    let (status, body) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}/folders/{folder_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT, "delete failed: {body}");

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/pull"),
        Some(&token),
        Some(json!({ "sinceClock": cursor })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(body["deletedFolders"]
        .as_array()
        .unwrap()
        .iter()
        .any(|f| f["relativePath"].as_str() == Some("archive")));
}
