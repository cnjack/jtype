//! Tool catalog + dispatcher for the **separate kanban MCP server** (mounted at
//! its own `/mcp/kanban` endpoint). Operates on the SAME document-backed boards
//! as desktop/CLI: a board is a `.board` JSON view file and cards are `.md` notes
//! carrying `board:` frontmatter, all stored in the vault `documents` table.
//!
//! There is no cloud kanban DB — these tools read/write `documents` (list + get +
//! save) and do the board grouping in-layer, reusing the canonical frontmatter
//! logic from `jtype-core` so a card created here parses identically on desktop.
//! Board/card scans are N+1 over the `.md`/`.board` docs (one content fetch each);
//! fine for an AI tool over a modest vault.

use serde_json::{json, Value};

use super::tools::{api_get, api_post, get_doc, opt, pretty, req};
use super::McpState;

fn tool(name: &str, description: &str, properties: Value, required: &[&str]) -> Value {
    json!({
        "name": name,
        "description": description,
        "inputSchema": { "type": "object", "properties": properties, "required": required }
    })
}

fn p_str(desc: &str) -> Value {
    json!({ "type": "string", "description": desc })
}

/// The kanban server's tool catalog (`tools/list`).
pub fn catalog() -> Value {
    json!([
        tool(
            "list_workspaces",
            "List the JType workspaces you can access. Start here to obtain a workspace_id.",
            json!({}),
            &[]
        ),
        tool(
            "list_boards",
            "List kanban boards in a workspace (the .board view files). Start here to get a board id.",
            json!({ "workspace_id": p_str("Workspace id from list_workspaces") }),
            &["workspace_id"]
        ),
        tool(
            "get_board",
            "Get a board with its columns and its cards grouped by column.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "board": p_str("Board id from list_boards"),
            }),
            &["workspace_id", "board"]
        ),
        tool(
            "list_cards",
            "List a board's cards, optionally filtered to one column (status key).",
            json!({
                "workspace_id": p_str("Workspace id"),
                "board": p_str("Board id"),
                "status": p_str("Optional column key to filter by"),
            }),
            &["workspace_id", "board"]
        ),
        tool(
            "create_card",
            "Create a card-note in a column. Writes a Markdown note with board/status frontmatter.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "board": p_str("Board id"),
                "status": p_str("Target column key"),
                "title": p_str("Card title"),
                "priority": json!({ "type": "string", "enum": ["none","low","medium","high","urgent"], "description": "Optional priority" }),
                "assignee": p_str("Optional assignee (free text or member handle)"),
                "due": p_str("Optional due date (YYYY-MM-DD)"),
            }),
            &["workspace_id", "board", "status", "title"]
        ),
        tool(
            "move_card",
            "Move a card to another column — the kanban equivalent of changing status.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "path": p_str("Card note path (from list_cards)"),
                "to": p_str("Destination column key"),
                "position": json!({ "type": "integer", "description": "Optional 0-based position in the column" }),
            }),
            &["workspace_id", "path", "to"]
        ),
        tool(
            "update_card",
            "Update a card's fields (status/priority/assignee/due). An empty string clears a field.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "path": p_str("Card note path"),
                "status": p_str("New column key"),
                "priority": json!({ "type": "string", "enum": ["none","low","medium","high","urgent"] }),
                "assignee": p_str("New assignee, or empty string to clear"),
                "due": p_str("New due date, or empty string to clear"),
            }),
            &["workspace_id", "path"]
        ),
    ])
}

/// Execute a kanban tool call, returning an MCP `CallToolResult`.
pub async fn call(st: &McpState, token: &str, name: &str, args: Value) -> Value {
    match run(st, token, name, &args).await {
        Ok(text) => json!({ "content": [{ "type": "text", "text": text }], "isError": false }),
        Err(msg) => json!({ "content": [{ "type": "text", "text": msg }], "isError": true }),
    }
}

