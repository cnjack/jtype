# WebSocket Lookup 重新设计

## 1. 现状分析

### 1.1 当前架构概览

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Web Service (Axum)                                                │
│                                                                    │
│   AppState { pool, public_base_url, hub: NotificationHub }         │
│                                                                    │
│   NotificationHub                                                  │
│   ┌───────────────────────────────────────────┐                    │
│   │ channels: HashMap<workspace_id, broadcast::Sender>             │
│   │                                                                │
│   │  "ws-abc" → broadcast::Sender (capacity=256)                   │
│   │  "ws-def" → broadcast::Sender (capacity=256)                   │
│   └───────────────────────────────────────────┘                    │
│                                                                    │
│   WS Route: /api/v1/workspaces/:workspace_id/live                  │
│   - 每个 workspace 一个 WS endpoint                                │
│   - 每个连接独立 subscribe 到对应 workspace 的 broadcast channel     │
│   - 无 session registry, 无 connection tracking                    │
│                                                                    │
│   REST Handlers:                                                   │
│   - 部分 handler 内部调用 hub.publish() (如 sync/push, delete doc)  │
│   - 部分 handler 完全没有 WS 通知 (如 workspace CRUD, member ops)   │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐      ┌──────────────────────────┐
│  Desktop App (Tauri)     │      │  Web Frontend            │
│                          │      │                          │
│  单 WS 连接 per vault    │      │  单 WS 连接 per workspace │
│  仅用于 notification     │      │  双向: 通知 + 数据操作    │
│  数据操作走 HTTP sync    │      │  document:save 走 WS     │
│                          │      │  folder/trash ops 走 WS  │
└──────────────────────────┘      └──────────────────────────┘
```

### 1.2 当前 NotificationHub 的局限

| 问题 | 详情 |
|------|------|
| **无连接注册表** | Hub 只维护 `workspace_id → broadcast::Sender` 映射, 不知道谁连着、有多少连接、每个连接属于哪个用户 |
| **无 session 索引** | 无法通过 `user_id` 或 `session_id` 查找到对应的 WS 连接, REST handler 无法向特定用户推送消息 |
| **REST 无法 dispatch 到 WS** | REST handler 只能通过 `hub.publish()` 广播到整个 workspace, 无法做精细化推送 (如只通知被移除的成员) |
| **workspace 级别绑定** | 客户端必须为每个 workspace 建立独立 WS 连接; 如果用户同时属于多个 workspace, 需要多个连接 |
| **无 user-level 事件通道** | 用户级事件 (如被邀请到新 workspace、workspace 被删除) 没有推送通道 |
| **广播包含发送者** | 所有 broadcast 消息都发给所有订阅者(包括触发操作的那个), 客户端需要自己过滤, 且 web/desktop 过滤逻辑不同 |

### 1.3 Desktop vs Web 操作路径不对称

| 操作 | Web Frontend | Desktop App |
|------|-------------|-------------|
| 文档保存 | WS `document:save` | HTTP `sync/push` (批量) |
| 文件夹创建 | WS `folder:created` | HTTP `sync/push` |
| 文件夹删除 | WS `folder:deleted` | HTTP `sync/push` |
| 回收站恢复 | WS `trash:restore` | HTTP `sync/push` |
| 永久删除 | WS `trash:permanent_delete` | HTTP `sync/push` |
| 清空回收站 | WS `trash:empty_trash` | HTTP `sync/push` |
| 接收通知 | WS broadcast listener | WS broadcast → Tauri event |

**结论**: Desktop 把 WS 当作纯通知信道, 所有数据操作走 HTTP sync; Web 把 WS 当作双向数据通道。Desktop 的 `cloud_ws_send` Tauri command 已存在但前端 hooks 中**完全没有调用**。

---

## 2. 设计目标

### 2.1 核心目标

1. **单一 WS 连接 (singleton)**: App/Web 只需建立一个 WS 连接, 覆盖该用户所有 workspace 的事件
2. **服务端自动订阅**: 连接建立时服务端查询用户的所有 workspace membership 并自动订阅, 无需客户端手动 subscribe/unsubscribe; membership 变更时服务端实时更新订阅
3. **多 vault 后台同步**: Desktop 即使只打开了一个 vault, 也能收到其他 vault 对应 workspace 的变更事件, 在后台触发 sync, 无需用户切换
4. **REST → WS dispatch**: REST handler 处理完业务逻辑后, 能 lookup 到相关 WS 连接并推送通知
5. **补全缺失的 WS operation**: 包括 workspace CRUD 通知、member 变更、like/unlike 等
6. **统一 desktop/web 的通知接收模型**: 两端都通过同一个 WS 连接接收所有类型的事件

### 2.2 非目标

- 不改变 desktop 的 sync 数据传输机制 (仍走 HTTP sync/push, sync/pull)
- 不改变 web frontend 的 document:save 走 WS 的模式
- 不引入新的消息队列中间件

---

## 3. 新架构设计

### 3.1 总体架构

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Web Service                                                          │
│                                                                       │
│  AppState { pool, public_base_url, hub: ConnectionHub }               │
│                                                                       │
│  ConnectionHub                                                        │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │                                                             │      │
│  │  sessions: HashMap<SessionId, SessionEntry>                 │      │
│  │   ├─ user_id, username, device_id, client_type              │      │
│  │   ├─ workspace_subscriptions: HashSet<WorkspaceId>          │      │
│  │   └─ sender: mpsc::Sender<ServerMessage>                    │      │
│  │                                                             │      │
│  │  user_sessions: HashMap<UserId, HashSet<SessionId>>         │      │
│  │  workspace_sessions: HashMap<WorkspaceId, HashSet<SessionId>│      │
│  │                                                             │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                                                                       │
│  WS Route: /api/v1/live (用户级, 不再绑定 workspace_id)               │
│                                                                       │
│  REST Handlers → hub.publish_to_workspace(wid, event, exclude?)       │
│               → hub.publish_to_user(uid, event)                       │
│               → hub.publish_to_session(sid, event)                    │
│               → hub.disconnect_user_from_workspace(uid, wid)          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 ConnectionHub 数据结构

```rust
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

