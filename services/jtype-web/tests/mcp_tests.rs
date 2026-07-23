//! Integration tests for the MCP server (`POST /mcp`, Streamable HTTP).
//!
//! Drives the real Axum router via the shared `common` harness. Covers the
//! JSON-RPC envelope (`initialize`, `tools/list`), auth enforcement, and one
//! happy-path `tools/call` for every tool in the catalog.

mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use serde_json::{json, Value};
use tower::ServiceExt;

// ── MCP helpers ─────────────────────────────────────────────────────────────

/// Send a JSON-RPC message to `/mcp` with a bearer token; return (status, json).
async fn mcp(app: Router, token: Option<&str>, body: Value) -> (StatusCode, Value) {
    common::req(app, "POST", "/mcp", token, Some(body)).await
}

/// Call `tools/call` and return the `result` object (`{content, isError}`).
async fn tool_call(app: Router, token: &str, name: &str, args: Value) -> Value {
    let (status, body) = mcp(
        app,
        Some(token),
        json!({
            "jsonrpc": "2.0", "id": 1, "method": "tools/call",
            "params": { "name": name, "arguments": args }
        }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{name} transport status");
    body["result"].clone()
}

/// The text content of a tool result.
fn tool_text(result: &Value) -> String {
    result["content"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string()
}

fn assert_ok(result: &Value, name: &str) {
    assert_eq!(
        result["isError"].as_bool(),
        Some(false),
        "{name} returned isError: {}",
        tool_text(result)
    );
}

// ── Auth & envelope ─────────────────────────────────────────────────────────

#[tokio::test]
async fn mcp_requires_auth_with_challenge() {
    let (app, _pool) = common::setup().await;
    // Build a raw request to inspect the WWW-Authenticate header.
    let request = Request::builder()
        .method("POST")
        .uri("/mcp")
        .header("content-type", "application/json")
        .body(Body::from(
            serde_json::to_vec(&json!({"jsonrpc":"2.0","id":1,"method":"initialize"})).unwrap(),
        ))
        .unwrap();
    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    let challenge = response
        .headers()
        .get("www-authenticate")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(
        challenge.contains("resource_metadata") && challenge.contains("oauth-protected-resource"),
        "missing challenge: {challenge}"
    );
}

#[tokio::test]
async fn pinned_board_endpoint_advertises_oauth_for_auto_login() {
    let (app, _pool) = common::setup().await;
    let request_body = serde_json::to_vec(&json!({
        "jsonrpc": "2.0", "id": 1, "method": "initialize"
    }))
    .unwrap();

    // A pinned board URL must advertise the same OAuth resource metadata as the
    // general endpoint, so OAuth-capable clients (Claude, Cursor, jcode) can
    // discover and run the flow when connecting directly to a pinned board.
    let pinned = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/mcp/kanban/workspace/board")
                .header("content-type", "application/json")
                .body(Body::from(request_body.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(pinned.status(), StatusCode::UNAUTHORIZED);
    let pinned_challenge = pinned
        .headers()
        .get(axum::http::header::WWW_AUTHENTICATE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(
        pinned_challenge.contains("resource_metadata")
            && pinned_challenge.contains("oauth-protected-resource"),
        "pinned endpoint must advertise OAuth metadata: got {pinned_challenge:?}"
    );

    let general = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/mcp")
                .header("content-type", "application/json")
                .body(Body::from(request_body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(general.status(), StatusCode::UNAUTHORIZED);
    assert!(
        general
            .headers()
            .get(axum::http::header::WWW_AUTHENTICATE)
            .is_some()
    );
}

#[tokio::test]
async fn mcp_initialize() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;

    let (status, body) = mcp(
        app,
        Some(&token),
        json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["result"]["protocolVersion"], "2025-06-18");
    assert_eq!(body["result"]["serverInfo"]["name"], "jtype");
    assert!(body["result"]["capabilities"]["tools"].is_object());
}

#[tokio::test]
async fn mcp_tools_list_has_all_tools() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;

    let (status, body) = mcp(
        app,
        Some(&token),
        json!({"jsonrpc":"2.0","id":1,"method":"tools/list"}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let names: Vec<&str> = body["result"]["tools"]
        .as_array()
        .unwrap()
        .iter()
        .map(|t| t["name"].as_str().unwrap())
        .collect();
    for expected in [
        "list_workspaces",
        "list_notes",
        "get_note",
        "search_notes",
        "create_note",
        "update_note",
        "append_note",
        "list_members",
    ] {
        assert!(
            names.contains(&expected),
            "missing tool {expected}; got {names:?}"
        );
    }
}

// ── Kanban catalog (separate `/mcp/kanban` server) ──────────────────────────

/// Send a JSON-RPC message to `/mcp/kanban` with a bearer token; return (status, json).
async fn mcp_kanban(app: Router, token: Option<&str>, body: Value) -> (StatusCode, Value) {
    common::req(app, "POST", "/mcp/kanban", token, Some(body)).await
}

async fn mcp_kanban_pinned(
    app: Router,
    token: Option<&str>,
    workspace_id: &str,
    board: &str,
    body: Value,
) -> (StatusCode, Value) {
    common::req(
        app,
        "POST",
        &format!("/mcp/kanban/{workspace_id}/{board}"),
        token,
        Some(body),
    )
    .await
}

async fn pinned_tool_call(
    app: Router,
    token: &str,
    workspace_id: &str,
    board: &str,
    name: &str,
    args: Value,
) -> Value {
    let (status, body) = mcp_kanban_pinned(
        app,
        Some(token),
        workspace_id,
        board,
        json!({
            "jsonrpc": "2.0", "id": 1, "method": "tools/call",
            "params": { "name": name, "arguments": args }
        }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{name} transport status: {body}");
    body["result"].clone()
}

async fn make_board(
    app: Router,
    full_token: &str,
    workspace_id: &str,
    board_id: &str,
    relative_path: &str,
) -> String {
    let saved = common::save_doc(
        app,
        full_token,
        workspace_id,
        relative_path,
        &json!({
            "id": board_id,
            "title": board_id,
            "columns": [
                { "key": "todo", "name": "To do" },
                { "key": "doing", "name": "Doing" },
                { "key": "done", "name": "Done" }
            ]
        })
        .to_string(),
    )
    .await;
    saved["documentId"].as_str().unwrap().to_string()
}

async fn mint_board_token(
    app: Router,
    full_token: &str,
    workspace_id: &str,
    board_id: &str,
) -> String {
    let (status, body) = common::req(
        app,
        "POST",
        "/api/v1/mcp-token",
        Some(full_token),
        Some(json!({ "workspaceId": workspace_id, "boardId": board_id })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "mint board token failed: {body}");
    body["token"].as_str().unwrap().to_string()
}

/// The tool names from a `tools/list` response body.
fn tool_names(body: &Value) -> Vec<&str> {
    body["result"]["tools"]
        .as_array()
        .unwrap()
        .iter()
        .map(|t| t["name"].as_str().unwrap())
        .collect()
}

/// Board/card tools — exposed by `/mcp/kanban`, must be absent from `/mcp`.
const KANBAN_TOOLS: [&str; 6] = [
    "list_boards",
    "get_board",
    "list_cards",
    "create_card",
    "move_card",
    "update_card",
];

#[tokio::test]
async fn mcp_notes_catalog_omits_kanban_tools() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;

    let (status, body) = mcp(
        app,
        Some(&token),
        json!({"jsonrpc":"2.0","id":1,"method":"tools/list"}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let names = tool_names(&body);
    for kanban in KANBAN_TOOLS {
        assert!(
            !names.contains(&kanban),
            "/mcp must not expose kanban tool {kanban}; got {names:?}"
        );
    }
}

#[tokio::test]
async fn mcp_kanban_catalog_has_board_card_tools() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;

    let (status, body) = mcp_kanban(
        app,
        Some(&token),
        json!({"jsonrpc":"2.0","id":1,"method":"tools/list"}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let names = tool_names(&body);
    for expected in KANBAN_TOOLS {
        assert!(
            names.contains(&expected),
            "missing kanban tool {expected}; got {names:?}"
        );
    }
    // The kanban server must not leak the note-editing tools.
    for note in ["create_note", "search_notes", "append_note", "get_note"] {
        assert!(
            !names.contains(&note),
            "/mcp/kanban leaked note tool {note}; got {names:?}"
        );
    }
}

#[tokio::test]
async fn mcp_pinned_catalog_is_board_only_and_scope_free() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (full_token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &full_token, &common::wname()).await;
    let board = format!("b_{}", common::uid());
    make_board(
        app.clone(),
        &full_token,
        &workspace_id,
        &board,
        "delivery.board",
    )
    .await;
    let board_token = mint_board_token(app.clone(), &full_token, &workspace_id, &board).await;

    let (status, body) = mcp_kanban_pinned(
        app,
        Some(&board_token),
        &workspace_id,
        &board,
        json!({"jsonrpc":"2.0","id":1,"method":"tools/list"}),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    let tools = body["result"]["tools"].as_array().unwrap();
    let names: Vec<&str> = tools
        .iter()
        .map(|tool| tool["name"].as_str().unwrap())
        .collect();
    assert_eq!(
        names,
        [
            "get_board",
            "list_cards",
            "get_card",
            "create_card",
            "update_card",
            "move_card",
            "list_card_comments",
            "comment_card",
            "resolve_card_comment"
        ]
    );
    for tool in tools {
        assert_eq!(tool["inputSchema"]["additionalProperties"], false);
        assert!(
            tool["outputSchema"].is_object(),
            "missing output schema: {tool}"
        );
        let properties = tool["inputSchema"]["properties"].as_object().unwrap();
        assert!(!properties.contains_key("workspace_id"), "{tool}");
        assert!(!properties.contains_key("board"), "{tool}");
        assert!(!properties.contains_key("path"), "{tool}");
    }
    for name in ["comment_card", "resolve_card_comment"] {
        let schema = tools
            .iter()
            .find(|tool| tool["name"] == name)
            .map(|tool| &tool["outputSchema"])
            .unwrap();
        assert_eq!(schema["properties"]["documentId"]["type"], "string");
        assert_eq!(schema["properties"]["id"]["type"], "string");
        assert_eq!(schema["additionalProperties"], false);
    }
}

#[tokio::test]
async fn mcp_pinned_endpoint_enforces_grant_and_rejects_scope_override() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (full_token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &full_token, &common::wname()).await;
    let board = format!("b_{}", common::uid());
    make_board(
        app.clone(),
        &full_token,
        &workspace_id,
        &board,
        "locked.board",
    )
    .await;
    let board_token = mint_board_token(app.clone(), &full_token, &workspace_id, &board).await;
    let initialize = json!({"jsonrpc":"2.0","id":1,"method":"initialize"});

    // By scope containment, a full session is accepted on the pinned endpoint
    // (RBAC still gates per call); a board token for a *different* URL is not.
    let (status, body) = mcp_kanban_pinned(
        app.clone(),
        Some(&full_token),
        &workspace_id,
        &board,
        initialize.clone(),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "full token rejected on pin: {body}");
    assert_eq!(body["result"]["serverInfo"]["name"], "jtype-kanban");
    let (status, _) = mcp_kanban_pinned(
        app.clone(),
        Some(&board_token),
        &workspace_id,
        "some-other-board",
        initialize.clone(),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    // A board-scoped token cannot escape through either unpinned MCP surface.
    let (status, _) = mcp(app.clone(), Some(&board_token), initialize.clone()).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = mcp_kanban(app.clone(), Some(&board_token), initialize).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    let result = pinned_tool_call(
        app,
        &board_token,
        &workspace_id,
        &board,
        "list_cards",
        json!({ "workspace_id": workspace_id, "board": "some-other-board" }),
    )
    .await;
    assert_eq!(result["isError"], true);
    assert!(tool_text(&result).contains("cannot be overridden"));
}

#[tokio::test]
async fn mcp_pinned_card_document_id_roundtrip() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (full_token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &full_token, &common::wname()).await;
    let board = format!("b_{}", common::uid());
    make_board(
        app.clone(),
        &full_token,
        &workspace_id,
        &board,
        "release.board",
    )
    .await;
    let board_token = mint_board_token(app.clone(), &full_token, &workspace_id, &board).await;

    let created = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "create_card",
        json!({
            "title": "MCP identity",
            "status": "todo",
            "body": "Original body",
            "priority": "high"
        }),
    )
    .await;
    assert_ok(&created, "create_card");
    let document_id = created["structuredContent"]["documentId"]
        .as_str()
        .unwrap()
        .to_string();
    assert!(!document_id.is_empty());
    assert_eq!(created["structuredContent"]["boardId"], board);
    assert_eq!(created["structuredContent"]["body"], "Original body");

    let listed = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "list_cards",
        json!({}),
    )
    .await;
    assert_ok(&listed, "list_cards");
    assert_eq!(
        listed["structuredContent"]["cards"][0]["documentId"],
        document_id
    );

    let fetched = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "get_card",
        json!({ "document_id": document_id }),
    )
    .await;
    assert_ok(&fetched, "get_card");
    assert_eq!(fetched["structuredContent"]["documentId"], document_id);

    let updated = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "update_card",
        json!({
            "document_id": document_id,
            "title": "Stable identity",
            "body": "Edited through MCP"
        }),
    )
    .await;
    assert_ok(&updated, "update_card");
    assert_eq!(updated["structuredContent"]["documentId"], document_id);
    assert_eq!(updated["structuredContent"]["title"], "Stable identity");
    assert_eq!(updated["structuredContent"]["body"], "Edited through MCP");

    let moved = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "move_card",
        json!({ "document_id": document_id, "to": "doing", "position": 2 }),
    )
    .await;
    assert_ok(&moved, "move_card");
    assert_eq!(moved["structuredContent"]["documentId"], document_id);
    assert_eq!(moved["structuredContent"]["status"], "doing");
    assert_eq!(moved["structuredContent"]["position"], 2);

    let invalid_move = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "move_card",
        json!({ "document_id": document_id, "to": "not-a-column" }),
    )
    .await;
    assert_eq!(invalid_move["isError"], true);
    assert!(tool_text(&invalid_move).contains("no column"));

    let comment = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "comment_card",
        json!({ "document_id": document_id, "body": "Roundtrip comment" }),
    )
    .await;
    assert_ok(&comment, "comment_card");
    let comment_id = comment["structuredContent"]["id"]
        .as_str()
        .unwrap()
        .to_string();
    assert_eq!(comment["structuredContent"]["documentId"], document_id);

    let comments = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "list_card_comments",
        json!({ "document_id": document_id }),
    )
    .await;
    assert_ok(&comments, "list_card_comments");
    assert_eq!(
        comments["structuredContent"]["comments"][0]["id"],
        comment_id
    );

    let invalid_resolved = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "resolve_card_comment",
        json!({ "comment_id": comment_id, "resolved": "false" }),
    )
    .await;
    assert_eq!(invalid_resolved["isError"], true);
    assert!(tool_text(&invalid_resolved).contains("must be a boolean"));

    let resolved = pinned_tool_call(
        app,
        &board_token,
        &workspace_id,
        &board,
        "resolve_card_comment",
        json!({ "comment_id": comment_id, "resolved": true }),
    )
    .await;
    assert_ok(&resolved, "resolve_card_comment");
    assert!(resolved["structuredContent"]["resolvedAt"].is_string());
}

#[tokio::test]
async fn mcp_pinned_rejects_frontmatter_injection_without_side_effects() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (full_token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &full_token, &common::wname()).await;
    let board_a = format!("b_{}", common::uid());
    let board_b = format!("b_{}", common::uid());
    make_board(app.clone(), &full_token, &workspace_id, &board_a, "safe-a.board").await;
    make_board(app.clone(), &full_token, &workspace_id, &board_b, "safe-b.board").await;
    let board_token = mint_board_token(app.clone(), &full_token, &workspace_id, &board_a).await;

    let injected_scalar = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board_a,
        "create_card",
        json!({
            "title": "Scope escape",
            "status": "todo",
            "due": format!("today\nboard: {board_b}")
        }),
    )
    .await;
    assert_eq!(injected_scalar["isError"], true);
    assert!(tool_text(&injected_scalar).contains("forbidden control character"));

    // A Markdown body is not interpreted as caller-controlled frontmatter.
    let safe_body = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board_a,
        "create_card",
        json!({
            "title": "Body fence",
            "status": "todo",
            "body": format!("---\nboard: {board_b}\n---\nMarkdown body")
        }),
    )
    .await;
    assert_ok(&safe_body, "create_card body");
    assert_eq!(safe_body["structuredContent"]["boardId"], board_a);

    let (status, documents) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{workspace_id}/documents"),
        Some(&full_token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(
        documents
            .as_array()
            .unwrap()
            .iter()
            .all(|document| document["title"] != "Scope escape"),
        "rejected injected card must not be persisted: {documents}"
    );
}

#[tokio::test]
async fn mcp_pinned_concurrent_same_title_creates_distinct_cards() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (full_token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &full_token, &common::wname()).await;
    let board = format!("b_{}", common::uid());
    make_board(app.clone(), &full_token, &workspace_id, &board, "race.board").await;
    let board_token = mint_board_token(app.clone(), &full_token, &workspace_id, &board).await;

    let first = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "create_card",
        json!({ "title": "Same title", "status": "todo" }),
    );
    let second = pinned_tool_call(
        app,
        &board_token,
        &workspace_id,
        &board,
        "create_card",
        json!({ "title": "Same title", "status": "todo" }),
    );
    let (first, second) = tokio::join!(first, second);
    assert_ok(&first, "first create_card");
    assert_ok(&second, "second create_card");
    assert_ne!(
        first["structuredContent"]["documentId"],
        second["structuredContent"]["documentId"]
    );
    assert_ne!(
        first["structuredContent"]["relativePath"],
        second["structuredContent"]["relativePath"]
    );
}

