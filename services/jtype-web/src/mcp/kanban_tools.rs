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

fn pinned_tool(
    name: &str,
    description: &str,
    properties: Value,
    required: &[&str],
    output_schema: Value,
) -> Value {
    json!({
        "name": name,
        "description": description,
        "inputSchema": {
            "type": "object",
            "properties": properties,
            "required": required,
            "additionalProperties": false
        },
        "outputSchema": output_schema
    })
}

fn p_str(desc: &str) -> Value {
    json!({ "type": "string", "description": desc })
}

fn card_output_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "documentId": { "type": "string" },
            "relativePath": { "type": "string" },
            "boardId": { "type": "string" },
            "title": { "type": "string" },
            "body": { "type": "string" },
            "status": { "type": "string" },
            "position": { "type": "integer" },
            "priority": { "type": ["string", "null"] },
            "assignee": { "type": ["string", "null"] },
            "due": { "type": ["string", "null"] },
            "parent": { "type": ["string", "null"] },
            "contentHash": { "type": "string" },
            "versionId": { "type": "string" },
            "updatedClock": { "type": "integer" }
        },
        "required": [
            "documentId", "relativePath", "boardId", "title", "body", "status",
            "position", "contentHash", "versionId", "updatedClock"
        ],
        "additionalProperties": false
    })
}

fn comment_output_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "id": { "type": "string" },
            "documentId": { "type": "string" },
            "authorUserId": { "type": "string" },
            "author": { "type": ["string", "null"] },
            "body": { "type": "string" },
            "parentId": { "type": ["string", "null"] },
            "resolvedAt": { "type": ["string", "null"] },
            "resolvedBy": { "type": ["string", "null"] },
            "reactions": { "type": "array", "items": { "type": "object" } },
            "createdAt": { "type": "string" },
            "updatedAt": { "type": "string" }
        },
        "required": [
            "id", "documentId", "authorUserId", "body", "reactions",
            "createdAt", "updatedAt"
        ],
        "additionalProperties": false
    })
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
                "parent": p_str("Optional parent card reference (relative path without .md; unique legacy basename accepted) — makes this a sub-card"),
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
            "Update a card's fields (status/priority/assignee/due/parent). An empty string clears a field.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "path": p_str("Card note path"),
                "status": p_str("New column key"),
                "priority": json!({ "type": "string", "enum": ["none","low","medium","high","urgent"] }),
                "assignee": p_str("New assignee, or empty string to clear"),
                "due": p_str("New due date, or empty string to clear"),
                "parent": p_str("Parent card reference (relative path without .md; unique legacy basename accepted), or empty string to detach"),
            }),
            &["workspace_id", "path"]
        ),
        tool(
            "list_card_comments",
            "List the comment threads on a card (cloud comments; includes replies, reactions, resolve state).",
            json!({
                "workspace_id": p_str("Workspace id"),
                "path": p_str("Card note path (from list_cards)"),
            }),
            &["workspace_id", "path"]
        ),
        tool(
            "comment_card",
            "Add a comment to a card. Pass parent_id (a root comment id) to reply in that thread.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "path": p_str("Card note path"),
                "body": p_str("Comment body (Markdown)"),
                "parent_id": p_str("Optional root comment id to reply to"),
            }),
            &["workspace_id", "path", "body"]
        ),
        tool(
            "resolve_card_comment",
            "Resolve or unresolve a comment thread on a card.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "comment_id": p_str("Comment id (root or reply — resolves the thread root)"),
                "resolved": json!({ "type": "boolean", "description": "true to resolve, false to reopen" }),
            }),
            &["workspace_id", "comment_id"]
        ),
    ])
}

