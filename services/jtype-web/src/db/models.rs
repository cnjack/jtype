use serde::{Deserialize, Serialize};

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
    pub enabled: bool,
    pub storage_budget_bytes: i64,
    pub created_at: String,
}

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: String,
    pub username: String,
    pub role: String,
}

// ── Auth ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
    pub site_title: Option<String>,
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSummary {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub role: String,
    pub document_count: i64,
    pub storage_budget_bytes: i64,
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

// ── Documents ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudSaveDocumentRequest {
    pub relative_path: String,
    pub title: Option<String>,
    pub status: Option<String>,
    pub content: String,
    pub base_content_hash: Option<String>,
    pub base_content: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CloudDocument {
    pub relative_path: String,
    pub title: String,
    pub status: String,
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
    pub status: String,
    pub content_hash: String,
    pub updated_clock: i64,
    pub version_id: Option<String>,
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
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDocumentStatusRequest {
    pub status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestDocument {
    pub relative_path: String,
    pub title: String,
    pub status: String,
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
pub struct SyncWorkspaceRequest {
    pub workspace_name: String,
    pub documents: Vec<SyncDocumentInput>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncDocumentInput {
    pub relative_path: String,
    pub title: String,
    pub status: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncWorkspaceResponse {
    pub workspace_id: String,
    pub workspace_name: String,
    pub document_count: usize,
    pub site_url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPullRequest {
    pub since_clock: Option<i64>,
    pub device_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPushRequest {
    pub device_id: Option<String>,
    pub documents: Vec<CloudSaveDocumentRequest>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncConflict {
    pub conflict_id: String,
    pub relative_path: String,
    pub local_content: String,
    pub cloud_content: String,
    pub base_content: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPullResponse {
    pub workspace_id: String,
    pub documents: Vec<CloudDocument>,
    pub conflicts: Vec<SyncConflict>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPushResponse {
    pub workspace_id: String,
    pub accepted: usize,
    pub documents: Vec<CloudDocument>,
    pub conflicts: Vec<SyncConflict>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveConflictRequest {
    pub resolution: String,
    pub content: Option<String>,
}

// ── OAuth Device ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceOAuthStartRequest {
    pub device_id: Option<String>,
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
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DomainResponse {
    pub id: String,
    pub domain: String,
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
