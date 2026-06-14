//! Local vault discovery + the per-vault cloud binding (`.jtype/cloud.json`).
//!
//! The desktop app and this CLI both treat a `.jtype/`-marked folder as a vault
//! (see `jtype_core::detect_vault_root`). The binding file makes a vault
//! self-describing — it carries the cloud `workspaceId` + `serverUrl` so the CLI
//! can write-through / sync from the vault directory alone, without consulting the
//! desktop app's global config. The auth token is NOT stored here (it stays in
//! `~/.jtype/cli.json`); `lastPulledClock` is the CLI-owned sync cursor (decision C3).

use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudBinding {
    pub workspace_id: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub server_url: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub workspace_name: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub workspace_slug: String,
    #[serde(default)]
    pub last_pulled_clock: i64,
}

impl CloudBinding {
    pub fn is_bound(&self) -> bool {
        !self.workspace_id.is_empty()
    }
}

fn binding_path(vault_root: &Path) -> PathBuf {
    vault_root.join(".jtype").join("cloud.json")
}

/// Resolve an existing vault root for read/write note ops: explicit `--vault`, else
/// walk up from the current directory for `.jtype/`. Errors if none is found.
pub fn require_vault(explicit: Option<&str>) -> Result<PathBuf> {
    let start = match explicit {
        Some(p) => PathBuf::from(p),
        None => std::env::current_dir().context("cannot resolve current directory")?,
    };
    jtype_core::detect_vault_root(&start).ok_or_else(|| {
        anyhow!(
            "not inside a JType vault (no .jtype/ found) — cd into a vault, run `jtype bind` \
             here to create one, or pass --vault <path>"
        )
    })
}

/// Resolve a vault root, initializing `.jtype/` at the target if none exists yet.
/// Used by `bind` and note create/update so `cd ~/notes && jtype note create …` just works.
pub fn vault_or_init(explicit: Option<&str>) -> Result<PathBuf> {
    let start = match explicit {
        Some(p) => PathBuf::from(p),
        None => std::env::current_dir().context("cannot resolve current directory")?,
    };
    if let Some(root) = jtype_core::detect_vault_root(&start) {
        return Ok(root);
    }
    // No vault marker yet — treat the target dir as the vault root and create `.jtype/`.
    std::fs::create_dir_all(start.join(".jtype"))
        .with_context(|| format!("creating vault metadata in {}", start.display()))?;
    Ok(start)
}

pub fn load_binding(vault_root: &Path) -> Option<CloudBinding> {
    let text = std::fs::read_to_string(binding_path(vault_root)).ok()?;
    serde_json::from_str(&text).ok()
}

pub fn save_binding(vault_root: &Path, binding: &CloudBinding) -> Result<()> {
    let dir = vault_root.join(".jtype");
    std::fs::create_dir_all(&dir).with_context(|| format!("creating {}", dir.display()))?;
    let path = binding_path(vault_root);
    let text = serde_json::to_string_pretty(binding)?;
    std::fs::write(&path, format!("{text}\n")).with_context(|| format!("writing {}", path.display()))?;
    Ok(())
}