/// Tool catalog for `/mcp/kanban/{workspace_id}/{board}`. The URL and token
/// grant provide board authority, so scope identifiers are deliberately absent
/// from every input schema.
pub fn pinned_catalog() -> Value {
    let card = card_output_schema();
    let comment = comment_output_schema();
    let comments = json!({
        "type": "object",
        "properties": {
            "documentId": { "type": "string" },
            "comments": { "type": "array", "items": comment.clone() }
        },
        "required": ["documentId", "comments"],
        "additionalProperties": false
    });
    json!([
        pinned_tool(
            "get_board",
            "Get this pinned board and its cards. The board cannot be overridden.",
            json!({}),
            &[],
            json!({
                "type": "object",
                "properties": {
                    "board": { "type": "object" },
                    "cards": { "type": "array", "items": card.clone() }
                },
                "required": ["board", "cards"],
                "additionalProperties": false
            })
        ),
        pinned_tool(
            "list_cards",
            "List cards on this pinned board, optionally filtered by status.",
            json!({ "status": p_str("Optional board column key") }),
            &[],
            json!({
                "type": "object",
                "properties": { "cards": { "type": "array", "items": card.clone() } },
                "required": ["cards"],
                "additionalProperties": false
            })
        ),
        pinned_tool(
            "get_card",
            "Get a card on this pinned board by its document id (stable while the card exists).",
            json!({ "document_id": p_str("Card documentId from create_card or list_cards") }),
            &["document_id"],
            card.clone()
        ),
        pinned_tool(
            "create_card",
            "Create a card on this pinned board. Returns its documentId for later calls.",
            json!({
                "status": p_str("Target board column key"),
                "title": p_str("Card title"),
                "body": p_str("Optional Markdown body"),
                "priority": json!({ "type": "string", "enum": ["none","low","medium","high","urgent"] }),
                "assignee": p_str("Optional assignee"),
                "due": p_str("Optional due date (YYYY-MM-DD)"),
                "parent": p_str("Optional parent card reference (relative path without .md; unique legacy basename accepted)")
            }),
            &["status", "title"],
            card.clone()
        ),
        pinned_tool(
            "update_card",
            "Update title, Markdown body, or fields on a card on this pinned board. Empty optional fields clear them.",
            json!({
                "document_id": p_str("Card document id from create_card or list_cards"),
                "title": p_str("New card title"),
                "body": p_str("New Markdown body"),
                "status": p_str("New board column key"),
                "priority": json!({ "type": "string", "enum": ["none","low","medium","high","urgent"] }),
                "assignee": p_str("New assignee, or empty string to clear"),
                "due": p_str("New due date, or empty string to clear"),
                "parent": p_str("Parent card reference (relative path without .md; unique legacy basename accepted), or empty string to detach")
            }),
            &["document_id"],
            card.clone()
        ),
        pinned_tool(
            "move_card",
            "Move a card on this pinned board to another column.",
            json!({
                "document_id": p_str("Card document id from create_card or list_cards"),
                "to": p_str("Destination board column key"),
                "position": { "type": "integer", "minimum": 0 }
            }),
            &["document_id", "to"],
            card.clone()
        ),
        pinned_tool(
            "list_card_comments",
            "List comment threads on a card on this pinned board.",
            json!({ "document_id": p_str("Stable card document id") }),
            &["document_id"],
            comments
        ),
        pinned_tool(
            "comment_card",
            "Add a comment to a card on this pinned board.",
            json!({
                "document_id": p_str("Stable card document id"),
                "body": p_str("Comment body (Markdown)"),
                "parent_id": p_str("Optional root comment id to reply to")
            }),
            &["document_id", "body"],
            comment.clone()
        ),
        pinned_tool(
            "resolve_card_comment",
            "Resolve or reopen a comment thread belonging to this pinned board.",
            json!({
                "comment_id": p_str("Comment id"),
                "resolved": { "type": "boolean", "description": "true to resolve, false to reopen" }
            }),
            &["comment_id"],
            comment
        )
    ])
}

/// Execute a kanban tool call, returning an MCP `CallToolResult`.
pub async fn call(st: &McpState, token: &str, name: &str, args: Value) -> Value {
    match run(st, token, name, &args).await {
        Ok(text) => json!({ "content": [{ "type": "text", "text": text }], "isError": false }),
        Err(msg) => json!({ "content": [{ "type": "text", "text": msg }], "isError": true }),
    }
}

