# Notification-Based Sync — Implementation Design

> Status: **Implementation-Ready**
> Date: 2026-05-05
> Base: notification-sync-v3.md (concept) → 本文档 (落地)

---

## 0. 现状盘点

在开始设计之前，先清点现有代码资产，明确哪些**已有**、哪些**需要新建**、哪些**需要改造**。

### 已有且保留（不改或微调）

| 组件 | 位置 | 状态 |
|------|------|------|
| `save_document_version()` | `handlers/document.rs` | ✅ 核心保存+合并逻辑，WS handler 直接复用 |
| `smart_three_way_merge()` | `util.rs` | ✅ 行级三方合并，conflict_ranges 输出 |
| `sync::pull` / `sync::push` | `handlers/sync.rs` | ✅ Desktop 批量同步不变 |
| `sync::resolve_conflict` | `handlers/sync.rs` | ✅ 冲突解决（accept_local/cloud/keep_both/manual_merge） |
| REST `PUT /documents` | `handlers/document.rs` | ✅ Web 保存降级通道，保留 |
| `AppState { pool, public_base_url }` | `lib.rs` | 🔧 需要加 `hub` 字段 |
| `collect_sync_documents` / `save_sync_bases` / `load_sync_bases` | `workspace.rs` | ✅ Desktop sync base 机制不变 |
| `useCloudSync` hook | `src/hooks/useCloudSync.ts` | ✅ Desktop 同步主逻辑保留 |
| `usePeriodicSync` hook | `src/hooks/usePeriodicSync.ts` | 🔧 需要感知 WS 连接状态 |
| Web `api.ts` | `frontend/src/api.ts` | ✅ REST 客户端保留，补充 WS 层 |
| Web `Workspace.tsx` | `frontend/src/pages/Workspace.tsx` | 🔧 save 逻辑改为 WS 优先 |
| MySQL schema | `infra/mysql/001-006` | ✅ 无需新表 |
| Axum `Cargo.toml` | `services/jtype-web/Cargo.toml` | 🔧 启用 `axum/ws` feature |

### 需要新建

| 组件 | 位置 | 用途 |
|------|------|------|
| `NotificationHub` | `services/jtype-web/src/hub.rs` | 进程内广播（`tokio::sync::broadcast` per workspace） |
| WebSocket handler | `services/jtype-web/src/handlers/live.rs` | 统一 WS endpoint（通知 + Web 保存） |
| `useWorkspaceSocket` | `frontend/src/hooks/useWorkspaceSocket.ts` | Web WS 连接管理 |
| `offlineDb.ts` | `frontend/src/lib/offlineDb.ts` | IndexedDB 封装 |
| `useOfflineSync` | `frontend/src/hooks/useOfflineSync.ts` | Web 离线保存 + 重连协调 |
| Desktop WS client | `src-tauri/src/ws_client.rs` | Rust WS 接收通知 |
| `useEagerSync` | `src/hooks/useEagerSync.ts` | Desktop 保存后即时推送 |

### 应去除（v3 概念文档中的过度设计）

| 概念 | 原因 |
|------|------|
| `document:delete` / `document:trash` WS 消息 | **过早优化**。Web 删除/回收站操作低频，REST 足够。删除后通过 Hub 广播通知即可 |
| 复杂的 RECONCILING 状态机 | Desktop 不需要——现有 pull→push 流程已经是协调。Web 用简单的 "有 pending → flush" 即可 |
| Desktop `SyncConnectionState.pendingPaths` | 不需要显式 pending 列表——sync base diff 天然检测 |
| `BroadcastChannel` 多 tab 协调 | IndexedDB 已共享，多 tab 竞争靠 "最后写入者胜"，v1 不需要 tab 间协调 |
| Presence（Phase 4） | 独立功能，不在本次范围 |
| Redis Pub/Sub（Phase 5） | 单实例阶段不需要 |

---

## 1. 通信架构

### 1.1 全局视图

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloud (Axum)                            │
│                                                             │
│  ┌─────────────────┐     ┌──────────────────┐              │
│  │   REST API       │     │  WebSocket       │              │
│  │                  │     │  /live            │              │
│  │ PUT /documents   │     │                  │              │
│  │ POST /sync/push  ├────►│  NotificationHub │              │
│  │ POST /sync/pull  │     │  (broadcast per  │              │
│  │ DELETE /documents│     │   workspace)     │              │
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

### 1.2 谁用什么协议做什么

