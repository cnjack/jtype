# Member Domain — REST API & WS Events

Workspace 成员管理: 邀请、加入、角色变更、移除、离开、所有权转移。

---

## REST API

### `GET /api/v1/workspaces/:workspace_id/members`

列出 workspace 成员。

- **Auth**: bearer
- **Required role**: 任何活跃角色
- **Response**: `Array<{ userId, username, role, status, joinedAt }>`
- **WS 事件**: 无

### `POST /api/v1/workspaces/:workspace_id/members/:user_id/remove`

移除成员。

- **Auth**: bearer
- **Required role**: `owner` / `admin`
- **Constraints**: 不能移除 owner; admin 不能移除另一个 admin
- **Response**: `204 No Content`
- **WS 事件**: 应发送 `member:removed` (**⚠️ 当前缺失**)

### `PUT /api/v1/workspaces/:workspace_id/members/:user_id`

变更成员角色。

- **Auth**: bearer
- **Required role**: `owner`
- **Request**: `{ role: "admin" | "editor" | "viewer" }`
- **Constraints**: owner 不能改自己角色
- **Response**: member object
- **WS 事件**: 应发送 `member:role-changed` (**⚠️ 当前缺失**)

### `POST /api/v1/workspaces/:workspace_id/leave`

当前用户离开 workspace。

- **Auth**: bearer
- **Required role**: 任何活跃角色
- **Constraints**: owner 不能离开, 必须先转移所有权
- **Response**: `204 No Content`
- **WS 事件**: 应发送 `member:left` (**⚠️ 当前缺失**)

### `POST /api/v1/workspaces/:workspace_id/transfer`

转移 workspace 所有权。

- **Auth**: bearer
- **Required role**: `owner`
- **Request**: `{ newOwnerUserId: string }`
- **Semantics**: 目标用户变为 `owner`, 原 owner 变为 `admin`
- **Response**: `204 No Content`
- **WS 事件**: 应发送 `member:role-changed` (双方角色变化) (**⚠️ 当前缺失**)

---

## Invites

### `POST /api/v1/workspaces/:workspace_id/invites`

创建邀请链接。

- **Auth**: bearer
- **Required role**: `owner` / `admin`
- **Request**: `{ email?: string, role?: "admin" | "editor" | "viewer" }`
- **Default role**: `editor`
- **Response**: `{ inviteId, workspaceId, role, inviteToken }`
- **WS 事件**: 可发送 `workspace:invited` 给被邀请用户 (**⚠️ 当前缺失**, 优先级 LOW)

### `POST /api/v1/workspaces/:workspace_id/invites/:invite_id/revoke`

撤销邀请。

- **Auth**: bearer
- **Required role**: `owner` / `admin`
- **Response**: `204 No Content`
- **WS 事件**: 无

### `POST /api/v1/workspace-invites/:invite_token/accept`

接受邀请, 加入 workspace。

- **Auth**: bearer
- **Response**: `WorkspaceSummary`
- **Semantics**: 查找 invite (by token hash), 添加/重新激活成员资格, 标记 invite 为 accepted
- **WS 事件**: 应发送 `member:joined` (**⚠️ 当前缺失**)

---

## WS Events (Server → Client)

### `member:joined` ⚠️ NEW

新成员加入 workspace。

**触发条件**: `POST /api/v1/workspace-invites/:token/accept`

**Payload**:

```ts
{
  type: "member:joined",
  workspaceId: string,
  userId: string,
  username: string,
  role: "admin" | "editor" | "viewer"
}
```

**Scope**: workspace — 所有该 workspace 的在线成员收到 (包括新加入的成员)

**REST → WS Dispatch 流程**:

```
POST /api/v1/workspace-invites/:token/accept
  → 业务逻辑: 添加成员
  → hub.publish_to_workspace(wid, MemberJoined)     // 通知现有成员
  → hub.add_workspace_for_user(new_member_id, wid)  // 为新成员的在线 session 添加订阅
  → hub.publish_to_user(new_member_id, MemberJoined) // 通知新成员自身
  → 返回 HTTP response
```

#### Desktop 收到后

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前 vault binding | 无需操作 (成员列表仅在需要时按需加载) |
| 无匹配 binding | 如果是新成员自身 (新 workspace), 可更新 workspace 列表 |

