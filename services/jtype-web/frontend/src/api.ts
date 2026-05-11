import { httpRequest } from './lib/http'

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

// Auth
export const api = {
  register: (username: string, password: string, siteTitle?: string) =>
    request<AuthResponse>('/api/register', { method: 'POST', body: JSON.stringify({ username, password, siteTitle }) }),
  login: (username: string, password: string) =>
    request<AuthResponse>('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request<AuthResponse>('/api/me'),

  // Profile
  getProfile: () => request<ProfileResponse>('/api/me/profile'),
  updateProfile: (data: { displayName?: string; email?: string }) =>
    request<ProfileResponse>('/api/me/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updateSite: (data: { siteTitle?: string }) =>
    request<ProfileResponse>('/api/me/site', { method: 'PUT', body: JSON.stringify(data) }),
  getStorage: () => request<StorageUsageResponse>('/api/me/storage'),
  getDevices: () => request<DeviceInfo[]>('/api/me/devices'),

  // Admin
  adminUsers: () => request<AdminUser[]>('/api/admin/users'),
  adminGetUser: (id: string) => request<AdminUser>(`/api/admin/users/${id}`),
  adminUpdateUser: (id: string, data: { role?: string; enabled?: boolean; storageBudgetBytes?: number }) =>
    request<AdminUser>(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminWorkspaces: () => request<AdminWorkspace[]>('/api/admin/workspaces'),
  adminDomains: () => request<AdminDomain[]>('/api/admin/domains'),
  adminStats: () => request<AdminStats>('/api/admin/stats'),

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
  updateDocumentStatus: (workspaceId: string, docId: string, status: string) =>
    request<DocumentListItem>(`/api/v1/workspaces/${workspaceId}/documents/${docId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteDocument: (workspaceId: string, docId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/documents/${docId}`, { method: 'DELETE' }),
  saveDocument: (workspaceId: string, data: SaveDocumentRequest) =>
    request<SaveDocumentResponse>(`/api/v1/workspaces/${workspaceId}/documents/save`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listVersions: (workspaceId: string, docId: string) =>
    request<DocumentVersion[]>(`/api/v1/workspaces/${workspaceId}/documents/${docId}/versions`),
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
  status: string
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
  status: string
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
  status?: string
  content: string
  baseContentHash?: string
  baseContent?: string
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
