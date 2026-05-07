# Vault ↔ Cloud Workspace Onboarding — Implementation Plan

> **版本**: v1.0  
> **日期**: 2026-05-07  
> **依赖**: vault-cloud-onboarding-design.md

---

## Phase 1: 基础闭环 (P0)

> **目标**: 用户能完成"创建 → 同步 → 断开"的完整生命周期  
> **前置发现**: 现有 schema 完全够用, 不需要 DB migration

---

### Sprint 1.1: Server — 成员管理 + Workspace 删除

| # | Task | 文件 | 依赖 | 验收标准 |
|---|------|------|------|----------|
| 1.1.1 | 创建 `handlers/member.rs` — `list_members` | `services/jtype-web/src/handlers/member.rs` | 无 | `GET /workspaces/{id}/members` 返回活跃成员列表 |
| 1.1.2 | 实现 `remove_member` | 同上 | 1.1.1 | Owner/Admin 可移除 editor/viewer; 移除 owner 返回 403 |
| 1.1.3 | 实现 `leave_workspace` | 同上 | 1.1.1 | 非 owner 可退出; owner 退出返回 403 |
| 1.1.4 | 实现 `delete_workspace` | `handlers/workspace.rs` | 无 | Owner 可删除; CASCADE 验证; 非 owner 403 |
| 1.1.5 | 注册路由到 router | `lib.rs` | 1.1.1-1.1.4 | 所有新端点可访问 |
| 1.1.6 | 编写集成测试 `member_tests.rs` | `tests/member_tests.rs` | 1.1.5 | 覆盖正常流 + 权限拒绝 + 幂等性 |
| 1.1.7 | 扩展 workspace_tests.rs — delete 场景 | `tests/workspace_tests.rs` | 1.1.4 | 删除 cascade 验证 |

**预计改动**:
- 新增文件: `handlers/member.rs`, `tests/member_tests.rs`
- 修改文件: `handlers/mod.rs`, `lib.rs`, `handlers/workspace.rs`, `tests/workspace_tests.rs`

---

### Sprint 1.2: Server — WebSocket 事件扩展

| # | Task | 文件 | 依赖 | 验收标准 |
|---|------|------|------|----------|
| 1.2.1 | 扩展 `WorkspaceEvent` enum | `hub.rs` | 无 | 新增 4 种事件类型; 序列化/反序列化正确 |
| 1.2.2 | `remove_member` 触发 `MemberRemoved` 广播 | `handlers/member.rs` | 1.1.2, 1.2.1 | 被移除用户的 WS 连接收到事件 |
| 1.2.3 | `delete_workspace` 触发 `WorkspaceDeleted` 广播 | `handlers/workspace.rs` | 1.1.4, 1.2.1 | 所有连接收到事件 (在 DELETE 前) |
| 1.2.4 | `accept_invite` 触发 `MemberJoined` 广播 | `handlers/workspace.rs` | 1.2.1 | 成员列表实时更新 |

**预计改动**:
- 修改文件: `hub.rs`, `handlers/member.rs`, `handlers/workspace.rs`

---

### Sprint 1.3: Desktop — Unbind + Sync-Bases 清理 (Bug Fix)

| # | Task | 文件 | 依赖 | 验收标准 |
|---|------|------|------|----------|
| 1.3.1 | 实现 `unbind_cloud_workspace` Tauri command | `src-tauri/src/workspace.rs` | 无 | 从 bindings.json 删除 + 清理 .jtype/sync-base/ |
| 1.3.2 | 实现 `clear_sync_bases` Tauri command | `src-tauri/src/workspace.rs` | 无 | 仅清理 .jtype/sync-base/ 目录 |
| 1.3.3 | 注册新 commands 到 Tauri builder | `src-tauri/src/lib.rs` | 1.3.1-1.3.2 | invoke 可调用 |
| 1.3.4 | `useCloudSync` 新增 `disconnectWorkspace()` | `src/hooks/useCloudSync.ts` | 1.3.1 | 调用 Tauri unbind → 更新 state |
| 1.3.5 | AccountDialog 新增"断开连接"按钮 | `src/components/modals/AccountDialog.tsx` | 1.3.4 | 已绑定时显示 LinkSlashIcon 按钮; 确认后断开 |
| 1.3.6 | 修复 workspace 切换: 绑定前清理 sync-bases | `src/hooks/useCloudSync.ts` 或 AccountDialog | 1.3.2 | 切换前 clear_sync_bases → lastPulledClock=0 |
| 1.3.7 | 切换时禁止 dirty 状态 | 同上 | 1.3.6 | 有未 push 修改时 UI 提示"请先同步" |