/// 服务端发给客户端的消息
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum ServerMessage {
    // ---- workspace-scoped events (现有) ----
    #[serde(rename = "document:changed")]
    DocumentChanged { workspace_id: String, /* ...existing fields... */ },
    #[serde(rename = "document:deleted")]
    DocumentDeleted { workspace_id: String, /* ... */ },
    #[serde(rename = "document:trashed")]
    DocumentTrashed { workspace_id: String, /* ... */ },
    #[serde(rename = "sync:required")]
    SyncRequired { workspace_id: String, reason: String },

    // ---- workspace-scoped events (新增) ----
    #[serde(rename = "workspace:updated")]
    WorkspaceUpdated { workspace_id: String, name: String, publish_title: Option<String> },
    #[serde(rename = "workspace:deleted")]
    WorkspaceDeleted { workspace_id: String },
    #[serde(rename = "member:joined")]
    MemberJoined { workspace_id: String, user_id: String, username: String, role: String },
    #[serde(rename = "member:removed")]
    MemberRemoved { workspace_id: String, user_id: String, username: String },
    #[serde(rename = "member:left")]
    MemberLeft { workspace_id: String, user_id: String, username: String },
    #[serde(rename = "member:role-changed")]
    MemberRoleChanged { workspace_id: String, user_id: String, new_role: String },
    #[serde(rename = "document:status-changed")]
    DocumentStatusChanged { workspace_id: String, relative_path: String, status: String },

    // ---- user-scoped events (新增) ----
    #[serde(rename = "workspace:invited")]
    WorkspaceInvited { workspace_id: String, workspace_name: String, invited_by: String },

    // ---- connection-scoped ----
    #[serde(rename = "connected")]
    Connected { session_id: String, workspaces: Vec<WorkspaceBrief> },
    #[serde(rename = "ack")]
    Ack { ref_id: Option<String>, ok: bool, error: Option<String>, /* extra fields */ },
    #[serde(rename = "pong")]
    Pong {},
}

