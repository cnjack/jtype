//! MCP tool catalog + dispatcher for JType notes and kanban.
//!
//! Every tool maps to one or more existing REST handlers, invoked in-process
//! via [`super::call_api`]. Tool names use snake_case; mutations fold related
//! fields into a single call (Linear/GitHub style). Results are JSON text so the
//! model can read them directly.

use axum::http::Method;
use serde_json::{json, Map, Value};

use super::{call_api, McpState};

/// JSON-Schema-tagged tool definition.
fn tool(name: &str, description: &str, properties: Value, required: &[&str]) -> Value {
    json!({
        "name": name,
        "description": description,
        "inputSchema": {
            "type": "object",
            "properties": properties,
            "required": required,
        }
    })
}

fn p_str(desc: &str) -> Value {
    json!({ "type": "string", "description": desc })
}

/// The full tool catalog returned by `tools/list`.
pub fn catalog() -> Value {
    json!([
        tool(
            "list_workspaces",
            "List the JType cloud workspaces the authenticated user can access. Returns id, name, slug, role and counts. Start here to obtain a workspace_id.",
            json!({}),
            &[]
        ),
        tool(
            "list_notes",
            "List Markdown notes (documents) in a workspace. Optionally restrict to a folder prefix.",
            json!({
                "workspace_id": p_str("Workspace id from list_workspaces"),
                "folder": p_str("Optional folder path prefix, e.g. 'projects'"),
            }),
            &["workspace_id"]
        ),
        tool(
            "get_note",
            "Get a single note's full Markdown content by its relative path.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "path": p_str("Relative path, e.g. 'ideas/launch.md' (the .md suffix is optional)"),
            }),
            &["workspace_id", "path"]
        ),
        tool(
            "search_notes",
            "Search notes in a workspace by keyword across title, path and content. Returns matching notes with a snippet.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "query": p_str("Search keyword or phrase"),
                "limit": json!({ "type": "integer", "description": "Max results (default 10)" }),
            }),
            &["workspace_id", "query"]
        ),
        tool(
            "create_note",
            "Create or overwrite a Markdown note at the given path.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "path": p_str("Relative path, e.g. 'meetings/2026-06-14.md'"),
                "content": p_str("Markdown content"),
                "title": p_str("Optional title (defaults to first heading or path)"),
            }),
            &["workspace_id", "path", "content"]
        ),
        tool(
            "update_note",
            "Replace the full content of an existing note.",
            json!({
                "workspace_id": p_str("Workspace id"),
                "path": p_str("Relative path of the note to update"),
                "content": p_str("New full Markdown content"),
            }),
            &["workspace_id", "path", "content"]
        ),
        tool(
            "append_note",
            "Append Markdown to the end of a note (creates it if missing).",
            json!({
                "workspace_id": p_str("Workspace id"),
                "path": p_str("Relative path of the note"),
                "content": p_str("Markdown to append"),
            }),
            &["workspace_id", "path", "content"]
        ),
        tool(
            "list_members",
            "List workspace members (user ids, usernames, roles) — use to resolve assignee_user_id.",
            json!({ "workspace_id": p_str("Workspace id") }),
            &["workspace_id"]
        ),
    ])
}

// ── Dispatch ────────────────────────────────────────────────────────────────

/// Execute a tool call, returning an MCP `CallToolResult`.
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
        "list_notes" => {
            let ws = req(args, "workspace_id")?;
            let docs = api_get(st, token, &format!("/api/v1/workspaces/{ws}/documents")).await?;
            let docs = match opt(args, "folder") {
                Some(folder) => filter_by_folder(docs, &folder),
                None => docs,
            };
            pretty(&docs)
        }
        "get_note" => {
            let ws = req(args, "workspace_id")?;
            let path = req(args, "path")?;
            let doc = get_doc(st, token, &ws, &path).await?;
            pretty(&doc)
        }
        "search_notes" => {
            let ws = req(args, "workspace_id")?;
            let query = req(args, "query")?.to_lowercase();
            // Clamp to ≥1 so an explicit `limit:0` doesn't silently return nothing.
            let limit = (args.get("limit").and_then(|v| v.as_u64()).unwrap_or(10) as usize).max(1);
            search_notes(st, token, &ws, &query, limit).await
        }
        "create_note" | "update_note" => {
            let ws = req(args, "workspace_id")?;
            let path = req(args, "path")?;
            let content = req(args, "content")?;
            let mut body = Map::new();
            body.insert("relativePath".into(), json!(path));
            body.insert("content".into(), json!(content));
            if let Some(title) = opt(args, "title") {
                body.insert("title".into(), json!(title));
            }
            let res = api_post(
                st,
                token,
                &format!("/api/v1/workspaces/{ws}/documents/save"),
                Value::Object(body),
            )
            .await?;
            Ok(format!(
                "Saved note '{}' (mergeStatus: {}).\n{}",
                path,
                res.get("mergeStatus").and_then(|v| v.as_str()).unwrap_or("?"),
                pretty(&res)?
            ))
        }
        "append_note" => {
            let ws = req(args, "workspace_id")?;
            let path = req(args, "path")?;
            let add = req(args, "content")?;
            // Distinguish "note doesn't exist yet" (→ create) from a transient
            // read failure (→ propagate). Swallowing the latter would overwrite
            // the note with only the appended text.
            let current = match resolve_doc_id(st, token, &ws, &path).await? {
                Some(id) => {
                    let doc = api_get(
                        st,
                        token,
                        &format!("/api/v1/workspaces/{ws}/documents/{id}"),
                    )
                    .await?;
                    doc.get("content")
                        .and_then(|c| c.as_str())
                        .unwrap_or("")
                        .to_string()
                }
                None => String::new(),
            };
            let merged = if current.trim().is_empty() {
                add
            } else {
                format!("{}\n\n{}", current.trim_end(), add)
            };
            let res = api_post(
                st,
                token,
                &format!("/api/v1/workspaces/{ws}/documents/save"),
                json!({ "relativePath": path, "content": merged }),
            )
            .await?;
            Ok(format!("Appended to note '{}'.\n{}", path, pretty(&res)?))
        }
        "list_members" => {
            let ws = req(args, "workspace_id")?;
            let members = api_get(st, token, &format!("/api/v1/workspaces/{ws}/members")).await?;
            pretty(&members)
        }
        other => Err(format!("unknown tool: {other}")),
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