/// Execute a tool on the board-scoped server. Successful results use MCP
/// structured output while retaining JSON text for older clients.
pub async fn call_pinned(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
    name: &str,
    args: Value,
) -> Value {
    match run_pinned(st, token, workspace_id, board, name, &args).await {
        Ok(value) => {
            let text = pretty(&value).unwrap_or_else(|_| value.to_string());
            json!({
                "content": [{ "type": "text", "text": text }],
                "structuredContent": value,
                "isError": false
            })
        }
        Err(msg) => json!({
            "content": [{ "type": "text", "text": msg }],
            "isError": true
        }),
    }
}

async fn run_pinned(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
    name: &str,
    args: &Value,
) -> Result<Value, String> {
    validate_pinned_arguments(name, args)?;
    match name {
        "get_board" => {
            let cfg = require_board(st, token, workspace_id, board).await?;
            let cards = collect_cards(st, token, workspace_id, board).await?;
            Ok(json!({ "board": cfg, "cards": cards }))
        }
        "list_cards" => {
            let mut cards = collect_cards(st, token, workspace_id, board).await?;
            if let Some(status) = opt(args, "status") {
                validate_status(st, token, workspace_id, board, &status).await?;
                cards.retain(|card| {
                    card.get("status").and_then(Value::as_str) == Some(status.as_str())
                });
            }
            Ok(json!({ "cards": cards }))
        }
        "get_card" => {
            let document_id = req(args, "document_id")?;
            let doc = require_card(st, token, workspace_id, board, &document_id).await?;
            card_value(&doc, board)
        }
        "create_card" => {
            let status = req(args, "status")?;
            let title = req(args, "title")?;
            let cfg = require_board(st, token, workspace_id, board).await?;
            ensure_status_in_config(&cfg, &status)?;

            let bpath = cfg.get("path").and_then(Value::as_str).unwrap_or("");
            let dir = bpath.strip_suffix(".board").unwrap_or(bpath);
            let cards = collect_cards(st, token, workspace_id, board).await?;
            let next_position = cards
                .iter()
                .filter(|card| card.get("status").and_then(Value::as_str) == Some(status.as_str()))
                .filter_map(|card| card.get("position").and_then(Value::as_i64))
                .max()
                .map(|position| position + 1)
                .unwrap_or(0);

            // `body` means Markdown body, never caller-controlled frontmatter.
            // Build canonical frontmatter first, then append/replace the body so
            // a body beginning with `---` cannot inject a second board field.
            let body = args.get("body").and_then(Value::as_str);
            let mut content = format!("# {title}\n");
            content = jtype_core::set_frontmatter_field(&content, "title", Some(&title));
            content = jtype_core::set_frontmatter_field(&content, "board", Some(board));
            content = jtype_core::set_frontmatter_field(&content, "status", Some(&status));
            content = jtype_core::set_frontmatter_field(
                &content,
                "position",
                Some(&next_position.to_string()),
            );
            for key in ["priority", "assignee", "due"] {
                if let Some(value) = opt(args, key) {
                    content = jtype_core::set_frontmatter_field(&content, key, Some(&value));
                }
            }
            if let Some(parent) = opt(args, "parent") {
                content = jtype_core::set_frontmatter_field(
                    &content,
                    "parent",
                    Some(&format!("[[{parent}]]")),
                );
            }
            if let Some(body) = body {
                content = replace_card_body(&content, body);
            }

            let slug = slugify(&title);
            let mut relative_path = format!("{dir}/{slug}.md");
            let mut suffix = 2;
            while get_doc(st, token, workspace_id, &relative_path)
                .await
                .is_ok()
            {
                relative_path = format!("{dir}/{slug}-{suffix}.md");
                suffix += 1;
            }
            ensure_card_content_board(&content, board)?;
            let saved = loop {
                match api_post(
                    st,
                    token,
                    &format!("/api/v1/workspaces/{workspace_id}/documents/save"),
                    json!({
                        "relativePath": relative_path,
                        "title": title,
                        "content": content,
                        "createOnly": true
                    }),
                )
                .await
                {
                    Ok(saved) => break saved,
                    Err(error)
                        if error.contains("document path already exists") && suffix < 10_000 =>
                    {
                        relative_path = format!("{dir}/{slug}-{suffix}.md");
                        suffix += 1;
                    }
                    Err(error) => return Err(error),
                }
            };
            let document_id = saved
                .get("documentId")
                .and_then(Value::as_str)
                .ok_or("create_card response has no documentId")?;
            let doc = require_card(st, token, workspace_id, board, document_id).await?;
            card_value(&doc, board)
        }
        "update_card" => {
            let document_id = req(args, "document_id")?;
            let doc = require_card(st, token, workspace_id, board, &document_id).await?;
            let mut content = doc
                .get("content")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            let mut touched = false;

            if let Some(title) = args.get("title").and_then(Value::as_str) {
                if title.trim().is_empty() {
                    return Err("update_card: title cannot be empty".into());
                }
                content = jtype_core::set_frontmatter_field(&content, "title", Some(title));
                touched = true;
            }
            if let Some(body) = args.get("body").and_then(Value::as_str) {
                content = replace_card_body(&content, body);
                touched = true;
            }
            for key in ["status", "priority", "assignee", "due"] {
                if let Some(value) = args.get(key).and_then(Value::as_str) {
                    if key == "status" {
                        validate_status(st, token, workspace_id, board, value).await?;
                    }
                    let set = if value.is_empty() { None } else { Some(value) };
                    content = jtype_core::set_frontmatter_field(&content, key, set);
                    touched = true;
                }
            }
            if let Some(parent) = args.get("parent").and_then(Value::as_str) {
                let link = format!("[[{parent}]]");
                let set = if parent.is_empty() {
                    None
                } else {
                    Some(link.as_str())
                };
                content = jtype_core::set_frontmatter_field(&content, "parent", set);
                touched = true;
            }
            if !touched {
                return Err("update_card: provide at least one field to update".to_string());
            }
            let doc =
                save_existing_card(st, token, workspace_id, board, &document_id, &doc, content)
                    .await?;
            card_value(&doc, board)
        }
        "move_card" => {
            let document_id = req(args, "document_id")?;
            let destination = req(args, "to")?;
            validate_status(st, token, workspace_id, board, &destination).await?;
            let doc = require_card(st, token, workspace_id, board, &document_id).await?;
            let content = doc.get("content").and_then(Value::as_str).unwrap_or("");
            let mut updated =
                jtype_core::set_frontmatter_field(content, "status", Some(&destination));
            if let Some(position) = args.get("position").and_then(Value::as_i64) {
                if position < 0 {
                    return Err("move_card: position must be non-negative".into());
                }
                updated = jtype_core::set_frontmatter_field(
                    &updated,
                    "position",
                    Some(&position.to_string()),
                );
            }
            let doc =
                save_existing_card(st, token, workspace_id, board, &document_id, &doc, updated)
                    .await?;
            card_value(&doc, board)
        }
        "list_card_comments" => {
            let document_id = req(args, "document_id")?;
            require_card(st, token, workspace_id, board, &document_id).await?;
            let comments = api_get(
                st,
                token,
                &format!("/api/v1/workspaces/{workspace_id}/documents/{document_id}/comments"),
            )
            .await?;
            Ok(json!({ "documentId": document_id, "comments": comments }))
        }
        "comment_card" => {
            let document_id = req(args, "document_id")?;
            let body = req(args, "body")?;
            require_card(st, token, workspace_id, board, &document_id).await?;
            let payload = match opt(args, "parent_id") {
                Some(parent_id) => json!({ "body": body, "parentId": parent_id }),
                None => json!({ "body": body }),
            };
            api_post(
                st,
                token,
                &format!("/api/v1/workspaces/{workspace_id}/documents/{document_id}/comments"),
                payload,
            )
            .await
        }
        "resolve_card_comment" => {
            let comment_id = req(args, "comment_id")?;
            let document_id: Option<String> = sqlx::query_scalar(
                "SELECT document_id FROM card_comments WHERE id = ? AND workspace_id = ?",
            )
            .bind(&comment_id)
            .bind(workspace_id)
            .fetch_optional(&st.pool)
            .await
            .map_err(|error| error.to_string())?;
            let document_id =
                document_id.ok_or_else(|| format!("comment not found: {comment_id}"))?;
            require_card(st, token, workspace_id, board, &document_id).await?;
            let resolved = args
                .get("resolved")
                .and_then(Value::as_bool)
                .unwrap_or(true);
            api_post(
                st,
                token,
                &format!("/api/v1/workspaces/{workspace_id}/comments/{comment_id}/resolve"),
                json!({ "resolved": resolved }),
            )
            .await
        }
        other => Err(format!("unknown tool on pinned board server: {other}")),
    }
}