/// connected 消息中返回的 workspace 摘要
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceBrief {
    pub id: String,
    pub name: String,
    pub role: String,
    pub workspace_clock: i64,
}

/// 客户端发给服务端的消息
/// 注意: 没有 subscribe/unsubscribe — 服务端自动订阅用户所有 workspace
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    #[serde(rename = "document:save")]
    DocumentSave { workspace_id: String, /* ...existing fields... */ },
    #[serde(rename = "folder:created")]
    FolderCreated { workspace_id: String, relative_path: String },
    #[serde(rename = "folder:deleted")]
    FolderDeleted { workspace_id: String, relative_path: String },
    #[serde(rename = "trash:restore")]
    TrashRestore { workspace_id: String, /* ... */ },
    #[serde(rename = "trash:permanent_delete")]
    TrashPermanentDelete { workspace_id: String, /* ... */ },
    #[serde(rename = "trash:empty_trash")]
    TrashEmptyTrash { workspace_id: String },
    #[serde(rename = "ping")]
    Ping {},
}

/// 单个 WS 会话
struct SessionEntry {
    user_id: String,
    username: String,
    device_id: Option<String>,
    client_type: String, // "desktop" | "web"
    /// 服务端自动管理, 连接时从 DB 加载, 运行时通过 hub 方法增减
    workspace_subscriptions: HashSet<String>,
    sender: mpsc::Sender<ServerMessage>,
    connected_at: chrono::DateTime<chrono::Utc>,
}

/// 核心 Hub
pub struct ConnectionHub {
    sessions: Arc<RwLock<HashMap<String, SessionEntry>>>,
    user_sessions: Arc<RwLock<HashMap<String, HashSet<String>>>>,
    workspace_sessions: Arc<RwLock<HashMap<String, HashSet<String>>>>,
}
```

### 3.3 ConnectionHub 核心方法

```rust
impl ConnectionHub {
    /// 注册新连接, 并自动订阅用户的所有 workspace
    /// workspace_ids 由调用方从 DB 查询 workspace_members 获得
    pub async fn register(
        &self, session_id: &str, user_id: &str, username: &str,
        device_id: Option<&str>, client_type: &str,
        workspace_ids: Vec<String>,
        sender: mpsc::Sender<ServerMessage>,
    );

    /// 注销连接 (断开时调用), 自动清理所有 workspace 订阅
    pub async fn unregister(&self, session_id: &str);

    /// 运行时增加 workspace 订阅 (如: 用户通过 REST 接受邀请加入新 workspace)
    pub async fn add_workspace(&self, session_id: &str, workspace_id: &str);

    /// 运行时移除 workspace 订阅 (如: 用户被踢出 workspace)
    pub async fn remove_workspace(&self, session_id: &str, workspace_id: &str);

    // ---- Dispatch 方法 (REST handlers 和 WS handlers 都可调用) ----

    /// 广播到 workspace 所有订阅者, 可排除指定 session
    pub async fn publish_to_workspace(
        &self, workspace_id: &str, event: ServerMessage, exclude_session: Option<&str>,
    );

    /// 发送给特定用户的所有 session
    pub async fn publish_to_user(&self, user_id: &str, event: ServerMessage);

    /// 发送给特定 session
    pub async fn publish_to_session(&self, session_id: &str, event: ServerMessage);

    /// 强制移除用户在某个 workspace 的订阅, 并推送 member:removed 通知
    /// (member:removed / workspace:deleted 时使用)
    pub async fn kick_user_from_workspace(&self, user_id: &str, workspace_id: &str);

    /// 查询 workspace 在线用户列表 (可用于 presence 功能)
    pub async fn workspace_online_users(&self, workspace_id: &str) -> Vec<OnlineUser>;

