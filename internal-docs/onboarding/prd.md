# Vault ↔ Cloud Workspace Onboarding PRD

> **版本**: v2.0（基于实现状态修订）  
> **日期**: 2026-05-11  
> **范围**: Desktop (Tauri) + Web Service (Axum) + Web Frontend

---

## 一、背景

JType 支持本地 vault（Markdown 文件夹）与 cloud workspace（服务端协作空间）的双向同步。本文档描述已实现的 onboarding 与生命周期功能，以及尚需完善的部分。

---

## 二、用户旅程

```
┌───────────────────┬─────────────────┬─────────────────────────┐
│   本地优先路径     │   云端优先路径   │     协作路径             │
├───────────────────┼─────────────────┼─────────────────────────┤
│ J1 创建 vault     │ J3 Web 创建     │ J6 接受邀请              │
│    → 同步创建云   │    workspace    │    → 绑定本地 vault      │
│                   │    → 同步到本地  │                         │
│ J2 纯本地使用     │ J5 纯 Web 使用  │ J7 成员移除/退出         │
│                   │                 │                         │
│ J4 断开云同步     │ J9 删除 workspace│ J8 多设备同步           │
│                   │                 │                         │
│ J10 重绑定/切换   │                 │                         │
└───────────────────┴─────────────────┴─────────────────────────┘
```

---

## 三、旅程实现状态

### J1: 创建本地 Vault → 自动创建 Cloud Workspace ✅

**已实现**:
- VaultHome 检测 vault 无 cloud 绑定时弹出 `SyncPromptDialog`
- 三个按钮："开始同步"（触发 OAuth 登录 → 创建 workspace → 绑定 → 首次 sync）、"稍后再说"（记录 `syncPromptDismissedAt`，7 天后再提醒）、"不需要"（记录 `syncDisabledPermanently`）
- `useCloudSync.autoCreateAndBindWorkspace()` 实现完整流程
- Tauri 命令 `save_vault_settings` / `load_vault_settings` 持久化 vault 设置

**边界条件**:
- OAuth 取消/拒绝：退回 VaultHome，可手动重试
- Workspace 名称冲突：提示绑定已有
- 网络离线：存储同步意图，联网后重试

---

### J2: 纯本地使用 ✅

**已实现**:
- Vault Settings 持久化（`vault-settings.json`），包含 `cloudSyncEnabled` 字段
- `isSyncEnabled` 逻辑正确排除 `cloudSyncEnabled === false` 的 vault
- 从 J4（断开连接）可转换到纯本地模式

**未实现**:
- Header 本地模式图标标识（FolderIcon vs CloudIcon）
- "Sync now" 按钮在本地模式下的隐藏

---

### J3: Web 创建 Workspace → 同步到本地 ⚠️ 部分

**已实现**:
- 桌面端登录同账号后，Account Dialog 可查看 workspace 列表并绑定
- 首次 pull（`lastPulledClock: 0`）全量拉取

**未实现**:
- `cloneWorkspaceToLocal()` 方法（"同步到新文件夹"按钮）
- Web 端"在桌面端打开"引导
- Sync Pull 分页（大型 workspace 首次同步）

---

### J4: 断开 Cloud Workspace（Unbind）✅

**已实现**:
- Tauri 命令 `unbind_cloud_workspace`：删除 binding + 清理 `.jtype/sync-base/`
- `useCloudSync.disconnectWorkspace()` 方法
- AccountDialog "断开连接"按钮
- AppState `DISCONNECT_WORKSPACE` action

---

### J5: 纯 Web 使用 ⚠️ 基本可用

**已实现**: 注册/登录、workspace CRUD、文档 CRUD、Markdown 编辑、文档状态管理、回收站、发布站点 + 自定义域名、邀请成员、角色权限控制

**未实现**: 文件夹管理 UI、批量操作、全文搜索、快速导航

---

### J6: 接受邀请 → 绑定本地 Vault ⚠️ 部分

**已实现**:
- 邀请创建/接受/撤销 API
- 接受邀请后 `MemberJoined` WebSocket 广播

