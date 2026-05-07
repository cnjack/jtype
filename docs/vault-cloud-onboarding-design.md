# Vault ↔ Cloud Workspace Onboarding — Architecture Design

> **版本**: v1.0  
> **日期**: 2026-05-07  
> **基于**: vault-cloud-onboarding-prd.md v1.0

---

## 一、现状分析摘要

### 已有基础设施

| 层 | 能力 | 状态 |
|----|------|------|
| **Server API** | workspace CRUD, invite create/revoke/accept, sync pull/push, trash, conflicts | ✅ 完整 |
| **Server Auth** | Session token + OAuth device flow + RBAC (owner/admin/editor/viewer) | ✅ 完整 |
| **Server WebSocket** | DocumentChanged / DocumentDeleted / DocumentTrashed 广播 | ✅ 基本事件 |
| **Server DB** | workspace_members(status enum), workspace_invites(token_hash), CASCADE 删除 | ✅ Schema 就绪 |
| **Desktop Sync** | Three-way merge, sync-bases, periodic + eager + event-driven sync | ✅ 完整 |
| **Desktop State** | CloudProfile, VaultBinding, SyncStatus, CloudWorkspaces | ✅ 基本 |
| **Desktop IPC** | load/save cloud profile, bind workspace, sync bases, trash metadata | ✅ 基本 |
| **Web Frontend** | Workspace editor, trash, publish, domains, offline sync, WebSocket | ✅ 基本 |

### 确认缺失的能力

| 能力 | Server | Desktop | Web |
|------|--------|---------|-----|
| 成员列表 GET /members | ❌ | ❌ | ❌ |
| 移除成员 POST /remove | ❌ | ❌ | ❌ |
| 退出 workspace POST /leave | ❌ | ❌ | ❌ |
| 删除 workspace DELETE | ❌ | ❌ | ❌ |
| 角色变更 PUT /members/{userId} | ❌ | ❌ | ❌ |
| 所有权转让 POST /transfer | ❌ | ❌ | ❌ |
| Unbind workspace (前端) | N/A | ❌ | N/A |
| Vault settings 持久化 | N/A | ❌ | N/A |
| SyncPromptDialog | N/A | ❌ | N/A |
| WebSocket: workspace:deleted | ❌ | ❌ | ❌ |
| WebSocket: member:removed | ❌ | ❌ | ❌ |
| Invite accept page (Web) | ✅ API | N/A | ❌ UI |
| Invite/member UI (Web) | ✅ API | ❌ | ❌ |
| 设备管理 UI | ✅ API | ❌ | ❌ |
| 切换 workspace 时清 sync-bases | N/A | ❌ (bug) | N/A |

---

## 二、架构设计

