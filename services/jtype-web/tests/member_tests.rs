mod common;

use axum::http::StatusCode;
use serde_json::json;

// ── Local helpers ─────────────────────────────────────────────────────────────

/// GET /api/me/profile and return the user's id field.
async fn get_user_id(app: axum::Router, token: &str) -> String {
    let (_, body) = common::req(app, "GET", "/api/me/profile", Some(token), None).await;
    body["id"].as_str().unwrap().to_string()
}

/// Create an invite with a specific role, have user2 accept it.
/// Returns user2's user_id.
async fn invite_and_accept(
    app: axum::Router,
    ws_id: &str,
    owner_token: &str,
    member_token: &str,
    role: &str,
) -> String {
    let (status, body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites"),
        Some(owner_token),
        Some(json!({ "role": role })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "invite creation failed: {body}");
    let invite_token = body["inviteToken"].as_str().unwrap().to_string();

    let (accept_status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspace-invites/{invite_token}/accept"),
        Some(member_token),
        None,
    )
    .await;
    assert_eq!(accept_status, StatusCode::OK, "invite accept failed");

    get_user_id(app, member_token).await
}

// ══════════════════════════════════════════════════════════════════════════════
// LIST MEMBERS
// ══════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn list_members_returns_active_members() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;

    let (status, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/members"),
        Some(&token1),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let members = body.as_array().expect("expected members array");
    assert_eq!(members.len(), 2);
    // Owner should be present
    let has_owner = members.iter().any(|m| m["role"].as_str() == Some("owner"));
    let has_editor = members.iter().any(|m| m["role"].as_str() == Some("editor"));
    assert!(has_owner, "should have owner in list");
    assert!(has_editor, "should have editor in list");
}

#[tokio::test]
async fn list_members_requires_membership() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token3, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let (status, _) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/members"),
        Some(&token3),
        None,
    )
    .await;

    assert!(
        status == StatusCode::FORBIDDEN || status == StatusCode::NOT_FOUND,
        "expected 403 or 404, got {status}"
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// REMOVE MEMBER
// ══════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn owner_can_remove_editor() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let user2_id = invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;

    let (status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/members/{user2_id}/remove"),
        Some(&token1),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // Verify user2 is no longer in member list
    let (_, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/members"),
        Some(&token1),
        None,
    )
    .await;
    let members = body.as_array().unwrap();
    let has_user2 = members.iter().any(|m| m["userId"].as_str() == Some(&user2_id));
    assert!(!has_user2, "removed user should not appear in member list");
}

#[tokio::test]
async fn admin_cannot_remove_admin() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token3, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    invite_and_accept(app.clone(), &ws_id, &token1, &token2, "admin").await;
    let user3_id = invite_and_accept(app.clone(), &ws_id, &token1, &token3, "admin").await;

    // user2 (admin) tries to remove user3 (admin)
    let (status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/members/{user3_id}/remove"),
        Some(&token2),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn cannot_remove_owner() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;
    let user1_id = get_user_id(app.clone(), &token1).await;

    invite_and_accept(app.clone(), &ws_id, &token1, &token2, "admin").await;

    // user2 (admin) tries to remove user1 (owner)
    let (status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/members/{user1_id}/remove"),
        Some(&token2),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn remove_already_removed_is_idempotent() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let user2_id = invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;

    // First removal
    let (status1, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/members/{user2_id}/remove"),
        Some(&token1),
        None,
    )
    .await;
    assert_eq!(status1, StatusCode::NO_CONTENT);

    // Second removal — should still be 204 (idempotent)
    let (status2, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/members/{user2_id}/remove"),
        Some(&token1),
        None,
    )
    .await;
    assert_eq!(status2, StatusCode::NO_CONTENT);
}

#[tokio::test]
async fn editor_cannot_remove_members() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token3, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;
    let user3_id = invite_and_accept(app.clone(), &ws_id, &token1, &token3, "editor").await;

    // user2 (editor) tries to remove user3 (editor)
    let (status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/members/{user3_id}/remove"),
        Some(&token2),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
}

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE WORKSPACE
// ══════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn member_can_leave_workspace() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;

    let (status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/leave"),
        Some(&token2),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // user2 should no longer be able to access the workspace
    let (get_status, _) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}"),
        Some(&token2),
        None,
    )
    .await;
    assert!(
        get_status == StatusCode::FORBIDDEN || get_status == StatusCode::NOT_FOUND,
        "expected 403 or 404 after leaving, got {get_status}"
    );
}