**未实现**:
- Web 邀请接受页面（`/invites/:token` 路由 + UI）
- 邀请预览端点（`GET /workspace-invites/:token` 无需认证的预览）
- Desktop 端邀请入口（待处理邀请列表）
- 邮件通知

---

### J7: 成员移除 / 退出 Workspace ✅

**已实现（Server）**:
- `GET /api/v1/workspaces/{id}/members` — 列出活跃成员
- `POST /api/v1/workspaces/{id}/members/{userId}/remove` — 移除成员（owner/admin）
- `POST /api/v1/workspaces/{id}/leave` — 主动退出
- `PUT /api/v1/workspaces/{id}/members/{userId}` — 修改角色
- `POST /api/v1/workspaces/{id}/transfer` — 转让所有权
- `MemberRemoved` / `MemberRoleChanged` WebSocket 广播

**未实现（Frontend）**:
- Desktop 端：useCloudEvents 未监听 `member:removed` / `member:role_changed` 事件
- Desktop 端：sync 错误降级（403 → 被移除，404 → 已删除）
- Web 端：成员管理 UI（列表、移除、角色修改）

---

### J8: 多设备同步 ✅ 基础机制

**已实现**: Device ID 生成、每设备独立 cursor、并行同步、WebSocket per-device、三路合并冲突处理

**未实现**: 设备管理 UI、设备强制登出

---

### J9: 删除 Workspace ✅ Server

**已实现（Server）**:
- `DELETE /api/v1/workspaces/{id}` — owner only，CASCADE 删除
- `WorkspaceDeleted` WebSocket 广播（在 DELETE 前发出）

**未实现（Frontend）**:
- Desktop 端：useCloudEvents 未监听 `workspace:deleted` 事件
- Web 端：删除 workspace UI（确认对话框 + 影响摘要）
- 导出 ZIP 功能

---

### J10: 重绑定 / 切换 Workspace ✅

**已实现**:
- Tauri 命令 `clear_sync_bases` — 切换前清理旧 sync-bases
- 切换时 `lastPulledClock: 0` 触发全量 pull

**未实现**:
- dirty 状态检查（有未推送修改时禁止切换）

---

## 四、新增 WebSocket 事件（已实现）

| 事件 | Payload | 触发场景 |
|------|---------|---------|
| `workspace:deleted` | `{ workspaceId }` | Owner 删除 workspace |
| `member:removed` | `{ workspaceId, userId, removedBy }` | 管理员移除成员 |
| `member:role_changed` | `{ workspaceId, userId, newRole }` | 角色变更 |
| `member:joined` | `{ workspaceId, userId, username, role }` | 新成员加入 |

---

## 五、优先级排序（剩余工作）

### P0: 基础闭环缺口
1. Desktop 监听 `workspace:deleted` / `member:removed` WebSocket 事件 → 自动断开
2. Sync 错误降级：403 → 被移除提示；404 → 已删除提示
3. 切换 workspace 前检查 dirty 状态

### P1: 协作增强
4. Web 邀请接受页面（`/invites/:token`）
5. Web 成员管理 UI
6. Web 删除 workspace UI
7. Desktop "同步到新文件夹"（`cloneWorkspaceToLocal`）
8. 设备管理 UI

### P2: 体验优化
9. Header 本地模式图标标识
10. Web 文件夹管理 UI
11. 导出 workspace ZIP

---

## 六、非功能性要求

| 维度 | 要求 |
|------|------|
| 数据安全 | 所有断开/删除操作保留本地 `.md` 文件（local-first 原则） |
| 幂等性 | 重复调用 disconnect/leave 不报错 |
| 离线友好 | 离线时同步意图存储本地，联网后执行 |
| 权限校验 | 成员管理操作验证 owner/admin 角色 |
| 向后兼容 | 新版 App 连旧版 Server 时优雅降级；旧 App 忽略未知 WS 事件 |

---

## 七、权限矩阵

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

\* Admin 只能移除 editor/viewer  
\** Owner 必须先转让所有权