### 2.1 系统组件依赖图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Desktop App (Tauri 2)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐   ┌───────────────┐   ┌──────────────────────┐    │
│  │ VaultHome   │   │ AccountDialog │   │ SyncPromptDialog     │    │
│  │ (landing)   │   │ (cloud mgmt)  │   │ (onboarding modal)   │    │
│  └──────┬──────┘   └───────┬───────┘   └──────────┬───────────┘    │
│         │                   │                      │                  │
│  ┌──────┴───────────────────┴──────────────────────┴───────────┐    │
│  │                    AppState (Reducer)                         │    │
│  │  + vaultSettings: Record<path, VaultSettings>                │    │
│  │  + DISCONNECT_WORKSPACE action                               │    │
│  │  + WORKSPACE_DELETED action                                  │    │
│  │  + MEMBER_REMOVED action                                     │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                        │
│  ┌───────────────────────────┴───────────────────────────────────┐  │
│  │                      Hooks Layer                               │  │
│  ├───────────────┬───────────────┬───────────────┬───────────────┤  │
│  │useCloudSync   │useCloudEvents │usePeriodicSync│useEagerSync   │  │
│  │+disconnect()  │+workspace:del │               │               │  │
│  │+autoCreate()  │+member:removed│               │               │  │
│  │+cloneToLocal()│+member:role   │               │               │  │
│  └───────┬───────┴───────┬───────┴───────────────┴───────────────┘  │
│          │               │                                            │
│  ┌───────┴───────┐  ┌───┴────────────────────────────────────────┐  │
│  │ Tauri IPC     │  │ WebSocket (cloud:remote-change)            │  │
│  │ invoke()      │  │ + workspace:deleted                         │  │
│  │ bridge        │  │ + member:removed                            │  │
│  └───────┬───────┘  │ + member:role_changed                      │  │
│          │           │ + member:joined                             │  │
│          │           └───────────────────────────────────────────┘  │
├──────────┼──────────────────────────────────────────────────────────┤
│          │          Rust Backend (src-tauri/)                         │
│  ┌───────┴──────────────────────────────────────────────────────┐   │
│  │  lib.rs Commands                                              │   │
│  │  + unbind_cloud_workspace(workspace_id, vault_path)           │   │
│  │  + clear_sync_bases(vault_path)                               │   │
│  │  + save_vault_settings(vault_path, settings)                  │   │
│  │  + load_vault_settings(vault_path)                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │ HTTP + WS
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Web Service (Axum)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────── New Endpoints ──────────────────────────┐   │
│  │                                                               │   │
│  │  GET  /api/v1/workspaces/{id}/members                        │   │
│  │  POST /api/v1/workspaces/{id}/members/{userId}/remove        │   │
│  │  PUT  /api/v1/workspaces/{id}/members/{userId}               │   │
│  │  POST /api/v1/workspaces/{id}/leave                          │   │
│  │  POST /api/v1/workspaces/{id}/transfer                       │   │
│  │  DELETE /api/v1/workspaces/{id}                               │   │
│  │  GET  /api/v1/workspace-invites/{token}  (preview)           │   │
│  │  DELETE /api/v1/workspaces/{id}/sync/cursor                  │   │
│  │                                                               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌───────────────────── Hub Enhancement ────────────────────────┐   │
│  │  WorkspaceEvent (extended enum)                               │   │
│  │  + WorkspaceDeleted { workspace_id, deleted_by, deleted_at } │   │
│  │  + MemberRemoved { workspace_id, user_id, removed_by }       │   │
│  │  + MemberRoleChanged { workspace_id, user_id, new_role }     │   │
│  │  + MemberJoined { workspace_id, user_id, role }              │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌───────────────────── Handlers ───────────────────────────────┐   │
│  │  handlers/workspace.rs  (extended)                            │   │
│  │  handlers/member.rs     (new — member management)            │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  MySQL (existing schema, no migration needed for member ops)         │
│  workspace_members.status = 'removed' already supported              │
└─────────────────────────────────────────────────────────────────────┘
                              │ HTTP + WS
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Web Frontend                                      │
├─────────────────────────────────────────────────────────────────────┤
│  New Routes:                                                          │
│    /invites/:token           →  InviteAcceptPage                     │
│    /workspaces/:id/members   →  Workspace.tsx (new tab)              │
│                                                                       │
│  Enhanced:                                                            │
│    Workspace.tsx  →  成员管理 tab, 删除 workspace 按钮               │
│    api.ts         →  新 API 方法 (members, invite preview, etc)      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Server — New Handler: `handlers/member.rs`

**设计原则**：
- 新增独立模块 `member.rs` 管理成员生命周期
- 复用 `require_workspace_role()` 鉴权
- 所有写操作发布 WebSocket 事件

```rust
// handlers/member.rs

/// GET /api/v1/workspaces/{workspace_id}/members
/// 权限: owner | admin | editor | viewer (任何活跃成员)
/// 返回: Vec<MemberInfo> (user_id, username, role, status, joined_at)
pub async fn list_members(...)

/// POST /api/v1/workspaces/{workspace_id}/members/{user_id}/remove
/// 权限: owner | admin
/// 约束: 不能移除 owner; admin 不能移除 admin
/// 副作用: UPDATE status='removed', 广播 MemberRemoved
pub async fn remove_member(...)

/// POST /api/v1/workspaces/{workspace_id}/leave
/// 权限: 当前用户必须是 active 成员
/// 约束: owner 不能退出 (先转让); 最后一个 admin 不能退出
/// 副作用: UPDATE status='removed', 广播 MemberRemoved(self)
pub async fn leave_workspace(...)

/// PUT /api/v1/workspaces/{workspace_id}/members/{user_id}
/// 权限: owner (只有 owner 能改角色)
/// Body: { role: "admin" | "editor" | "viewer" }
/// 约束: 不能改自己; 不能设为 "owner" (用 transfer)
/// 副作用: UPDATE role, 广播 MemberRoleChanged
pub async fn update_member_role(...)

/// POST /api/v1/workspaces/{workspace_id}/transfer
/// 权限: owner only
/// Body: { new_owner_user_id: String }
/// 副作用: 旧 owner → admin, 新 owner → owner
pub async fn transfer_ownership(...)
```

