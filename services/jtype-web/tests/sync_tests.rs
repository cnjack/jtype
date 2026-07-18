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
}

#[tokio::test]
async fn mobile_push_records_mobile_version_source() {
    let (app, pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let relative_path = format!("mobile-{}.md", &uuid::Uuid::new_v4().simple().to_string()[..8]);

    let (status, body) = common::req_with_client_type(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(json!({
            "deviceId": "mobile-test-device",
            "documents": [{
                "relativePath": relative_path,
                "content": "# Written on mobile",
                "title": "Written on mobile"
            }]
        })),
        "mobile",
    )
    .await;

    assert_eq!(status, StatusCode::OK, "mobile push should return 200: {body}");
    let source: String = sqlx::query_scalar(
        r#"SELECT v.source
           FROM document_versions v
           JOIN documents d ON d.id = v.document_id
           WHERE v.workspace_id = ? AND d.relative_path = ?
           ORDER BY v.created_at DESC
           LIMIT 1"#,
    )
    .bind(&ws_id)
    .bind(&relative_path)
    .fetch_one(&pool)
    .await
    .expect("mobile version should exist");
    assert_eq!(source, "mobile");
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

    assert_eq!(
        status,
        StatusCode::OK,
        "push with deletedPaths should return 200: {body}"
    );
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

#[tokio::test]
async fn repeated_stale_push_reuses_open_conflict_and_resolution_clears_legacy_duplicates() {
    let (app, pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let relative_path = format!(
        "conflict-{}.md",
        &uuid::Uuid::new_v4().simple().to_string()[..8]
    );
    let base_content = "# Conflict\n\nShared base.";
    let saved = common::save_doc(
        app.clone(),
        &token,
        &ws_id,
        &relative_path,
        base_content,
    )
    .await;
    let base_hash = saved["contentHash"]
        .as_str()
        .expect("saved document should have a content hash");

    common::save_doc(
        app.clone(),
        &token,
        &ws_id,
        &relative_path,
        "# Conflict\n\nCloud edit.",
    )
    .await;

    let stale_push = json!({
        "deviceId": "stale-mobile",
        "documents": [{
            "relativePath": relative_path,
            "title": "Conflict",
            "content": "# Conflict\n\nLocal edit.",
            "baseContentHash": base_hash,
            "baseContent": base_content
        }]
    });
    let (first_status, first_body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(stale_push.clone()),
    )
    .await;
    let (second_status, second_body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(stale_push),
    )
    .await;

    assert_eq!(first_status, StatusCode::OK, "first stale push: {first_body}");
    assert_eq!(second_status, StatusCode::OK, "second stale push: {second_body}");
    let first_id = first_body["conflicts"][0]["conflictId"]
        .as_str()
        .expect("first push should return a conflict");
    let second_id = second_body["conflicts"][0]["conflictId"]
        .as_str()
        .expect("second push should return a conflict");
    assert_eq!(first_id, second_id, "the open conflict should be reused");

    let open_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sync_conflicts WHERE workspace_id = ? AND relative_path = ? AND status = 'open'",
    )
    .bind(&ws_id)
    .bind(&relative_path)
    .fetch_one(&pool)
    .await
    .expect("open conflict count");
    assert_eq!(open_count, 1);

    // Simulate one duplicate left by an older server build, then verify that
    // resolving the visible conflict also clears the hidden legacy row.
    let legacy_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO sync_conflicts
           (id, workspace_id, document_id, relative_path, base_content, local_content, cloud_content, conflict_ranges)
           SELECT ?, workspace_id, document_id, relative_path, base_content, local_content, cloud_content, conflict_ranges
           FROM sync_conflicts WHERE id = ?"#,
    )
    .bind(&legacy_id)
    .bind(first_id)
    .execute(&pool)
    .await
    .expect("insert legacy duplicate");

    let (resolve_status, resolve_body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/conflicts/{first_id}/resolve"),
        Some(&token),
        Some(json!({
            "resolution": "manual_merge",
            "content": "# Conflict\n\nMerged result."
        })),
    )
    .await;
    assert_eq!(
        resolve_status,
        StatusCode::OK,
        "conflict resolution should succeed: {resolve_body}"
    );

    let remaining_open: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sync_conflicts WHERE workspace_id = ? AND relative_path = ? AND status = 'open'",
    )
    .bind(&ws_id)
    .bind(&relative_path)
    .fetch_one(&pool)
    .await
    .expect("remaining open conflict count");
    assert_eq!(remaining_open, 0);
}