fn validate_pinned_arguments(name: &str, args: &Value) -> Result<(), String> {
    let object = args
        .as_object()
        .ok_or_else(|| "tool arguments must be an object".to_string())?;
    let allowed: &[&str] = match name {
        "get_board" => &[],
        "list_cards" => &["status"],
        "get_card" | "list_card_comments" => &["document_id"],
        "create_card" => &[
            "status", "title", "body", "priority", "assignee", "due", "parent",
        ],
        "update_card" => &[
            "document_id",
            "title",
            "body",
            "status",
            "priority",
            "assignee",
            "due",
            "parent",
        ],
        "move_card" => &["document_id", "to", "position"],
        "comment_card" => &["document_id", "body", "parent_id"],
        "resolve_card_comment" => &["comment_id", "resolved"],
        _ => return Ok(()),
    };
    if let Some(key) = object.keys().find(|key| !allowed.contains(&key.as_str())) {
        return Err(format!(
            "{name}: unexpected argument '{key}'; this endpoint's workspace and board cannot be overridden"
        ));
    }

    let string_fields: &[&str] = match name {
        "list_cards" => &["status"],
        "get_card" | "list_card_comments" => &["document_id"],
        "create_card" => &[
            "status", "title", "body", "priority", "assignee", "due", "parent",
        ],
        "update_card" => &[
            "document_id",
            "title",
            "body",
            "status",
            "priority",
            "assignee",
            "due",
            "parent",
        ],
        "move_card" => &["document_id", "to"],
        "comment_card" => &["document_id", "body", "parent_id"],
        "resolve_card_comment" => &["comment_id"],
        _ => &[],
    };
    for field in string_fields {
        if object.get(*field).is_some_and(|value| !value.is_string()) {
            return Err(format!("{name}: '{field}' must be a string"));
        }
    }

    if let Some(priority) = object.get("priority").and_then(Value::as_str) {
        if !["none", "low", "medium", "high", "urgent"].contains(&priority) {
            return Err(format!("{name}: invalid priority '{priority}'"));
        }
    }
    if let Some(position) = object.get("position") {
        if position.as_i64().is_none() || position.as_i64().is_some_and(|value| value < 0) {
            return Err(format!("{name}: 'position' must be a non-negative integer"));
        }
    }
    if object
        .get("resolved")
        .is_some_and(|value| !value.is_boolean())
    {
        return Err(format!("{name}: 'resolved' must be a boolean"));
    }

    // Frontmatter is line-oriented. Never allow a scalar argument to create a
    // second YAML key; otherwise a value such as "x\nboard: other" could move
    // a card after the board check but before the post-save verification.
    for field in [
        "document_id",
        "comment_id",
        "parent_id",
        "status",
        "title",
        "priority",
        "assignee",
        "due",
        "parent",
        "to",
    ] {
        if let Some(value) = object.get(field).and_then(Value::as_str) {
            if value.contains(['\r', '\n', '\0']) {
                return Err(format!("{name}: '{field}' contains a forbidden control character"));
            }
            if matches!(field, "document_id" | "comment_id" | "parent_id") && value.is_empty() {
                return Err(format!("{name}: '{field}' cannot be empty"));
            }
        }
    }
    Ok(())
}