    /// 清理: 移除已断开的 session (sender closed)
    pub async fn cleanup(&self);
}
```

### 3.4 WS 连接生命周期 (新)

#### 设计理念: 服务端自动订阅, 客户端自行过滤

**不需要客户端显式 subscribe/unsubscribe**。服务端在 WS 握手时查询 `workspace_members` 表, 自动订阅用户所有 workspace。理由:

1. **服务端已有完整的 membership 数据** — 无需客户端告诉服务端它属于哪些 workspace
2. **多 vault 后台同步** — Desktop 即使只打开了一个 vault, 也能收到其他 vault 对应 workspace 的变更事件, 在后台触发 sync, 无需用户切换
3. **简化客户端逻辑** — 客户端只需根据 `workspaceId` 字段过滤/路由事件到对应的 vault handler, 不需要管理订阅状态
4. **Membership 变更自动生效** — 用户被邀请加入新 workspace 或被移除时, 服务端通过 `hub.add_workspace()` / `hub.remove_workspace()` 实时更新订阅, 客户端无感知

#### 连接时序

```text
Client                          Server
  │                               │
  │  GET /api/v1/live             │
  │  ?token=xxx                   │
  │  &clientType=desktop          │
  │  &deviceId=yyy                │
  │──────────────────────────────>│
  │                               │  1. 验证 token → 获取 user
  │                               │  2. SELECT workspace_id, role FROM workspace_members
  │                               │     WHERE user_id = ?
  │                               │  3. 批量获取每个 workspace 的 clock
  │                               │  4. 生成 session_id
  │                               │  5. hub.register(sid, user, workspace_ids, sender)
  │                               │     → 自动订阅所有 workspace
  │  {"type":"connected",         │
  │   "sessionId":"...",          │
  │   "workspaces":[              │  ← 返回所有已订阅的 workspace 摘要
  │     {"id":"ws-abc",           │
  │      "name":"My Notes",       │
  │      "role":"owner",          │
  │      "workspaceClock":123},   │
  │     {"id":"ws-def",           │
  │      "name":"Team Wiki",      │
  │      "role":"editor",         │
  │      "workspaceClock":456}    │
  │   ]}                          │
  │<──────────────────────────────│
  │                               │
  │  (ws-abc 有人编辑了文档)        │
  │  {"type":"document:changed",  │  ← 即使当前打开的不是 ws-abc,
  │   "workspaceId":"ws-abc",...} │    Desktop 也能后台触发 sync
  │<──────────────────────────────│
  │                               │
  │  (ws-def 有人编辑了文档)        │
  │  {"type":"document:changed",  │
  │   "workspaceId":"ws-def",...} │
  │<──────────────────────────────│
  │                               │
  │  {"type":"document:save",     │  操作消息带 workspaceId
  │   "workspaceId":"ws-def",     │  服务端验证 session 是否订阅了
  │   "relativePath":"...",       │  该 workspace (即是否有权限)
  │   ...}                        │
  │──────────────────────────────>│
  │                               │
  │  (被邀请加入新 workspace)       │
  │  {"type":"member:joined",     │  ← 服务端自动 add_workspace,
  │   "workspaceId":"ws-ghi",...} │    客户端无需手动 subscribe
  │<──────────────────────────────│
  │                               │
  │  (被踢出某 workspace)           │
  │  {"type":"member:removed",    │  ← 服务端自动 remove_workspace,
  │   "workspaceId":"ws-abc",...} │    后续不再收到该 workspace 事件
  │<──────────────────────────────│
```

#### 客户端事件路由 (Desktop)

```text
WS message received
  │
  ├── workspaceId 匹配当前打开的 vault binding?
  │     YES → 全部处理 (UI 更新 + sync)
  │     NO  → 仅触发后台 sync (如果该 workspace 有本地 vault binding)
  │            没有本地 binding → 忽略 (或仅更新 workspace list UI)
  │
  ├── user-scoped 事件 (无 workspaceId)?
  │     → 更新全局状态 (如 workspace 列表)
```

#### 客户端事件路由 (Web)

```text
WS message received
  │
  ├── workspaceId 匹配当前页面的 workspace?
  │     YES → 实时更新 UI (文档列表、编辑器、成员列表等)
  │     NO  → 轻量处理 (如更新侧边栏 workspace 列表的 badge)
  │
  ├── user-scoped 事件?
  │     → 更新全局 notification / workspace 列表
