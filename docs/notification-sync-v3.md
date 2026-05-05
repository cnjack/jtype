# Notification-Based Sync Architecture (v3)

> Status: **Proposal v3**
> Author: Architecture
> Date: 2026-05-05

---

## 0. 设计哲学

**核心原则**: Cloud 是唯一权威数据源（single source of truth）。所有客户端（Desktop App、Web Browser）是 **replicator**——维护本地副本，通过 push/pull/notify 保持一致。

**v2 的不足**: v2 聚焦于统一 WebSocket 协议和实时通知，但没有深入解决：
1. 客户端离线时如何缓存变更并在重连后正确合并
2. Web 端完全没有离线支持
3. 多源并发变更的因果顺序（causal ordering）和冲突分类不够完整
4. 复杂场景（离线创建→删除→重建同名文件 + cloud 同时操作）缺乏明确策略

**v3 核心思路**:

```
Client (Desktop/Web)
   │
   ├─ Online:  action → Cloud API → ack → update local replica
   │                        │
   │                        └─→ Broadcast to other clients via WebSocket
   │
   └─ Offline: action → write to local replica → queue for reconciliation
                                                      │
                                                      └─→ On reconnect: reconcile(local, cloud)
```

**关键设计决策**:
1. **Desktop = Hybrid**: Online 时 cloud-first（写完立即推送到 cloud），Offline 时 local-first（写入本地磁盘，重连后协调）
2. **Web = Cloud-first + 离线兜底**: Online 通过 WebSocket/REST 直接保存到 cloud，Offline 缓存到 IndexedDB
3. **最终状态同步**: 重连后只比对最终状态，不追踪操作历史（simpler, less storage）
4. **Keep both + 人工解决**: 无法自动合并的冲突保留双方版本，交给用户决定
5. **Rename = delete + create**: 不追踪重命名操作，降低同步复杂度

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cloud (Axum Service)                        │
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌────────────────┐                │
│  │ REST API │    │ WS Hub   │    │ MySQL          │                │
│  │ push/pull│◄──►│ broadcast│◄──►│ docs, versions │                │
│  │ save/del │    │ per-ws   │    │ conflicts, etc │                │
│  └────┬─────┘    └────┬─────┘    └────────────────┘                │
│       │               │                                             │
└───────┼───────────────┼─────────────────────────────────────────────┘
        │               │
  ┌─────┴─────┐   ┌─────┴─────┐
  │ HTTP Req  │   │ WebSocket │
  │ (push/    │   │ (notify + │
  │  pull)    │   │  WS save) │
  └─────┬─────┘   └─────┬─────┘
        │               │
   ┌────┴────┐     ┌────┴────┐
   │Desktop  │     │ Web     │
   │App      │     │ Browser │
   │         │     │         │
   │Filesystem│    │IndexedDB│
   │(local   │     │(offline │
   │ replica)│     │ cache)  │
   └─────────┘     └─────────┘
```

### 核心流

```
1. Action Flow:    Client ──action──▶ Cloud API ──ack──▶ Client
2. Notify Flow:    Cloud API ──event──▶ WebSocket Hub ──broadcast──▶ All Other Clients
3. React Flow:     Client receives event ──▶ Desktop: pull file / Web: fetch latest
4. Offline Flow:   Client ──action──▶ Local Replica ──(queued)──▶ Reconcile on reconnect
```

---

## 2. 客户端状态机

每个客户端维护一个三态状态机：

```
                ┌──────────┐
        ┌──────▶│  ONLINE  │◀──────┐
        │       └────┬─────┘       │
        │            │ network     │ reconciliation
        │            │ lost        │ complete
        │            ▼             │
        │       ┌──────────┐       │
        │       │ OFFLINE  │       │
        │       └────┬─────┘       │
        │            │ network     │
        │            │ restored    │
        │            ▼             │
        │     ┌──────────────┐     │
        └─────│ RECONCILING  │─────┘
              └──────────────┘
```

### 各状态行为

| State | Desktop | Web |
|-------|---------|-----|
| **ONLINE** | 每次保存立即推送 cloud + 接收 WS 通知 | WS 保存 + 实时接收通知 |
| **OFFLINE** | 写入本地磁盘，变更自然积累 | 保存到 IndexedDB，记录 pending mutation |
| **RECONCILING** | pull → 比对 → merge/conflict → push | pull → 比对 → merge/conflict → push |

### 状态切换触发

| Transition | Trigger |
|------------|---------|
| ONLINE → OFFLINE | WebSocket 断开 + HTTP 请求失败 |
| OFFLINE → RECONCILING | WebSocket 重连成功 或 HTTP 请求恢复 |
| RECONCILING → ONLINE | 所有 pending 变更已推送，conflicts 已记录 |
| RECONCILING → OFFLINE | 协调过程中网络再次断开 → 保留 pending 状态，下次继续 |

---

## 3. Online Flow（稳态）

### 3.1 Desktop Online Save

```
User saves file
  │
  ├─ 1. Write to disk (immediate, fast UX)
  │
  ├─ 2. Async: push single doc to cloud
  │     POST /api/v1/workspaces/:id/sync/push
  │     body: { documents: [{ relativePath, content, baseContentHash, baseContent }] }
  │
  ├─ 3. Cloud processes:
  │     ├─ base matches → accept
  │     ├─ base differs, merge succeeds → return merged content
  │     └─ base differs, merge fails → return conflict
  │
  ├─ 4. On success:
  │     ├─ Update sync base to cloud's version
  │     ├─ If merged: overwrite local file with merged content
  │     └─ Cloud broadcasts document:changed to all WS clients
  │
  └─ 5. On failure (network error):
        └─ File is already saved locally → enters implicit "pending" state
           (sync base ≠ local content → next sync will detect and push)
```

**重要**: Desktop 不需要显式的 "pending queue"。因为本地文件系统就是 queue——任何 local content ≠ sync base 的文件在下次同步时都会被推送。

### 3.2 Web Online Save

```
User saves document
  │
  ├─ WebSocket connected?
  │     ├─ YES: send document:save via WS → wait for ack
  │     │       ├─ ack ok → update local state + contentHash
  │     │       └─ ack conflict → show conflict UI
  │     │
  │     └─ NO: REST PUT /api/v1/workspaces/:id/documents (fallback)
  │
  └─ Cloud broadcasts document:changed to other clients