async fn require_board(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
) -> Result<Value, String> {
    collect_boards(st, token, workspace_id)
        .await?
        .into_iter()
        .find(|candidate| candidate.get("id").and_then(Value::as_str) == Some(board))
        .ok_or_else(|| format!("no board with id '{board}'"))
}

fn ensure_status_in_config(config: &Value, status: &str) -> Result<(), String> {
    let exists = config
        .get("columns")
        .and_then(Value::as_array)
        .map(|columns| {
            columns
                .iter()
                .any(|column| column.get("key").and_then(Value::as_str) == Some(status))
        })
        .unwrap_or(false);
    if exists {
        Ok(())
    } else {
        Err(format!("board has no column with key '{status}'"))
    }
}

async fn validate_status(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
    status: &str,
) -> Result<(), String> {
    let config = require_board(st, token, workspace_id, board).await?;
    ensure_status_in_config(&config, status)
}

async fn require_card(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
    document_id: &str,
) -> Result<Value, String> {
    let doc = api_get(
        st,
        token,
        &format!("/api/v1/workspaces/{workspace_id}/documents/{document_id}"),
    )
    .await?;
    let returned_id = doc
        .get("documentId")
        .and_then(Value::as_str)
        .ok_or("document response has no documentId")?;
    if returned_id != document_id {
        return Err("document response id does not match the requested card".into());
    }
    let relative_path = doc
        .get("relativePath")
        .and_then(Value::as_str)
        .unwrap_or("");
    if !relative_path.ends_with(".md") {
        return Err(format!("document is not a card: {document_id}"));
    }
    let content = doc.get("content").and_then(Value::as_str).unwrap_or("");
    let frontmatter = jtype_core::parse_frontmatter(content);
    if frontmatter.get("board").map(String::as_str) != Some(board) {
        return Err(format!(
            "card {document_id} does not belong to the pinned board"
        ));
    }
    Ok(doc)
}

