//! First-party CLI login via the desktop device flow (full-scope session).
//!
//! The CLI is a trusted first-party tool, so it logs in with a full session
//! (like the desktop app) and can then mint scoped `mcp` tokens for other AI
//! clients via `jtype token create`. Third-party MCP clients instead use the
//! OAuth device-grant / authorization-code endpoints, which yield `mcp` scope.

use std::time::{Duration, Instant};

use anyhow::{anyhow, bail, Context, Result};
use reqwest::StatusCode;
use serde_json::{json, Value};

use crate::config::Config;

/// Run the device flow, storing the (full-scope) token + username in `cfg`.
pub async fn login(cfg: &mut Config) -> Result<()> {
    let http = reqwest::Client::new();
    let base = cfg.server_url.trim_end_matches('/').to_string();

    // 1. Start the device flow.
    let resp = http
        .post(format!("{base}/api/oauth/device/start"))
        .json(&json!({ "deviceId": "jtype-cli" }))
        .send()
        .await
        .context("device start failed")?;
    if !resp.status().is_success() {
        bail!("device start failed: {}", resp.status());
    }
    let da: Value = resp.json().await.context("invalid device start response")?;
    let device_code = da["deviceCode"].as_str().context("missing deviceCode")?.to_string();
    let user_code = da["userCode"].as_str().unwrap_or("").to_string();
    let verification = da["verificationUrl"].as_str().unwrap_or("(see server)").to_string();

    println!("To authorize the jtype CLI:");
    println!("  1. Open:          {verification}");
    println!("  2. Approve code:  {user_code}");
    println!("\nWaiting for approval…");

    // 2. Poll the device flow.
    let deadline = Instant::now() + Duration::from_secs(600);
    let token = loop {
        if Instant::now() >= deadline {
            bail!("device code expired before approval");
        }
        tokio::time::sleep(Duration::from_secs(2)).await;
        let r = http
            .post(format!("{base}/api/oauth/device/poll"))
            .json(&json!({ "deviceCode": device_code }))
            .send()
            .await
            .context("device poll failed")?;
        if r.status().is_success() {
            let d: Value = r.json().await?;
            break d["token"].as_str().context("poll response missing token")?.to_string();
        }
        match r.status() {
            StatusCode::BAD_REQUEST => continue, // authorization pending
            other => bail!("authorization failed: {other}"),
        }
    };

    // 3. Resolve the username and persist.
    cfg.token = Some(token.clone());
    let me = http
        .get(format!("{base}/api/me"))
        .bearer_auth(&token)
        .send()
        .await
        .context("fetching profile failed")?;
    let username = if me.status().is_success() {
        me.json::<Value>()
            .await
            .ok()
            .and_then(|v| v["username"].as_str().map(|s| s.to_string()))
    } else {
        None
    };
    cfg.username = username.clone();
    cfg.save()?;
    println!("\n✓ Logged in as {}", username.unwrap_or_else(|| "user".into()));
    Ok(())
}

/// `whoami` — verify the stored token and print the account.
pub async fn whoami(cfg: &Config) -> Result<Value> {
    let token = cfg.require_token()?;
    let http = reqwest::Client::new();
    let base = cfg.server_url.trim_end_matches('/');
    let resp = http
        .get(format!("{base}/api/me"))
        .bearer_auth(token)
        .send()
        .await
        .context("request failed")?;
    if resp.status().is_success() {
        resp.json::<Value>().await.map_err(|e| anyhow!(e))
    } else {
        Err(anyhow!("not authenticated ({}). Run `jtype login`.", resp.status()))
    }
}
