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

use std::collections::{HashMap, HashSet};
use std::path::{Component, Path};

use serde_json::{json, Value};
use url::Url;

use super::tools::{api_delete, api_get, api_post, get_doc, opt, pretty, req};
use super::McpState;

const DEFAULT_DONE_COLUMN: &str = "done";

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

fn p_string_array(desc: &str) -> Value {
    json!({
        "type": "array",
        "description": desc,
        "items": { "type": "string" },
        "maxItems": 100,
        "uniqueItems": true
    })
}

fn statuses_input_schema() -> Value {
    json!({
        "type": "array",
        "description": "Complete ordered status list. Existing non-status board settings are preserved.",
        "minItems": 1,
        "maxItems": 50,
        "items": {
            "type": "object",
            "properties": {
                "key": p_str("Stable status key"),
                "name": p_str("User-visible status name"),
                "color": p_str("Optional color token or CSS color already used by the board")
            },
            "required": ["key", "name"],
            "additionalProperties": false
        }
    })
}

fn bulk_updates_schema(require_base_hash: bool) -> Value {
    let mut properties = serde_json::Map::new();
    properties.insert("document_id".into(), p_str("Stable card documentId"));
    if require_base_hash {
        properties.insert(
            "base_content_hash".into(),
            p_str("contentHash returned by the latest card read"),
        );
    }
    for (key, schema) in [
        ("title", p_str("New title")),
        ("body", p_str("New Markdown body")),
        ("status", p_str("New status key")),
        ("priority", p_str("New priority, or empty string to clear")),
        ("assignee", p_str("New assignee, or empty string to clear")),
        ("start", p_str("New start date, or empty string to clear")),
        ("due", p_str("New due date, or empty string to clear")),
        (
            "reminder",
            p_str("New shared reminder date, or empty string to clear"),
        ),
    ] {
        properties.insert(key.into(), schema);
    }
    properties.insert("archived".into(), json!({ "type": "boolean" }));
    properties.insert("tags".into(), p_string_array("Replacement tag labels"));
    let required = if require_base_hash {
        json!(["document_id", "base_content_hash"])
    } else {
        json!(["document_id"])
    };
    json!({
        "type": "array",
        "description": "Independent card patches. The operation is non-atomic and returns one receipt per item.",
        "minItems": 1,
        "maxItems": 100,
        "items": {
            "type": "object",
            "properties": Value::Object(properties),
            "required": required,
            "additionalProperties": false
        }
    })
}

