mod cli_install;
pub mod vault_provider;
#[cfg_attr(not(target_os = "android"), allow(dead_code))]
mod vault_reconcile;
mod ws_client;

// `workspace` now lives in the shared `jtype-core` crate (extracted so the `jtype`
// CLI can reuse the exact vault logic). Aliased so the existing `workspace::…`
// call-sites and command wrappers below compile unchanged.
use jtype_core as workspace;

use notify::Watcher;
use serde::{Deserialize, Serialize};
#[cfg(mobile)]
use std::time::{SystemTime, UNIX_EPOCH};
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

#[cfg(mobile)]
use tauri_plugin_mobile_import::MobileImportExt;
#[cfg(mobile)]
use tauri_plugin_mobile_share::MobileShareExt;
#[cfg(mobile)]
use tauri_plugin_secure_storage::SecureStorageExt;

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
    pending_external_file_sources: Mutex<Vec<String>>,
    #[cfg(target_os = "android")]
    external_vault_reconcile: Mutex<()>,
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

#[cfg(mobile)]
const MOBILE_CLOUD_TOKEN_KEY: &str = "cloud-profile-token";

fn normalize_cloud_profile(mut profile: CloudProfile) -> CloudProfile {
    if profile.server_url.trim().is_empty() {
        profile.server_url = "http://localhost:13345".to_string();
    }
    if profile.device_id.trim().is_empty() {
        profile.device_id = device_id();
    }
    profile
}

#[cfg(any(mobile, test))]
fn cloud_profile_without_token(profile: &CloudProfile) -> CloudProfile {
    let mut redacted = profile.clone();
    redacted.token.clear();
    redacted
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

#[tauri::command]
fn initial_external_file_sources(state: tauri::State<'_, AppState>) -> Vec<String> {
    state
        .pending_external_file_sources
        .lock()
        .unwrap()
        .drain(..)
        .collect()
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

fn resolve_local_vault_provider(
    app: &AppHandle,
    root: PathBuf,
) -> Result<vault_provider::LocalVaultProvider, String> {
    let default_root = default_vault_dir(app)?;
    Ok(vault_provider::LocalVaultProvider::resolve(
        root,
        &default_root,
        cfg!(mobile),
    ))
}

fn vault_provider_store_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("vault-providers.json"))
}

fn read_vault_provider_store(
    app: &AppHandle,
) -> Result<vault_provider::VaultProviderStore, String> {
    let file = vault_provider_store_file(app)?;
    if !file.exists() {
        return Ok(vault_provider::VaultProviderStore::default());
    }
    let content = fs::read_to_string(file).map_err(|error| error.to_string())?;
    serde_json::from_str(&content).map_err(|error| error.to_string())
}

#[cfg(target_os = "android")]
fn write_vault_provider_store(
    app: &AppHandle,
    store: &vault_provider::VaultProviderStore,
) -> Result<(), String> {
    let path = vault_provider_store_file(app)?;
    let parent = path
        .parent()
        .ok_or_else(|| "Vault provider store has no parent directory".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let temporary = parent.join(format!(".vault-providers.json.tmp-{nonce}"));
    let json = serde_json::to_string_pretty(store).map_err(|error| error.to_string())?;
    fs::write(&temporary, json).map_err(|error| error.to_string())?;
    if let Err(error) = fs::rename(&temporary, &path) {
        let _ = fs::remove_file(&temporary);
        return Err(error.to_string());
    }
    Ok(())
}

#[cfg(target_os = "android")]
fn external_vault_mirror_root(app: &AppHandle, provider_id: &str) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|base| {
            base.join("vaults")
                .join("external")
                .join(vault_provider::mirror_directory_name(provider_id))
        })
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "android")]
fn refresh_android_provider_access(
    app: &AppHandle,
    mut store: vault_provider::VaultProviderStore,
    provider_id: &str,
) -> Result<vault_provider::VaultProviderDescriptor, String> {
    let mut provider = store
        .provider(provider_id)
        .cloned()
        .ok_or_else(|| format!("Unknown vault provider: {provider_id}"))?;
    let (next_access_state, next_source_read_only) = match app
        .mobile_import()
        .directory_access(provider.opaque_source_reference.clone())
    {
        Ok(access) => (
            match access.state {
                tauri_plugin_mobile_import::DirectoryAccessState::Ready => {
                    vault_provider::VaultProviderAccessState::Ready
                }
                tauri_plugin_mobile_import::DirectoryAccessState::AuthorizationRequired => {
                    vault_provider::VaultProviderAccessState::AuthorizationRequired
                }
                tauri_plugin_mobile_import::DirectoryAccessState::SourceUnavailable => {
                    vault_provider::VaultProviderAccessState::SourceUnavailable
                }
                tauri_plugin_mobile_import::DirectoryAccessState::Error => {
                    vault_provider::VaultProviderAccessState::Error
                }
            },
            access.read_only,
        ),
        Err(_) => (vault_provider::VaultProviderAccessState::Error, true),
    };
    if provider.access_state != next_access_state
        || provider.source_read_only != next_source_read_only
    {
        provider.access_state = next_access_state;
        provider.source_read_only = next_source_read_only;
        store.upsert(provider.clone());
        write_vault_provider_store(app, &store)?;
    }
    Ok(provider.descriptor())
}

fn describe_provider_for_root(
    app: &AppHandle,
    root: &Path,
) -> Result<vault_provider::VaultProviderDescriptor, String> {
    let store = read_vault_provider_store(app)?;
    if let Some(provider) = store.provider_for_mirror_root(root) {
        #[cfg(target_os = "android")]
        {
            let state = app.state::<AppState>();
            let _reconcile_guard = state
                .external_vault_reconcile
                .lock()
                .map_err(|_| "External vault operation lock is unavailable".to_string())?;
            vault_reconcile::recover_interrupted_reconcile(root)?;
            let provider_id = provider.provider_id.clone();
            return refresh_android_provider_access(app, store, &provider_id);
        }
        #[cfg(not(target_os = "android"))]
        return Ok(provider.descriptor());
    }
    Ok(resolve_local_vault_provider(app, root.to_path_buf())?
        .descriptor()
        .clone())
}

