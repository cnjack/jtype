# Vault ↔ Cloud Workspace Onboarding — Architecture Design

> **版本**: v2.0（基于实现状态修订）  
> **日期**: 2026-05-11

---

## 一、已实现基础设施

| 层 | 能力 | 状态 |
|----|------|------|
| **Server API** | workspace CRUD, invite create/revoke/accept, sync pull/push, trash, conflicts | ✅ |
| **Server Members API** | list, remove, leave, update role, transfer ownership | ✅ |
| **Server Workspace Delete** | DELETE + CASCADE, 广播 WorkspaceDeleted | ✅ |
| **Server Auth** | Session token + OAuth device flow + RBAC | ✅ |
| **Server WebSocket** | Document 事件 + WorkspaceDeleted / MemberRemoved / MemberRoleChanged / MemberJoined | ✅ |
| **Server DB** | 现有 schema 完全满足所有操作，无需新增 migration | ✅ |
| **Desktop Sync** | Three-way merge, sync-bases, periodic + eager + event-driven | ✅ |
| **Desktop Unbind** | unbind_cloud_workspace + clear_sync_bases Tauri commands | ✅ |
| **Desktop SyncPromptDialog** | 首次打开 vault 的云同步引导（三按钮） | ✅ |
| **Desktop VaultSettings** | save/load vault settings, cloudSyncEnabled 持久化 | ✅ |
| **Desktop AppState** | DISCONNECT_WORKSPACE action, vaultSettings 状态 | ✅ |
| **Desktop autoCreate** | autoCreateAndBindWorkspace() 完整流程 | ✅ |

---

## 二、系统组件架构

### 2.1 Desktop App (Tauri 2)

```
┌─────────────────────────────────────────────────────────────────┐
│  UI Layer                                                        │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────────┐  │
│  │ VaultHome   │  │ AccountDialog │  │ SyncPromptDialog     │  │
│  │ (landing)   │  │ (cloud mgmt)  │  │ (onboarding modal)   │  │
│  └──────┬──────┘  └───────┬───────┘  └──────────┬───────────┘  │
│         └─────────────────┼──────────────────────┘              │
│  ┌────────────────────────┴────────────────────────────────┐   │
│  │ AppState (Reducer)                                       │   │
│  │  vaultSettings, DISCONNECT_WORKSPACE, SET_VAULT_SETTINGS │   │
│  └────────────────────────┬────────────────────────────────┘   │
│  ┌────────────────────────┴────────────────────────────────┐   │
│  │ Hooks: useCloudSync, useCloudEvents, usePeriodicSync    │   │
│  │  disconnectWorkspace(), autoCreateAndBindWorkspace()     │   │
│  └────────┬───────────────┬────────────────────────────────┘   │
│           │               │                                      │
│  ┌────────┴────────┐  ┌──┴────────────────────────┐            │
│  │ Tauri IPC       │  │ WebSocket                  │            │
│  │ invoke() bridge │  │ cloud:remote-change 事件   │            │
│  └────────┬────────┘  └──┬────────────────────────┘            │
├───────────┼──────────────┼──────────────────────────────────────┤
│ Rust Backend                                                     │
│  unbind_cloud_workspace, clear_sync_bases,                      │
│  save_vault_settings, load_vault_settings                       │
└───────────┼──────────────┼──────────────────────────────────────┘
            │ HTTP         │ WS
            ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Web Service (Axum)                                               │
│  handlers/member.rs: list, remove, leave, update_role, transfer │
│  handlers/workspace.rs: CRUD + delete (CASCADE)                 │
│  hub.rs: WorkspaceDeleted, MemberRemoved/Joined/RoleChanged    │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Server — Member Management (`handlers/member.rs`)

已实现完整的成员生命周期管理：

| 端点 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/v1/workspaces/{id}/members` | GET | 任何活跃成员 | 列出活跃成员 |
| `/api/v1/workspaces/{id}/members/{userId}/remove` | POST | owner/admin | 移除成员，广播 MemberRemoved |
| `/api/v1/workspaces/{id}/leave` | POST | 非 owner | 主动退出，广播 MemberRemoved |
| `/api/v1/workspaces/{id}/members/{userId}` | PUT | owner | 修改角色，广播 MemberRoleChanged |
| `/api/v1/workspaces/{id}/transfer` | POST | owner | 旧 owner → admin，新 owner → owner |

约束：owner 不能退出（先转让）；admin 不能移除 admin/owner。

---

### 2.3 Server — Workspace Delete

```rust
/// DELETE /api/v1/workspaces/{workspace_id}
/// 1. 验证 owner
/// 2. 广播 WorkspaceDeleted（在 DELETE 前，确保 client 收到）
/// 3. DELETE FROM workspaces (CASCADE 清理所有关联)
/// 4. 返回 204
```

CASCADE 影响：workspace_members、documents、document_versions、document_trash、sync_conflicts、workspace_sync_cursors、workspace_invites 全部删除；custom_domains SET NULL。

---

### 2.4 Server — Hub Events

已实现的 WebSocket 事件：

```json
{ "type": "workspace:deleted", "workspaceId": "..." }
{ "type": "member:removed", "workspaceId": "...", "userId": "...", "removedBy": "..." }
{ "type": "member:role_changed", "workspaceId": "...", "userId": "...", "newRole": "..." }
{ "type": "member:joined", "workspaceId": "...", "userId": "...", "username": "...", "role": "..." }
```

---

### 2.5 Desktop — Tauri Commands

