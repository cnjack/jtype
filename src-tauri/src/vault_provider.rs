use serde::{Deserialize, Serialize};
use std::hash::Hasher;
use std::path::{Path, PathBuf};

pub const PROVIDER_STORE_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum VaultProviderKind {
    AppPrivate,
    LocalDirectory,
    ExternalMirror,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum VaultProviderAccessState {
    Ready,
    AuthorizationRequired,
    SourceUnavailable,
    Error,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum VaultProviderStorageMode {
    Direct,
    Mirror,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum VaultProviderSourceKind {
    AndroidSafTree,
    IosSecurityScopedBookmark,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VaultProviderCapabilities {
    pub can_read: bool,
    pub can_write: bool,
    pub can_create: bool,
    pub can_rename: bool,
    pub can_delete: bool,
    pub can_watch: bool,
    pub can_reconcile: bool,
    pub can_reauthorize: bool,
}

impl VaultProviderCapabilities {
    fn direct_filesystem() -> Self {
        Self {
            can_read: true,
            can_write: true,
            can_create: true,
            can_rename: true,
            can_delete: true,
            can_watch: true,
            can_reconcile: false,
            can_reauthorize: false,
        }
    }

    pub fn external_mirror(read_only: bool, can_reconcile: bool, can_reauthorize: bool) -> Self {
        Self {
            can_read: true,
            can_write: !read_only,
            can_create: !read_only,
            can_rename: !read_only,
            can_delete: !read_only,
            can_watch: true,
            // These become true only when the provider adapter has real
            // reconcile and reauthorization commands wired end to end.
            can_reconcile,
            can_reauthorize,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VaultProviderDescriptor {
    pub provider_id: String,
    pub kind: VaultProviderKind,
    pub display_name: String,
    pub local_root_path: String,
    pub access_state: VaultProviderAccessState,
    pub storage_mode: VaultProviderStorageMode,
    pub capabilities: VaultProviderCapabilities,
}

/// Persistent, native-only metadata for an external vault. The opaque source
/// reference is never returned to the WebView: Android stores a persistable SAF
/// tree reference, while iOS stores an encoded security-scoped bookmark.
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExternalVaultProviderRecord {
    pub provider_id: String,
    pub display_name: String,
    pub source_kind: VaultProviderSourceKind,
    pub opaque_source_reference: String,
    pub mirror_root_path: String,
    pub access_state: VaultProviderAccessState,
    pub read_only: bool,
    #[serde(default = "default_true")]
    pub source_read_only: bool,
    pub last_reconciled_at: Option<u64>,
    pub source_revision: Option<String>,
}

fn default_true() -> bool {
    true
}

impl ExternalVaultProviderRecord {
    pub fn descriptor(&self) -> VaultProviderDescriptor {
        VaultProviderDescriptor {
            provider_id: self.provider_id.clone(),
            kind: VaultProviderKind::ExternalMirror,
            display_name: self.display_name.clone(),
            local_root_path: self.mirror_root_path.clone(),
            access_state: self.access_state,
            storage_mode: VaultProviderStorageMode::Mirror,
            capabilities: VaultProviderCapabilities::external_mirror(
                self.read_only,
                self.source_kind == VaultProviderSourceKind::AndroidSafTree,
                self.source_kind == VaultProviderSourceKind::AndroidSafTree,
            ),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VaultProviderStore {
    #[serde(default = "provider_store_version")]
    pub version: u32,
    #[serde(default)]
    pub providers: Vec<ExternalVaultProviderRecord>,
}

impl Default for VaultProviderStore {
    fn default() -> Self {
        Self {
            version: PROVIDER_STORE_VERSION,
            providers: Vec::new(),
        }
    }
}

impl VaultProviderStore {
    pub fn provider(&self, provider_id: &str) -> Option<&ExternalVaultProviderRecord> {
        self.providers
            .iter()
            .find(|provider| provider.provider_id == provider_id)
    }

    pub fn provider_for_mirror_root(&self, root: &Path) -> Option<&ExternalVaultProviderRecord> {
        let normalized_root = path_to_string(root);
        self.providers
            .iter()
            .find(|provider| provider.mirror_root_path == normalized_root)
    }

    pub fn provider_for_source(
        &self,
        source_kind: VaultProviderSourceKind,
        source_reference: &str,
    ) -> Option<&ExternalVaultProviderRecord> {
        self.providers.iter().find(|provider| {
            provider.source_kind == source_kind
                && provider.opaque_source_reference == source_reference
        })
    }

    pub fn upsert(&mut self, provider: ExternalVaultProviderRecord) {
        if let Some(existing) = self
            .providers
            .iter_mut()
            .find(|existing| existing.provider_id == provider.provider_id)
        {
            *existing = provider;
        } else {
            self.providers.push(provider);
        }
    }
}

fn provider_store_version() -> u32 {
    PROVIDER_STORE_VERSION
}

/// The filesystem used by the shared workbench. External providers will first
/// reconcile into their local mirror and then reuse this exact implementation.
pub struct LocalVaultProvider {
    descriptor: VaultProviderDescriptor,
    root: PathBuf,
}

impl LocalVaultProvider {
    pub fn resolve(root: PathBuf, default_root: &Path, is_mobile: bool) -> Self {
        let is_app_private = is_mobile && root == default_root;
        let (kind, provider_id, display_name) = if is_app_private {
            (
                VaultProviderKind::AppPrivate,
                "app-private:default".to_string(),
                "On this device".to_string(),
            )
        } else {
            (
                VaultProviderKind::LocalDirectory,
                stable_provider_id("local", &root),
                root.file_name()
                    .and_then(|name| name.to_str())
                    .filter(|name| !name.is_empty())
                    .unwrap_or("Local vault")
                    .to_string(),
            )
        };
        let descriptor = VaultProviderDescriptor {
            provider_id,
            kind,
            display_name,
            local_root_path: path_to_string(&root),
            access_state: VaultProviderAccessState::Ready,
            storage_mode: VaultProviderStorageMode::Direct,
            capabilities: VaultProviderCapabilities::direct_filesystem(),
        };
        Self { descriptor, root }
    }

    pub fn descriptor(&self) -> &VaultProviderDescriptor {
        &self.descriptor
    }

    pub fn local_root(&self) -> &Path {
        &self.root
    }

    pub fn prepare_root(&self, create: bool) -> Result<&Path, String> {
        if create {
            std::fs::create_dir_all(&self.root).map_err(|error| error.to_string())?;
        }
        if !self.root.is_dir() {
            return Err(format!(
                "Vault provider root is unavailable: {}",
                path_to_string(&self.root)
            ));
        }
        Ok(&self.root)
    }
}

fn stable_provider_id(prefix: &str, root: &Path) -> String {
    stable_value_id(prefix, &path_to_string(root))
}

pub fn external_provider_id(
    source_kind: VaultProviderSourceKind,
    source_reference: &str,
) -> String {
    let source_kind = match source_kind {
        VaultProviderSourceKind::AndroidSafTree => "android-saf-tree",
        VaultProviderSourceKind::IosSecurityScopedBookmark => "ios-security-scoped-bookmark",
    };
    stable_value_id("external", &format!("{source_kind}:{source_reference}"))
}

pub fn mirror_directory_name(provider_id: &str) -> &str {
    provider_id
        .strip_prefix("external:")
        .filter(|value| !value.is_empty())
        .unwrap_or(provider_id)
}

fn stable_value_id(prefix: &str, value: &str) -> String {
    // FNV-1a is deliberately fixed rather than using DefaultHasher so provider
    // ids remain stable across Rust toolchain updates.
    struct Fnv1a(u64);
    impl Hasher for Fnv1a {
        fn finish(&self) -> u64 {
            self.0
        }

        fn write(&mut self, bytes: &[u8]) {
            for byte in bytes {
                self.0 ^= u64::from(*byte);
                self.0 = self.0.wrapping_mul(0x100000001b3);
            }
        }
    }

    let mut hasher = Fnv1a(0xcbf29ce484222325);
    hasher.write(value.as_bytes());
    format!("{prefix}:{:016x}", hasher.finish())
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mobile_default_resolves_to_app_private_provider() {
        let root = PathBuf::from("/app/data/vaults/default");
        let provider = LocalVaultProvider::resolve(root.clone(), &root, true);
        let descriptor = provider.descriptor();

        assert_eq!(descriptor.provider_id, "app-private:default");
        assert_eq!(descriptor.kind, VaultProviderKind::AppPrivate);
        assert_eq!(descriptor.storage_mode, VaultProviderStorageMode::Direct);
        assert!(!descriptor.capabilities.can_reconcile);
        assert!(!descriptor.capabilities.can_reauthorize);
    }

    #[test]
    fn desktop_directory_keeps_a_stable_local_provider_id() {
        let root = PathBuf::from("/users/jack/notes");
        let first = LocalVaultProvider::resolve(root.clone(), Path::new("/unused"), false);
        let second = LocalVaultProvider::resolve(root, Path::new("/unused"), false);

        assert_eq!(first.descriptor(), second.descriptor());
        assert_eq!(first.descriptor().kind, VaultProviderKind::LocalDirectory);
        assert!(first.descriptor().provider_id.starts_with("local:"));
    }

    #[test]
    fn external_record_exposes_mirror_capabilities_without_source_reference() {
        let record = ExternalVaultProviderRecord {
            provider_id: "external:fixture".to_string(),
            display_name: "Shared notes".to_string(),
            source_kind: VaultProviderSourceKind::AndroidSafTree,
            opaque_source_reference: "content://provider/tree/secret".to_string(),
            mirror_root_path: "/app/data/vaults/external/fixture".to_string(),
            access_state: VaultProviderAccessState::AuthorizationRequired,
            read_only: false,
            source_read_only: false,
            last_reconciled_at: None,
            source_revision: None,
        };
        let descriptor = record.descriptor();
        let json = serde_json::to_value(&descriptor).unwrap();

        assert_eq!(descriptor.kind, VaultProviderKind::ExternalMirror);
        assert_eq!(descriptor.storage_mode, VaultProviderStorageMode::Mirror);
        assert!(descriptor.capabilities.can_reconcile);
        assert!(descriptor.capabilities.can_reauthorize);
        assert!(!json.to_string().contains("content://"));
        assert!(!json.to_string().contains("opaqueSourceReference"));

        let mut ios_record = record;
        ios_record.source_kind = VaultProviderSourceKind::IosSecurityScopedBookmark;
        assert!(!ios_record.descriptor().capabilities.can_reconcile);
        assert!(!ios_record.descriptor().capabilities.can_reauthorize);
    }

    #[test]
    fn provider_store_schema_defaults_to_version_one() {
        let store: VaultProviderStore = serde_json::from_str(r#"{"providers":[]}"#).unwrap();
        assert_eq!(store, VaultProviderStore::default());
    }

    #[test]
    fn legacy_external_records_default_source_access_to_read_only() {
        let store: VaultProviderStore = serde_json::from_str(
            r#"{
                "version": 1,
                "providers": [{
                    "providerId": "external:legacy",
                    "displayName": "Legacy notes",
                    "sourceKind": "androidSafTree",
                    "opaqueSourceReference": "content://provider/tree/legacy",
                    "mirrorRootPath": "/app/data/vaults/external/legacy",
                    "accessState": "ready",
                    "readOnly": true,
                    "lastReconciledAt": null,
                    "sourceRevision": null
                }]
            }"#,
        )
        .unwrap();

        assert!(store.providers[0].source_read_only);
    }

    #[test]
    fn external_provider_identity_is_stable_and_source_scoped() {
        let source = "content://provider/tree/primary%3ANotes";
        let first = external_provider_id(VaultProviderSourceKind::AndroidSafTree, source);
        let second = external_provider_id(VaultProviderSourceKind::AndroidSafTree, source);
        let ios = external_provider_id(VaultProviderSourceKind::IosSecurityScopedBookmark, source);

        assert_eq!(first, second);
        assert_ne!(first, ios);
        assert!(first.starts_with("external:"));
        assert_eq!(mirror_directory_name(&first).len(), 16);
    }

    #[test]
    fn provider_store_upserts_and_resolves_native_records() {
        let record = ExternalVaultProviderRecord {
            provider_id: "external:fixture".to_string(),
            display_name: "Shared notes".to_string(),
            source_kind: VaultProviderSourceKind::AndroidSafTree,
            opaque_source_reference: "content://provider/tree/notes".to_string(),
            mirror_root_path: "/app/data/vaults/external/fixture".to_string(),
            access_state: VaultProviderAccessState::Ready,
            read_only: false,
            source_read_only: false,
            last_reconciled_at: None,
            source_revision: None,
        };
        let mut store = VaultProviderStore::default();
        store.upsert(record.clone());
        let mut updated = record.clone();
        updated.read_only = true;
        store.upsert(updated);

        assert_eq!(store.providers.len(), 1);
        assert!(store.providers[0].read_only);
        assert_eq!(
            store
                .provider_for_source(
                    VaultProviderSourceKind::AndroidSafTree,
                    &record.opaque_source_reference,
                )
                .map(|provider| provider.provider_id.as_str()),
            Some("external:fixture")
        );
        assert_eq!(
            store
                .provider_for_mirror_root(Path::new(&record.mirror_root_path))
                .map(|provider| provider.provider_id.as_str()),
            Some("external:fixture")
        );
    }
}