```

### 3.3 Notification Flow (Cloud → Clients)

当 Cloud 接受写入后：

```
Cloud writes to DB
  │
  ├─ Increment workspace clock
  │
  └─ Publish to NotificationHub
        │
        ├──▶ WebSocket Client A (Desktop)
        │     └─ Tauri event → React → trigger targeted pull for changed path
        │        └─ If local file unchanged since last sync → overwrite
        │        └─ If local file modified → show "remote change" indicator, don't overwrite
        │
        ├──▶ WebSocket Client B (Web Tab 1, the saver)
        │     └─ sourceSessionId matches → ignore (self-echo)
        │
        └──▶ WebSocket Client C (Web Tab 2)
              └─ Refresh document list
              └─ If viewing changed doc → stale warning UI
```

### 3.4 Desktop Targeted Pull

收到 `document:changed` 通知后，Desktop 不需要全量 pull，而是做**目标拉取**：

```typescript
// On receiving document:changed event for path "notes/hello.md"
async function onRemoteDocumentChanged(event: DocumentChangedEvent) {
  const localContent = await readFile(event.relativePath)
  const syncBase = await loadSyncBase(event.relativePath)

  if (localContent === syncBase) {
    // Local unchanged since last sync → safe to pull and overwrite
    const cloudDoc = await fetchDocument(workspaceId, event.relativePath)
    await writeFile(event.relativePath, cloudDoc.content)
    await saveSyncBase(event.relativePath, cloudDoc.content)
  } else {
    // Local has modifications → don't overwrite, mark as needs-merge
    showNotification(`"${event.relativePath}" was modified remotely. Sync to merge.`)
  }
}
```

---

## 4. Offline Flow

### 4.1 Desktop Offline

Desktop 离线时行为自然：用户继续编辑文件，保存到本地磁盘。**不需要额外的存储机制。**

```
Desktop offline:
  └─ 所有编辑写入本地文件系统（正常行为）
  └─ Sync base 保持上次 online 时的值
  └─ 本地变更 = diff(local filesystem, sync bases)
```

**数据完整性**:
- Sync bases (`.jtype/sync-base/`) 是离线期间检测变更的关键
- `lastPulledClock` 记录上次同步的 cloud 时钟位置

### 4.2 Web Offline

Web 离线时需要 IndexedDB 作为本地存储：

```
Web offline:
  └─ 保存到 IndexedDB documents_cache
  └─ 记录到 IndexedDB pending_saves
  └─ UI 显示 "已离线保存，重连后同步"
```

#### IndexedDB Schema

```typescript
// Object Store: documents_cache
// Key: [workspaceId, relativePath]
interface CachedDocument {
  workspaceId: string
  relativePath: string
  content: string
  contentHash: string       // hash of content
  title: string
  status: string
  cloudClock: number         // the cloud clock when this was last fetched
  locallyModified: boolean   // true if modified while offline
  baseContentHash: string    // hash when loaded from cloud (for merge)
  baseContent: string        // content when loaded from cloud (for merge)
  cachedAt: number           // timestamp
}

// Object Store: pending_saves
// Key: auto-increment
interface PendingSave {
  id: number                 // auto-increment
  workspaceId: string
  relativePath: string
  content: string
  baseContentHash: string    // hash when this doc was last fetched from cloud
  baseContent: string        // content when this doc was last fetched from cloud
  savedAt: number            // local timestamp
  status: 'pending' | 'pushing' | 'conflict'
}

// Object Store: sync_state
// Key: workspaceId
interface SyncState {
  workspaceId: string
  lastSyncedClock: number    // last known cloud clock
  lastOnlineAt: number       // timestamp of last successful cloud interaction
}
```

#### Web Offline Save Flow

```typescript
async function saveDocumentOffline(workspaceId: string, relativePath: string, content: string) {
  const db = await openDB('jtype-offline')

  // 1. Update documents_cache
  const existing = await db.get('documents_cache', [workspaceId, relativePath])
  await db.put('documents_cache', {
    workspaceId,
    relativePath,
    content,
    contentHash: await sha256(content),
    title: extractTitle(content),
    status: existing?.status ?? 'draft',
    cloudClock: existing?.cloudClock ?? 0,
    locallyModified: true,
    baseContentHash: existing?.baseContentHash ?? '',
    baseContent: existing?.baseContent ?? '',
    cachedAt: Date.now(),
  })

  // 2. Upsert pending_saves (collapse multiple edits to same path)
  const allPending = await db.getAll('pending_saves')
  const existingPending = allPending.find(
    p => p.workspaceId === workspaceId && p.relativePath === relativePath
  )
  if (existingPending) {
    existingPending.content = content
    existingPending.savedAt = Date.now()
    await db.put('pending_saves', existingPending)
  } else {
    await db.add('pending_saves', {
      workspaceId,
      relativePath,
      content,
      baseContentHash: existing?.baseContentHash ?? '',
      baseContent: existing?.baseContent ?? '',
      savedAt: Date.now(),
      status: 'pending',
    })
  }
}
```

**关键设计**: `pending_saves` 按 path 去重——同一文件多次离线编辑只保留最终版本（final-state-only 策略）。

### 4.3 Web Offline Delete

```typescript
async function deleteDocumentOffline(workspaceId: string, relativePath: string) {
  const db = await openDB('jtype-offline')

  // Remove from cache
  await db.delete('documents_cache', [workspaceId, relativePath])

  // Record as pending deletion (use special content marker)
  await db.add('pending_saves', {
    workspaceId,
    relativePath,
    content: '__DELETED__',  // sentinel value
    baseContentHash: '',
    baseContent: '',
    savedAt: Date.now(),
    status: 'pending',
  })
}
```

### 4.4 Web Offline Create

```typescript
async function createDocumentOffline(workspaceId: string, relativePath: string, content: string) {
  const db = await openDB('jtype-offline')

  await db.put('documents_cache', {
    workspaceId,
    relativePath,
    content,
    contentHash: await sha256(content),
    title: extractTitle(content),
    status: 'draft',
    cloudClock: 0,
    locallyModified: true,
    baseContentHash: '',  // empty = new file, no base
    baseContent: '',
    cachedAt: Date.now(),
  })

  await db.add('pending_saves', {
    workspaceId,
    relativePath,
    content,
    baseContentHash: '',  // no base = new file
    baseContent: '',
    savedAt: Date.now(),
    status: 'pending',
  })
}
```

---

## 5. 重连后协调算法（Reconciliation）

**核心步骤**: Pull → Classify → Merge/Conflict → Push

### 5.1 Desktop 协调流

```
Desktop reconnects
  │
  ├─ 1. PULL: fetch changes since lastPulledClock
  │     POST /sync/pull { sinceClock: lastPulledClock }
  │     → returns { documents: [...], deletedPaths: [...], conflicts: [...] }
  │
  ├─ 2. DETECT local changes:
  │     For each file on disk:
  │       localContent = readFile(path)
  │       baseContent = syncBase[path]
  │       if localContent ≠ baseContent → local modified
  │     For each syncBase that has no local file:
  │       → local deleted
  │     For each local file with no syncBase:
  │       → local created
  │
  ├─ 3. CLASSIFY each path (see §5.3 conflict matrix)
  │
  ├─ 4. APPLY cloud-only changes:
  │     Write cloud content to disk, update sync bases
  │
  ├─ 5. PUSH local-only changes:
  │     POST /sync/push with baseContentHash + baseContent
  │
  ├─ 6. HANDLE merge results:
  │     merged → overwrite local + update sync base
  │     conflict → save conflict record, notify user
  │
  └─ 7. UPDATE clock + sync bases
