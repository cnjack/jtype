# Trash Domain — REST API & WS Events

文档回收站: 查看、恢复、永久删除、清空。

---

## REST API

### `GET /api/v1/workspaces/:workspace_id/trash`

列出回收站中的文档。

- **Auth**: bearer
- **Required role**: 任何活跃角色
- **Response**: `TrashItem[]` (按删除时间倒序)
- **WS 事件**: 无

### `POST /api/v1/workspaces/:workspace_id/trash/:trash_id/restore`

恢复回收站中的文档。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor`
- **Optional header**: `x-device-id`
- **Response**: `CloudDocument`
- **Semantics**:
  - 创建新文档行, status 为 `draft`
  - 如果该路径已有文档, 先删除原文档
  - 标记 trash item 为 restored, 记录 restore 元数据
- **WS 事件**: 广播 `document:trashed` (`action: "restored"`)

### `DELETE /api/v1/workspaces/:workspace_id/trash/:trash_id`

永久删除单个回收站项目。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor`
- **Response**: `204 No Content`
- **Semantics**: 永久删除, 记录 `permanent_delete_item` trash event
- **WS 事件**: 广播 `document:deleted` (如果路径已知)

### `DELETE /api/v1/workspaces/:workspace_id/trash`

清空回收站。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor`
- **Response**: `204 No Content`
- **Semantics**: 永久删除所有未恢复的 trash item, 记录 `empty_trash` trash event
- **WS 事件**: 每个被删除的路径广播一条 `document:deleted`

---

## WS Operations (Client → Server)

### `trash:restore`

通过 WS 恢复回收站文档。**仅 Web 使用。**

- **Required role**: `owner` / `admin` / `editor`

**Request**:

```ts
{
  type: "trash:restore",
  ref?: string,
  workspaceId?: string,    // 新设计需要
  trashId: string
}
```

**Success ack**:

```ts
{ type: "ack", ref?: string, ok: true }
```

**Failure ack**:

```ts
{ type: "ack", ref?: string, ok: false, error: string }
```

**Side effects**: 与 REST restore 相同, 广播 `document:trashed` (`action: "restored"`)

### `trash:permanent_delete`

通过 WS 永久删除回收站项目。**仅 Web 使用。**

- **Required role**: `owner` / `admin` / `editor`

**Request**:

```ts
{
  type: "trash:permanent_delete",
  ref?: string,
  workspaceId?: string,    // 新设计需要
  trashId: string
}
```

**Response**: success/failure ack

**Side effects**: 与 REST permanent delete 相同, 广播 `document:deleted`

### `trash:empty_trash`

通过 WS 清空回收站。**仅 Web 使用。**

- **Required role**: `owner` / `admin` / `editor`

**Request**:

```ts
{
  type: "trash:empty_trash",
  ref?: string,
  workspaceId?: string    // 新设计需要
}
```

**Response**: success/failure ack

**Side effects**: 与 REST empty trash 相同, 每个路径广播 `document:deleted`

---

## WS Events (Server → Client)

回收站操作复用 document domain 的事件类型:

| 回收站操作 | 产生的 WS 事件 | 详见 |
|-----------|---------------|------|
| 移入回收站 (sync/push deletedPaths) | `document:trashed` (`action: "trashed"`) | [document.md](document.md#documenttrashed) |
| 恢复 (REST/WS restore) | `document:trashed` (`action: "restored"`) | [document.md](document.md#documenttrashed) |
| 永久删除 (REST/WS permanent_delete) | `document:deleted` | [document.md](document.md#documentdeleted) |
| 清空回收站 (REST/WS empty_trash) | `document:deleted` (每个路径一条) | [document.md](document.md#documentdeleted) |

客户端收到这些事件后的行为详见 [document.md](document.md)。

---

## Desktop Trash Sync

Desktop 通过 sync/pull 的 `sinceTrashEventClock` 参数获取回收站变更:

```
sync/pull (sinceTrashEventClock > 0)
  → response.trash.items:  当前回收站内容
  → response.trash.events: 回收站事件 (empty_trash, permanent_delete_item, ...)
  → response.trash.expiredTrashIds: 已过期的 trash ID
  → response.trash.trashCursor: 最新 event clock
```

Desktop 也通过 sync/push 的 `trashOperations` 推送回收站操作:

```ts
trashOperations: [
  { type: "restore", trashId: "..." },
  { type: "permanent_delete", trashId: "..." },
  { type: "empty_trash" }
]
```

---

## Common Shapes

### `TrashItem`

```ts
{
  id: string,
  documentId: string,
  relativePath: string,
  title: string,
  contentHash: string,
  deletedByUserId: string,
  sourceDeviceId?: string,
  sourceUserId?: string,
  deletedAt: string,       // ISO timestamp
  expiresAt: string,       // ISO timestamp, 30 天后
  deletedClock: number
}
```

### `TrashEvent`

```ts
{
  id: string,
  eventType: "empty_trash" | "permanent_delete_item" | string,
  eventClock: number,
  eventData: unknown,
  createdAt: string
}
```