**Response Types**：

```rust
#[derive(Serialize)]
pub struct MemberInfo {
    pub user_id: String,
    pub username: String,
    pub role: String,       // "owner" | "admin" | "editor" | "viewer"
    pub status: String,     // "active" | "invited" | "removed"
    pub joined_at: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateRoleRequest {
    pub role: String,
}

#[derive(Deserialize)]
pub struct TransferRequest {
    pub new_owner_user_id: String,
}
```

---

### 2.3 Server — Workspace Delete

```rust
// handlers/workspace.rs (extended)

/// DELETE /api/v1/workspaces/{workspace_id}
/// 权限: owner only
/// 流程:
///   1. 验证 caller 是 owner
///   2. 广播 WorkspaceDeleted 事件到 hub (在删除前, 因为删除后 channel 消失)
///   3. DELETE FROM workspaces WHERE id = ? (CASCADE 清理所有关联数据)
///   4. 返回 204
/// 注意: custom_domains.workspace_id 会被 SET NULL
pub async fn delete_workspace(...)
```

**删除前广播**的设计考量:
- DELETE CASCADE 后 WebSocket channel 的 subscriber 仍然有效（receiver 是独立于 DB 的）
- 广播必须在 DELETE 之前，确保 connected clients 能收到通知
- 广播后立即执行 DELETE，client 有短暂窗口可能收不到 → client 也需处理 404

---

### 2.4 Server — Hub Event Extension

```rust
// hub.rs (extended WorkspaceEvent enum)

pub enum WorkspaceEvent {
    // 已有
    DocumentChanged { ... },
    DocumentDeleted { ... },
    DocumentTrashed { ... },

    // 新增
    WorkspaceDeleted {
        workspace_id: String,
        deleted_by: String,     // username
        deleted_at: String,     // ISO 8601
    },
    MemberRemoved {
        workspace_id: String,
        user_id: String,
        removed_by: String,     // username (may == user_id for self-leave)
    },
    MemberRoleChanged {
        workspace_id: String,
        user_id: String,
        new_role: String,
    },
    MemberJoined {
        workspace_id: String,
        user_id: String,
        username: String,
        role: String,
    },
}
```

**序列化格式** (JSON over WebSocket):
```json
{ "type": "workspace:deleted", "workspaceId": "...", "deletedBy": "...", "deletedAt": "..." }
{ "type": "member:removed", "workspaceId": "...", "userId": "...", "removedBy": "..." }
{ "type": "member:role_changed", "workspaceId": "...", "userId": "...", "newRole": "..." }
{ "type": "member:joined", "workspaceId": "...", "userId": "...", "username": "...", "role": "..." }
```

---

### 2.5 Server — Invite Preview Endpoint

```rust
/// GET /api/v1/workspace-invites/{token}
/// 权限: 无需认证 (公开预览邀请信息)
/// 返回: InvitePreview { workspace_name, invited_by_username, role, expires_at, status }
/// 用途: Web 邀请接受页展示邀请详情
/// 安全: 不暴露 workspace_id 或 token_hash, 只展示用户可见信息
pub async fn preview_invite(...)

#[derive(Serialize)]
pub struct InvitePreview {
    pub workspace_name: String,
    pub workspace_slug: String,
    pub invited_by: String,      // username of inviter
    pub role: String,            // "admin" | "editor" | "viewer"
    pub expires_at: Option<String>,
    pub status: String,          // "pending" | "accepted" | "revoked" | "expired"
}
```

---

### 2.6 Desktop — Tauri Commands (Rust Backend)

#### 新增 Commands

