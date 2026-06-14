//! Local-first note (Markdown document) commands + cloud workspace helpers.
//!
//! Notes are read/written directly against the cwd vault's `.md` files (via
//! `jtype_core`). `create`/`update` additionally write-through to the bound cloud
//! workspace — best-effort, last-write-wins (decision B). Board/card and
//! `workspace list` remain cloud (REMOTE).

use std::path::Path;

use anyhow::{anyhow, Context, Result};
use serde_json::{json, Value};

use crate::client::ApiClient;
use crate::config::Config;
use crate::print::emit;
use crate::vault::{self, CloudBinding};

// ── Cloud workspace helpers (REMOTE) ──

pub async fn list_workspaces(client: &ApiClient, json: bool) -> Result<()> {
    let body = client.get("/api/v1/workspaces").await?;
    let ws = body.get("workspaces").cloned().unwrap_or(body);
    if json {
        emit(true, &ws);
    } else {
        println!("{:<38}  {:<20}  {}", "ID", "NAME", "ROLE");
        for w in ws.as_array().cloned().unwrap_or_default() {
            println!(
                "{:<38}  {:<20}  {}",
                w["id"].as_str().unwrap_or("-"),
                w["name"].as_str().unwrap_or("-"),
                w["role"].as_str().unwrap_or("-"),
            );
        }
    }
    Ok(())
}

/// Resolve a workspace by id, name (case-insensitive), or slug against the cloud
/// list. On no match, list the available workspaces in the error (fixes the bare
/// `404 Not Found` the user hit when passing a name).
pub async fn resolve_workspace(client: &ApiClient, id_or_name: &str) -> Result<(String, String, String)> {
    let body = client.get("/api/v1/workspaces").await?;
    let ws = body.get("workspaces").cloned().unwrap_or(body);
    let arr = ws.as_array().cloned().unwrap_or_default();
    let needle = id_or_name.trim();
    let lower = needle.to_lowercase();
    let found = arr.iter().find(|w| {
        w["id"].as_str() == Some(needle)
            || w["name"].as_str().map(|n| n.eq_ignore_ascii_case(needle)).unwrap_or(false)
            || w["slug"].as_str().map(|s| s.to_lowercase() == lower).unwrap_or(false)
    });
    match found {
        Some(w) => Ok((
            w["id"].as_str().unwrap_or_default().to_string(),
            w["name"].as_str().unwrap_or_default().to_string(),
            w["slug"].as_str().unwrap_or_default().to_string(),
        )),
        None => {
            let avail: Vec<String> = arr
                .iter()
                .filter_map(|w| Some(format!("  {}  ({})", w["name"].as_str()?, w["id"].as_str()?)))
                .collect();
            let list = if avail.is_empty() { "  (none)".to_string() } else { avail.join("\n") };
            Err(anyhow!("no workspace matching \"{needle}\". Available:\n{list}"))
        }
    }
}

// ── Local note ops (LOCAL) ──

/// A note is a Markdown file that is NOT a `.board` kanban config.
fn is_note_path(rel: &str) -> bool {
    let p = Path::new(rel);
    jtype_core::is_markdown_path(p) && !jtype_core::is_board_path(p)
}

/// Note commands operate on Markdown only — reject `.board` kanban configs so
/// `jtype note create/get/update foo.board` can't read or clobber board metadata.
fn ensure_note_path(path: &str) -> Result<()> {
    if jtype_core::is_board_path(Path::new(path)) {
        return Err(anyhow!(
            "'{path}' is a kanban board file — use the `board`/`card` commands, not `note`"
        ));
    }
    Ok(())
}

pub fn list_notes_local(vault_root: &Path, folder: Option<&str>, json: bool) -> Result<()> {
    let docs = jtype_core::collect_sync_documents(vault_root).map_err(|e| anyhow!(e))?;
    let mut docs: Vec<_> = docs.into_iter().filter(|d| is_note_path(&d.relative_path)).collect();
    if let Some(f) = folder {
        let prefix = format!("{}/", f.trim_end_matches('/'));
        docs.retain(|d| d.relative_path == f || d.relative_path.starts_with(&prefix));
    }
    if json {
        let arr: Vec<Value> = docs
            .iter()
            .map(|d| json!({ "relativePath": d.relative_path, "title": d.title }))
            .collect();
        emit(true, &json!(arr));
    } else {
        for d in &docs {
            println!("{}  ({})", d.relative_path, d.title);
        }
        println!("\n{} note(s)", docs.len());
    }
    Ok(())
}

pub fn get_note_local(vault_root: &Path, path: &str, json: bool) -> Result<()> {
    ensure_note_path(path)?;
    let content = read_note_file(vault_root, path)?;
    if json {
        emit(true, &json!({ "relativePath": normalize_note_rel(path), "content": content }));
    } else {
        print!("{content}");
        if !content.ends_with('\n') {
            println!();
        }
    }
    Ok(())
}

pub fn search_notes_local(vault_root: &Path, query: &str, limit: usize, json: bool) -> Result<()> {
    let q = query.to_lowercase();
    let docs = jtype_core::collect_sync_documents(vault_root).map_err(|e| anyhow!(e))?;
    let mut matches = Vec::new();
    for d in docs.iter().filter(|d| is_note_path(&d.relative_path)) {
        if matches.len() >= limit.max(1) {
            break;
        }
        let meta_hit =
            d.title.to_lowercase().contains(&q) || d.relative_path.to_lowercase().contains(&q);
        let snippet = if meta_hit {
            None
        } else {
            match d.content.lines().find(|l| l.to_lowercase().contains(&q)) {
                Some(line) => Some(line.trim().chars().take(160).collect::<String>()),
                None => continue,
            }
        };
        matches.push(json!({ "path": d.relative_path, "title": d.title, "snippet": snippet }));
    }
    if json {
        emit(true, &json!({ "query": query, "matches": matches }));
    } else {
        for m in &matches {
            println!("{}", m["path"].as_str().unwrap_or("-"));
            if let Some(s) = m["snippet"].as_str() {
                println!("    {s}");
            }
        }
        println!("\n{} match(es)", matches.len());
    }
    Ok(())
}