```

### 5.2 Web 协调流

```
Web reconnects (WebSocket opens)
  │
  ├─ 1. PULL: fetch changes since lastSyncedClock
  │     → Returns all cloud changes during offline period
  │
  ├─ 2. LOAD pending saves from IndexedDB
  │
  ├─ 3. CLASSIFY each path:
  │     For each pending save:
  │       Check if cloud also changed that path
  │       → cloud-only / local-only / both-changed
  │
  ├─ 4. APPLY cloud-only changes:
  │     Update documents_cache in IndexedDB
  │     Update UI to show latest cloud content
  │
  ├─ 5. PUSH local-only changes:
  │     Via WebSocket document:save (or REST fallback)
  │     With baseContentHash + baseContent for merge
  │
  ├─ 6. HANDLE conflicts:
  │     merged → update local cache
  │     conflict → show conflict resolution UI
  │
  ├─ 7. CLEAR processed pending_saves
  │
  └─ 8. UPDATE lastSyncedClock
```

### 5.3 冲突分类矩阵

对每个路径（`relativePath`），比对三个来源：

| # | Local State | Cloud State | Sync Base | Classification | Auto-Resolution |
|---|-------------|-------------|-----------|---------------|-----------------|
| 1 | Modified | Unchanged | Exists | **Local edit only** | Push local → cloud |
| 2 | Unchanged | Modified | Exists | **Cloud edit only** | Pull cloud → local |
| 3 | Modified | Modified | Exists | **Content conflict** | 3-way merge (see §6) |
| 4 | Created (new) | Not exists | N/A | **Local new file** | Push → cloud |
| 5 | Not exists | Created (new) | N/A | **Cloud new file** | Pull → local |
| 6 | Created (new) | Created (new) | N/A | **Create-create conflict** | Human resolve (§6.2) |
| 7 | Modified | Deleted | Exists | **Edit-delete conflict** | Human resolve (§6.3) |
| 8 | Deleted | Modified | Exists | **Delete-edit conflict** | Human resolve (§6.3) |
| 9 | Deleted | Deleted | Exists | **Both deleted** | Confirm deletion, no conflict |
| 10 | Deleted | Unchanged | Exists | **Local delete** | Push deletion → cloud |
| 11 | Unchanged | Deleted | Exists | **Cloud delete** | Apply deletion locally |
| 12 | Unchanged | Unchanged | Exists | **No change** | Skip |

**判定逻辑伪代码**:

```
function classifyPath(localContent, cloudContent, baseContent, localExists, cloudExists, baseExists):
  if baseExists:
    localChanged = localExists && localContent ≠ baseContent
    localDeleted = !localExists
    cloudChanged = cloudExists && cloudContent ≠ baseContent
    cloudDeleted = !cloudExists

    if localDeleted && cloudDeleted     → #9  BOTH_DELETED
    if localDeleted && cloudChanged     → #8  DELETE_EDIT_CONFLICT
    if localDeleted && !cloudChanged    → #10 LOCAL_DELETE
    if localChanged && cloudDeleted     → #7  EDIT_DELETE_CONFLICT
    if localChanged && cloudChanged     → #3  CONTENT_CONFLICT → try 3-way merge
    if localChanged && !cloudChanged    → #1  LOCAL_EDIT
    if !localChanged && cloudChanged    → #2  CLOUD_EDIT
    if !localChanged && cloudDeleted    → #11 CLOUD_DELETE
    else                                → #12 NO_CHANGE

  else:  // no base = at least one side is new
    if localExists && cloudExists       → #6  CREATE_CREATE_CONFLICT
    if localExists && !cloudExists      → #4  LOCAL_NEW
    if !localExists && cloudExists      → #5  CLOUD_NEW
    else                                → impossible
```

---

## 6. 冲突解决策略

### 6.1 Content Conflict（#3: 双方都编辑了同一文件）

**自动尝试 3-way merge** (已有实现):

```
base ──┬── local version
       └── cloud version
            │
       3-way merge
            │
       ┌────┴────┐
   Merge OK    Merge Fail
       │           │
   Push merged  Create conflict record
   content      ├─ Save both versions
                └─ Show conflict UI to user