async fn run(st: &McpState, token: &str, name: &str, args: &Value) -> Result<String, String> {
    match name {
        "list_workspaces" => {
            let body = api_get(st, token, "/api/v1/workspaces").await?;
            let ws = body.get("workspaces").cloned().unwrap_or(body);
            pretty(&ws)
        }
        "list_boards" => {
            let ws = req(args, "workspace_id")?;
            let boards = collect_boards(st, token, &ws).await?;
            pretty(&json!(boards))
        }
        "get_board" => {
            let ws = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let boards = collect_boards(st, token, &ws).await?;
            let cfg = boards
                .iter()
                .find(|b| b.get("id").and_then(|v| v.as_str()) == Some(board.as_str()))
                .ok_or_else(|| format!("no board with id '{board}'"))?
                .clone();
            let cards = collect_cards(st, token, &ws, &board).await?;
            pretty(&json!({ "board": cfg, "cards": cards }))
        }
        "list_cards" => {
            let ws = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let mut cards = collect_cards(st, token, &ws, &board).await?;
            if let Some(status) = opt(args, "status") {
                cards.retain(|c| c.get("status").and_then(|v| v.as_str()) == Some(status.as_str()));
            }
            pretty(&json!(cards))
        }
        "create_card" => {
            let ws = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let status = req(args, "status")?;
            let title = req(args, "title")?;
            let boards = collect_boards(st, token, &ws).await?;
            let b = boards
                .iter()
                .find(|b| b.get("id").and_then(|v| v.as_str()) == Some(board.as_str()))
                .ok_or_else(|| format!("no board with id '{board}'"))?;
            let bpath = b.get("path").and_then(|v| v.as_str()).unwrap_or("");
            let dir = bpath.strip_suffix(".board").unwrap_or(bpath);
            let cards = collect_cards(st, token, &ws, &board).await?;
            let next_pos = cards
                .iter()
                .filter(|c| c.get("status").and_then(|v| v.as_str()) == Some(status.as_str()))
                .filter_map(|c| c.get("position").and_then(|v| v.as_i64()))
                .max()
                .map(|m| m + 1)
                .unwrap_or(0);

            let mut content = format!("# {title}\n");
            content = jtype_core::set_frontmatter_field(&content, "board", Some(&board));
            content = jtype_core::set_frontmatter_field(&content, "status", Some(&status));
            content = jtype_core::set_frontmatter_field(&content, "position", Some(&next_pos.to_string()));
            if let Some(v) = opt(args, "priority") {
                content = jtype_core::set_frontmatter_field(&content, "priority", Some(&v));
            }
            if let Some(v) = opt(args, "assignee") {
                content = jtype_core::set_frontmatter_field(&content, "assignee", Some(&v));
            }
            if let Some(v) = opt(args, "due") {
                content = jtype_core::set_frontmatter_field(&content, "due", Some(&v));
            }

            let rel = format!("{dir}/{}.md", slugify(&title));
            let res = api_post(
                st,
                token,
                &format!("/api/v1/workspaces/{ws}/documents/save"),
                json!({ "relativePath": rel, "content": content }),
            )
            .await?;
            Ok(format!("Created card '{title}' at {rel}.\n{}", pretty(&res)?))
        }
        "move_card" => {
            let ws = req(args, "workspace_id")?;
            let path = req(args, "path")?;
            let to = req(args, "to")?;
            let doc = get_doc(st, token, &ws, &path).await?;
            let content = doc.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let rel = doc
                .get("relativePath")
                .and_then(|v| v.as_str())
                .unwrap_or(&path)
                .to_string();
            let mut updated = jtype_core::set_frontmatter_field(content, "status", Some(&to));
            if let Some(p) = args.get("position").and_then(|v| v.as_i64()) {
                updated = jtype_core::set_frontmatter_field(&updated, "position", Some(&p.to_string()));
            }
            let res = api_post(
                st,
                token,
                &format!("/api/v1/workspaces/{ws}/documents/save"),
                json!({ "relativePath": rel, "content": updated }),
            )
            .await?;
            Ok(format!("Moved card {rel} → {to}.\n{}", pretty(&res)?))
        }
        "update_card" => {
            let ws = req(args, "workspace_id")?;
            let path = req(args, "path")?;
            let doc = get_doc(st, token, &ws, &path).await?;
            let mut content = doc
                .get("content")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let rel = doc
                .get("relativePath")
                .and_then(|v| v.as_str())
                .unwrap_or(&path)
                .to_string();
            let mut touched = false;
            for key in ["status", "priority", "assignee", "due"] {
                if let Some(v) = opt(args, key) {
                    let set = if v.is_empty() { None } else { Some(v.as_str()) };
                    content = jtype_core::set_frontmatter_field(&content, key, set);
                    touched = true;
                }
            }
            if !touched {
                return Err("update_card: provide at least one of status/priority/assignee/due".into());
            }
            let res = api_post(
                st,
                token,
                &format!("/api/v1/workspaces/{ws}/documents/save"),
                json!({ "relativePath": rel, "content": content }),
            )
            .await?;
            Ok(format!("Updated card {rel}.\n{}", pretty(&res)?))
        }
        other => Err(format!("unknown tool: {other}")),
    }
}

