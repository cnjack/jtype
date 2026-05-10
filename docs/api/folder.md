# Folder Domain — REST API & WS Events

Workspace 文件夹的 CRUD 以及相关 WS 事件。

---

## REST API

### `GET /api/v1/workspaces/:workspace_id/folders`

列出 workspace 下所有文件夹。

- **Auth**: bearer
- **Required role**: 任何活跃角色
- **Response**: `FolderListItem[]`
- **WS 事件**: 无

### `POST /api/v1/workspaces/:workspace_id/folders`

创建文件夹 (含自动创建祖先目录)。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor`
- **Request**: `{ relativePath: string }`
- **Response**: `FolderListItem`
- **WS 事件**: 广播 `sync:required` (`reason: "folder-changed"`)

### `DELETE /api/v1/workspaces/:workspace_id/folders/:folder_id`

删除文件夹 (含子文件夹)。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor`
- **Response**: `204 No Content`
- **WS 事件**: 广播 `sync:required` (`reason: "folder-changed"`)

---

## WS Operations (Client → Server) — ⚠️ DEPRECATED

> **已废弃**: 以下 WS 操作已被 REST 端点替代。所有写操作应通过 REST 发送。WS 仅用于接收通知。
> - `folder:created` → 使用 `POST /api/v1/workspaces/:workspace_id/folders`
> - `folder:deleted` → 使用 `DELETE /api/v1/workspaces/:workspace_id/folders/:folder_id`

### `folder:created` ⚠️ DEPRECATED

通过 WS 创建文件夹。**已废弃**, 请使用 REST `POST /folders`。

- **Required role**: `owner` / `admin` / `editor`

**Request**:

```ts
{
  type: "folder:created",
  ref?: string,
  workspaceId?: string,    // 新设计需要
  relativePath: string
}
```

**Response**:

- **⚠️ Bug B1**: 成功时不返回 ack, 仅广播 `sync:required`。Web 前端 `request()` 会 30s 超时。
- 失败时返回:

```ts
{
  type: "ack",
  ref?: string,
  ok: false,
  error: string
}
```

**Side effects**:
- 创建文件夹和祖先目录
- 广播 `sync:required` (`reason: "folder-changed"`)

### `folder:deleted` ⚠️ DEPRECATED

通过 WS 删除文件夹。**已废弃**, 请使用 REST `DELETE /folders/:folder_id`。

- **Required role**: `owner` / `admin` / `editor`

**Request**:

```ts
{
  type: "folder:deleted",
  ref?: string,
  workspaceId?: string,    // 新设计需要
  relativePath: string
}
```

**Response**:

- **⚠️ Bug B1**: 同 `folder:created`, 成功时无 ack。
- 失败时返回 failed ack。

**Side effects**:
- 记录 folder deletion clock
- 删除文件夹及子文件夹
- 广播 `sync:required` (`reason: "folder-changed"`)

### `folder:changed` ⚠️ DEPRECATED

Legacy 回退操作, 无任何客户端发送此消息。

**Request**:

```ts
{
  type: "folder:changed",
  ref?: string
}
```

**Side effects**: 仅广播 `sync:required` (`reason: "folder-changed"`), 不持久化任何数据。

> **设计问题 D8**: 这是废弃代码, 应标记 deprecated 或移除。

---

## WS Events (Server → Client)

文件夹操作本身不产生专用事件类型, 统一通过 `sync:required` 通知:

### `sync:required`

> 完整定义见 [sync.md](sync.md#syncrequired-server--client)。

文件夹相关触发:
- REST `POST /folders` (创建文件夹)
- REST `DELETE /folders/:id` (删除文件夹)
- WS `folder:created`
- WS `folder:deleted`
- WS `folder:changed` (deprecated)

所有情况的 `reason` 均为 `"folder-changed"`。

#### Desktop 收到后

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前 vault binding | 触发 `pullOnly()` — 增量同步会拉取最新的文件夹列表并应用到本地 |
| workspaceId 匹配其他 vault binding | 触发后台 `pullOnly()` |
| 无匹配 binding | 忽略 |

#### Web 收到后

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 刷新文件夹列表 + 文档列表 + 回收站列表 (全量刷新) |
| workspaceId 不匹配 | 无需操作 |

---

## Common Shapes

### `FolderListItem`

```ts
{
  id: string,
  relativePath: string,
  updatedClock: number
}
```