pub(super) fn req(args: &Value, key: &str) -> Result<String, String> {
    opt(args, key).ok_or_else(|| format!("missing required argument: {key}"))
}

pub(super) fn opt(args: &Value, key: &str) -> Option<String> {
    args.get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
}

pub(super) fn pretty(v: &Value) -> Result<String, String> {
    serde_json::to_string_pretty(v).map_err(|e| e.to_string())
}

pub(super) async fn api_get(st: &McpState, token: &str, uri: &str) -> Result<Value, String> {
    let (status, body) = call_api(&st.api, Method::GET, uri, token, None)
        .await
        .map_err(|e| e.to_string())?;
    if status.is_success() {
        Ok(body)
    } else {
        Err(api_err(status.as_u16(), &body))
    }
}

pub(super) async fn api_post(st: &McpState, token: &str, uri: &str, body: Value) -> Result<Value, String> {
    let (status, resp) = call_api(&st.api, Method::POST, uri, token, Some(body))
        .await
        .map_err(|e| e.to_string())?;
    if status.is_success() {
        Ok(resp)
    } else {
        Err(api_err(status.as_u16(), &resp))
    }
}

fn api_err(status: u16, body: &Value) -> String {
    let msg = body
        .get("error")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| body.to_string());
    format!("request failed ({status}): {msg}")
}

fn doc_path_matches(doc: &Value, path: &str) -> bool {
    let rp = doc.get("relativePath").and_then(|v| v.as_str()).unwrap_or("");
    rp == path || rp == format!("{path}.md")
}

/// Resolve a note path (with or without `.md`) to its document id.
/// `Ok(None)` means the note genuinely doesn't exist; `Err` means the lookup
/// itself failed (so callers must not treat that as "create new").
async fn resolve_doc_id(
    st: &McpState,
    token: &str,
    ws: &str,
    path: &str,
) -> Result<Option<String>, String> {
    let docs = api_get(st, token, &format!("/api/v1/workspaces/{ws}/documents")).await?;
    Ok(docs
        .as_array()
        .and_then(|arr| arr.iter().find(|d| doc_path_matches(d, path)))
        .and_then(|d| d.get("id").and_then(|v| v.as_str()))
        .map(|s| s.to_string()))
}

/// Resolve a note by path and return its full `CloudDocument` (with content).
pub(super) async fn get_doc(st: &McpState, token: &str, ws: &str, path: &str) -> Result<Value, String> {
    let id = resolve_doc_id(st, token, ws, path)
        .await?
        .ok_or_else(|| format!("note not found: {path}"))?;
    api_get(
        st,
        token,
        &format!("/api/v1/workspaces/{ws}/documents/{id}"),
    )
    .await
}

fn filter_by_folder(docs: Value, folder: &str) -> Value {
    let prefix = format!("{}/", folder.trim_end_matches('/'));
    match docs {
        Value::Array(arr) => Value::Array(
            arr.into_iter()
                .filter(|d| {
                    d.get("relativePath")
                        .and_then(|v| v.as_str())
                        .map(|rp| rp == folder || rp.starts_with(&prefix))
                        .unwrap_or(false)
                })
                .collect(),
        ),
        other => other,
    }
}

/// Keyword search over title/path, then content (bounded fetch), with snippets.
async fn search_notes(
    st: &McpState,
    token: &str,
    ws: &str,
    query: &str,
    limit: usize,
) -> Result<String, String> {
    const MAX_SCAN: usize = 30;
    let docs = api_get(st, token, &format!("/api/v1/workspaces/{ws}/documents")).await?;
    let arr = docs.as_array().cloned().unwrap_or_default();
    let mut scanned = 0usize; // docs actually examined (not the eager corpus size)
    let mut matches = Vec::new();

    for doc in arr.iter().take(MAX_SCAN) {
        if matches.len() >= limit {
            break;
        }
        scanned += 1;
        let path = doc.get("relativePath").and_then(|v| v.as_str()).unwrap_or("");
        let title = doc.get("title").and_then(|v| v.as_str()).unwrap_or("");
        let id = doc.get("id").and_then(|v| v.as_str()).unwrap_or("");

        let meta_hit = title.to_lowercase().contains(query) || path.to_lowercase().contains(query);
        let mut snippet: Option<String> = None;

        if !meta_hit {
            // Fetch content and look for the keyword.
            if let Ok(full) =
                api_get(st, token, &format!("/api/v1/workspaces/{ws}/documents/{id}")).await
            {
                if let Some(content) = full.get("content").and_then(|v| v.as_str()) {
                    if let Some(line) = content
                        .lines()
                        .find(|l| l.to_lowercase().contains(query))
                    {
                        snippet = Some(line.trim().chars().take(160).collect());
                    } else {
                        continue; // no match in this note
                    }
                } else {
                    continue;
                }
            } else {
                continue;
            }
        }

        matches.push(json!({
            "path": path,
            "title": title,
            "snippet": snippet,
        }));
    }

    let truncated = arr.len() > MAX_SCAN;
    let result = json!({
        "query": query,
        "scanned": scanned,
        "truncated": truncated,
        "matches": matches,
    });
    pretty(&result)
}