/// Fetch every `.board` doc, parse its JSON config, and return id/title/columns/path.
async fn collect_boards(st: &McpState, token: &str, ws: &str) -> Result<Vec<Value>, String> {
    let docs = api_get(st, token, &format!("/api/v1/workspaces/{ws}/documents")).await?;
    let mut boards = Vec::new();
    if let Some(arr) = docs.as_array() {
        for d in arr {
            let path = d.get("relativePath").and_then(|v| v.as_str()).unwrap_or("");
            if !path.ends_with(".board") {
                continue;
            }
            let doc = get_doc(st, token, ws, path).await?;
            let content = doc.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let cfg: Value = serde_json::from_str(content).unwrap_or(Value::Null);
            let stem = path.rsplit('/').next().unwrap_or(path).trim_end_matches(".board");
            let id = cfg
                .get("id")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .unwrap_or(stem)
                .to_string();
            let title = cfg
                .get("title")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .unwrap_or(&id)
                .to_string();
            boards.push(json!({
                "id": id,
                "title": title,
                "path": path,
                "columns": cfg.get("columns").cloned().unwrap_or(json!([])),
            }));
        }
    }
    Ok(boards)
}

/// Fetch every `.md` doc, keep those with `board == board_id`, return card rows
/// sorted by status then position.
async fn collect_cards(st: &McpState, token: &str, ws: &str, board_id: &str) -> Result<Vec<Value>, String> {
    let docs = api_get(st, token, &format!("/api/v1/workspaces/{ws}/documents")).await?;
    let mut cards = Vec::new();
    if let Some(arr) = docs.as_array() {
        for d in arr {
            let path = d.get("relativePath").and_then(|v| v.as_str()).unwrap_or("");
            if !path.ends_with(".md") {
                continue;
            }
            let doc = get_doc(st, token, ws, path).await?;
            let content = doc.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let fm = jtype_core::parse_frontmatter(content);
            if fm.get("board").map(String::as_str) != Some(board_id) {
                continue;
            }
            let title = fm
                .get("title")
                .cloned()
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| card_title(content, path));
            let position = fm.get("position").and_then(|v| v.parse::<i64>().ok()).unwrap_or(0);
            cards.push(json!({
                "path": path,
                "title": title,
                "status": fm.get("status").cloned().unwrap_or_default(),
                "position": position,
                "priority": fm.get("priority").cloned(),
                "assignee": fm.get("assignee").cloned(),
                "due": fm.get("due").cloned(),
            }));
        }
    }
    cards.sort_by(|a, b| {
        let sa = a.get("status").and_then(|v| v.as_str()).unwrap_or("");
        let sb = b.get("status").and_then(|v| v.as_str()).unwrap_or("");
        sa.cmp(sb).then_with(|| {
            let pa = a.get("position").and_then(|v| v.as_i64()).unwrap_or(0);
            let pb = b.get("position").and_then(|v| v.as_i64()).unwrap_or(0);
            pa.cmp(&pb)
        })
    });
    Ok(cards)
}

/// Card title = first `# ` heading in the body, else the filename stem.
fn card_title(content: &str, path: &str) -> String {
    for line in content.lines() {
        if let Some(h) = line.strip_prefix("# ") {
            return h.trim().to_string();
        }
    }
    path.rsplit('/').next().unwrap_or(path).trim_end_matches(".md").to_string()
}

/// Filename slug from a card title (alphanumerics kept lowercased, rest → hyphens).
fn slugify(title: &str) -> String {
    let mapped: String = title
        .chars()
        .map(|ch| if ch.is_alphanumeric() { ch.to_ascii_lowercase() } else { '-' })
        .collect();
    let collapsed = mapped.split('-').filter(|p| !p.is_empty()).collect::<Vec<_>>().join("-");
    if collapsed.is_empty() {
        "card".to_string()
    } else {
        collapsed
    }
}
