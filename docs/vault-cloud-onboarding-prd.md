# Vault ↔ Cloud Workspace 全链路联动 PRD

> **版本**: v1.0  
> **日期**: 2026-05-06  
> **范围**: Desktop (Tauri) + Web Service (Axum) + Web Frontend  
> **目标**: 补齐 vault 与 cloud workspace 之间所有缺失的用户路径，形成完整的 onboarding、lifecycle、collaboration 闭环

---

## 一、背景与问题

JType 当前架构支持 **本地 vault**（Markdown 文件夹）与 **cloud workspace**（服务端协作空间）的双向同步。但两者的关联过于薄弱：

| 维度 | 现状 | 问题 |
|------|------|------|
| **本地 Onboarding** | 创建 vault 后需手动 4+ 步才能连接云端 | 流程断裂，新用户流失 |
| **云端 Onboarding** | Web 创建 workspace 后无法引导到桌面端 | 云端与本地割裂 |
| **断开连接** | 无 unbind/disconnect 功能 | 用户被锁死在绑定关系中 |
| **成员管理** | 邀请 API 存在但无 UI，无移除/离开功能 | 协作无法闭环 |
| **工作区删除** | 无删除 API | 数据生命周期不完整 |
| **多设备** | 基础同步可用，但无设备管理 UI | 用户无法管控设备 |
| **重绑定** | 切换 workspace 时 sync-bases 未清理 | **数据完整性 bug** |

---

## 二、用户旅程全景图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        用户旅程全景                                  │
├───────────────────┬─────────────────┬───────────────────────────────┤
│   本地优先路径     │   云端优先路径   │     协作路径                   │
├───────────────────┼─────────────────┼───────────────────────────────┤
│ J1 创建 vault     │ J3 Web 创建     │ J6 接受邀请                   │
│    → 同步创建云   │    workspace    │    → 绑定本地 vault            │
│                   │    → 同步到本地  │                               │
│ J2 纯本地使用     │ J5 纯 Web 使用  │ J7 成员移除/退出              │
│    （不同步云）    │   （无桌面端）   │    → 本地数据处理             │
│                   │                 │                               │
│ J4 断开云同步     │ J9 删除 workspace│ J8 多设备同步                 │
│    → 保留本地     │    → 通知成员   │    → 设备管理                  │
│                   │                 │                               │
│ J10 重绑定/切换   │                 │                               │
│    workspace      │                 │                               │
└───────────────────┴─────────────────┴───────────────────────────────┘
```

---

## 三、旅程详细设计

### J1: 创建本地 Vault → 自动创建 Cloud Workspace

**当前流程**（4+ 步手动操作）：
1. WelcomeScreen → 选择文件夹 → VaultHome
2. 手动打开 Account Settings
3. 手动 OAuth 登录
4. 手动选择/创建 workspace
5. 手动点击 Sync Now

**目标流程**（引导式 1-click）：

```
用户创建 vault
    ↓
VaultHome 渲染
    ↓
检测: vault 无 cloud 绑定 && 首次打开
    ↓
弹出 SyncPromptDialog:
  "将 {vaultName} 同步到云端？"
  [开始同步]  [稍后再说]  [不需要]
    ↓ [开始同步]
检测: 是否已登录?
  → 未登录: 触发 OAuth → 浏览器授权 → 回到下一步
  → 已登录: 直接下一步
    ↓
POST /api/v1/workspaces { name: vault.name }
  → 返回 { workspaceId, workspaceName, ... }
    ↓
创建 VaultBinding → 写入 vault-bindings.json
    ↓
触发首次同步 (push local docs)
    ↓
