//! Integration tests for card comments: threading (one-level replies), editing,
//! emoji reactions (toggle), and thread resolve/unresolve.

mod common;
use axum::http::StatusCode;
use serde_json::json;

/// Save a card doc and return its document id.
async fn make_doc(app: axum::Router, token: &str, ws_id: &str, path: &str) -> String {
    let (status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/save"),
        Some(token),
        Some(json!({ "relativePath": path, "content": "---\ntitle: Card\nboard: b\n---\nbody", "title": "Card" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
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

async fn add_comment(
    app: axum::Router,
    token: &str,
    ws_id: &str,
    doc_id: &str,
    body: &str,
    parent_id: Option<&str>,
) -> serde_json::Value {
    let (status, out) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/documents/{doc_id}/comments"),
        Some(token),
        Some(json!({ "body": body, "parentId": parent_id })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "add_comment failed: {out}");
    out
}

#[tokio::test]
async fn comment_reply_threads_one_level() {
    let (app, _pool) = common::setup().await;
    let user = common::uid();
    let (token, _) = common::register_user(app.clone(), &user).await;
    let ws = common::create_workspace(app.clone(), &token, &common::uid()).await;
    let doc = make_doc(app.clone(), &token, &ws, "b/thread-card.md").await;

    let root = add_comment(app.clone(), &token, &ws, &doc, "root", None).await;
    let root_id = root["id"].as_str().unwrap();
    assert!(root["parentId"].is_null());

    // Reply to the root.
    let reply = add_comment(app.clone(), &token, &ws, &doc, "reply", Some(root_id)).await;
    assert_eq!(reply["parentId"].as_str().unwrap(), root_id);

    // Replying to a REPLY re-parents to the root (one-level threading).
    let reply_id = reply["id"].as_str().unwrap();
    let nested = add_comment(app.clone(), &token, &ws, &doc, "nested", Some(reply_id)).await;
    assert_eq!(nested["parentId"].as_str().unwrap(), root_id);

    // List returns all three, replies carrying the root's id.
    let (status, list) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws}/documents/{doc}/comments"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(list.as_array().unwrap().len(), 3);

    // Deleting the root cascades to its replies.
    let (status, _) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{ws}/comments/{root_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);
    let (_, list) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{ws}/documents/{doc}/comments"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(list.as_array().unwrap().len(), 0);
}

#[tokio::test]
async fn comment_edit_only_by_author() {
    let (app, _pool) = common::setup().await;
    let author = common::uid();
    let (author_token, _) = common::register_user(app.clone(), &author).await;
    let ws = common::create_workspace(app.clone(), &author_token, &common::uid()).await;
    let doc = make_doc(app.clone(), &author_token, &ws, "b/edit-card.md").await;

    let comment = add_comment(app.clone(), &author_token, &ws, &doc, "before", None).await;
    let comment_id = comment["id"].as_str().unwrap();

    // Author edits.
    let (status, updated) = common::req(
        app.clone(),
        "PATCH",
        &format!("/api/v1/workspaces/{ws}/comments/{comment_id}"),
        Some(&author_token),
        Some(json!({ "body": "after" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["body"].as_str().unwrap(), "after");

    // Another editor member cannot edit someone else's comment.
    let other = common::uid();
    let (other_token, _) = common::register_user(app.clone(), &other).await;
    let (status, invite) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws}/invites"),
        Some(&author_token),
        Some(json!({ "role": "editor" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "invite failed: {invite}");
    let invite_token = invite["inviteToken"].as_str().unwrap();
    let (status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspace-invites/{invite_token}/accept"),
        Some(&other_token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let (status, _) = common::req(
        app,
        "PATCH",
        &format!("/api/v1/workspaces/{ws}/comments/{comment_id}"),
        Some(&other_token),
        Some(json!({ "body": "hijack" })),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn comment_reaction_toggles() {
    let (app, _pool) = common::setup().await;
    let user = common::uid();
    let (token, _) = common::register_user(app.clone(), &user).await;
    let ws = common::create_workspace(app.clone(), &token, &common::uid()).await;
    let doc = make_doc(app.clone(), &token, &ws, "b/react-card.md").await;

    let comment = add_comment(app.clone(), &token, &ws, &doc, "react to me", None).await;
    let comment_id = comment["id"].as_str().unwrap();

    // First toggle adds.
    let (status, updated) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws}/comments/{comment_id}/reactions"),
        Some(&token),
        Some(json!({ "emoji": "👍" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let reactions = updated["reactions"].as_array().unwrap();
    assert_eq!(reactions.len(), 1);
    assert_eq!(reactions[0]["emoji"].as_str().unwrap(), "👍");
    assert_eq!(reactions[0]["count"].as_i64().unwrap(), 1);
    assert!(reactions[0]["mine"].as_bool().unwrap());

    // Second toggle removes.
    let (status, updated) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws}/comments/{comment_id}/reactions"),
        Some(&token),
        Some(json!({ "emoji": "👍" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["reactions"].as_array().unwrap().len(), 0);
}

#[tokio::test]
async fn comment_resolve_targets_thread_root() {
    let (app, _pool) = common::setup().await;
    let user = common::uid();
    let (token, _) = common::register_user(app.clone(), &user).await;
    let ws = common::create_workspace(app.clone(), &token, &common::uid()).await;
    let doc = make_doc(app.clone(), &token, &ws, "b/resolve-card.md").await;

    let root = add_comment(app.clone(), &token, &ws, &doc, "root", None).await;
    let root_id = root["id"].as_str().unwrap();
    let reply = add_comment(app.clone(), &token, &ws, &doc, "reply", Some(root_id)).await;
    let reply_id = reply["id"].as_str().unwrap();

    // Resolving via the REPLY id resolves the root.
    let (status, resolved) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws}/comments/{reply_id}/resolve"),
        Some(&token),
        Some(json!({ "resolved": true })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(resolved["id"].as_str().unwrap(), root_id);
    assert!(!resolved["resolvedAt"].is_null());

    // Unresolve.
    let (status, unresolved) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws}/comments/{root_id}/resolve"),
        Some(&token),
        Some(json!({ "resolved": false })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(unresolved["resolvedAt"].is_null());
}