```

3-way merge 使用 `baseContent` 作为公共祖先，对比 `localContent` 和 `cloudContent` 的 diff。
- 不同区域的修改 → 自动合并
- 同一区域的修改 → 冲突，交给用户

**用户解决选项**:
- `accept_local`: 使用本地版本
- `accept_cloud`: 使用云端版本
- `keep_both`: 保留两个文件（本地版本保存为 `filename.conflict.md`）
- `manual_merge`: 用户在 diff UI 中手动合并

### 6.2 Create-Create Conflict（#6: 双方都创建了同名文件）

无法自动合并——没有公共祖先（base）。

```
Local creates "notes/ideas.md" with content A
Cloud creates "notes/ideas.md" with content B (from another device/web)

Resolution:
  1. Both versions stored in sync_conflicts table
  2. UI shows:
     ┌────────────────────────────────────────────────┐
     │ ⚠ Conflict: "notes/ideas.md" was created on   │
     │   both your device and the cloud.              │
     │                                                │
     │ [Keep mine] [Keep cloud] [Keep both] [Merge]   │
     └────────────────────────────────────────────────┘
  3. "Keep both" → cloud version stays at original path,
     local version saved as "notes/ideas.conflict.md"
```

### 6.3 Edit-Delete Conflict（#7, #8: 一方编辑，另一方删除）

**策略: 优先保留数据**——编辑版本自动恢复，但标记为冲突让用户确认。

```
Case #7: Local edited, Cloud deleted
  → Keep local edited version
  → Push to cloud (re-create the file)
  → Notify user: "You edited X, but it was deleted from cloud. Your version has been kept."
  → User can choose to delete it if intended

Case #8: Local deleted, Cloud edited
  → Keep cloud edited version
  → Pull to local (re-create the file)
  → Notify user: "You deleted X, but it was edited from cloud. The cloud version has been restored."
  → User can choose to delete it if intended
```

**为什么优先保留数据**: 删除可以重新执行，但丢失的编辑无法恢复。

### 6.4 Conflict UI

#### Desktop

```
┌──────────────────────────────────────────────────────────────┐
│ 🔄 Sync Conflicts (3)                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ■ notes/ideas.md — Created on both sides                     │
│   [Keep mine] [Keep cloud] [Keep both] [View diff]           │
│                                                              │
│ ■ blog/draft.md — You edited, cloud deleted                  │
│   Your version has been kept. [Confirm keep] [Delete]        │
│                                                              │
│ ■ docs/api.md — Content conflict (auto-merge failed)         │
│   [Accept mine] [Accept cloud] [Manual merge]                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Web

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠ 3 sync conflicts need your attention                      │
│                                                              │
│ ┌─ notes/ideas.md ─────────────────────────────────────────┐ │
│ │ Created on both your browser and another device.         │ │
│ │ ┌──────────────┐  ┌──────────────┐                       │ │
│ │ │ Your version │  │Cloud version │                       │ │
│ │ │ (content A)  │  │(content B)   │                       │ │
│ │ └──────────────┘  └──────────────┘                       │ │
│ │ [Keep mine] [Keep cloud] [Keep both] [Merge manually]    │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. 边缘场景深入分析

### Scenario A: 离线创建→删除→重建同名文件 + Cloud 也删除

```
Timeline:
  t0: File "notes/A.md" exists on both local and cloud (synced, content = X)
  t1: App goes offline
  t2: App user deletes "notes/A.md"
  t3: App user creates new "notes/A.md" (content = Y, completely different)
  t4: Cloud user (via web) deletes "notes/A.md"
  t5: App reconnects

Analysis with final-state-only:
  - Sync base: "notes/A.md" = X (last synced at t0)
  - Local state: "notes/A.md" exists, content = Y
  - Cloud state: "notes/A.md" deleted

  Classification → #7 Edit-Delete Conflict
  (Local appears "modified" because content Y ≠ base X, cloud is deleted)

Resolution:
  → Auto-keep local version Y (data preservation principle)
  → Push content Y to cloud (re-creates the document)
  → Notify user: "You modified notes/A.md but it was deleted from cloud. Your version has been kept."

  This is correct behavior! The user created a new file at that path — keeping it is the right call.
```

### Scenario B: 离线创建→删除→重建 + Cloud 也重建

```
Timeline:
  t0: "notes/A.md" exists, synced (content = X)
  t1: App goes offline
  t2: App: delete A → create new A (content = Y)
  t3: Cloud: delete A → create new A (content = Z, from web or another device)
  t5: App reconnects

Analysis:
  - Sync base: "notes/A.md" = X
  - Local: "notes/A.md" = Y (content ≠ base)
  - Cloud: "notes/A.md" = Z (content ≠ base, exists)

  Classification → #3 Content Conflict
  (Both modified relative to base X)

Resolution:
  → 3-way merge(base=X, local=Y, cloud=Z)
  → If merge succeeds: push merged version
  → If merge fails: create conflict record, user resolves

  Edge case: if X, Y, Z are completely unrelated content (because both sides did delete+recreate),
  3-way merge will likely produce a conflict → correctly escalated to human.
```

### Scenario C: 离线创建全新文件 + Cloud 创建同名文件

```
Timeline:
  t0: "notes/A.md" does NOT exist anywhere
  t1: App goes offline
  t2: App creates "notes/A.md" (content = Y)
  t3: Cloud creates "notes/A.md" (content = Z, from web)
  t4: App reconnects

Analysis:
  - Sync base: none for "notes/A.md"
  - Local: exists (content = Y)
  - Cloud: exists (content = Z)

  Classification → #6 Create-Create Conflict
  (No base, both exist)

Resolution:
  → Cannot auto-merge (no common ancestor)
  → Create conflict record with both versions
  → User decides: keep mine / keep cloud / keep both / merge manually
```

### Scenario D: Desktop 离线编辑 + Web 离线编辑 + 同时重连

```
Timeline:
  t0: "docs/plan.md" synced (content = X)
  t1: Both Desktop and Web go offline
  t2: Desktop edits → content Y
  t3: Web edits → content Z
  t4: Desktop reconnects first, pushes Y → cloud now has Y
  t5: Web reconnects, has pending save Z

Analysis for Web at t5:
  - Web's base: X (when it loaded the doc)
  - Web's local: Z (pending save)
  - Cloud current: Y (pushed by Desktop)

  Classification → #3 Content Conflict

Resolution:
  → Server does 3-way merge(base=X, local=Z, cloud=Y)
  → If non-overlapping edits: auto-merge succeeds
  → If overlapping: conflict → human resolve
```