显示: "✅ 同步成功！{X} 篇文档已备份到云端"
```

**边界条件**：

| 条件 | 处理 |
|------|------|
| 网络离线 | 存储同步意图到 localStorage，联网后自动重试 |
| OAuth 被拒/取消 | 退回 VaultHome，允许手动重试 |
| workspace 名称冲突 | 提示"已有同名 workspace，是否绑定到已有？"选择后绑定 |
| 用户选择"稍后" | 记录 `syncPromptDismissedAt`，7 天后再提醒 |
| 用户选择"不需要" | 记录 `syncDisabled: true`，永不自动提醒（可在设置中开启） |

**需要的变更**：

| 组件 | 变更 |
|------|------|
| `VaultHome.tsx` | 新增 SyncPromptDialog 触发逻辑 |
| `components/modals/` | 新增 `SyncPromptDialog.tsx` |
| `useCloudSync.ts` | 新增 `autoCreateAndBindWorkspace()` 方法 |
| `AppState.tsx` | 新增 `vaultSettings` 状态（syncDisabled per vault） |
| Tauri `lib.rs` | 新增 `save_vault_settings()` / `load_vault_settings()` |

---

### J2: 纯本地使用（不同步云）

**当前状态**：功能上默认本地模式（无绑定=无同步），但 UI 无明确区分。

**目标**：用户可以明确选择"仅本地使用"，且 UI 清晰反映此状态。

**设计要点**：

1. **Vault Settings 持久化**
   ```json
   // {configDir}/JType/vault-settings.json
   {
     "/Users/jack/my-notes": {
       "cloudSyncEnabled": false
     }
   }
   ```

2. **UI 区分**
   - Header 显示本地模式标识（文件夹图标，非云图标）
   - 隐藏"Sync now"按钮
   - Account 设置中显示 "此 vault 为本地模式" 提示 + "开启云同步"入口

3. **从云同步 → 本地的转换**
   - 通过 J4（断开连接）实现
   - 设置 `cloudSyncEnabled: false`
   - 清理 `.jtype/sync-bases/`
   - 保留所有本地文件

4. **从本地 → 云同步的转换**
   - Settings 中点击"开启云同步" → 走 J1 的绑定流程
   - 或 Account Dialog 手动绑定

**技术验证**：当前同步判断逻辑已正确禁用未绑定 vault 的所有云操作 ✅
```typescript
const isSyncEnabled = !!(state.workspace && state.syncToken && currentBinding);
```
需要增加 `&& vaultSettings[path]?.cloudSyncEnabled !== false`

---

### J3: Web 创建 Workspace → 同步到本地（云端优先）

**当前状态**：Web 可创建 workspace 和编辑文档，但无"下载到桌面"的引导。

**目标流程**：

```
用户在 Web 创建 workspace → 编辑文档
    ↓
需要桌面端编辑
    ↓
方案 A: 桌面端发现
  - 桌面端登录同一账号
  - Account Dialog → Cloud Workspace 列表
  - 点击"同步到本地" → 选择本地文件夹
  - 首次 pull（since_clock=0）→ 下载所有文档
  - 绑定完成 → 进入正常同步循环

方案 B: Web 端引导（新功能）
  - Web 端 workspace 页面显示"在桌面端打开"按钮
  - 点击 → 显示下载 App 链接 + 使用说明
  - 未来: deep link jtype://sync/{workspaceId}
```

**桌面端增强**：

| 位置 | 变更 |
|------|------|
| `WelcomeScreen.tsx` | 新增"同步云端 Workspace"入口（已登录时显示） |
| `AccountDialog.tsx` | workspace 列表添加"同步到新文件夹"按钮（当前只有"绑定"） |
| `useCloudSync.ts` | 新增 `cloneWorkspaceToLocal(workspaceId, localPath)` 方法 |

**首次同步机制**（已基本可用 ✅）：
- `lastPulledClock: 0` → 全量拉取
- `applyCloudDocuments()` → 写入本地文件
- 保存 sync-bases → 后续增量同步

**边界条件**：

| 条件 | 处理 |
|------|------|
| Workspace 有大量文件（10k+） | ⚠️ 当前无分页，需新增 `limit` + `hasMore` 参数 |
| 目标文件夹非空 | 警告"此文件夹已有内容，将合并"或要求空文件夹 |
| 网络中断 | 记录 lastPulledClock，下次从断点续传 |
| 角色为 viewer | 允许 pull，禁止 push，UI 显示只读模式 |

---

### J4: 断开 Cloud Workspace（Unbind）

**当前状态**：❌ 完全缺失，无法通过 UI 断开绑定。

**目标流程**：

```
AccountDialog → Cloud Workspace 标签页
    ↓
