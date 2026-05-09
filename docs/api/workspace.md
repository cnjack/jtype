# Workspace Domain — REST API & WS Events

Cloud workspace 的 CRUD 操作及相关 WS 事件。

---

## REST API

### `GET /api/v1/workspaces`

列出当前用户可见的所有 cloud workspace。

- **Auth**: bearer
- **Response**: `{ workspaces: WorkspaceSummary[] }`
- **WS 事件**: 无

### `POST /api/v1/workspaces`

创建新 cloud workspace。

- **Auth**: bearer
- **Request**: `{ name: string, storageBudgetBytes?: number }`
- **Response**: `WorkspaceSummary`
- **默认 budget**: `1073741824` bytes (1 GB)
- **WS 事件**: 无 (创建者就是当前用户, 不需要通知)

### `GET /api/v1/workspaces/:workspace_id`

获取单个 workspace 详情。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor` / `viewer`
- **Response**: `WorkspaceSummary`
- **WS 事件**: 无

### `PUT /api/v1/workspaces/:workspace_id`

更新 workspace 名称或发布标题。

- **Auth**: bearer
- **Required role**: `owner` / `admin`
- **Request**: `{ name?: string, publishTitle?: string }`
- **Response**: `WorkspaceSummary`
- **WS 事件**: 应发送 `workspace:updated` (**⚠️ 当前缺失**)

### `DELETE /api/v1/workspaces/:workspace_id`

删除 workspace, 数据库级联清除关联数据。

- **Auth**: bearer
- **Required role**: `owner`
- **Response**: `204 No Content`
- **WS 事件**: 应发送 `workspace:deleted` (**⚠️ 当前缺失**)

### `GET /api/v1/workspaces/:workspace_id/manifest`

返回文档元数据清单 (无正文), 用于 sync/indexing。

- **Auth**: bearer
- **Required role**: `owner` / `admin` / `editor` / `viewer`
- **Response**: `{ workspaceId, documents: Array<{ relativePath, title, status, contentHash, versionId, updatedClock }> }`
- **WS 事件**: 无

---

## WS Events (Server → Client)

### `workspace:updated` ⚠️ NEW

Workspace 元数据被修改。

**触发条件**: `PUT /api/v1/workspaces/:workspace_id` (名称/标题变更)

**Payload**:

```ts
{
  type: "workspace:updated",
  workspaceId: string,
  name: string,
  slug: string,
  publishTitle: string
}
```

**Scope**: workspace — 所有该 workspace 的在线成员收到

#### Desktop 收到后

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前 vault binding | 更新 UI 中的 workspace 名称显示 |
| workspaceId 匹配其他 vault binding | 更新 vault binding 中缓存的 workspace 名称 |
| 无匹配 binding | 更新 workspace 列表缓存 (如果有) |

#### Web 收到后

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 更新页面标题、侧边栏名称 |
| workspaceId 不匹配 | 更新侧边栏 workspace 列表中的名称 |

---

### `workspace:deleted` ⚠️ NEW

Workspace 被 owner 删除。

**触发条件**: `DELETE /api/v1/workspaces/:workspace_id`

**Payload**:

```ts
{
  type: "workspace:deleted",
  workspaceId: string
}
```

**Scope**: workspace — 所有该 workspace 的在线成员收到; 发送后服务端应清理该 workspace 的所有订阅

**REST → WS Dispatch 流程**:

```
DELETE /api/v1/workspaces/:id
  → 业务逻辑: 删除 workspace
  → hub.publish_to_workspace(wid, WorkspaceDeleted)
  → hub.remove_workspace_subscriptions(wid)  // 清理订阅关系
  → 返回 HTTP 204
```

#### Desktop 收到后

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前 vault binding | 解绑 workspace (`unbind`), 禁用 cloud sync, 显示提示消息, 回到 VaultHome |
| workspaceId 匹配其他 vault binding | 解绑该 vault 的 workspace binding, 禁用 cloud sync |
| 无匹配 binding | 从 workspace 列表中移除 |

> 行为类似当前 Desktop 收到 `cloud:workspace-gone` 的处理。

#### Web 收到后

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 显示 "Workspace 已被删除" 提示, 跳转到 workspace 列表页 |
| workspaceId 不匹配 | 从侧边栏 workspace 列表中移除 |

---

### `workspace:invited` ⚠️ NEW

当前用户被邀请加入一个新 workspace。

**触发条件**: `POST /api/v1/workspaces/:workspace_id/invites` (创建邀请)

**Payload**:

```ts
{
  type: "workspace:invited",
  workspaceId: string,
  workspaceName: string,
  invitedByUsername: string,
  role: "admin" | "editor" | "viewer"
}
```

**Scope**: user — 仅被邀请的用户收到 (通过 `hub.publish_to_user()`)

> **注意**: 此事件仅在邀请关联了已知用户 (通过 email 匹配) 时才可发送。当前 invite 系统基于 token link, 未关联特定用户, 实现此事件需要先扩展 invite 机制。优先级 LOW。

#### Desktop 收到后

- 显示系统通知 "You've been invited to workspace X"
- 可选: 更新 workspace 列表

#### Web 收到后

- 显示 notification badge 或 toast
- 更新 workspace 列表

---

## Common Shapes

### `WorkspaceSummary`

```ts
{
  id: string,
  name: string,
  slug: string,
  publishTitle: string,
  role: "owner" | "admin" | "editor" | "viewer",
  documentCount: number,
  storageBudgetBytes: number,
  storageUsedBytes: number
}
```