fn generic_object_output_schema() -> Value {
    json!({ "type": "object" })
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
            "start": { "type": ["string", "null"] },
            "due": { "type": ["string", "null"] },
            "reminder": { "type": ["string", "null"] },
            "archived": { "type": "boolean" },
            "tags": { "type": "array", "items": { "type": "string" } },
            "attachments": { "type": "array", "items": { "type": "string" } },
            "blockedBy": { "type": "array", "items": { "type": "string" } },
            "blocks": { "type": "array", "items": { "type": "string" } },
            "relates": { "type": "array", "items": { "type": "string" } },
            "parent": { "type": ["string", "null"] },
            "contentHash": { "type": "string" },
            "versionId": { "type": "string" },
            "updatedClock": { "type": "integer" }
        },
        "required": [
            "documentId", "relativePath", "boardId", "title", "body", "status",
            "position", "archived", "tags", "attachments", "blockedBy",
            "blocks", "relates", "contentHash", "versionId", "updatedClock"
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
                "body": p_str("Optional Markdown body"),
                "priority": json!({ "type": "string", "enum": ["none","low","medium","high","urgent"], "description": "Optional priority" }),
                "assignee": p_str("Optional assignee (free text or member handle)"),
                "start": p_str("Optional start date (YYYY-MM-DD)"),
                "due": p_str("Optional due date (YYYY-MM-DD)"),
                "reminder": p_str("Optional shared reminder date (YYYY-MM-DD)"),
                "archived": json!({ "type": "boolean", "description": "Create archived (default false)" }),
                "tags": p_string_array("Optional tag labels"),
                "attachments": p_string_array("Optional safe https or vault-relative attachment references"),
                "parent": p_str("Optional parent card reference (relative path without .md; unique legacy basename accepted) — makes this a sub-card"),
                "blocked_by": p_string_array("Cards that block this card"),
                "blocks": p_string_array("Cards blocked by this card"),
                "relates": p_string_array("Related cards"),
            }),
            &["workspace_id", "board", "status", "title"]
        ),
        tool(
            "move_card",
            "Move a card to another column — the kanban equivalent of changing status.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "board": p_str("Board id"),
                "document_id": p_str("Stable card documentId"),
                "base_content_hash": p_str("contentHash returned by the latest card read"),
                "to": p_str("Destination column key"),
                "position": json!({ "type": "integer", "description": "Optional 0-based position in the column" }),
            }),
            &["workspace_id", "board", "document_id", "base_content_hash", "to"]
        ),
        tool(
            "update_card",
            "CAS-update a card. document_id and base_content_hash are required; an empty optional string clears that field.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "board": p_str("Board id"),
                "document_id": p_str("Stable card documentId"),
                "base_content_hash": p_str("contentHash returned by the latest card read"),
                "title": p_str("New title"),
                "body": p_str("New Markdown body"),
                "status": p_str("New column key"),
                "priority": json!({ "type": "string", "enum": ["none","low","medium","high","urgent"] }),
                "assignee": p_str("New assignee, or empty string to clear"),
                "start": p_str("New start date, or empty string to clear"),
                "due": p_str("New due date, or empty string to clear"),
                "reminder": p_str("New shared reminder date, or empty string to clear"),
                "archived": json!({ "type": "boolean" }),
                "tags": p_string_array("Replacement tag labels"),
                "attachments": p_string_array("Replacement safe attachment references"),
                "parent": p_str("Parent card reference (relative path without .md; unique legacy basename accepted), or empty string to detach"),
                "blocked_by": p_string_array("Replacement blocked-by references"),
                "blocks": p_string_array("Replacement blocks references"),
                "relates": p_string_array("Replacement related-card references"),
            }),
            &["workspace_id", "board", "document_id", "base_content_hash"]
        ),
        tool(
            "delete_card",
            "Move a card to recoverable workspace trash after checking the latest content hash.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "board": p_str("Board id"),
                "document_id": p_str("Stable card documentId"),
                "base_content_hash": p_str("contentHash returned by the latest card read")
            }),
            &["workspace_id", "board", "document_id", "base_content_hash"]
        ),
        tool(
            "set_card_labels",
            "Replace, add, or remove card labels with optimistic concurrency protection.",
            json!({
                "workspace_id": p_str("Workspace id"), "board": p_str("Board id"),
                "document_id": p_str("Stable card documentId"),
                "base_content_hash": p_str("Latest contentHash"),
                "labels": p_string_array("Label names"),
                "mode": json!({ "type": "string", "enum": ["replace", "add", "remove"] })
            }),
            &["workspace_id", "board", "document_id", "base_content_hash", "labels"]
        ),
        tool(
            "add_card_attachment",
            "Add one safe https or vault-relative attachment reference.",
            json!({
                "workspace_id": p_str("Workspace id"), "board": p_str("Board id"),
                "document_id": p_str("Stable card documentId"),
                "base_content_hash": p_str("Latest contentHash"),
                "attachment": p_str("Safe https URL or vault-relative path")
            }),
            &["workspace_id", "board", "document_id", "base_content_hash", "attachment"]
        ),
        tool(
            "remove_card_attachment",
            "Remove one attachment reference from a card.",
            json!({
                "workspace_id": p_str("Workspace id"), "board": p_str("Board id"),
                "document_id": p_str("Stable card documentId"),
                "base_content_hash": p_str("Latest contentHash"),
                "attachment": p_str("Exact attachment reference to remove")
            }),
            &["workspace_id", "board", "document_id", "base_content_hash", "attachment"]
        ),
        tool(
            "set_card_relations",
            "Set parent and dependency/related-card references. References must resolve uniquely on the same board.",
            json!({
                "workspace_id": p_str("Workspace id"), "board": p_str("Board id"),
                "document_id": p_str("Stable card documentId"),
                "base_content_hash": p_str("Latest contentHash"),
                "parent": p_str("Parent reference, or empty string to detach"),
                "blocked_by": p_string_array("Replacement blockers"),
                "blocks": p_string_array("Replacement cards this card blocks"),
                "relates": p_string_array("Replacement related cards")
            }),
            &["workspace_id", "board", "document_id", "base_content_hash"]
        ),
        tool(
            "bulk_update_cards",
            "Apply up to 100 independent CAS card patches. Non-atomic; returns a structured receipt for every item.",
            json!({
                "workspace_id": p_str("Workspace id"), "board": p_str("Board id"),
                "updates": bulk_updates_schema(true)
            }),
            &["workspace_id", "board", "updates"]
        ),
        tool(
            "list_statuses",
            "List the board's ordered statuses, doneColumn, and board document hash for a later CAS update.",
            json!({ "workspace_id": p_str("Workspace id"), "board": p_str("Board id") }),
            &["workspace_id", "board"]
        ),
        tool(
            "set_board_statuses",
            "Replace the ordered status list. done_status optionally selects the completed status. Removing a status used by cards requires fallback_status. Card migrations are non-atomic and receipted.",
            json!({
                "workspace_id": p_str("Workspace id"), "board": p_str("Board id"),
                "board_document_id": p_str("Board documentId from list_statuses/get_board"),
                "base_content_hash": p_str("Board contentHash from list_statuses/get_board"),
                "statuses": statuses_input_schema(),
                "done_status": p_str("Optional completed status key; omitted preserves the board's current doneColumn (legacy default: done)"),
                "fallback_status": p_str("Required when a removed status still contains cards")
            }),
            &["workspace_id", "board", "board_document_id", "base_content_hash", "statuses"]
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
                "start": p_str("Optional start date (YYYY-MM-DD)"),
                "due": p_str("Optional due date (YYYY-MM-DD)"),
                "reminder": p_str("Optional shared reminder date (YYYY-MM-DD)"),
                "archived": json!({ "type": "boolean" }),
                "tags": p_string_array("Optional tag labels"),
                "attachments": p_string_array("Optional safe https or vault-relative attachment references"),
                "parent": p_str("Optional parent card reference (relative path without .md; unique legacy basename accepted)"),
                "blocked_by": p_string_array("Cards that block this card"),
                "blocks": p_string_array("Cards blocked by this card"),
                "relates": p_string_array("Related cards")
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
                "start": p_str("New start date, or empty string to clear"),
                "due": p_str("New due date, or empty string to clear"),
                "reminder": p_str("New shared reminder date, or empty string to clear"),
                "archived": json!({ "type": "boolean" }),
                "tags": p_string_array("Replacement tag labels"),
                "attachments": p_string_array("Replacement safe attachment references"),
                "parent": p_str("Parent card reference (relative path without .md; unique legacy basename accepted), or empty string to detach"),
                "blocked_by": p_string_array("Replacement blockers"),
                "blocks": p_string_array("Replacement cards this card blocks"),
                "relates": p_string_array("Replacement related cards")
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
            "delete_card",
            "Move a card on this pinned board to recoverable workspace trash.",
            json!({ "document_id": p_str("Stable card document id") }),
            &["document_id"],
            generic_object_output_schema()
        ),
        pinned_tool(
            "set_card_labels",
            "Replace, add, or remove labels on a card on this pinned board.",
            json!({
                "document_id": p_str("Stable card document id"),
                "labels": p_string_array("Label names"),
                "mode": json!({ "type": "string", "enum": ["replace", "add", "remove"] })
            }),
            &["document_id", "labels"],
            card.clone()
        ),
        pinned_tool(
            "add_card_attachment",
            "Add one safe https or vault-relative attachment reference.",
            json!({
                "document_id": p_str("Stable card document id"),
                "attachment": p_str("Safe https URL or vault-relative path")
            }),
            &["document_id", "attachment"],
            card.clone()
        ),
        pinned_tool(
            "remove_card_attachment",
            "Remove one exact attachment reference.",
            json!({
                "document_id": p_str("Stable card document id"),
                "attachment": p_str("Exact attachment reference")
            }),
            &["document_id", "attachment"],
            card.clone()
        ),
        pinned_tool(
            "set_card_relations",
            "Set parent, dependency, and related-card references within this board.",
            json!({
                "document_id": p_str("Stable card document id"),
                "parent": p_str("Parent reference, or empty string to detach"),
                "blocked_by": p_string_array("Replacement blockers"),
                "blocks": p_string_array("Replacement cards this card blocks"),
                "relates": p_string_array("Replacement related cards")
            }),
            &["document_id"],
            card.clone()
        ),
        pinned_tool(
            "bulk_update_cards",
            "Apply up to 100 independent card patches. Non-atomic; returns one receipt per item.",
            json!({ "updates": bulk_updates_schema(false) }),
            &["updates"],
            generic_object_output_schema()
        ),
        pinned_tool(
            "list_statuses",
            "List this board's ordered statuses and doneColumn.",
            json!({}),
            &[],
            generic_object_output_schema()
        ),
        pinned_tool(
            "set_board_statuses",
            "Replace this board's ordered statuses. done_status optionally selects the completed status. Removing a non-empty status requires fallback_status.",
            json!({
                "statuses": statuses_input_schema(),
                "done_status": p_str("Optional completed status key; omitted preserves the board's current doneColumn (legacy default: done)"),
                "fallback_status": p_str("Required when a removed status contains cards")
            }),
            &["statuses"],
            generic_object_output_schema()
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
        Ok(value) => {
            let text = pretty(&value).unwrap_or_else(|_| value.to_string());
            json!({
                "content": [{ "type": "text", "text": text }],
                "structuredContent": value,
                "isError": false
            })
        }
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
    validate_scalar("pinned endpoint", "workspace_id", workspace_id)?;
    validate_scalar("pinned endpoint", "board", board)?;
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

            let mut content = format!("# {title}\n");
            content = jtype_core::set_frontmatter_field(&content, "board", Some(board));
            content = jtype_core::set_frontmatter_field(
                &content,
                "position",
                Some(&next_position.to_string()),
            );
            // `body` is applied after canonical frontmatter is established, so
            // a Markdown fence cannot inject a second board field.
            content = apply_card_patch(st, token, workspace_id, board, None, args, content, false)
                .await?;

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
            let content = doc
                .get("content")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            let content = apply_card_patch(
                st,
                token,
                workspace_id,
                board,
                Some(&document_id),
                args,
                content,
                true,
            )
            .await?;
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
        "delete_card" => {
            let document_id = req(args, "document_id")?;
            let doc = require_card(st, token, workspace_id, board, &document_id).await?;
            let relative_path = doc
                .get("relativePath")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string();
            api_delete(
                st,
                token,
                &format!("/api/v1/workspaces/{workspace_id}/documents/{document_id}"),
            )
            .await?;
            Ok(json!({
                "documentId": document_id,
                "relativePath": relative_path,
                "deleted": true,
                "recovery": "workspace-trash"
            }))
        }
        "set_card_labels" => {
            let document_id = req(args, "document_id")?;
            mutate_labels(st, token, workspace_id, board, &document_id, None, args).await
        }
        "add_card_attachment" | "remove_card_attachment" => {
            let document_id = req(args, "document_id")?;
            let attachment = req(args, "attachment")?;
            mutate_attachment(
                st,
                token,
                workspace_id,
                board,
                &document_id,
                None,
                &attachment,
                name == "add_card_attachment",
            )
            .await
        }
        "set_card_relations" => {
            let document_id = req(args, "document_id")?;
            set_relations(st, token, workspace_id, board, &document_id, None, args).await
        }
        "bulk_update_cards" => bulk_update(st, token, workspace_id, board, args, false).await,
        "list_statuses" => list_statuses_value(st, token, workspace_id, board).await,
        "set_board_statuses" => {
            set_board_statuses_value(st, token, workspace_id, board, None, None, args).await
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
    if let Some(key) = find_pinned_scope_override(args) {
        return Err(format!(
            "{name}: unexpected argument '{key}'; this endpoint's workspace and board cannot be overridden"
        ));
    }
    let allowed: &[&str] = match name {
        "get_board" | "list_statuses" => &[],
        "list_cards" => &["status"],
        "get_card" | "list_card_comments" => &["document_id"],
        "create_card" => &[
            "status",
            "title",
            "body",
            "priority",
            "assignee",
            "start",
            "due",
            "reminder",
            "archived",
            "tags",
            "attachments",
            "parent",
            "blocked_by",
            "blocks",
            "relates",
        ],
        "update_card" => &[
            "document_id",
            "title",
            "body",
            "status",
            "priority",
            "assignee",
            "start",
            "due",
            "reminder",
            "archived",
            "tags",
            "attachments",
            "parent",
            "blocked_by",
            "blocks",
            "relates",
        ],
        "move_card" => &["document_id", "to", "position"],
        "delete_card" => &["document_id"],
        "set_card_labels" => &["document_id", "labels", "mode"],
        "add_card_attachment" | "remove_card_attachment" => &["document_id", "attachment"],
        "set_card_relations" => &["document_id", "parent", "blocked_by", "blocks", "relates"],
        "bulk_update_cards" => &["updates"],
        "set_board_statuses" => &["statuses", "done_status", "fallback_status"],
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
        "get_card" | "list_card_comments" | "delete_card" => &["document_id"],
        "create_card" => &[
            "status", "title", "body", "priority", "assignee", "start", "due", "reminder", "parent",
        ],
        "update_card" => &[
            "document_id",
            "title",
            "body",
            "status",
            "priority",
            "assignee",
            "start",
            "due",
            "reminder",
            "parent",
        ],
        "move_card" => &["document_id", "to"],
        "set_card_labels" => &["document_id", "mode"],
        "add_card_attachment" | "remove_card_attachment" => &["document_id", "attachment"],
        "set_card_relations" => &["document_id", "parent"],
        "set_board_statuses" => &["done_status", "fallback_status"],
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
    if let Some(mode) = object.get("mode").and_then(Value::as_str) {
        if !["replace", "add", "remove"].contains(&mode) {
            return Err(format!("{name}: invalid label mode '{mode}'"));
        }
    }
    if let Some(position) = object.get("position") {
        if position.as_i64().is_none() || position.as_i64().is_some_and(|value| value < 0) {
            return Err(format!("{name}: 'position' must be a non-negative integer"));
        }
    }
    for field in ["resolved", "archived"] {
        if object.get(field).is_some_and(|value| !value.is_boolean()) {
            return Err(format!("{name}: '{field}' must be a boolean"));
        }
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
        "start",
        "due",
        "reminder",
        "parent",
        "to",
        "attachment",
        "done_status",
        "fallback_status",
    ] {
        if let Some(value) = object.get(field).and_then(Value::as_str) {
            if value.contains(['\r', '\n', '\0']) {
                return Err(format!(
                    "{name}: '{field}' contains a forbidden control character"
                ));
            }
            if matches!(field, "document_id" | "comment_id" | "parent_id") && value.is_empty() {
                return Err(format!("{name}: '{field}' cannot be empty"));
            }
        }
    }
    for field in [
        "tags",
        "labels",
        "attachments",
        "blocked_by",
        "blocks",
        "relates",
    ] {
        string_array_arg(args, name, field)?;
    }
    if name == "bulk_update_cards" {
        validate_bulk_update_shape(args, false)?;
    }
    if name == "set_board_statuses" {
        parse_statuses(args)?;
    }
    Ok(())
}

fn find_pinned_scope_override(value: &Value) -> Option<String> {
    const FORBIDDEN: &[&str] = &[
        "workspace_id",
        "workspaceId",
        "board",
        "board_id",
        "boardId",
        "path",
        "relativePath",
        "base_content_hash",
        "baseContentHash",
        "board_document_id",
        "boardDocumentId",
    ];
    match value {
        Value::Object(object) => {
            for (key, value) in object {
                if FORBIDDEN.contains(&key.as_str()) {
                    return Some(key.clone());
                }
                if let Some(found) = find_pinned_scope_override(value) {
                    return Some(found);
                }
            }
            None
        }
        Value::Array(values) => values.iter().find_map(find_pinned_scope_override),
        _ => None,
    }
}

fn validate_bulk_update_shape(args: &Value, require_base_hash: bool) -> Result<(), String> {
    let updates = args
        .get("updates")
        .and_then(Value::as_array)
        .ok_or("bulk_update_cards: 'updates' must be an array")?;
    if updates.is_empty() || updates.len() > 100 {
        return Err("bulk_update_cards: updates must contain between 1 and 100 items".into());
    }
    let allowed = [
        "document_id",
        "base_content_hash",
        "title",
        "body",
        "status",
        "priority",
        "assignee",
        "start",
        "due",
        "reminder",
        "archived",
        "tags",
    ];
    for (index, update) in updates.iter().enumerate() {
        let object = update
            .as_object()
            .ok_or_else(|| format!("bulk_update_cards: item {index} must be an object"))?;
        if let Some(key) = object.keys().find(|key| !allowed.contains(&key.as_str())) {
            return Err(format!(
                "bulk_update_cards: item {index} has unexpected property '{key}'"
            ));
        }
        if object.get("document_id").and_then(Value::as_str).is_none() {
            return Err(format!(
                "bulk_update_cards: item {index} requires string document_id"
            ));
        }
        if require_base_hash
            && object
                .get("base_content_hash")
                .and_then(Value::as_str)
                .is_none()
        {
            return Err(format!(
                "bulk_update_cards: item {index} requires string base_content_hash"
            ));
        }
        if !require_base_hash && object.contains_key("base_content_hash") {
            return Err(format!(
                "bulk_update_cards: item {index} cannot override base_content_hash on a pinned endpoint"
            ));
        }
        string_array_arg(update, "bulk_update_cards", "tags")?;
    }
    Ok(())
}

fn validate_unpinned_arguments(name: &str, args: &Value) -> Result<(), String> {
    let object = args
        .as_object()
        .ok_or_else(|| "tool arguments must be an object".to_string())?;
    for field in [
        "workspace_id",
        "board",
        "document_id",
        "board_document_id",
        "base_content_hash",
        "comment_id",
        "parent_id",
        "path",
        "to",
        "attachment",
        "done_status",
        "fallback_status",
    ] {
        if let Some(value) = object.get(field) {
            let value = value
                .as_str()
                .ok_or_else(|| format!("{name}: '{field}' must be a string"))?;
            validate_scalar(name, field, value)?;
            if matches!(
                field,
                "workspace_id" | "document_id" | "board_document_id" | "comment_id"
            ) && value.contains(['/', '?', '#'])
            {
                return Err(format!("{name}: '{field}' is not a valid resource id"));
            }
        }
    }
    for field in ["resolved", "archived"] {
        if object.get(field).is_some_and(|value| !value.is_boolean()) {
            return Err(format!("{name}: '{field}' must be a boolean"));
        }
    }
    for field in [
        "tags",
        "labels",
        "attachments",
        "blocked_by",
        "blocks",
        "relates",
    ] {
        string_array_arg(args, name, field)?;
    }
    if name == "bulk_update_cards" {
        validate_bulk_update_shape(args, true)?;
    }
    if name == "set_board_statuses" {
        if object.contains_key("doneColumn") {
            return Err(
                "set_board_statuses: unexpected argument 'doneColumn'; use snake_case 'done_status'"
                    .into(),
            );
        }
        parse_statuses(args)?;
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
            "card {document_id} does not belong to board '{board}'"
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
    let tags = frontmatter
        .get("tags")
        .map(|value| parse_csv_values(value, true))
        .unwrap_or_default();
    let attachments = frontmatter
        .get("attachments")
        .map(|value| parse_csv_values(value, false))
        .unwrap_or_default();
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
        "start": frontmatter.get("start").cloned(),
        "due": frontmatter.get("due").cloned(),
        "reminder": frontmatter.get("reminder").cloned(),
        "archived": frontmatter
            .get("archived")
            .is_some_and(|value| matches!(value.trim().to_ascii_lowercase().as_str(), "true" | "1" | "yes")),
        "tags": tags,
        "attachments": attachments,
        "blockedBy": frontmatter
            .get("blocked_by")
            .map(|value| jtype_core::parse_card_links(value))
            .unwrap_or_default(),
        "blocks": frontmatter
            .get("blocks")
            .map(|value| jtype_core::parse_card_links(value))
            .unwrap_or_default(),
        "relates": frontmatter
            .get("relates")
            .map(|value| jtype_core::parse_card_links(value))
            .unwrap_or_default(),
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

fn parse_csv_values(raw: &str, strip_hash: bool) -> Vec<String> {
    let mut seen = HashSet::new();
    raw.trim()
        .trim_start_matches('[')
        .trim_end_matches(']')
        .split(',')
        .filter_map(|value| {
            let value = value.trim();
            let value = if strip_hash {
                value.trim_start_matches('#').trim()
            } else {
                value
            };
            (!value.is_empty() && seen.insert(value.to_string())).then(|| value.to_string())
        })
        .collect()
}

fn serialize_csv_values(values: &[String]) -> String {
    values.join(", ")
}

fn serialize_card_links(values: &[String]) -> String {
    values
        .iter()
        .map(|value| format!("[[{value}]]"))
        .collect::<Vec<_>>()
        .join(", ")
}

fn validate_scalar(tool_name: &str, field: &str, value: &str) -> Result<(), String> {
    if value.contains(['\r', '\n', '\0']) {
        return Err(format!(
            "{tool_name}: '{field}' contains a forbidden control character"
        ));
    }
    if value.len() > 2_048 {
        return Err(format!("{tool_name}: '{field}' is too long"));
    }
    Ok(())
}

fn validate_date(tool_name: &str, field: &str, value: &str) -> Result<(), String> {
    if value.is_empty() {
        return Ok(());
    }
    let parts = value.split('-').collect::<Vec<_>>();
    if parts.len() != 3
        || parts[0].len() != 4
        || parts[1].len() != 2
        || parts[2].len() != 2
        || parts
            .iter()
            .any(|part| !part.chars().all(|ch| ch.is_ascii_digit()))
    {
        return Err(format!("{tool_name}: '{field}' must be YYYY-MM-DD"));
    }
    let year = parts[0].parse::<u32>().unwrap_or(0);
    let month = parts[1].parse::<u32>().unwrap_or(0);
    let day = parts[2].parse::<u32>().unwrap_or(0);
    let leap = year.is_multiple_of(4) && (!year.is_multiple_of(100) || year.is_multiple_of(400));
    let max_day = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => 0,
    };
    if year == 0 || day == 0 || day > max_day {
        return Err(format!(
            "{tool_name}: '{field}' is not a valid calendar date"
        ));
    }
    Ok(())
}

fn string_array_arg(
    args: &Value,
    tool_name: &str,
    field: &str,
) -> Result<Option<Vec<String>>, String> {
    let Some(value) = args.get(field) else {
        return Ok(None);
    };
    let array = value
        .as_array()
        .ok_or_else(|| format!("{tool_name}: '{field}' must be an array of strings"))?;
    if array.len() > 100 {
        return Err(format!(
            "{tool_name}: '{field}' cannot contain more than 100 items"
        ));
    }
    let mut seen = HashSet::new();
    let mut result = Vec::with_capacity(array.len());
    for value in array {
        let raw = value
            .as_str()
            .ok_or_else(|| format!("{tool_name}: '{field}' must contain only strings"))?;
        let normalized = if field == "tags" || field == "labels" {
            raw.trim().trim_start_matches('#').trim()
        } else {
            raw.trim()
        };
        validate_scalar(tool_name, field, normalized)?;
        if normalized.is_empty() {
            return Err(format!(
                "{tool_name}: '{field}' cannot contain an empty item"
            ));
        }
        if normalized.contains(',') {
            return Err(format!(
                "{tool_name}: '{field}' items cannot contain commas because frontmatter is comma-separated"
            ));
        }
        if seen.insert(normalized.to_string()) {
            result.push(normalized.to_string());
        }
    }
    Ok(Some(result))
}

fn validate_attachment_reference(value: &str) -> Result<(), String> {
    validate_scalar("attachment", "attachment", value)?;
    if value.trim() != value || value.is_empty() || value.contains(',') {
        return Err(
            "attachment must be a non-empty reference without surrounding space or commas".into(),
        );
    }
    let lowercase = value.to_ascii_lowercase();
    if ["%00", "%0a", "%0d", "%2e%2e"]
        .iter()
        .any(|encoded| lowercase.contains(encoded))
    {
        return Err("attachment contains an encoded control character or parent traversal".into());
    }
    if let Ok(parsed) = Url::parse(value) {
        return if parsed.scheme() == "https" && parsed.host_str().is_some() {
            Ok(())
        } else {
            Err("attachment URL must use https".into())
        };
    }
    if value.starts_with('/') || value.starts_with('\\') || value.contains('\\') {
        return Err("attachment path must be vault-relative and use '/' separators".into());
    }
    let path = Path::new(value);
    if path.components().any(|component| {
        matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    }) || value.split('/').any(|part| part.is_empty() || part == ".")
    {
        return Err("attachment path must be a normalized vault-relative path".into());
    }
    if value
        .split('/')
        .next()
        .is_some_and(|part| part.contains(':'))
    {
        return Err("attachment path cannot contain a URI scheme or drive prefix".into());
    }
    Ok(())
}

fn canonical_card_path(card: &Value) -> Option<String> {
    card.get("relativePath")
        .and_then(Value::as_str)
        .map(|path| path.trim_end_matches(".md").to_string())
}

fn normalize_relation_input(raw: &str) -> Result<String, String> {
    let normalized = raw
        .trim()
        .trim_start_matches("[[")
        .trim_end_matches("]]")
        .trim()
        .trim_end_matches(".md")
        .to_string();
    validate_scalar("set_card_relations", "relation", &normalized)?;
    if normalized.is_empty()
        || normalized.contains(',')
        || normalized.contains(['[', ']'])
        || normalized.starts_with('/')
        || normalized.contains('\\')
        || normalized
            .split('/')
            .any(|part| part.is_empty() || matches!(part, "." | ".."))
    {
        return Err(format!("invalid card relation reference '{raw}'"));
    }
    Ok(normalized)
}

fn resolve_relation_ref(cards: &[Value], raw: &str) -> Result<(String, String), String> {
    let normalized = normalize_relation_input(raw)?;
    let by_document_id = cards
        .iter()
        .find(|card| card.get("documentId").and_then(Value::as_str) == Some(normalized.as_str()));
    if let Some(card) = by_document_id {
        return Ok((
            card.get("documentId")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            canonical_card_path(card).unwrap_or_default(),
        ));
    }
    let exact = cards
        .iter()
        .filter(|card| canonical_card_path(card).as_deref() == Some(normalized.as_str()))
        .collect::<Vec<_>>();
    let matches = if exact.is_empty() && !normalized.contains('/') {
        cards
            .iter()
            .filter(|card| {
                canonical_card_path(card)
                    .and_then(|path| path.rsplit('/').next().map(str::to_string))
                    .as_deref()
                    == Some(normalized.as_str())
            })
            .collect::<Vec<_>>()
    } else {
        exact
    };
    match matches.as_slice() {
        [] => Err(format!(
            "card relation '{raw}' does not resolve to a card on this board"
        )),
        [card] => Ok((
            card.get("documentId")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            canonical_card_path(card).unwrap_or_default(),
        )),
        _ => Err(format!(
            "card relation '{raw}' is ambiguous; use its full board-relative path or documentId"
        )),
    }
}

fn graph_reaches_start(
    graph: &HashMap<String, Vec<String>>,
    start: &str,
    node: &str,
    visited: &mut HashSet<String>,
) -> bool {
    let Some(next) = graph.get(node) else {
        return false;
    };
    for target in next {
        if target == start {
            return true;
        }
        if visited.insert(target.clone()) && graph_reaches_start(graph, start, target, visited) {
            return true;
        }
    }
    false
}

fn validate_relation_cycles(
    cards: &[Value],
    current_document_id: &str,
    content: &str,
) -> Result<(), String> {
    let current_frontmatter = jtype_core::parse_frontmatter(content);
    let mut parent_graph: HashMap<String, Vec<String>> = HashMap::new();
    let mut dependency_graph: HashMap<String, Vec<String>> = HashMap::new();
    for card in cards {
        let Some(document_id) = card.get("documentId").and_then(Value::as_str) else {
            continue;
        };
        let (parent, blocked_by, blocks) = if document_id == current_document_id {
            (
                current_frontmatter
                    .get("parent")
                    .map(|value| jtype_core::parse_card_links(value))
                    .unwrap_or_default(),
                current_frontmatter
                    .get("blocked_by")
                    .map(|value| jtype_core::parse_card_links(value))
                    .unwrap_or_default(),
                current_frontmatter
                    .get("blocks")
                    .map(|value| jtype_core::parse_card_links(value))
                    .unwrap_or_default(),
            )
        } else {
            (
                card.get("parent")
                    .and_then(Value::as_str)
                    .map(|value| vec![value.to_string()])
                    .unwrap_or_default(),
                card.get("blockedBy")
                    .and_then(Value::as_array)
                    .map(|values| {
                        values
                            .iter()
                            .filter_map(Value::as_str)
                            .map(str::to_string)
                            .collect()
                    })
                    .unwrap_or_default(),
                card.get("blocks")
                    .and_then(Value::as_array)
                    .map(|values| {
                        values
                            .iter()
                            .filter_map(Value::as_str)
                            .map(str::to_string)
                            .collect()
                    })
                    .unwrap_or_default(),
            )
        };
        for reference in parent {
            if let Ok((target, _)) = resolve_relation_ref(cards, &reference) {
                parent_graph
                    .entry(document_id.to_string())
                    .or_default()
                    .push(target);
            }
        }
        for reference in blocked_by {
            if let Ok((target, _)) = resolve_relation_ref(cards, &reference) {
                dependency_graph
                    .entry(document_id.to_string())
                    .or_default()
                    .push(target);
            }
        }
        for reference in blocks {
            if let Ok((target, _)) = resolve_relation_ref(cards, &reference) {
                dependency_graph
                    .entry(target)
                    .or_default()
                    .push(document_id.to_string());
            }
        }
    }
    if graph_reaches_start(
        &parent_graph,
        current_document_id,
        current_document_id,
        &mut HashSet::new(),
    ) {
        return Err("parent relation would create a cycle".into());
    }
    if graph_reaches_start(
        &dependency_graph,
        current_document_id,
        current_document_id,
        &mut HashSet::new(),
    ) {
        return Err("blocked_by/blocks relation would create a cycle".into());
    }
    Ok(())
}

async fn apply_relation_patch(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
    document_id: Option<&str>,
    args: &Value,
    mut content: String,
) -> Result<(String, bool), String> {
    let relation_fields_present = ["parent", "blocked_by", "blocks", "relates"]
        .iter()
        .any(|field| args.get(*field).is_some());
    if !relation_fields_present {
        return Ok((content, false));
    }
    let cards = collect_cards(st, token, workspace_id, board).await?;
    if let Some(parent_value) = args.get("parent") {
        let parent = parent_value
            .as_str()
            .ok_or_else(|| "set_card_relations: 'parent' must be a string".to_string())?;
        let serialized = if parent.is_empty() {
            None
        } else {
            let (target_document_id, canonical) = resolve_relation_ref(&cards, parent)?;
            if document_id == Some(target_document_id.as_str()) {
                return Err("a card cannot be its own parent".into());
            }
            Some(serialize_card_links(&[canonical]))
        };
        content = jtype_core::set_frontmatter_field(&content, "parent", serialized.as_deref());
    }
    for field in ["blocked_by", "blocks", "relates"] {
        if let Some(references) = string_array_arg(args, "set_card_relations", field)? {
            let mut canonical = Vec::with_capacity(references.len());
            for reference in references {
                let (target_document_id, target_path) = resolve_relation_ref(&cards, &reference)?;
                if document_id == Some(target_document_id.as_str()) {
                    return Err(format!("a card cannot reference itself in '{field}'"));
                }
                if !canonical.contains(&target_path) {
                    canonical.push(target_path);
                }
            }
            let serialized = serialize_card_links(&canonical);
            content = jtype_core::set_frontmatter_field(
                &content,
                field,
                (!serialized.is_empty()).then_some(serialized.as_str()),
            );
        }
    }
    if let Some(document_id) = document_id {
        validate_relation_cycles(&cards, document_id, &content)?;
    }
    Ok((content, true))
}

async fn apply_card_patch(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
    document_id: Option<&str>,
    args: &Value,
    mut content: String,
    require_update: bool,
) -> Result<String, String> {
    let mut touched = false;
    if let Some(value) = args.get("title") {
        let title = value
            .as_str()
            .ok_or_else(|| "update_card: 'title' must be a string".to_string())?;
        validate_scalar("update_card", "title", title)?;
        if title.trim().is_empty() {
            return Err("update_card: title cannot be empty".into());
        }
        content = jtype_core::set_frontmatter_field(&content, "title", Some(title.trim()));
        touched = true;
    }
    if let Some(value) = args.get("body") {
        let body = value
            .as_str()
            .ok_or_else(|| "update_card: 'body' must be a string".to_string())?;
        content = replace_card_body(&content, body);
        touched = true;
    }
    for field in ["status", "priority", "assignee", "start", "due", "reminder"] {
        let Some(value) = args.get(field) else {
            continue;
        };
        let value = value
            .as_str()
            .ok_or_else(|| format!("update_card: '{field}' must be a string"))?;
        validate_scalar("update_card", field, value)?;
        if field == "status" {
            if value.is_empty() {
                return Err("update_card: status cannot be empty".into());
            }
            validate_status(st, token, workspace_id, board, value).await?;
        }
        if field == "priority"
            && !value.is_empty()
            && !["none", "low", "medium", "high", "urgent"].contains(&value)
        {
            return Err(format!("update_card: invalid priority '{value}'"));
        }
        if matches!(field, "start" | "due" | "reminder") {
            validate_date("update_card", field, value)?;
        }
        content = jtype_core::set_frontmatter_field(
            &content,
            field,
            (!value.is_empty()).then_some(value),
        );
        touched = true;
    }
    if let Some(value) = args.get("archived") {
        let archived = value
            .as_bool()
            .ok_or_else(|| "update_card: 'archived' must be a boolean".to_string())?;
        content =
            jtype_core::set_frontmatter_field(&content, "archived", archived.then_some("true"));
        touched = true;
    }
    if let Some(tags) = string_array_arg(args, "update_card", "tags")? {
        let serialized = serialize_csv_values(&tags);
        content = jtype_core::set_frontmatter_field(
            &content,
            "tags",
            (!serialized.is_empty()).then_some(serialized.as_str()),
        );
        touched = true;
    }
    if let Some(attachments) = string_array_arg(args, "update_card", "attachments")? {
        for attachment in &attachments {
            validate_attachment_reference(attachment)?;
        }
        let serialized = serialize_csv_values(&attachments);
        content = jtype_core::set_frontmatter_field(
            &content,
            "attachments",
            (!serialized.is_empty()).then_some(serialized.as_str()),
        );
        touched = true;
    }
    let (relation_content, relation_touched) =
        apply_relation_patch(st, token, workspace_id, board, document_id, args, content).await?;
    content = relation_content;
    touched |= relation_touched;

    let frontmatter = jtype_core::parse_frontmatter(&content);
    if let (Some(start), Some(due)) = (frontmatter.get("start"), frontmatter.get("due")) {
        if start > due {
            return Err("card start date cannot be after due date".into());
        }
    }
    if require_update && !touched {
        return Err("update_card: provide at least one field to update".into());
    }
    Ok(content)
}

fn verify_expected_hash(current: &Value, expected: &str) -> Result<(), String> {
    let actual = current
        .get("contentHash")
        .and_then(Value::as_str)
        .ok_or("document response has no contentHash")?;
    if actual == expected {
        Ok(())
    } else {
        Err(format!(
            "stale baseContentHash: expected current hash {actual}; re-read the card before retrying"
        ))
    }
}

async fn mutate_labels(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
    document_id: &str,
    expected_hash: Option<&str>,
    args: &Value,
) -> Result<Value, String> {
    let doc = require_card(st, token, workspace_id, board, document_id).await?;
    if let Some(expected_hash) = expected_hash {
        verify_expected_hash(&doc, expected_hash)?;
    }
    let labels = string_array_arg(args, "set_card_labels", "labels")?
        .ok_or("set_card_labels: missing labels")?;
    let mode = args
        .get("mode")
        .and_then(Value::as_str)
        .unwrap_or("replace");
    if !["replace", "add", "remove"].contains(&mode) {
        return Err("set_card_labels: mode must be replace, add, or remove".into());
    }
    let content = doc.get("content").and_then(Value::as_str).unwrap_or("");
    let frontmatter = jtype_core::parse_frontmatter(content);
    let current = frontmatter
        .get("tags")
        .map(|value| parse_csv_values(value, true))
        .unwrap_or_default();
    let next = match mode {
        "replace" => labels,
        "add" => {
            let mut next = current;
            for label in labels {
                if !next.contains(&label) {
                    next.push(label);
                }
            }
            next
        }
        "remove" => current
            .into_iter()
            .filter(|label| !labels.contains(label))
            .collect(),
        _ => unreachable!(),
    };
    let serialized = serialize_csv_values(&next);
    let updated = jtype_core::set_frontmatter_field(
        content,
        "tags",
        (!serialized.is_empty()).then_some(serialized.as_str()),
    );
    let saved =
        save_existing_card(st, token, workspace_id, board, document_id, &doc, updated).await?;
    card_value(&saved, board)
}

async fn mutate_attachment(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
    document_id: &str,
    expected_hash: Option<&str>,
    attachment: &str,
    add: bool,
) -> Result<Value, String> {
    validate_attachment_reference(attachment)?;
    let doc = require_card(st, token, workspace_id, board, document_id).await?;
    if let Some(expected_hash) = expected_hash {
        verify_expected_hash(&doc, expected_hash)?;
    }
    let content = doc.get("content").and_then(Value::as_str).unwrap_or("");
    let frontmatter = jtype_core::parse_frontmatter(content);
    let mut attachments = frontmatter
        .get("attachments")
        .map(|value| parse_csv_values(value, false))
        .unwrap_or_default();
    if add {
        if !attachments.iter().any(|value| value == attachment) {
            attachments.push(attachment.to_string());
        }
    } else {
        let before = attachments.len();
        attachments.retain(|value| value != attachment);
        if attachments.len() == before {
            return Err("attachment reference is not present on the card".into());
        }
    }
    let serialized = serialize_csv_values(&attachments);
    let updated = jtype_core::set_frontmatter_field(
        content,
        "attachments",
        (!serialized.is_empty()).then_some(serialized.as_str()),
    );
    let saved =
        save_existing_card(st, token, workspace_id, board, document_id, &doc, updated).await?;
    card_value(&saved, board)
}

async fn set_relations(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
    document_id: &str,
    expected_hash: Option<&str>,
    args: &Value,
) -> Result<Value, String> {
    let doc = require_card(st, token, workspace_id, board, document_id).await?;
    if let Some(expected_hash) = expected_hash {
        verify_expected_hash(&doc, expected_hash)?;
    }
    let content = doc
        .get("content")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let (updated, touched) = apply_relation_patch(
        st,
        token,
        workspace_id,
        board,
        Some(document_id),
        args,
        content,
    )
    .await?;
    if !touched {
        return Err("set_card_relations: provide at least one relation field".into());
    }
    let saved =
        save_existing_card(st, token, workspace_id, board, document_id, &doc, updated).await?;
    card_value(&saved, board)
}

async fn bulk_update(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
    args: &Value,
    require_base_hash: bool,
) -> Result<Value, String> {
    let updates = args
        .get("updates")
        .and_then(Value::as_array)
        .ok_or("bulk_update_cards: 'updates' must be an array")?;
    if updates.is_empty() || updates.len() > 100 {
        return Err("bulk_update_cards: updates must contain between 1 and 100 items".into());
    }
    let mut receipts = Vec::with_capacity(updates.len());
    let mut succeeded = 0usize;
    for (index, update) in updates.iter().enumerate() {
        let result = async {
            let document_id = req(update, "document_id")?;
            let expected_hash = if require_base_hash {
                Some(req(update, "base_content_hash")?)
            } else {
                None
            };
            let doc = require_card(st, token, workspace_id, board, &document_id).await?;
            if let Some(expected_hash) = expected_hash.as_deref() {
                verify_expected_hash(&doc, expected_hash)?;
            }
            let content = doc
                .get("content")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            let updated = apply_card_patch(
                st,
                token,
                workspace_id,
                board,
                Some(&document_id),
                update,
                content,
                true,
            )
            .await?;
            let saved =
                save_existing_card(st, token, workspace_id, board, &document_id, &doc, updated)
                    .await?;
            card_value(&saved, board)
        }
        .await;
        match result {
            Ok(card) => {
                succeeded += 1;
                receipts.push(json!({
                    "index": index,
                    "documentId": card.get("documentId").cloned().unwrap_or(Value::Null),
                    "ok": true,
                    "card": card
                }));
            }
            Err(error) => receipts.push(json!({
                "index": index,
                "documentId": update.get("document_id").cloned().unwrap_or(Value::Null),
                "ok": false,
                "error": error
            })),
        }
    }
    Ok(json!({
        "atomic": false,
        "requested": updates.len(),
        "succeeded": succeeded,
        "failed": updates.len() - succeeded,
        "items": receipts
    }))
}

fn parse_statuses(args: &Value) -> Result<Vec<Value>, String> {
    let statuses = args
        .get("statuses")
        .and_then(Value::as_array)
        .ok_or("set_board_statuses: 'statuses' must be an array")?;
    if statuses.is_empty() || statuses.len() > 50 {
        return Err("set_board_statuses: statuses must contain between 1 and 50 items".into());
    }
    let mut keys = HashSet::new();
    let mut result = Vec::with_capacity(statuses.len());
    for status in statuses {
        let object = status
            .as_object()
            .ok_or("set_board_statuses: each status must be an object")?;
        if let Some(key) = object
            .keys()
            .find(|key| !matches!(key.as_str(), "key" | "name" | "color"))
        {
            return Err(format!(
                "set_board_statuses: unexpected status property '{key}'"
            ));
        }
        let key = status
            .get("key")
            .and_then(Value::as_str)
            .ok_or("set_board_statuses: status key must be a string")?
            .trim();
        let name = status
            .get("name")
            .and_then(Value::as_str)
            .ok_or("set_board_statuses: status name must be a string")?
            .trim();
        validate_scalar("set_board_statuses", "key", key)?;
        validate_scalar("set_board_statuses", "name", name)?;
        if key.is_empty()
            || !key
                .chars()
                .all(|ch| ch.is_alphanumeric() || matches!(ch, '-' | '_' | '.'))
        {
            return Err(format!("set_board_statuses: invalid status key '{key}'"));
        }
        if name.is_empty() {
            return Err("set_board_statuses: status name cannot be empty".into());
        }
        if !keys.insert(key.to_string()) {
            return Err(format!("set_board_statuses: duplicate status key '{key}'"));
        }
        let mut normalized = json!({ "key": key, "name": name });
        if let Some(color) = status.get("color") {
            let color = color
                .as_str()
                .ok_or("set_board_statuses: status color must be a string")?
                .trim();
            validate_scalar("set_board_statuses", "color", color)?;
            if !color.is_empty() {
                normalized["color"] = json!(color);
            }
        }
        result.push(normalized);
    }
    Ok(result)
}

async fn list_statuses_value(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
) -> Result<Value, String> {
    let config = require_board(st, token, workspace_id, board).await?;
    Ok(json!({
        "boardId": board,
        "documentId": config.get("documentId").cloned().unwrap_or(Value::Null),
        "contentHash": config.get("contentHash").cloned().unwrap_or(Value::Null),
        "statuses": config.get("columns").cloned().unwrap_or_else(|| json!([])),
        "doneColumn": board_done_column(&config)
    }))
}

fn board_done_column(config: &Value) -> &str {
    config
        .get("doneColumn")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_DONE_COLUMN)
}

async fn set_board_statuses_value(
    st: &McpState,
    token: &str,
    workspace_id: &str,
    board: &str,
    expected_document_id: Option<&str>,
    expected_hash: Option<&str>,
    args: &Value,
) -> Result<Value, String> {
    let statuses = parse_statuses(args)?;
    let requested_done = args
        .get("done_status")
        .map(|value| {
            value
                .as_str()
                .ok_or_else(|| "set_board_statuses: 'done_status' must be a string".to_string())
        })
        .transpose()?;
    let board_summary = require_board(st, token, workspace_id, board).await?;
    let board_document_id = board_summary
        .get("documentId")
        .and_then(Value::as_str)
        .ok_or("board document response has no documentId")?;
    if let Some(expected_document_id) = expected_document_id {
        if expected_document_id != board_document_id {
            return Err("board_document_id does not match the requested board".into());
        }
    }
    if let Some(expected_hash) = expected_hash {
        verify_expected_hash(&board_summary, expected_hash)?;
    }
    let board_doc = api_get(
        st,
        token,
        &format!("/api/v1/workspaces/{workspace_id}/documents/{board_document_id}"),
    )
    .await?;
    if let Some(expected_hash) = expected_hash {
        verify_expected_hash(&board_doc, expected_hash)?;
    }
    let content = board_doc
        .get("content")
        .and_then(Value::as_str)
        .ok_or("board document has no content")?;
    let mut config: Value =
        serde_json::from_str(content).map_err(|error| format!("invalid board JSON: {error}"))?;
    let current_done = board_done_column(&config).to_string();
    let done_column = requested_done.unwrap_or(&current_done);
    let old_columns = config
        .get("columns")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let old_keys = old_columns
        .iter()
        .filter_map(|status| status.get("key").and_then(Value::as_str))
        .collect::<HashSet<_>>();
    let new_keys = statuses
        .iter()
        .filter_map(|status| status.get("key").and_then(Value::as_str))
        .collect::<HashSet<_>>();
    if !new_keys.contains(done_column) {
        return Err(if requested_done.is_some() {
            "set_board_statuses: done_status must exist in the new status list".into()
        } else {
            format!(
                "set_board_statuses: cannot remove the current done status '{current_done}' without selecting done_status"
            )
        });
    }
    let removed = old_keys
        .difference(&new_keys)
        .copied()
        .collect::<HashSet<_>>();
    let cards = collect_cards(st, token, workspace_id, board).await?;
    let affected = cards
        .iter()
        .filter(|card| {
            card.get("status")
                .and_then(Value::as_str)
                .is_some_and(|status| removed.contains(status))
        })
        .collect::<Vec<_>>();
    let fallback = args.get("fallback_status").and_then(Value::as_str);
    if !affected.is_empty() {
        let fallback = fallback.ok_or_else(|| {
            format!(
                "set_board_statuses: removing non-empty statuses requires fallback_status ({} affected cards)",
                affected.len()
            )
        })?;
        if !new_keys.contains(fallback) {
            return Err(
                "set_board_statuses: fallback_status must exist in the new status list".into(),
            );
        }
        if !old_keys.contains(fallback) {
            return Err(
                "set_board_statuses: fallback_status must already exist so card migration is recoverable"
                    .into(),
            );
        }
    } else if let Some(fallback) = fallback {
        if !new_keys.contains(fallback) {
            return Err(
                "set_board_statuses: fallback_status must exist in the new status list".into(),
            );
        }
    }

    let mut migrations = Vec::with_capacity(affected.len());
    let mut migration_failed = false;
    if let Some(fallback) = fallback {
        for card in affected {
            let document_id = card
                .get("documentId")
                .and_then(Value::as_str)
                .unwrap_or_default();
            let result = async {
                let doc = require_card(st, token, workspace_id, board, document_id).await?;
                let content = doc.get("content").and_then(Value::as_str).unwrap_or("");
                let updated = jtype_core::set_frontmatter_field(content, "status", Some(fallback));
                save_existing_card(st, token, workspace_id, board, document_id, &doc, updated).await
            }
            .await;
            match result {
                Ok(_) => migrations.push(json!({ "documentId": document_id, "ok": true })),
                Err(error) => {
                    migration_failed = true;
                    migrations.push(json!({
                        "documentId": document_id,
                        "ok": false,
                        "error": error
                    }));
                }
            }
        }
    }
    if migration_failed {
        return Ok(json!({
            "applied": false,
            "atomic": false,
            "boardId": board,
            "error": "one or more card migrations failed; board statuses were not changed",
            "migrations": migrations
        }));
    }

    let object = config
        .as_object_mut()
        .ok_or("board config must be a JSON object")?;
    object.insert("columns".into(), Value::Array(statuses.clone()));
    if requested_done.is_some() {
        object.insert("doneColumn".into(), json!(done_column));
    }
    let relative_path = board_doc
        .get("relativePath")
        .and_then(Value::as_str)
        .ok_or("board document has no relativePath")?;
    let base_content_hash = board_doc
        .get("contentHash")
        .and_then(Value::as_str)
        .ok_or("board document has no contentHash")?;
    let title = config.get("title").and_then(Value::as_str).unwrap_or(board);
    let save = api_post(
        st,
        token,
        &format!("/api/v1/workspaces/{workspace_id}/documents/save"),
        json!({
            "documentId": board_document_id,
            "relativePath": relative_path,
            "title": title,
            "content": serde_json::to_string_pretty(&config).map_err(|error| error.to_string())?,
            "baseContentHash": base_content_hash
        }),
    )
    .await;
    match save {
        Ok(saved) => Ok(json!({
            "applied": true,
            "atomic": false,
            "boardId": board,
            "documentId": board_document_id,
            "contentHash": saved.get("contentHash").cloned().unwrap_or(Value::Null),
            "statuses": statuses,
            "doneColumn": done_column,
            "migrations": migrations
        })),
        Err(error) => Ok(json!({
            "applied": false,
            "atomic": false,
            "boardId": board,
            "error": error,
            "migrations": migrations
        })),
    }
}

async fn run(st: &McpState, token: &str, name: &str, args: &Value) -> Result<Value, String> {
    validate_unpinned_arguments(name, args)?;
    match name {
        "list_workspaces" => {
            let body = api_get(st, token, "/api/v1/workspaces").await?;
            Ok(body.get("workspaces").cloned().unwrap_or(body))
        }
        "list_boards" => {
            let workspace_id = req(args, "workspace_id")?;
            Ok(json!(collect_boards(st, token, &workspace_id).await?))
        }
        "get_board" => {
            let workspace_id = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let config = require_board(st, token, &workspace_id, &board).await?;
            let mut cards = collect_cards(st, token, &workspace_id, &board).await?;
            add_legacy_paths(&mut cards);
            Ok(json!({ "board": config, "cards": cards }))
        }
        "list_cards" => {
            let workspace_id = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let mut cards = collect_cards(st, token, &workspace_id, &board).await?;
            if let Some(status) = opt(args, "status") {
                validate_status(st, token, &workspace_id, &board, &status).await?;
                cards.retain(|card| {
                    card.get("status").and_then(Value::as_str) == Some(status.as_str())
                });
            }
            add_legacy_paths(&mut cards);
            Ok(Value::Array(cards))
        }
        "create_card" => {
            let workspace_id = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let status = req(args, "status")?;
            let title = req(args, "title")?;
            let config = require_board(st, token, &workspace_id, &board).await?;
            ensure_status_in_config(&config, &status)?;
            let board_path = config.get("path").and_then(Value::as_str).unwrap_or("");
            let directory = board_path.strip_suffix(".board").unwrap_or(board_path);
            let cards = collect_cards(st, token, &workspace_id, &board).await?;
            let next_position = cards
                .iter()
                .filter(|card| card.get("status").and_then(Value::as_str) == Some(status.as_str()))
                .filter_map(|card| card.get("position").and_then(Value::as_i64))
                .max()
                .map(|position| position + 1)
                .unwrap_or(0);
            let mut content = format!("# {title}\n");
            content = jtype_core::set_frontmatter_field(&content, "board", Some(&board));
            content = jtype_core::set_frontmatter_field(
                &content,
                "position",
                Some(&next_position.to_string()),
            );
            content =
                apply_card_patch(st, token, &workspace_id, &board, None, args, content, false)
                    .await?;
            ensure_card_content_board(&content, &board)?;

            let slug = slugify(&title);
            let mut relative_path = format!("{directory}/{slug}.md");
            let mut suffix = 2;
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
                        relative_path = format!("{directory}/{slug}-{suffix}.md");
                        suffix += 1;
                    }
                    Err(error) => return Err(error),
                }
            };
            let document_id = saved
                .get("documentId")
                .and_then(Value::as_str)
                .ok_or("create_card response has no documentId")?;
            let doc = require_card(st, token, &workspace_id, &board, document_id).await?;
            card_value(&doc, &board)
        }
        "move_card" => {
            let workspace_id = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let document_id = req(args, "document_id")?;
            let base_content_hash = req(args, "base_content_hash")?;
            let destination = req(args, "to")?;
            validate_status(st, token, &workspace_id, &board, &destination).await?;
            let doc = require_card(st, token, &workspace_id, &board, &document_id).await?;
            verify_expected_hash(&doc, &base_content_hash)?;
            let content = doc.get("content").and_then(Value::as_str).unwrap_or("");
            let mut updated =
                jtype_core::set_frontmatter_field(content, "status", Some(&destination));
            if let Some(position) = args.get("position") {
                let position = position
                    .as_i64()
                    .filter(|position| *position >= 0)
                    .ok_or("move_card: position must be a non-negative integer")?;
                updated = jtype_core::set_frontmatter_field(
                    &updated,
                    "position",
                    Some(&position.to_string()),
                );
            }
            let doc = save_existing_card(
                st,
                token,
                &workspace_id,
                &board,
                &document_id,
                &doc,
                updated,
            )
            .await?;
            card_value(&doc, &board)
        }
        "update_card" => {
            let workspace_id = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let document_id = req(args, "document_id")?;
            let base_content_hash = req(args, "base_content_hash")?;
            let doc = require_card(st, token, &workspace_id, &board, &document_id).await?;
            verify_expected_hash(&doc, &base_content_hash)?;
            let content = doc
                .get("content")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            let updated = apply_card_patch(
                st,
                token,
                &workspace_id,
                &board,
                Some(&document_id),
                args,
                content,
                true,
            )
            .await?;
            let doc = save_existing_card(
                st,
                token,
                &workspace_id,
                &board,
                &document_id,
                &doc,
                updated,
            )
            .await?;
            card_value(&doc, &board)
        }
        "delete_card" => {
            let workspace_id = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let document_id = req(args, "document_id")?;
            let base_content_hash = req(args, "base_content_hash")?;
            let doc = require_card(st, token, &workspace_id, &board, &document_id).await?;
            verify_expected_hash(&doc, &base_content_hash)?;
            let relative_path = doc
                .get("relativePath")
                .and_then(Value::as_str)
                .unwrap_or_default();
            api_delete(
                st,
                token,
                &format!("/api/v1/workspaces/{workspace_id}/documents/{document_id}"),
            )
            .await?;
            Ok(json!({
                "documentId": document_id,
                "relativePath": relative_path,
                "deleted": true,
                "recovery": "workspace-trash"
            }))
        }
        "set_card_labels" => {
            let workspace_id = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let document_id = req(args, "document_id")?;
            let base_content_hash = req(args, "base_content_hash")?;
            mutate_labels(
                st,
                token,
                &workspace_id,
                &board,
                &document_id,
                Some(&base_content_hash),
                args,
            )
            .await
        }
        "add_card_attachment" | "remove_card_attachment" => {
            let workspace_id = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let document_id = req(args, "document_id")?;
            let base_content_hash = req(args, "base_content_hash")?;
            let attachment = req(args, "attachment")?;
            mutate_attachment(
                st,
                token,
                &workspace_id,
                &board,
                &document_id,
                Some(&base_content_hash),
                &attachment,
                name == "add_card_attachment",
            )
            .await
        }
        "set_card_relations" => {
            let workspace_id = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let document_id = req(args, "document_id")?;
            let base_content_hash = req(args, "base_content_hash")?;
            set_relations(
                st,
                token,
                &workspace_id,
                &board,
                &document_id,
                Some(&base_content_hash),
                args,
            )
            .await
        }
        "bulk_update_cards" => {
            validate_bulk_update_shape(args, true)?;
            let workspace_id = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            bulk_update(st, token, &workspace_id, &board, args, true).await
        }
        "list_statuses" => {
            let workspace_id = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            list_statuses_value(st, token, &workspace_id, &board).await
        }
        "set_board_statuses" => {
            let workspace_id = req(args, "workspace_id")?;
            let board = req(args, "board")?;
            let board_document_id = req(args, "board_document_id")?;
            let base_content_hash = req(args, "base_content_hash")?;
            set_board_statuses_value(
                st,
                token,
                &workspace_id,
                &board,
                Some(&board_document_id),
                Some(&base_content_hash),
                args,
            )
            .await
        }
        "list_card_comments" => {
            let workspace_id = req(args, "workspace_id")?;
            let path = req(args, "path")?;
            let doc = get_doc(st, token, &workspace_id, &path).await?;
            let document_id = doc
                .get("documentId")
                .and_then(Value::as_str)
                .ok_or("card has no documentId")?;
            let comments = api_get(
                st,
                token,
                &format!("/api/v1/workspaces/{workspace_id}/documents/{document_id}/comments"),
            )
            .await?;
            Ok(json!({ "documentId": document_id, "comments": comments }))
        }
        "comment_card" => {
            let workspace_id = req(args, "workspace_id")?;
            let path = req(args, "path")?;
            let body = req(args, "body")?;
            let doc = get_doc(st, token, &workspace_id, &path).await?;
            let document_id = doc
                .get("documentId")
                .and_then(Value::as_str)
                .ok_or("card has no documentId")?;
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
            let workspace_id = req(args, "workspace_id")?;
            let comment_id = req(args, "comment_id")?;
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
            let mut board_value = cfg.as_object().cloned().unwrap_or_default();
            board_value.insert("id".into(), json!(id));
            board_value.insert("title".into(), json!(title));
            board_value.insert("path".into(), json!(path));
            board_value.insert(
                "columns".into(),
                cfg.get("columns").cloned().unwrap_or(json!([])),
            );
            for key in ["documentId", "contentHash", "versionId", "updatedClock"] {
                if let Some(value) = doc.get(key) {
                    board_value.insert(key.into(), value.clone());
                }
            }
            boards.push(Value::Object(board_value));
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