**预计改动**:
- 修改文件: `src-tauri/src/workspace.rs`, `src-tauri/src/lib.rs`, `useCloudSync.ts`, `AccountDialog.tsx`

---

### Sprint 1.4: Desktop — 断开/删除事件处理

| # | Task | 文件 | 依赖 | 验收标准 |
|---|------|------|------|----------|
| 1.4.1 | AppState 新增 DISCONNECT_WORKSPACE action | `src/app/AppState.tsx` | 无 | Reducer 清除 binding + sync state |
| 1.4.2 | AppState 新增 WORKSPACE_DELETED / MEMBER_REMOVED | `src/app/AppState.tsx` | 1.4.1 | 触发 disconnect 逻辑 |
| 1.4.3 | useCloudEvents 监听新 WebSocket 事件 | `src/hooks/useCloudEvents.ts` | 1.2.1, 1.4.2 | workspace:deleted → 自动断开 + 提示 |
| 1.4.4 | Sync 错误降级: 403 → 被移除; 404 → 已删除 | `src/hooks/useCloudSync.ts` | 1.4.2, 1.3.4 | sync 失败时优雅处理而非报错 |
| 1.4.5 | 用户通知 UI (toast/inline 提示) | `src/components/` | 1.4.3-1.4.4 | 断开原因清晰告知用户 |

**预计改动**:
- 修改文件: `AppState.tsx`, `useCloudEvents.ts`, `useCloudSync.ts`
- 可能新增: notification/toast 组件 (如无现有)

---

### Sprint 1.5: Desktop — SyncPromptDialog (Onboarding)

| # | Task | 文件 | 依赖 | 验收标准 |
|---|------|------|------|----------|
| 1.5.1 | 实现 `save_vault_settings` / `load_vault_settings` Tauri commands | `src-tauri/src/workspace.rs`, `lib.rs` | 无 | 读写 vault-settings.json |
| 1.5.2 | AppState 新增 vaultSettings + SET_VAULT_SETTINGS | `src/app/AppState.tsx` | 1.5.1 | |
| 1.5.3 | useCloudSync 新增 `autoCreateAndBindWorkspace()` | `src/hooks/useCloudSync.ts` | 1.5.1 | 创建 ws → 绑定 → 首次 sync |
| 1.5.4 | 创建 `SyncPromptDialog.tsx` | `src/components/modals/SyncPromptDialog.tsx` | 1.5.2-1.5.3 | 三按钮: 开始/稍后/不需要 |
| 1.5.5 | VaultHome 触发 SyncPromptDialog | `src/components/layout/VaultHome.tsx` | 1.5.4 | 条件匹配时自动弹出 |
| 1.5.6 | isSyncEnabled guard 增加 vaultSettings 检查 | `useCloudSync.ts` / `usePeriodicSync.ts` | 1.5.2 | cloudSyncEnabled=false 时不触发 sync |

**预计改动**:
- 新增文件: `src/components/modals/SyncPromptDialog.tsx`
- 修改文件: `src-tauri/src/workspace.rs`, `src-tauri/src/lib.rs`, `AppState.tsx`, `useCloudSync.ts`, `VaultHome.tsx`, `usePeriodicSync.ts`

---

## Phase 2: 协作增强 (P1)

> **目标**: 邀请流程完整可用, 角色管理, 多设备管理

---

### Sprint 2.1: Web — 邀请接受页

| # | Task | 文件 | 依赖 | 验收标准 |
|---|------|------|------|----------|
| 2.1.1 | Server: `GET /workspace-invites/{token}` 预览端点 | `handlers/workspace.rs` | 无 | 无需 auth, 返回邀请摘要 |
| 2.1.2 | Server: 邀请过期检查 (accept 时校验 expires_at) | `handlers/workspace.rs` | 无 | 过期邀请 accept 返回 400 |
| 2.1.3 | Web api.ts: 新增 previewInvite / acceptInvite | `frontend/src/api.ts` | 2.1.1 | |
| 2.1.4 | Web: 创建 InviteAcceptPage | `frontend/src/pages/InviteAcceptPage.tsx` | 2.1.3 | 展示邀请信息 + 接受按钮 |
| 2.1.5 | Web: 路由注册 `/invites/:token` | `frontend/src/main.tsx` | 2.1.4 | 路由可访问 |
| 2.1.6 | 集成测试: invite_tests 扩展 | `tests/invite_tests.rs` | 2.1.1-2.1.2 | 覆盖预览 + 过期检查 |