```

**关键变化**:
- WS endpoint 从 `/api/v1/workspaces/:workspace_id/live` 变为 `/api/v1/live` (用户级)
- **无需 subscribe/unsubscribe 消息** — 服务端连接时自动订阅, 运行时自动维护
- 所有事件消息带 `workspaceId` 字段, 客户端按需过滤和路由
- Desktop 可以同时接收多个 vault 的事件, 后台跨 vault 同步
- `connected` 消息携带完整的 workspace 列表和各自的 clock, 客户端可据此决定哪些需要 sync

### 3.5 REST → WS Dispatch 流程

```text
REST Request: DELETE /api/v1/workspaces/:id
    │
    ▼
workspace handler:
    1. 业务逻辑 (删除 workspace)
    2. hub.publish_to_workspace(wid, WorkspaceDeleted { ... }, None)
       → 所有订阅该 workspace 的 session 都收到通知
    3. hub.remove_workspace_subscriptions(wid)
       → 清理所有该 workspace 的订阅关系
    4. 返回 HTTP response

REST Request: POST /api/v1/workspaces/:id/members/:uid/remove
    │
    ▼
member handler:
    1. 业务逻辑 (移除 member)
    2. hub.publish_to_workspace(wid, MemberRemoved { user_id, ... }, None)
       → 通知 workspace 其他成员
    3. hub.kick_user_from_workspace(removed_user_id, wid)
       → 被移除用户的 session 取消 workspace 订阅并收到通知
    4. 返回 HTTP response

REST Request: POST /api/v1/workspace-invites/:token/accept
    │
    ▼
invite handler:
    1. 业务逻辑 (接受邀请, 加入 workspace)
    2. hub.publish_to_workspace(wid, MemberJoined { ... }, None)
       → 通知 workspace 现有成员
    3. hub.add_workspace_for_user(new_member_id, wid)
       → 自动为该用户的所有在线 session 添加 workspace 订阅
    4. hub.publish_to_user(new_member_id, MemberJoined { ... })
       → 通知新成员, 客户端自动开始接收该 workspace 事件
    5. 返回 HTTP response
