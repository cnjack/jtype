use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

// ── User ──

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub username: String,
    pub role: String,
    pub site_title: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub email_verified_at: Option<String>,
    pub enabled: bool,
    pub storage_budget_bytes: i64,
    pub created_at: String,
}

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: String,
    pub username: String,
    pub role: String,
    /// Session scope: `full` (login/desktop) or `mcp` (agent token). MCP-scoped
    /// tokens can manage notes/kanban but are barred from admin endpoints.
    pub scope: String,
}

// ── Auth ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
    pub site_title: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthResponse {
    pub token: String,
    pub username: String,
    pub site_url: String,
    pub role: String,
}

// ── Profile ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfileRequest {
    pub display_name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSiteRequest {
    pub site_title: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileResponse {
    pub id: String,
    pub username: String,
    pub role: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub email_verified: bool,
    pub site_title: String,
    pub enabled: bool,
    pub storage_budget_bytes: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageUsageResponse {
    pub total_budget_bytes: i64,
    pub total_used_bytes: i64,
    pub workspaces: Vec<WorkspaceStorageItem>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStorageItem {
    pub workspace_id: String,
    pub workspace_name: String,
    pub budget_bytes: i64,
    pub used_bytes: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub device_id: String,
    pub workspace_id: String,
    pub workspace_name: String,
    pub last_seen_clock: i64,
    pub updated_at: String,
}

// ── Admin ──

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminUserResponse {
    pub id: String,
    pub username: String,
    pub role: String,
    pub site_title: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub enabled: bool,
    pub workspace_count: i64,
    pub storage_used_bytes: i64,
    pub storage_budget_bytes: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminWorkspaceResponse {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub owner_username: Option<String>,
    pub member_count: i64,
    pub document_count: i64,
    pub storage_budget_bytes: i64,
    pub storage_used_bytes: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminDomainResponse {
    pub id: String,
    pub domain: String,
    pub username: String,
    pub status: String,
    pub ssl_status: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminStatsResponse {
    pub total_users: i64,
    pub total_workspaces: i64,
    pub total_documents: i64,
    pub total_storage_bytes: i64,
    pub total_domains: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminUpdateUserRequest {
    pub role: Option<String>,
    pub enabled: Option<bool>,
    pub storage_budget_bytes: Option<i64>,
}

// ── Workspace ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceRequest {
    pub name: String,
    pub storage_budget_bytes: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkspaceRequest {
    pub name: Option<String>,
    pub publish_title: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSummary {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub publish_title: String,
    pub role: String,
    pub document_count: i64,
    pub storage_budget_bytes: i64,
    pub storage_used_bytes: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceListResponse {
    pub workspaces: Vec<WorkspaceSummary>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateInviteRequest {
    pub email: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InviteResponse {
    pub invite_id: String,
    pub workspace_id: String,
    pub role: String,
    pub invite_token: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvitePreviewResponse {
    pub workspace_name: String,
    pub invited_by_username: String,
    pub role: String,
    pub status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InviteListItem {
    pub invite_id: String,
    pub email: Option<String>,
    pub role: String,
    pub status: String,
    pub created_at: String,
}

// ── Documents ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudSaveDocumentRequest {
    pub relative_path: String,
    pub title: Option<String>,
    pub content: String,
    pub base_content_hash: Option<String>,
    pub base_content: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CloudDocument {
    pub relative_path: String,
    pub title: String,
    pub is_published: bool,
    pub content: String,
    pub content_hash: String,
    pub version_id: String,
    pub updated_clock: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentListItem {
    pub id: String,
    pub relative_path: String,
    pub title: String,
    pub is_published: bool,
    pub content_hash: String,
    pub updated_clock: i64,
    pub version_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderRequest {
    pub relative_path: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncFolderInput {
    pub relative_path: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FolderListItem {
    pub id: String,
    pub relative_path: String,
    pub updated_clock: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeletedFolder {
    pub relative_path: String,
    pub deleted_clock: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentVersionResponse {
    pub id: String,
    pub parent_version_id: Option<String>,
    pub source: String,
    pub content_hash: String,
    pub content: String,
    pub created_at: String,
    /// Username of the version's author (for an activity-timeline `by` field).
    pub author_username: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestDocument {
    pub relative_path: String,
    pub title: String,
    pub is_published: bool,
    pub content_hash: String,
    pub version_id: String,
    pub updated_clock: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceManifestResponse {
    pub workspace_id: String,
    pub documents: Vec<ManifestDocument>,
}

// ── Sync ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPullRequest {
    pub since_clock: Option<i64>,
    pub device_id: Option<String>,
    pub since_trash_event_clock: Option<i64>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeletedFolderInput {
    pub relative_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPushRequest {
    pub device_id: Option<String>,
    #[serde(default)]
    pub folders: Vec<SyncFolderInput>,
    pub documents: Vec<CloudSaveDocumentRequest>,
    #[serde(default)]
    pub deleted_paths: Vec<DeletedPathInput>,
    #[serde(default)]
    pub deleted_folders: Vec<DeletedFolderInput>,
    #[serde(default)]
    pub trash_operations: Vec<TrashOperation>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeletedPathInput {
    pub relative_path: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncConflict {
    pub conflict_id: String,
    pub relative_path: String,
    pub local_content: String,
    pub cloud_content: String,
    pub base_content: Option<String>,
    pub conflict_ranges: Option<JsonValue>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPullResponse {
    pub workspace_id: String,
    pub folders: Vec<FolderListItem>,
    pub deleted_folders: Vec<DeletedFolder>,
    pub documents: Vec<CloudDocument>,
    pub deleted_paths: Vec<DeletedPath>,
    pub conflicts: Vec<SyncConflict>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trash: Option<TrashSyncData>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeletedPath {
    pub relative_path: String,
    pub deleted_clock: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncPushDocument {
    #[serde(flatten)]
    pub doc: CloudDocument,
    pub merge_status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPushResponse {
    pub workspace_id: String,
    pub accepted: usize,
    pub folders: Vec<FolderListItem>,
    pub documents: Vec<SyncPushDocument>,
    pub deleted_paths: Vec<DeletedPath>,
    pub conflicts: Vec<SyncConflict>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveConflictRequest {
    pub resolution: String,
    pub content: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConflictResponse {
    pub conflict_id: String,
    pub relative_path: String,
    pub local_content: String,
    pub cloud_content: String,
    pub base_content: Option<String>,
    pub conflict_ranges: Option<String>,
}

// ── OAuth Device ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceOAuthStartRequest {
    pub device_id: Option<String>,
    pub return_url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceOAuthStartResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceOAuthPollRequest {
    pub device_code: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceOAuthApproveRequest {
    pub user_code: String,
}

// ── Domains ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddDomainRequest {
    pub domain: String,
    pub workspace_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BindDomainRequest {
    pub workspace_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DomainResponse {
    pub id: String,
    pub domain: String,
    pub workspace_id: Option<String>,
    pub workspace_name: Option<String>,
    pub verification_token: String,
    pub dns_txt_record: String,
    pub status: String,
    pub verified_at: Option<String>,
    pub ssl_status: Option<String>,
    pub ssl_expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadCertificateRequest {
    pub cert_chain_pem: String,
    pub private_key_pem: String,
}

// ── Trash Sync ──

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TrashEvent {
    pub id: String,
    pub event_type: String,
    pub event_clock: i64,
    pub event_data: serde_json::Value,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashSyncData {
    pub items: Vec<TrashSyncItem>,
    pub events: Vec<TrashEvent>,
    pub expired_trash_ids: Vec<String>,
    pub trash_cursor: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TrashSyncItem {
    pub id: String,
    pub document_id: String,
    pub relative_path: String,
    pub title: String,
    pub content_hash: String,
    pub deleted_by_user_id: String,
    pub source_device_id: Option<String>,
    pub source_user_id: Option<String>,
    pub deleted_at: String,
    pub expires_at: String,
    pub deleted_clock: i64,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum TrashOperation {
    #[serde(rename = "restore")]
    Restore {
        #[serde(rename = "trashId")]
        trash_id: String,
    },
    #[serde(rename = "permanent_delete")]
    PermanentDelete {
        #[serde(rename = "trashId")]
        trash_id: String,
    },
    #[serde(rename = "empty_trash")]
    EmptyTrash,
}

// ── Site & Publish ──

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteSettingsResponse {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub footer_html: Option<String>,
    pub theme: String,
    /// Stored custom-theme spec (only meaningful when `theme == "custom"`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_theme: Option<serde_json::Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSiteSettingsRequest {
    pub name: Option<String>,
    pub footer_html: Option<String>,
    pub theme: Option<String>,
    /// Custom theme spec; used when `theme == "custom"`.
    pub custom_theme: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishedPageItem {
    pub id: String,
    pub document_id: String,
    pub relative_path: String,
    pub title: String,
    pub content_hash: String,
    pub version_id: Option<String>,
    pub published_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishDocumentResponse {
    pub document_id: String,
    pub relative_path: String,
    pub title: String,
    pub content_hash: String,
    pub published_at: String,
    pub is_published: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishBatchRequest {
    pub document_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishBatchResponse {
    pub published: Vec<PublishDocumentResponse>,
    pub failed: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewRequest {
    pub content: String,
    pub theme: Option<String>,
    /// Inline custom theme spec for previewing before saving (theme == "custom").
    pub custom_theme: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishStatusResponse {
    pub document_id: String,
    pub is_published: bool,
    pub published_at: Option<String>,
    pub current_hash: String,
    pub published_hash: Option<String>,
    pub has_unpublished_changes: bool,
}

// ── Assets ──

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetResponse {
    pub id: String,
    /// Web-proxied URL to embed in Markdown (`/assets/:workspace_id/:id`).
    pub url: String,
    pub content_type: String,
    pub byte_size: i64,
    pub original_name: Option<String>,
    pub created_at: String,
}
