//! `jtype mcp-stdio` — a local stdio MCP server that bridges newline-delimited
//! JSON-RPC on stdin/stdout to the authenticated HTTP `/mcp` endpoint.
//!
//! This lets MCP clients that only speak stdio (and can't hold a bearer token)
//! reach the same JType tool set the HTTP server exposes. It is resilient: a
//! transient upstream failure on one message reports a JSON-RPC error (echoing
//! the request id) and keeps serving, rather than killing the session.

use anyhow::{Context, Result};
use serde_json::{json, Value};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader, Stdout};

use crate::client::ApiClient;

pub async fn run(client: &ApiClient) -> Result<()> {
    let stdin = tokio::io::stdin();
    let mut lines = BufReader::new(stdin).lines();
    let mut stdout = tokio::io::stdout();

    while let Some(line) = lines.next_line().await.context("reading stdin")? {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        // A present id means a request (needs a response); a missing id means a
        // notification, which must never get a response.
        let req_id = serde_json::from_str::<Value>(trimmed)
            .ok()
            .and_then(|v| v.get("id").cloned());

        match client.post_mcp_raw(trimmed).await {
            Ok((status, body)) => {
                if status.is_success() {
                    // Forward the upstream JSON-RPC response. An empty 2xx body is
                    // a notification ack (202) → write nothing.
                    if !body.trim().is_empty() {
                        write_line(&mut stdout, body.trim_end()).await?;
                    }
                } else if let Some(id) = &req_id {
                    // Non-2xx: synthesize a JSON-RPC error so the client never
                    // hangs (empty body) or chokes on a non-envelope body
                    // (e.g. proxy HTML / gateway timeout).
                    let detail = body.trim();
                    let msg = if detail.is_empty() {
                        format!("upstream http {}", status.as_u16())
                    } else {
                        format!(
                            "upstream http {}: {}",
                            status.as_u16(),
                            detail.chars().take(200).collect::<String>()
                        )
                    };
                    write_line(&mut stdout, &rpc_error(id, -32000, &msg)).await?;
                }
            }
            Err(e) => {
                // Survive transient network failures instead of aborting the server.
                if let Some(id) = &req_id {
                    let msg = rpc_error(id, -32000, &e.to_string());
                    write_line(&mut stdout, &msg).await?;
                }
            }
        }
    }
    Ok(())
}

async fn write_line(out: &mut Stdout, s: &str) -> Result<()> {
    out.write_all(s.as_bytes()).await?;
    out.write_all(b"\n").await?;
    out.flush().await?;
    Ok(())
}

fn rpc_error(id: &Value, code: i64, message: &str) -> String {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": { "code": code, "message": message }
    })
    .to_string()
}
