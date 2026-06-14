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
    result["content"][0]["text"].as_str().unwrap_or("").to_string()
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
        "list_workspaces", "list_notes", "get_note", "search_notes", "create_note",
        "update_note", "append_note", "list_boards", "get_board", "list_cards",
        "create_card", "update_card", "move_card", "list_members",
    ] {
        assert!(names.contains(&expected), "missing tool {expected}; got {names:?}");
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
    assert!(tool_text(&r).contains("ideas/launch.md"), "search miss: {}", tool_text(&r));

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

// ── Kanban happy path ───────────────────────────────────────────────────────

#[tokio::test]
async fn mcp_kanban_roundtrip() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let ws = common::create_workspace(app.clone(), &token, &common::wname()).await;

    // Seed a board via REST (auto-creates To do / Doing / Done columns).
    let (status, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "Roadmap" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "create board: {board}");
    let board_id = board["id"].as_str().unwrap().to_string();
    let cols = board["columns"].as_array().unwrap();
    let todo_col = cols[0]["id"].as_str().unwrap().to_string();
    let doing_col = cols[1]["id"].as_str().unwrap().to_string();

    // list_boards
    let r = tool_call(app.clone(), &token, "list_boards", json!({ "workspace_id": ws })).await;
    assert_ok(&r, "list_boards");
    assert!(tool_text(&r).contains("Roadmap"));

    // get_board
    let r = tool_call(
        app.clone(),
        &token,
        "get_board",
        json!({ "workspace_id": ws, "board_id": board_id }),
    )
    .await;
    assert_ok(&r, "get_board");
    assert!(tool_text(&r).contains("Doing"));

    // list_members (resolve assignee)
    let r = tool_call(app.clone(), &token, "list_members", json!({ "workspace_id": ws })).await;
    assert_ok(&r, "list_members");
    assert!(tool_text(&r).contains(&username));

    // create_card
    let r = tool_call(
        app.clone(),
        &token,
        "create_card",
        json!({ "workspace_id": ws, "board_id": board_id, "column_id": todo_col,
                "title": "Wire up OAuth", "priority": "high" }),
    )
    .await;
    assert_ok(&r, "create_card");
    let text = tool_text(&r);
    // Extract the created card id from the embedded JSON.
    let card_json: Value = serde_json::from_str(text.splitn(2, '\n').nth(1).unwrap_or("{}"))
        .unwrap_or(json!({}));
    let card_id = card_json["id"].as_str().expect("card id").to_string();

    // list_cards (filtered to the To-do column)
    let r = tool_call(
        app.clone(),
        &token,
        "list_cards",
        json!({ "workspace_id": ws, "board_id": board_id, "column_id": todo_col }),
    )
    .await;
    assert_ok(&r, "list_cards");
    assert!(tool_text(&r).contains("Wire up OAuth"));

    // update_card (change priority + assign)
    let r = tool_call(
        app.clone(),
        &token,
        "update_card",
        json!({ "workspace_id": ws, "card_id": card_id, "priority": "urgent" }),
    )
    .await;
    assert_ok(&r, "update_card");
    assert!(tool_text(&r).contains("urgent"));

    // move_card to "Doing" (status change)
    let r = tool_call(
        app.clone(),
        &token,
        "move_card",
        json!({ "workspace_id": ws, "board_id": board_id, "card_id": card_id,
                "target_column_id": doing_col }),
    )
    .await;
    assert_ok(&r, "move_card");

    // Confirm the move via list_cards on the Doing column.
    let r = tool_call(
        app,
        &token,
        "list_cards",
        json!({ "workspace_id": ws, "board_id": board_id, "column_id": doing_col }),
    )
    .await;
    assert!(tool_text(&r).contains("Wire up OAuth"), "card not in Doing: {}", tool_text(&r));
}

// Regression: empty-string args on update_card must CLEAR (JSON null), not 400.
#[tokio::test]
async fn mcp_update_card_clears_assignee_and_due() {
    let (app, _pool) = common::setup().await;
    let username = common::uid();
    let (token, _) = common::register_user(app.clone(), &username).await;
    let ws = common::create_workspace(app.clone(), &token, &common::wname()).await;

    let (_s, members) = common::req(
        app.clone(),
        "GET",
        &format!("/api/v1/workspaces/{ws}/members"),
        Some(&token),
        None,
    )
    .await;
    let uid = members[0]["userId"].as_str().unwrap().to_string();

    let (_s, board) = common::req(
        app.clone(),
        "POST",
        &format!("/api/v1/workspaces/{ws}/kanban/boards"),
        Some(&token),
        Some(json!({ "name": "B" })),
    )
    .await;
    let board_id = board["id"].as_str().unwrap().to_string();
    let col = board["columns"][0]["id"].as_str().unwrap().to_string();

    // Create a card WITH an assignee and a due date.
    let r = tool_call(
        app.clone(),
        &token,
        "create_card",
        json!({ "workspace_id": ws, "board_id": board_id, "column_id": col,
                "title": "Assigned", "assignee_user_id": uid, "due_at": "2026-12-31 09:00:00" }),
    )
    .await;
    assert_ok(&r, "create_card w/ assignee");
    let card: Value = serde_json::from_str(tool_text(&r).splitn(2, '\n').nth(1).unwrap_or("{}"))
        .unwrap_or(json!({}));
    let card_id = card["id"].as_str().unwrap().to_string();
    assert_eq!(card["assigneeUserId"].as_str(), Some(uid.as_str()));

    // Clear both via explicit empty strings (the documented unset path).
    let r = tool_call(
        app.clone(),
        &token,
        "update_card",
        json!({ "workspace_id": ws, "card_id": card_id, "assignee_user_id": "", "due_at": "" }),
    )
    .await;
    assert_ok(&r, "update_card clear");

    let r = tool_call(
        app,
        &token,
        "list_cards",
        json!({ "workspace_id": ws, "board_id": board_id }),
    )
    .await;
    let cards: Value = serde_json::from_str(&tool_text(&r)).unwrap();
    let c = cards
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["id"] == json!(card_id))
        .unwrap();
    assert!(c["assigneeUserId"].is_null(), "assignee not cleared: {c}");
    assert!(c["dueAt"].is_null(), "due not cleared: {c}");
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