| 操作 | Desktop | Web (online) | Web (offline) |
|------|---------|-------------|---------------|
| **保存文档** | REST `POST /sync/push`（单文件或批量） | WS `document:save` → ack | IndexedDB pending_saves |
| **批量同步** | REST `POST /sync/push` + `POST /sync/pull` | N/A | N/A |
| **删除文档** | REST `POST /sync/push` (deletedPaths) | REST `DELETE /documents/:id` | IndexedDB pending (sentinel) |
| **回收站** | REST `POST /sync/push` (trashOperations) | REST `POST /trash/:id/restore` 等 | 不支持离线回收站操作 |
| **接收通知** | WS `document:changed` 等 → trigger pull | WS `document:changed` 等 → refresh UI | N/A（离线收不到） |
| **冲突解决** | REST `POST /conflicts/:id/resolve` | REST `POST /conflicts/:id/resolve` | N/A |

**设计原则**：WS 只做两件事——**Web 保存**和**实时通知**。其余一切走 REST。

### 1.3 WebSocket Endpoint

```
GET /api/v1/workspaces/:workspace_id/live
    ?token=<bearer>
    &clientType=web|desktop
    &deviceId=<id>           // desktop only
```

一个 workspace 一个 WS 连接。每个连接分配 `sessionId`（UUID）。

---

## 2. 服务端实现

### 2.1 NotificationHub

```rust
// services/jtype-web/src/hub.rs

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

/// 发布到 workspace 的事件。序列化为 JSON 发给 WS 客户端。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WorkspaceEvent {
    #[serde(rename = "document:changed")]
    DocumentChanged {
        source_session_id: String,    // 空 = REST 来源
        relative_path: String,
        content_hash: String,
        updated_clock: i64,
        edited_by: String,
        source: String,               // "web" | "desktop"
        device_id: Option<String>,
    },
    #[serde(rename = "document:deleted")]
    DocumentDeleted {
        source_session_id: String,
        relative_path: String,
        deleted_clock: i64,
    },
    #[serde(rename = "document:trashed")]
    DocumentTrashed {
        source_session_id: String,
        relative_path: String,
        action: String,               // "trashed" | "restored"
    },
}

const CHANNEL_CAPACITY: usize = 256;

#[derive(Clone)]
pub struct NotificationHub {
    channels: Arc<RwLock<HashMap<String, broadcast::Sender<WorkspaceEvent>>>>,
}

impl NotificationHub {
    pub fn new() -> Self {
        Self { channels: Arc::new(RwLock::new(HashMap::new())) }
    }

    /// 发布事件到指定 workspace 的所有订阅者
    pub async fn publish(&self, workspace_id: &str, event: WorkspaceEvent) {
        let channels = self.channels.read().await;
        if let Some(tx) = channels.get(workspace_id) {
            let _ = tx.send(event); // receiver 掉线时忽略错误
        }
    }

    /// 订阅指定 workspace 的事件流
    pub async fn subscribe(&self, workspace_id: &str) -> broadcast::Receiver<WorkspaceEvent> {
        {
            let channels = self.channels.read().await;
            if let Some(tx) = channels.get(workspace_id) {
                return tx.subscribe();
            }
        }
        let mut channels = self.channels.write().await;
        let tx = channels
            .entry(workspace_id.to_string())
            .or_insert_with(|| broadcast::channel(CHANNEL_CAPACITY).0);
        tx.subscribe()
    }

    /// 清理无订阅者的 channel（定时调用）
    pub async fn cleanup(&self) {
        let mut channels = self.channels.write().await;
        channels.retain(|_, tx| tx.receiver_count() > 0);
    }
}
```

**设计决策**:
- `WorkspaceEvent` 只有 3 种——changed/deleted/trashed。冲突事件不需要实时推送（保存时 ack 已包含）
- `source_session_id` 为空字符串表示 REST 来源（Desktop push 或 REST save）
- 256 条 buffer。超出时 receiver 收到 `Lagged` 错误 → 发送 `sync:required`

### 2.2 AppState 改造

```rust
// services/jtype-web/src/lib.rs

#[derive(Clone)]
pub struct AppState {
    pub pool: Pool<MySql>,
    pub public_base_url: String,
    pub hub: hub::NotificationHub,     // +++ 新增
}
```

初始化:

```rust
pub fn build_router(pool: Pool<MySql>, public_base_url: String) -> Router {
    let hub = hub::NotificationHub::new();

    // 启动定期清理
    let cleanup_hub = hub.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(300));
        loop {
            interval.tick().await;
            cleanup_hub.cleanup().await;
        }
    });

    let state = AppState { pool, public_base_url, hub };
    // ... 原有路由 + 新增 WS 路由
}
```

### 2.3 WebSocket Handler

```rust
// services/jtype-web/src/handlers/live.rs

// --- 连接升级 ---
pub async fn ws_upgrade(
    State(state): State<AppState>,
    Path(workspace_id): Path<String>,
    Query(auth): Query<WsAuth>,
    ws: WebSocketUpgrade,
) -> Result<Response, AppError>

// --- 连接内处理 ---
async fn handle_ws(socket, state, workspace_id, user, session_id, client_type, device_id, role)

// 两个并行任务:
// Task A: Hub rx → WebSocket sink（广播事件给客户端）
// Task B: WebSocket stream → 处理客户端消息（document:save / ping）
```