fn card_value(doc: &Value, board: &str) -> Result<Value, String> {
    let document_id = doc
        .get("documentId")
        .and_then(Value::as_str)
        .ok_or("card has no documentId")?;
    let relative_path = doc
        .get("relativePath")
        .and_then(Value::as_str)
        .ok_or("card has no relativePath")?;
    let content = doc.get("content").and_then(Value::as_str).unwrap_or("");
    let frontmatter = jtype_core::parse_frontmatter(content);
    if frontmatter.get("board").map(String::as_str) != Some(board) {
        return Err(format!(
            "card {document_id} does not belong to board '{board}'"
        ));
    }
    let title = frontmatter
        .get("title")
        .cloned()
        .filter(|title| !title.is_empty())
        .unwrap_or_else(|| card_title(content, relative_path));
    let parent = frontmatter
        .get("parent")
        .map(|value| jtype_core::parse_card_links(value))
        .and_then(|links| links.into_iter().next());
    Ok(json!({
        "documentId": document_id,
        "relativePath": relative_path,
        "boardId": board,
        "title": title,
        "body": card_body(content),
        "status": frontmatter.get("status").cloned().unwrap_or_default(),
        "position": frontmatter
            .get("position")
            .and_then(|value| value.parse::<i64>().ok())
            .unwrap_or(0),
        "priority": frontmatter.get("priority").cloned(),
        "assignee": frontmatter.get("assignee").cloned(),
        "due": frontmatter.get("due").cloned(),
        "parent": parent,
        "contentHash": doc.get("contentHash").cloned().unwrap_or(Value::String(String::new())),
        "versionId": doc.get("versionId").cloned().unwrap_or(Value::String(String::new())),
        "updatedClock": doc.get("updatedClock").cloned().unwrap_or(json!(0))
    }))
}

fn card_body(content: &str) -> String {
    let normalized = content.replace("\r\n", "\n");
    if let Some(rest) = normalized.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---") {
            return rest[end + 4..].trim_start_matches('\n').to_string();
        }
    }
    normalized
}