```

---

## 4. 缺失的 WS Operations

### 4.1 需要新增的事件 (Server → Client)

| 事件 | 触发场景 | 优先级 | scope |
|------|----------|--------|-------|
| `workspace:updated` | PUT workspace (名称/标题变更) | MEDIUM | workspace |
| `workspace:deleted` | DELETE workspace | HIGH | workspace |
| `member:joined` | 接受邀请加入 workspace | MEDIUM | workspace |
| `member:removed` | 被踢出 workspace | HIGH | workspace + user |
| `member:left` | 主动离开 workspace | MEDIUM | workspace |
| `member:role-changed` | 角色变更 | MEDIUM | workspace |
| `document:status-changed` | 文档状态变更 (draft/published/archived) | MEDIUM | workspace |
| `workspace:invited` | 被邀请到新 workspace (user-level) | LOW | user |

### 4.2 客户端操作 (Client → Server)

无需新增客户端操作。`subscribe` / `unsubscribe` 不再需要 — 服务端在连接时自动订阅用户的所有 workspace, 运行时通过 hub 方法动态维护。

客户端操作消息唯一的变化是增加 `workspaceId` 字段 (原来隐含在 WS URL path 中)。

### 4.3 尚未实现的业务功能

| 功能 | 当前状态 | 说明 |
|------|----------|------|
| like/unlike | 无 DB schema, 无 API, 无前端 | 需要先设计数据模型, 如 `document_likes(user_id, document_id, workspace_id)` |
| bookmark/收藏 | 无 | 类似 like, 用户级 |
| presence (在线状态) | 无 | 新 hub 设计天然支持 `workspace_online_users()` |
| typing indicator | 无 | 实时协作可选功能 |

---

## 5. 迁移方案

### 5.1 兼容策略

建议**保留旧的 per-workspace endpoint** 一段时间, 新旧并存:

```
旧: GET /api/v1/workspaces/:workspace_id/live   (deprecated, 继续工作)
新: GET /api/v1/live                              (推荐)
```

旧 endpoint 内部实现改为: 建立连接 → 仅自动订阅 URL 中指定的 workspace (而非全部), 行为与现有一致, 作为过渡方案。

### 5.2 Desktop 迁移

1. `ws_client.rs` 修改 WS URL 为 `/api/v1/live` (不再带 workspace_id path)
2. 连接成功后解析 `connected` 消息中的 `workspaces` 数组, 获取所有 workspace 的 clock
3. 收到事件时按 `workspaceId` 路由:
   - 匹配当前打开的 vault binding → 更新 UI + sync
   - 匹配其他 vault binding → 仅后台触发 sync pull
   - 无匹配 binding → 忽略 (或更新 workspace 列表 UI)
4. `start_cloud_listener` 不再需要 `workspace_id` 参数, 变为 `start_cloud_listener(server_url, token, device_id)`
5. 切换 vault 时无需重连 WS, 只需更新前端事件路由的 "当前活跃 workspace" 指针
6. Tauri 管理的 `WsListenerHandle` 仍然是 singleton, 无需变化

### 5.3 Web 迁移

1. `useWorkspaceSocket.ts` 改为 `useSocket.ts` (用户级 singleton, 提供 React context)
2. 连接在用户登录后建立, 登出或 token 过期时断开
3. 进入 workspace 页面时从 context 获取 socket, 按 `workspaceId` 过滤事件, 不需要建立新连接
4. `request()` 方法需要在消息中附带 `workspaceId`

---

## 6. 发现的 Bug 和问题

### 6.1 Bug

| # | 严重度 | 文件 | 描述 |
|---|--------|------|------|
| B1 | **HIGH** | `handlers/live.rs` | **folder:created 和 folder:deleted 操作成功后不返回 ack**。只在失败时发送 error ack, 成功时仅 publish `sync:required`。Web 前端的 `request()` 会等待 30s 后 timeout reject, 用户体验为"操作无响应"后突然生效。 |
| B2 | **MEDIUM** | `handlers/live.rs` | **folder:deleted 的 `record_folder_deletion` 和 SQL DELETE 缺少事务一致性保证**。虽然包在同一个 tx 中, 但如果 `record_folder_deletion` 成功而 DELETE 失败, 错误 ack 发出但 tx 未显式 rollback (依赖 drop 的隐式 rollback, 这是正确的, 但错误消息不含细节)。 |
| B3 | **MEDIUM** | `hub.rs` | **subscribe() 存在 TOCTOU race**。先 read-lock 检查 channel 是否存在, release, 再 write-lock 创建。两个并发 subscribe 可能在 read-lock 阶段都发现不存在, 然后都进入 write-lock 阶段。虽然 `or_insert_with` 能正确处理, 但多余的 write-lock 获取是不必要的竞争。 |
| B4 | **LOW** | `ws_client.rs` | **outbox 使用 broadcast channel (capacity=64), 消息在 WS 断开期间会丢失**。Desktop 实际上不通过 WS 发送操作消息所以影响不大, 但如果未来启用 WS 发送, 断线期间的消息会静默丢失。 |

### 6.2 设计问题

| # | 严重度 | 描述 |
|---|--------|------|
| D1 | **HIGH** | **REST handler 缺少 WS 通知**: `delete_workspace`, `remove_member`, `update_member_role`, `leave_workspace`, `transfer_ownership` 这些 REST handler 执行完业务逻辑后没有任何 WS 通知, 已连接的客户端感知不到这些变更。 |
| D2 | **HIGH** | **无法通过 REST 请求 dispatch 到特定用户的 WS 连接**: 当前 hub 只有 `publish(workspace_id, event)`, REST handler 无法向被移除的成员推送 "你已被移除" 的消息。 |
| D3 | **MEDIUM** | **Desktop 和 Web 操作路径严重不对称**: 同一个 "创建文件夹" 操作, Web 走 WS `folder:created`, Desktop 走 HTTP `sync/push`。如果两套路径的行为不一致 (如通知时机、冲突处理), 可能产生难以排查的 bug。 |
| D4 | **MEDIUM** | **广播包含发送者自身**: Hub 广播到所有 subscriber, 包括触发操作的 session。Desktop 按 `deviceId + source` 过滤, Web 按 `sourceSessionId` 过滤。两套过滤逻辑分散在不同客户端, 容易漏过。建议服务端在 dispatch 时排除 sender。 |
| D5 | **MEDIUM** | **Token 在 URL query string 中**: WS 握手时 token 作为 query param 传递, 会出现在 Nginx access log、CDN 日志等处。虽然这是 WS 的常见做法 (无法自定义 header), 但应在设计中考虑短期 token 或 ticket 模式。 |
| D6 | **LOW** | **无心跳超时检测**: 客户端每 30s 发 ping, 但双方都没有检测 pong 超时。如果 TCP 连接无声断开 (如 NAT 超时), 连接会一直保持在 hub 中直到下次发送失败。 |
| D7 | **LOW** | **channel capacity 固定 256**: 高并发编辑场景可能导致 lagged, 虽然有 `sync:required` 兜底, 但频繁 lag 会增加不必要的全量 pull。 |
| D8 | **LOW** | **folder:changed 是废弃代码**: 没有客户端发送此消息, 但 handler 仍然存在, 应标记 deprecated 或移除。 |
| D9 | **LOW** | **`cloud_ws_send` Tauri command 已注册但从未被前端调用**: Desktop 前端 hooks 中没有任何地方调用 `cloud_ws_send`, 这个 command 是死代码。 |

### 6.3 文档问题

| # | 描述 |
|---|------|
| DOC1 | `api-ws-operations.md` 引用了不存在的 `PUT /api/v1/workspaces/:id/documents` 和 `POST /api/sync/workspace`, 这些 endpoint 在当前 router 中不存在。 |
| DOC2 | `src/main.ts` 中有对旧 endpoint `POST /api/sync/workspace` 的引用 (可能是 backup 文件 `lib.rs.bak` 的残留)。 |

---

## 7. 新 Hub 的关键设计决策

### 7.1 消息发送排除发送者

```rust
// 新设计: publish_to_workspace 支持 exclude
hub.publish_to_workspace(
    workspace_id,
    event,
    Some(sender_session_id),  // 排除发送者
);
```

这样客户端不再需要自行过滤自己的消息, 减少两端的耦合和 bug 风险。

### 7.2 mpsc vs broadcast

| 方案 | 优点 | 缺点 |
|------|------|------|
| **broadcast (现有)** | 简单, 新增 subscriber 只需 `.subscribe()` | 无法排除特定 receiver, 所有消费者共享容量上限 |
| **per-session mpsc (推荐)** | 每个 session 独立 channel, 可精确控制发送对象 | 需要手动管理 session 注册/注销, 遍历发送 |

推荐 **per-session mpsc**: 每个 WS session 在 register 时创建一个 `mpsc::Sender`, hub 发送消息时遍历目标 session 列表逐个 send。好处:
- 排除发送者自然实现 (遍历时 skip)
- 可以向特定 user/session 发送消息
- 单个慢消费者不影响其他 session
- 发送失败 (channel closed) 可以触发 session cleanup

### 7.3 Token 安全

建议引入 **一次性 ticket 模式**:

```text
1. Client: POST /api/v1/live/ticket  (带 Bearer token)
   → Response: { "ticket": "short-lived-uuid", "expiresIn": 30 }
   