**Client → Server 消息（只有两种）**:

| type | 字段 | 权限 | 说明 |
|------|------|------|------|
| `document:save` | `ref`, `relativePath`, `content`, `title?`, `baseContentHash?`, `baseContent?` | editor+ | 复用 `save_document_version()` |
| `ping` | (无) | any | 心跳 |

**Server → Client 消息**:

| type | 触发 | 说明 |
|------|------|------|
| `connected` | 握手完成 | `{ sessionId, workspaceClock }` |
| `ack` | 响应 `document:save` | `{ ref, ok, error?, document? }` |
| `document:changed` | Hub 广播 | 他人保存了文档 |
| `document:deleted` | Hub 广播 | 他人删除了文档 |
| `document:trashed` | Hub 广播 | 他人移入/移出回收站 |
| `sync:required` | broadcast channel lagged | 客户端需要全量 pull |
| `pong` | 响应 ping | |

**为什么不在 WS 上做 delete/trash**: 低频操作（用户不会每秒删几个文件），REST 更简单可靠。REST delete/trash handler 改后发布 Hub 事件即可。

### 2.4 REST Handler 改造——发布 Hub 事件

需要在这些 handler 的成功路径上加 `state.hub.publish()`:

| Handler | 事件 |
|---------|------|
| `document::save_document` (REST PUT) | `DocumentChanged` |
| `document::delete_document` (REST DELETE) | `DocumentDeleted` |
| `sync::push` (for each accepted doc) | `DocumentChanged` |
| `sync::push` (for each deleted path) | `DocumentTrashed { action: "trashed" }` |
| `trash::restore_from_trash` | `DocumentTrashed { action: "restored" }` |
| `trash::permanent_delete` | `DocumentDeleted` |
| `trash::empty_trash` | `DocumentDeleted` (for each) |

**改造量**: 每个 handler 加 1-3 行 `state.hub.publish(...)` 调用。不改变业务逻辑。

### 2.5 依赖变更

```toml
# services/jtype-web/Cargo.toml
[dependencies]
axum = { version = "0.7", features = ["ws"] }   # 加 "ws" feature
futures = "0.3"                                   # 新增，WS stream 处理
# tokio 已有，不需要加
```

### 2.6 路由注册

```rust
// 在 build_router() 中加一行:
.route(
    "/api/v1/workspaces/:workspace_id/live",
    get(handlers::live::ws_upgrade),
)
```

---

## 3. Web 前端实现

### 3.1 文件结构

```
services/jtype-web/frontend/src/
  hooks/
    useWorkspaceSocket.ts    // 新增: WS 连接管理
    useOfflineSync.ts        // 新增: 离线保存+协调
  lib/
    offlineDb.ts             // 新增: IndexedDB 封装
  pages/
    Workspace.tsx            // 改造: 集成 WS 保存 + 离线
```

### 3.2 `offlineDb.ts` — IndexedDB 封装

```typescript
// services/jtype-web/frontend/src/lib/offlineDb.ts

const DB_NAME = 'jtype-offline'
const DB_VERSION = 1

interface CachedDocument {
  workspaceId: string       // compound key part 1
  relativePath: string      // compound key part 2
  content: string
  contentHash: string
  title: string
  cloudClock: number
  locallyModified: boolean
  baseContentHash: string   // 上次从 cloud 加载时的 hash
  baseContent: string       // 上次从 cloud 加载时的内容
  cachedAt: number
}

interface PendingSave {
  id?: number               // auto-increment
  workspaceId: string
  relativePath: string
  content: string           // '__DELETED__' = 删除操作
  baseContentHash: string
  baseContent: string
  savedAt: number
}

interface SyncState {
  workspaceId: string       // key
  lastSyncedClock: number
  lastOnlineAt: number
}

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('documents_cache')) {
        db.createObjectStore('documents_cache', { keyPath: ['workspaceId', 'relativePath'] })
      }
      if (!db.objectStoreNames.contains('pending_saves')) {
        const store = db.createObjectStore('pending_saves', { keyPath: 'id', autoIncrement: true })
        store.createIndex('by_workspace_path', ['workspaceId', 'relativePath'])
      }
      if (!db.objectStoreNames.contains('sync_state')) {
        db.createObjectStore('sync_state', { keyPath: 'workspaceId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// 简化 API: get / put / delete / getAll 的 promise 封装
export async function idbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> { ... }
export async function idbPut<T>(storeName: string, value: T): Promise<void> { ... }
export async function idbDelete(storeName: string, key: IDBValidKey): Promise<void> { ... }
export async function idbGetAll<T>(storeName: string): Promise<T[]> { ... }
```

