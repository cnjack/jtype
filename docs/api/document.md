# Document Domain — REST API & WS Events

文档的 CRUD、版本、状态管理, 以及文档变更的 WS 广播。

---

## REST API

### `GET /api/v1/workspaces/:workspace_id/documents`

列出 workspace 下的所有文档。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor` / `viewer`
- **Response**: `DocumentListItem[]`
- **WS 事件**: 无

### `GET /api/v1/workspaces/:workspace_id/documents/:document_id`

获取单个文档全文。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor` / `viewer`
- **Response**: `CloudDocument`
- **WS 事件**: 无

### `DELETE /api/v1/workspaces/:workspace_id/documents/:document_id`

删除文档 (移入回收站, 30 天过期)。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor`
- **Optional header**: `x-device-id`
- **Response**: `204 No Content`
- **WS 事件**: 发送 `document:deleted`

### `PUT /api/v1/workspaces/:workspace_id/documents/:document_id/status`

更新文档发布状态。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor`
- **Request**: `{ status: "draft" | "published" | "archived" }`
- **Response**: `DocumentListItem`
- **WS 事件**: 应发送 `document:status-changed` (**⚠️ 当前缺失**)

### `GET /api/v1/workspaces/:workspace_id/documents/:document_id/versions`

获取文档历史版本 (最近 50 条)。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor` / `viewer`
- **Response**: `Array<{ id, parentVersionId, source, contentHash, content, createdAt }>`
- **WS 事件**: 无

---

## WS Operations (Client → Server)

### `document:save`

通过 WS 保存文档内容。**仅 Web 使用**, Desktop 走 `sync/push` REST API。

- **Required role**: `owner` / `admin` / `editor`

**Request**:

```ts
{
  type: "document:save",
  ref?: string,            // Web 用于 req/resp 关联
  workspaceId?: string,    // 新设计需要, 当前隐含在 WS URL 中
  relativePath: string,
  title?: string,
  status?: string,
  content: string,
  baseContentHash?: string,
  baseContent?: string     // 用于三方合并
}
```

**Success ack**:

```ts
{
  type: "ack",
  ref?: string,
  ok: true,
  relativePath: string,
  contentHash: string,
  updatedClock: number,
  document: {
    relativePath: string,
    contentHash: string,
    updatedClock: number
  }
}
```

**Conflict ack**:

```ts
{
  type: "ack",
  ref?: string,
  ok: false,
  error: "conflict",
  conflictId: string,
  relativePath: string
}
```

**Failure ack**:

```ts
{
  type: "ack",
  ref?: string,
  ok: false,
  error: string
}
```

**Side effects**:
- 保存文档, 创建新 version
- 广播 `document:changed` 到 workspace 所有在线成员
- `source` = 连接的 `clientType`, `deviceId` = 连接的 `deviceId`

---

## WS Events (Server → Client)

### `document:changed`

文档内容被保存或合并。

**触发条件**:
- WS `document:save`
- REST `sync/push` 中的文档保存
- 冲突解决 (`conflicts/:id/resolve`)

**Payload**:

```ts
{
  type: "document:changed",
  workspaceId: string,     // 新设计新增, 当前无此字段
  sourceSessionId: string,
  relativePath: string,
  contentHash: string,
  updatedClock: number,
  editedBy: string,        // 编辑者 username
  source: string,          // "desktop" | "web"
  deviceId: string | null
}
```

#### Desktop 收到后

**自回显过滤**: 如果 `source === "desktop" && deviceId === self.deviceId` → 跳过

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前 vault binding | 1. 如果 `relativePath` 是当前打开的文档, 显示状态提示<br>2. 触发 `pullOnly()` (增量同步拉取)<br>3. 如果拉取的文件与当前打开且未修改的文档匹配, 自动刷新编辑器内容 |
| workspaceId 匹配其他 vault binding | 触发后台 `pullOnly()` (跨 vault 同步) |
| 无匹配 binding | 忽略 |

#### Web 收到后

**自回显过滤**: 如果 `sourceSessionId === wsSessionId` → 跳过

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 1. 刷新文档列表 (`listDocuments`)<br>2. 如果 `relativePath` 是当前打开的文档:<br>&nbsp;&nbsp;- 编辑器**未修改**: 从 API 重新加载内容<br>&nbsp;&nbsp;- 编辑器**有未保存修改**: 显示 stale warning (`"edited by {editedBy}"`) |
| workspaceId 不匹配 | 更新侧边栏 workspace badge (可选) |

---

### `document:deleted`

文档被永久删除或从回收站清除。

**触发条件**:
- REST `DELETE /api/v1/workspaces/:id/documents/:id` (移入回收站)
- REST `DELETE /api/v1/workspaces/:id/trash/:id` (永久删除)
- REST `DELETE /api/v1/workspaces/:id/trash` (清空回收站, 每个路径各一条)

**Payload**:

```ts
{
  type: "document:deleted",
  workspaceId: string,     // 新设计新增
  sourceSessionId: string,
  relativePath: string,
  deletedClock: number
}
```

#### Desktop 收到后

**自回显过滤**: 同 `document:changed`

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前 vault binding | 1. 如果 `relativePath` 是当前打开的文档, 显示 "文档已被删除" 状态消息<br>2. 触发 `pullOnly()` |
| workspaceId 匹配其他 vault binding | 触发后台 `pullOnly()` |
| 无匹配 binding | 忽略 |

#### Web 收到后

**自回显过滤**: 同 `document:changed`

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 1. 刷新文档列表 + 回收站列表<br>2. 如果 `relativePath` 是当前打开的文档: 显示状态消息, 反选文档, 清空编辑器 |
| workspaceId 不匹配 | 更新侧边栏 badge (可选) |

---

### `document:trashed`

文档被移入回收站或从回收站恢复。

**触发条件**:
- REST `sync/push` 中的 `deletedPaths` → `action: "trashed"`
- REST `POST /trash/:id/restore` → `action: "restored"`

**Payload**:

```ts
{
  type: "document:trashed",
  workspaceId: string,     // 新设计新增
  sourceSessionId: string,
  relativePath: string,
  action: "trashed" | "restored"
}
```

#### Desktop 收到后

**自回显过滤**: 同 `document:changed`

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前 vault binding | 1. 如果 `relativePath` 是当前打开的文档且 `action === "trashed"`, 显示状态消息<br>2. 触发 `pullOnly()` |
| workspaceId 匹配其他 vault binding | 触发后台 `pullOnly()` |
| 无匹配 binding | 忽略 |

#### Web 收到后

**自回显过滤**: 同 `document:changed`

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 刷新文档列表 + 回收站列表 |
| workspaceId 不匹配 | 更新侧边栏 badge (可选) |

---

### `document:status-changed` ⚠️ NEW

文档发布状态被修改。

**触发条件**: `PUT /api/v1/workspaces/:id/documents/:id/status`

**Payload**:

```ts
{
  type: "document:status-changed",
  workspaceId: string,
  sourceSessionId: string,
  relativePath: string,
  documentId: string,
  status: "draft" | "published" | "archived",
  previousStatus: string
}
```

**Scope**: workspace — 所有该 workspace 的在线成员收到

#### Desktop 收到后

**自回显过滤**: 同 `document:changed`

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前 vault binding | 触发 `pullOnly()`, 文档的 frontmatter 中的 status 字段会在 pull 时更新 |
| workspaceId 匹配其他 vault binding | 触发后台 `pullOnly()` |
| 无匹配 binding | 忽略 |

#### Web 收到后

**自回显过滤**: 同 `document:changed`

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 1. 刷新文档列表 (状态标签会更新)<br>2. 如果是当前打开的文档, 更新编辑器中的 status 显示 |
| workspaceId 不匹配 | 更新侧边栏 badge (可选) |

---

## Common Shapes

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

### `DocumentListItem`

```ts
{
  id: string,
  relativePath: string,
  title: string,
  status: string,
  contentHash: string,
  updatedClock: number,
  versionId: string | null
}
```