```rust
// src-tauri/src/lib.rs (新注册)
// src-tauri/src/workspace.rs (实现)

/// 解除 vault 与 cloud workspace 的绑定
/// 1. 从 vault-bindings.json 中移除匹配条目
/// 2. 删除 .jtype/sync-base/ 整个目录 (确保无残留 base)
/// 3. 可选: 删除 .jtype/trash-metadata.json 的 cloud 相关字段
#[tauri::command]
pub fn unbind_cloud_workspace(workspace_id: String, vault_path: String) -> Result<(), String>

/// 清理 sync-bases (切换 workspace 时调用)
/// 仅删除 .jtype/sync-base/ 内容, 不影响 binding
#[tauri::command]
pub fn clear_sync_bases(vault_path: String) -> Result<(), String>

/// 保存 vault 本地设置
/// 存储路径: {configDir}/JType/vault-settings.json
/// 内容: HashMap<vaultPath, VaultSettings>
#[tauri::command]
pub fn save_vault_settings(vault_path: String, settings: VaultSettings) -> Result<(), String>

/// 加载 vault 本地设置
#[tauri::command]
pub fn load_vault_settings(vault_path: String) -> Result<Option<VaultSettings>, String>
```

#### VaultSettings 结构

```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct VaultSettings {
    pub cloud_sync_enabled: bool,          // true = 允许同步; false = 纯本地模式
    pub sync_prompt_dismissed_at: Option<String>,  // ISO 8601, 7天后可再提示
    pub sync_disabled_permanently: bool,    // 用户选择"不需要" → 永不自动提示
}
```

#### 存储位置设计

| 数据 | 路径 | 原因 |
|------|------|------|
| Cloud Profile | `{configDir}/JType/cloud-profile.json` | 全局, 跨 vault |
| Vault Bindings | `{configDir}/JType/vault-bindings.json` | 全局, 跨 vault |
| Vault Settings | `{configDir}/JType/vault-settings.json` | 全局, per-vault key |
| Sync Bases | `{vaultPath}/.jtype/sync-base/` | per-vault, 跟随文件 |
| Trash Metadata | `{vaultPath}/.jtype/trash-metadata.json` | per-vault |

---

### 2.7 Desktop — AppState Extension

```typescript
// 新增到 AppState
interface AppState {
  // ... 已有字段 ...

  // 新增
  vaultSettings: VaultSettings | null;     // 当前 vault 的设置
}

interface VaultSettings {
  cloudSyncEnabled: boolean;
  syncPromptDismissedAt: string | null;
  syncDisabledPermanently: boolean;
}

// 新增 Actions
type AppAction =
  | { type: "SET_VAULT_SETTINGS"; settings: VaultSettings | null }
  | { type: "DISCONNECT_WORKSPACE" }          // 清除 binding + sync state
  | { type: "WORKSPACE_DELETED"; workspaceId: string }  // 外部删除通知
  | { type: "MEMBER_REMOVED"; workspaceId: string }     // 被移除通知
  // ... 已有 actions ...
```

**DISCONNECT_WORKSPACE Reducer 逻辑**:
1. 清除 `vaultBindings` 中当前 vault 的绑定
2. 设置 `syncStatus = "idle"`
3. 清除 `activeConflicts`
4. 设置 `wsConnected = false`
5. 设置 `vaultSettings.cloudSyncEnabled = false`

---

### 2.8 Desktop — useCloudSync Extension

```typescript
// 新增方法

/** 断开当前 vault 的云同步 */
async function disconnectWorkspace(): Promise<void> {
  const binding = currentVaultBinding(state.vaultBindings, rootPath);
  if (!binding) return;

  // 1. 停止 WebSocket (通过 dispatch wsConnected=false)
  // 2. 调用 Tauri: unbind_cloud_workspace(binding.workspaceId, rootPath)
  // 3. 调用 Tauri: save_vault_settings(rootPath, { cloudSyncEnabled: false, ... })
  // 4. dispatch DISCONNECT_WORKSPACE
  // 5. 刷新 vault bindings from disk
}

/** 自动创建 workspace 并绑定 (J1 onboarding) */
async function autoCreateAndBindWorkspace(vaultName: string): Promise<void> {
  // 1. POST /api/v1/workspaces { name: vaultName }
  // 2. 创建 binding { workspaceId, lastPulledClock: 0, localVaultPath: rootPath }
  // 3. 保存 binding via Tauri
  // 4. 触发首次 syncWorkspaceToWeb()
  // 5. 保存 vaultSettings { cloudSyncEnabled: true }
}

/** 克隆远程 workspace 到本地 (J3 cloud-first) */
async function cloneWorkspaceToLocal(workspaceId: string, localPath: string): Promise<void> {
  // 1. 创建 binding { workspaceId, lastPulledClock: 0, localVaultPath: localPath }
  // 2. 执行 pullOnly() (since_clock=0 = 全量拉取)
  // 3. 保存 vaultSettings { cloudSyncEnabled: true }
}
```

