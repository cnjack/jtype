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
        "update_note", "append_note", "list_members",
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
