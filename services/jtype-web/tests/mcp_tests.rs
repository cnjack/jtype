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
    assert!(general
        .headers()
        .get(axum::http::header::WWW_AUTHENTICATE)
        .is_some());
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

async fn kanban_tool_call(app: Router, token: &str, name: &str, args: Value) -> Value {
    let (status, body) = mcp_kanban(
        app,
        Some(token),
        json!({
            "jsonrpc": "2.0", "id": 1, "method": "tools/call",
            "params": { "name": name, "arguments": args }
        }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{name} transport status: {body}");
    body["result"].clone()
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
const KANBAN_TOOLS: [&str; 14] = [
    "list_boards",
    "get_board",
    "list_cards",
    "create_card",
    "move_card",
    "update_card",
    "delete_card",
    "set_card_labels",
    "add_card_attachment",
    "remove_card_attachment",
    "set_card_relations",
    "bulk_update_cards",
    "list_statuses",
    "set_board_statuses",
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
    let tools = body["result"]["tools"].as_array().unwrap();
    for name in [
        "move_card",
        "update_card",
        "delete_card",
        "set_card_labels",
        "add_card_attachment",
        "remove_card_attachment",
        "set_card_relations",
    ] {
        let required = tools.iter().find(|tool| tool["name"] == name).unwrap()["inputSchema"]
            ["required"]
            .as_array()
            .unwrap();
        assert!(
            required.iter().any(|field| field == "document_id"),
            "{name}"
        );
        assert!(
            required.iter().any(|field| field == "base_content_hash"),
            "{name} must require optimistic concurrency"
        );
    }
    let status_properties = tools
        .iter()
        .find(|tool| tool["name"] == "set_board_statuses")
        .unwrap()["inputSchema"]["properties"]
        .as_object()
        .unwrap();
    assert!(status_properties.contains_key("done_status"));
    assert!(!status_properties.contains_key("doneColumn"));
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
            "delete_card",
            "set_card_labels",
            "add_card_attachment",
            "remove_card_attachment",
            "set_card_relations",
            "bulk_update_cards",
            "list_statuses",
            "set_board_statuses",
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
    let status_properties = tools
        .iter()
        .find(|tool| tool["name"] == "set_board_statuses")
        .unwrap()["inputSchema"]["properties"]
        .as_object()
        .unwrap();
    assert!(status_properties.contains_key("done_status"));
    assert!(!status_properties.contains_key("doneColumn"));
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
    let card_schema = tools
        .iter()
        .find(|tool| tool["name"] == "get_card")
        .map(|tool| &tool["outputSchema"])
        .unwrap();
    for field in [
        "start",
        "due",
        "reminder",
        "archived",
        "tags",
        "attachments",
        "blockedBy",
        "blocks",
        "relates",
        "parent",
    ] {
        assert!(
            card_schema["properties"].get(field).is_some(),
            "card output schema missing {field}"
        );
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
    make_board(
        app.clone(),
        &full_token,
        &workspace_id,
        &board_a,
        "safe-a.board",
    )
    .await;
    make_board(
        app.clone(),
        &full_token,
        &workspace_id,
        &board_b,
        "safe-b.board",
    )
    .await;
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
    make_board(
        app.clone(),
        &full_token,
        &workspace_id,
        &board,
        "race.board",
    )
    .await;
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
    let local = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board_a,
        "create_card",
        json!({ "title": "Local", "status": "todo" }),
    )
    .await;
    assert_ok(&local, "local card");
    let local_document_id = local["structuredContent"]["documentId"]
        .as_str()
        .unwrap()
        .to_string();

    for (name, arguments) in [
        (
            "get_card",
            json!({ "document_id": other_document_id.clone() }),
        ),
        (
            "comment_card",
            json!({ "document_id": other_document_id.clone(), "body": "intrusion" }),
        ),
        (
            "delete_card",
            json!({ "document_id": other_document_id.clone() }),
        ),
        (
            "set_card_labels",
            json!({ "document_id": other_document_id.clone(), "labels": ["intrusion"] }),
        ),
        (
            "add_card_attachment",
            json!({ "document_id": other_document_id.clone(), "attachment": "assets/nope.txt" }),
        ),
        (
            "set_card_relations",
            json!({ "document_id": other_document_id.clone(), "relates": [] }),
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

    let foreign_relation = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board_a,
        "set_card_relations",
        json!({
            "document_id": local_document_id,
            "relates": [other_document_id.clone()]
        }),
    )
    .await;
    assert_eq!(foreign_relation["isError"], true);
    assert!(tool_text(&foreign_relation).contains("does not resolve"));

    let bulk = pinned_tool_call(
        app,
        &board_token,
        &workspace_id,
        &board_a,
        "bulk_update_cards",
        json!({ "updates": [{ "document_id": other_document_id, "status": "done" }] }),
    )
    .await;
    assert_ok(&bulk, "cross-board bulk receipt");
    assert_eq!(bulk["structuredContent"]["failed"], 1);
    assert!(bulk["structuredContent"]["items"][0]["error"]
        .as_str()
        .unwrap()
        .contains("does not belong"));
}

#[tokio::test]
async fn mcp_pinned_extended_card_operations_are_safe_and_receipted() {
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
        "planning.board",
    )
    .await;
    let board_token = mint_board_token(app.clone(), &full_token, &workspace_id, &board).await;

    let parent = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "create_card",
        json!({ "title": "Parent", "status": "todo" }),
    )
    .await;
    assert_ok(&parent, "create parent");
    let parent_id = parent["structuredContent"]["documentId"]
        .as_str()
        .unwrap()
        .to_string();

    let card = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "create_card",
        json!({
            "title": "Release plan",
            "body": "Ship safely",
            "status": "todo",
            "start": "2026-09-01",
            "due": "2026-09-20",
            "reminder": "2026-09-18",
            "archived": true,
            "tags": ["planning", "agent"],
            "attachments": ["https://example.com/spec.pdf", "assets/release-plan.pdf"],
            "parent": parent_id,
            "blocked_by": [parent_id],
            "relates": [parent_id]
        }),
    )
    .await;
    assert_ok(&card, "create extended card");
    let card_id = card["structuredContent"]["documentId"]
        .as_str()
        .unwrap()
        .to_string();
    assert_eq!(card["structuredContent"]["start"], "2026-09-01");
    assert_eq!(card["structuredContent"]["reminder"], "2026-09-18");
    assert_eq!(card["structuredContent"]["archived"], true);
    assert_eq!(
        card["structuredContent"]["tags"],
        json!(["planning", "agent"])
    );
    assert_eq!(
        card["structuredContent"]["attachments"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert_eq!(card["structuredContent"]["parent"], "planning/parent");

    let labels = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "set_card_labels",
        json!({ "document_id": card_id, "labels": ["backend"], "mode": "add" }),
    )
    .await;
    assert_ok(&labels, "add label");
    assert_eq!(
        labels["structuredContent"]["tags"],
        json!(["planning", "agent", "backend"])
    );
    let labels = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "set_card_labels",
        json!({ "document_id": card_id, "labels": ["planning"], "mode": "remove" }),
    )
    .await;
    assert_ok(&labels, "remove label");
    assert_eq!(
        labels["structuredContent"]["tags"],
        json!(["agent", "backend"])
    );

    let relations = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "set_card_relations",
        json!({
            "document_id": card_id,
            "blocked_by": [],
            "blocks": [parent_id],
            "relates": []
        }),
    )
    .await;
    assert_ok(&relations, "set relations");
    assert_eq!(relations["structuredContent"]["blockedBy"], json!([]));
    assert_eq!(
        relations["structuredContent"]["blocks"],
        json!(["planning/parent"])
    );

    let attached = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "add_card_attachment",
        json!({ "document_id": card_id, "attachment": "assets/checklist.txt" }),
    )
    .await;
    assert_ok(&attached, "add attachment");
    assert!(attached["structuredContent"]["attachments"]
        .as_array()
        .unwrap()
        .iter()
        .any(|value| value == "assets/checklist.txt"));

    for unsafe_reference in [
        "javascript:alert(1)",
        "http://example.com/file",
        "../outside.txt",
        "assets/evil\r\nboard: other",
        "https://example.com/%0d%0aheader",
        "assets/%2e%2e/outside.txt",
        "\0bad",
    ] {
        let rejected = pinned_tool_call(
            app.clone(),
            &board_token,
            &workspace_id,
            &board,
            "add_card_attachment",
            json!({ "document_id": card_id, "attachment": unsafe_reference }),
        )
        .await;
        assert_eq!(rejected["isError"], true, "{unsafe_reference}: {rejected}");
    }

    let self_relation = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "set_card_relations",
        json!({ "document_id": card_id, "blocks": [card_id] }),
    )
    .await;
    assert_eq!(self_relation["isError"], true);
    assert!(tool_text(&self_relation).contains("itself"));

    let parent_cycle = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "set_card_relations",
        json!({ "document_id": parent_id, "parent": card_id }),
    )
    .await;
    assert_eq!(parent_cycle["isError"], true);
    assert!(tool_text(&parent_cycle).contains("cycle"));

    let dependency_cycle = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "set_card_relations",
        json!({ "document_id": parent_id, "blocks": [card_id] }),
    )
    .await;
    assert_eq!(dependency_cycle["isError"], true);
    assert!(tool_text(&dependency_cycle).contains("cycle"));

    let nested_scope_override = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "bulk_update_cards",
        json!({
            "updates": [{ "document_id": card_id, "board": "escape", "status": "done" }]
        }),
    )
    .await;
    assert_eq!(nested_scope_override["isError"], true);
    assert!(tool_text(&nested_scope_override).contains("cannot be overridden"));

    let bulk = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "bulk_update_cards",
        json!({
            "updates": [
                { "document_id": card_id, "archived": false, "due": "2026-09-21" },
                { "document_id": parent_id, "status": "doing" },
                { "document_id": "missing-card", "status": "done" }
            ]
        }),
    )
    .await;
    assert_ok(&bulk, "bulk update");
    assert_eq!(bulk["structuredContent"]["atomic"], false);
    assert_eq!(bulk["structuredContent"]["succeeded"], 2);
    assert_eq!(bulk["structuredContent"]["failed"], 1);
    assert_eq!(
        bulk["structuredContent"]["items"].as_array().unwrap().len(),
        3
    );

    let too_many_updates = (0..101)
        .map(|_| json!({ "document_id": card_id, "status": "done" }))
        .collect::<Vec<_>>();
    let too_many = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "bulk_update_cards",
        json!({ "updates": too_many_updates }),
    )
    .await;
    assert_eq!(too_many["isError"], true);
    assert!(tool_text(&too_many).contains("between 1 and 100"));

    let listed_statuses = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "list_statuses",
        json!({}),
    )
    .await;
    assert_ok(&listed_statuses, "list statuses");
    assert_eq!(listed_statuses["structuredContent"]["doneColumn"], "done");

    let camel_case_done = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "set_board_statuses",
        json!({
            "statuses": [
                { "key": "todo", "name": "To do" },
                { "key": "doing", "name": "Doing" },
                { "key": "done", "name": "Done" }
            ],
            "doneColumn": "todo"
        }),
    )
    .await;
    assert_eq!(camel_case_done["isError"], true);
    assert!(tool_text(&camel_case_done).contains("unexpected argument 'doneColumn'"));

    let removed_done = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "set_board_statuses",
        json!({
            "statuses": [
                { "key": "todo", "name": "To do" },
                { "key": "doing", "name": "Doing" }
            ]
        }),
    )
    .await;
    assert_eq!(removed_done["isError"], true);
    assert!(tool_text(&removed_done).contains("without selecting done_status"));

    let no_fallback = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "set_board_statuses",
        json!({
            "statuses": [
                { "key": "todo", "name": "To do" },
                { "key": "done", "name": "Done" }
            ]
        }),
    )
    .await;
    assert_eq!(no_fallback["isError"], true);
    assert!(tool_text(&no_fallback).contains("fallback_status"));

    let statuses = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "set_board_statuses",
        json!({
            "statuses": [
                { "key": "todo", "name": "Backlog" },
                { "key": "done", "name": "Done" }
            ],
            "done_status": "todo",
            "fallback_status": "todo"
        }),
    )
    .await;
    assert_ok(&statuses, "set statuses");
    assert_eq!(statuses["structuredContent"]["applied"], true);
    assert_eq!(statuses["structuredContent"]["doneColumn"], "todo");
    assert_eq!(statuses["structuredContent"]["migrations"][0]["ok"], true);

    let relisted_statuses = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "list_statuses",
        json!({}),
    )
    .await;
    assert_ok(&relisted_statuses, "relist statuses");
    assert_eq!(relisted_statuses["structuredContent"]["doneColumn"], "todo");

    let removed = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "remove_card_attachment",
        json!({ "document_id": card_id, "attachment": "assets/checklist.txt" }),
    )
    .await;
    assert_ok(&removed, "remove attachment");
    assert!(!removed["structuredContent"]["attachments"]
        .as_array()
        .unwrap()
        .iter()
        .any(|value| value == "assets/checklist.txt"));

    let deleted = pinned_tool_call(
        app.clone(),
        &board_token,
        &workspace_id,
        &board,
        "delete_card",
        json!({ "document_id": card_id }),
    )
    .await;
    assert_ok(&deleted, "delete card");
    assert_eq!(deleted["structuredContent"]["recovery"], "workspace-trash");
    let missing = pinned_tool_call(
        app,
        &board_token,
        &workspace_id,
        &board,
        "get_card",
        json!({ "document_id": card_id }),
    )
    .await;
    assert_eq!(missing["isError"], true);
}

