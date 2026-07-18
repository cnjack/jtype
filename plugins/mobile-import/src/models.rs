use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterializeRequest {
    pub source: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterializedFile {
    pub path: String,
}

/// Sources captured by the platform share target. The native adapter keeps
/// URI grants and temporary text files out of the WebView until Rust drains
/// them into the existing external-import command.
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PendingShareSources {
    pub sources: Vec<String>,
}

/// Native-only result from an Android SAF or iOS document-picker selection.
/// The source reference is consumed by Rust and persisted in app-private
/// storage; it is never part of a Tauri command response to the WebView.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedDirectory {
    pub source_reference: String,
    pub source_identity: String,
    pub display_name: String,
    pub read_only: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryAccessRequest {
    pub source_reference: String,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DirectoryAccessState {
    Ready,
    AuthorizationRequired,
    SourceUnavailable,
    Error,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryAccess {
    pub state: DirectoryAccessState,
    pub read_only: bool,
    #[serde(default)]
    pub refreshed_source_reference: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryPermissionRelease {
    pub released: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MirrorDirectoryRequest {
    pub source_reference: String,
    pub mirror_root_path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MirroredDirectory {
    pub files: u64,
    pub directories: u64,
    pub bytes: u64,
    pub source_revision: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryScanRequest {
    pub source_reference: String,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DirectoryManifestEntryKind {
    Directory,
    File,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryManifestEntry {
    pub relative_path: String,
    pub kind: DirectoryManifestEntryKind,
    pub bytes: u64,
    #[serde(default)]
    pub content_hash: Option<String>,
}

/// A content-addressed source view. Native code reads the provider stream to
/// hash files but does not copy them into app-private storage; Rust decides
/// which changed paths must be materialized after building the reconcile plan.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryScanResult {
    pub entries: Vec<DirectoryManifestEntry>,
    pub files: u64,
    pub directories: u64,
    pub bytes: u64,
    pub elapsed_ms: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterializeDirectoryEntriesRequest {
    pub source_reference: String,
    pub destination_root_path: String,
    pub relative_paths: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterializedDirectoryEntries {
    pub files: u64,
    pub directories: u64,
    pub bytes: u64,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DirectoryChangeKind {
    UpsertDirectory,
    UpsertFile,
    Delete,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryChangeRequest {
    pub source_reference: String,
    pub mirror_root_path: String,
    pub relative_path: String,
    pub kind: DirectoryChangeKind,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppliedDirectoryChange {
    pub changed: bool,
    pub bytes: u64,
}

/// Debug-build-only fault modes used to exercise Android SAF recovery with a
/// real DocumentsProvider. Release builds reject configuration requests.
#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DebugDirectoryFaultKind {
    PermissionRevoked,
    DiskFull,
    Clear,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugDirectoryFaultRequest {
    pub fail_after_operations: u64,
    pub kind: DebugDirectoryFaultKind,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugDirectoryFaultConfiguration {
    pub configured: bool,
}