---

### 2.9 Desktop — useCloudEvents Extension

```typescript
// 新增事件处理

// WebSocket 新事件类型
"workspace:deleted"   → dispatch WORKSPACE_DELETED → 自动断开绑定 → 提示用户
"member:removed"      → 检查是否是自己 → dispatch MEMBER_REMOVED → 自动断开绑定
"member:role_changed" → 更新 CloudWorkspace 列表中的角色
"member:joined"       → 可选: 显示通知

// 403/404 错误降级处理 (在 sync pull/push 失败时)
// 如果 sync 返回 403 Forbidden:
//   → 可能已被移除 → 提示 "你已被移除出此 workspace"
//   → 提供 "断开连接" 按钮
// 如果 sync 返回 404 Not Found:
//   → workspace 可能已删除 → 提示 "Workspace 已被删除"
//   → 自动断开绑定
```

---

### 2.10 Desktop — SyncPromptDialog (新组件)

```
┌──────────────────────────────────────────────┐
│                                              │
│  ☁️  将 "My Notes" 同步到云端？             │
│                                              │
│  同步后可以：                                 │
│  • 在多设备间实时同步                         │
│  • 通过 Web 端随时访问                        │
│  • 邀请他人协作                               │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 开始同步  │  │ 稍后再说  │  │  不需要   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

**触发条件**:
```typescript
const shouldShowSyncPrompt = 
  state.mode === "workspace" &&
  !currentBinding &&                              // 无绑定
  state.vaultSettings?.cloudSyncEnabled !== false && // 未禁用
  !state.vaultSettings?.syncDisabledPermanently &&  // 未永久拒绝
  (!state.vaultSettings?.syncPromptDismissedAt ||   // 未 dismiss
    daysSince(state.vaultSettings.syncPromptDismissedAt) >= 7);  // 或已过 7 天
```

**按钮行为**:
| 按钮 | 动作 |
|------|------|
| 开始同步 | 检测登录 → 未登录则 OAuth → 已登录则 `autoCreateAndBindWorkspace()` |
| 稍后再说 | `save_vault_settings({ syncPromptDismissedAt: now() })` |
| 不需要 | `save_vault_settings({ syncDisabledPermanently: true, cloudSyncEnabled: false })` |

---

### 2.11 Desktop — Workspace 切换安全保障 (J10 Bug Fix)

**当前 bug**: `bindWorkspace()` 在 AccountDialog 中直接覆盖 binding，不清理旧 sync-bases。

**修复方案** — 在 binding 逻辑中增加保护：

```typescript
async function switchWorkspace(newWorkspaceId: string) {
  const rootPath = state.workspace.rootPath;
  const oldBinding = currentVaultBinding(state.vaultBindings, rootPath);

  // 1. 预检查: 是否有未推送修改
  if (oldBinding) {
    const bases = await tauri.loadSyncBases(rootPath);
    const localDocs = await tauri.collectSyncDocuments(rootPath);
    const hasUnpushed = localDocs.some(doc => {
      const base = bases[doc.relativePath];
      return base && base !== doc.content;
    });
    if (hasUnpushed) {
      // 返回 false, UI 提示用户先同步
      throw new Error("UNPUSHED_CHANGES");
    }
  }

  // 2. 清理旧 sync-bases (P0 关键步骤)
  await tauri.clearSyncBases(rootPath);

  // 3. 更新 binding (lastPulledClock: 0 触发全量 pull)
  const newBinding = {
    workspaceId: newWorkspaceId,
    localVaultPath: rootPath,
    lastPulledClock: 0,
    // ... other fields
  };

  // 4. 保存 + 触发全量 sync
  await tauri.bindCloudWorkspace(newBinding);
  dispatch({ type: "SET_VAULT_BINDINGS", bindings: await tauri.listVaultBindings() });
  await pullOnly(); // 全量拉取新 workspace 内容
}
```

---

### 2.12 Web Frontend — InviteAcceptPage

```
Route: /invites/:token

