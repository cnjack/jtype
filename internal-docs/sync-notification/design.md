# Sync & Notification — 设计文档

> 整合来源: notification-sync-impl-design.md, notification-sync-v3.md, realtime-notification-design.md, ws-lookup-redesign.md, api-ws-operations.md, web-sync-design.md
>
> 本文档描述**当前实现 + 确认的演进方向**。标记 `[已实现]` / `[设计中]` / `[已废弃]` 以区分状态。

---

## 1. 通信架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloud (Axum)                            │
│                                                             │
│  ┌─────────────────┐     ┌──────────────────┐              │
│  │   REST API       │     │  WebSocket       │              │
│  │                  │     │  /api/v1/live     │              │
│  │ POST /sync/push  ├────►│  ConnectionHub   │              │
│  │ POST /sync/pull  │     │  (per-session     │              │
│  │ PUT /documents   │     │   mpsc channels) │              │
│  │ DELETE /documents│     │                  │              │
│  │ POST /trash/*    │     │                  │              │
│  └────────┬─────────┘     └────────┬─────────┘              │
│           │                        │                         │
│           ▼                        ▼                         │
│     ┌──────────┐            fan-out to all                  │
│     │  MySQL   │            connected clients               │
│     └──────────┘                                            │
└───────────────┬──────────────────────┬──────────────────────┘
                │                      │
         HTTP requests          WebSocket frames
                │                      │
       ┌────────┴────┐          ┌──────┴──────┐
       │  Desktop    │          │  Web        │
       │  App        │          │  Browser    │
       │             │          │             │
       │ REST: push, │          │ WS: save,   │
       │  pull       │          │  notify     │
       │ WS: notify  │          │ REST: save  │
       │             │          │  (fallback) │
       │ Disk: local │          │ IDB: offline│
       │  replica    │          │  cache      │
       └─────────────┘          └─────────────┘
```

### 1.1 协议分工

| 操作 | Desktop | Web (online) | Web (offline) |
|------|---------|-------------|---------------|
| **保存文档** | REST `POST /sync/push` | WS `document:save` → ack | IndexedDB pending_saves |
| **批量同步** | REST `POST /sync/push` + `POST /sync/pull` | N/A | N/A |
| **删除文档** | REST `POST /sync/push` (deletedPaths) | REST `DELETE /documents/:id` 或 WS | IndexedDB pending (sentinel) |
| **回收站** | REST `POST /sync/push` (trashOperations) | REST 或 WS | 不支持离线 |
| **接收通知** | WS → Tauri event → trigger pull | WS → refresh UI | N/A |
| **冲突解决** | REST `POST /conflicts/:id/resolve` | REST `POST /conflicts/:id/resolve` | N/A |

**设计原则**: WS 用于 **Web 保存** 和 **实时通知**。Desktop 数据传输走 REST sync/push + sync/pull。

---

## 2. WebSocket 连接模型

### 2.1 Endpoint 演进

| 版本 | Endpoint | 模型 | 状态 |
|------|----------|------|------|
| v2 | `GET /api/v1/workspaces/:workspace_id/live` | 每 workspace 一个连接 | `[已废弃]` legacy，可能仍存在 |
| 当前 | `GET /api/v1/live` | 每用户一个连接，自动订阅所有 workspace | `[已实现]` |

### 2.2 连接参数

```
GET /api/v1/live
    ?token=<bearer>
    &clientType=web|desktop
    &deviceId=<id>           // desktop only
```

- Token 通过 query param 传递（浏览器 WS API 无法设置自定义 header）
- 连接时服务端查询 `workspace_members` 表，自动订阅用户所有 workspace

### 2.3 连接生命周期

```
Client                          Server
  │                               │
  │  GET /api/v1/live?token=xxx   │
  │──────────────────────────────>│
  │                               │  1. 验证 token → 获取 user
  │                               │  2. 查询用户所有 workspace membership
  │                               │  3. 生成 session_id
  │                               │  4. hub.register(sid, user, workspace_ids, sender)
  │  {"type":"connected",         │
  │   "sessionId":"...",          │
  │   "workspaces":[              │  ← 返回所有已订阅的 workspace 摘要
  │     {"id":"ws-abc",           │
  │      "name":"My Notes",       │
  │      "role":"owner",          │
  │      "workspaceClock":123}    │
  │   ]}                          │
  │<──────────────────────────────│
  │                               │
  │  (任何 workspace 有变更)       │
  │  {"type":"document:changed",  │  ← 所有事件都带 workspaceId
  │   "workspaceId":"ws-abc",...} │
  │<──────────────────────────────│
```

### 2.4 客户端事件路由

**Desktop**: 收到事件后按 `workspaceId` 匹配 vault binding。匹配当前打开 vault → UI 更新 + sync；匹配其他 vault → 后台 sync；无匹配 → 忽略。

**Web**: 匹配当前页面 workspace → 实时更新 UI；不匹配 → 轻量处理（如侧边栏 badge）。

---

## 3. 服务端 Hub

### 3.1 ConnectionHub `[已实现]`

```rust
// services/jtype-web/src/hub.rs

pub struct ConnectionHub {
    sessions: Arc<RwLock<HashMap<SessionId, SessionEntry>>>,
    user_sessions: Arc<RwLock<HashMap<UserId, HashSet<SessionId>>>>,
    workspace_sessions: Arc<RwLock<HashMap<WorkspaceId, HashSet<SessionId>>>>,
}

struct SessionEntry {
    user_id: String,
    username: String,
    device_id: Option<String>,
    client_type: String,           // "desktop" | "web"
    workspace_subscriptions: HashSet<String>,
    sender: mpsc::Sender<ServerMessage>,
    connected_at: DateTime<Utc>,
}
```

三层索引: session → entry, user → sessions, workspace → sessions。

### 3.2 核心方法

| 方法 | 用途 |
|------|------|
| `register()` | 注册新连接，自动订阅用户所有 workspace |
| `unregister()` | 注销连接，清理所有订阅 |
| `add_workspace()` | 运行时增加订阅（如接受邀请加入新 workspace） |
| `remove_workspace()` | 运行时移除订阅（如被踢出） |
| `publish_to_workspace(wid, event, exclude?)` | 广播到 workspace 所有订阅者，可排除发送者 |
| `publish_to_user(uid, event)` | 发送给特定用户所有 session |
| `publish_to_session(sid, event)` | 发送给特定 session |
| `kick_user_from_workspace(uid, wid)` | 移除订阅 + 推送 member:removed |
| `cleanup()` | 清理断开的 session（定期调用） |

### 3.3 设计决策

- **per-session mpsc** 而非 broadcast channel: 每个 session 独立 channel，可精确控制发送对象，排除发送者自然实现
- **服务端自动订阅**: 无需客户端 subscribe/unsubscribe 消息
- **Membership 变更自动生效**: REST handler 操作后调用 `hub.add_workspace()` / `hub.kick_user_from_workspace()` 实时更新

### 3.4 REST → WS Dispatch

REST handler 处理完业务逻辑后调用 hub 发布事件:

| REST Handler | Hub 调用 |
|-------------|----------|
| `sync::push` (每个 accepted doc) | `publish_to_workspace(wid, DocumentChanged, exclude_session)` |
| `sync::push` (每个 deleted path) | `publish_to_workspace(wid, DocumentDeleted, ...)` |
| `document::delete_document` | `publish_to_workspace(wid, DocumentDeleted, ...)` |
| `trash::restore_from_trash` | `publish_to_workspace(wid, DocumentTrashed { action: "restored" })` |
| `trash::permanent_delete` | `publish_to_workspace(wid, DocumentDeleted, ...)` |
| `trash::empty_trash` | `publish_to_workspace(wid, DocumentDeleted, ...)` (for each) |
| `workspace::delete_workspace` | `publish_to_workspace(wid, WorkspaceDeleted, None)` |
| `member::remove_member` | `publish_to_workspace` + `kick_user_from_workspace` |
| `invite::accept_invite` | `publish_to_workspace(MemberJoined)` + `add_workspace_for_user` |

---

## 4. WebSocket 协议

### 4.1 消息信封

```typescript
// Client → Server
interface ClientMessage {
  type: string
  ref?: string           // 客户端请求 ID，ack 回传
  workspaceId?: string   // 操作目标 workspace
}

// Server → Client
interface ServerMessage {
  type: string
  ref?: string
  workspaceId?: string   // 事件所属 workspace
  sourceSessionId?: string  // 触发者 session（自回显过滤用）
}
```

### 4.2 Client → Server 消息

| type | 字段 | 权限 | 说明 |
|------|------|------|------|
| `document:save` | `workspaceId, ref, relativePath, content, title?, baseContentHash?, baseContent?` | editor+ | Web 保存文档 |
| `folder:created` | `workspaceId, ref, relativePath` | editor+ | Web 创建文件夹 |
| `folder:deleted` | `workspaceId, ref, relativePath` | editor+ | Web 删除文件夹 |
| `trash:restore` | `workspaceId, ref, trashId` | editor+ | Web 恢复回收站 |
| `trash:permanent_delete` | `workspaceId, ref, trashId` | editor+ | Web 永久删除 |
| `trash:empty_trash` | `workspaceId, ref` | editor+ | Web 清空回收站 |
| `ping` | (无) | any | 心跳 |

### 4.3 Server → Client 消息

| type | 触发 | 说明 |
|------|------|------|
| `connected` | 握手完成 | `{ sessionId, workspaces: [{id, name, role, workspaceClock}] }` |
| `ack` | 响应客户端请求 | `{ ref, ok, error?, document? }` |
| `pong` | 响应 ping | |
| `document:changed` | 文档保存成功 | `{ workspaceId, relativePath, contentHash, updatedClock, editedBy, source }` |
| `document:deleted` | 文档删除 | `{ workspaceId, relativePath, deletedClock }` |
| `document:trashed` | 回收站操作 | `{ workspaceId, relativePath, action: "trashed"\|"restored" }` |
| `document:status-changed` | 文档状态变更 | `{ workspaceId, relativePath, status }` |
| `sync:required` | channel lagged 或 folder 变更 | `{ workspaceId, reason }` |
| `workspace:updated` | workspace 信息变更 | `{ workspaceId, name, publishTitle }` |
| `workspace:deleted` | workspace 删除 | `{ workspaceId }` |
| `member:joined` | 成员加入 | `{ workspaceId, userId, username, role }` |
| `member:removed` | 成员被移除 | `{ workspaceId, userId, username }` |
| `member:left` | 成员主动离开 | `{ workspaceId, userId, username }` |
| `member:role-changed` | 角色变更 | `{ workspaceId, userId, newRole }` |
| `workspace:invited` | 被邀请（user-scoped） | `{ workspaceId, workspaceName, invitedBy }` |

### 4.4 自回显过滤

- **WS 操作**: 服务端广播时带 `sourceSessionId`，`publish_to_workspace` 使用 `exclude_session` 参数排除发送者
- **REST push 操作**: `sourceSessionId` 为空（REST 无 WS session），Desktop 通过 `source + deviceId` 判断是否自己的回声

### 4.5 心跳与超时

```
Client → Server: ping (每 30s)
Server → Client: pong
Server: 60s 未收到任何消息 → 主动关闭连接并 unregister
Client: 60s 未收到 pong → 认为断连，触发重连
```

---

## 5. 同步协议

### 5.1 Sync Clock 机制

- 每个 workspace 维护一个单调递增 clock（`workspaces.sync_clock`）
- 每次文档写入/删除递增 clock
- 每个 device 维护 cursor（`workspace_sync_cursors.last_seen_clock`）
- Pull 请求携带 `sinceClock`，服务端返回该 clock 之后的所有变更

### 5.2 Sync Base 机制（Desktop）

Desktop 在本地维护 sync base（`.jtype/sync-base/`），记录上次同步时的文件内容。

- `localContent ≠ syncBase` → 本地有修改
- `syncBase` 不存在但本地文件存在 → 本地新建
- `syncBase` 存在但本地文件不存在 → 本地删除

Desktop 不需要显式 pending queue——文件系统就是 queue。

### 5.3 Push 流程

```
POST /api/v1/workspaces/:workspace_id/sync/push
{
  deviceId: string,
  documents: [{
    relativePath: string,
    title: string,
    status: string,
    content: string,
    baseContentHash?: string,    // sync base 的 hash
    baseContent?: string,        // sync base 的内容（用于三方合并）
  }],
  deletedPaths: [{ relativePath }],
  trashOperations: [{ ... }],
  folderOperations?: [{ ... }],
}
```

服务端处理每个文档:
1. `baseContentHash` 与当前 cloud hash 一致 → 直接接受
2. 不一致 → 尝试 `smart_three_way_merge(base, local, cloud)`
3. 合并成功 → 返回合并后内容
4. 合并失败 → 创建 `sync_conflicts` 记录

### 5.4 Pull 流程

```
POST /api/v1/workspaces/:workspace_id/sync/pull
{
  sinceClock: number,
  deviceId: string,
}
→ {
  documents: CloudDocument[],
  deletedPaths: [{ relativePath, deletedClock }],
  conflicts: SyncConflict[],
  currentClock: number,
}
```

### 5.5 Desktop Eager Push（即时推送）`[已实现]`

用户 Ctrl+S → 写入磁盘 → 异步推送单文件到 cloud（不阻塞 UI）。

```typescript
// src/hooks/useEagerSync.ts
async function onSave(relativePath, content) {
  await tauri.writeTextFile(fullPath, content)     // 先写磁盘
  pushSingleDocument(relativePath, content)         // 异步推云
}
```

失败时文件已在本地，periodic sync 兜底。

### 5.6 Desktop Targeted Pull（定向拉取）`[已实现]`

收到 `document:changed` 通知后，Desktop 判断本地状态:
- 本地文件与 sync base 相同 → 安全拉取覆盖
- 本地有修改 → 不覆盖，提示用户 sync

### 5.7 Periodic Sync（定时同步）`[已实现]`

```
WS 在线:  5 分钟间隔（安全网）
WS 离线: 30 秒间隔（降级 fallback）
```

作为 catch-all safety net，确保 eager push + WS 通知遗漏时仍能同步。

---

## 6. 冲突解决

### 6.1 冲突分类矩阵

| # | Local | Cloud | Base | 分类 | 自动解决 |
|---|-------|-------|------|------|----------|
| 1 | Modified | Unchanged | Exists | Local edit only | Push |
| 2 | Unchanged | Modified | Exists | Cloud edit only | Pull |
| 3 | Modified | Modified | Exists | Content conflict | 三方合并 |
| 4 | Created | Not exists | N/A | Local new | Push |
| 5 | Not exists | Created | N/A | Cloud new | Pull |
| 6 | Created | Created | N/A | Create-create conflict | 人工 |
| 7 | Modified | Deleted | Exists | Edit-delete conflict | 优先保留数据 |
| 8 | Deleted | Modified | Exists | Delete-edit conflict | 优先保留数据 |
| 9 | Deleted | Deleted | Exists | Both deleted | 确认删除 |
| 10 | Deleted | Unchanged | Exists | Local delete | Push deletion |
| 11 | Unchanged | Deleted | Exists | Cloud delete | Apply locally |
| 12 | Unchanged | Unchanged | Exists | No change | Skip |

### 6.2 三方合并

使用 `smart_three_way_merge(base, local, cloud)` 行级合并:
- 不同区域修改 → 自动合并
- 同一区域修改 → 冲突，交给用户

### 6.3 用户解决选项

| 选项 | 行为 |
|------|------|
| `accept_local` | 使用本地版本 |
| `accept_cloud` | 使用云端版本 |
| `keep_both` | 保留两个文件（冲突版本保存为 `filename.conflict.md`） |
| `manual_merge` | 用户在 diff UI 中手动合并 |

### 6.4 Edit-Delete 策略

**优先保留数据**: 删除可以重新执行，丢失的编辑无法恢复。

- Local 编辑 + Cloud 删除 → 保留 local 版本，推送到 cloud（重建文件），通知用户
- Local 删除 + Cloud 编辑 → 保留 cloud 版本，拉取到 local（重建文件），通知用户

---

## 7. Web 前端实现

### 7.1 WebSocket Hook `[已实现]`

```typescript
// services/jtype-web/frontend/src/hooks/useWorkspaceSocket.ts
// (可能已重命名为 useSocket.ts 以反映用户级 singleton)

export function useWorkspaceSocket(workspaceId) {
  // 状态: connecting | connected | disconnected
  // 自动重连: 1s→2s→4s→...→60s 指数退避
  // request(msg) → Promise<ack>，30s 超时
  // subscribe(fn) → unsubscribe
  return { status, sessionId, request, subscribe }
}
```

### 7.2 保存降级链

```
WS save → 失败 → REST save → 失败 → IndexedDB 离线保存
```

### 7.3 实时事件处理

收到 `document:changed`:
- 刷新文档列表
- 当前编辑的文档被修改:
  - 无未保存修改 → 自动刷新内容
  - 有未保存修改 → 显示 stale warning: `[Reload (discard)] [Save mine]`

### 7.4 WS 断线降级

WS 断线时自动降级到 REST 轮询（每 10s 刷新文档列表）。

### 7.5 IndexedDB 离线支持 `[设计中]`

三个 object store:
- `documents_cache`: 文档内容缓存（key: [workspaceId, relativePath]）
- `pending_saves`: 待同步保存队列（auto-increment key + workspace/path index）
- `sync_state`: 同步状态（key: workspaceId）

离线保存: 写 documents_cache + 记录 pending_saves（按 path 去重，只保留最终版本）。
离线删除: pending_saves 中 content 设为 `'__DELETED__'` sentinel。
重连协调: Pull → 分类 → 合并/冲突 → Push → 清理 pending。

---

## 8. Desktop 实现

### 8.1 WS Client `[已实现]`

```rust
// src-tauri/src/ws_client.rs
// tokio-tungstenite 连接 /api/v1/live
// 收到事件 → emit Tauri event:
//   "connected"         → "cloud:ws-connected"
//   "document:changed"  → "cloud:remote-change"
//   "document:deleted"  → "cloud:remote-change"
//   "sync:required"     → "cloud:sync-required"
// 断连 → 自动重连（指数退避）
// 每 25s 发送 ping 心跳
```

### 8.2 Frontend Hooks `[已实现]`

| Hook | 职责 |
|------|------|
| `useCloudSync` | 主同步逻辑（push/pull 编排） |
| `useCloudEvents` | 监听 Tauri WS 事件，触发 sync pull |
| `useEagerSync` | 保存后即时推送单文件 |
| `usePeriodicSync` | 定时后台同步（感知 WS 连接状态调整间隔） |

### 8.3 WS 连接管理

- `start_ws_listener` Tauri command 启动 WS 后台任务
- singleton 模式，不随 vault 切换重连
- `WsOutbox` broadcast sender（已注册但前端未使用 `cloud_ws_send` command）

---

## 9. WS Save Handler（服务端）`[已实现]`

WS save handler 复用现有 `save_document_version()` 函数，与 REST PUT handler 共享完全相同的合并逻辑:

```
Client: document:save { relativePath, content, baseContentHash, baseContent }
   ↓
Server: save_document_version()
   ├── base matches → Saved → ack(ok=true, document) + hub.publish(DocumentChanged)
   ├── base differs, merge ok → Saved(merged) → ack(ok=true) + hub.publish
   └── base differs, merge fail → Conflict → ack(ok=false, error="conflict:id") + hub.publish(ConflictCreated)
```

viewer 角色发送写操作 → ack(ok=false, error="read-only access")。

---

## 10. 安全

| 措施 | 详情 |
|------|------|
| 认证 | WS 升级前验证 token，握手完成前拒绝非法 token |
| 授权 | 连接时检查 workspace role；viewer 只读 |
| TLS | 生产环境强制 WSS |
| 消息大小 | 最大 256 KB |
| 路径验证 | `relativePath` 禁止 `../`（路径遍历） |
| 未知消息 | 静默忽略（前向兼容） |
| Token 安全 | `[设计中]` 一次性 ticket 模式替代 query string token |

---

## 11. 降级与容错

| 场景 | 行为 |
|------|------|
| WS 连接失败（Web） | REST save + 10s 轮询 |
| WS 中途断开（Web） | 自动重连，pending saves reject，用户可 REST retry |
| WS 连接失败（Desktop） | 继续 periodic sync（30s） |
| Client 落后（Lagged） | `sync:required` → 全量 pull |
| Server 重启 | 所有连接断开，客户端重连后 pull catch up |
| Token 过期 | Server 关闭连接 code 4001 |
| WS save 超时 30s | 客户端 fallback 到 REST save |