#[tokio::test]
async fn mcp_unpinned_card_writes_require_fresh_document_identity_and_hash() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let board = format!("b_{}", common::uid());
    make_board(app.clone(), &token, &workspace_id, &board, "cas.board").await;

    let created = kanban_tool_call(
        app.clone(),
        &token,
        "create_card",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "title": "CAS card",
            "status": "todo",
            "start": "2026-10-01",
            "due": "2026-10-02",
            "tags": ["mcp"],
            "attachments": ["assets/cas.txt"]
        }),
    )
    .await;
    assert_ok(&created, "unpinned create");
    let document_id = created["structuredContent"]["documentId"]
        .as_str()
        .unwrap()
        .to_string();
    let content_hash = created["structuredContent"]["contentHash"]
        .as_str()
        .unwrap()
        .to_string();

    let missing_cas = kanban_tool_call(
        app.clone(),
        &token,
        "update_card",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "document_id": document_id,
            "status": "doing"
        }),
    )
    .await;
    assert_eq!(missing_cas["isError"], true);
    assert!(tool_text(&missing_cas).contains("base_content_hash"));

    let stale = kanban_tool_call(
        app.clone(),
        &token,
        "update_card",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "document_id": document_id,
            "base_content_hash": "stale",
            "status": "doing"
        }),
    )
    .await;
    assert_eq!(stale["isError"], true);
    assert!(tool_text(&stale).contains("stale baseContentHash"));

    let updated = kanban_tool_call(
        app.clone(),
        &token,
        "update_card",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "document_id": document_id,
            "base_content_hash": content_hash,
            "status": "doing",
            "reminder": "2026-10-01",
            "archived": true,
            "tags": ["mcp", "cas"]
        }),
    )
    .await;
    assert_ok(&updated, "unpinned CAS update");
    assert_eq!(updated["structuredContent"]["status"], "doing");
    assert_eq!(updated["structuredContent"]["archived"], true);
    assert_eq!(updated["structuredContent"]["tags"], json!(["mcp", "cas"]));

    let statuses = kanban_tool_call(
        app.clone(),
        &token,
        "list_statuses",
        json!({ "workspace_id": workspace_id, "board": board }),
    )
    .await;
    assert_ok(&statuses, "list statuses");
    assert_eq!(statuses["structuredContent"]["doneColumn"], "done");
    let board_document_id = statuses["structuredContent"]["documentId"]
        .as_str()
        .unwrap();
    let board_hash = statuses["structuredContent"]["contentHash"]
        .as_str()
        .unwrap();
    let changed = kanban_tool_call(
        app.clone(),
        &token,
        "set_board_statuses",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "board_document_id": board_document_id,
            "base_content_hash": board_hash,
            "statuses": [
                { "key": "todo", "name": "Backlog" },
                { "key": "done", "name": "Done" }
            ],
            "fallback_status": "todo"
        }),
    )
    .await;
    assert_ok(&changed, "unpinned set statuses");
    assert_eq!(changed["structuredContent"]["applied"], true);
    assert_eq!(changed["structuredContent"]["doneColumn"], "done");

    let stale_delete = kanban_tool_call(
        app.clone(),
        &token,
        "delete_card",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "document_id": document_id,
            "base_content_hash": updated["structuredContent"]["contentHash"]
        }),
    )
    .await;
    assert_eq!(stale_delete["isError"], true);
    assert!(tool_text(&stale_delete).contains("stale baseContentHash"));

    let cards = kanban_tool_call(
        app.clone(),
        &token,
        "list_cards",
        json!({ "workspace_id": workspace_id, "board": board }),
    )
    .await;
    let fresh_hash = cards["structuredContent"]
        .as_array()
        .unwrap()
        .iter()
        .find(|card| card["documentId"] == document_id)
        .unwrap()["contentHash"]
        .as_str()
        .unwrap();
    let deleted = kanban_tool_call(
        app,
        &token,
        "delete_card",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "document_id": document_id,
            "base_content_hash": fresh_hash
        }),
    )
    .await;
    assert_ok(&deleted, "unpinned delete");
    assert_eq!(deleted["structuredContent"]["recovery"], "workspace-trash");
}

