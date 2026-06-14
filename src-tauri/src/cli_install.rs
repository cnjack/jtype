//! Install / uninstall the `jtype` CLI from GitHub Releases into the user's PATH.
//!
//! OS-aware throughout:
//! - macOS / Linux → `~/.jtype/bin/jtype`, added to PATH via shell rc files
//!   (and a `/usr/local/bin` symlink when that dir is writable without sudo).
//! - Windows → `%LOCALAPPDATA%\jtype\bin\jtype.exe`, added to the user PATH
//!   (HKCU\Environment).

use std::path::{Path, PathBuf};

use serde::Serialize;

const REPO: &str = "cnjack/jtype";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliStatus {
    /// Whether the managed `jtype` binary exists on disk.
    installed: bool,
    /// Absolute path to the managed binary (when installed).
    path: Option<String>,
    /// Whether the install dir is on the *current process* PATH.
    on_path: bool,
    /// `jtype --version` output, if the binary runs.
    version: Option<String>,
    /// The release asset name for this platform (e.g. `jtype-macos-arm64`).
    asset: Option<String>,
}

/// Map (OS, arch) → the release asset name. Keep in sync with `.github/workflows/cli.yml`.
fn asset_name() -> Result<&'static str, String> {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("macos", "aarch64") => Ok("jtype-macos-arm64"),
        ("macos", "x86_64") => Ok("jtype-macos-x64"),
        ("linux", "x86_64") => Ok("jtype-linux-x64"),
        ("windows", "x86_64") => Ok("jtype-windows-x64.exe"),
        (os, arch) => Err(format!("no prebuilt jtype CLI for {os}/{arch} yet")),
    }
}

fn bin_dir() -> Result<PathBuf, String> {
    if cfg!(windows) {
        let base = std::env::var_os("LOCALAPPDATA").ok_or("LOCALAPPDATA is not set")?;
        Ok(PathBuf::from(base).join("jtype").join("bin"))
    } else {
        let home = dirs::home_dir().ok_or("cannot resolve home directory")?;
        Ok(home.join(".jtype").join("bin"))
    }
}

fn bin_path() -> Result<PathBuf, String> {
    let exe = if cfg!(windows) { "jtype.exe" } else { "jtype" };
    Ok(bin_dir()?.join(exe))
}

fn path_contains(dir: &Path) -> bool {
    std::env::var_os("PATH")
        .map(|p| std::env::split_paths(&p).any(|d| d == dir))
        .unwrap_or(false)
}

fn run_version(path: &Path) -> Option<String> {
    std::process::Command::new(path)
        .arg("--version")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.lines().next().unwrap_or("").trim().to_string())
        .filter(|s| !s.is_empty())
}

fn status() -> Result<CliStatus, String> {
    let dir = bin_dir()?;
    let path = bin_path()?;
    let installed = path.exists();
    Ok(CliStatus {
        on_path: path_contains(&dir),
        version: if installed { run_version(&path) } else { None },
        path: installed.then(|| path.display().to_string()),
        asset: asset_name().ok().map(str::to_string),
        installed,
    })
}

#[tauri::command]
pub fn cli_status() -> Result<CliStatus, String> {
    status()
}

#[tauri::command]
pub async fn install_cli() -> Result<CliStatus, String> {
    let asset = asset_name()?;
    let url = latest_asset_url(asset).await?;
    let bytes = download(&url).await?;

    let dir = bin_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("create {}: {e}", dir.display()))?;
    let path = bin_path()?;
    std::fs::write(&path, &bytes).map_err(|e| format!("write {}: {e}", path.display()))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("chmod {}: {e}", path.display()))?;
    }

    add_to_path(&dir)?;
    status()
}

#[tauri::command]
pub fn uninstall_cli() -> Result<CliStatus, String> {
    let path = bin_path()?;
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| format!("remove {}: {e}", path.display()))?;
    }
    #[cfg(unix)]
    {
        // Drop the convenience symlink; leave the (now-empty) PATH entry — harmless.
        let link = Path::new("/usr/local/bin/jtype");
        if link.exists() {
            let _ = std::fs::remove_file(link);
        }
    }
    status()
}

// ── Download ────────────────────────────────────────────────────────────────

async fn latest_asset_url(asset: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("jtype-desktop")
        .build()
        .map_err(|e| e.to_string())?;
    let url = format!("https://api.github.com/repos/{REPO}/releases/latest");
    let resp = client
        .get(&url)
        .header("accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("contacting GitHub: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("GitHub API returned {}", resp.status()));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["assets"]
        .as_array()
        .into_iter()
        .flatten()
        .find(|a| a["name"].as_str() == Some(asset))
        .and_then(|a| a["browser_download_url"].as_str())
        .map(str::to_string)
        .ok_or_else(|| format!("the latest release has no '{asset}' asset yet"))
}

async fn download(url: &str) -> Result<Vec<u8>, String> {
    let client = reqwest::Client::builder()
        .user_agent("jtype-desktop")
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client.get(url).send().await.map_err(|e| format!("download: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("download failed: {}", resp.status()));
    }
    Ok(resp.bytes().await.map_err(|e| e.to_string())?.to_vec())
}

// ── PATH integration (OS-specific) ──────────────────────────────────────────

#[cfg(unix)]
fn add_to_path(dir: &Path) -> Result<(), String> {
    use std::io::Write;
    let home = dirs::home_dir().ok_or("cannot resolve home directory")?;
    let block = "\n# Added by JType — jtype CLI\nexport PATH=\"$HOME/.jtype/bin:$PATH\"\n";
    // Append to whichever shell rc files exist / are common, idempotently.
    for rc in [".zshrc", ".bashrc", ".profile", ".bash_profile"] {
        let p = home.join(rc);
        let existing = std::fs::read_to_string(&p).unwrap_or_default();
        if existing.contains(".jtype/bin") {
            continue;
        }
        // Create .zshrc/.profile even if absent; skip absent bash files to avoid clutter.
        let create = matches!(rc, ".zshrc" | ".profile") || p.exists();
        if !create {
            continue;
        }
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&p) {
            let _ = f.write_all(block.as_bytes());
        }
    }
    // Best-effort: symlink into a standard PATH dir if writable without sudo.
    let standard = Path::new("/usr/local/bin");
    if standard.is_dir() {
        let link = standard.join("jtype");
        let target = dir.join("jtype");
        let _ = std::fs::remove_file(&link);
        let _ = std::os::unix::fs::symlink(&target, &link);
    }
    Ok(())
}

#[cfg(windows)]
fn add_to_path(dir: &Path) -> Result<(), String> {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ, KEY_WRITE};
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let env = hkcu
        .open_subkey_with_flags("Environment", KEY_READ | KEY_WRITE)
        .map_err(|e| format!("open user environment: {e}"))?;
    let current: String = env.get_value("Path").unwrap_or_default();
    let dir_str = dir.display().to_string();
    let present = current
        .split(';')
        .any(|p| p.trim().eq_ignore_ascii_case(dir_str.trim()));
    if !present {
        let new = if current.trim().is_empty() {
            dir_str
        } else {
            format!("{};{}", current.trim_end_matches(';'), dir_str)
        };
        env.set_value("Path", &new)
            .map_err(|e| format!("update user PATH: {e}"))?;
    }
    Ok(())
}
