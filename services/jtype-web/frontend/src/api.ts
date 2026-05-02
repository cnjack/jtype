const API_BASE = ''

function getToken(): string {
  return localStorage.getItem('jtype.token') || ''
}

export function setToken(token: string) {
  localStorage.setItem('jtype.token', token)
}

export function clearToken() {
  localStorage.removeItem('jtype.token')
}

export function getStoredUsername(): string | null {
  return localStorage.getItem('jtype.username')
}

export function setStoredUsername(username: string) {
  localStorage.setItem('jtype.username', username)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  createWorkspace: (name: string) =>
    request<WorkspaceSummary>('/api/v1/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),
  getWorkspace: (id: string) => request<WorkspaceSummary>(`/api/v1/workspaces/${id}`),

  // Documents
  listDocuments: (workspaceId: string) =>
    request<DocumentListItem[]>(`/api/v1/workspaces/${workspaceId}/documents`),
  getDocument: (workspaceId: string, docId: string) =>
    request<CloudDocument>(`/api/v1/workspaces/${workspaceId}/documents/${docId}`),
  saveDocument: (workspaceId: string, data: { relativePath: string; content: string; title?: string }) =>
    request<CloudDocument>(`/api/v1/workspaces/${workspaceId}/documents`, { method: 'PUT', body: JSON.stringify(data) }),
  updateDocumentStatus: (workspaceId: string, docId: string, status: string) =>
    request<DocumentListItem>(`/api/v1/workspaces/${workspaceId}/documents/${docId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteDocument: (workspaceId: string, docId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/documents/${docId}`, { method: 'DELETE' }),
  listVersions: (workspaceId: string, docId: string) =>
    request<DocumentVersion[]>(`/api/v1/workspaces/${workspaceId}/documents/${docId}/versions`),

  // Device OAuth
  approveDevice: (userCode: string) =>
    request<void>('/api/oauth/device/approve', { method: 'POST', body: JSON.stringify({ userCode }) }),

  // Domains
  listDomains: () => request<DomainResponse[]>('/api/v1/domains'),
  addDomain: (domain: string) =>
    request<DomainResponse>('/api/v1/domains', { method: 'POST', body: JSON.stringify({ domain }) }),
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
  role: string
  documentCount: number
  storageBudgetBytes: number
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

export interface DomainResponse {
  id: string
  domain: string
  verificationToken: string
  dnsTxtRecord: string
  status: string
  verifiedAt: string | null
  sslStatus: string | null
  sslExpiresAt: string | null
}