2. Client: GET /api/v1/live?ticket=short-lived-uuid
   → Server 验证并消费 ticket, 建立 WS 连接
```

Ticket 一次性使用, 30s 过期, 不会在日志中留下长期有效的 token。

### 7.4 心跳与超时

```text
Client → Server: ping (每 30s)
Server → Client: pong

Server 端: 如果 60s 未收到任何消息 (包括 ping), 
           主动关闭连接并 unregister session。

Client 端: 如果 60s 未收到 pong, 
           认为连接已断开, 触发重连。
```

---

## 8. 事件协议完整定义

### 8.1 Server → Client

```jsonc
// ---- 连接生命周期 ----
{ "type": "connected", "sessionId": "uuid", "workspaces": [{"id": "...", "name": "...", "role": "...", "workspaceClock": 123}] }
{ "type": "pong" }
{ "type": "ack", "ref": "client-ref", "ok": true, /* extra data */ }
{ "type": "ack", "ref": "client-ref", "ok": false, "error": "message" }

// ---- workspace-scoped 文档事件 ----
{ "type": "document:changed", "workspaceId": "...", "relativePath": "...", "contentHash": "...", "updatedClock": 123, "editedBy": "...", "source": "web|desktop", "deviceId": "..." }
{ "type": "document:deleted", "workspaceId": "...", "relativePath": "...", "deletedClock": 123 }
{ "type": "document:trashed", "workspaceId": "...", "relativePath": "...", "action": "trashed|restored" }
{ "type": "document:status-changed", "workspaceId": "...", "relativePath": "...", "status": "draft|published|archived", "changedBy": "..." }
{ "type": "sync:required", "workspaceId": "...", "reason": "folder-changed|lagged|push" }