#[tauri::command]
fn describe_vault_provider(
    app: AppHandle,
    root_path: String,
) -> Result<vault_provider::VaultProviderDescriptor, String> {
    describe_provider_for_root(&app, &PathBuf::from(root_path))
}

#[tauri::command]
fn open_default_vault(app: AppHandle) -> Result<WorkspaceSnapshot, String> {
    let path = default_vault_dir(&app)?;
    let provider = resolve_local_vault_provider(&app, path)?;
    workspace::open_workspace(provider.prepare_root(true)?)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExternalVaultInitializationResult {
    provider: vault_provider::VaultProviderDescriptor,
    workspace: WorkspaceSnapshot,
    imported_files: u64,
    imported_directories: u64,
    imported_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExternalVaultReconcileResult {
    provider: vault_provider::VaultProviderDescriptor,
    workspace: WorkspaceSnapshot,
    status: vault_reconcile::ReconcileStatus,
    pulled_files: u64,
    pulled_directories: u64,
    deleted_entries: u64,
    pending_local_changes: u64,
    conflicts: Vec<vault_reconcile::ReconcileConflict>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExternalVaultWriteBackResult {
    provider: vault_provider::VaultProviderDescriptor,
    workspace: WorkspaceSnapshot,
    status: vault_reconcile::WriteBackStatus,
    written_files: u64,
    created_directories: u64,
    deleted_entries: u64,
    pulled_before_write: u64,
    pending_journal: bool,
    conflicts: Vec<vault_reconcile::ReconcileConflict>,
}

#[cfg(target_os = "android")]
struct RemoveDirectoryOnDrop(PathBuf);

#[cfg(target_os = "android")]
impl Drop for RemoveDirectoryOnDrop {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[cfg(target_os = "android")]
fn current_unix_timestamp() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "android")]
fn validated_android_mirror_root(
    app: &AppHandle,
    provider: &vault_provider::ExternalVaultProviderRecord,
) -> Result<PathBuf, String> {
    let expected = external_vault_mirror_root(app, &provider.provider_id)?;
    let recorded = PathBuf::from(&provider.mirror_root_path);
    if recorded != expected {
        return Err("External vault provider mirror path failed validation".to_string());
    }
    Ok(recorded)
}

#[cfg(target_os = "android")]
fn android_source_snapshot_path(mirror_root: &Path) -> Result<PathBuf, String> {
    let parent = mirror_root
        .parent()
        .ok_or_else(|| "External vault mirror has no parent directory".to_string())?;
    let name = mirror_root
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "External vault mirror has an invalid name".to_string())?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    Ok(parent.join(format!(".{name}.source-snapshot-{nonce}")))
}

#[cfg(target_os = "android")]
fn materialize_android_source_snapshot(
    app: &AppHandle,
    provider: &vault_provider::ExternalVaultProviderRecord,
    mirror_root: &Path,
) -> Result<(PathBuf, RemoveDirectoryOnDrop), String> {
    let source_snapshot = android_source_snapshot_path(mirror_root)?;
    app.mobile_import()
        .mirror_directory(
            provider.opaque_source_reference.clone(),
            path_to_string(&source_snapshot),
        )
        .map_err(|error| error.to_string())?;
    let cleanup = RemoveDirectoryOnDrop(source_snapshot.clone());
    Ok((source_snapshot, cleanup))
}

#[cfg(target_os = "android")]
#[tauri::command]
fn initialize_android_external_vault(
    app: AppHandle,
) -> Result<ExternalVaultInitializationResult, String> {
    let state = app.state::<AppState>();
    let _reconcile_guard = state
        .external_vault_reconcile
        .lock()
        .map_err(|_| "External vault operation lock is unavailable".to_string())?;
    let selected = app
        .mobile_import()
        .select_directory()
        .map_err(|error| error.to_string())?;
    let source_kind = vault_provider::VaultProviderSourceKind::AndroidSafTree;
    let provider_id = vault_provider::external_provider_id(source_kind, &selected.source_reference);
    let mut store = read_vault_provider_store(&app)?;
    let existing = store
        .provider_for_source(source_kind, &selected.source_reference)
        .cloned();
    let mirror_root = existing
        .as_ref()
        .map(|provider| PathBuf::from(&provider.mirror_root_path))
        .unwrap_or(external_vault_mirror_root(&app, &provider_id)?);

    let mirrored = if mirror_root.is_dir() {
        None
    } else {
        Some(
            app.mobile_import()
                .mirror_directory(
                    selected.source_reference.clone(),
                    path_to_string(&mirror_root),
                )
                .map_err(|error| error.to_string())?,
        )
    };
    let workspace = workspace::open_workspace(&mirror_root)?;
    let (last_reconciled_at, source_revision) = if mirrored.is_some() {
        let manifest = vault_reconcile::build_manifest(&mirror_root)?;
        vault_reconcile::save_baseline(&mirror_root, &manifest)?;
        (Some(current_unix_timestamp()?), Some(manifest.revision))
    } else {
        (
            existing
                .as_ref()
                .and_then(|provider| provider.last_reconciled_at),
            existing
                .as_ref()
                .and_then(|provider| provider.source_revision.clone()),
        )
    };

    // The selected source may be writable, but the initial-import increment is
    // deliberately exposed as read-only until write-back/reconcile is complete.
    // This prevents edits in the mirror from being mistaken for source writes.
    let record = vault_provider::ExternalVaultProviderRecord {
        provider_id,
        display_name: selected.display_name,
        source_kind,
        opaque_source_reference: selected.source_reference,
        mirror_root_path: path_to_string(&mirror_root),
        access_state: vault_provider::VaultProviderAccessState::Ready,
        read_only: true,
        source_read_only: selected.read_only,
        last_reconciled_at,
        source_revision,
    };
    let descriptor = record.descriptor();
    store.upsert(record);
    write_vault_provider_store(&app, &store)?;

    Ok(ExternalVaultInitializationResult {
        provider: descriptor,
        workspace,
        imported_files: mirrored.as_ref().map_or(0, |result| result.files),
        imported_directories: mirrored.as_ref().map_or(0, |result| result.directories),
        imported_bytes: mirrored.as_ref().map_or(0, |result| result.bytes),
    })
}

#[cfg(target_os = "android")]
#[tauri::command]
fn reauthorize_android_external_vault(
    app: AppHandle,
    provider_id: String,
) -> Result<vault_provider::VaultProviderDescriptor, String> {
    let state = app.state::<AppState>();
    let _reconcile_guard = state
        .external_vault_reconcile
        .lock()
        .map_err(|_| "External vault operation lock is unavailable".to_string())?;
    let mut store = read_vault_provider_store(&app)?;
    let mut provider = store
        .provider(&provider_id)
        .cloned()
        .ok_or_else(|| format!("Unknown vault provider: {provider_id}"))?;
    if provider.source_kind != vault_provider::VaultProviderSourceKind::AndroidSafTree {
        return Err("The vault provider can not be reauthorized on Android".to_string());
    }

    let selected = app
        .mobile_import()
        .select_directory()
        .map_err(|error| error.to_string())?;
    let previous_source_reference = provider.opaque_source_reference.clone();
    let source_changed = selected.source_reference != previous_source_reference;
    if source_changed {
        app.mobile_import()
            .release_directory_access(previous_source_reference)
            .map_err(|error| error.to_string())?;
        provider.last_reconciled_at = None;
        provider.source_revision = None;
    }
    provider.display_name = selected.display_name;
    provider.opaque_source_reference = selected.source_reference;
    provider.access_state = vault_provider::VaultProviderAccessState::Ready;
    provider.read_only = true;
    provider.source_read_only = selected.read_only;
    let descriptor = provider.descriptor();
    store.upsert(provider);
    write_vault_provider_store(&app, &store)?;
    Ok(descriptor)
}

#[cfg(target_os = "android")]
#[tauri::command]
fn reconcile_android_external_vault(
    app: AppHandle,
    provider_id: String,
) -> Result<ExternalVaultReconcileResult, String> {
    let state = app.state::<AppState>();
    let _reconcile_guard = state
        .external_vault_reconcile
        .lock()
        .map_err(|_| "External vault operation lock is unavailable".to_string())?;

    let descriptor = refresh_android_provider_access(
        &app,
        read_vault_provider_store(&app)?,
        &provider_id,
    )?;
    if descriptor.access_state != vault_provider::VaultProviderAccessState::Ready {
        return Err(match descriptor.access_state {
            vault_provider::VaultProviderAccessState::AuthorizationRequired => {
                "External vault authorization is required before reconcile".to_string()
            }
            vault_provider::VaultProviderAccessState::SourceUnavailable => {
                "External vault source is unavailable".to_string()
            }
            _ => "External vault access could not be verified".to_string(),
        });
    }

    let mut store = read_vault_provider_store(&app)?;
    let mut provider = store
        .provider(&provider_id)
        .cloned()
        .ok_or_else(|| format!("Unknown vault provider: {provider_id}"))?;
    if provider.source_kind != vault_provider::VaultProviderSourceKind::AndroidSafTree {
        return Err("The vault provider can not be reconciled on Android".to_string());
    }
    let mirror_root = validated_android_mirror_root(&app, &provider)?;
    vault_reconcile::recover_interrupted_reconcile(&mirror_root)?;

    let (source_snapshot, _source_snapshot_cleanup) =
        materialize_android_source_snapshot(&app, &provider, &mirror_root)?;

    let source_manifest = vault_reconcile::build_manifest(&source_snapshot)?;
    let mirror_manifest = vault_reconcile::build_manifest(&mirror_root)?;
    let baseline = vault_reconcile::load_baseline(&mirror_root)?;
    let baseline = vault_reconcile::trusted_baseline(
        baseline.as_ref(),
        provider.source_revision.as_deref(),
    );
    let plan = vault_reconcile::plan_reconcile(
        baseline,
        &source_manifest,
        &mirror_manifest,
    );
    let status = plan.status(&source_manifest);
    let pending_local_changes = plan.pending_local_changes(&source_manifest);

    if !plan.conflicts.is_empty() {
        return Ok(ExternalVaultReconcileResult {
            provider: provider.descriptor(),
            workspace: workspace::open_workspace(&mirror_root)?,
            status,
            pulled_files: 0,
            pulled_directories: 0,
            deleted_entries: 0,
            pending_local_changes,
            conflicts: plan.conflicts,
        });
    }

    let pulled_files = plan.pulled_files();
    let pulled_directories = plan.pulled_directories();
    let deleted_entries = plan.deleted_entries();
    if plan.has_operations() {
        vault_reconcile::apply_reconcile_plan(&mirror_root, &source_snapshot, &plan)?;
    }
    vault_reconcile::save_baseline(&mirror_root, &source_manifest)?;

    provider.access_state = vault_provider::VaultProviderAccessState::Ready;
    provider.last_reconciled_at = Some(current_unix_timestamp()?);
    provider.source_revision = Some(source_manifest.revision);
    let descriptor = provider.descriptor();
    store.upsert(provider);
    write_vault_provider_store(&app, &store)?;

    Ok(ExternalVaultReconcileResult {
        provider: descriptor,
        workspace: workspace::open_workspace(&mirror_root)?,
        status,
        pulled_files,
        pulled_directories,
        deleted_entries,
        pending_local_changes,
        conflicts: Vec::new(),
    })
}

#[cfg(target_os = "android")]
#[tauri::command]
fn write_back_android_external_vault(
    app: AppHandle,
    provider_id: String,
) -> Result<ExternalVaultWriteBackResult, String> {
    let state = app.state::<AppState>();
    let _reconcile_guard = state
        .external_vault_reconcile
        .lock()
        .map_err(|_| "External vault operation lock is unavailable".to_string())?;

    write_back_android_external_vault_locked(&app, &provider_id)
}

#[cfg(target_os = "android")]
fn write_back_android_external_vault_locked(
    app: &AppHandle,
    provider_id: &str,
) -> Result<ExternalVaultWriteBackResult, String> {
    let descriptor =
        refresh_android_provider_access(app, read_vault_provider_store(app)?, provider_id)?;
    if descriptor.access_state != vault_provider::VaultProviderAccessState::Ready {
        return Err("External vault access is not ready for write-back".to_string());
    }

    let mut store = read_vault_provider_store(app)?;
    let mut provider = store
        .provider(provider_id)
        .cloned()
        .ok_or_else(|| format!("Unknown vault provider: {provider_id}"))?;
    if provider.source_kind != vault_provider::VaultProviderSourceKind::AndroidSafTree {
        return Err("The vault provider can not write back on Android".to_string());
    }
    if provider.source_read_only {
        return Err("The external vault source is read-only".to_string());
    }

    let mirror_root = validated_android_mirror_root(app, &provider)?;
    vault_reconcile::recover_interrupted_reconcile(&mirror_root)?;
    let previous_journal = vault_reconcile::load_write_back_journal(&mirror_root)?;
    if previous_journal
        .as_ref()
        .is_some_and(|journal| journal.provider_id != provider_id)
    {
        return Err("External vault write-back journal belongs to another provider".to_string());
    }

    let (source_snapshot, source_snapshot_cleanup) =
        materialize_android_source_snapshot(app, &provider, &mirror_root)?;
    let source_manifest = vault_reconcile::build_manifest(&source_snapshot)?;
    let mirror_manifest = vault_reconcile::build_manifest(&mirror_root)?;
    let baseline = vault_reconcile::load_baseline(&mirror_root)?;
    let baseline =
        vault_reconcile::trusted_baseline(baseline.as_ref(), provider.source_revision.as_deref());
    let pull_plan = vault_reconcile::plan_reconcile(baseline, &source_manifest, &mirror_manifest);
    let pulled_before_write =
        pull_plan.pulled_files() + pull_plan.pulled_directories() + pull_plan.deleted_entries();
    if !pull_plan.conflicts.is_empty() {
        return Ok(ExternalVaultWriteBackResult {
            provider: provider.descriptor(),
            workspace: workspace::open_workspace(&mirror_root)?,
            status: vault_reconcile::WriteBackStatus::Conflict,
            written_files: 0,
            created_directories: 0,
            deleted_entries: 0,
            pulled_before_write: 0,
            pending_journal: previous_journal.is_some(),
            conflicts: pull_plan.conflicts,
        });
    }
    if pull_plan.has_operations() {
        vault_reconcile::apply_reconcile_plan(&mirror_root, &source_snapshot, &pull_plan)?;
    }

    let mirror_manifest = vault_reconcile::build_manifest(&mirror_root)?;
    let write_back_plan = vault_reconcile::plan_write_back(&source_manifest, &mirror_manifest);
    if !write_back_plan.conflicts.is_empty() {
        return Ok(ExternalVaultWriteBackResult {
            provider: provider.descriptor(),
            workspace: workspace::open_workspace(&mirror_root)?,
            status: vault_reconcile::WriteBackStatus::Conflict,
            written_files: 0,
            created_directories: 0,
            deleted_entries: 0,
            pulled_before_write,
            pending_journal: previous_journal.is_some(),
            conflicts: write_back_plan.conflicts,
        });
    }

    let written_files = write_back_plan.written_files();
    let created_directories = write_back_plan.created_directories();
    let deleted_entries = write_back_plan.deleted_entries();
    if write_back_plan.operations.is_empty() {
        vault_reconcile::save_baseline(&mirror_root, &mirror_manifest)?;
        provider.last_reconciled_at = Some(current_unix_timestamp()?);
        provider.source_revision = Some(mirror_manifest.revision);
        let descriptor = provider.descriptor();
        store.upsert(provider);
        write_vault_provider_store(app, &store)?;
        vault_reconcile::clear_write_back_journal(&mirror_root)?;
        return Ok(ExternalVaultWriteBackResult {
            provider: descriptor,
            workspace: workspace::open_workspace(&mirror_root)?,
            status: if pulled_before_write > 0 {
                vault_reconcile::WriteBackStatus::Reconciled
            } else {
                vault_reconcile::WriteBackStatus::Unchanged
            },
            written_files: 0,
            created_directories: 0,
            deleted_entries: 0,
            pulled_before_write,
            pending_journal: false,
            conflicts: Vec::new(),
        });
    }

    let now = current_unix_timestamp()?;
    let journal = vault_reconcile::WriteBackJournal {
        version: vault_reconcile::WRITE_BACK_JOURNAL_VERSION,
        provider_id: provider_id.to_string(),
        source_revision_before: source_manifest.revision.clone(),
        target_revision: mirror_manifest.revision.clone(),
        operations: write_back_plan.operations.clone(),
        created_at: previous_journal
            .as_ref()
            .map_or(now, |journal| journal.created_at),
        attempts: previous_journal
            .as_ref()
            .map_or(1, |journal| journal.attempts.saturating_add(1)),
    };
    vault_reconcile::save_write_back_journal(&mirror_root, &journal)?;

    for operation in &write_back_plan.operations {
        let kind = match operation.kind {
            vault_reconcile::WriteBackOperationKind::UpsertDirectory => {
                tauri_plugin_mobile_import::DirectoryChangeKind::UpsertDirectory
            }
            vault_reconcile::WriteBackOperationKind::UpsertFile => {
                tauri_plugin_mobile_import::DirectoryChangeKind::UpsertFile
            }
            vault_reconcile::WriteBackOperationKind::Delete => {
                tauri_plugin_mobile_import::DirectoryChangeKind::Delete
            }
        };
        app.mobile_import()
            .apply_directory_change(
                provider.opaque_source_reference.clone(),
                path_to_string(&mirror_root),
                operation.relative_path.clone(),
                kind,
            )
            .map_err(|error| error.to_string())?;
    }

    drop(source_snapshot_cleanup);
    let (verified_source_snapshot, _verified_source_cleanup) =
        materialize_android_source_snapshot(app, &provider, &mirror_root)?;
    let verified_source_manifest = vault_reconcile::build_manifest(&verified_source_snapshot)?;
    if verified_source_manifest.entries != mirror_manifest.entries {
        return Err("External vault write-back failed its manifest verification".to_string());
    }

    vault_reconcile::save_baseline(&mirror_root, &verified_source_manifest)?;
    provider.last_reconciled_at = Some(current_unix_timestamp()?);
    provider.source_revision = Some(verified_source_manifest.revision);
    let descriptor = provider.descriptor();
    store.upsert(provider);
    write_vault_provider_store(app, &store)?;
    vault_reconcile::clear_write_back_journal(&mirror_root)?;

    Ok(ExternalVaultWriteBackResult {
        provider: descriptor,
        workspace: workspace::open_workspace(&mirror_root)?,
        status: vault_reconcile::WriteBackStatus::Written,
        written_files,
        created_directories,
        deleted_entries,
        pulled_before_write,
        pending_journal: false,
        conflicts: Vec::new(),
    })
}

#[cfg(not(target_os = "android"))]
#[tauri::command]
fn initialize_android_external_vault(
    _app: AppHandle,
) -> Result<ExternalVaultInitializationResult, String> {
    Err("Android external vault selection is only available on Android".to_string())
}

#[cfg(not(target_os = "android"))]
#[tauri::command]
fn reauthorize_android_external_vault(
    _app: AppHandle,
    _provider_id: String,
) -> Result<vault_provider::VaultProviderDescriptor, String> {
    Err("Android external vault reauthorization is only available on Android".to_string())
}

#[cfg(not(target_os = "android"))]
#[tauri::command]
fn reconcile_android_external_vault(
    _app: AppHandle,
    _provider_id: String,
) -> Result<ExternalVaultReconcileResult, String> {
    Err("Android external vault reconcile is only available on Android".to_string())
}

#[cfg(not(target_os = "android"))]
#[tauri::command]
fn write_back_android_external_vault(
    _app: AppHandle,
    _provider_id: String,
) -> Result<ExternalVaultWriteBackResult, String> {
    Err("Android external vault write-back is only available on Android".to_string())
}

#[cfg(target_os = "android")]
/// Runs the existing local filesystem mutation unchanged, but serializes the
/// mirror mutation and its SAF write-back as one JType operation. Source health
/// is checked before local state changes; source content is compared only after
/// the mutation so a stale editor save still produces a three-way conflict.
fn with_external_vault_mutation<T>(
    app: &AppHandle,
    local_path: &Path,
    mutation: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    let store = read_vault_provider_store(app)?;
    let Some((provider_id, mirror_root)) =
        store.provider_for_local_path(local_path).map(|provider| {
            (
                provider.provider_id.clone(),
                PathBuf::from(&provider.mirror_root_path),
            )
        })
    else {
        return mutation();
    };

    let state = app.state::<AppState>();
    let _mutation_guard = state
        .external_vault_reconcile
        .lock()
        .map_err(|_| "External vault operation lock is unavailable".to_string())?;
    vault_reconcile::recover_interrupted_reconcile(&mirror_root)?;
    let descriptor = refresh_android_provider_access(app, store, &provider_id)?;
    if descriptor.access_state != vault_provider::VaultProviderAccessState::Ready {
        return Err("External vault access is not ready for mutation".to_string());
    }
    let refreshed_store = read_vault_provider_store(app)?;
    if refreshed_store
        .provider(&provider_id)
        .is_some_and(|provider| provider.source_read_only)
    {
        return Err("The external vault source is read-only".to_string());
    }

    let value = mutation()?;
    let result = write_back_android_external_vault_locked(app, &provider_id)?;
    if result.status == vault_reconcile::WriteBackStatus::Conflict {
        let conflicts =
            serde_json::to_string(&result.conflicts).map_err(|error| error.to_string())?;
        return Err(format!(
            "External vault mutation is pending conflict resolution: {conflicts}"
        ));
    }
    Ok(value)
}

#[cfg(not(target_os = "android"))]
fn with_external_vault_mutation<T>(
    _app: &AppHandle,
    _local_path: &Path,
    mutation: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    mutation()
}

#[tauri::command]
fn read_markdown_file(path: String) -> Result<String, String> {
    workspace::read_markdown(&PathBuf::from(path))
}

#[tauri::command]
fn write_markdown_file(app: AppHandle, path: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(path);
    with_external_vault_mutation(&app, &path, || workspace::write_markdown(&path, &content))
}

#[tauri::command]
fn share_markdown(app: AppHandle, file_name: String, content: String) -> Result<(), String> {
    #[cfg(mobile)]
    {
        share_mobile_file(&app, &file_name, "text/markdown", content.as_bytes())
    }

    #[cfg(desktop)]
    {
        let _ = (app, file_name, content);
        Err("System sharing is only available on mobile".to_string())
    }
}

#[tauri::command]
fn share_pdf(app: AppHandle, file_name: String, content: Vec<u8>) -> Result<(), String> {
    #[cfg(mobile)]
    {
        share_mobile_file(&app, &file_name, "application/pdf", &content)
    }

    #[cfg(desktop)]
    {
        let _ = (app, file_name, content);
        Err("System sharing is only available on mobile".to_string())
    }
}

#[cfg(mobile)]
fn share_mobile_file(
    app: &AppHandle,
    file_name: &str,
    mime_type: &str,
    content: &[u8],
) -> Result<(), String> {
    let safe_name = safe_mobile_share_name(file_name, mime_type);
    let created_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let share_directory = app
        .path()
        .app_cache_dir()
        .map_err(|error| error.to_string())?
        .join("jtype-shares")
        .join(format!("{}-{created_at}", std::process::id()));
    fs::create_dir_all(&share_directory).map_err(|error| error.to_string())?;
    let shared_file = share_directory.join(safe_name);
    if let Err(error) = fs::write(&shared_file, content) {
        let _ = fs::remove_dir_all(&share_directory);
        return Err(error.to_string());
    }

    let launch = app
        .mobile_share()
        .share_file(path_to_string(&shared_file), mime_type)
        .map_err(|error| {
            let _ = fs::remove_dir_all(&share_directory);
            error.to_string()
        })?;
    if launch.launched {
        Ok(())
    } else {
        let _ = fs::remove_dir_all(&share_directory);
        Err("The system share sheet did not open".to_string())
    }
}

#[cfg(mobile)]
fn safe_mobile_share_name(candidate: &str, mime_type: &str) -> String {
    let is_pdf = mime_type == "application/pdf";
    let default_name = if is_pdf {
        "JType Export.pdf"
    } else {
        "JType Note.md"
    };
    let leaf = candidate.rsplit(['/', '\\']).next().unwrap_or_default();
    let cleaned = leaf
        .chars()
        .map(|character| {
            if character.is_control() {
                '_'
            } else {
                character
            }
        })
        .collect::<String>();
    let cleaned = cleaned.trim();
    let base = if cleaned.is_empty() || cleaned == "." || cleaned == ".." {
        default_name
    } else {
        cleaned
    };
    let has_expected_extension = if is_pdf {
        base.to_ascii_lowercase().ends_with(".pdf")
    } else {
        [".md", ".markdown", ".mdown", ".mkd"]
            .iter()
            .any(|extension| base.to_ascii_lowercase().ends_with(extension))
    };
    if has_expected_extension {
        base.to_string()
    } else {
        format!("{base}.{}", if is_pdf { "pdf" } else { "md" })
    }
}

#[tauri::command]
fn write_binary_file(app: AppHandle, path: String, content: Vec<u8>) -> Result<(), String> {
    let path = PathBuf::from(path);
    with_external_vault_mutation(&app, &path, || {
        // Pasted images land in an `assets/` dir that may not exist yet.
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::write(&path, content).map_err(|error| error.to_string())
    })
}

#[tauri::command]
fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(PathBuf::from(path)).map_err(|error| error.to_string())
}