/// Write a note to the vault (authoritative), then best-effort write-through to cloud.
/// `workspace` overrides the bound workspace as the write-through target (the
/// `--workspace` flag); when `None`, the cwd vault's `.jtype/cloud.json` binding is used.
pub async fn save_note_local(
    vault_root: &Path,
    cfg: &Config,
    workspace: Option<&str>,
    path: &str,
    content: &str,
    title: Option<&str>,
    json: bool,
) -> Result<()> {
    let rel = normalize_note_rel(path);
    ensure_note_path(&rel)?;
    let target = jtype_core::safe_join(vault_root, &rel).map_err(|e| anyhow!(e))?;
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).with_context(|| format!("creating {}", parent.display()))?;
    }
    std::fs::write(&target, content).with_context(|| format!("writing {}", target.display()))?;

    let binding = vault::load_binding(vault_root);
    let cloud = push_note(cfg, binding.as_ref(), workspace, &rel, content, title).await;

    if json {
        emit(true, &json!({ "relativePath": rel, "saved": true, "cloud": cloud.to_json() }));
    } else {
        match &cloud {
            CloudResult::Pushed(status) => println!("✓ saved {rel} (cloud: {status})"),
            CloudResult::NotBound => {
                println!("✓ saved {rel} locally (not bound — run `jtype bind` to sync)")
            }
            CloudResult::NotLoggedIn => {
                println!("✓ saved {rel} locally (not logged in — run `jtype login` to sync)")
            }
            CloudResult::Failed(e) => println!("✓ saved {rel} locally; cloud push failed: {e}"),
        }
    }
    Ok(())
}

enum CloudResult {
    Pushed(String),
    NotBound,
    NotLoggedIn,
    Failed(String),
}

impl CloudResult {
    fn to_json(&self) -> Value {
        match self {
            CloudResult::Pushed(s) => json!({ "pushed": true, "mergeStatus": s }),
            CloudResult::NotBound => json!({ "pushed": false, "reason": "not_bound" }),
            CloudResult::NotLoggedIn => json!({ "pushed": false, "reason": "not_logged_in" }),
            CloudResult::Failed(e) => json!({ "pushed": false, "reason": "error", "error": e }),
        }
    }
}

async fn push_note(
    cfg: &Config,
    binding: Option<&CloudBinding>,
    workspace: Option<&str>,
    rel: &str,
    content: &str,
    title: Option<&str>,
) -> CloudResult {
    // Target workspace: explicit --workspace wins; else the vault binding.
    // serverUrl comes from the binding when present, else the CLI default.
    let server_from = |b: Option<&CloudBinding>| {
        b.map(|b| b.server_url.clone())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| cfg.server_url.clone())
    };
    let (workspace_id, server) = match (workspace, binding) {
        (Some(ws), b) => (ws.to_string(), server_from(b)),
        (None, Some(b)) if b.is_bound() => (b.workspace_id.clone(), server_from(Some(b))),
        _ => return CloudResult::NotBound,
    };
    let token = match cfg.token.as_deref() {
        Some(t) if !t.is_empty() => t,
        _ => return CloudResult::NotLoggedIn,
    };
    let client = ApiClient::new(server, Some(token.to_string()));
    // Omit baseContentHash → last-write-wins (decision B); never 409.
    let mut body = json!({ "relativePath": rel, "content": content });
    if let Some(t) = title {
        body["title"] = json!(t);
    }
    match client
        .post(&format!("/api/v1/workspaces/{workspace_id}/documents/save"), body)
        .await
    {
        Ok(res) => CloudResult::Pushed(res["mergeStatus"].as_str().unwrap_or("ok").to_string()),
        Err(e) => CloudResult::Failed(format!("{e:#}")),
    }
}

/// Append `.md` when the path has no markdown/board extension.
pub fn normalize_note_rel(path: &str) -> String {
    let p = Path::new(path);
    if jtype_core::is_markdown_path(p) || jtype_core::is_board_path(p) {
        path.to_string()
    } else {
        format!("{path}.md")
    }
}

/// Read a note by relative path, trying `<path>` then `<path>.md`.
fn read_note_file(vault_root: &Path, path: &str) -> Result<String> {
    for rel in [path.to_string(), format!("{path}.md")] {
        if let Ok(target) = jtype_core::safe_join(vault_root, &rel) {
            if target.is_file() {
                return std::fs::read_to_string(&target)
                    .with_context(|| format!("reading {}", target.display()));
            }
        }
    }
    Err(anyhow!("note not found: {path}"))
}

/// Resolve note content from `--content` (literal or `-` for stdin) or `--file`.
pub fn read_content(content: Option<String>, file: Option<String>) -> Result<String> {
    if let Some(f) = file {
        return std::fs::read_to_string(&f).with_context(|| format!("reading {f}"));
    }
    match content {
        Some(c) if c != "-" => Ok(c),
        _ => std::io::read_to_string(std::io::stdin()).context("reading stdin"),
    }
}