fn replace_card_body(content: &str, body: &str) -> String {
    let normalized = content.replace("\r\n", "\n");
    if normalized.starts_with("---\n") {
        if let Some(end) = normalized[4..].find("\n---\n") {
            let prefix_end = 4 + end + "\n---\n".len();
            return format!("{}{}", &normalized[..prefix_end], body);
        }
        if let Some(end) = normalized[4..].find("\n---") {
            let prefix_end = 4 + end + "\n---".len();
            return format!("{}\n{}", &normalized[..prefix_end], body);
        }
    }
    body.to_string()
}

async fn save_existing_card(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
    document_id: &str,
    current: &Value,
    content: String,
) -> Result<Value, String> {
    ensure_card_content_board(&content, board)?;
    let relative_path = current
        .get("relativePath")
        .and_then(Value::as_str)
        .ok_or("card has no relativePath")?;
    let base_content_hash = current
        .get("contentHash")
        .and_then(Value::as_str)
        .ok_or("card has no contentHash")?;
    let title = jtype_core::parse_frontmatter(&content)
        .get("title")
        .cloned()
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| card_title(&content, relative_path));
    let saved = api_post(
        st,
        token,
        &format!("/api/v1/workspaces/{workspace_id}/documents/save"),
        json!({
            "documentId": document_id,
            "relativePath": relative_path,
            "title": title,
            "content": content,
            "baseContentHash": base_content_hash
        }),
    )
    .await?;
    let saved_id = saved
        .get("documentId")
        .and_then(Value::as_str)
        .ok_or("save response has no documentId")?;
    if saved_id != document_id {
        return Err("save changed the card documentId".into());
    }
    require_card(st, token, workspace_id, board, document_id).await
}