**设计决策**:
- 不引入 `idb` 库——3 个 store 够简单，原生 API + promise 封装即可
- `pending_saves` 用 auto-increment key + index on `[workspaceId, relativePath]` 来去重
- `'__DELETED__'` sentinel 比 `null` 更安全（不会被误认为空文件）

### 3.3 `useWorkspaceSocket` Hook

```typescript
// services/jtype-web/frontend/src/hooks/useWorkspaceSocket.ts

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export function useWorkspaceSocket(workspaceId: string | undefined) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pendingRef = useRef<Map<string, { resolve, reject }>>(new Map())
  const listenersRef = useRef<Set<(event: any) => void>>(new Set())
  // ... reconnect logic (1s→2s→4s→...→60s backoff)

  // 发送请求并等待 ack
  const request = useCallback((msg) => {
    return new Promise((resolve, reject) => {
      const ref = crypto.randomUUID()
      msg.ref = ref
      pendingRef.current.set(ref, { resolve, reject })
      ws.send(JSON.stringify(msg))
      setTimeout(() => { /* 30s timeout → reject */ }, 30_000)
    })
  }, [])

  // 订阅 Hub 事件（非 ack）
  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn)
    return () => listenersRef.current.delete(fn)
  }, [])

  return { status, sessionId, request, subscribe, wsRef }
}
```

### 3.4 `useOfflineSync` Hook

```typescript
// services/jtype-web/frontend/src/hooks/useOfflineSync.ts

export function useOfflineSync(workspaceId: string | undefined) {
  const [hasPending, setHasPending] = useState(false)

  // 离线保存: 写 IndexedDB
  const saveOffline = useCallback(async (relativePath, content, baseContentHash, baseContent) => {
    // 1. Update documents_cache (set locallyModified = true)
    // 2. Upsert pending_saves (collapse by [workspaceId, relativePath])
    setHasPending(true)
  }, [workspaceId])

  // 离线删除
  const deleteOffline = useCallback(async (relativePath) => {
    // pending_saves with content = '__DELETED__'
    setHasPending(true)
  }, [workspaceId])

  // 重连后协调
  const reconcile = useCallback(async (token: string): Promise<ReconcileResult> => {
    // 1. Pull cloud changes since lastSyncedClock
    // 2. For each pending save:
    //    - cloud also changed? → push with base (server does merge)
    //    - cloud deleted + local modified? → push local (re-create)
    //    - local deleted + cloud modified? → cancel deletion, keep cloud
    //    - no cloud change? → push directly
    // 3. Apply cloud-only changes to cache
    // 4. Update sync_state.lastSyncedClock
    // 5. Clear processed pending_saves
    setHasPending(false)
    return { pushed, conflicts, errors }
  }, [workspaceId])

  return { hasPending, saveOffline, deleteOffline, reconcile }
}
```

### 3.5 Workspace.tsx 保存逻辑改造

**现有**: `api.saveDocument()` → REST PUT

**改为**:

```typescript
async function handleSave() {
  const content = editor.getValue()

  if (wsStatus === 'connected') {
    // ── Online: WebSocket 保存 ──
    try {
      const ack = await wsRequest({
        type: 'document:save',
        relativePath: currentDoc.relativePath,
        content,
        title: extractTitle(content),
        baseContentHash: loadedContentHash,
        baseContent: loadedContent,
      })
      if (ack.ok && ack.document) {
        setLoadedContentHash(ack.document.contentHash)
        setLoadedContent(content)
        // 同步更新 IndexedDB cache（供未来离线使用）
        updateCache(workspaceId, currentDoc.relativePath, content, ack.document)
      }
    } catch {
      // WS 发送失败 → 降级到 REST
      try {
        const doc = await api.saveDocument(workspaceId, { ... })
        setLoadedContentHash(doc.contentHash)
      } catch {
        // REST 也失败 → 离线保存
        await saveOffline(currentDoc.relativePath, content, loadedContentHash, loadedContent)
        showToast('Saved offline')
      }
    }
  } else {
    // ── Offline: IndexedDB 保存 ──
    await saveOffline(currentDoc.relativePath, content, loadedContentHash, loadedContent)
    showToast('Saved offline. Will sync when reconnected.')
  }
}
```

**保存降级链**: WS → REST → IndexedDB

### 3.6 实时事件处理

