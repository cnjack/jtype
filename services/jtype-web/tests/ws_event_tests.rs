mod common;

use axum::http::StatusCode;
use serde_json::json;

// ── Local helpers ─────────────────────────────────────────────────────────────

/// GET /api/me/profile and return the user's id field.
async fn get_user_id(app: axum::Router, token: &str) -> String {
    let (_, body) = common::req(app, "GET", "/api/me/profile", Some(token), None).await;
    body["id"].as_str().unwrap().to_string()
}

/// Create an invite, have user2 accept it. Returns user2's user_id.
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

/// Drain all pending events from an mpsc receiver, return them as JSON values.
fn drain_events(
    rx: &mut tokio::sync::mpsc::Receiver<jtype_web::hub::WorkspaceEvent>,
) -> Vec<serde_json::Value> {
    let mut events = Vec::new();
    while let Ok(event) = rx.try_recv() {
        events.push(serde_json::to_value(&event).unwrap());
    }
    events
}

// ══════════════════════════════════════════════════════════════════════════════
// WORKSPACE EVENTS
// ══════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn update_workspace_publishes_workspace_updated() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (_sid, mut rx) = hub.subscribe_for_test(&ws_id).await;

    let (status, _) = common::req(
        app,
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}"),
        Some(&token),
        Some(json!({ "name": "Updated Name" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let events = drain_events(&mut rx);
    assert!(!events.is_empty(), "expected workspace:updated event");
    let ev = &events[0];
    assert_eq!(ev["type"], "workspace:updated");
    assert_eq!(ev["workspaceId"], ws_id);
    assert_eq!(ev["name"], "Updated Name");
}

#[tokio::test]
async fn delete_workspace_publishes_workspace_deleted() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (_sid, mut rx) = hub.subscribe_for_test(&ws_id).await;

    let (status, _) = common::req(
        app,
        "DELETE",
        &format!("/api/v1/workspaces/{ws_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    let events = drain_events(&mut rx);
    assert!(!events.is_empty(), "expected workspace:deleted event");
    let ev = &events[0];
    assert_eq!(ev["type"], "workspace:deleted");
    assert_eq!(ev["workspaceId"], ws_id);
}

// ══════════════════════════════════════════════════════════════════════════════
// MEMBER EVENTS
// ══════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn accept_invite_publishes_member_joined() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let (_sid, mut rx) = hub.subscribe_for_test(&ws_id).await;

    // Create invite
    let (_, invite_body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/invites"),
        Some(&token1),
        Some(json!({ "role": "editor" })),
    )
    .await;
    let invite_token = invite_body["inviteToken"].as_str().unwrap();

    // Accept invite
    let (status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspace-invites/{invite_token}/accept"),
        Some(&token2),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let events = drain_events(&mut rx);
    let joined_events: Vec<_> = events
        .iter()
        .filter(|e| e["type"] == "member:joined")
        .collect();
    assert_eq!(
        joined_events.len(),
        1,
        "expected exactly one member:joined event"
    );
    assert_eq!(joined_events[0]["role"], "editor");
}

#[tokio::test]
async fn remove_member_publishes_member_removed() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let member_user_id = invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;

    // Subscribe after join to avoid capturing the member:joined event
    let (_sid, mut rx) = hub.subscribe_for_test(&ws_id).await;

    let (status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/members/{member_user_id}/remove"),
        Some(&token1),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    let events = drain_events(&mut rx);
    let removed_events: Vec<_> = events
        .iter()
        .filter(|e| e["type"] == "member:removed")
        .collect();
    assert_eq!(
        removed_events.len(),
        1,
        "expected exactly one member:removed event"
    );
    assert_eq!(removed_events[0]["userId"], member_user_id);
}

#[tokio::test]
async fn leave_workspace_publishes_member_left() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;

    let (_sid, mut rx) = hub.subscribe_for_test(&ws_id).await;

    let (status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/leave"),
        Some(&token2),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    let events = drain_events(&mut rx);
    let left_events: Vec<_> = events
        .iter()
        .filter(|e| e["type"] == "member:left")
        .collect();
    assert_eq!(
        left_events.len(),
        1,
        "expected exactly one member:left event"
    );
}

#[tokio::test]
async fn update_member_role_publishes_role_changed() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let member_user_id = invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;

    let (_sid, mut rx) = hub.subscribe_for_test(&ws_id).await;

    let (status, _) = common::req(
        app,
        "PUT",
        &format!("/api/v1/workspaces/{ws_id}/members/{member_user_id}"),
        Some(&token1),
        Some(json!({ "role": "admin" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let events = drain_events(&mut rx);
    let role_events: Vec<_> = events
        .iter()
        .filter(|e| e["type"] == "member:role-changed")
        .collect();
    assert_eq!(
        role_events.len(),
        1,
        "expected exactly one member:role-changed event"
    );
    assert_eq!(role_events[0]["previousRole"], "editor");
    assert_eq!(role_events[0]["newRole"], "admin");
}

#[tokio::test]
async fn transfer_ownership_publishes_two_role_changed() {
    let (app, _pool, hub) = common::setup_with_hub().await;
    let (token1, _) = common::register_user(app.clone(), &common::uid()).await;
    let (token2, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token1, &common::wname()).await;

    let member_user_id = invite_and_accept(app.clone(), &ws_id, &token1, &token2, "editor").await;

    let (_sid, mut rx) = hub.subscribe_for_test(&ws_id).await;

    let (status, _) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/transfer"),
        Some(&token1),
        Some(json!({ "newOwnerUserId": member_user_id })),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    let events = drain_events(&mut rx);
    let role_events: Vec<_> = events
        .iter()
        .filter(|e| e["type"] == "member:role-changed")
        .collect();
    assert_eq!(
        role_events.len(),
        2,
        "expected two member:role-changed events (old owner + new owner)"
    );

    // One should be: owner → admin (old owner)
    let demote = role_events
        .iter()
        .find(|e| e["previousRole"] == "owner" && e["newRole"] == "admin");
    assert!(demote.is_some(), "expected owner→admin demotion event");

    // One should be: editor → owner (new owner)
    let promote = role_events.iter().find(|e| e["newRole"] == "owner");
    assert!(promote.is_some(), "expected promotion to owner event");
}