fn ensure_card_content_board(content: &str, board: &str) -> Result<(), String> {
    let frontmatter = jtype_core::parse_frontmatter(content);
    if frontmatter.get("board").map(String::as_str) == Some(board) {
        Ok(())
    } else {
        Err("card content does not belong to the pinned board".to_string())
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
            let mut cards = collect_cards(st, token, &ws, &board).await?;
            add_legacy_paths(&mut cards);
            pretty(&json!({ "board": cfg, "cards": cards }))
        }
        "list_cards" => {
            let ws = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let mut cards = collect_cards(st, token, &ws, &board).await?;
            if let Some(status) = opt(args, "status") {
                cards.retain(|c| c.get("status").and_then(|v| v.as_str()) == Some(status.as_str()));
            }
            add_legacy_paths(&mut cards);
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
            content = jtype_core::set_frontmatter_field(
                &content,
                "position",
                Some(&next_pos.to_string()),
            );
            if let Some(v) = opt(args, "priority") {
                content = jtype_core::set_frontmatter_field(&content, "priority", Some(&v));
            }
            if let Some(v) = opt(args, "assignee") {
                content = jtype_core::set_frontmatter_field(&content, "assignee", Some(&v));
            }
            if let Some(v) = opt(args, "due") {
                content = jtype_core::set_frontmatter_field(&content, "due", Some(&v));
            }
            if let Some(v) = opt(args, "parent") {
                content = jtype_core::set_frontmatter_field(
                    &content,
                    "parent",
                    Some(&format!("[[{v}]]")),
                );
            }

            // Don't clobber an existing card whose title slugifies the same: the
            // save path overwrites by relative_path, so probe and suffix -2, -3, …
            let slug = slugify(&title);
            let mut rel = format!("{dir}/{slug}.md");
            let mut n = 2;
            while get_doc(st, token, &ws, &rel).await.is_ok() {
                rel = format!("{dir}/{slug}-{n}.md");
                n += 1;
            }
            let res = api_post(
                st,
                token,
                &format!("/api/v1/workspaces/{ws}/documents/save"),
                json!({ "relativePath": rel, "content": content }),
            )
            .await?;
            Ok(format!(
                "Created card '{title}' at {rel}.\n{}",
                pretty(&res)?
            ))
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
                updated =
                    jtype_core::set_frontmatter_field(&updated, "position", Some(&p.to_string()));
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
            // Key off presence (not opt(), which drops empty strings) so an
            // explicit "" clears the field, as documented; an omitted key is a no-op.
            for key in ["status", "priority", "assignee", "due"] {
                if let Some(v) = args.get(key).and_then(|v| v.as_str()) {
                    let set = if v.is_empty() { None } else { Some(v) };
                    content = jtype_core::set_frontmatter_field(&content, key, set);
                    touched = true;
                }
            }
            // Parent slugs serialize as wikilinks, matching the board UI.
            if let Some(v) = args.get("parent").and_then(|v| v.as_str()) {
                let link = format!("[[{v}]]");
                let set = if v.is_empty() {
                    None
                } else {
                    Some(link.as_str())
                };
                content = jtype_core::set_frontmatter_field(&content, "parent", set);
                touched = true;
            }
            if !touched {
                return Err(
                    "update_card: provide at least one of status/priority/assignee/due/parent"
                        .into(),
                );
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
        "list_card_comments" => {
            let ws = req(args, "workspace_id")?;
            let path = req(args, "path")?;
            let doc = get_doc(st, token, &ws, &path).await?;
            let doc_id = doc
                .get("documentId")
                .and_then(|v| v.as_str())
                .ok_or("card has no documentId")?;
            let comments = api_get(
                st,
                token,
                &format!("/api/v1/workspaces/{ws}/documents/{doc_id}/comments"),
            )
            .await?;
            pretty(&comments)
        }
        "comment_card" => {
            let ws = req(args, "workspace_id")?;
            let path = req(args, "path")?;
            let body = req(args, "body")?;
            let doc = get_doc(st, token, &ws, &path).await?;
            let doc_id = doc
                .get("documentId")
                .and_then(|v| v.as_str())
                .ok_or("card has no documentId")?;
            let payload = match opt(args, "parent_id") {
                Some(pid) => json!({ "body": body, "parentId": pid }),
                None => json!({ "body": body }),
            };
            let res = api_post(
                st,
                token,
                &format!("/api/v1/workspaces/{ws}/documents/{doc_id}/comments"),
                payload,
            )
            .await?;
            Ok(format!("Commented on {path}.\n{}", pretty(&res)?))
        }
        "resolve_card_comment" => {
            let ws = req(args, "workspace_id")?;
            let comment_id = req(args, "comment_id")?;
            let resolved = args
                .get("resolved")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            let res = api_post(
                st,
                token,
                &format!("/api/v1/workspaces/{ws}/comments/{comment_id}/resolve"),
                json!({ "resolved": resolved }),
            )
            .await?;
            Ok(pretty(&res)?)
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
            let stem = path
                .rsplit('/')
                .next()
                .unwrap_or(path)
                .trim_end_matches(".board");
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
async fn collect_cards(
    st: &McpState,
    token: &str,
    ws: &str,
    board_id: &str,
) -> Result<Vec<Value>, String> {
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
            cards.push(card_value(&doc, board_id)?);
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

fn add_legacy_paths(cards: &mut [Value]) {
    for card in cards {
        let path = card.get("relativePath").cloned();
        if let (Some(path), Some(object)) = (path, card.as_object_mut()) {
            object.insert("path".into(), path);
        }
    }
}

/// Card title = first `# ` heading in the body, else the filename stem.
fn card_title(content: &str, path: &str) -> String {
    for line in content.lines() {
        if let Some(h) = line.strip_prefix("# ") {
            return h.trim().to_string();
        }
    }
    path.rsplit('/')
        .next()
        .unwrap_or(path)
        .trim_end_matches(".md")
        .to_string()
}

/// Filename slug from a card title (alphanumerics kept lowercased, rest → hyphens).
fn slugify(title: &str) -> String {
    let mapped: String = title
        .chars()
        .map(|ch| {
            if ch.is_alphanumeric() {
                ch.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect();
    let collapsed = mapped
        .split('-')
        .filter(|p| !p.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    if collapsed.is_empty() {
        "card".to_string()
    } else {
        collapsed
    }
}
