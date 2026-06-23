import { httpRequest } from '@shared/lib/http'

const API_BASE = ''
const TOKEN_STORAGE_KEY = 'jtype.token'
const USERNAME_STORAGE_KEY = 'jtype.username'

let _sessionId: string | null = null

/** Set the active WS session ID so REST calls can include it for sender exclusion. */
export function setSessionId(id: string | null) { _sessionId = id }

/** Get the active WS session ID. */
export function getSessionId(): string | null { return _sessionId }

export function getStoredToken(): string {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || ''
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(USERNAME_STORAGE_KEY)
}

export function getStoredUsername(): string | null {
  return localStorage.getItem(USERNAME_STORAGE_KEY)
}

export function setStoredUsername(username: string) {
  localStorage.setItem(USERNAME_STORAGE_KEY, username)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken()
  const res = await httpRequest(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(_sessionId ? { 'X-Session-Id': _sessionId } : {}),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

/** Encode each segment for the `/blobs/*relativePath` wildcard route (mirrors
 * the desktop `encodePath` in useCloudSync). Keeps `/` separators. */
function encodeBlobPath(relativePath: string): string {
  return relativePath.split('/').map(encodeURIComponent).join('/')
}

// Auth
export const api = {
  register: (username: string, password: string, siteTitle?: string, email?: string) =>
    request<AuthResponse>('/api/register', { method: 'POST', body: JSON.stringify({ username, password, siteTitle, email }) }),
  login: (username: string, password: string) =>
    request<AuthResponse>('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request<AuthResponse>('/api/me'),

  // Password reset + email verification
  forgotPassword: (email: string) =>
    request<void>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    request<void>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  verifyEmail: (token: string) =>
    request<void>('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  sendEmailVerification: () =>
    request<void>('/api/me/send-email-verification', { method: 'POST' }),
  // Email OTP login (passwordless; requires SMTP configured server-side).
  loginOtpSend: (email: string) =>
    request<void>('/api/auth/otp/send', { method: 'POST', body: JSON.stringify({ email }) }),
  loginOtpVerify: (email: string, code: string) =>
    request<AuthResponse>('/api/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email, code }) }),

  // Profile
  getProfile: () => request<ProfileResponse>('/api/me/profile'),
  updateProfile: (data: { displayName?: string; email?: string }) =>
    request<ProfileResponse>('/api/me/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updateSite: (data: { siteTitle?: string }) =>
    request<ProfileResponse>('/api/me/site', { method: 'PUT', body: JSON.stringify(data) }),
  getStorage: () => request<StorageUsageResponse>('/api/me/storage'),
  getDevices: () => request<DeviceInfo[]>('/api/me/devices'),

  // MCP / AI tokens
  listTokens: () => request<{ tokens: McpToken[] }>('/api/me/tokens'),
  createToken: (data: { label?: string; ttlDays?: number }) =>
    request<CreatedToken>('/api/me/tokens', { method: 'POST', body: JSON.stringify(data) }),
  revokeToken: (id: string) => request<void>(`/api/me/tokens/${id}`, { method: 'DELETE' }),

  // Admin
  adminUsers: () => request<AdminUser[]>('/api/admin/users'),
  adminGetUser: (id: string) => request<AdminUser>(`/api/admin/users/${id}`),
  adminUpdateUser: (id: string, data: { role?: string; enabled?: boolean; storageBudgetBytes?: number }) =>
    request<AdminUser>(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminWorkspaces: () => request<AdminWorkspace[]>('/api/admin/workspaces'),
  adminDomains: () => request<AdminDomain[]>('/api/admin/domains'),
  adminStats: () => request<AdminStats>('/api/admin/stats'),
  adminVersion: () => request<AdminVersion>('/api/admin/version'),
  // Server object-storage settings (DB overrides JTYPED_STORAGE_* env vars).
  getStorageSettings: () => request<StorageSettings>('/api/admin/settings/storage'),
  updateStorageSettings: (data: UpdateStorageSettings) =>
    request<StorageSettings>('/api/admin/settings/storage', { method: 'PUT', body: JSON.stringify(data) }),
  // Server SMTP (email) settings (DB overrides JTYPED_SMTP_* env vars).
  getSmtpSettings: () => request<SmtpSettings>('/api/admin/settings/smtp'),
  updateSmtpSettings: (data: UpdateSmtpSettings) =>
    request<SmtpSettings>('/api/admin/settings/smtp', { method: 'PUT', body: JSON.stringify(data) }),

  // Workspaces
  listWorkspaces: () => request<{ workspaces: WorkspaceSummary[] }>('/api/v1/workspaces'),
  createWorkspace: (name: string, storageBudgetBytes?: number) =>
    request<WorkspaceSummary>('/api/v1/workspaces', { method: 'POST', body: JSON.stringify({ name, storageBudgetBytes }) }),
  getWorkspace: (id: string) => request<WorkspaceSummary>(`/api/v1/workspaces/${id}`),
  updateWorkspace: (id: string, data: { name?: string; publishTitle?: string }) =>
    request<WorkspaceSummary>(`/api/v1/workspaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorkspace: (workspaceId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}`, { method: 'DELETE' }),
  leaveWorkspace: (workspaceId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/leave`, { method: 'POST', body: '{}' }),
  transferOwnership: (workspaceId: string, newOwnerUserId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/transfer`, { method: 'POST', body: JSON.stringify({ newOwnerUserId }) }),

  // Members
  listMembers: (workspaceId: string) =>
    request<MemberInfo[]>(`/api/v1/workspaces/${workspaceId}/members`),
  removeMember: (workspaceId: string, userId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/members/${userId}/remove`, { method: 'POST', body: '{}' }),
  updateMemberRole: (workspaceId: string, userId: string, role: string) =>
    request<MemberInfo>(`/api/v1/workspaces/${workspaceId}/members/${userId}`, { method: 'PUT', body: JSON.stringify({ role }) }),

  // Invites
  createInvite: (workspaceId: string, data: { email?: string; role?: string }) =>
    request<InviteResponse>(`/api/v1/workspaces/${workspaceId}/invites`, { method: 'POST', body: JSON.stringify(data) }),
  revokeInvite: (workspaceId: string, inviteId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/invites/${inviteId}/revoke`, { method: 'POST', body: '{}' }),
  listInvites: (workspaceId: string) =>
    request<InviteListItem[]>(`/api/v1/workspaces/${workspaceId}/invites`),
  previewInvite: async (token: string): Promise<InvitePreview> => {
    const res = await fetch(`${API_BASE}/api/v1/workspace-invites/${token}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(body.error || res.statusText)
    }
    return res.json()
  },
  acceptInvite: (token: string) =>
    request<WorkspaceSummary>(`/api/v1/workspace-invites/${token}/accept`, { method: 'POST', body: '{}' }),

  // Documents
  listFolders: (workspaceId: string) =>
    request<FolderListItem[]>(`/api/v1/workspaces/${workspaceId}/folders`),
  createFolder: (workspaceId: string, relativePath: string) =>
    request<FolderListItem>(`/api/v1/workspaces/${workspaceId}/folders`, { method: 'POST', body: JSON.stringify({ relativePath }) }),
  deleteFolder: (workspaceId: string, folderId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/folders/${folderId}`, { method: 'DELETE' }),
  listDocuments: (workspaceId: string) =>
    request<DocumentListItem[]>(`/api/v1/workspaces/${workspaceId}/documents`),
  getDocument: (workspaceId: string, docId: string) =>
    request<CloudDocument>(`/api/v1/workspaces/${workspaceId}/documents/${docId}`),
  deleteDocument: (workspaceId: string, docId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/documents/${docId}`, { method: 'DELETE' }),
  saveDocument: (workspaceId: string, data: SaveDocumentRequest) =>
    request<SaveDocumentResponse>(`/api/v1/workspaces/${workspaceId}/documents/save`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPublishStatus: (workspaceId: string, docId: string) =>
    request<PublishStatusResponse>(`/api/v1/workspaces/${workspaceId}/documents/${docId}/publish`),

  // Assets (images). Raw bytes upload; the server proxies public reads.
  uploadAsset: async (workspaceId: string, file: File): Promise<AssetResponse> => {
    const token = getStoredToken()
    const res = await httpRequest(`${API_BASE}/api/v1/workspaces/${workspaceId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Filename': encodeURIComponent(file.name || 'image'),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: file,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(body.error || res.statusText)
    }
    return res.json()
  },
  listAssets: (workspaceId: string) =>
    request<AssetResponse[]>(`/api/v1/workspaces/${workspaceId}/assets`),
  deleteAsset: (workspaceId: string, assetId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/assets/${assetId}`, { method: 'DELETE' }),

  // Blobs: path-keyed binary documents (e.g. PDF). These sync to the desktop via
  // `document_blobs` (path-keyed) — distinct from the UUID asset store above which
  // backs inline markdown images. The server derives content-type from the path
  // extension (ignores any client Content-Type) for safety.
  uploadBlob: async (workspaceId: string, relativePath: string, file: File | Blob): Promise<BlobUploadResponse> => {
    const token = getStoredToken()
    const res = await httpRequest(`${API_BASE}/api/v1/workspaces/${workspaceId}/blobs/${encodeBlobPath(relativePath)}`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: file,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(body.error || res.statusText)
    }
    return res.json()
  },
  listBlobs: (workspaceId: string, sinceClock = 0) =>
    request<BlobManifestEntry[]>(`/api/v1/workspaces/${workspaceId}/blobs?sinceClock=${sinceClock}`),
  downloadBlob: async (workspaceId: string, relativePath: string): Promise<ArrayBuffer> => {
    const token = getStoredToken()
    const res = await httpRequest(`${API_BASE}/api/v1/workspaces/${workspaceId}/blobs/${encodeBlobPath(relativePath)}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!res.ok) throw new Error(res.statusText)
    return res.arrayBuffer()
  },
  deleteBlob: (workspaceId: string, relativePath: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/blobs/${encodeBlobPath(relativePath)}`, { method: 'DELETE' }),

  // Themes & site settings
  listThemes: () => request<ThemeInfo[]>('/api/themes'),
  getTheme: (id: string) => request<ThemeSpec>(`/api/themes/${id}`),
  getSiteSettings: (workspaceId: string) =>
    request<SiteSettings>(`/api/v1/workspaces/${workspaceId}/site`),
  updateSiteSettings: (workspaceId: string, data: UpdateSiteSettings) =>
    request<SiteSettings>(`/api/v1/workspaces/${workspaceId}/site`, { method: 'PUT', body: JSON.stringify(data) }),
  /** Render markdown to a full themed HTML page (returns the HTML string). */
  previewSite: async (workspaceId: string, data: { content: string; theme?: string; customTheme?: ThemeSpec | null }): Promise<string> => {
    const token = getStoredToken()
    const res = await httpRequest(`${API_BASE}/api/v1/workspaces/${workspaceId}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(body.error || res.statusText)
    }
    return res.text()
  },
  publishDocument: (workspaceId: string, docId: string) =>
    request<PublishDocumentResponse>(`/api/v1/workspaces/${workspaceId}/documents/${docId}/publish`, { method: 'POST', body: '{}' }),
  unpublishDocument: (workspaceId: string, docId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/documents/${docId}/publish`, { method: 'DELETE' }),
  listVersions: (workspaceId: string, docId: string) =>
    request<DocumentVersion[]>(`/api/v1/workspaces/${workspaceId}/documents/${docId}/versions`),
  // Card comments (document-backed board): keyed by the card's document id.
  listComments: (workspaceId: string, docId: string) =>
    request<CardComment[]>(`/api/v1/workspaces/${workspaceId}/documents/${docId}/comments`),
  createComment: (workspaceId: string, docId: string, body: string) =>
    request<CardComment>(`/api/v1/workspaces/${workspaceId}/documents/${docId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  deleteComment: (workspaceId: string, commentId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/comments/${commentId}`, { method: 'DELETE' }),
  // Webhooks (document-backed board): board scope is a board's logical id.
  listWebhooks: (workspaceId: string) =>
    request<Webhook[]>(`/api/v1/workspaces/${workspaceId}/webhooks`),
  createWebhook: (workspaceId: string, data: { name: string; targetUrl: string; boardRef?: string | null; eventTypes: string[] }) =>
    request<WebhookCreated>(`/api/v1/workspaces/${workspaceId}/webhooks`, { method: 'POST', body: JSON.stringify(data) }),
  deleteWebhook: (workspaceId: string, webhookId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}`, { method: 'DELETE' }),
  // Ticket links (/browse/OCCSV-3371): per-card number is cloud-indexed.
  allocateTicket: (workspaceId: string, data: { relativePath: string; ticketKey: string }) =>
    request<Ticket>(`/api/v1/workspaces/${workspaceId}/tickets/allocate`, { method: 'POST', body: JSON.stringify(data) }),
  listTickets: (workspaceId: string) =>
    request<Ticket[]>(`/api/v1/workspaces/${workspaceId}/tickets`),
  browseTicket: (ticket: string) =>
    request<BrowseResult>(`/api/v1/browse/${encodeURIComponent(ticket)}`),
  listTrash: (workspaceId: string) =>
    request<TrashItem[]>(`/api/v1/workspaces/${workspaceId}/trash`),
  restoreTrash: (workspaceId: string, trashId: string) =>
    request<CloudDocument>(`/api/v1/workspaces/${workspaceId}/trash/${trashId}/restore`, { method: 'POST', body: '{}' }),
  deleteTrash: (workspaceId: string, trashId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/trash/${trashId}`, { method: 'DELETE' }),
  emptyTrash: (workspaceId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/trash`, { method: 'DELETE' }),

  // Conflicts
  listConflicts: (workspaceId: string) =>
    request<SyncConflictItem[]>(`/api/v1/workspaces/${workspaceId}/conflicts`),
  resolveConflict: (workspaceId: string, conflictId: string, resolution: string, content?: string) =>
    request<CloudDocument>(`/api/v1/workspaces/${workspaceId}/conflicts/${conflictId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution, content }),
    }),

  // Device OAuth
  approveDevice: (userCode: string) =>
    request<void>('/api/oauth/device/approve', { method: 'POST', body: JSON.stringify({ userCode }) }),

  // Domains
  listDomains: () => request<DomainResponse[]>('/api/v1/domains'),
  addDomain: (domain: string, workspaceId?: string) =>
    request<DomainResponse>('/api/v1/domains', { method: 'POST', body: JSON.stringify({ domain, workspaceId }) }),
  bindDomain: (id: string, workspaceId?: string) =>
    request<DomainResponse>(`/api/v1/domains/${id}/binding`, { method: 'PUT', body: JSON.stringify({ workspaceId }) }),
  verifyDomain: (id: string) =>
    request<DomainResponse>(`/api/v1/domains/${id}/verify`, { method: 'POST', body: '{}' }),
  uploadCertificate: (id: string, certChainPem: string, privateKeyPem: string) =>
    request<DomainResponse>(`/api/v1/domains/${id}/certificate`, { method: 'POST', body: JSON.stringify({ certChainPem, privateKeyPem }) }),

}

// Types
export interface AuthResponse {
  token: string
  username: string
  siteUrl: string
  role: string
}

export interface ProfileResponse {
  id: string
  username: string
  role: string
  displayName: string | null
  email: string | null
  emailVerified: boolean
  siteTitle: string
  enabled: boolean
  storageBudgetBytes: number
}

export interface StorageUsageResponse {
  totalBudgetBytes: number
  totalUsedBytes: number
  workspaces: { workspaceId: string; workspaceName: string; budgetBytes: number; usedBytes: number }[]
}

export interface DeviceInfo {
  deviceId: string
  workspaceId: string
  workspaceName: string
  lastSeenClock: number
  updatedAt: string
}

export interface McpToken {
  id: string
  scope: string
  label: string | null
  createdAt: string
  expiresAt: string | null
  current: boolean
}

export interface CreatedToken {
  token: string
  scope: string
  label: string
  ttlDays: number
}

export interface AdminUser {
  id: string
  username: string
  role: string
  siteTitle: string
  displayName: string | null
  email: string | null
  enabled: boolean
  workspaceCount: number
  storageUsedBytes: number
  storageBudgetBytes: number
  createdAt: string
}

export interface AdminWorkspace {
  id: string
  name: string
  slug: string
  ownerUsername: string | null
  memberCount: number
  documentCount: number
  storageBudgetBytes: number
  storageUsedBytes: number
}

export interface AdminDomain {
  id: string
  domain: string
  username: string
  status: string
  sslStatus: string | null
}

export interface AdminStats {
  totalUsers: number
  totalWorkspaces: number
  totalDocuments: number
  totalStorageBytes: number
  totalDomains: number
}

export interface AdminVersion {
  /** Version the running server reports. */
  current: string
  /** Latest published release tag (no leading `v`), if any. */
  latest: string | null
  updateAvailable: boolean
  releaseUrl: string | null
  releaseName: string | null
  publishedAt: string | null
  notes: string | null
  /** Convenience `docker pull` target for the operator. */
  image: string
  /** Non-fatal note when the GitHub lookup failed. */
  error: string | null
}

/** Where each resolved storage field comes from: 'db' | 'env' | 'default'. */
export interface StorageSettingsSources {
  endpoint: string
  bucket: string
  accessKey: string
  secretKey: string
  region: string
  localDir: string
}

export interface StorageSettings {
  /** Backend selected by the current config: 's3' or 'local'. */
  activeBackend: string
  endpoint: string
  bucket: string
  accessKey: string
  region: string
  localDir: string
  /** The secret value is never returned — only whether one is set. */
  secretKeySet: boolean
  sources: StorageSettingsSources
}

export interface UpdateStorageSettings {
  endpoint?: string
  bucket?: string
  accessKey?: string
  /** Omit or leave blank to keep the existing secret unchanged. */
  secretKey?: string
  region?: string
  localDir?: string
}

/** SMTP (email) settings — mirrors StorageSettings shape. */
export interface SmtpSettingsSources {
  host: string
  port: string
  username: string
  password: string
  from: string
  encryption: string
}

export interface SmtpSettings {
  /** Whether SMTP is configured (non-empty host). */
  enabled: boolean
  host: string
  port: number
  username: string
  from: string
  /** "starttls" | "tls" | "none" */
  encryption: string
  /** The password is never returned — only whether one is set. */
  passwordSet: boolean
  sources: SmtpSettingsSources
}

export interface UpdateSmtpSettings {
  host?: string
  port?: number
  username?: string
  /** Omit or leave blank to keep the existing password unchanged. */
  password?: string
  from?: string
  encryption?: string
}

export interface WorkspaceSummary {
  id: string
  name: string
  slug: string
  publishTitle: string
  role: string
  documentCount: number
  storageBudgetBytes: number
  storageUsedBytes: number
}

export interface DocumentListItem {
  id: string
  relativePath: string
  title: string
  isPublished: boolean
  contentHash: string
  updatedClock: number
  versionId: string | null
}

export interface FolderListItem {
  id: string
  relativePath: string
  updatedClock: number
}

export interface CloudDocument {
  relativePath: string
  title: string
  isPublished: boolean
  content: string
  contentHash: string
  versionId: string
  updatedClock: number
}

export interface DocumentVersion {
  id: string
  parentVersionId: string | null
  source: string
  contentHash: string
  content: string
  createdAt: string
  authorUsername?: string | null
}

export interface CardComment {
  id: string
  documentId: string
  authorUserId: string
  author: string | null
  body: string
  createdAt: string
  updatedAt: string
}

export interface Webhook {
  id: string
  boardRef?: string | null
  name: string
  targetUrl: string
  eventTypes: string[]
  enabled: boolean
  secretMasked: string
  lastDeliveryAt?: string | null
  lastStatus?: string | null
  createdAt: string
}
export interface WebhookCreated extends Webhook {
  secret: string
}

export interface Ticket {
  documentId: string
  relativePath: string | null
  ticketKey: string
  number: number
  ticket: string
}
export interface BrowseResult {
  workspaceId: string
  documentId: string
  relativePath: string
  ticket: string
}

export interface TrashItem {
  id: string
  documentId: string
  relativePath: string
  title: string
  contentHash: string
  deletedByUserId: string
  deletedAt: string
  expiresAt: string
}

export interface DomainResponse {
  id: string
  domain: string
  workspaceId: string | null
  workspaceName: string | null
  verificationToken: string
  dnsTxtRecord: string
  status: string
  verifiedAt: string | null
  sslStatus: string | null
  sslExpiresAt: string | null
}

export interface SyncConflictItem {
  conflictId: string
  relativePath: string
  localContent: string
  cloudContent: string
  baseContent?: string
  conflictRanges?: string
}

export interface SaveDocumentRequest {
  relativePath: string
  title?: string
  content: string
  baseContentHash?: string
  baseContent?: string
}

export interface PublishDocumentResponse {
  documentId: string
  relativePath: string
  title: string
  contentHash: string
  publishedAt: string
  isPublished: boolean
}

export interface PublishStatusResponse {
  documentId: string
  isPublished: boolean
  publishedAt: string | null
  currentHash: string
  publishedHash: string | null
  hasUnpublishedChanges: boolean
}

export interface AssetResponse {
  id: string
  url: string
  contentType: string
  byteSize: number
  originalName: string | null
  createdAt: string
}

/** One entry in the server blob manifest (GET /blobs). Mirrors the desktop
 * `BlobManifestEntry` in src/lib/types.ts. */
export interface BlobManifestEntry {
  relativePath: string
  sha256: string
  byteSize: number
  contentType: string
  updatedClock: number
  deletedClock: number | null
}

export interface BlobUploadResponse {
  relativePath: string
  sha256: string
  byteSize: number
  updatedClock: number
}

// ── Themes & site settings (mirror services/jtype-web/src/themes) ──────────────
export type ThemeLayout = 'sidebar' | 'header' | 'minimal'
export type ThemeAppearance = 'light' | 'dark'
export type ThemeDensity = 'compact' | 'cozy' | 'comfortable'

export interface ThemePalette {
  bg: string
  surface: string
  fg: string
  muted: string
  accent: string
  accentContrast: string
  border: string
  codeBg: string
  codeFg: string
  appearance: ThemeAppearance
}

export interface ThemeTypography {
  bodyFont: string
  headingFont: string
  monoFont: string
  baseSize: number
  contentWidth: number
  lineHeight: number
  headingWeight: number
  letterSpacing: number
}

export interface ThemeShape {
  radius: number
  borderWidth: number
  density: ThemeDensity
  sidebarWidth: number
}

export interface ThemeSpec {
  id: string
  name: string
  description: string
  layout: ThemeLayout
  palette: ThemePalette
  typography: ThemeTypography
  shape: ThemeShape
  customCss: string
}

export interface ThemeInfo {
  id: string
  name: string
  description: string
  layout: ThemeLayout
  appearance: ThemeAppearance
  swatch: { bg: string; fg: string; accent: string; surface: string }
}

export interface SiteSettings {
  id: string
  workspaceId: string
  name: string
  footerHtml: string | null
  theme: string
  customTheme?: ThemeSpec | null
  createdAt: string
  updatedAt: string
}

export interface UpdateSiteSettings {
  name?: string
  footerHtml?: string
  theme?: string
  customTheme?: ThemeSpec | null
}

export interface SaveDocumentResponse {
  relativePath: string
  contentHash: string
  updatedClock: number
  mergeStatus: 'accepted' | 'merged' | 'unchanged'
}

export interface MemberInfo {
  userId: string
  username: string
  role: string
  status: string
  joinedAt: string | null
}

export interface InviteResponse {
  inviteId: string
  workspaceId: string
  role: string
  inviteToken: string
}

export interface InviteListItem {
  inviteId: string
  email: string | null
  role: string
  status: string
  createdAt: string
}

export interface InvitePreview {
  workspaceName: string
  invitedByUsername: string
  role: string
  status: 'pending' | 'accepted' | 'revoked'
}
