mod common;
use axum::http::StatusCode;
use serde_json::json;

// 1. Create invite with no role — defaults to "editor"
#[tokio::test]
async fn create_invite_default_role() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites"),
        Some(&token),
        Some(json!({})),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["role"].as_str().unwrap(), "editor");
    assert!(!body["inviteToken"].as_str().unwrap_or("").is_empty());
    assert!(!body["inviteId"].as_str().unwrap_or("").is_empty());
    assert_eq!(body["workspaceId"].as_str().unwrap(), ws_id);
}

// 2. Create invite with role="viewer"
#[tokio::test]
async fn create_invite_with_role_viewer() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites"),
        Some(&token),
        Some(json!({ "role": "viewer" })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["role"].as_str().unwrap(), "viewer");
    assert!(!body["inviteToken"].as_str().unwrap_or("").is_empty());
}

// 3. Create invite with role="owner" — rejected with 400
#[tokio::test]
async fn create_invite_invalid_role_owner() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites"),
        Some(&token),
        Some(json!({ "role": "owner" })),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// 4. Create invite without auth token — 401
#[tokio::test]
async fn create_invite_unauthorized() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites"),
        None,
        Some(json!({})),
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

// 5. Non-member tries to create invite — 403 or 404
#[tokio::test]
async fn create_invite_not_member() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites"),
        Some(&token2),
        Some(json!({})),
    )
    .await;

    assert!(
        status == StatusCode::FORBIDDEN || status == StatusCode::NOT_FOUND,
        "expected 403 or 404, got {status}"
    );
}

// 6. Revoke invite — 204
#[tokio::test]
async fn revoke_invite_success() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (create_status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites"),
        Some(&token),
        Some(json!({})),
    )
    .await;
    assert_eq!(create_status, StatusCode::OK);
    let invite_id = body["inviteId"].as_str().unwrap().to_string();

    let (revoke_status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites/{invite_id}/revoke"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(revoke_status, StatusCode::NO_CONTENT);
}

// 7. Revoke nonexistent invite — 404
#[tokio::test]
async fn revoke_invite_not_found() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let nonexistent_id = "00000000-0000-0000-0000-000000000000";
    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites/{nonexistent_id}/revoke"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

// 8. Accept invite — user2 accepts user1's invite, gets workspace summary
#[tokio::test]
async fn accept_invite_success() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let (create_status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites"),
        Some(&token1),
        Some(json!({ "role": "editor" })),
    )
    .await;
    assert_eq!(create_status, StatusCode::OK);
    let invite_token = body["inviteToken"].as_str().unwrap().to_string();

    let (accept_status, accept_body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspace-invites/{invite_token}/accept"),
        Some(&token2),
        None,
    )
    .await;

    assert_eq!(accept_status, StatusCode::OK);
    // Workspace summary should contain the workspace id
    assert_eq!(accept_body["id"].as_str().unwrap(), ws_id);
}

// 9. After accepting, the new member can GET the workspace
#[tokio::test]
async fn accept_invite_now_member() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let (_, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites"),
        Some(&token1),
        Some(json!({})),
    )
    .await;
    let invite_token = body["inviteToken"].as_str().unwrap().to_string();

    let (accept_status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspace-invites/{invite_token}/accept"),
        Some(&token2),
        None,
    )
    .await;
    assert_eq!(accept_status, StatusCode::OK);

    // user2 should now be able to access the workspace
    let (get_status, _) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}"),
        Some(&token2),
        None,
    )
    .await;
    assert_eq!(get_status, StatusCode::OK);
}

// 10. Accept with a random/invalid token — 404
#[tokio::test]
async fn accept_invite_invalid_token() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;

    let bogus_token = "this-token-does-not-exist-abc123";
    let (status, _body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspace-invites/{bogus_token}/accept"),
        Some(&token),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

// 11. Revoke then accept — 404
#[tokio::test]
async fn revoke_then_accept_fails() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let (create_status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites"),
        Some(&token1),
        Some(json!({})),
    )
    .await;
    assert_eq!(create_status, StatusCode::OK);
    let invite_id = body["inviteId"].as_str().unwrap().to_string();
    let invite_token = body["inviteToken"].as_str().unwrap().to_string();

    let (revoke_status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites/{invite_id}/revoke"),
        Some(&token1),
        None,
    )
    .await;
    assert_eq!(revoke_status, StatusCode::NO_CONTENT);

    let (accept_status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspace-invites/{invite_token}/accept"),
        Some(&token2),
        None,
    )
    .await;
    assert_eq!(accept_status, StatusCode::NOT_FOUND);
}