### Scenario E: Web 用户打开文件，离线，删除文件，Desktop 用户编辑同一文件

```
Timeline:
  t0: "blog/draft.md" synced (content = X)
  t1: Web goes offline
  t2: Web user deletes "blog/draft.md" (pending deletion in IndexedDB)
  t3: Desktop pushes edit → cloud has content Y
  t4: Web reconnects

Analysis:
  - Web's pending: delete "blog/draft.md"
  - Cloud: "blog/draft.md" = Y (modified since Web's last sync)
  - Web's base: X (cloud clock from when Web loaded it)

  Cloud clock for this doc has advanced → Web can detect cloud modification

  Classification → #8 Delete-Edit Conflict

Resolution:
  → Keep cloud version Y (preserve data)
  → Cancel Web's pending deletion
  → Notify Web user: "You deleted blog/draft.md, but it was edited by another user. The edited version has been restored."
```

### Scenario F: 大量离线变更 + Cloud 有大量变更

```
Desktop 离线 2 天，做了 50 个文件的修改。Cloud 上 Web 用户也做了 30 个修改。

Reconciliation 策略:
  1. Pull all changes since lastPulledClock → get 30 cloud changes
  2. Detect all 50 local changes (compare with sync bases)
  3. Classify each unique path:
     - Most will be non-overlapping → auto-resolve
     - Maybe 3-5 files have both-side changes → try merge
     - Maybe 1-2 unresolvable → conflict records
  4. Push all local-only changes in batch
  5. Report: "Synced 47 changes. 3 merged automatically. 2 conflicts need your attention."

Performance:
  - Pull is O(cloud changes since last clock) — efficient incremental
  - Local detection is O(files on disk) — scanning is fast
  - Push is batched — one HTTP request
  - Total: 2 HTTP requests + local scanning
```

### Scenario G: Web 用户多 tab 离线

```
Tab 1: editing "notes/a.md" → saves offline
Tab 2: editing "notes/a.md" → saves offline (different content)
Both tabs reconnect

Analysis:
  - IndexedDB pending_saves is shared across tabs
  - Due to "collapse by path" logic, only the LAST save wins
  - Tab 2 saved later → its content is in pending_saves
  - Tab 1's earlier save was overwritten in pending_saves

  This is correct behavior: final-state-only means last writer wins locally.
  Tab 1's user will see their content replaced when Tab 2's save was recorded.

  Improvement: use BroadcastChannel to notify Tab 1 that its content was superseded.
```

### Scenario H: 离线创建文件夹（多个新文件）

```
Desktop offline:
  Creates "projects/new-project/readme.md"
  Creates "projects/new-project/notes.md"
  Creates "projects/new-project/todo.md"

On reconnect:
  All 3 files have no sync base → all are "local new files" (#4)
  All pushed to cloud in batch
  No conflicts unless cloud also created files at these exact paths
```

---

## 8. WebSocket 通知协议

复用 v2 设计的核心，简化为以下消息类型：

### 8.1 Connection

```
GET /api/v1/workspaces/:workspace_id/live?token=<bearer>&clientType=web|desktop&deviceId=<id>
```

### 8.2 Server → Client Events

```typescript
// 连接确认
{ type: "connected", sessionId: string, workspaceClock: number }

// 文档变更（他人保存成功后广播）
{ type: "document:changed",
  sourceSessionId: string,
  relativePath: string,
  contentHash: string,
  updatedClock: number,
  editedBy: string,
  source: "web" | "desktop" }

// 文档删除
{ type: "document:deleted",
  sourceSessionId: string,
  relativePath: string,
  deletedClock: number }

// 文档回收站操作
{ type: "document:trashed",
  sourceSessionId: string,
  relativePath: string,
  action: "trashed" | "restored" }

// 新冲突产生
{ type: "conflict:created",
  conflictId: string,
  relativePath: string }

// 冲突已解决
{ type: "conflict:resolved",
  conflictId: string,
  relativePath: string }

// 客户端落后太多，需要全量 pull
{ type: "sync:required", reason: "lagged" | "reconnect" }

// WebSocket save 的 ack
{ type: "ack", ref: string, ok: boolean, error?: string, document?: CloudDocument }

// Pong
{ type: "pong" }
```

### 8.3 Client → Server Messages

```typescript
// Web 保存文档
{ type: "document:save", ref: string,
  relativePath: string, content: string,
  title?: string,
  baseContentHash?: string, baseContent?: string }

// Web 删除文档
{ type: "document:delete", ref: string, relativePath: string }

// Web 回收站操作
{ type: "document:trash", ref: string,
  relativePath: string, action: "trash" | "restore" }

// 心跳
{ type: "ping" }
```

### 8.4 自回显过滤

服务端在广播时附带 `sourceSessionId`。客户端比对自己的 `sessionId` 过滤。

Desktop 通过 REST push 产生的事件没有 WS session，`sourceSessionId` 为空。Desktop WS 客户端通过 `source: "desktop"` + `deviceId` 判断是否是自己的回声。

---

## 9. Desktop App 架构变更

### 9.1 Eager Push（Online 时即时推送）

当前: 依赖 periodic sync（每 N 分钟同步一次）。
改为: 每次保存后尝试立即推送到 cloud。

