mod common;
use axum::http::StatusCode;
use serde_json::json;

#[tokio::test]
async fn create_workspace_success() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let (status, body) = common::req(
        app,
        "POST",
        "/api/v1/workspaces",
        Some(&token),
        Some(json!({ "name": common::wname() })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(body["id"].as_str().is_some());
    assert!(body["name"].as_str().is_some());
    assert_eq!(body["role"].as_str().unwrap(), "owner");
}

#[tokio::test]
async fn create_workspace_unauthenticated() {
    let (app, _pool) = common::setup().await;
    let (status, _body) = common::req(
        app,
        "POST",
        "/api/v1/workspaces",
        None,
        Some(json!({ "name": common::wname() })),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn create_workspace_empty_name() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let (status, _body) = common::req(
        app,
        "POST",
        "/api/v1/workspaces",
        Some(&token),
        Some(json!({ "name": "   " })),
    )
    .await;
    assert!(
        status == StatusCode::BAD_REQUEST || status == StatusCode::UNPROCESSABLE_ENTITY,
        "expected 400 or 422, got {status}"
    );
}

#[tokio::test]
async fn list_workspaces_empty() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let (status, body) = common::req(app, "GET", "/api/v1/workspaces", Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);
    assert!(
        body["workspaces"].as_array().is_some(),
        "expected workspaces array"
    );
    // A freshly registered user has no workspaces
    assert_eq!(body["workspaces"].as_array().unwrap().len(), 0);
}

#[tokio::test]
async fn list_workspaces_shows_owned() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_name = common::wname();
    let ws_id = common::create_workspace(app.clone(), &token, &ws_name).await;
    let (status, body) = common::req(app, "GET", "/api/v1/workspaces", Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);
    let workspaces = body["workspaces"].as_array().unwrap();
    let found = workspaces.iter().any(|w| w["id"].as_str() == Some(&ws_id));
    assert!(found, "created workspace should appear in list");
}

#[tokio::test]
async fn list_workspaces_unauthenticated() {
    let (app, _pool) = common::setup().await;
    let (status, _body) = common::req(app, "GET", "/api/v1/workspaces", None, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn get_workspace_success() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let uri = format!("/api/v1/workspaces/{ws_id}");
    let (status, body) = common::req(app, "GET", &uri, Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["id"].as_str().unwrap(), ws_id);
}

#[tokio::test]
async fn get_workspace_not_found() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let (status, _body) = common::req(
        app,
        "GET",
        "/api/v1/workspaces/nonexistent-workspace-id",
        Some(&token),
        None,
    )
    .await;
    assert!(
        status == StatusCode::NOT_FOUND || status == StatusCode::FORBIDDEN,
        "expected 404 or 403, got {status}"
    );
}

#[tokio::test]
async fn update_workspace_name() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let new_name = common::wname();
    let uri = format!("/api/v1/workspaces/{ws_id}");
    let (status, body) = common::req(
        app,
        "PUT",
        &uri,
        Some(&token),
        Some(json!({ "name": new_name })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["name"].as_str().unwrap(), new_name);
}

#[tokio::test]
async fn update_workspace_publish_title() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let pub_title = "My Published Site";
    let uri = format!("/api/v1/workspaces/{ws_id}");
    let (status, body) = common::req(
        app,
        "PUT",
        &uri,
        Some(&token),
        Some(json!({ "publishTitle": pub_title })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["publishTitle"].as_str().unwrap(), pub_title);
}

#[tokio::test]
async fn update_workspace_not_owner() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;
    let uri = format!("/api/v1/workspaces/{ws_id}");
    let (status, _body) = common::req(
        app,
        "PUT",
        &uri,
        Some(&token2),
        Some(json!({ "name": common::wname() })),
    )
    .await;
    assert!(
        status == StatusCode::FORBIDDEN || status == StatusCode::NOT_FOUND,
        "expected 403 or 404, got {status}"
    );
}

#[tokio::test]
async fn get_workspace_manifest_empty() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let uri = format!("/api/v1/workspaces/{ws_id}/manifest");
    let (status, body) = common::req(app, "GET", &uri, Some(&token), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["workspaceId"].as_str().unwrap(), ws_id);
    let docs = body["documents"]
        .as_array()
        .expect("documents should be an array");
    assert_eq!(docs.len(), 0);
}

#[tokio::test]
async fn get_workspace_manifest_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let uri = format!("/api/v1/workspaces/{ws_id}/manifest");
    let (status, _body) = common::req(app, "GET", &uri, None, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}
