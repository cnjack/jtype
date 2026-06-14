//! Manage scoped MCP tokens (`/api/me/tokens`) from the CLI.

use anyhow::Result;
use serde_json::json;

use crate::client::ApiClient;
use crate::print::emit;

pub async fn create(client: &ApiClient, label: Option<&str>, ttl_days: Option<i64>, json: bool) -> Result<()> {
    let mut body = serde_json::Map::new();
    if let Some(l) = label {
        body.insert("label".into(), json!(l));
    }
    if let Some(d) = ttl_days {
        body.insert("ttlDays".into(), json!(d));
    }
    let res = client.post("/api/me/tokens", serde_json::Value::Object(body)).await?;
    if json {
        emit(true, &res);
    } else {
        println!("✓ Created MCP token (scope {}, expires in {} days):\n", res["scope"].as_str().unwrap_or("mcp"), res["ttlDays"].as_i64().unwrap_or(90));
        println!("{}", res["token"].as_str().unwrap_or(""));
        println!("\nStore it now — it won't be shown again. Use it as the MCP `Authorization: Bearer` header.");
    }
    Ok(())
}

pub async fn list(client: &ApiClient, json: bool) -> Result<()> {
    let res = client.get("/api/me/tokens").await?;
    let tokens = res.get("tokens").cloned().unwrap_or(res);
    if json {
        emit(true, &tokens);
    } else {
        println!("{:<10}  {:<6}  {:<18}  {}", "SCOPE", "CUR", "LABEL", "EXPIRES");
        for t in tokens.as_array().cloned().unwrap_or_default() {
            println!(
                "{:<10}  {:<6}  {:<18}  {}",
                t["scope"].as_str().unwrap_or("-"),
                if t["current"].as_bool().unwrap_or(false) { "*" } else { "" },
                t["label"].as_str().unwrap_or(""),
                t["expiresAt"].as_str().unwrap_or("never"),
            );
            if !json {
                println!("    id: {}", t["id"].as_str().unwrap_or(""));
            }
        }
    }
    Ok(())
}

pub async fn revoke(client: &ApiClient, id: &str) -> Result<()> {
    client.send(reqwest::Method::DELETE, &format!("/api/me/tokens/{id}"), None).await?;
    println!("✓ Revoked token {id}");
    Ok(())
}