#[tokio::test]
async fn mcp_pinned_rejects_cross_board_document_and_comment_ids() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (full_token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &full_token, &common::wname()).await;
    let board_a = format!("b_{}", common::uid());
    let board_b = format!("b_{}", common::uid());
    make_board(app.clone(), &full_token, &workspace_id, &board_a, "a.board").await;
    make_board(app.clone(), &full_token, &workspace_id, &board_b, "b.board").await;
    let board_token = mint_board_token(app.clone(), &full_token, &workspace_id, &board_a).await;
    let other = common::save_doc(
        app.clone(),
        &full_token,
        &workspace_id,
        "b/foreign.md",
        &format!(
            "---\ntitle: Foreign\nboard: {board_b}\nstatus: todo\nposition: 0\n---\nOther board"
        ),
    )
    .await;
    let other_document_id = other["documentId"].as_str().unwrap().to_string();
    let (status, foreign_comment) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{workspace_id}/documents/{other_document_id}/comments"),
        Some(&full_token),
        Some(json!({ "body": "foreign thread" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{foreign_comment}");
    let foreign_comment_id = foreign_comment["id"].as_str().unwrap();

    for (name, arguments) in [
        (
            "get_card",
            json!({ "document_id": other_document_id.clone() }),
        ),
        (
            "comment_card",
            json!({ "document_id": other_document_id, "body": "intrusion" }),
        ),
        (
            "resolve_card_comment",
            json!({ "comment_id": foreign_comment_id }),
        ),
    ] {
        let result = pinned_tool_call(
            app.clone(),
            &board_token,
            &workspace_id,
            &board_a,
            name,
            arguments,
        )
        .await;
        assert_eq!(result["isError"], true, "{name}: {result}");
        assert!(
            tool_text(&result).contains("does not belong"),
            "{name}: {}",
            tool_text(&result)
        );
    }
}

// ── Notes happy path ────────────────────────────────────────────────────────

#[tokio::test]
async fn mcp_notes_roundtrip() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let ws = common::create_workspace(app.clone(), &token, &common::wname()).await;

    // list_workspaces shows the new workspace.
    let r = tool_call(app.clone(), &token, "list_workspaces", json!({})).await;
    assert_ok(&r, "list_workspaces");
    assert!(tool_text(&r).contains(&ws), "workspace id not listed");

    // create_note
    let r = tool_call(
        app.clone(),
        &token,
        "create_note",
        json!({ "workspace_id": ws, "path": "ideas/launch.md",
                "content": "# Launch\n\nShip the MCP server and pineapple smoothies." }),
    )
    .await;
    assert_ok(&r, "create_note");

    // get_note returns the content
    let r = tool_call(
        app.clone(),
        &token,
        "get_note",
        json!({ "workspace_id": ws, "path": "ideas/launch.md" }),
    )
    .await;
    assert_ok(&r, "get_note");
    assert!(tool_text(&r).contains("pineapple smoothies"));

    // get_note tolerates a missing .md suffix
    let r = tool_call(
        app.clone(),
        &token,
        "get_note",
        json!({ "workspace_id": ws, "path": "ideas/launch" }),
    )
    .await;
    assert_ok(&r, "get_note (no suffix)");

    // list_notes (folder filter)
    let r = tool_call(
        app.clone(),
        &token,
        "list_notes",
        json!({ "workspace_id": ws, "folder": "ideas" }),
    )
    .await;
    assert_ok(&r, "list_notes");
    assert!(tool_text(&r).contains("ideas/launch.md"));

    // search_notes finds it by a body keyword
    let r = tool_call(
        app.clone(),
        &token,
        "search_notes",
        json!({ "workspace_id": ws, "query": "pineapple" }),
    )
    .await;
    assert_ok(&r, "search_notes");
    assert!(
        tool_text(&r).contains("ideas/launch.md"),
        "search miss: {}",
        tool_text(&r)
    );

    // append_note
    let r = tool_call(
        app.clone(),
        &token,
        "append_note",
        json!({ "workspace_id": ws, "path": "ideas/launch.md", "content": "## Risks\n\nNone." }),
    )
    .await;
    assert_ok(&r, "append_note");
    let r = tool_call(
        app.clone(),
        &token,
        "get_note",
        json!({ "workspace_id": ws, "path": "ideas/launch.md" }),
    )
    .await;
    assert!(tool_text(&r).contains("Risks") && tool_text(&r).contains("Launch"));

    // update_note replaces content
    let r = tool_call(
        app.clone(),
        &token,
        "update_note",
        json!({ "workspace_id": ws, "path": "ideas/launch.md", "content": "# Launch v2\n\nRewritten." }),
    )
    .await;
    assert_ok(&r, "update_note");
    let r = tool_call(
        app,
        &token,
        "get_note",
        json!({ "workspace_id": ws, "path": "ideas/launch.md" }),
    )
    .await;
    assert!(tool_text(&r).contains("Rewritten") && !tool_text(&r).contains("pineapple"));
}

// Regression: JSON-RPC envelope — a batch of only notifications → 202 (no body);
// an empty batch → a single Invalid Request (-32600).
#[tokio::test]
async fn mcp_batch_envelope() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;

    let (status, _) = mcp(
        app.clone(),
        Some(&token),
        json!([{ "jsonrpc": "2.0", "method": "notifications/initialized" }]),
    )
    .await;
    assert_eq!(status, StatusCode::ACCEPTED);

    let (status, body) = mcp(app, Some(&token), json!([])).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["error"]["code"], -32600);
}