```typescript
useEffect(() => {
  return wsSubscribe((event) => {
    // 自回显过滤
    if (event.sourceSessionId === mySessionId) return

    switch (event.type) {
      case 'document:changed':
        // 刷新文档列表
        api.listDocuments(workspaceId).then(setDocuments)
        // 当前正在编辑的文档被他人修改
        if (event.relativePath === currentDocPath) {
          if (isDirty) {
            // 有未保存修改 → 提示用户
            setStaleWarning({ type: 'dirty', editedBy: event.editedBy })
          } else {
            // 无修改 → 自动刷新
            api.getDocument(workspaceId, currentDocId).then(doc => {
              setContent(doc.content)
              setLoadedContentHash(doc.contentHash)
            })
          }
        }
        break

      case 'document:deleted':
        setDocuments(prev => prev.filter(d => d.relativePath !== event.relativePath))
        if (event.relativePath === currentDocPath) {
          setCurrentDoc(null)
          showToast('This document was deleted by another user.')
        }
        break

      case 'document:trashed':
        api.listDocuments(workspaceId).then(setDocuments)
        break

      case 'sync:required':
        // 落后太多，全量刷新
        api.listDocuments(workspaceId).then(setDocuments)
        break
    }
  })
}, [wsSubscribe, mySessionId, workspaceId, currentDocPath, isDirty])
```

### 3.7 重连协调触发

```typescript
// 当 WS 状态从 disconnected → connected
useEffect(() => {
  if (wsStatus === 'connected' && hasPending) {
    reconcile(getToken()).then(result => {
      if (result.conflicts > 0) {
        showToast(`${result.pushed} changes synced. ${result.conflicts} conflicts need attention.`)
      } else {
        showToast(`${result.pushed} offline changes synced.`)
      }
      // 刷新文档列表
      api.listDocuments(workspaceId).then(setDocuments)
    })
  }
}, [wsStatus, hasPending])
```

### 3.8 Polling Fallback

```typescript
// WS 断线时降级到轮询
useEffect(() => {
  if (wsStatus === 'connected') return // WS 在线不轮询
  const timer = setInterval(() => {
    api.listDocuments(workspaceId).then(setDocuments)
  }, 10_000)
  return () => clearInterval(timer)
}, [wsStatus, workspaceId])
```

### 3.9 Stale Warning UI

```
无未保存修改时:
  ┌────────────────────────────────────────────────┐
  │ ⚠ Modified by {username}. [Reload]             │
  └────────────────────────────────────────────────┘

有未保存修改时:
  ┌────────────────────────────────────────────────┐
  │ ⚠ Modified by {username}. You have unsaved     │
  │   changes. [Reload (discard)] [Save mine]      │
  └────────────────────────────────────────────────┘
```

### 3.10 Connection Status Indicator

在 Workspace 页面顶部显示:

```
● Connected          (绿色, WS 在线)
● Offline (3 saved)  (红色, 有 3 个 pending saves)
● Syncing...         (黄色, 正在协调)
```

---

## 4. Desktop App 实现

### 4.1 WS Client（Rust）

```rust
// src-tauri/src/ws_client.rs

/// 后台任务: 连接 WS，接收通知，emit Tauri event
pub async fn start_ws_listener(
    app: AppHandle,
    server_url: &str,
    token: &str,
    workspace_id: &str,
    device_id: &str,
) {
    // 1. 构建 wss:// URL
    // 2. 循环: connect → read messages → emit events → reconnect on error
    //    - "connected"         → emit "cloud:ws-connected"
    //    - "document:changed"  → emit "cloud:remote-change"
    //    - "document:deleted"  → emit "cloud:remote-change"
    //    - "document:trashed"  → emit "cloud:remote-change"
    //    - "sync:required"     → emit "cloud:sync-required"
    //    - connection lost     → emit "cloud:ws-disconnected", retry with backoff
}
```

**依赖**: `tokio-tungstenite = { version = "0.24", features = ["native-tls"] }`

### 4.2 WS Client 启动时机

```rust
// src-tauri/src/lib.rs

// 当 vault binding 存在且有 token 时启动 WS listener
// 触发方式: 前端调用新增的 Tauri command
#[tauri::command]
async fn start_cloud_listener(
    app: AppHandle,
    server_url: String,
    token: String,
    workspace_id: String,
    device_id: String,
) -> Result<(), String> {
    tokio::spawn(ws_client::start_ws_listener(
        app, &server_url, &token, &workspace_id, &device_id,
    ));
    Ok(())
}
```

### 4.3 Eager Push（即时推送）

**现有**: 用户 Ctrl+S → 写入磁盘 → 等 periodic sync。
**改为**: 用户 Ctrl+S → 写入磁盘 → **异步推送单文件到 cloud**。

