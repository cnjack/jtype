//! `jtype sync` — headless pull/push between the cwd vault and its bound cloud
//! workspace. The CLI owns its sync cursor in `.jtype/cloud.json` (decision C3) and
//! applies pulled docs with diff-before-write so a redundant pull is a no-op (no file
//! churn, no fight with the desktop app's watcher).

use std::path::Path;

use anyhow::{anyhow, Result};
use serde_json::{json, Value};

use crate::client::ApiClient;
use crate::config::Config;
use crate::print::emit;
use crate::vault;

const DEVICE_ID: &str = "jtype-cli";

pub async fn sync(cfg: &Config, vault_root: &Path, json: bool) -> Result<()> {
    let mut binding = vault::load_binding(vault_root)
        .filter(|b| b.is_bound())
        .ok_or_else(|| anyhow!("vault not bound — run `jtype bind --workspace <id|name>` first"))?;
    let token = cfg.require_token()?;
    let server = if binding.server_url.is_empty() {
        cfg.server_url.clone()
    } else {
        binding.server_url.clone()
    };
    let client = ApiClient::new(server, Some(token.to_string()));
    let ws = &binding.workspace_id;

    // ── Pull: one round-trip returns changed bodies + deletions keyed by relativePath.
    let pull_body = json!({ "sinceClock": binding.last_pulled_clock, "deviceId": DEVICE_ID });
    let resp = client.post(&format!("/api/v1/workspaces/{ws}/sync/pull"), pull_body).await?;
    let mut max_clock = binding.last_pulled_clock;
    let mut written = 0usize;
    let mut deleted = 0usize;

    for d in resp["documents"].as_array().cloned().unwrap_or_default() {
        let rel = d["relativePath"].as_str().unwrap_or_default();
        if rel.is_empty() {
            continue;
        }
        if apply_doc(vault_root, rel, d["content"].as_str().unwrap_or_default())? {
            written += 1;
        }
        if let Some(c) = d["updatedClock"].as_i64() {
            max_clock = max_clock.max(c);
        }
    }
    for d in resp["deletedPaths"].as_array().cloned().unwrap_or_default() {
        let rel = d["relativePath"].as_str().unwrap_or_default();
        if rel.is_empty() {
            continue;
        }
        if remove_doc(vault_root, rel)? {
            deleted += 1;
        }
        if let Some(c) = d["deletedClock"].as_i64() {
            max_clock = max_clock.max(c);
        }
    }

    // ── Push: upload all local docs (notes + boards), last-write-wins (no baseContentHash).
    // NOTE (last-write-wins, decision B): pulled content is applied to disk above before
    // this push snapshot is taken, so for a path changed BOTH locally (write-through having
    // failed) and remotely, the remote version wins. Conflict-safe sync (3-way merge against
    // `.jtype/sync-base/`) is the deferred full-engine work; the desktop app is the safety net.
    let local = jtype_core::collect_sync_documents(vault_root).map_err(|e| anyhow!(e))?;
    let documents: Vec<Value> = local
        .iter()
        .map(|d| json!({ "relativePath": d.relative_path, "content": d.content, "title": d.title }))
        .collect();
    let pushed = documents.len();
    let push_body = json!({ "deviceId": DEVICE_ID, "documents": documents });
    let presp = client.post(&format!("/api/v1/workspaces/{ws}/sync/push"), push_body).await?;
    let conflicts = presp["conflicts"].as_array().map(|a| a.len()).unwrap_or(0);

    // ── Advance the CLI-owned cursor (decision C3). PULL-ONLY high-water mark: never fold
    // push-assigned clocks in, or the next pull (sinceClock = this) would skip remote
    // changes created between our pull and push. Re-pulling our own pushes next time is a
    // harmless no-op thanks to diff-before-write.
    binding.last_pulled_clock = max_clock;
    vault::save_binding(vault_root, &binding)?;

    if json {
        emit(
            true,
            &json!({
                "pulled": { "written": written, "deleted": deleted },
                "pushed": pushed,
                "conflicts": conflicts,
                "clock": max_clock,
            }),
        );
    } else {
        println!("↓ pulled: {written} written, {deleted} deleted");
        let conflict_note = if conflicts > 0 {
            format!(", {conflicts} conflict(s)")
        } else {
            String::new()
        };
        println!("↑ pushed: {pushed} document(s){conflict_note}");
        println!("clock: {max_clock}");
    }
    Ok(())
}

/// Write only if on-disk content differs (idempotent re-pull — decision C3).
fn apply_doc(vault_root: &Path, rel: &str, content: &str) -> Result<bool> {
    let target = jtype_core::safe_join(vault_root, rel).map_err(|e| anyhow!(e))?;
    if target.is_file() {
        if let Ok(existing) = std::fs::read_to_string(&target) {
            if existing == content {
                return Ok(false);
            }
        }
    }
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&target, content)?;
    Ok(true)
}

fn remove_doc(vault_root: &Path, rel: &str) -> Result<bool> {
    let target = jtype_core::safe_join(vault_root, rel).map_err(|e| anyhow!(e))?;
    if target.is_file() {
        std::fs::remove_file(&target)?;
        return Ok(true);
    }
    Ok(false)
}
