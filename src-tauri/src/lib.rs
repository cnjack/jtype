mod workspace;

use notify::Watcher;
use serde::{Deserialize, Serialize};
use std::{
    collections::hash_map::DefaultHasher,
    env, fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::Emitter;

use workspace::{
    AiIndexResult, EntryKind, FolderContentsSummary, PublishResult, SyncBaseEntry, SyncDocument,
    TrashItemInfo, TrashMetadata, ValidationResult, WorkspaceSnapshot,
};

struct WatcherState {
    watcher: Option<notify::RecommendedWatcher>,
}

struct AppState {
    watcher_state: Mutex<WatcherState>,
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
    local_vault_path: String,
    last_pulled_clock: i64,
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

#[tauri::command]
fn initial_open_paths() -> Vec<String> {
    env::args()
        .skip(1)
        .filter(|arg| workspace::is_markdown_path(&PathBuf::from(arg)))
        .collect()
}

#[tauri::command]
fn default_vault_path() -> Result<String, String> {
    Ok(path_to_string(&default_vault_dir()?))
}

#[tauri::command]
fn open_default_vault() -> Result<WorkspaceSnapshot, String> {
    let path = default_vault_dir()?;
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
fn load_cloud_profile() -> Result<CloudProfile, String> {
    let file = cloud_profile_file()?;
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
fn save_cloud_profile(profile: CloudProfile) -> Result<CloudProfile, String> {
    let mut next = profile;
    if next.server_url.trim().is_empty() {
        next.server_url = "http://localhost:13345".to_string();
    }
    if next.device_id.trim().is_empty() {
        next.device_id = device_id();
    }
    write_json(&cloud_profile_file()?, &next)?;
    Ok(next)
}

#[tauri::command]
fn list_vault_bindings() -> Result<Vec<VaultBinding>, String> {
    Ok(read_binding_store()?.bindings)
}

#[tauri::command]
fn bind_cloud_workspace(binding: VaultBinding) -> Result<Vec<VaultBinding>, String> {
    if binding.workspace_id.trim().is_empty() {
        return Err("Cloud workspace id is required.".to_string());
    }
    if binding.local_vault_path.trim().is_empty() {
        return Err("Local vault path is required.".to_string());
    }
    let mut store = read_binding_store()?;
    store
        .bindings
        .retain(|item| item.workspace_id != binding.workspace_id);
    store.bindings.push(binding);
    store
        .bindings
        .sort_by(|left, right| left.workspace_name.cmp(&right.workspace_name));
    write_json(&vault_bindings_file()?, &store)?;
    Ok(store.bindings)
}

#[tauri::command]
fn apply_cloud_documents(
    root_path: String,
    documents: Vec<CloudSyncDocument>,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    for document in documents {
        if !workspace::is_markdown_path(&PathBuf::from(&document.relative_path)) {
            continue;
        }
        let target = safe_join(&root, &document.relative_path)?;
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::write(target, document.content).map_err(|error| error.to_string())?;
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

fn default_vault_dir() -> Result<PathBuf, String> {
    let home = env::var_os("USERPROFILE")
        .or_else(|| env::var_os("HOME"))
        .map(PathBuf::from)
        .ok_or_else(|| "Could not find the user home directory.".to_string())?;
    Ok(home.join("Documents").join(".jtype"))
}

fn config_dir() -> Result<PathBuf, String> {
    let base = env::var_os("APPDATA")
        .or_else(|| env::var_os("XDG_CONFIG_HOME"))
        .map(PathBuf::from)
        .or_else(|| env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")))
        .ok_or_else(|| "Could not find the app config directory.".to_string())?;
    let dir = base.join("JType");
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn cloud_profile_file() -> Result<PathBuf, String> {
    Ok(config_dir()?.join("cloud-profile.json"))
}

fn vault_bindings_file() -> Result<PathBuf, String> {
    Ok(config_dir()?.join("vault-bindings.json"))
}

fn read_binding_store() -> Result<VaultBindingStore, String> {
    let file = vault_bindings_file()?;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            initial_open_paths,
            default_vault_path,
            open_default_vault,
            read_markdown_file,
            write_markdown_file,
            open_workspace,
            detect_vault_root,
            create_workspace_entry,
            rename_workspace_entry,
            delete_workspace_entry,
            export_static_site,
            validate_workspace,
            build_ai_index,
            collect_sync_documents,
            save_sync_bases,
            delete_sync_bases,
            load_sync_bases,
            load_cloud_profile,
            save_cloud_profile,
            list_vault_bindings,
            bind_cloud_workspace,
            apply_cloud_documents,
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
            save_trash_metadata_cmd
        ])
        .manage(AppState {
            watcher_state: Mutex::new(WatcherState { watcher: None }),
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
