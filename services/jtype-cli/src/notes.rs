//! Workspace + note (document) commands.

use anyhow::{anyhow, Context, Result};
use serde_json::{json, Value};

use crate::client::ApiClient;
use crate::print::emit;

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

pub async fn list_notes(client: &ApiClient, ws: &str, folder: Option<&str>, json: bool) -> Result<()> {
    let docs = client.get(&format!("/api/v1/workspaces/{ws}/documents")).await?;
    let arr: Vec<Value> = docs.as_array().cloned().unwrap_or_default();
    let arr: Vec<Value> = match folder {
        Some(f) => {
            let prefix = format!("{}/", f.trim_end_matches('/'));
            arr.into_iter()
                .filter(|d| {
                    d["relativePath"]
                        .as_str()
                        .map(|p| p == f || p.starts_with(&prefix))
                        .unwrap_or(false)
                })
                .collect()
        }
        None => arr,
    };
    if json {
        emit(true, &json!(arr));
    } else {
        for d in &arr {
            println!(
                "{}  ({})",
                d["relativePath"].as_str().unwrap_or("-"),
                d["title"].as_str().unwrap_or("")
            );
        }
        println!("\n{} note(s)", arr.len());
    }
    Ok(())
}

/// Resolve a relative path (with or without `.md`) to a document id.
pub async fn resolve_doc_id(client: &ApiClient, ws: &str, path: &str) -> Result<String> {
    let docs = client.get(&format!("/api/v1/workspaces/{ws}/documents")).await?;
    docs.as_array()
        .and_then(|arr| {
            arr.iter().find(|d| {
                let rp = d["relativePath"].as_str().unwrap_or("");
                rp == path || rp == format!("{path}.md")
            })
        })
        .and_then(|d| d["id"].as_str().map(|s| s.to_string()))
        .ok_or_else(|| anyhow!("note not found: {path}"))
}

pub async fn get_note(client: &ApiClient, ws: &str, path: &str, json: bool) -> Result<()> {
    let id = resolve_doc_id(client, ws, path).await?;
    let doc = client.get(&format!("/api/v1/workspaces/{ws}/documents/{id}")).await?;
    if json {
        emit(true, &doc);
    } else {
        // Markdown content, token-efficient (mirrors Notion's markdown output).
        println!("{}", doc["content"].as_str().unwrap_or(""));
    }
    Ok(())
}

pub async fn search_notes(
    client: &ApiClient,
    ws: &str,
    query: &str,
    limit: usize,
    json: bool,
) -> Result<()> {
    let q = query.to_lowercase();
    let docs = client.get(&format!("/api/v1/workspaces/{ws}/documents")).await?;
    let arr: Vec<Value> = docs.as_array().cloned().unwrap_or_default();
    // Scan all returned docs; the early break below bounds per-doc content fetches.
    let mut matches = Vec::new();
    for d in arr.iter() {
        if matches.len() >= limit.max(1) {
            break;
        }
        let path = d["relativePath"].as_str().unwrap_or("");
        let title = d["title"].as_str().unwrap_or("");
        let id = d["id"].as_str().unwrap_or("");
        let mut snippet = None;
        let meta_hit = title.to_lowercase().contains(&q) || path.to_lowercase().contains(&q);
        if !meta_hit {
            let full = client.get(&format!("/api/v1/workspaces/{ws}/documents/{id}")).await.ok();
            let content = full
                .as_ref()
                .and_then(|f| f["content"].as_str())
                .unwrap_or("");
            match content.lines().find(|l| l.to_lowercase().contains(&q)) {
                Some(line) => snippet = Some(line.trim().chars().take(160).collect::<String>()),
                None => continue,
            }
        }
        matches.push(json!({ "path": path, "title": title, "snippet": snippet }));
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

pub async fn save_note(
    client: &ApiClient,
    ws: &str,
    path: &str,
    content: &str,
    title: Option<&str>,
    json: bool,
) -> Result<()> {
    let mut body = json!({ "relativePath": path, "content": content });
    if let Some(t) = title {
        body["title"] = json!(t);
    }
    let res = client
        .post(&format!("/api/v1/workspaces/{ws}/documents/save"), body)
        .await?;
    if json {
        emit(true, &res);
    } else {
        println!(
            "✓ saved {} ({})",
            res["relativePath"].as_str().unwrap_or(path),
            res["mergeStatus"].as_str().unwrap_or("ok")
        );
    }
    Ok(())
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