| Command | 功能 |
|---------|------|
| `unbind_cloud_workspace(workspace_id, vault_path)` | 删除 binding + 清理 `.jtype/sync-base/` |
| `clear_sync_bases(vault_path)` | 仅清理 sync-bases（切换 workspace 时用） |
| `save_vault_settings(vault_path, settings)` | 保存 vault 设置到 `{configDir}/JType/vault-settings.json` |
| `load_vault_settings(vault_path)` | 加载 vault 设置 |

VaultSettings 结构：
```rust
pub struct VaultSettings {
    pub cloud_sync_enabled: bool,
    pub sync_prompt_dismissed_at: Option<String>,
    pub sync_disabled_permanently: bool,
}
```

存储位置：

| 数据 | 路径 | 范围 |
|------|------|------|
| Cloud Profile | `{configDir}/JType/cloud-profile.json` | 全局 |
| Vault Bindings | `{configDir}/JType/vault-bindings.json` | 全局 |
| Vault Settings | `{configDir}/JType/vault-settings.json` | 全局, per-vault key |
| Sync Bases | `{vaultPath}/.jtype/sync-base/` | per-vault |

---

### 2.6 Desktop — AppState

```typescript
// 已实现的 Actions
| { type: "SET_VAULT_SETTINGS"; settings: VaultSettings | null }
| { type: "DISCONNECT_WORKSPACE"; workspaceId: string; vaultPath: string; settings?: VaultSettings }

// DISCONNECT_WORKSPACE reducer:
// 1. 清除 vaultBindings 中匹配条目
// 2. syncStatus = "idle"
// 3. 清除 activeConflicts
// 4. wsConnected = false
// 5. vaultSettings.cloudSyncEnabled = false
```

---

### 2.7 Desktop — SyncPromptDialog

触发条件：
```typescript
const shouldShowSyncPrompt =
  state.mode === "workspace" &&
  !currentBinding &&                              // 无绑定
  state.vaultSettings?.cloudSyncEnabled !== false && // 未禁用
  !state.vaultSettings?.syncDisabledPermanently &&  // 未永久拒绝
  (!state.vaultSettings?.syncPromptDismissedAt ||   // 未 dismiss
    daysSince(state.vaultSettings.syncPromptDismissedAt) >= 7);
```

按钮行为：
- **开始同步**: OAuth 登录（如未登录）→ `autoCreateAndBindWorkspace()`
- **稍后再说**: 记录 `syncPromptDismissedAt`
- **不需要**: 记录 `syncDisabledPermanently: true`

---

### 2.8 Desktop — disconnectWorkspace()

```
用户点击 "断开连接"
  → unbind_cloud_workspace(workspaceId, vaultPath)
    → 删除 vault-bindings.json 条目
    → 删除 .jtype/sync-base/
  → save_vault_settings({ cloudSyncEnabled: false })
  → dispatch(DISCONNECT_WORKSPACE)
  → UI: 隐藏 sync 按钮
```

---

## 三、尚需实现的设计

### 3.1 Desktop — WebSocket 事件监听

`useCloudEvents.ts` 需要新增对以下事件的监听：

| 事件 | 处理 |
|------|------|
| `workspace:deleted` | 自动 `disconnectWorkspace()` → 提示用户 |
| `member:removed` | 检查是否是自己 → 自动断开 → 提示 |
| `member:role_changed` | 更新本地角色信息 |

### 3.2 Desktop — Sync 错误降级

在 `useCloudSync` 的 pull/push 失败时：
- 403 Forbidden → 可能已被移除 → 提示 + 提供断开按钮
- 404 Not Found → workspace 已删除 → 自动断开

### 3.3 Web — 邀请接受页

需新增：
- `GET /api/v1/workspace-invites/{token}` — 无需认证的邀请预览端点
- Web 路由 `/invites/:token` → `InviteAcceptPage` 组件
- 状态展示：pending → 接受按钮；accepted → 跳转；revoked/expired → 提示

### 3.4 Web — 成员管理 UI

在 Workspace 页面新增 Members section：
- 成员列表（角色、操作按钮）
- 邀请管理（创建、复制链接、撤销）
- Owner 可修改角色、转让所有权
- 非 Owner 可退出
- Owner 可删除 workspace（带影响摘要确认）

### 3.5 Desktop — cloneWorkspaceToLocal

AccountDialog workspace 列表增加"同步到新文件夹"按钮：
- 选择 workspace → 选择本地文件夹
- 创建 binding（`lastPulledClock: 0`）→ 全量 pull

---

## 四、幂等性与安全

| 操作 | 幂等设计 |
|------|----------|
| `unbind_cloud_workspace` | binding 不存在时静默返回 Ok |
| `leave_workspace` | 已 removed 返回 204 |
| `remove_member` | 已 removed 返回 204 |
| `delete_workspace` | 不存在返回 404 |
| `clear_sync_bases` | 目录不存在返回 Ok |

数据完整性：
- 切换 workspace 前必须 `clear_sync_bases()`
- 断开/删除操作绝不删除 `.md` 文件
- 被移除后 Server 403 → client 自动断开

---

## 五、无需数据库迁移

所有操作使用现有 schema：
- 列出/移除成员 → `workspace_members` 表
- 修改角色 → `UPDATE workspace_members SET role`
- 删除 workspace → `DELETE FROM workspaces` (CASCADE)
- 邀请过期检查 → `WHERE expires_at IS NULL OR expires_at > NOW()`

---

## 六、向后兼容

| 场景 | 处理 |
|------|------|
| 新 Desktop + 旧 Server (无 /members) | 降级：隐藏成员管理 UI |
| 旧 Desktop + 新 Server (新 WS 事件) | 忽略未知事件类型 |
| 新 Web + 旧 Server | 功能不可用时隐藏 UI |
