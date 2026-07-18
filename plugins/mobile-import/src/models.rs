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

/// Native-only result from Android's Storage Access Framework picker. The
/// source reference is consumed by Rust and persisted in app-private storage;
/// it is never part of a Tauri command response to the WebView.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedDirectory {
    pub source_reference: String,
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