#### Web 收到后

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 刷新成员列表 |
| workspaceId 不匹配 | 可选: 更新侧边栏 workspace 成员计数 |

---

### `member:removed` ⚠️ NEW

成员被移除 (踢出)。

**触发条件**: `POST /api/v1/workspaces/:id/members/:user_id/remove`

**Payload**:

```ts
{
  type: "member:removed",
  workspaceId: string,
  userId: string,         // 被移除的用户
  username: string,
  removedByUserId: string
}
```

**Scope**: workspace + user
- workspace 范围: 通知其余成员
- user 范围: 被移除用户需特殊通知

**REST → WS Dispatch 流程**:

```
POST /api/v1/workspaces/:id/members/:user_id/remove
  → 业务逻辑: 标记成员为 removed
  → hub.publish_to_workspace(wid, MemberRemoved)          // 通知其余成员
  → hub.kick_user_from_workspace(removed_user_id, wid)    // 取消该用户对此 workspace 的订阅, 并发送通知
  → 返回 HTTP 204
```

#### Desktop 收到后

**被移除的用户自身**:

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前 vault binding | 解绑 workspace, 禁用 cloud sync, 显示 "您已被移出此 workspace", 回到 VaultHome |
| workspaceId 匹配其他 vault binding | 解绑该 vault 的 workspace binding, 禁用 cloud sync |
| 无匹配 binding | 从 workspace 列表中移除 |

**其他成员**:

| 场景 | 行为 |
|------|------|
| 任何 | 无需操作 (成员列表按需加载) |

#### Web 收到后

**被移除的用户自身**:

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 显示 "您已被移出此 workspace", 跳转到 workspace 列表页 |
| workspaceId 不匹配 | 从侧边栏 workspace 列表中移除 |

**其他成员**:

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 刷新成员列表 |
| workspaceId 不匹配 | 可选: 更新成员计数 |

---

### `member:left` ⚠️ NEW

成员主动离开 workspace。

**触发条件**: `POST /api/v1/workspaces/:workspace_id/leave`

**Payload**:

```ts
{
  type: "member:left",
  workspaceId: string,
  userId: string,
  username: string
}
```

**Scope**: workspace — 所有剩余成员收到

**REST → WS Dispatch 流程**:

```
POST /api/v1/workspaces/:id/leave
  → 业务逻辑: 标记成员为离开
  → hub.publish_to_workspace(wid, MemberLeft, exclude=current_user) // 通知剩余成员
  → hub.kick_user_from_workspace(current_user_id, wid)              // 取消订阅
  → 返回 HTTP 204
```

> **注意**: 离开的用户自己不需要收到 `member:left`, 因为是自己发起的操作, REST 响应 204 就够了。但其 WS 订阅需要被清理。

#### Desktop 收到后

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前 vault binding | 无需操作 |
| 无匹配 binding | 无需操作 |

#### Web 收到后

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 刷新成员列表 |
| workspaceId 不匹配 | 无需操作 |

---

### `member:role-changed` ⚠️ NEW

成员角色被变更。

**触发条件**:
- `PUT /api/v1/workspaces/:id/members/:user_id` (角色变更)
- `POST /api/v1/workspaces/:id/transfer` (所有权转移, 两人角色同时变化)

**Payload**:

```ts
{
  type: "member:role-changed",
  workspaceId: string,
  userId: string,
  username: string,
  previousRole: "owner" | "admin" | "editor" | "viewer",
  newRole: "owner" | "admin" | "editor" | "viewer"
}
```

**Scope**: workspace — 所有该 workspace 的在线成员收到

> **所有权转移**: 会产生两条 `member:role-changed` 事件 — 一条为新 owner (→ `owner`), 一条为旧 owner (→ `admin`)。

#### Desktop 收到后

| 场景 | 行为 |
|------|------|
| 被变更的是当前用户, workspaceId 匹配当前 vault binding | 更新本地缓存的 workspace role (可能影响 UI 权限, 如编辑/删除按钮的显隐) |
| 其他 | 无需操作 |

#### Web 收到后

| 场景 | 行为 |
|------|------|
| workspaceId 匹配当前页面 | 1. 刷新成员列表<br>2. 如果被变更的是当前用户: 更新 UI 权限 (如降为 viewer 时隐藏编辑功能) |
| workspaceId 不匹配 | 可选: 更新侧边栏 workspace 角色显示 |