#[tauri::command]
fn open_workspace(app: AppHandle, path: String) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(path);
    let _provider = describe_provider_for_root(&app, &root)?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn detect_vault_root(path: String) -> Option<String> {
    workspace::detect_vault_root(&PathBuf::from(path)).map(|p| path_to_string(&p))
}

#[tauri::command]
fn create_workspace_entry(
    app: AppHandle,
    root_path: String,
    relative_path: String,
    kind: EntryKind,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    with_external_vault_mutation(&app, &root, || {
        workspace::create_entry(&root, &relative_path, kind)
    })?;
    workspace::open_workspace(&root)
}

/// Copy externally-dropped files/folders into the vault under `target_folder`
/// (collision-safe), then return the refreshed workspace plus the imported
/// vault-relative paths so the UI can reveal/open them.
struct PreparedExternalSource {
    path: PathBuf,
    cleanup_dir: Option<PathBuf>,
}

#[cfg(desktop)]
fn prepare_external_source(
    _app: &AppHandle,
    source: &str,
) -> Result<PreparedExternalSource, String> {
    Ok(PreparedExternalSource {
        path: PathBuf::from(source),
        cleanup_dir: None,
    })
}

#[cfg(mobile)]
fn prepare_external_source(
    app: &AppHandle,
    source: &str,
) -> Result<PreparedExternalSource, String> {
    let materialized = app
        .mobile_import()
        .materialize(source)
        .map_err(|error| error.to_string())?;
    let path = PathBuf::from(materialized.path);
    let cleanup_dir = path.parent().and_then(|parent| {
        let import_root = parent.parent()?;
        (import_root.file_name()?.to_str()? == "jtype-imports").then(|| parent.to_path_buf())
    });
    Ok(PreparedExternalSource { path, cleanup_dir })
}

