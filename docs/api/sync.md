# Sync Domain — REST API & WS Events

双向同步 (pull/push)、冲突检测与解决。Desktop 的核心数据通道。

---

## REST API

### `POST /api/v1/workspaces/:workspace_id/sync/pull`

增量拉取云端变更。

- **Auth**: bearer
- **Required role**: 任何活跃角色

**Request**:

```ts
{
  sinceClock?: number,              // 默认 0 (全量拉取)
  deviceId?: string,                // 用于更新 sync cursor
  sinceTrashEventClock?: number     // 大于 0 时返回 trash 数据
}
```

**Response**:

```ts
{
  workspaceId: string,
  folders: FolderListItem[],
  deletedFolders: Array<{ relativePath: string, deletedClock: number }>,
  documents: CloudDocument[],
  deletedPaths: Array<{ relativePath: string, deletedClock: number }>,
  conflicts: SyncConflict[],
  trash?: {
    items: TrashItem[],
    events: TrashEvent[],
    expiredTrashIds: string[],
    trashCursor: number
  }
}
```

**Semantics**:
- 返回 `sinceClock` 之后的所有 folder、document、deletion 变更
- `deletedPaths` 仅在 `sinceClock != 0` 时返回
- 如果提供 `deviceId`, 更新 `workspace_sync_cursors.last_seen_clock`
- **WS 事件**: 无 (读操作)

### `POST /api/v1/workspaces/:workspace_id/sync/push`

推送本地变更到云端, 支持三方合并。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor`

**Request**:

```ts
{
  deviceId?: string,
  folders?: Array<{ relativePath: string }>,
  documents: Array<{
    relativePath: string,
    title?: string,
    status?: string,
    content: string,
    baseContentHash?: string,      // 用于冲突检测
    baseContent?: string           // 用于三方合并
  }>,
  deletedPaths?: Array<{ relativePath: string }>,
  trashOperations?: Array<
    | { type: "restore", trashId: string }
    | { type: "permanent_delete", trashId: string }
    | { type: "empty_trash" }
  >
}
```

**Response**:

```ts
{
  workspaceId: string,
  accepted: number,
  folders: FolderListItem[],
  documents: Array<CloudDocument & {
    mergeStatus: "accepted" | "merged" | "unchanged"
  }>,
  deletedPaths: Array<{ relativePath: string, deletedClock: number }>,
  conflicts: SyncConflict[]
}
```

**Semantics**:
- Upsert folders (含祖先目录), folder 变更时广播 `sync:required`
- 文档保存: baseContentHash 不匹配且双方均有变更时, 尝试三方合并 (需 `baseContent`); 无法合并则创建 `SyncConflict`
- `deletedPaths` 将文档移入回收站
- `trashOperations` 执行恢复/永久删除/清空回收站
- **WS 事件**: 广播 `document:changed` (每个保存的文档)、`document:trashed` (每个删除路径)、`document:deleted` (永久删除)、`sync:required` (folder 变更)

### `GET /api/v1/workspaces/:workspace_id/conflicts`

列出未解决的冲突。

- **Auth**: bearer
- **Required role**: 任何活跃角色
- **Response**: `SyncConflict[]`
- **Semantics**: 按 `relativePath` 去重, 保留每个路径最新的冲突
- **WS 事件**: 无

### `POST /api/v1/workspaces/:workspace_id/conflicts/:conflict_id/resolve`

解决冲突。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor`

**Request**:

```ts
{
  resolution: "accept_local" | "accept_cloud" | "manual_merge" | "keep_both",
  content?: string    // manual_merge 时必填
}
```

**Response**: `CloudDocument`

**Semantics**:
- `accept_local`: 保存冲突中的 local content
- `accept_cloud`: 保留 cloud content
- `manual_merge`: 保存 `content` (必填)
- `keep_both`: 创建兄弟文档保存 local content, 标记冲突已解决
- **WS 事件**: 广播 `document:changed` (解决后的文档)

---

## WS Event (Server → Client)

### `sync:required`

通用的 "需要重新同步" 通知, 当具体的事件不足以覆盖变更范围时使用。

**触发条件**:
- REST/WS 文件夹创建/删除 → `reason: "folder-changed"`
- 广播 lag (消息被跳过) → `reason: "lagged"`, 带 `missedEvents` 计数

**Payload**:

```ts
{
  type: "sync:required",
  workspaceId: string,     // 新设计新增
  reason: string,
  missedEvents?: number    // 仅 lagged 时
}
```

**Scope**: workspace — 所有该 workspace 的在线成员收到

#### Desktop 收到后

Guard: 需要 workspace + syncToken + cloudSyncEnabled + vault binding

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前 vault binding | 触发 `pullOnly()` (增量同步拉取) |
| workspaceId 匹配其他 vault binding | 触发后台 `pullOnly()` |
| 无匹配 binding | 忽略 |

#### Web 收到后

**自回显过滤**: `sourceSessionId === wsSessionId` → 跳过

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 全量刷新: 文件夹列表 + 文档列表 + 回收站列表 |
| workspaceId 不匹配 | 无需操作 |

---

## Desktop Sync 流程

### Pull (增量拉取)

由 WS 事件、定时轮询、可见性变化触发:

```
触发 pullOnly()
  → POST /sync/pull (sinceClock, deviceId, sinceTrashEventClock)
  → 应用返回的文档到本地磁盘
  → 处理 deletedPaths (删除本地文件)
  → 更新 vault binding 的 lastSyncClock
  → 如果当前打开的文件被更新且编辑器未修改 → 刷新编辑器内容
```

### Push (推送 + 三方合并)

由保存操作、定时同步触发:

```
触发 syncWorkspaceToWeb()
  → pullOnly()  (先拉后推)
  → POST /sync/push (documents + folders + deletedPaths + trashOperations)
  → 应用 merged documents
  → 保存 sync bases (用于下次冲突检测的 baseContent/baseContentHash)
  → dispatch conflicts (如果有)
```

### Eager Push (单文档快速推送)

文档保存后立即触发, fire-and-forget:

```
触发 pushSingleDocument(relativePath, content)
  → POST /sync/push (单个文档, 含 baseContentHash + baseContent)
  → 成功且 mergeStatus === "accepted" → 更新 sync base
  → 失败 → 静默忽略 (下次定时同步会处理)
```

### Access Loss 处理

Push 返回 403/404 时:
- 解绑 workspace binding
- 禁用 cloud sync
- 显示提示消息

---

## Common Shapes

### `SyncConflict`

```ts
{
  conflictId: string,
  relativePath: string,
  localContent: string,
  cloudContent: string,
  baseContent?: string,
  conflictRanges?: unknown
}
```

### `CloudDocument`

```ts
{
  relativePath: string,
  title: string,
  status: "draft" | "published" | "archived" | string,
  content: string,
  contentHash: string,
  versionId: string,
  updatedClock: number
}
```