Flow:
  1. GET /api/v1/workspace-invites/{token} → InvitePreview
  2. 展示邀请信息: workspace name, inviter, role
  3. 检查状态:
     - "pending" → 显示 [接受邀请] 按钮
     - "accepted" → 显示 "已接受" + 跳转 workspace
     - "revoked" → 显示 "邀请已撤销"
     - "expired" → 显示 "邀请已过期"
  4. 未登录 → 显示登录提示, 登录后自动返回此页
  5. POST /api/v1/workspace-invites/{token}/accept → 跳转 workspace
```

---

### 2.13 Web Frontend — 成员管理 UI

在 Workspace.tsx 中新增 "Members" section:

```
┌─────────────────────────────────────────────────┐
│ Members (3)                          [Invite +] │
├─────────────────────────────────────────────────┤
│ 👤 alice     owner    -                         │
│ 👤 bob       editor   [Role ▼] [Remove]        │
│ 👤 charlie   viewer   [Role ▼] [Remove]        │
├─────────────────────────────────────────────────┤
│ Pending Invites (1)                             │
│ ✉️  dave@example.com  editor  [Revoke]         │
└─────────────────────────────────────────────────┘
```

---

### 2.14 Sync Guard — 防止已断开/被移除后的无效请求

**策略**: 在 `useCloudSync.syncWorkspaceToWeb()` 和 `pullOnly()` 中增加错误处理:

```typescript
try {
  const response = await fetch(pullUrl, { ... });
  if (response.status === 403) {
    // 可能已被移除
    dispatch({ type: "MEMBER_REMOVED", workspaceId: binding.workspaceId });
    await disconnectWorkspace();
    showNotification("你已失去此 workspace 的访问权限");
    return;
  }
  if (response.status === 404) {
    // Workspace 已被删除
    dispatch({ type: "WORKSPACE_DELETED", workspaceId: binding.workspaceId });
    await disconnectWorkspace();
    showNotification("Workspace 已被删除，本地文件已保留");
    return;
  }
} catch (e) { ... }
```

---

### 2.15 数据流图 — 断开连接

```
用户点击 "断开连接"
    │
    ▼
AccountDialog → useCloudSync.disconnectWorkspace()
    │
    ├─► Tauri: unbind_cloud_workspace(workspaceId, vaultPath)
    │       ├─ 从 vault-bindings.json 删除条目
    │       └─ rm -rf {vaultPath}/.jtype/sync-base/
    │
    ├─► Tauri: save_vault_settings(vaultPath, { cloudSyncEnabled: false })
    │
    ├─► dispatch(DISCONNECT_WORKSPACE)
    │       ├─ state.vaultBindings = filtered
    │       ├─ state.syncStatus = "idle"
    │       ├─ state.activeConflicts = []
    │       └─ state.wsConnected = false
    │
    └─► UI 更新: 隐藏 sync 按钮, 显示本地模式标识
```

---

### 2.16 数据流图 — 删除 Workspace

```
Owner 点击 "删除 Workspace" (Web 或 Desktop)
    │
    ▼
DELETE /api/v1/workspaces/{id}
    │
    ├─► Server 验证: 调用者是 owner
    │
    ├─► Server 广播: hub.publish(workspace_id, WorkspaceDeleted { ... })
    │       │
    │       ├─► Desktop Client A (WebSocket)
    │       │       → 收到 workspace:deleted
    │       │       → dispatch WORKSPACE_DELETED
    │       │       → 自动 disconnectWorkspace()
    │       │       → 提示 "Workspace 已被删除"
    │       │
    │       └─► Web Client B (WebSocket)
    │               → 收到 workspace:deleted
    │               → 显示提示 → 跳转 /dashboard
    │
    └─► Server 执行: DELETE FROM workspaces WHERE id = ?
            → CASCADE: members, documents, versions, trash, cursors, invites
            → SET NULL: custom_domains.workspace_id
