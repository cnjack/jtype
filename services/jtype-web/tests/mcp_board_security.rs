//! Security boundary tests for board-scoped MCP credentials.

mod common;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::Row;

#[tokio::test]
async fn mint_records_board_grant_and_board_token_cannot_call_rest() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let (full_token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &full_token, &common::wname()).await;
    let board_id = format!("b_{}", &common::uid()[..8]);

    common::save_doc(
        app.clone(),
        &full_token,
        &workspace_id,
        "security.board",
        &json!({
            "id": board_id,
            "title": "Security board",
            "columns": [{ "key": "todo", "name": "Todo" }]
        })
        .to_string(),
    )
    .await;
    let expected_document_id: String = sqlx::query_scalar(
        "SELECT id FROM documents WHERE workspace_id = ? AND relative_path = 'security.board'",
    )
    .bind(&workspace_id)
    .fetch_one(&pool)
    .await
    .unwrap();

    let (status, minted) = common::req(
        app.clone(),
        "POST",
        "/api/v1/mcp-token",
        Some(&full_token),
        Some(json!({ "workspaceId": workspace_id, "boardId": board_id })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "mint failed: {minted}");
    let board_token = minted["token"].as_str().expect("one-time token");
    assert_eq!(minted["workspaceId"], workspace_id);
    assert_eq!(minted["boardId"], board_id);
    assert_eq!(minted["boardDocumentId"], expected_document_id);
    assert!(
        minted["expiresAt"]
            .as_str()
            .is_some_and(|value| !value.is_empty()),
        "mint must disclose expiry: {minted}"
    );

    let grant = sqlx::query(
        r#"SELECT s.scope, g.workspace_id, g.board_document_id, g.logical_board_id
           FROM sessions s
           JOIN mcp_board_grants g ON g.token_hash = s.token_hash
           WHERE s.token_hash = SHA2(?, 256)"#,
    )
    .bind(board_token)
    .fetch_one(&pool)
    .await
    .expect("grant row");
    assert_eq!(grant.get::<String, _>("scope"), "mcp_kanban_board");
    assert_eq!(grant.get::<String, _>("workspace_id"), workspace_id);
    assert_eq!(
        grant.get::<String, _>("board_document_id"),
        expected_document_id
    );
    assert_eq!(grant.get::<String, _>("logical_board_id"), board_id);

    // Even a harmless REST read is forbidden. Board credentials are accepted
    // only by their pinned MCP resource, whose internal calls carry an
    // unforgeable request-extension capability.
    let (status, _) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{workspace_id}/documents"),
        Some(board_token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn mint_rejects_missing_and_ambiguous_logical_board_ids() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (full_token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &full_token, &common::wname()).await;
    let board_id = format!("b_{}", &common::uid()[..8]);

    let (status, _) = common::req(
        app.clone(),
        "POST",
        "/api/v1/mcp-token",
        Some(&full_token),
        Some(json!({ "workspaceId": workspace_id, "boardId": board_id })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    for path in ["one.board", "two.board"] {
        common::save_doc(
            app.clone(),
            &full_token,
            &workspace_id,
            path,
            &json!({ "id": board_id, "title": path, "columns": [] }).to_string(),
        )
        .await;
    }
    let (status, body) = common::req(
        app,
        "POST",
        "/api/v1/mcp-token",
        Some(&full_token),
        Some(json!({ "workspaceId": workspace_id, "boardId": board_id })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        body["error"]
            .as_str()
            .is_some_and(|message| message.contains("ambiguous")),
        "unexpected error: {body}"
    );
}

#[tokio::test]
async fn board_token_only_authenticates_its_exact_pinned_endpoint() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (full_token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &full_token, &common::wname()).await;
    let board_id = format!("b_{}", &common::uid()[..8]);
    common::save_doc(
        app.clone(),
        &full_token,
        &workspace_id,
        "pinned.board",
        &json!({ "id": board_id, "title": "Pinned", "columns": [] }).to_string(),
    )
    .await;
    let (status, minted) = common::req(
        app.clone(),
        "POST",
        "/api/v1/mcp-token",
        Some(&full_token),
        Some(json!({ "workspaceId": workspace_id, "boardId": board_id })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "mint failed: {minted}");
    let board_token = minted["token"].as_str().unwrap();
    let initialize = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": { "protocolVersion": "2025-06-18" }
    });

    let (status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/mcp/kanban/{workspace_id}/{board_id}"),
        Some(board_token),
        Some(initialize.clone()),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let (status, _) = common::req(
        app.clone(),
        "POST",
        &format!("/mcp/kanban/{workspace_id}/wrong-board"),
        Some(board_token),
        Some(initialize.clone()),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    // Omitting the pin must not turn a board grant back into an account-wide
    // Kanban credential.
    let (status, _) = common::req(
        app.clone(),
        "POST",
        "/mcp/kanban",
        Some(board_token),
        Some(initialize.clone()),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    // A duplicate logical id introduced after minting makes the authority
    // ambiguous, so the original token must fail closed.
    common::save_doc(
        app.clone(),
        &full_token,
        &workspace_id,
        "duplicate.board",
        &json!({ "id": board_id, "title": "Duplicate", "columns": [] }).to_string(),
    )
    .await;
    let (status, _) = common::req(
        app,
        "POST",
        &format!("/mcp/kanban/{workspace_id}/{board_id}"),
        Some(board_token),
        Some(initialize),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn legacy_mcp_token_is_also_blocked_from_external_rest() {
    let (app, pool) = common::setup().await;
    let username = common::uid();
    let (full_token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &full_token, &common::wname()).await;
    let user_id: String = sqlx::query_scalar("SELECT id FROM users WHERE username = ?")
        .bind(&username)
        .fetch_one(&pool)
        .await
        .unwrap();
    let legacy_token = jtype_web::handlers::auth::create_scoped_session(
        &pool,
        &user_id,
        "mcp",
        Some(3600),
        Some("legacy security test"),
    )
    .await
    .unwrap();

    let (status, _) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{workspace_id}"),
        Some(&legacy_token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// A pinned board endpoint is the most restrictive surface: it must guide
/// OAuth-capable clients (via `WWW-Authenticate`) and, by scope containment,
/// accept broader-scope tokens minted by that flow (`mcp`) as well as `full`
/// sessions. RBAC still gates per call via the forwarded bearer.
#[tokio::test]
async fn pinned_endpoint_guides_oauth_and_accepts_broader_scope_tokens() {
    use axum::body::Body;
    use axum::http::Request;
    use tower::ServiceExt;

    let (app, pool) = common::setup().await;
    let username = common::uid();
    let (full_token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &full_token, &common::wname()).await;
    let board_id = format!("b_{}", &common::uid()[..8]);
    common::save_doc(
        app.clone(),
        &full_token,
        &workspace_id,
        "pinned.board",
        &json!({ "id": board_id, "title": "Pinned", "columns": [] }).to_string(),
    )
    .await;

    let pinned_url = format!("/mcp/kanban/{workspace_id}/{board_id}");
    let initialize = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": { "protocolVersion": "2025-06-18" }
    });

    // 1. No token → 401 WITH a WWW-Authenticate header (OAuth guidance), so
    //    Claude/Cursor/jcode can discover and run the flow against the pin.
    let request = Request::builder()
        .method("POST")
        .uri(&pinned_url)
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&initialize).unwrap()))
        .unwrap();
    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    let www_auth = response
        .headers()
        .get("www-authenticate")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(
        www_auth.contains("resource_metadata"),
        "pinned endpoint must advertise OAuth metadata: got {www_auth:?}"
    );

    // 2. An `mcp`-scoped token (what the OAuth flow mints) is accepted on the
    //    pinned endpoint — scope containment lets a broader token in.
    let user_id: String = sqlx::query_scalar("SELECT id FROM users WHERE username = ?")
        .bind(&username)
        .fetch_one(&pool)
        .await
        .unwrap();
    let mcp_token = jtype_web::handlers::auth::create_scoped_session(
        &pool,
        &user_id,
        "mcp",
        Some(3600),
        Some("pinned-acceptance test"),
    )
    .await
    .unwrap();
    let (status, body) = common::req(
        app.clone(),
        "POST",
        &pinned_url,
        Some(&mcp_token),
        Some(initialize.clone()),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "mcp token rejected on pin: {body}");
    assert_eq!(body["result"]["serverInfo"]["name"], "jtype-kanban");

    // 3. A `full` session token is likewise accepted.
    let (status, body) = common::req(
        app,
        "POST",
        &pinned_url,
        Some(&full_token),
        Some(initialize),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "full token rejected on pin: {body}");
    assert_eq!(body["result"]["serverInfo"]["name"], "jtype-kanban");
}