```typescript
// src/hooks/useEagerSync.ts

export function useEagerSync() {
  const { syncToken, workspace, cloudProfile, vaultBindings } = useAppState()

  const pushSingleDocument = useCallback(async (
    relativePath: string,
    content: string,
  ) => {
    const binding = currentVaultBinding(vaultBindings, workspace?.rootPath)
    if (!binding || !syncToken) return  // 未绑定或未登录 → 不推

    // 加载 sync base 作为 3-way merge 的 base
    let baseContent: string | undefined
    let baseHash: string | undefined
    try {
      const bases = await tauri.loadSyncBases(workspace.rootPath)
      baseContent = bases[relativePath]
      if (baseContent) baseHash = await sha256Hex(baseContent)
    } catch { /* first sync, no bases */ }

    try {
      const resp = await fetch(`${serverUrl}/api/v1/workspaces/${binding.workspaceId}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${syncToken}`,
        },
        body: JSON.stringify({
          deviceId: cloudProfile.deviceId,
          documents: [{
            relativePath,
            title: extractTitle(content),
            status: inferStatus(content),
            content,
            baseContentHash: baseHash,
            baseContent: baseContent,
          }],
          deletedPaths: [],
          trashOperations: [],
        }),
      })

      if (resp.ok) {
        const data = await resp.json()
        // 更新 sync base
        if (data.documents?.[0]) {
          await tauri.saveSyncBases(workspace.rootPath, [{
            relativePath,
            content: data.documents[0].content,
          }])
        }
        if (data.conflicts?.length > 0) {
          dispatch({ type: 'SET_CONFLICTS', conflicts: parseSyncConflicts(data.conflicts) })
        }
      }
    } catch {
      // 网络错误 → 文件已保存在本地，periodic sync 会兜底
    }
  }, [syncToken, workspace, cloudProfile, vaultBindings])

  return { pushSingleDocument }
}
```

**集成点**: 在 `EditorShell` 的 save handler 中:

```typescript
const { pushSingleDocument } = useEagerSync()

async function onSave(relativePath: string, content: string) {
  await tauri.writeTextFile(fullPath, content)  // 先写磁盘（现有逻辑）
  pushSingleDocument(relativePath, content)      // 异步推云（不 await，不阻塞 UI）
}
```

### 4.4 Targeted Pull（收到通知后定向拉取）

```typescript
// src/hooks/useCloudEvents.ts

export function useCloudEvents() {
  const { workspace, syncToken, vaultBindings, cloudProfile } = useAppState()

  useEffect(() => {
    const unlisten = listen('cloud:remote-change', async (event) => {
      const { relativePath } = event.payload
      const binding = currentVaultBinding(vaultBindings, workspace?.rootPath)
      if (!binding || !syncToken) return

      // 检查本地是否有修改
      const localContent = await tauri.readTextFile(
        `${workspace.rootPath}/${relativePath}`
      ).catch(() => null)
      const bases = await tauri.loadSyncBases(workspace.rootPath)
      const base = bases[relativePath]

      if (localContent === null || localContent === base) {
        // 本地未修改 → 安全拉取覆盖
        const resp = await fetch(
          `${serverUrl}/api/v1/workspaces/${binding.workspaceId}/sync/pull`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${syncToken}` },
            body: JSON.stringify({ sinceClock: 0, deviceId: cloudProfile.deviceId }),
          }
        )
        const data = await resp.json()
        const cloudDoc = data.documents.find(d => d.relativePath === relativePath)
        if (cloudDoc) {
          await tauri.writeTextFile(`${workspace.rootPath}/${relativePath}`, cloudDoc.content)
          await tauri.saveSyncBases(workspace.rootPath, [
            { relativePath, content: cloudDoc.content }
          ])
          // 通知 React 刷新当前文件
          dispatch({ type: 'RELOAD_FILE', relativePath })
        }
      } else {
        // 本地有修改 → 不覆盖，提示用户
        dispatch({
          type: 'SET_STATUS',
          message: `"${relativePath}" was modified remotely. Sync to merge changes.`
        })
      }
    })

    return () => { unlisten.then(fn => fn()) }
  }, [workspace, syncToken, vaultBindings])
}
```

### 4.5 Periodic Sync 调整

```typescript
// src/hooks/usePeriodicSync.ts — 修改