---

### Sprint 2.2: Web — 成员管理 UI

| # | Task | 文件 | 依赖 | 验收标准 |
|---|------|------|------|----------|
| 2.2.1 | Web api.ts: listMembers, removeMember, updateRole, createInvite, revokeInvite | `frontend/src/api.ts` | Sprint 1.1 | |
| 2.2.2 | Web Workspace.tsx: Members section (列表 + 操作) | `frontend/src/pages/Workspace.tsx` | 2.2.1 | Owner/Admin 可见操作按钮 |
| 2.2.3 | Web Workspace.tsx: Invite 管理 (创建 + 撤销) | 同上 | 2.2.1 | 生成链接 + 复制到剪贴板 |
| 2.2.4 | Web: Leave workspace 按钮 (非 owner) | 同上 | 2.2.1 | 确认后退出 + 跳转 dashboard |
| 2.2.5 | Web: Delete workspace (owner only) | 同上 | Sprint 1.1 | 确认对话框 + 影响摘要 |

---

### Sprint 2.3: Server — 角色管理 + 所有权转让

| # | Task | 文件 | 依赖 | 验收标准 |
|---|------|------|------|----------|
| 2.3.1 | `update_member_role` 端点 | `handlers/member.rs` | Sprint 1.1 | Owner 可改 admin/editor/viewer |
| 2.3.2 | `transfer_ownership` 端点 | `handlers/member.rs` | Sprint 1.1 | 旧 owner → admin; 新 owner → owner |
| 2.3.3 | 集成测试 | `tests/member_tests.rs` | 2.3.1-2.3.2 | 权限矩阵全覆盖 |

---

### Sprint 2.4: Desktop — 设备管理 + 云端优先路径

| # | Task | 文件 | 依赖 | 验收标准 |
|---|------|------|------|----------|
| 2.4.1 | AccountDialog: 设备列表 tab | `AccountDialog.tsx` | 已有 GET /me/devices | 展示 device_id + 最后同步时间 |
| 2.4.2 | Server: DELETE /workspaces/{id}/sync/cursor | `handlers/sync.rs` | 无 | 删除指定设备 cursor |
| 2.4.3 | AccountDialog: workspace 列表增强 "同步到新文件夹" | `AccountDialog.tsx` | 无 | 选择 workspace → 选择本地文件夹 → clone |
| 2.4.4 | useCloudSync: `cloneWorkspaceToLocal()` | `useCloudSync.ts` | 无 | 创建 binding → pull since 0 |
| 2.4.5 | 成员管理面板 (Desktop AccountDialog) | `AccountDialog.tsx` | Sprint 1.1 | 展示成员列表 + 操作按钮 |

---

## Phase 3: 体验优化 (P2)

> **目标**: 边缘场景覆盖, UX 打磨

---

### Sprint 3.1: Vault 本地模式 UI

| # | Task | 说明 |
|---|------|------|
| 3.1.1 | Header.tsx: 本地模式标识 (FolderIcon vs CloudIcon) | cloudSyncEnabled=false 时切换图标 |
| 3.1.2 | Header.tsx: 隐藏 "Sync now" 按钮 (本地模式) | |
| 3.1.3 | AccountDialog: "开启云同步" 入口 (本地模式) | 复用 J1 流程 |

---

### Sprint 3.2: Web 功能补全

| # | Task | 说明 |
|---|------|------|
| 3.2.1 | Web: 文件夹管理 (创建/重命名/删除) | API 已支持 path 含 /; 前端需 UI |
| 3.2.2 | Web: 批量操作 (多选删除/移动) | |
| 3.2.3 | Web: 全文搜索 | 需 Server 新端点 |
| 3.2.4 | Web: Workspace 导出 ZIP | 需 Server 新端点 |

---

