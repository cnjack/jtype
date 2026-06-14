//! Persistent CLI config at `~/.jtype/cli.json` (mode 0600).
//!
//! Holds the server URL and the device-auth token.

use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

pub const DEFAULT_SERVER: &str = "http://localhost:13345";

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Config {
    #[serde(default = "default_server")]
    pub server_url: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
}

fn default_server() -> String {
    DEFAULT_SERVER.to_string()
}

impl Config {
    pub fn dir() -> Result<PathBuf> {
        let home = dirs::home_dir().context("cannot resolve home directory")?;
        Ok(home.join(".jtype"))
    }

    pub fn path() -> Result<PathBuf> {
        Ok(Self::dir()?.join("cli.json"))
    }

    pub fn load() -> Result<Self> {
        let path = Self::path()?;
        if !path.exists() {
            return Ok(Self {
                server_url: default_server(),
                ..Default::default()
            });
        }
        let text = std::fs::read_to_string(&path)
            .with_context(|| format!("reading {}", path.display()))?;
        let mut cfg: Config = serde_json::from_str(&text)
            .with_context(|| format!("parsing {}", path.display()))?;
        if cfg.server_url.is_empty() {
            cfg.server_url = default_server();
        }
        Ok(cfg)
    }

    pub fn save(&self) -> Result<()> {
        let dir = Self::dir()?;
        std::fs::create_dir_all(&dir).with_context(|| format!("creating {}", dir.display()))?;
        secure_dir(&dir);
        let path = Self::path()?;
        let tmp = dir.join("cli.json.tmp");
        let text = serde_json::to_string_pretty(self)?;
        // Write to a temp file created 0600 from the start, then atomically
        // rename: the bearer token is never momentarily world-readable, and a
        // crash mid-write can't leave a corrupt cli.json.
        write_private(&tmp, &text).with_context(|| format!("writing {}", tmp.display()))?;
        std::fs::rename(&tmp, &path).with_context(|| format!("finalizing {}", path.display()))?;
        Ok(())
    }

    pub fn require_token(&self) -> Result<&str> {
        self.token
            .as_deref()
            .filter(|t| !t.is_empty())
            .context("not logged in — run `jtype login` first")
    }
}

#[cfg(unix)]
fn write_private(path: &Path, text: &str) -> std::io::Result<()> {
    use std::io::Write;
    use std::os::unix::fs::OpenOptionsExt;
    let mut f = std::fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(0o600)
        .open(path)?;
    f.write_all(text.as_bytes())
}

#[cfg(not(unix))]
fn write_private(path: &Path, text: &str) -> std::io::Result<()> {
    std::fs::write(path, text)
}

#[cfg(unix)]
fn secure_dir(dir: &Path) {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(meta) = std::fs::metadata(dir) {
        let mut perms = meta.permissions();
        perms.set_mode(0o700);
        let _ = std::fs::set_permissions(dir, perms);
    }
}

#[cfg(not(unix))]
fn secure_dir(_dir: &Path) {}