// 新增参数: wsConnected
export function usePeriodicSync(
  syncFn: () => Promise<void>,
  pullFn: (() => Promise<void>) | null,
  intervalMs: number,
  enabled: boolean,
  wsConnected: boolean = false,  // +++ 新增
) {
  // WS 在线时: 5 分钟间隔（安全网）
  // WS 离线时: 30 秒间隔（现有行为）
  const effectiveInterval = wsConnected
    ? Math.max(intervalMs, 300_000)  // 至少 5 分钟
    : intervalMs

  // ... 其余逻辑不变，只是用 effectiveInterval
}
```

---

## 5. 冲突处理

### 5.1 已有机制（保留不变）

| 机制 | 位置 | 说明 |
|------|------|------|
| 3-way merge | `util.rs` `smart_three_way_merge()` | 自动合并不冲突的行级编辑 |
| `sync_conflicts` 表 | MySQL | 存储 base/local/cloud 内容 + conflict_ranges |
| `resolve_conflict` API | `handlers/sync.rs` | accept_local / accept_cloud / keep_both / manual_merge |
| Desktop conflict UI | `src/components/modals/ConflictModal.tsx`（如有） | 展示冲突列表 |

### 5.2 需要补充的冲突类型

现有 `save_document_version()` 只处理 content conflict（#3）。需要补充：

**Edit-Delete Conflict（#7, #8）**:
- 在 `sync::push` handler 中，当 desktop 推送一个文件但 cloud 上已被删除时检测
- 策略: 优先保留数据 → 重新创建文档，同时在 push response 中标记 `merge_status: "restored_after_delete"`
- **实现**: push handler 检查 `deletedPaths` 中是否有被推送文档的路径，如果有 → 恢复文档 + 通知

**Create-Create Conflict（#6）**:
- 已有机制已覆盖: 当 `save_document_version()` 发现已有同路径文档且无 base → `Unchanged` 或 `Conflict`
- 但当前逻辑在无 base 时直接覆盖。**需要修改**: 无 base + 路径已存在 + 内容不同 → 创建冲突记录

**改动量**: `handlers/document.rs` 中加 ~20 行条件分支。

### 5.3 Web 冲突解决 UI（新增）

当前 Web 前端没有冲突解决 UI。需要新增:

```typescript
// 在 Workspace.tsx 或独立组件中:
// 1. 页面加载时 fetch conflicts: GET /api/v1/workspaces/:id/conflicts (需新增 API)
// 2. 或者在 push/save ack 中获取 conflict 信息
// 3. 显示冲突列表 + 解决按钮

// API: POST /api/v1/workspaces/:id/conflicts/:conflict_id/resolve  (已有)
```

---

## 6. 实现计划（分 4 个阶段）

### Phase 1: Server — Hub + WebSocket + 事件广播

**目标**: Server 支持 WS 连接和实时广播。不改变任何客户端。

| # | 任务 | 文件 | 工作量 |
|---|------|------|--------|
| 1.1 | 创建 `hub.rs` (NotificationHub) | `src/hub.rs` | S |
| 1.2 | `AppState` 加 `hub` 字段 + cleanup task | `src/lib.rs` | S |
| 1.3 | 创建 `handlers/live.rs` (WS upgrade + handler) | `src/handlers/live.rs` | L |
| 1.4 | `handlers/mod.rs` 加 `pub mod live` | `src/handlers/mod.rs` | S |
| 1.5 | 路由注册 `/live` | `src/lib.rs` | S |
| 1.6 | REST handlers 加 Hub 发布 | `document.rs`, `sync.rs`, `trash.rs` | M |
| 1.7 | `Cargo.toml` 加 `ws` feature + `futures` | `Cargo.toml` | S |
| 1.8 | 集成测试: WS 连接 + save + broadcast | `tests/` | M |

**验收**: 用 `websocat` 工具连接 `/live`，通过 REST API 保存文档，验证 WS 收到 `document:changed` 事件。

### Phase 2: Web — 实时通知 + WS 保存 + 连接状态

**目标**: Web 前端通过 WS 保存和接收通知。

| # | 任务 | 文件 | 工作量 |
|---|------|------|--------|
| 2.1 | 创建 `useWorkspaceSocket` hook | `frontend/src/hooks/useWorkspaceSocket.ts` | M |
| 2.2 | Workspace.tsx 保存改为 WS 优先 + REST fallback | `frontend/src/pages/Workspace.tsx` | M |
| 2.3 | 实时事件处理（刷新列表、stale warning） | `frontend/src/pages/Workspace.tsx` | M |
| 2.4 | Connection status indicator | `frontend/src/pages/Workspace.tsx` | S |
| 2.5 | Polling fallback (WS 断线时) | `frontend/src/pages/Workspace.tsx` | S |

**验收**: 两个浏览器 tab 打开同一 workspace。Tab A 保存 → Tab B 2 秒内看到文档列表更新和 stale warning。

### Phase 3: Web — 离线支持

**目标**: Web 支持离线编辑，重连后自动协调。

| # | 任务 | 文件 | 工作量 |
|---|------|------|--------|
| 3.1 | 创建 `offlineDb.ts` (IndexedDB 封装) | `frontend/src/lib/offlineDb.ts` | M |
| 3.2 | 创建 `useOfflineSync` hook | `frontend/src/hooks/useOfflineSync.ts` | L |
| 3.3 | Workspace.tsx 集成离线保存降级链 | `frontend/src/pages/Workspace.tsx` | M |
| 3.4 | 重连后自动协调 + 结果提示 | `frontend/src/pages/Workspace.tsx` | M |
| 3.5 | "Pending offline saves" 状态指示 | `frontend/src/pages/Workspace.tsx` | S |
| 3.6 | IndexedDB quota 和清除数据警告 | `frontend/src/pages/Workspace.tsx` | S |

**验收**: 开 DevTools Network → Offline。编辑保存 → 离线提示。恢复网络 → 自动同步 → 文档出现在 cloud。

### Phase 4: Desktop — WS 通知 + Eager Push

**目标**: Desktop 实时接收变更通知 + 保存后即时推送。

| # | 任务 | 文件 | 工作量 |
|---|------|------|--------|
| 4.1 | `Cargo.toml` 加 `tokio-tungstenite` | `src-tauri/Cargo.toml` | S |
| 4.2 | 创建 `ws_client.rs` (WS listener) | `src-tauri/src/ws_client.rs` | M |
| 4.3 | `lib.rs` 加 `start_cloud_listener` command | `src-tauri/src/lib.rs` | S |
| 4.4 | 创建 `useEagerSync` hook | `src/hooks/useEagerSync.ts` | M |
| 4.5 | EditorShell 集成 eager push | `src/components/editor/EditorShell.tsx` | S |
| 4.6 | 创建 `useCloudEvents` hook (targeted pull) | `src/hooks/useCloudEvents.ts` | M |
| 4.7 | `usePeriodicSync` 感知 WS 状态 | `src/hooks/usePeriodicSync.ts` | S |
| 4.8 | App 启动时触发 `start_cloud_listener` | `src/app/App.tsx` | S |

**验收**: Web 保存文档 → Desktop app 2 秒内自动拉取并更新文件。Desktop 保存 → Web 2 秒内看到更新。

---

## 7. 测试策略

### 7.1 Server 集成测试

```rust
// tests/live_test.rs

