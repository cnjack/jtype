mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use serde_json::{json, Value};
use sqlx::Row;
use tower::ServiceExt;

fn card(board: &str, status: &str, body: &str) -> String {
    format!(
        "---\ntitle: Activity Card\nboard: {board}\nstatus: {status}\npriority: high\ntags: api, audit\n---\n\n{body}\n"
    )
}

async fn activity(
    app: axum::Router,
    token: &str,
    workspace_id: &str,
    document_id: &str,
    query: &str,
) -> (StatusCode, Value) {
    common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{workspace_id}/documents/{document_id}/activity{query}"),
        Some(token),
        None,
    )
    .await
}

async fn req_with_client(
    app: axum::Router,
    uri: &str,
    token: &str,
    client: &str,
    body: Value,
) -> (StatusCode, Value) {
    let request = Request::builder()
        .method("POST")
        .uri(uri)
        .header("content-type", "application/json")
        .header("authorization", format!("Bearer {token}"))
        .header("x-client-type", client)
        .body(Body::from(serde_json::to_vec(&body).unwrap()))
        .unwrap();
    let response = app.oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), 10 * 1024 * 1024)
        .await
        .unwrap();
    let body = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, body)
}

#[tokio::test]
async fn card_activity_has_server_actor_field_diff_and_survives_delete() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    sqlx::query(
        "UPDATE sessions s JOIN users u ON u.id = s.user_id SET s.label = ? WHERE u.username = ?",
    )
    .bind("browser-session")
    .bind(&username)
    .execute(&pool)
    .await
    .unwrap();

    let created = common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        "cards/activity.md",
        &card("activity-board", "todo", "before body"),
    )
    .await;
    let document_id = created["documentId"].as_str().unwrap();
    let created_hash = created["contentHash"].as_str().unwrap().to_string();

    let updated_content = card("activity-board", "done", "after body");
    let (status, updated) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/documents/save"),
        Some(&token),
        Some(json!({
            "documentId": document_id,
            "relativePath": "cards/activity.md",
            "content": updated_content,
            "baseContentHash": created_hash,
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{updated}");

    // An unchanged save and a rejected stale save must not append Activity.
    common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        "cards/activity.md",
        &updated_content,
    )
    .await;
    let (conflict_status, conflict) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/documents/save"),
        Some(&token),
        Some(json!({
            "documentId": document_id,
            "relativePath": "cards/activity.md",
            "content": card("activity-board", "doing", "stale write"),
            "baseContentHash": created_hash,
        })),
    )
    .await;
    assert_eq!(conflict_status, StatusCode::CONFLICT, "{conflict}");
    let conflict_id = conflict["conflictId"].as_str().unwrap();
    let (invalid_status, invalid) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/conflicts/{conflict_id}/resolve"),
        Some(&token),
        Some(json!({ "resolution": "not_a_resolution" })),
    )
    .await;
    assert_eq!(invalid_status, StatusCode::BAD_REQUEST, "{invalid}");
    let (resolve_status, resolved) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/conflicts/{conflict_id}/resolve"),
        Some(&token),
        Some(json!({ "resolution": "accept_cloud" })),
    )
    .await;
    assert_eq!(resolve_status, StatusCode::OK, "{resolved}");
    let (repeat_status, repeat) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/conflicts/{conflict_id}/resolve"),
        Some(&token),
        Some(json!({ "resolution": "accept_cloud" })),
    )
    .await;
    assert_eq!(repeat_status, StatusCode::NOT_FOUND, "{repeat}");

    let (status, before_delete) = activity(
        app.clone(),
        &token,
        &workspace_id,
        document_id,
        "?limit=100",
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{before_delete}");
    let events = before_delete["events"].as_array().unwrap();
    assert_eq!(events.len(), 2, "{before_delete}");
    assert_eq!(events[0]["kind"], "card.updated");
    assert_eq!(events[0]["actor"]["kind"], "user");
    assert_eq!(events[0]["actor"]["label"], username);
    assert_eq!(events[0]["client"]["kind"], "web");
    assert_eq!(events[0]["token"]["label"], "browser-session");
    assert!(events[0]["id"].as_str().unwrap().len() == 36);
    let changes = events[0]["changes"].as_array().unwrap();
    assert!(changes.iter().any(|change| {
        change["field"] == "status" && change["before"] == "todo" && change["after"] == "done"
    }));
    assert!(changes
        .iter()
        .any(|change| change["field"] == "body" && change["after"] == true));
    let encoded = events[0].to_string().to_ascii_lowercase();
    assert!(!encoded.contains("before body"));
    assert!(!encoded.contains("after body"));
    assert!(!encoded.contains("token_hash"));
    assert!(!encoded.contains("fingerprint"));

    let (delete_status, delete_body) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{workspace_id}/documents/{document_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(delete_status, StatusCode::NO_CONTENT, "{delete_body}");

    let (status, after_delete) =
        activity(app, &token, &workspace_id, document_id, "?limit=1").await;
    assert_eq!(status, StatusCode::OK, "{after_delete}");
    assert_eq!(after_delete["events"][0]["kind"], "card.deleted");
    assert_eq!(after_delete["hasMore"], true);
    assert!(after_delete["nextSequence"].as_i64().is_some());
}

#[tokio::test]
async fn comment_activity_records_new_member_mentions_and_thread_state() {
    let (app, _pool) = common::setup().await;
    let owner = common::uid();
    let member = common::uid();
    let (owner_token, _) = common::register_user(app.clone(), &owner).await;
    let (member_token, _) = common::register_user(app.clone(), &member).await;
    let workspace_id = common::create_workspace(app.clone(), &owner_token, &common::wname()).await;

    let (_, invite) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/invites"),
        Some(&owner_token),
        Some(json!({ "role": "editor" })),
    )
    .await;
    let invite_token = invite["inviteToken"].as_str().unwrap();
    let (accept_status, accept_body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspace-invites/{invite_token}/accept"),
        Some(&member_token),
        None,
    )
    .await;
    assert_eq!(accept_status, StatusCode::OK, "{accept_body}");

    let document = common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        "cards/comments.md",
        &card("comment-board", "todo", "card"),
    )
    .await;
    let document_id = document["documentId"].as_str().unwrap();

    common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        "cards/comments.md",
        &card(
            "comment-board",
            "todo",
            &format!("card asks @{member} to review"),
        ),
    )
    .await;
    // Editing around an existing mention must not emit it a second time.
    common::save_doc(
        app.clone(),
        &owner_token,
        &workspace_id,
        "cards/comments.md",
        &card(
            "comment-board",
            "todo",
            &format!("updated card still asks @{member} to review"),
        ),
    )
    .await;

    let (create_status, comment) = common::req(
        app.clone(),
        "POST",
        &format!(
            "/api/v1/workspaces/{workspace_id}/documents/{document_id}/comments"
        ),
        Some(&owner_token),
        Some(json!({
            "body": format!("please review @{member}; ignore `{member}` and x@{member}.com /@nobody"),
        })),
    )
    .await;
    assert_eq!(create_status, StatusCode::OK, "{comment}");
    let comment_id = comment["id"].as_str().unwrap();

    // Keeping the same mention on edit must not produce another mention event.
    let (update_status, update_body) = common::req(
        app.clone(),
        "PATCH",
        &format!("/api/v1/workspaces/{workspace_id}/comments/{comment_id}"),
        Some(&owner_token),
        Some(json!({ "body": format!("updated for @{member}") })),
    )
    .await;
    assert_eq!(update_status, StatusCode::OK, "{update_body}");

    let (reply_status, reply_body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/documents/{document_id}/comments"),
        Some(&member_token),
        Some(json!({ "body": "reply", "parentId": comment_id })),
    )
    .await;
    assert_eq!(reply_status, StatusCode::OK, "{reply_body}");

    for resolved in [true, false] {
        let (status, body) = common::req(
            app.clone(),
            "POST",
            &format!("/api/v1/workspaces/{workspace_id}/comments/{comment_id}/resolve"),
            Some(&owner_token),
            Some(json!({ "resolved": resolved })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
    }

    let (delete_status, delete_body) = common::req(
        app.clone(),
        "DELETE",
        &format!("/api/v1/workspaces/{workspace_id}/comments/{comment_id}"),
        Some(&owner_token),
        None,
    )
    .await;
    assert_eq!(delete_status, StatusCode::NO_CONTENT, "{delete_body}");

    let (status, body) =
        activity(app, &member_token, &workspace_id, document_id, "?limit=100").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    let events = body["events"].as_array().unwrap();
    for expected in [
        "comment.created",
        "mention.created",
        "comment.updated",
        "comment.resolved",
        "comment.reopened",
        "comment.deleted",
    ] {
        assert!(
            events.iter().any(|event| event["kind"] == expected),
            "missing {expected}: {body}"
        );
    }
    let mentions: Vec<&Value> = events
        .iter()
        .filter(|event| event["kind"] == "mention.created")
        .collect();
    assert_eq!(
        mentions.len(),
        2,
        "one Card and one comment mention: {body}"
    );
    assert_eq!(
        events
            .iter()
            .filter(|event| event["kind"] == "comment.deleted")
            .count(),
        2,
        "root deletion must audit its cascaded reply: {body}"
    );
    assert!(mentions
        .iter()
        .all(|event| { event["changes"][0]["after"]["username"] == member }));
}

#[tokio::test]
async fn activity_falls_back_to_versions_and_rejects_outsiders() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let (outsider_token, _) = common::register_user(app.clone(), &common::uid()).await;
    let workspace_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let document = common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        "notes/legacy.md",
        "# Legacy note\n\nNo board frontmatter.",
    )
    .await;
    let document_id = document["documentId"].as_str().unwrap();

    let (status, body) = activity(
        app.clone(),
        &token,
        &workspace_id,
        document_id,
        "?limit=100",
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["events"].as_array().unwrap().len(), 1);
    assert_eq!(body["events"][0]["kind"], "card.created");
    assert!(body["events"][0].get("changes").is_none());
    assert!(body.get("nextSequence").is_none());

    let (status, _) = activity(
        app,
        &outsider_token,
        &workspace_id,
        document_id,
        "?limit=100",
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn source_allowlist_blocks_spoofing_and_mcp_is_valid() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let (status, saved) = req_with_client(
        app.clone(),
        &format!("/api/v1/workspaces/{workspace_id}/documents/save"),
        &token,
        "system",
        json!({
            "relativePath": "cards/spoofed-source.md",
            "content": card("source-board", "todo", "spoofed source"),
        }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{saved}");
    let version_id = saved["versionId"].as_str().unwrap();
    let row = sqlx::query("SELECT source FROM document_versions WHERE id = ?")
        .bind(version_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(row.try_get::<String, _>("source").unwrap(), "web");

    let user_id: String = sqlx::query_scalar("SELECT id FROM users WHERE username = ?")
        .bind(&username)
        .fetch_one(&pool)
        .await
        .unwrap();
    let mcp_user = jtype_web::db::models::AuthUser {
        id: user_id,
        username: username.clone(),
        role: "user".to_string(),
        scope: "mcp".to_string(),
        session_label: Some("release-agent".to_string()),
    };
    let outcome = jtype_web::handlers::document::save_document_version(
        &pool,
        &workspace_id,
        &mcp_user,
        jtype_web::db::models::CloudSaveDocumentRequest {
            document_id: None,
            relative_path: "cards/real-mcp-source.md".to_string(),
            title: None,
            content: card("source-board", "todo", "real mcp source"),
            base_content_hash: None,
            base_content: None,
            create_only: false,
        },
        // An agent scope cannot spoof another client kind.
        "desktop",
    )
    .await
    .unwrap();
    let mcp_document = match outcome {
        jtype_web::handlers::document::SaveDocumentOutcome::Saved(document, _, _, _) => document,
        jtype_web::handlers::document::SaveDocumentOutcome::Conflict(_) => {
            panic!("new MCP document unexpectedly conflicted")
        }
    };
    let source: String = sqlx::query_scalar("SELECT source FROM document_versions WHERE id = ?")
        .bind(&mcp_document.version_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(source, "mcp");

    let (status, activity_body) = activity(
        app,
        &token,
        &workspace_id,
        &mcp_document.document_id,
        "?limit=100",
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{activity_body}");
    assert_eq!(activity_body["events"][0]["actor"]["kind"], "agent");
    assert_eq!(activity_body["events"][0]["client"]["kind"], "mcp");
    assert_eq!(
        activity_body["events"][0]["token"]["label"],
        "release-agent"
    );
}