```

---

## 三、安全性设计

### 3.1 权限矩阵

| 操作 | Owner | Admin | Editor | Viewer |
|------|-------|-------|--------|--------|
| 查看成员列表 | ✅ | ✅ | ✅ | ✅ |
| 邀请成员 | ✅ | ✅ | ❌ | ❌ |
| 撤销邀请 | ✅ | ✅ | ❌ | ❌ |
| 移除成员 | ✅ | ✅* | ❌ | ❌ |
| 修改角色 | ✅ | ❌ | ❌ | ❌ |
| 转让所有权 | ✅ | ❌ | ❌ | ❌ |
| 删除 workspace | ✅ | ❌ | ❌ | ❌ |
| 退出 workspace | ❌** | ✅ | ✅ | ✅ |

\* Admin 只能移除 editor/viewer, 不能移除其他 admin/owner
\** Owner 不能退出, 必须先转让

### 3.2 幂等性保障

| 操作 | 幂等设计 |
|------|----------|
| `unbind_cloud_workspace` | 如果 binding 不存在, 静默返回 Ok |
| `leave_workspace` | 如果已是 'removed' 状态, 返回 204 (幂等) |
| `remove_member` | 如果已是 'removed', 返回 204 |
| `delete_workspace` | 如果不存在, 返回 404 (幂等安全) |
| `clear_sync_bases` | 如果目录不存在, 返回 Ok |

### 3.3 数据完整性

| 风险 | 保护措施 |
|------|----------|
| 切换 workspace 时旧 base 残留 | `clear_sync_bases()` 必须在重绑定前调用 |
| 删除后本地文件丢失 | 所有断开/删除操作**绝不删除 .md 文件** |
| 并发 disconnect + sync | 使用 `syncingRef` 互斥; disconnect 先设 flag 再清理 |
| 被移除后继续 push | Server 403 → client 自动断开 |

---

## 四、不需要数据库迁移的操作

以下操作仅使用**已有 schema**:

| 操作 | 使用的现有字段/表 |
|------|-------------------|
| 列出成员 | `SELECT * FROM workspace_members WHERE workspace_id = ? AND status = 'active'` |
| 移除成员 | `UPDATE workspace_members SET status = 'removed' WHERE ...` |
| 退出 workspace | 同上 (self-remove) |
| 修改角色 | `UPDATE workspace_members SET role = ? WHERE ...` |
| 转让所有权 | `UPDATE workspace_members SET role = 'owner'/'admin' WHERE ...` |
| 删除 workspace | `DELETE FROM workspaces WHERE id = ?` (CASCADE) |
| 邀请过期检查 | `WHERE expires_at IS NULL OR expires_at > NOW()` |
| 邀请预览 | `SELECT ... FROM workspace_invites JOIN workspaces JOIN users` |
| 删除设备 cursor | `DELETE FROM workspace_sync_cursors WHERE workspace_id = ? AND device_id = ?` |

**结论**: Phase 1 不需要新的数据库迁移文件。所有操作在现有 schema 上即可完成。

---

## 五、测试策略

### 5.1 Integration Tests (新增)

| 文件 | 测试用例 |
|------|----------|
| `tests/member_tests.rs` | list_members, remove_member, remove_self_forbidden, leave_workspace, owner_cannot_leave, role_change, transfer_ownership |
| `tests/workspace_tests.rs` (扩展) | delete_workspace_as_owner, delete_workspace_as_non_owner_403, cascade_verified |
| `tests/invite_tests.rs` (扩展) | preview_invite_public, expired_invite_rejected |

### 5.2 Desktop E2E (新增场景)

| 场景 | 验证点 |
|------|--------|
| Sync prompt on new vault | Dialog 显示 → 点击"开始同步" → 创建 workspace → 首次 sync |
| Disconnect workspace | 点击断开 → binding 消失 → sync 停止 → 文件保留 |
| Workspace deleted externally | 模拟 WS 事件 → 自动断开 → 提示信息 |
| Switch workspace | 旧 sync-bases 清除 → 全量 pull |

---

## 六、向后兼容

| 场景 | 处理 |
|------|------|
| 新 Desktop + 旧 Server (无 /members) | API 调用失败 → 优雅降级: 隐藏成员管理 UI |
| 旧 Desktop + 新 Server (新 WS 事件) | 忽略未知事件类型 (现有代码已具备此能力) |
| 新 Web + 旧 Server | 同 Desktop 策略, 功能不可用时隐藏对应 UI |

---
