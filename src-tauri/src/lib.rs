mod cli_install;
mod ws_client;

// `workspace` now lives in the shared `jtype-core` crate (extracted so the `jtype`
// CLI can reuse the exact vault logic). Aliased so the existing `workspace::…`
// call-sites and command wrappers below compile unchanged.
use jtype_core as workspace;

use notify::Watcher;
use serde::{Deserialize, Serialize};
use std::{
    collections::hash_map::DefaultHasher,
    env, fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
    sync::Mutex,
    time::Duration,
};
use tauri::Manager;
use tauri::{AppHandle, Emitter};

use workspace::{
    AiIndexResult, AssetSyncState, EntryKind, FolderContentsSummary, PublishResult, SyncBaseEntry,
    SyncDocument, SyncFolder, TrashItemInfo, TrashMetadata, ValidationResult, WorkspaceSnapshot,
};

struct WatcherState {
    watcher: Option<notify::RecommendedWatcher>,
}

struct WsListenerHandle(Mutex<Option<tauri::async_runtime::JoinHandle<()>>>);

/// Broadcast sender for outgoing WS messages.  Each call to `start_ws_listener`
/// subscribes a new receiver so reconnects don't lose the handle.
struct WsOutbox(tokio::sync::broadcast::Sender<String>);

struct AppState {
    watcher_state: Mutex<WatcherState>,
    pending_open_paths: Mutex<Vec<String>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeCapabilities {
    platform: &'static str,
    client_type: &'static str,
    is_mobile: bool,
    is_touch_primary: bool,
    prefers_compact_layout: bool,
    supports_window_drag: bool,
    supports_updater: bool,
    supports_process_restart: bool,
    supports_cli_install: bool,
    supports_file_drop: bool,
    supports_external_vault: bool,
    uses_app_private_vault: bool,
}

#[tauri::command]
fn runtime_capabilities() -> RuntimeCapabilities {
    let platform = if cfg!(target_os = "android") {
        "android"
    } else if cfg!(target_os = "ios") {
        "ios"
    } else {
        "desktop"
    };
    let is_mobile = cfg!(mobile);

    RuntimeCapabilities {
        platform,
        client_type: if is_mobile { "mobile" } else { "desktop" },
        is_mobile,
        is_touch_primary: is_mobile,
        prefers_compact_layout: is_mobile,
        supports_window_drag: !is_mobile,
        supports_updater: !is_mobile,
        supports_process_restart: !is_mobile,
        supports_cli_install: !is_mobile,
        supports_file_drop: !is_mobile,
        supports_external_vault: !is_mobile,
        uses_app_private_vault: is_mobile,
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct CloudProfile {
    server_url: String,
    username: String,
    site_url: String,
    token: String,
    device_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct VaultBinding {
    workspace_id: String,
    workspace_name: String,
    workspace_slug: String,
    #[serde(default = "default_workspace_role")]
    workspace_role: String,
    local_vault_path: String,
    last_pulled_clock: i64,
}

fn default_workspace_role() -> String {
    "editor".to_string()
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct VaultBindingStore {
    bindings: Vec<VaultBinding>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CloudSyncDocument {
    relative_path: String,
    content: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CloudSyncFolder {
    relative_path: String,
}

/// Result of `apply_cloud_documents`. `written_paths` lists the documents that
/// were ACTUALLY written to disk — the caller advances sync-bases off this, not
/// off the requested set, so a file the gate skipped never gets a poisoned base
/// (which would make the 3-way merge treat a never-written file as "locally
/// modified" and strand it on every future pull).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ApplyCloudResult {
    workspace: workspace::WorkspaceSnapshot,
    written_paths: Vec<String>,
}

#[tauri::command]
fn initial_open_paths(state: tauri::State<'_, AppState>) -> Vec<String> {
    let mut paths: Vec<String> = env::args()
        .skip(1)
        .filter_map(|arg| normalize_open_path_arg(&arg))
        .collect();
    paths.extend(state.pending_open_paths.lock().unwrap().drain(..));
    paths
}

fn normalize_open_path_arg(arg: &str) -> Option<String> {
    if let Some(path) = arg.strip_prefix("file://") {
        let decoded = percent_decode_path(path);
        if workspace::is_markdown_path(&PathBuf::from(&decoded)) {
            return Some(decoded);
        }
        return None;
    }

    if workspace::is_markdown_path(&PathBuf::from(arg)) {
        Some(arg.to_string())
    } else {
        None
    }
}

fn percent_decode_path(path: &str) -> String {
    let bytes = path.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            if let (Some(high), Some(low)) =
                (hex_value(bytes[index + 1]), hex_value(bytes[index + 2]))
            {
                decoded.push((high << 4) | low);
                index += 3;
                continue;
            }
        }
        decoded.push(bytes[index]);
        index += 1;
    }
    String::from_utf8_lossy(&decoded).into_owned()
}

fn hex_value(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

#[tauri::command]
fn default_vault_path(app: AppHandle) -> Result<String, String> {
    Ok(path_to_string(&default_vault_dir(&app)?))
}

#[tauri::command]
fn open_default_vault(app: AppHandle) -> Result<WorkspaceSnapshot, String> {
    let path = default_vault_dir(&app)?;
    fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    workspace::open_workspace(&path)
}

#[tauri::command]
fn read_markdown_file(path: String) -> Result<String, String> {
    workspace::read_markdown(&PathBuf::from(path))
}

#[tauri::command]
fn write_markdown_file(path: String, content: String) -> Result<(), String> {
    workspace::write_markdown(&PathBuf::from(path), &content)
}

#[tauri::command]
fn write_binary_file(path: String, content: Vec<u8>) -> Result<(), String> {
    let path = PathBuf::from(path);
    // Pasted images land in an `assets/` dir that may not exist yet.
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(path, content).map_err(|error| error.to_string())
}

#[tauri::command]
fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(PathBuf::from(path)).map_err(|error| error.to_string())
}

#[tauri::command]
fn open_workspace(path: String) -> Result<WorkspaceSnapshot, String> {
    workspace::open_workspace(&PathBuf::from(path))
}

#[tauri::command]
fn detect_vault_root(path: String) -> Option<String> {
    workspace::detect_vault_root(&PathBuf::from(path)).map(|p| path_to_string(&p))
}

#[tauri::command]
fn create_workspace_entry(
    root_path: String,
    relative_path: String,
    kind: EntryKind,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    workspace::create_entry(&root, &relative_path, kind)?;
    workspace::open_workspace(&root)
}

/// Copy externally-dropped files/folders into the vault under `target_folder`
/// (collision-safe), then return the refreshed workspace plus the imported
/// vault-relative paths so the UI can reveal/open them.
#[tauri::command]
fn import_external_paths(
    root_path: String,
    source_paths: Vec<String>,
    target_folder: String,
) -> Result<(WorkspaceSnapshot, Vec<String>), String> {
    let root = PathBuf::from(root_path);
    let mut imported = Vec::new();
    for source in &source_paths {
        let relative =
            workspace::import_external_path(&root, &PathBuf::from(source), &target_folder)?;
        imported.push(relative);
    }
    let snapshot = workspace::open_workspace(&root)?;
    Ok((snapshot, imported))
}

/// List vault-relative paths of binary assets (images/PDFs) for blob sync.
#[tauri::command]
fn collect_asset_paths(root_path: String) -> Result<Vec<String>, String> {
    workspace::collect_asset_paths(&PathBuf::from(root_path))
}

/// Load the per-vault asset blob sync state (last-synced sha per path + clock).
#[tauri::command]
fn load_asset_sync_state(root_path: String) -> Result<AssetSyncState, String> {
    workspace::load_asset_sync_state(&PathBuf::from(root_path))
}

/// Persist the per-vault asset blob sync state after a blob-sync pass.
#[tauri::command]
fn save_asset_sync_state(root_path: String, state: AssetSyncState) -> Result<(), String> {
    workspace::save_asset_sync_state(&PathBuf::from(root_path), &state)
}

/// Read a `.board` view file (plain text/JSON; bypasses the markdown-only gate).
#[tauri::command]
fn read_board_file(path: String) -> Result<String, String> {
    fs::read_to_string(PathBuf::from(path)).map_err(|error| error.to_string())
}

/// Read a diagram/text resource (Mermaid/Draw.io/Excalidraw/Swagger) as text,
/// bypassing the Markdown-only gate.
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    workspace::read_text(&PathBuf::from(path))
}

/// Write a diagram/text resource as text, creating parent directories as needed.
#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    workspace::write_text(&PathBuf::from(path), &content)
}

/// Write a `.board` view file (plain text/JSON), creating parent dirs as needed.
#[tauri::command]
fn write_board_file(path: String, content: String) -> Result<(), String> {
    let target = PathBuf::from(path);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(target, content).map_err(|error| error.to_string())
}

/// Create a new `.board` file with the given JSON config and return the refreshed workspace.
#[tauri::command]
fn create_board(
    root_path: String,
    relative_path: String,
    content: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(&root_path);
    workspace::create_entry(&root, &relative_path, EntryKind::Board)?;
    let target = root.join(&relative_path);
    fs::write(&target, content).map_err(|error| error.to_string())?;
    workspace::open_workspace(&root)
}

/// Scan the vault for card-notes belonging to a board (frontmatter `board == board_id`).
#[tauri::command]
fn scan_board_cards(
    root_path: String,
    board_id: String,
) -> Result<Vec<workspace::BoardCardInfo>, String> {
    workspace::scan_board_cards(&PathBuf::from(root_path), &board_id)
}

/// List card templates (`.md` files in `<board_dir>/.templates/`).
#[tauri::command]
fn scan_card_templates(
    root_path: String,
    board_dir: String,
) -> Result<Vec<workspace::CardTemplateInfo>, String> {
    workspace::scan_card_templates(&PathBuf::from(root_path), &board_dir)
}

#[tauri::command]
fn rename_workspace_entry(
    root_path: String,
    from_relative_path: String,
    to_relative_path: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    workspace::rename_entry(&root, &from_relative_path, &to_relative_path)?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn delete_workspace_entry(
    root_path: String,
    relative_path: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    workspace::delete_entry(&root, &relative_path)?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn export_static_site(
    root_path: String,
    output_relative_path: String,
) -> Result<PublishResult, String> {
    workspace::export_static_site(&PathBuf::from(root_path), &output_relative_path)
}

#[tauri::command]
fn validate_workspace(root_path: String) -> Result<ValidationResult, String> {
    workspace::validate_workspace(&PathBuf::from(root_path))
}

#[tauri::command]
fn build_ai_index(root_path: String) -> Result<AiIndexResult, String> {
    workspace::build_ai_index(&PathBuf::from(root_path))
}

#[tauri::command]
fn collect_sync_documents(root_path: String) -> Result<Vec<SyncDocument>, String> {
    workspace::collect_sync_documents(&PathBuf::from(root_path))
}

#[tauri::command]
fn collect_sync_folders(root_path: String) -> Result<Vec<SyncFolder>, String> {
    workspace::collect_sync_folders(&PathBuf::from(root_path))
}

#[tauri::command]
fn save_sync_bases(root_path: String, documents: Vec<SyncBaseEntry>) -> Result<(), String> {
    workspace::save_sync_bases(&PathBuf::from(root_path), &documents)
}

#[tauri::command]
fn delete_sync_bases(root_path: String, relative_paths: Vec<String>) -> Result<(), String> {
    workspace::delete_sync_bases(&PathBuf::from(root_path), &relative_paths)
}

#[tauri::command]
fn load_sync_bases(root_path: String) -> Result<std::collections::HashMap<String, String>, String> {
    workspace::load_all_sync_bases(&PathBuf::from(root_path))
}

#[tauri::command]
fn save_sync_folder_bases(root_path: String, folders: Vec<String>) -> Result<(), String> {
    workspace::save_sync_folder_bases(&PathBuf::from(root_path), &folders)
}

#[tauri::command]
fn delete_sync_folder_bases(root_path: String, relative_paths: Vec<String>) -> Result<(), String> {
    workspace::delete_sync_folder_bases(&PathBuf::from(root_path), &relative_paths)
}

#[tauri::command]
fn load_sync_folder_bases(root_path: String) -> Result<Vec<String>, String> {
    workspace::load_sync_folder_bases(&PathBuf::from(root_path))
}

#[tauri::command]
fn load_cloud_profile(app: AppHandle) -> Result<CloudProfile, String> {
    let file = cloud_profile_file(&app)?;
    if !file.exists() {
        return Ok(CloudProfile {
            server_url: "http://localhost:13345".to_string(),
            device_id: device_id(),
            ..CloudProfile::default()
        });
    }
    let content = fs::read_to_string(file).map_err(|error| error.to_string())?;
    let mut profile: CloudProfile =
        serde_json::from_str(&content).map_err(|error| error.to_string())?;
    if profile.server_url.trim().is_empty() {
        profile.server_url = "http://localhost:13345".to_string();
    }
    if profile.device_id.trim().is_empty() {
        profile.device_id = device_id();
    }
    Ok(profile)
}

#[tauri::command]
fn save_cloud_profile(app: AppHandle, profile: CloudProfile) -> Result<CloudProfile, String> {
    let mut next = profile;
    if next.server_url.trim().is_empty() {
        next.server_url = "http://localhost:13345".to_string();
    }
    if next.device_id.trim().is_empty() {
        next.device_id = device_id();
    }
    write_json(&cloud_profile_file(&app)?, &next)?;
    Ok(next)
}

#[tauri::command]
fn list_vault_bindings(app: AppHandle) -> Result<Vec<VaultBinding>, String> {
    Ok(read_binding_store(&app)?.bindings)
}

#[tauri::command]
fn bind_cloud_workspace(
    app: AppHandle,
    binding: VaultBinding,
) -> Result<Vec<VaultBinding>, String> {
    if binding.workspace_id.trim().is_empty() {
        return Err("Cloud workspace id is required.".to_string());
    }
    if binding.local_vault_path.trim().is_empty() {
        return Err("Local vault path is required.".to_string());
    }
    let mut binding = binding;
    if binding.workspace_role.trim().is_empty() {
        binding.workspace_role = default_workspace_role();
    }
    let mut store = read_binding_store(&app)?;
    store.bindings.retain(|item| {
        item.workspace_id != binding.workspace_id
            && item.local_vault_path != binding.local_vault_path
    });
    store.bindings.push(binding);
    store
        .bindings
        .sort_by(|left, right| left.workspace_name.cmp(&right.workspace_name));
    write_json(&vault_bindings_file(&app)?, &store)?;
    Ok(store.bindings)
}

#[tauri::command]
fn apply_cloud_documents(
    root_path: String,
    documents: Vec<CloudSyncDocument>,
    folders: Vec<CloudSyncFolder>,
) -> Result<ApplyCloudResult, String> {
    let root = PathBuf::from(root_path);
    for folder in folders {
        let target = safe_join(&root, &folder.relative_path)?;
        fs::create_dir_all(target).map_err(|error| error.to_string())?;
    }
    let mut written_paths = Vec::new();
    for document in documents {
        let doc_path = PathBuf::from(&document.relative_path);
        // Markdown, `.board` kanban views, and diagram resources
        // (Mermaid/Draw.io/Excalidraw/Swagger) all sync down as opaque text.
        // Must mirror collect_sync_documents / collect_files_recursive exactly —
        // hence the shared predicate, so a synced type can't be dropped here.
        if !workspace::is_syncable_document_path(&doc_path) {
            continue;
        }
        let target = safe_join(&root, &document.relative_path)?;
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::write(target, document.content).map_err(|error| error.to_string())?;
        written_paths.push(document.relative_path);
    }
    let workspace = workspace::open_workspace(&root)?;
    Ok(ApplyCloudResult {
        workspace,
        written_paths,
    })
}

#[tauri::command]
fn apply_deleted_cloud_folders(
    root_path: String,
    folders: Vec<CloudSyncFolder>,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    let mut folders = folders;
    folders.sort_by(|left, right| right.relative_path.cmp(&left.relative_path));
    for folder in folders {
        let target = safe_join(&root, &folder.relative_path)?;
        if target.is_dir()
            && fs::read_dir(&target)
                .map_err(|error| error.to_string())?
                .next()
                .is_none()
        {
            fs::remove_dir(&target).map_err(|error| error.to_string())?;
        }
    }
    workspace::open_workspace(&root)
}

#[tauri::command]
fn trash_workspace_entry(
    root_path: String,
    relative_path: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    workspace::trash_entry(&root, &relative_path)?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn list_workspace_trash(root_path: String) -> Result<Vec<TrashItemInfo>, String> {
    workspace::list_trash(&PathBuf::from(root_path))
}

#[tauri::command]
fn restore_workspace_trash(
    root_path: String,
    trash_id: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    workspace::restore_from_trash(&root, &trash_id)?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn permanent_delete_trash(root_path: String, trash_id: String) -> Result<(), String> {
    workspace::permanent_delete_from_trash(&PathBuf::from(root_path), &trash_id)
}

#[tauri::command]
fn empty_workspace_trash(root_path: String) -> Result<(), String> {
    workspace::empty_trash(&PathBuf::from(root_path))
}

#[tauri::command]
fn start_file_watcher(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    root_path: String,
) -> Result<(), String> {
    let root = PathBuf::from(&root_path);
    if !root.exists() {
        return Err("Vault path does not exist.".to_string());
    }

    {
        let mut ws = state.watcher_state.lock().map_err(|e| e.to_string())?;
        ws.watcher = None;
    }

    let (tx, rx) = std::sync::mpsc::channel::<Result<notify::Event, notify::Error>>();

    let mut watcher: notify::RecommendedWatcher =
        notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
            if let Ok(e) = res {
                let _ = tx.send(Ok(e));
            }
        })
        .map_err(|e| e.to_string())?;

    watcher
        .watch(&root, notify::RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    {
        let mut ws = state.watcher_state.lock().map_err(|e| e.to_string())?;
        ws.watcher = Some(watcher);
    }

    std::thread::spawn(move || {
        while let Ok(event) = rx.recv() {
            match event {
                Ok(e) => {
                    let paths: Vec<String> = e
                        .paths
                        .iter()
                        .filter(|p| {
                            let s = p.to_string_lossy();
                            !s.contains(".jtype/")
                                && !s.contains(".git/")
                                && !s.contains("node_modules/")
                                && !s.contains("/target/")
                        })
                        .map(|p| p.to_string_lossy().replace('\\', "/"))
                        .collect();
                    if !paths.is_empty() {
                        let _ = app.emit("vault-file-changed", paths);
                    }
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn stop_file_watcher(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut ws = state.watcher_state.lock().map_err(|e| e.to_string())?;
    ws.watcher = None;
    Ok(())
}

fn safe_join(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let relative = PathBuf::from(relative_path);
    if relative.is_absolute() {
        return Err("Cloud document path must be relative.".to_string());
    }
    let mut target = root.to_path_buf();
    for component in relative.components() {
        match component {
            std::path::Component::Normal(value) => target.push(value),
            _ => return Err("Cloud document path cannot escape the vault.".to_string()),
        }
    }
    Ok(target)
}

#[cfg(desktop)]
fn default_vault_dir(_app: &AppHandle) -> Result<PathBuf, String> {
    let home = env::var_os("USERPROFILE")
        .or_else(|| env::var_os("HOME"))
        .map(PathBuf::from)
        .ok_or_else(|| "Could not find the user home directory.".to_string())?;
    Ok(home.join("Documents").join("Jtype Vaullt"))
}

#[cfg(mobile)]
fn default_vault_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|base| base.join("vaults").join("default"))
        .map_err(|error| error.to_string())
}

#[cfg(desktop)]
fn config_dir(_app: &AppHandle) -> Result<PathBuf, String> {
    let base = env::var_os("APPDATA")
        .or_else(|| env::var_os("XDG_CONFIG_HOME"))
        .map(PathBuf::from)
        .or_else(|| env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")))
        .ok_or_else(|| "Could not find the app config directory.".to_string())?;
    let dir = base.join("JType");
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

#[cfg(mobile)]
fn config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn cloud_profile_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("cloud-profile.json"))
}

fn vault_bindings_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("vault-bindings.json"))
}

fn read_binding_store(app: &AppHandle) -> Result<VaultBindingStore, String> {
    let file = vault_bindings_file(app)?;
    if !file.exists() {
        return Ok(VaultBindingStore::default());
    }
    let content = fs::read_to_string(file).map_err(|error| error.to_string())?;
    serde_json::from_str(&content).map_err(|error| error.to_string())
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let json = serde_json::to_string_pretty(value).map_err(|error| error.to_string())?;
    fs::write(path, json).map_err(|error| error.to_string())
}

fn device_id() -> String {
    let user = env::var("USERNAME")
        .or_else(|_| env::var("USER"))
        .unwrap_or_else(|_| "user".to_string());
    let machine = env::var("COMPUTERNAME")
        .or_else(|_| env::var("HOSTNAME"))
        .unwrap_or_else(|_| "device".to_string());
    stable_id(&format!("{user}@{machine}"))
}

fn stable_id(value: &str) -> String {
    let mut hasher = DefaultHasher::new();
    value.hash(&mut hasher);
    format!("dev_{:x}", hasher.finish())
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

// ── Folder commands ──

#[tauri::command]
fn create_workspace_folder(
    root_path: String,
    folder_relative_path: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    workspace::create_folder(&root, &folder_relative_path)?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn rename_workspace_folder(
    root_path: String,
    from_relative_path: String,
    to_relative_path: String,
) -> Result<(WorkspaceSnapshot, Vec<String>), String> {
    let root = PathBuf::from(root_path);
    let impacted = workspace::rename_folder(&root, &from_relative_path, &to_relative_path)?;
    let snapshot = workspace::open_workspace(&root)?;
    Ok((snapshot, impacted))
}

#[tauri::command]
fn move_workspace_folder(
    root_path: String,
    from_relative_path: String,
    to_relative_path: String,
) -> Result<(WorkspaceSnapshot, Vec<String>), String> {
    let root = PathBuf::from(root_path);
    let impacted = workspace::move_folder(&root, &from_relative_path, &to_relative_path)?;
    let snapshot = workspace::open_workspace(&root)?;
    Ok((snapshot, impacted))
}

#[tauri::command]
fn delete_workspace_folder(
    root_path: String,
    folder_relative_path: String,
    soft_delete: bool,
) -> Result<(WorkspaceSnapshot, Vec<String>), String> {
    let root = PathBuf::from(root_path);
    let impacted = workspace::delete_folder(&root, &folder_relative_path, soft_delete)?;
    let snapshot = workspace::open_workspace(&root)?;
    Ok((snapshot, impacted))
}

#[tauri::command]
fn list_folder_contents_cmd(
    root_path: String,
    folder_relative_path: String,
) -> Result<FolderContentsSummary, String> {
    workspace::list_folder_contents(&PathBuf::from(root_path), &folder_relative_path)
}

// ── Trash metadata commands ──

#[tauri::command]
fn load_trash_metadata_cmd(root_path: String) -> Result<TrashMetadata, String> {
    workspace::load_trash_metadata(&PathBuf::from(root_path))
}

#[tauri::command]
fn save_trash_metadata_cmd(root_path: String, metadata: TrashMetadata) -> Result<(), String> {
    workspace::save_trash_metadata(&PathBuf::from(root_path), &metadata)
}

// ── Vault settings types ──

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct VaultSettings {
    cloud_sync_enabled: bool,
    sync_prompt_dismissed_at: Option<String>,
    sync_disabled_permanently: bool,
}

// ── Vault lifecycle commands ──

#[tauri::command]
fn unbind_cloud_workspace(
    app: AppHandle,
    workspace_id: String,
    vault_path: String,
) -> Result<(), String> {
    // 1. Remove binding from vault-bindings.json
    let mut store = read_binding_store(&app)?;
    store
        .bindings
        .retain(|b| !(b.workspace_id == workspace_id && b.local_vault_path == vault_path));
    write_json(&vault_bindings_file(&app)?, &store)?;

    // 2. Delete .jtype/sync-base/ directory
    let sync_base_dir = PathBuf::from(&vault_path).join(".jtype").join("sync-base");
    if sync_base_dir.exists() {
        fs::remove_dir_all(&sync_base_dir).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn clear_sync_bases(vault_path: String) -> Result<(), String> {
    let sync_base_dir = PathBuf::from(&vault_path).join(".jtype").join("sync-base");
    if sync_base_dir.exists() {
        fs::remove_dir_all(&sync_base_dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn save_vault_settings(
    app: AppHandle,
    vault_path: String,
    settings: VaultSettings,
) -> Result<(), String> {
    let file = vault_settings_file(&app)?;
    let mut entries: std::collections::HashMap<String, VaultSettings> = if file.exists() {
        let content = fs::read_to_string(&file).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        std::collections::HashMap::new()
    };
    entries.insert(vault_path, settings);
    write_json(&file, &entries)?;
    Ok(())
}

#[tauri::command]
fn load_vault_settings(
    app: AppHandle,
    vault_path: String,
) -> Result<Option<VaultSettings>, String> {
    let file = vault_settings_file(&app)?;
    if !file.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&file).map_err(|e| e.to_string())?;
    let entries: std::collections::HashMap<String, VaultSettings> =
        serde_json::from_str(&content).unwrap_or_default();
    Ok(entries.get(&vault_path).cloned())
}

fn vault_settings_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("vault-settings.json"))
}

#[tauri::command]
async fn cloud_ws_send(state: tauri::State<'_, WsOutbox>, message: String) -> Result<(), String> {
    // Ignore send errors — WS may be temporarily disconnected.
    let _ = state.0.send(message);
    Ok(())
}

#[tauri::command]
async fn start_cloud_listener(
    app: AppHandle,
    listener_state: tauri::State<'_, WsListenerHandle>,
    outbox_state: tauri::State<'_, WsOutbox>,
    server_url: String,
    token: String,
    workspace_id: String,
    device_id: String,
    client_type: String,
) -> Result<(), String> {
    if let Some(handle) = listener_state.0.lock().unwrap().take() {
        handle.abort();
    }
    let outbox_tx = outbox_state.0.clone();
    let handle = tauri::async_runtime::spawn(ws_client::start_ws_listener(
        app,
        server_url,
        token,
        workspace_id,
        device_id,
        client_type,
        outbox_tx,
    ));
    *listener_state.0.lock().unwrap() = Some(handle);
    Ok(())
}

#[tauri::command]
async fn stop_cloud_listener(state: tauri::State<'_, WsListenerHandle>) -> Result<(), String> {
    if let Some(handle) = state.0.lock().unwrap().take() {
        handle.abort();
    }
    Ok(())
}

#[tauri::command]
fn app_ready(app: AppHandle) -> Result<(), String> {
    show_main_window(&app)
}

fn show_main_window(app: &AppHandle) -> Result<(), String> {
    if let Some(splash_window) = app.get_webview_window("splashscreen") {
        let _ = splash_window.close();
    }
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.show().map_err(|error| error.to_string())?;
        let _ = main_window.set_focus();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init());

    // Process restart and the updater are desktop-only. Keeping both plugins
    // out of mobile builds prevents accidental calls from becoming a second
    // update path outside the app stores.
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .setup(|app| {
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(3));
                let _ = show_main_window(&app_handle);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            runtime_capabilities,
            initial_open_paths,
            default_vault_path,
            open_default_vault,
            read_markdown_file,
            write_markdown_file,
            write_binary_file,
            read_binary_file,
            open_workspace,
            detect_vault_root,
            create_workspace_entry,
            import_external_paths,
            collect_asset_paths,
            load_asset_sync_state,
            save_asset_sync_state,
            read_board_file,
            write_board_file,
            read_text_file,
            write_text_file,
            create_board,
            scan_board_cards,
            scan_card_templates,
            rename_workspace_entry,
            delete_workspace_entry,
            export_static_site,
            validate_workspace,
            build_ai_index,
            collect_sync_documents,
            collect_sync_folders,
            save_sync_bases,
            delete_sync_bases,
            load_sync_bases,
            save_sync_folder_bases,
            delete_sync_folder_bases,
            load_sync_folder_bases,
            load_cloud_profile,
            save_cloud_profile,
            list_vault_bindings,
            bind_cloud_workspace,
            apply_cloud_documents,
            apply_deleted_cloud_folders,
            trash_workspace_entry,
            list_workspace_trash,
            restore_workspace_trash,
            permanent_delete_trash,
            empty_workspace_trash,
            start_file_watcher,
            stop_file_watcher,
            create_workspace_folder,
            rename_workspace_folder,
            move_workspace_folder,
            delete_workspace_folder,
            list_folder_contents_cmd,
            load_trash_metadata_cmd,
            save_trash_metadata_cmd,
            start_cloud_listener,
            stop_cloud_listener,
            cloud_ws_send,
            unbind_cloud_workspace,
            clear_sync_bases,
            save_vault_settings,
            load_vault_settings,
            cli_install::cli_status,
            cli_install::install_cli,
            cli_install::uninstall_cli,
            app_ready
        ])
        .manage(AppState {
            watcher_state: Mutex::new(WatcherState { watcher: None }),
            pending_open_paths: Mutex::new(Vec::new()),
        })
        .manage(WsListenerHandle(Mutex::new(None)))
        .manage(WsOutbox(tokio::sync::broadcast::channel::<String>(64).0))
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {
            #[cfg(mobile)]
            if matches!(&_event, tauri::RunEvent::Resumed) {
                let _ = _app.emit("app:lifecycle", "active");
            }

            #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
            if let tauri::RunEvent::Opened { urls } = _event {
                let mut paths = Vec::new();
                let mut external_uris = Vec::new();
                for url in urls {
                    match url.to_file_path() {
                        Ok(path) if workspace::is_markdown_path(&path) => {
                            paths.push(path_to_string(&path));
                        }
                        Ok(_) => {}
                        Err(_) => external_uris.push(url.to_string()),
                    }
                }

                if !paths.is_empty() {
                    let state = _app.state::<AppState>();
                    state
                        .pending_open_paths
                        .lock()
                        .unwrap()
                        .extend(paths.clone());
                    let _ = _app.emit("open-markdown-files", paths);
                }
                if !external_uris.is_empty() {
                    // Mobile content:// and security-scoped URLs must go
                    // through the import adapter. Never pass them to std::fs.
                    let _ = _app.emit("open-external-file-uris", external_uris);
                }
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn doc(path: &str, content: &str) -> CloudSyncDocument {
        CloudSyncDocument {
            relative_path: path.to_string(),
            content: content.to_string(),
        }
    }

    #[test]
    fn apply_cloud_documents_writes_board_files() {
        // Regression: a `.board` document pulled from the cloud must be written
        // to disk. Before the gate used the shared is_syncable_document_path
        // predicate, `.board` was silently `continue`d (neither markdown nor
        // diagram), so a web-created kanban never appeared on desktop.
        let dir = tempdir().unwrap();
        let root = dir.path().to_string_lossy().to_string();

        let result = apply_cloud_documents(
            root,
            vec![
                doc("note.md", "# Note"),
                doc("23232.board", "{\"id\":\"b\",\"columns\":[]}"),
                doc("flow.mmd", "graph TD; A-->B"),
            ],
            vec![],
        )
        .unwrap();

        assert_eq!(
            fs::read_to_string(dir.path().join("23232.board")).unwrap(),
            "{\"id\":\"b\",\"columns\":[]}"
        );
        assert!(dir.path().join("note.md").exists());
        assert!(dir.path().join("flow.mmd").exists());
        // written_paths must report the board so the caller records its sync-base.
        assert!(result.written_paths.contains(&"23232.board".to_string()));
        assert_eq!(result.written_paths.len(), 3);
    }

    #[test]
    fn apply_cloud_documents_skips_non_syncable_and_reports_it() {
        // A type outside the synced document set must NOT be written, and must NOT
        // be reported in written_paths — otherwise the caller poisons its
        // sync-base with a file that was never created.
        let dir = tempdir().unwrap();
        let root = dir.path().to_string_lossy().to_string();

        let result = apply_cloud_documents(
            root,
            vec![doc("note.md", "# Note"), doc("photo.png", "binary")],
            vec![],
        )
        .unwrap();

        assert!(dir.path().join("note.md").exists());
        assert!(!dir.path().join("photo.png").exists());
        assert_eq!(result.written_paths, vec!["note.md".to_string()]);
    }
}