#[tokio::test]
async fn repeated_request_id_returns_cached_response_without_duplicate_version() {
    let (app, pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let relative_path = format!(
        "idempotent-{}.md",
        &uuid::Uuid::new_v4().simple().to_string()[..8]
    );
    let payload = json!({
        "requestId": "sync-run-1:0001",
        "deviceId": "mobile-idempotency-test",
        "documents": [{
            "relativePath": relative_path,
            "title": "Idempotent",
            "content": "# Written once"
        }]
    });

    let (first_status, first_body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(payload.clone()),
    )
    .await;
    let (replay_status, replay_body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(payload),
    )
    .await;

    assert_eq!(first_status, StatusCode::OK, "first push: {first_body}");
    assert_eq!(
        replay_status,
        StatusCode::OK,
        "replayed push: {replay_body}"
    );
    assert_eq!(
        replay_body, first_body,
        "a replay should return the cached response"
    );

    let version_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM document_versions v
           JOIN documents d ON d.id = v.document_id
           WHERE v.workspace_id = ? AND d.relative_path = ?"#,
    )
    .bind(&ws_id)
    .bind(&relative_path)
    .fetch_one(&pool)
    .await
    .expect("version count");
    assert_eq!(
        version_count, 1,
        "the replay must not create another version"
    );
}

#[tokio::test]
async fn concurrent_request_id_replay_waits_for_one_cached_response() {
    let (app, pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let prefix = format!(
        "concurrent-idempotent-{}",
        &uuid::Uuid::new_v4().simple().to_string()[..8]
    );
    let documents = (0..50)
        .map(|index| {
            json!({
                "relativePath": format!("{prefix}-{index:02}.md"),
                "title": format!("Concurrent {index}"),
                "content": format!("# Written once {index}")
            })
        })
        .collect::<Vec<_>>();
    let payload = json!({
        "requestId": "sync-concurrent:0001",
        "deviceId": "mobile-concurrent-idempotency-test",
        "documents": documents
    });
    let endpoint = format!("/api/v1/workspaces/{ws_id}/sync/push");

    let first = common::req(
        app.clone(),
        "POST",
        &endpoint,
        Some(&token),
        Some(payload.clone()),
    );
    let second = common::req(app, "POST", &endpoint, Some(&token), Some(payload));
    let ((first_status, first_body), (second_status, second_body)) = tokio::join!(first, second);

    assert_eq!(first_status, StatusCode::OK, "first push: {first_body}");
    assert_eq!(
        second_status,
        StatusCode::OK,
        "concurrent replay: {second_body}"
    );
    assert_eq!(
        second_body, first_body,
        "both handlers should return the cached response"
    );

    let version_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM document_versions v
           JOIN documents d ON d.id = v.document_id
           WHERE v.workspace_id = ? AND d.relative_path LIKE ?"#,
    )
    .bind(&ws_id)
    .bind(format!("{prefix}-%"))
    .fetch_one(&pool)
    .await
    .expect("version count");
    assert_eq!(
        version_count, 50,
        "concurrent replay must apply each document once"
    );
}

#[tokio::test]
async fn request_id_reuse_with_different_payload_is_rejected() {
    let (app, _pool) = common::setup().await;
    let (token, _) = common::register_user(app.clone(), &common::uid()).await;
    let ws_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let path = format!(
        "collision-{}.md",
        &uuid::Uuid::new_v4().simple().to_string()[..8]
    );
    let first = json!({
        "requestId": "sync-collision:0001",
        "deviceId": "mobile-collision-test",
        "documents": [{ "relativePath": path, "content": "first" }]
    });
    let second = json!({
        "requestId": "sync-collision:0001",
        "deviceId": "mobile-collision-test",
        "documents": [{ "relativePath": path, "content": "different" }]
    });

    let (first_status, first_body) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(first),
    )
    .await;
    let (second_status, second_body) = common::req(
        app,
        "POST",
        &format!("/api/v1/workspaces/{ws_id}/sync/push"),
        Some(&token),
        Some(second),
    )
    .await;

    assert_eq!(first_status, StatusCode::OK, "first push: {first_body}");
    assert_eq!(second_status, StatusCode::BAD_REQUEST);
    assert!(second_body["error"]
        .as_str()
        .unwrap_or_default()
        .contains("different sync payload"));
}
