# Onboarding — 实现差距分析

> **日期**: 2026-05-11  
> **对比**: 原始 PRD/Design 文档 vs 实际代码

---

## 已完成（文档中标注缺失但已实现）

原始文档（2026-05-06/07）标注为"缺失"的以下能力已全部实现：

| 能力 | Server | Desktop | 备注 |
|------|--------|---------|------|
| 成员列表 GET /members | ✅ | — | `handlers/member.rs` |
| 移除成员 POST /remove | ✅ | — | 含 MemberRemoved 广播 |
| 退出 workspace POST /leave | ✅ | — | owner 禁止退出 |
| 角色变更 PUT /members/{userId} | ✅ | — | 含 MemberRoleChanged 广播 |
| 所有权转让 POST /transfer | ✅ | — | 旧 owner → admin |
| 删除 workspace DELETE | ✅ | — | CASCADE + WorkspaceDeleted 广播 |
| WebSocket: workspace:deleted | ✅ | — | hub.rs 已实现 |
| WebSocket: member:removed | ✅ | — | hub.rs 已实现 |
| WebSocket: member:role_changed | ✅ | — | hub.rs 已实现 |
| WebSocket: member:joined | ✅ | — | hub.rs 已实现 |
| Unbind workspace | — | ✅ | `unbind_cloud_workspace` Tauri command |
| Vault settings 持久化 | — | ✅ | `save/load_vault_settings` |
| SyncPromptDialog | — | ✅ | VaultHome 中触发 |
| 切换 workspace 清 sync-bases | — | ✅ | `clear_sync_bases` command |
| DISCONNECT_WORKSPACE action | — | ✅ | AppState reducer |
| autoCreateAndBindWorkspace | — | ✅ | useCloudSync hook |
| disconnectWorkspace | — | ✅ | AccountDialog 断开按钮 |

---

## 仍存在的差距

### P0 — 基础功能缺口

| # | 差距 | 层 | 影响 | 说明 |
|---|------|----|------|------|
| 1 | Desktop 未监听 `workspace:deleted` 事件 | Desktop | workspace 被删后桌面端不自动断开 | `useCloudEvents.ts` 缺少 handler |
| 2 | Desktop 未监听 `member:removed` 事件 | Desktop | 被移除后桌面端不自动断开 | 同上 |
| 3 | Sync 错误降级（403/404）未实现 | Desktop | sync 失败时显示通用错误而非具体原因 | `useCloudSync.ts` pull/push 缺少状态码处理 |
| 4 | 切换 workspace 前未检查 dirty 状态 | Desktop | 有未推送修改时切换可能导致数据困惑 | AccountDialog 绑定逻辑缺少预检查 |

### P1 — 协作功能缺口

| # | 差距 | 层 | 影响 | 说明 |
|---|------|----|------|------|
| 5 | Web 邀请接受页面缺失 | Web | 被邀请人无法通过 Web 接受邀请 | 需要 `/invites/:token` 路由 + InviteAcceptPage |
| 6 | 邀请预览端点缺失 | Server | 邀请接受页无法展示邀请详情 | 需要 `GET /api/v1/workspace-invites/{token}` 无需认证 |
| 7 | Web 成员管理 UI 缺失 | Web | 无法在 Web 端查看/管理成员 | 需要 Members section + 操作按钮 |
| 8 | Web 删除 workspace UI 缺失 | Web | 无法在 Web 端删除 workspace | 需要确认对话框 + 影响摘要 |
| 9 | Web 退出 workspace UI 缺失 | Web | 非 owner 无法在 Web 端退出 | 需要 Leave 按钮 + 确认 |
| 10 | Desktop `cloneWorkspaceToLocal` 缺失 | Desktop | 云端优先路径不完整 | AccountDialog 需要"同步到新文件夹"按钮 |
| 11 | 设备管理 UI 缺失 | Desktop/Web | 用户无法查看/管理已绑定设备 | AccountDialog 需要设备列表 tab |

### P2 — 体验优化缺口

| # | 差距 | 层 | 影响 |
|---|------|----|------|
| 12 | Header 本地模式图标标识 | Desktop | 用户无法直观区分本地/云同步模式 |
| 13 | Web 文件夹管理 UI | Web | 只能通过路径约定组织文档 |
| 14 | Workspace 导出 ZIP | Server + Web | 删除前无法导出备份 |
| 15 | Web 全文搜索 | Server + Web | 无法搜索文档内容 |
| 16 | Desktop 邮件通知 | Server | 邀请无邮件通知，email 字段未使用 |

---

## 待删除的文档

| 文件 | 原因 |
|------|------|
| `docs/vault-cloud-onboarding-plan.md` | 实现计划已大部分完成，剩余工作已合并到本差距分析 |

---

## 建议优先级

1. **立即修复**（#1-3）：Desktop WebSocket 事件监听 + sync 错误降级 — 防止被移除/删除后的无效操作
2. **近期实现**（#5-9）：Web 邀请接受页 + 成员管理 UI — 完成协作闭环
3. **后续迭代**（#10-16）：体验优化