#[tauri::command]
fn import_external_paths(
    app: AppHandle,
    root_path: String,
    source_paths: Vec<String>,
    target_folder: String,
) -> Result<(WorkspaceSnapshot, Vec<String>), String> {
    let root = PathBuf::from(root_path);
    let imported = with_external_vault_mutation(&app, &root, || {
        let mut imported = Vec::new();
        for source in &source_paths {
            let prepared = prepare_external_source(&app, source)?;
            let result = workspace::import_external_path(&root, &prepared.path, &target_folder);
            if let Some(cleanup_dir) = prepared.cleanup_dir {
                let _ = fs::remove_dir_all(cleanup_dir);
            }
            let relative = result?;
            imported.push(relative);
        }
        Ok(imported)
    })?;
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
fn write_text_file(app: AppHandle, path: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(path);
    with_external_vault_mutation(&app, &path, || workspace::write_text(&path, &content))
}

/// Write a `.board` view file (plain text/JSON), creating parent dirs as needed.
#[tauri::command]
fn write_board_file(app: AppHandle, path: String, content: String) -> Result<(), String> {
    let target = PathBuf::from(path);
    with_external_vault_mutation(&app, &target, || {
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::write(&target, content).map_err(|error| error.to_string())
    })
}

/// Create a new `.board` file with the given JSON config and return the refreshed workspace.
#[tauri::command]
fn create_board(
    app: AppHandle,
    root_path: String,
    relative_path: String,
    content: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(&root_path);
    with_external_vault_mutation(&app, &root, || {
        workspace::create_entry(&root, &relative_path, EntryKind::Board)?;
        let target = root.join(&relative_path);
        fs::write(&target, content).map_err(|error| error.to_string())
    })?;
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
    app: AppHandle,
    root_path: String,
    from_relative_path: String,
    to_relative_path: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    with_external_vault_mutation(&app, &root, || {
        workspace::rename_entry(&root, &from_relative_path, &to_relative_path)
    })?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn delete_workspace_entry(
    app: AppHandle,
    root_path: String,
    relative_path: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    with_external_vault_mutation(&app, &root, || {
        workspace::delete_entry(&root, &relative_path)
    })?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn export_static_site(
    app: AppHandle,
    root_path: String,
    output_relative_path: String,
) -> Result<PublishResult, String> {
    let root = PathBuf::from(root_path);
    with_external_vault_mutation(&app, &root, || {
        workspace::export_static_site(&root, &output_relative_path)
    })
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
    let file_exists = file.exists();
    let mut profile = if file_exists {
        let content = fs::read_to_string(&file).map_err(|error| error.to_string())?;
        serde_json::from_str(&content).map_err(|error| error.to_string())?
    } else {
        CloudProfile {
            server_url: "http://localhost:13345".to_string(),
            device_id: device_id(),
            ..CloudProfile::default()
        }
    };
    profile = normalize_cloud_profile(profile);

    #[cfg(mobile)]
    {
        let disk_token = std::mem::take(&mut profile.token);
        let has_legacy_disk_token = !disk_token.is_empty();
        let secure_token = app
            .secure_storage()
            .get_secret(MOBILE_CLOUD_TOKEN_KEY)
            .map_err(|error| error.to_string())?
            .value;

        profile.token = if let Some(token) = secure_token {
            token
        } else if !disk_token.is_empty() {
            app.secure_storage()
                .set_secret(MOBILE_CLOUD_TOKEN_KEY, disk_token.clone())
                .map_err(|error| error.to_string())?;
            disk_token
        } else {
            String::new()
        };

        // A pre-secure-storage mobile build may have persisted the token in
        // cloud-profile.json. Only rewrite after the Keychain/Keystore write
        // succeeds so migration cannot discard the sole credential copy.
        if file_exists && has_legacy_disk_token {
            write_json(&file, &cloud_profile_without_token(&profile))?;
        }
    }

    Ok(profile)
}

#[tauri::command]
fn save_cloud_profile(app: AppHandle, profile: CloudProfile) -> Result<CloudProfile, String> {
    let next = normalize_cloud_profile(profile);

    #[cfg(mobile)]
    {
        if next.token.is_empty() {
            app.secure_storage()
                .delete_secret(MOBILE_CLOUD_TOKEN_KEY)
                .map_err(|error| error.to_string())?;
        } else {
            app.secure_storage()
                .set_secret(MOBILE_CLOUD_TOKEN_KEY, next.token.clone())
                .map_err(|error| error.to_string())?;
        }
        write_json(
            &cloud_profile_file(&app)?,
            &cloud_profile_without_token(&next),
        )?;
    }

    #[cfg(desktop)]
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
    app: AppHandle,
    root_path: String,
    documents: Vec<CloudSyncDocument>,
    folders: Vec<CloudSyncFolder>,
) -> Result<ApplyCloudResult, String> {
    let root = PathBuf::from(root_path);
    let mut result = with_external_vault_mutation(&app, &root, || {
        apply_cloud_documents_core(&root, documents, folders)
    })?;
    result.workspace = workspace::open_workspace(&root)?;
    Ok(result)
}

fn apply_cloud_documents_core(
    root: &Path,
    documents: Vec<CloudSyncDocument>,
    folders: Vec<CloudSyncFolder>,
) -> Result<ApplyCloudResult, String> {
    for folder in folders {
        let target = safe_join(root, &folder.relative_path)?;
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
        let target = safe_join(root, &document.relative_path)?;
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::write(target, document.content).map_err(|error| error.to_string())?;
        written_paths.push(document.relative_path);
    }
    let workspace = workspace::open_workspace(root)?;
    Ok(ApplyCloudResult {
        workspace,
        written_paths,
    })
}

#[tauri::command]
fn apply_deleted_cloud_folders(
    app: AppHandle,
    root_path: String,
    folders: Vec<CloudSyncFolder>,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    with_external_vault_mutation(&app, &root, || {
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
        Ok(())
    })?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn trash_workspace_entry(
    app: AppHandle,
    root_path: String,
    relative_path: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    with_external_vault_mutation(&app, &root, || {
        workspace::trash_entry(&root, &relative_path)
    })?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn list_workspace_trash(root_path: String) -> Result<Vec<TrashItemInfo>, String> {
    workspace::list_trash(&PathBuf::from(root_path))
}

#[tauri::command]
fn restore_workspace_trash(
    app: AppHandle,
    root_path: String,
    trash_id: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    with_external_vault_mutation(&app, &root, || {
        workspace::restore_from_trash(&root, &trash_id).map(|_| ())
    })?;
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
    let content = fs::read_to_string(&file).map_err(|error| error.to_string())?;
    let store: VaultBindingStore =
        serde_json::from_str(&content).map_err(|error| error.to_string())?;

    #[cfg(mobile)]
    let store = {
        let mut store = store;
        let current_default = default_vault_dir(app)?;
        let mut changed = false;
        for binding in &mut store.bindings {
            if let Some(rebased) = rebase_mobile_default_vault_path(
                &binding.local_vault_path,
                &current_default,
            ) {
                binding.local_vault_path = rebased;
                changed = true;
            }
        }
        if changed {
            write_json(&file, &store)?;
        }
        store
    };

    Ok(store)
}

#[cfg(any(mobile, test))]
fn rebase_mobile_default_vault_path(stored: &str, current_default: &Path) -> Option<String> {
    let stored_path = Path::new(stored);
    if stored_path == current_default {
        return None;
    }
    let mut components = stored_path.components().rev();
    let is_private_default = components.next().is_some_and(|part| part.as_os_str() == "default")
        && components.next().is_some_and(|part| part.as_os_str() == "vaults");
    is_private_default.then(|| path_to_string(current_default))
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
    app: AppHandle,
    root_path: String,
    folder_relative_path: String,
) -> Result<WorkspaceSnapshot, String> {
    let root = PathBuf::from(root_path);
    with_external_vault_mutation(&app, &root, || {
        workspace::create_folder(&root, &folder_relative_path)
    })?;
    workspace::open_workspace(&root)
}

#[tauri::command]
fn rename_workspace_folder(
    app: AppHandle,
    root_path: String,
    from_relative_path: String,
    to_relative_path: String,
) -> Result<(WorkspaceSnapshot, Vec<String>), String> {
    let root = PathBuf::from(root_path);
    let impacted = with_external_vault_mutation(&app, &root, || {
        workspace::rename_folder(&root, &from_relative_path, &to_relative_path)
    })?;
    let snapshot = workspace::open_workspace(&root)?;
    Ok((snapshot, impacted))
}

#[tauri::command]
fn move_workspace_folder(
    app: AppHandle,
    root_path: String,
    from_relative_path: String,
    to_relative_path: String,
) -> Result<(WorkspaceSnapshot, Vec<String>), String> {
    let root = PathBuf::from(root_path);
    let impacted = with_external_vault_mutation(&app, &root, || {
        workspace::move_folder(&root, &from_relative_path, &to_relative_path)
    })?;
    let snapshot = workspace::open_workspace(&root)?;
    Ok((snapshot, impacted))
}

#[tauri::command]
fn delete_workspace_folder(
    app: AppHandle,
    root_path: String,
    folder_relative_path: String,
    soft_delete: bool,
) -> Result<(WorkspaceSnapshot, Vec<String>), String> {
    let root = PathBuf::from(root_path);
    let impacted = with_external_vault_mutation(&app, &root, || {
        workspace::delete_folder(&root, &folder_relative_path, soft_delete)
    })?;
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

    #[cfg(mobile)]
    {
        let current_default = default_vault_dir(&app)?;
        if Path::new(&vault_path) == current_default {
            entries.retain(|path, _| {
                path == &vault_path
                    || rebase_mobile_default_vault_path(path, &current_default).is_none()
            });
        }
    }
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

    #[cfg(mobile)]
    let entries = {
        let mut entries = entries;
        let current_default = default_vault_dir(&app)?;
        let current_path = path_to_string(&current_default);
        if !entries.contains_key(&current_path) {
            let stale_path = entries
                .keys()
                .find(|path| {
                    rebase_mobile_default_vault_path(path, &current_default).is_some()
                })
                .cloned();
            if let Some(stale_path) = stale_path {
                if let Some(settings) = entries.remove(&stale_path) {
                    entries.insert(current_path, settings);
                    write_json(&file, &entries)?;
                }
            }
        }
        entries
    };
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

    #[cfg(mobile)]
    {
        builder = builder
            .plugin(tauri_plugin_deep_link::init())
            .plugin(tauri_plugin_mobile_import::init())
            .plugin(tauri_plugin_mobile_share::init())
            .plugin(tauri_plugin_secure_storage::init());
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
            initial_external_file_sources,
            default_vault_path,
            describe_vault_provider,
            initialize_android_external_vault,
            reauthorize_android_external_vault,
            reconcile_android_external_vault,
            write_back_android_external_vault,
            open_default_vault,
            read_markdown_file,
            write_markdown_file,
            share_markdown,
            share_pdf,
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
            pending_external_file_sources: Mutex::new(Vec::new()),
            #[cfg(target_os = "android")]
            external_vault_reconcile: Mutex::new(()),
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
                #[cfg(desktop)]
                let mut paths = Vec::new();
                let mut external_uris = Vec::new();
                for url in urls {
                    #[cfg(mobile)]
                    {
                        if matches!(url.scheme(), "content" | "file") {
                            external_uris.push(url.to_string());
                        }
                        continue;
                    }

                    #[cfg(desktop)]
                    match url.to_file_path() {
                        Ok(path) if workspace::is_markdown_path(&path) => {
                            paths.push(path_to_string(&path));
                        }
                        Ok(_) => {}
                        Err(_) => external_uris.push(url.to_string()),
                    }
                }

                #[cfg(desktop)]
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
                    let state = _app.state::<AppState>();
                    state
                        .pending_external_file_sources
                        .lock()
                        .unwrap()
                        .extend(external_uris.clone());
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
    fn cloud_profile_redaction_preserves_non_secret_fields() {
        let profile = CloudProfile {
            server_url: "https://sync.example.test".to_string(),
            username: "writer".to_string(),
            site_url: "https://site.example.test".to_string(),
            token: "secret-token".to_string(),
            device_id: "device-1".to_string(),
        };

        let redacted = cloud_profile_without_token(&profile);

        assert!(redacted.token.is_empty());
        assert_eq!(redacted.server_url, profile.server_url);
        assert_eq!(redacted.username, profile.username);
        assert_eq!(redacted.site_url, profile.site_url);
        assert_eq!(redacted.device_id, profile.device_id);
        assert_eq!(profile.token, "secret-token");
    }

    #[test]
    fn stale_mobile_default_vault_path_rebases_to_current_container() {
        let stale = "/old/container/Library/Application Support/net.jcode.jtype/vaults/default";
        let current = Path::new(
            "/new/container/Library/Application Support/net.jcode.jtype/vaults/default",
        );

        assert_eq!(
            rebase_mobile_default_vault_path(stale, current),
            Some(path_to_string(current))
        );
        assert_eq!(
            rebase_mobile_default_vault_path(&path_to_string(current), current),
            None
        );
        assert_eq!(
            rebase_mobile_default_vault_path("/external/notes", current),
            None
        );
    }

    #[test]
    fn apply_cloud_documents_writes_board_files() {
        // Regression: a `.board` document pulled from the cloud must be written
        // to disk. Before the gate used the shared is_syncable_document_path
        // predicate, `.board` was silently `continue`d (neither markdown nor
        // diagram), so a web-created kanban never appeared on desktop.
        let dir = tempdir().unwrap();
        let root = dir.path().to_string_lossy().to_string();

        let result = apply_cloud_documents_core(
            Path::new(&root),
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

        let result = apply_cloud_documents_core(
            Path::new(&root),
            vec![doc("note.md", "# Note"), doc("photo.png", "binary")],
            vec![],
        )
        .unwrap();

        assert!(dir.path().join("note.md").exists());
        assert!(!dir.path().join("photo.png").exists());
        assert_eq!(result.written_paths, vec!["note.md".to_string()]);
    }
}