// ---- workspace-scoped 管理事件 ----
{ "type": "workspace:updated", "workspaceId": "...", "name": "...", "publishTitle": "..." }
{ "type": "workspace:deleted", "workspaceId": "..." }
{ "type": "member:joined", "workspaceId": "...", "userId": "...", "username": "...", "role": "..." }
{ "type": "member:removed", "workspaceId": "...", "userId": "...", "username": "..." }
{ "type": "member:left", "workspaceId": "...", "userId": "...", "username": "..." }
{ "type": "member:role-changed", "workspaceId": "...", "userId": "...", "newRole": "..." }

// ---- user-scoped 事件 ----
{ "type": "workspace:invited", "workspaceId": "...", "workspaceName": "...", "invitedBy": "..." }
```

### 8.2 Client → Server

```jsonc
// ---- 连接管理 ----
{ "type": "ping" }

// ---- 文档操作 (需 editor+ 权限, 服务端校验 session 是否已订阅该 workspace) ----
{ "type": "document:save", "workspaceId": "...", "ref": "...", "relativePath": "...", "content": "...", "baseHash": "..." }

// ---- 文件夹操作 ----
{ "type": "folder:created", "workspaceId": "...", "ref": "...", "relativePath": "..." }
{ "type": "folder:deleted", "workspaceId": "...", "ref": "...", "relativePath": "..." }

// ---- 回收站操作 ----
{ "type": "trash:restore", "workspaceId": "...", "ref": "...", "trashId": "..." }
{ "type": "trash:permanent_delete", "workspaceId": "...", "ref": "...", "trashId": "..." }
{ "type": "trash:empty_trash", "workspaceId": "...", "ref": "..." }
```

---

## 9. 实现优先级建议

| 阶段 | 内容 | 依赖 |
|------|------|------|
| **P0** | 新建 `ConnectionHub` 数据结构, 实现 register/unregister (connect 时自动订阅所有 workspace) | 无 |
| **P0** | 新建 `/api/v1/live` endpoint, connect 时查询 workspace_members 并自动订阅 | ConnectionHub |
| **P0** | 修复 folder:created/deleted 缺少成功 ack 的 bug (B1) | 无 |
| **P1** | REST handler 增加 WS 通知 (D1): workspace delete, member remove/leave/role-change | ConnectionHub |
| **P1** | REST handler 中调用 hub.add_workspace / hub.remove_workspace 实时更新订阅 | ConnectionHub |
| **P1** | Desktop `ws_client.rs` 迁移到用户级连接, 事件按 workspaceId 路由到对应 vault | 新 endpoint |
| **P1** | Web `useWorkspaceSocket.ts` 重构为用户级 singleton `useSocket.ts` | 新 endpoint |
| **P2** | 引入 ticket 模式替代 query string token (D5) | 新 endpoint |
| **P2** | 心跳超时检测 (D6) | 新 endpoint |
| **P2** | 添加 presence (在线用户列表) | ConnectionHub |
| **P3** | like/unlike 功能 (需新建 DB schema + API + WS event) | ConnectionHub |
| **P3** | 移除废弃代码: folder:changed handler (D8) | 无 |
| **P3** | 旧 per-workspace endpoint 标记 deprecated | 迁移完成后 |