```typescript
// src/hooks/useEagerSync.ts
export function useEagerSync() {
  const { syncToken, workspace, cloudProfile, vaultBindings } = useAppState()

  const pushSingleDocument = useCallback(async (relativePath: string, content: string) => {
    const binding = currentVaultBinding(vaultBindings, workspace?.rootPath)
    if (!binding || !syncToken) return

    const syncBase = await tauri.loadSyncBase(workspace.rootPath, relativePath)
    const baseHash = syncBase ? await sha256Hex(syncBase) : undefined

    try {
      const response = await fetch(`${serverUrl}/api/v1/workspaces/${binding.workspaceId}/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${syncToken}` },
        body: JSON.stringify({
          deviceId: cloudProfile.deviceId,
          documents: [{
            relativePath,
            title: extractTitle(content),
            status: inferStatus(content),
            content,
            baseContentHash: baseHash,
            baseContent: syncBase,
          }],
          deletedPaths: [],
          trashOperations: [],
        }),
      })

      if (response.ok) {
        const result = await response.json()
        // Update sync base to cloud's version
        if (result.documents?.[0]) {
          await tauri.saveSyncBases(workspace.rootPath, [{
            relativePath,
            content: result.documents[0].content,
          }])
        }
        // Handle conflicts if any
        if (result.conflicts?.length > 0) {
          dispatch({ type: 'SET_CONFLICTS', conflicts: result.conflicts })
        }
      }
    } catch {
      // Network error — file is already saved locally
      // Will be picked up by next full sync or reconciliation
    }
  }, [syncToken, workspace, cloudProfile, vaultBindings])

  return { pushSingleDocument }
}
```

### 9.2 WebSocket Client（接收通知）

复用 v2 设计。`tokio-tungstenite` 连接 `/live` endpoint。收到 `document:changed` → emit Tauri event → React 执行 targeted pull。

### 9.3 Periodic Sync 调整

```
WebSocket connected:   periodic sync every 5 min (safety net for missed events)
WebSocket disconnected: periodic sync every 30 sec (aggressive fallback)
```

Periodic sync 作为 "catch-all safety net"。即使 eager push + WebSocket 都工作正常，periodic sync 确保没有遗漏。

### 9.4 连接状态感知

```typescript
// Desktop React state
interface SyncConnectionState {
  wsConnected: boolean        // WebSocket to cloud
  lastPushAt: number | null   // last successful push timestamp
  lastPullAt: number | null   // last successful pull timestamp
  pendingPaths: string[]      // paths that failed to push (will retry on next sync)
}
```

---

## 10. Web Frontend 架构变更

### 10.1 Offline-Capable Architecture

```
┌─ Web App ──────────────────────────────────────────────┐
│                                                        │
│  React State (in-memory)                               │
│    ├─ currentDocument                                  │
│    ├─ documentList                                     │
│    └─ connectionStatus                                 │
│                                                        │
│  useWorkspaceSocket() ── WebSocket ──→ Cloud           │
│  useOfflineSync() ────── IndexedDB ──→ Local Cache     │
│                                                        │
│  saveDocument()                                        │
│    ├─ online? → WS save → update cache on ack         │
│    └─ offline? → IndexedDB save → pending queue        │
│                                                        │
│  On reconnect:                                         │
│    reconcileOfflineChanges()                            │
│      ├─ pull cloud changes                             │
│      ├─ compare with pending_saves                     │
│      ├─ push non-conflicting                           │
│      └─ flag conflicts for UI                          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 10.2 `useOfflineSync` Hook

```typescript
// services/jtype-web/frontend/src/hooks/useOfflineSync.ts

export function useOfflineSync(workspaceId: string | undefined) {
  const [hasPendingSaves, setHasPendingSaves] = useState(false)
  const [reconciling, setReconciling] = useState(false)

  // Check for pending saves on mount
  useEffect(() => {
    if (!workspaceId) return
    checkPendingSaves(workspaceId).then(setHasPendingSaves)
  }, [workspaceId])

  // Save offline
  const saveOffline = useCallback(async (
    relativePath: string,
    content: string,
    baseContentHash: string,
    baseContent: string,
  ) => {
    await saveDocumentOffline(workspaceId!, relativePath, content, baseContentHash, baseContent)
    setHasPendingSaves(true)
  }, [workspaceId])

  // Reconcile when coming back online
  const reconcile = useCallback(async (token: string) => {
    if (!workspaceId || reconciling) return
    setReconciling(true)
    try {
      const result = await reconcileOfflineChanges(workspaceId, token)
      setHasPendingSaves(false)
      return result // { pushed, conflicts, errors }
    } finally {
      setReconciling(false)
    }
  }, [workspaceId, reconciling])

  return { hasPendingSaves, reconciling, saveOffline, reconcile }
}