#[tokio::test]
async fn owner_cannot_leave() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let (status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/leave"),
        Some(&token1),
        None,
    )
    .await;

    assert!(
        status == StatusCode::FORBIDDEN || status == StatusCode::BAD_REQUEST,
        "owner should not be able to leave, got {status}"
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE ROLE
// ══════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn owner_can_change_role() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let user2_id = invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;

    let (status, _) = common::req(
        app.clone(),
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/members/{user2_id}"),
        Some(&token1),
        Some(json!({ "role": "admin" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Verify role changed in member list
    let (_, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/members"),
        Some(&token1),
        None,
    )
    .await;
    let members = body.as_array().unwrap();
    let user2_member = members
        .iter()
        .find(|m| m["userId"].as_str() == Some(&user2_id))
        .expect("user2 should be in member list");
    assert_eq!(user2_member["role"].as_str().unwrap(), "admin");
}

#[tokio::test]
async fn non_owner_cannot_change_role() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token3, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    invite_and_accept(app.clone(), &ws_id, &token1, &token2, "admin").await;
    let user3_id = invite_and_accept(app.clone(), &ws_id, &token1, &token3, "editor").await;

    // user2 (admin) tries to change user3's role
    let (status, _) = common::req(
        app,
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/members/{user3_id}"),
        Some(&token2),
        Some(json!({ "role": "admin" })),
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn cannot_set_role_to_owner() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let user2_id = invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;

    let (status, _) = common::req(
        app,
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/members/{user2_id}"),
        Some(&token1),
        Some(json!({ "role": "owner" })),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// ══════════════════════════════════════════════════════════════════════════════
// TRANSFER OWNERSHIP
// ══════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn owner_can_transfer_ownership() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;
    let user1_id = get_user_id(app.clone(), &token1).await;
    let user2_id = invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;

    let (status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/transfer"),
        Some(&token1),
        Some(json!({ "new_owner_user_id": user2_id })),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // Verify: user2 is now owner, user1 is admin
    let (_, body) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/members"),
        Some(&token2),
        None,
    )
    .await;
    let members = body.as_array().unwrap();
    let user1_member = members
        .iter()
        .find(|m| m["userId"].as_str() == Some(&user1_id))
        .expect("user1 should still be a member");
    let user2_member = members
        .iter()
        .find(|m| m["userId"].as_str() == Some(&user2_id))
        .expect("user2 should still be a member");
    assert_eq!(user2_member["role"].as_str().unwrap(), "owner");
    assert_eq!(user1_member["role"].as_str().unwrap(), "admin");
}

#[tokio::test]
async fn non_owner_cannot_transfer() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token3, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    invite_and_accept(app.clone(), &ws_id, &token1, &token2, "admin").await;
    let user3_id = invite_and_accept(app.clone(), &ws_id, &token1, &token3, "editor").await;

    // user2 (admin) tries to transfer ownership to user3
    let (status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/transfer"),
        Some(&token2),
        Some(json!({ "new_owner_user_id": user3_id })),
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
}

// ══════════════════════════════════════════════════════════════════════════════
// DELETE WORKSPACE
// ══════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn owner_can_delete_workspace() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (status, _) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // Workspace should no longer be accessible
    let (get_status, _) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(get_status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn non_owner_cannot_delete_workspace() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    invite_and_accept(app.clone(), &ws_id, &token1, &token2, "admin").await;

    let (status, _) = common::req(
        app,
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}"),
        Some(&token2),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn delete_workspace_cascades() {
    let (app, _pool) = common::setup().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    // Add a member
    invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;

    // Save a document
    common::req(
        app.clone(),
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/documents"),
        Some(&token1),
        Some(json!({
            "relativePath": "test-doc.md",
            "content": "# Hello"
        })),
    )
    .await;

    // Delete the workspace
    let (status, _) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}"),
        Some(&token1),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // Workspace gone
    let (ws_status, _) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws_id}"),
        Some(&token1),
        None,
    )
    .await;
    assert_eq!(ws_status, StatusCode::NOT_FOUND);

    // Members endpoint gone
    let (members_status, _) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws_id}/members"),
        Some(&token1),
        None,
    )
    .await;
    assert_eq!(members_status, StatusCode::NOT_FOUND);
}