#[tokio::test]
async fn mcp_statuses_preserve_done_column_and_board_metadata_with_cas() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let workspace_id = common::create_workspace(app.clone(), &token, &common::wname()).await;
    let board = format!("b_{}", common::uid());
    let saved = common::save_doc(
        app.clone(),
        &token,
        &workspace_id,
        "project.board",
        &json!({
            "id": board,
            "title": "Project delivery",
            "columns": [
                { "key": "todo", "name": "To do" },
                { "key": "doing", "name": "Doing" },
                { "key": "done", "name": "Done" }
            ],
            "groupBy": "assignee",
            "project": { "key": "phoenix", "cadence": "weekly" },
            "filters": { "priority": ["high"] }
        })
        .to_string(),
    )
    .await;
    let board_document_id = saved["documentId"].as_str().unwrap().to_string();

    let listed = kanban_tool_call(
        app.clone(),
        &token,
        "list_statuses",
        json!({ "workspace_id": workspace_id, "board": board }),
    )
    .await;
    assert_ok(&listed, "list legacy statuses");
    assert_eq!(listed["structuredContent"]["doneColumn"], "done");
    let original_hash = listed["structuredContent"]["contentHash"]
        .as_str()
        .unwrap()
        .to_string();

    let camel_case_done = kanban_tool_call(
        app.clone(),
        &token,
        "set_board_statuses",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "board_document_id": board_document_id,
            "base_content_hash": original_hash,
            "statuses": [
                { "key": "todo", "name": "To do" },
                { "key": "done", "name": "Done" }
            ],
            "doneColumn": "todo"
        }),
    )
    .await;
    assert_eq!(camel_case_done["isError"], true);
    assert!(tool_text(&camel_case_done).contains("use snake_case 'done_status'"));

    let removed_done = kanban_tool_call(
        app.clone(),
        &token,
        "set_board_statuses",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "board_document_id": board_document_id,
            "base_content_hash": original_hash,
            "statuses": [
                { "key": "todo", "name": "To do" },
                { "key": "doing", "name": "Doing" }
            ]
        }),
    )
    .await;
    assert_eq!(removed_done["isError"], true);
    assert!(tool_text(&removed_done).contains("without selecting done_status"));

    let unknown_done = kanban_tool_call(
        app.clone(),
        &token,
        "set_board_statuses",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "board_document_id": board_document_id,
            "base_content_hash": original_hash,
            "statuses": [
                { "key": "todo", "name": "To do" },
                { "key": "done", "name": "Done" }
            ],
            "done_status": "missing"
        }),
    )
    .await;
    assert_eq!(unknown_done["isError"], true);
    assert!(tool_text(&unknown_done).contains("must exist in the new status list"));

    let migrated = kanban_tool_call(
        app.clone(),
        &token,
        "set_board_statuses",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "board_document_id": board_document_id,
            "base_content_hash": original_hash,
            "statuses": [
                { "key": "todo", "name": "Backlog" },
                { "key": "doing", "name": "In progress" },
                { "key": "shipped", "name": "Shipped" }
            ],
            "done_status": "shipped"
        }),
    )
    .await;
    assert_ok(&migrated, "migrate done status");
    assert_eq!(migrated["structuredContent"]["applied"], true);
    assert_eq!(migrated["structuredContent"]["doneColumn"], "shipped");
    let migrated_hash = migrated["structuredContent"]["contentHash"]
        .as_str()
        .unwrap()
        .to_string();

    let preserved = kanban_tool_call(
        app.clone(),
        &token,
        "set_board_statuses",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "board_document_id": board_document_id,
            "base_content_hash": migrated_hash,
            "statuses": [
                { "key": "todo", "name": "Ready" },
                { "key": "doing", "name": "Building" },
                { "key": "shipped", "name": "Released" }
            ]
        }),
    )
    .await;
    assert_ok(&preserved, "preserve done status");
    assert_eq!(preserved["structuredContent"]["doneColumn"], "shipped");

    let stale = kanban_tool_call(
        app.clone(),
        &token,
        "set_board_statuses",
        json!({
            "workspace_id": workspace_id,
            "board": board,
            "board_document_id": board_document_id,
            "base_content_hash": original_hash,
            "statuses": [
                { "key": "todo", "name": "To do" },
                { "key": "shipped", "name": "Shipped" }
            ],
            "done_status": "todo"
        }),
    )
    .await;
    assert_eq!(stale["isError"], true);
    assert!(tool_text(&stale).contains("stale baseContentHash"));

    let (status, board_doc) = common::req(
        app,
        "GET",
        &format!("/api/v1/workspaces/{workspace_id}/documents/{board_document_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{board_doc}");
    let persisted: Value = serde_json::from_str(board_doc["content"].as_str().unwrap()).unwrap();
    assert_eq!(persisted["doneColumn"], "shipped");
    assert_eq!(persisted["groupBy"], "assignee");
    assert_eq!(persisted["project"]["key"], "phoenix");
    assert_eq!(persisted["project"]["cadence"], "weekly");
    assert_eq!(persisted["filters"]["priority"], json!(["high"]));
    assert_eq!(persisted["columns"][0]["name"], "Ready");
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