#[tokio::test]
async fn ws_connect_and_receive_event() {
    // 1. Setup app with test DB
    // 2. Create user + workspace + auth token
    // 3. Connect WS to /live
    // 4. Verify "connected" message with sessionId
    // 5. REST PUT save document → verify WS receives "document:changed"
}

#[tokio::test]
async fn ws_save_document() {
    // 1. Connect WS
    // 2. Send document:save message
    // 3. Verify ack with ok=true, document returned
    // 4. GET document via REST → confirm content matches
}

#[tokio::test]
async fn ws_save_broadcast_to_other_session() {
    // 1. Connect WS client A and WS client B to same workspace
    // 2. Client A sends document:save
    // 3. Verify Client A receives ack
    // 4. Verify Client B receives document:changed
    // 5. Verify Client A does NOT receive document:changed (self-echo filtered? 
    //    Actually no — server broadcasts to all, client-side filters by sourceSessionId)
}

#[tokio::test]
async fn ws_viewer_cannot_save() {
    // 1. Connect WS as viewer role
    // 2. Send document:save
    // 3. Verify ack with ok=false, error="read-only access"
}
```

### 7.2 Web E2E 测试

```typescript
// tests/e2e/web-realtime.spec.ts

test('two tabs see real-time updates', async () => {
  // 1. Login + open workspace in two browser contexts
  // 2. Tab A creates/saves document
  // 3. Tab B should see document appear in list within 3s
})

test('offline save syncs on reconnect', async () => {
  // 1. Login + open workspace
  // 2. page.route('**/*', route => route.abort()) // simulate offline
  // 3. Save document → verify offline indicator
  // 4. Remove route blocking → verify sync
  // 5. Refresh page → verify document persisted
})
```

### 7.3 Desktop E2E 测试

```typescript
// tests/e2e/desktop-realtime.spec.ts

test('desktop receives web changes', async () => {
  // 1. Desktop app open with vault bound
  // 2. Web saves document to same workspace
  // 3. Verify local file updated within 5s
})
```

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| WS 连接不稳定 | 通知延迟 | Periodic sync 兜底 + 自动重连 |
| IndexedDB 被用户清除 | 丢失离线编辑 | UI 提示 "有 N 条未同步" |
| 大文件通过 WS 保存 | 消息过大 | 256KB 限制，超出走 REST |
| Hub 内存增长 | Server OOM | 定期 cleanup 无订阅者的 channel |
| 同时 eager push + periodic sync | 重复推送 | sync base 保证幂等（内容相同时 `Unchanged`） |
| Desktop WS 和 periodic sync 竞争 | 同步冲突 | sync base 是串行写的，不会丢 |

---

## 9. 不做的事情（明确排除）

| 排除项 | 原因 |
|--------|------|
| WS 上的 delete/trash 消息 | 低频，REST 够用 |
| 操作日志（op log） | 增加复杂度，final-state-only 更简单 |
| 多 tab 协调（BroadcastChannel） | IndexedDB 共享天然解决 |
| Presence 显示 | 独立功能，不在 sync 范围 |
| Redis Pub/Sub | 单实例够用 |
| Rename 追踪 | delete + create 更简单 |
| Web Service Worker | 过于复杂，IndexedDB + 降级链够用 |
| 版本自动回退 | 有 document_versions 表可手动查，但自动回退过于危险 |