async function reconcileOfflineChanges(workspaceId: string, token: string) {
  const db = await openDB('jtype-offline')
  const pending = await db.getAll('pending_saves')
  const myPending = pending.filter(p => p.workspaceId === workspaceId && p.status === 'pending')

  if (myPending.length === 0) return { pushed: 0, conflicts: 0, errors: 0 }

  // 1. Pull current cloud state
  const syncState = await db.get('sync_state', workspaceId)
  const pullResponse = await fetch(`/api/v1/workspaces/${workspaceId}/sync/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sinceClock: syncState?.lastSyncedClock ?? 0 }),
  })
  const pullData = await pullResponse.json()
  const cloudChanges = new Map(
    pullData.documents.map((d: any) => [d.relativePath, d])
  )
  const cloudDeleted = new Set(
    (pullData.deletedPaths ?? []).map((d: any) => d.relativePath)
  )

  let pushed = 0, conflicts = 0, errors = 0

  // 2. Process each pending save
  for (const save of myPending) {
    const cloudDoc = cloudChanges.get(save.relativePath)
    const isCloudDeleted = cloudDeleted.has(save.relativePath)
    const isLocalDeleted = save.content === '__DELETED__'

    try {
      if (isLocalDeleted && isCloudDeleted) {
        // Both deleted → no conflict, just acknowledge
        pushed++
      } else if (isLocalDeleted && cloudDoc) {
        // Local deleted, cloud modified → delete-edit conflict
        conflicts++
        // Keep cloud version, notify user
      } else if (!isLocalDeleted && isCloudDeleted) {
        // Local modified, cloud deleted → edit-delete conflict
        // Push local version to re-create on cloud
        await pushSingleSave(workspaceId, save, token)
        pushed++
        // Notify user about the conflict
      } else if (cloudDoc && save.baseContentHash &&
                 cloudDoc.contentHash !== save.baseContentHash) {
        // Both modified → push with base for 3-way merge
        const response = await pushSingleSave(workspaceId, save, token)
        if (response.conflicts?.length > 0) {
          conflicts++
        } else {
          pushed++
        }
      } else {
        // Local-only change → push directly
        await pushSingleSave(workspaceId, save, token)
        pushed++
      }

      // Remove from pending
      await db.delete('pending_saves', save.id)
    } catch (e) {
      errors++
    }
  }

  // 3. Apply cloud-only changes to cache
  for (const [path, doc] of cloudChanges) {
    const hasPending = myPending.some(p => p.relativePath === path)
    if (!hasPending) {
      await db.put('documents_cache', {
        workspaceId,
        relativePath: path,
        content: doc.content,
        contentHash: doc.contentHash,
        title: doc.title,
        status: doc.status,
        cloudClock: doc.updatedClock,
        locallyModified: false,
        baseContentHash: doc.contentHash,
        baseContent: doc.content,
        cachedAt: Date.now(),
      })
    }
  }

  // 4. Update sync clock
  const maxClock = Math.max(
    ...pullData.documents.map((d: any) => d.updatedClock),
    ...(pullData.deletedPaths ?? []).map((d: any) => d.deletedClock),
    syncState?.lastSyncedClock ?? 0
  )
  await db.put('sync_state', {
    workspaceId,
    lastSyncedClock: maxClock,
    lastOnlineAt: Date.now(),
  })

  return { pushed, conflicts, errors }
}
```

### 10.3 Integrated Save Function

```typescript
// In Workspace.tsx or a save hook
async function saveDocument(relativePath: string, content: string) {
  const { status, request } = useWorkspaceSocket(workspaceId)
  const { saveOffline } = useOfflineSync(workspaceId)

  if (status === 'connected') {
    // ONLINE: save via WebSocket
    try {
      const ack = await request({
        type: 'document:save',
        relativePath,
        content,
        title: extractTitle(content),
        baseContentHash: loadedContentHash,
        baseContent: loadedContent,
      })
      if (ack.ok && ack.document) {
        // Update local state
        setLoadedContentHash(ack.document.contentHash)
        setLoadedContent(content)
        // Update IndexedDB cache (for future offline use)
        updateDocumentCache(workspaceId, relativePath, content, ack.document.contentHash)
      }
      return ack
    } catch (e) {
      // WS send failed → fall through to offline save
    }
  }

  // OFFLINE: save to IndexedDB
  await saveOffline(relativePath, content, loadedContentHash, loadedContent)
  showToast('Saved offline. Will sync when reconnected.')
}
```

### 10.4 Connection Status Bar

```
┌──────────────────────────────────────────────────────┐
│ ● Online — Connected to cloud                        │  (green dot)
│ ● Offline — Changes saved locally                    │  (red dot)
│ ● Syncing — Reconciling offline changes (3/7)...     │  (yellow dot, progress)
│ ● Conflicts — 2 conflicts need your attention        │  (orange dot)
└──────────────────────────────────────────────────────┘
```

---

## 11. 数据模型变更

### 11.1 Server (MySQL)

**无需新增表**。现有 schema 已足够：
- `documents` + `updated_clock` → 增量 pull
- `document_versions` → 历史追踪
- `sync_conflicts` → 冲突记录
- `workspace_sync_cursors` → 设备同步进度
- `document_trash` + `trash_events` → 回收站同步

**需要确保**:
1. REST `sync/push` 和 WebSocket `document:save` 共享同一个 `save_document_version()` 逻辑
2. 两种保存路径都 increment `updated_clock`
3. 两种保存路径都向 `NotificationHub` 发布事件

### 11.2 Server 新增: `NotificationHub`

与 v2 设计相同。`tokio::sync::broadcast` per workspace。

### 11.3 Web Frontend (IndexedDB)

新增 IndexedDB stores: `documents_cache`, `pending_saves`, `sync_state`（详见 §4.2）。

---

## 12. 安全考量

### 12.1 WebSocket Auth

- Token 在 query param 中传递（浏览器 WebSocket API 限制）
- 生产环境必须使用 WSS (TLS) 防止 token 泄露
- 可选: ticket-based auth（一次性 30s token 交换）减少长期 token 暴露

### 12.2 IndexedDB 安全

- IndexedDB 数据是 per-origin isolated（浏览器沙箱）
- 敏感内容不需要额外加密（与 localStorage 同级安全）
- Tab 关闭后数据持久化（这是期望行为，用于离线支持）
- 清除浏览器数据会丢失未同步的离线编辑 → **需要在 UI 中提示用户**

### 12.3 Conflict 数据隔离

- Sync conflicts 按 workspace 隔离
- 用户只能看到自己有权限的 workspace 的 conflicts
- Conflict 解决操作检查 workspace role（至少 editor）

### 12.4 Rate Limiting

与 v2 相同:
- WebSocket: 60 msg/min per connection
- `document:save`: max 256 KB
- 每用户最多 10 个 WebSocket 连接

---

## 13. 实现计划

### Phase 1: Server-Side NotificationHub + WebSocket Handler

| Step | Task | Effort | Notes |
|------|------|--------|-------|
| 1.1 | Create `NotificationHub` (`src/hub.rs`) | S | In-memory broadcast per workspace |
| 1.2 | Add `hub` to `AppState`, cleanup task | S | |
| 1.3 | WebSocket handler with save/delete/trash support | L | Reuse `save_document_version()` |
| 1.4 | Publish events from REST `sync/push` to Hub | M | After push handler success |
| 1.5 | Publish events from REST document save to Hub | S | After PUT handler success |

### Phase 2: Web Real-Time (Online)

| Step | Task | Effort | Notes |
|------|------|--------|-------|
| 2.1 | `useWorkspaceSocket` hook (WS connect, request/subscribe) | M | |
| 2.2 | Refactor `Workspace.tsx` save to use WS with REST fallback | M | |
| 2.3 | Live event handling (doc list refresh, stale warning) | M | |
| 2.4 | Connection status indicator | S | |

### Phase 3: Web Offline Support

| Step | Task | Effort | Notes |
|------|------|--------|-------|
| 3.1 | IndexedDB setup (`documents_cache`, `pending_saves`, `sync_state`) | M | |
| 3.2 | Offline save/delete/create functions | M | |
| 3.3 | `useOfflineSync` hook with reconciliation | L | Core complexity |
| 3.4 | Integrated save function (online/offline branching) | M | |
| 3.5 | Reconciliation UI (progress, conflict list) | M | |
| 3.6 | "Pending offline saves" indicator + clear-data warning | S | |

### Phase 4: Desktop Real-Time + Eager Push

| Step | Task | Effort | Notes |
|------|------|--------|-------|
| 4.1 | Add `tokio-tungstenite` to Tauri | S | |
| 4.2 | WS client in Rust backend | M | |
| 4.3 | Tauri events → React (trigger targeted pull) | S | |
| 4.4 | Eager push on save (`useEagerSync` hook) | M | |
| 4.5 | Adjust `usePeriodicSync` based on WS state | S | |

### Phase 5: Enhanced Conflict Resolution

| Step | Task | Effort | Notes |
|------|------|--------|-------|
| 5.1 | Classify edit-delete / delete-edit conflicts | M | Server + client |
| 5.2 | Create-create conflict handling | M | |
| 5.3 | Conflict resolution UI (Desktop) | M | |
| 5.4 | Conflict resolution UI (Web) | M | |
| 5.5 | "Keep both" → rename second file | S | Existing logic |

---

## 14. 降级与容错

| Scenario | Behavior |
|----------|----------|
| WS 连不上 (Web) | Fallback REST save + 10s polling |
| WS 断线中 (Web) | 自动重连 (1→2→4→...→60s backoff)，切换到 offline mode |
| WS 连不上 (Desktop) | Periodic sync 30s interval |
| 推送失败 (Desktop eager push) | 文件已在本地，下次 periodic sync 会推送 |
| IndexedDB 不可用 (Web) | Fallback 到纯 online mode，不支持离线 |
| Cloud 重启 | 所有 WS 断开，客户端重连后 pull catch up |
| 客户端清除浏览器数据 | 丢失未同步的 pending saves → 已知风险，需提示用户 |
| Token 过期 | Server 关闭 WS (code 4001)，客户端重新认证 |
| 超大文件离线编辑 | IndexedDB 有 storage quota → 需要 try-catch 并提示 |

---

## 15. 与 v2 设计的对比

| Aspect | v2 | v3 |
|--------|----|----|
| Web offline | 不支持 | **IndexedDB 完整离线编辑** |
| Desktop online push | Periodic only | **Eager push + periodic safety net** |
| Conflict types | Content merge only | **Content + create-create + edit-delete** |
| Reconciliation | 未详细设计 | **完整的 5.3 矩阵 + 算法** |
| Edge case analysis | 无 | **8 个详细场景** |
| WebSocket protocol | 同 | 同（复用 v2） |
| Desktop WS client | 同 | 同（复用 v2） |
| NotificationHub | 同 | 同（复用 v2） |

---

## Appendix A: File Changes Summary

| File | Change |
|------|--------|
| `services/jtype-web/Cargo.toml` | Add `futures`, enable `axum/ws` |
| `services/jtype-web/src/hub.rs` | **New** — `NotificationHub` |
| `services/jtype-web/src/handlers/live.rs` | **New** — WebSocket handler |
| `services/jtype-web/src/handlers/sync.rs` | Publish events to Hub after push |
| `services/jtype-web/src/handlers/document.rs` | Publish events to Hub after save |
| `services/jtype-web/src/lib.rs` | Add `hub` module, extend `AppState`, add WS route |
| `services/jtype-web/frontend/src/hooks/useWorkspaceSocket.ts` | **New** — WebSocket hook |
| `services/jtype-web/frontend/src/hooks/useOfflineSync.ts` | **New** — IndexedDB offline sync |
| `services/jtype-web/frontend/src/lib/offlineDb.ts` | **New** — IndexedDB setup & helpers |
| `services/jtype-web/frontend/src/pages/Workspace.tsx` | Integrate WS save + offline |
| `src-tauri/Cargo.toml` | Add `tokio-tungstenite` |
| `src-tauri/src/ws_client.rs` | **New** — Desktop WS client |
| `src-tauri/src/lib.rs` | Start WS listener |
| `src/hooks/useEagerSync.ts` | **New** — Immediate push on save |
| `src/hooks/usePeriodicSync.ts` | Adjust interval based on WS state |

## Appendix B: Sequence Diagram — Full Reconciliation

```
Desktop (offline since clock=50)           Cloud (clock=65)

  │                                           │
  │─── RECONNECT (WS opens) ────────────────▶│
  │                                           │
  │◀── connected { clock: 65 } ──────────────│
  │                                           │
  │─── POST /sync/pull { sinceClock: 50 } ──▶│
  │                                           │──▶ Query docs where clock > 50
  │◀── { documents: [15 changes],            │     Query deleted where clock > 50
  │      deletedPaths: [2 deletions] }        │
  │                                           │
  │                                           │
  │  [LOCAL: detect changes vs sync bases]    │
  │  - 8 files modified                       │
  │  - 2 files deleted                        │
  │  - 3 new files created                    │
  │                                           │
  │  [CLASSIFY each path]                     │
  │  - 10 local-only → will push             │
  │  - 12 cloud-only → apply locally          │
  │  - 3 both-changed → try merge             │
  │                                           │
  │  [APPLY cloud-only changes to disk]       │
  │                                           │
  │─── POST /sync/push {                     │
  │      documents: [10 local + 3 merge],    │
  │      deletedPaths: [2],                  │──▶ Process each:
  │      baseContentHash, baseContent }      │     - 10 accepted
  │                                           │     - 2 merged OK
  │◀── { accepted: 12,                      │     - 1 conflict
  │      documents: [...],                    │
  │      conflicts: [1] }                     │
  │                                           │
  │  [SAVE merged docs to disk + sync bases]  │
  │  [SHOW 1 conflict to user]               │──▶ Broadcast 12 document:changed events
  │                                           │     to other WS clients
  │  [UPDATE lastPulledClock = 65+]           │
  │                                           │
  └─── ONLINE ────────────────────────────────┘
```
