const DB_NAME = 'jtype-offline'
const DB_VERSION = 1

export interface CachedDocument {
  workspaceId: string
  relativePath: string
  content: string
  contentHash: string
  title: string
  cloudClock: number
  locallyModified: boolean
  baseContentHash: string
  baseContent: string
  cachedAt: number
}

export interface PendingSave {
  id?: number
  workspaceId: string
  relativePath: string
  content: string
  baseContentHash: string
  baseContent: string
  savedAt: number
}

export interface SyncState {
  workspaceId: string
  lastSyncedClock: number
  lastOnlineAt: number
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('documents_cache')) {
        db.createObjectStore('documents_cache', { keyPath: ['workspaceId', 'relativePath'] })
      }
      if (!db.objectStoreNames.contains('pending_saves')) {
        const ps = db.createObjectStore('pending_saves', { keyPath: 'id', autoIncrement: true })
        ps.createIndex('by_workspace_path', ['workspaceId', 'relativePath'], { unique: false })
      }
      if (!db.objectStoreNames.contains('sync_state')) {
        db.createObjectStore('sync_state', { keyPath: 'workspaceId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  return openDB().then(db => new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  }))
}

function idbPut(storeName: string, value: unknown): Promise<void> {
  return openDB().then(db => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

function idbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  return openDB().then(db => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

export function idbGetAll<T>(storeName: string, query?: IDBValidKey): Promise<T[]> {
  return openDB().then(db => new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    let req: IDBRequest
    if (query !== undefined && store.indexNames.contains('by_workspace_path')) {
      const idx = store.index('by_workspace_path')
      req = idx.getAll(query)
    } else {
      req = store.getAll()
    }
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  }))
}

export function idbClear(storeName: string): Promise<void> {
  return openDB().then(db => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

export async function findPendingSave(workspaceId: string, relativePath: string): Promise<PendingSave | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_saves', 'readonly')
    const store = tx.objectStore('pending_saves')
    const index = store.index('by_workspace_path')
    const req = index.get([workspaceId, relativePath])
    req.onsuccess = () => resolve(req.result as PendingSave | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function saveDocumentOffline(
  workspaceId: string,
  relativePath: string,
  content: string,
  baseContentHash: string,
  baseContent: string,
): Promise<void> {
  const hash = await sha256Hex(content)
  const now = Date.now()
  const cached: CachedDocument = {
    workspaceId,
    relativePath,
    content,
    contentHash: hash,
    title: '',
    cloudClock: 0,
    locallyModified: true,
    baseContentHash,
    baseContent,
    cachedAt: now,
  }
  await idbPut('documents_cache', cached)
  const existing = await findPendingSave(workspaceId, relativePath)
  if (existing && existing.id) {
    existing.content = content
    existing.baseContentHash = baseContentHash
    existing.baseContent = baseContent
    existing.savedAt = now
    await idbPut('pending_saves', existing)
  } else {
    await idbPut('pending_saves', { workspaceId, relativePath, content, baseContentHash, baseContent, savedAt: now })
  }
}

export async function deleteDocumentOffline(
  workspaceId: string,
  relativePath: string,
): Promise<void> {
  await idbDelete('documents_cache', [workspaceId, relativePath] as any)
  const now = Date.now()
  const existing = await findPendingSave(workspaceId, relativePath)
  if (existing && existing.id) {
    existing.content = '__DELETED__'
    existing.baseContentHash = ''
    existing.baseContent = ''
    existing.savedAt = now
    await idbPut('pending_saves', existing)
  } else {
    await idbPut('pending_saves', {
      workspaceId,
      relativePath,
      content: '__DELETED__',
      baseContentHash: '',
      baseContent: '',
      savedAt: now,
    })
  }
}

export async function getPendingSaves(workspaceId: string): Promise<PendingSave[]> {
  const db = await openDB()
  return new Promise<PendingSave[]>((resolve, reject) => {
    const tx = db.transaction('pending_saves', 'readonly')
    const store = tx.objectStore('pending_saves')
    const idx = store.index('by_workspace_path')
    const req = idx.getAll(IDBKeyRange.bound([workspaceId, ''], [workspaceId, '\uffff']))
    req.onsuccess = () => resolve(req.result as PendingSave[])
    req.onerror = () => reject(req.error)
  })
}

export async function clearPendingSave(id: number): Promise<void> {
  await idbDelete('pending_saves', id)
}

export async function getSyncState(workspaceId: string): Promise<SyncState | undefined> {
  return idbGet<SyncState>('sync_state', workspaceId)
}

export async function updateSyncState(workspaceId: string, clock: number): Promise<void> {
  await idbPut('sync_state', {
    workspaceId,
    lastSyncedClock: clock,
    lastOnlineAt: Date.now(),
  } as SyncState)
}

export async function getDocumentCache(workspaceId: string, relativePath: string): Promise<CachedDocument | undefined> {
  return idbGet<CachedDocument>('documents_cache', [workspaceId, relativePath] as any)
}

export async function updateDocumentCache(
  workspaceId: string,
  relativePath: string,
  content: string,
  contentHash: string,
  cloudClock: number,
): Promise<void> {
  const existing = await getDocumentCache(workspaceId, relativePath)
  await idbPut('documents_cache', {
    workspaceId,
    relativePath,
    content,
    contentHash,
    title: existing?.title ?? '',
    cloudClock,
    locallyModified: false,
    baseContentHash: contentHash,
    baseContent: content,
    cachedAt: Date.now(),
  })
}