已绑定 workspace 旁显示 "断开连接" 按钮 (LinkSlashIcon)
    ↓
确认对话框:
  "断开 [{workspaceName}] 的云同步？"
  • 本地文件将保留
  • 云端数据不受影响
  • 你仍然是 workspace 成员（可随时重新连接）
  [取消]  [断开连接]
    ↓
执行:
  1. 停止 periodic sync 和 WebSocket
  2. 从 vault-bindings.json 移除此绑定
  3. 清理 .jtype/sync-bases/ 目录
  4. 更新 AppState（移除 currentBinding）
  5. 可选: 通知服务端删除 device cursor
    ↓
显示: "已断开。本地文件已保留，可在设置中重新连接。"
```

**数据处理清单**：

| 数据 | 操作 | 原因 |
|------|------|------|
| `vault-bindings.json` 条目 | ❌ 删除 | 解除绑定 |
| `.jtype/sync-bases/*` | ❌ 删除 | 旧 bases 无意义 |
| 本地 `.md` 文件 | ✅ 保留 | local-first 原则 |
| 服务端 `workspace_members` | ✅ 保留 | unbind ≠ 退出 |
| 服务端 `workspace_sync_cursors` | ⚠️ 可选删除 | 清理或保留用于重连 |

**需要的变更**：

| 组件 | 变更 |
|------|------|
| `AccountDialog.tsx` | 绑定状态行增加"断开连接"按钮 |
| `useCloudSync.ts` | 新增 `disconnectWorkspace()` 方法 |
| `AppState.tsx` | 新增 `DISCONNECT_WORKSPACE` action |
| Tauri `lib.rs` | 新增 `unbind_cloud_workspace()` command（删除绑定 + 清理 sync-bases）|
| 服务端（可选） | `DELETE /api/v1/workspaces/{id}/sync/cursor?device_id=xxx` |

---

### J5: 纯 Web 使用（无桌面端）

**当前状态**：Web 端覆盖约 80% 功能，可独立使用。

**已支持** ✅：
- 注册/登录（用户名+密码）
- 创建/列出/重命名 workspace
- 文档 CRUD（实时 WebSocket + 离线 IndexedDB 回退）
- Markdown 编辑/预览/分栏模式
- 文档状态管理（draft/published/archived）
- 软删除 → 回收站 → 恢复/永久删除
- 发布站点 + 自定义域名 + SSL 证书
- 邀请成员（创建邀请令牌）
- 角色权限控制（viewer 只读, editor 可编辑）

**缺失** ❌：
| 功能 | 重要性 | 说明 |
|------|--------|------|
| **文件夹管理** | P0 | 无法创建/删除/重命名文件夹，只有路径约定 |
| **成员列表** | P0 | 无法查看 workspace 当前成员 |
| **移除成员** | P1 | 无法撤销成员访问权限 |
| **批量操作** | P1 | 无法多选删除/移动文档 |
| **全文搜索** | P1 | 无法搜索文档内容 |
| **邀请接受页面** | P1 | Web 端无 `/invites/:token/accept` 路由 |
| **删除 workspace** | P2 | 无法删除不再需要的 workspace |
| **资源上传** | P2 | 只支持 Markdown，无法上传图片等 |
| **快速导航** | P2 | 无 Ctrl+P 快速打开文档 |

---

### J6: 接受邀请 → 绑定本地 Vault

**当前状态**：
- 邀请创建 API ✅（生成 token，SHA256 存储）
- 邀请接受 API ✅（验证 token → 创建 member）
- 邀请撤销 API ✅
- **邀请接受 UI ❌**（Web 和 Desktop 都无）
- **邮件通知 ❌**（email 字段未使用）
- **桌面端邀请入口 ❌**

**目标流程**：

```
邀请人（Owner/Admin）
    ↓
AccountDialog → 成员管理 → "邀请成员"
  → 输入邮箱/用户名, 选择角色
  → POST /api/v1/workspaces/{id}/invites
  → 获得邀请链接（复制到剪贴板）
  → 未来: 自动发送邮件通知

被邀请人
    ↓
方案 A: Web 接受
  → 打开 https://app.jtype.io/invites/{token}
  → 显示: "{owner} 邀请你加入 [{workspace}]，角色: Editor"
  → [接受邀请] → POST /workspace-invites/{token}/accept
  → 跳转到 workspace 页面

方案 B: Desktop 接受
  → 桌面端 Account Dialog → "待处理邀请" 列表
  → 或 deep link: jtype://invites/{token}
  → 确认接受 → 选择本地文件夹 → 绑定 + 首次 pull
```

**边界条件**：

| 条件 | 处理 |
|------|------|
| 已是 workspace 成员 | 提示"你已是此 workspace 的成员" |
| 邀请已过期 | 提示"此邀请已过期，请联系邀请人" |
| 邀请已撤销 | 提示"此邀请已被撤销" |
| 用户未注册 | Web: 跳转注册页面，注册后自动接受; Desktop: 先登录 |
| 邀请 token 泄露 | Token 一次性使用（accepted_at 标记后不可重用）|

**需要的变更**：

| 组件 | 变更 |
|------|------|
| Web `main.tsx` | 新增 `/invites/:token` 路由 |
| Web | 新增 `InviteAccept.tsx` 页面 |
| Desktop `AccountDialog.tsx` | 新增"待处理邀请"标签页或入口 |
| 服务端 | 新增 `GET /api/v1/workspace-invites/{token}` 查看邀请详情（不接受） |
| 服务端 | 邀请过期检查（`expires_at` 字段当前未校验）|

---

### J7: 成员移除 / 退出 Workspace

**当前状态**：
- 数据库 `workspace_members.status` 有 `'active', 'invited', 'removed'` 枚举 ✅
- 权限检查 `require_workspace_role()` 过滤 `status='active'` ✅
- **移除成员 API ❌**
- **退出 workspace API ❌**
- **桌面端检测移除 ❌**

**目标流程**：

#### 7a: 管理员移除成员

```
Owner/Admin → 成员管理 → 选择成员 → "移除"
    ↓
确认: "确定移除 {username}？此操作将：
  • 停止该用户的云同步
  • 该用户本地文件不受影响
  • 可随时重新邀请"
    ↓
POST /api/v1/workspaces/{id}/members/{userId}/remove
  → UPDATE workspace_members SET status = 'removed'
    ↓
WebSocket 通知被移除用户（新事件类型: member:removed）
    ↓
被移除用户桌面端:
  → 检测到 403/404 → 显示 "你已被移除出此 workspace"
  → 本地文件保留 → 提示"断开云同步？"
  → 自动或手动断开绑定
```

#### 7b: 成员主动退出

```
成员 → Account Settings → Cloud Workspace → "退出此 workspace"
    ↓
POST /api/v1/workspaces/{id}/leave
  → UPDATE workspace_members SET status = 'removed'
    ↓
自动断开绑定 → 清理 sync-bases → 本地文件保留
```

**边界条件**：

| 条件 | 处理 |
|------|------|
| Owner 尝试退出 | ❌ 禁止。必须先转让所有权 |
| 最后一个 Admin 退出 | ❌ 禁止。必须至少保留一个 Admin |
| 被移除用户有未推送的修改 | ⚠️ 警告"有本地修改未同步，退出后将无法推送" |
| 被移除后重新邀请 | ✅ 支持。`ON DUPLICATE KEY UPDATE status='active'` |

**需要的 API**：

```
POST /api/v1/workspaces/{id}/members/{userId}/remove  (owner/admin)
POST /api/v1/workspaces/{id}/leave                     (self)
GET  /api/v1/workspaces/{id}/members                   (list members)
PUT  /api/v1/workspaces/{id}/members/{userId}           (change role)
POST /api/v1/workspaces/{id}/transfer                   (transfer ownership)
```

---

### J8: 多设备同步

**当前状态**：基础机制已就绪 ✅

| 能力 | 状态 | 说明 |
|------|------|------|
| Device ID 生成 | ✅ | `{username}@{hostname}` hash，重装不变 |
| 每设备独立 cursor | ✅ | `workspace_sync_cursors(workspace_id, device_id)` |
| 并行同步 | ✅ | 无 workspace 级锁，per-document 原子性 |
| WebSocket per-device | ✅ | 各设备独立连接，self-dedup |
| 冲突处理 | ✅ | 三路合并，non-overlapping 自动合并 |
| 设备列表查看 | ✅ | `GET /api/v1/my/devices` API 已实现 |
| 设备管理 UI | ❌ | 桌面端无设备管理界面 |
| 强制登出设备 | ❌ | 无 revoke 功能 |

**目标增强**：

1. **设备管理页面**（Account Settings 新 tab）
   - 显示所有绑定设备: device_id, 最后同步时间, workspace
   - "移除设备"按钮 → 删除 cursor + 失效 token

2. **设备冲突 UX 优化**
   - 当前: 冲突显示为"local vs cloud"
   - 目标: 显示"来自 {device_name} 的修改 vs 本地修改"

3. **边界条件**：
   - 重装应用: device_id 相同（基于机器信息），cursor 恢复
   - 新设备: device_id 不同，首次同步从 clock=0 拉取全量
   - 孤儿 cursor: 设备不再使用但 cursor 留在 DB → 定期清理

---

### J9: 删除 Workspace

**当前状态**：❌ 完全缺失。无删除 API，无 UI，无通知机制。

**数据影响**（基于 CASCADE 规则）：

| 表 | CASCADE 规则 | 影响 |
|----|-------------|------|
| `workspace_members` | CASCADE | 所有成员记录删除 |
| `documents` | CASCADE | 所有文档永久删除 |
| `document_versions` | CASCADE | 所有版本历史删除 |
| `document_trash` | CASCADE | 回收站清空 |
| `sync_conflicts` | CASCADE | 冲突记录删除 |
| `workspace_sync_cursors` | CASCADE | 同步状态清除 |
| `workspace_invites` | CASCADE | 待处理邀请删除 |
| `custom_domains` | SET NULL | 域名记录孤立 |

**目标流程**：

```
Owner → Workspace Settings → "删除 Workspace"
    ↓
预检查:
  - 确认为 Owner
  - 获取影响摘要: 成员数、文档数、发布站点数
    ↓
确认对话框:
  "永久删除 [{workspaceName}]？"
  • 5 位成员将失去云端访问
  • 128 篇文档将永久删除
  • 3 个发布站点将下线
  • 所有成员的本地文件将保留
  [取消]  [导出后删除]  [立即删除]
    ↓
可选: 导出所有文档为 ZIP（元数据 + Markdown 文件）
    ↓
执行:
  1. WebSocket 广播 workspace:deleted 事件
  2. DELETE FROM workspaces WHERE id = ? (CASCADE)
  3. 清理 custom_domains（SET NULL → 后续可手动删除）
    ↓
各成员桌面端:
  → 收到 workspace:deleted 事件 或 下次同步 404
  → 显示: "Workspace [{name}] 已被 Owner 删除，本地文件已保留"
  → 自动断开绑定 → vault 变为纯本地模式
```

**需要的变更**：

| 组件 | 变更 |
|------|------|
| 服务端 `workspace.rs` | 新增 `DELETE /api/v1/workspaces/{id}` |
| 服务端 `hub.rs` | 新增 `WorkspaceDeleted` 事件类型 |
| Web 前端 | Workspace 设置页增加删除按钮 + 确认对话框 |
| Desktop `useCloudSync.ts` | 处理 404 → 检测 workspace 被删 → 自动断开 |
| Desktop `useCloudEvents.ts` | 监听 `workspace:deleted` WebSocket 事件 |

---

### J10: 重绑定 / 切换 Workspace

**当前状态**：⚠️ 可操作但存在数据完整性 bug。

**关键 Bug**：切换 workspace 时 `.jtype/sync-bases/` 未清理
```
Vault A 绑定 Workspace X → sync-bases 保存 X 的内容
    ↓ 用户重绑定到 Workspace Y
sync-bases 仍然是 X 的旧内容
    ↓ 三路合并使用错误的 base
    → 可能导致静默数据丢失或错误冲突
```

**目标流程**：

```
用户 → Account Dialog → 选择不同 workspace → "切换到此 workspace"
    ↓
预检查:
  1. 是否有未推送的本地修改？→ 警告并要求先同步
  2. 是否有未解决的冲突？→ 要求先解决
    ↓
确认对话框:
  "将此 vault 切换到 [{newWorkspace}]？"
  • 当前 [{oldWorkspace}] 的同步状态将清除
  • 本地文件将保留
  • 将执行全量同步
  [取消]  [切换]
    ↓
执行:
  1. 清理旧的 .jtype/sync-bases/（P0 必须）
  2. 更新 vault-bindings.json（新 workspaceId, lastPulledClock=0）
  3. 触发全量 pull 从新 workspace
  4. 合并/覆盖本地文件
```

**安全保障**：

| 保障 | 说明 |
|------|------|
| 清理 sync-bases | **P0**，防止三路合并使用错误 base |
| 禁止 dirty 切换 | 有未推送修改时禁止切换 |
| 禁止多 vault → 同 workspace | 防止路径冲突 |
| 全量 re-sync | `lastPulledClock: 0` 确保拉取所有文档 |

---

## 四、需要新增的 API 汇总

| 优先级 | 端点 | 方法 | 说明 |
|--------|------|------|------|
| P0 | `/api/v1/workspaces/{id}/members` | GET | 列出 workspace 成员 |
| P0 | `/api/v1/workspaces/{id}/members/{userId}/remove` | POST | 移除成员 |
| P0 | `/api/v1/workspaces/{id}/leave` | POST | 主动退出 |
| P0 | `/api/v1/workspaces/{id}` | DELETE | 删除 workspace |
| P1 | `/api/v1/workspaces/{id}/members/{userId}` | PUT | 修改角色 |
| P1 | `/api/v1/workspaces/{id}/transfer` | POST | 转让所有权 |
| P1 | `/api/v1/workspace-invites/{token}` | GET | 查看邀请详情 |
| P1 | `/api/v1/workspaces/{id}/sync/cursor` | DELETE | 清理设备 cursor |
| P2 | `/api/v1/workspaces/{id}/export` | GET | 导出 workspace 为 ZIP |

---

## 五、需要新增的 Tauri Commands

| 优先级 | Command | 说明 |
|--------|---------|------|
| P0 | `unbind_cloud_workspace(workspaceId, vaultPath)` | 删除绑定 + 清理 sync-bases |
| P0 | `save_vault_settings(vaultPath, settings)` | 保存 vault 本地设置 |
| P0 | `load_vault_settings(vaultPath)` | 读取 vault 本地设置 |
| P1 | `clear_sync_bases(vaultPath)` | 清理 sync-bases（切换 workspace 时用）|

---

## 六、需要新增的 UI 组件

| 优先级 | 组件 | 位置 | 说明 |
|--------|------|------|------|
| P0 | `SyncPromptDialog` | `components/modals/` | 首次打开 vault 的云同步引导 |
| P0 | Disconnect 按钮 | `AccountDialog.tsx` | 断开云同步（LinkSlashIcon） |
| P0 | 成员管理面板 | `AccountDialog.tsx` | 查看/移除成员，修改角色 |
| P1 | `InviteAcceptPage` | Web `pages/` | Web 端邀请接受页 |
| P1 | 设备管理 tab | `AccountDialog.tsx` | 查看/管理已绑定设备 |
| P1 | workspace 列表增强 | `AccountDialog.tsx` | "同步到新文件夹" 按钮（云端优先路径）|
| P1 | 删除 workspace 对话框 | `AccountDialog.tsx` / Web | 带影响摘要的确认对话框 |
| P2 | Vault 本地模式标识 | `Header.tsx` | 本地 vault 显示文件夹图标而非云图标 |
| P2 | 邀请管理 UI | Web `Workspace.tsx` | 查看待处理邀请，复制链接，撤销 |

---

## 七、需要新增的 WebSocket 事件

| 事件 | Payload | 触发场景 |
|------|---------|---------|
| `workspace:deleted` | `{ workspaceId, deletedBy, deletedAt }` | Owner 删除 workspace |
| `member:removed` | `{ workspaceId, userId, removedBy }` | 管理员移除成员 |
| `member:role_changed` | `{ workspaceId, userId, newRole }` | 角色变更通知 |
| `member:joined` | `{ workspaceId, userId, role }` | 新成员加入 |

---

## 八、优先级排序

### Phase 1: 基础闭环（P0）
> 目标：用户能完成"创建 → 同步 → 断开"的完整生命周期

1. **SyncPromptDialog**（J1）— 本地 vault 云同步引导
2. **Disconnect 功能**（J4）— unbind + 清理 sync-bases
3. **切换 workspace 时清理 sync-bases**（J10）— 修复数据完整性 bug
4. **成员列表 API**（J7）— `GET /members`
5. **移除成员 / 退出 API**（J7）— `POST /remove`, `POST /leave`
6. **删除 workspace API**（J9）— `DELETE /workspaces/{id}`
7. **Desktop 检测 workspace 被删/被移除**（J7, J9）— 403/404 优雅处理

### Phase 2: 协作增强（P1）
> 目标：邀请流程可用，多设备可管理

8. **Web 邀请接受页**（J6）— `/invites/:token` 路由
9. **邀请过期检查**（J6）— `expires_at` 字段校验
10. **设备管理 UI**（J8）— 查看设备列表
11. **角色修改 API**（J7）— `PUT /members/{userId}`
12. **workspace 列表增强**（J3）— "同步到新文件夹"按钮
13. **Sync Pull 分页**（J3）— 大型 workspace 首次同步

### Phase 3: 体验优化（P2）
> 目标：边缘场景覆盖，UX 打磨

14. **Vault 本地模式 UI 标识**（J2）
15. **Web 文件夹管理**（J5）
16. **Workspace 导出 ZIP**（J9）
17. **所有权转让**（J7）
18. **邀请管理 UI**（J6）
19. **Web 全文搜索**（J5）
20. **设备强制登出**（J8）

---

## 九、状态机总览

```
Vault 状态:
  ┌─────────┐     创建vault+选择同步     ┌──────────┐
  │ 未创建   │ ───────────────────────→ │ 已绑定    │
  └─────────┘                           │ (同步中)  │
       │                                └──────────┘
       │ 创建vault+选择本地                  │ ↑
       ↓                            断开连接 │ │ 重新绑定
  ┌─────────┐                               ↓ │
  │ 纯本地   │ ←────────────────────── ┌──────────┐
  │         │                          │ 已断开    │
  └─────────┘                          │ (本地模式) │
       │                               └──────────┘
       │ 后续开启同步                        ↑
       └─────────────────────────────────────┘

成员状态:
  invited → active → removed
              ↑         │
              └─────────┘ (重新邀请)

Workspace 状态:
  created → active → deleted (hard delete)
```

---

## 十、非功能性要求

| 维度 | 要求 |
|------|------|
| **数据安全** | 所有断开/删除操作必须保留本地文件（local-first 原则）|
| **幂等性** | 重复调用 disconnect/leave 不应报错 |
| **离线友好** | 离线时同步意图存储到本地，联网后自动执行 |
| **权限校验** | 所有成员管理操作需验证 owner/admin 角色 |
| **通知** | workspace 删除和成员移除必须通过 WebSocket 实时通知 |
| **迁移** | 新增数据库表/列需通过新的 migration 文件，不修改已有 migration |
| **向后兼容** | 新版本 App 连接旧版本 Server 时优雅降级 |