### Sprint 3.3: 高级协作

| # | Task | 说明 |
|---|------|------|
| 3.3.1 | Server: 所有权转让 (如未在 Phase 2 完成) | |
| 3.3.2 | Server: 设备强制登出 (revoke device token) | |
| 3.3.3 | Web: 邀请管理 UI (待处理列表, 复制链接, 撤销) | |
| 3.3.4 | Desktop: Sync Pull 分页 (大型 workspace) | |

---

## 执行顺序与依赖关系

```
Sprint 1.1 (Server: Members + Delete)  ──────────┐
Sprint 1.2 (Server: WS Events)  ─────────────────┤
                                                   │
Sprint 1.3 (Desktop: Unbind + BugFix)  ───────────┼──► Sprint 1.4 (Desktop: Event Handling)
                                                   │
Sprint 1.5 (Desktop: SyncPrompt)  ────────────────┘

Sprint 1.1 ──► Sprint 2.1 (Web: Invite Page)
Sprint 1.1 ──► Sprint 2.2 (Web: Member UI)
Sprint 1.1 ──► Sprint 2.3 (Server: Roles + Transfer)
Sprint 1.4 ──► Sprint 2.4 (Desktop: Devices + Clone)

Sprint 2.* ──► Sprint 3.* (Polish)
```

**并行度**: 
- Sprint 1.1 和 1.3 可并行 (Server 和 Desktop 独立)
- Sprint 1.2 可在 1.1 完成后立即开始
- Sprint 1.5 独立于 1.1/1.2, 可并行

---

## 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 广播先于 DELETE 执行，但 client 未收到 | 少数 client 通过 404 降级发现 | Sprint 1.4 同时实现 WS 事件 + HTTP 错误降级 |
| SyncPromptDialog 在大量文件 vault 中首次 sync 很慢 | 用户体验差 | 显示进度指示器; 异步执行不阻塞 UI |
| 切换 workspace 时本地有修改但用户不理解 | 数据困惑 | 明确提示"请先同步", 禁止 dirty 切换 |
| 多设备并发 disconnect | 潜在 race condition | unbind 操作本地幂等; server 不依赖 client 主动报告 |
| 旧版 Desktop 不识别新 WS 事件 | 不触发断开 | 403/404 降级路径始终可用 (兜底) |

---

## 工作量估算 (Tasks)

| Phase | Sprint | Server Tasks | Desktop Tasks | Web Tasks | Test Tasks | 总计 |
|-------|--------|-------------|---------------|-----------|-----------|------|
| P0 | 1.1 | 5 | 0 | 0 | 2 | 7 |
| P0 | 1.2 | 4 | 0 | 0 | 0 | 4 |
| P0 | 1.3 | 2 | 5 | 0 | 0 | 7 |
| P0 | 1.4 | 0 | 5 | 0 | 0 | 5 |
| P0 | 1.5 | 0 | 6 | 0 | 0 | 6 |
| **P0 合计** | | **11** | **16** | **0** | **2** | **29** |
| P1 | 2.1 | 2 | 0 | 3 | 1 | 6 |
| P1 | 2.2 | 0 | 0 | 5 | 0 | 5 |
| P1 | 2.3 | 2 | 0 | 0 | 1 | 3 |
| P1 | 2.4 | 1 | 4 | 0 | 0 | 5 |
| **P1 合计** | | **5** | **4** | **8** | **2** | **19** |
| P2 | 3.1-3.3 | 3 | 3 | 4 | 0 | 10 |
| **总计** | | **19** | **23** | **12** | **4** | **58** |

---

## 推荐启动顺序

1. **立即启动 (Day 1)**:
   - Sprint 1.1 (Server Members API) — 无依赖, 测试驱动
   - Sprint 1.3 (Desktop Unbind + BugFix) — 修复已知 bug, 无 server 依赖

2. **Server 就绪后 (Day 2-3)**:
   - Sprint 1.2 (WebSocket 事件) — 依赖 1.1 的 handler 代码
   - Sprint 1.5 (SyncPromptDialog) — 独立的前端工作

3. **集成阶段 (Day 3-4)**:
   - Sprint 1.4 (Desktop 事件处理) — 依赖 1.2 + 1.3

4. **Phase 2 开始**:
   - 所有 Phase 1 完成并通过 E2E 验证后启动
