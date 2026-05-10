# WebSocket Connection Protocol

WebSocket 连接协议、认证、生命周期和重连策略。

> **设计原则**: WebSocket 仅用于接收服务端推送通知 (server → client events)。所有写操作通过 REST HTTP 发送。客户端不再通过 WS 发送业务请求。
>
> **设计变更**: 新设计将 WS endpoint 从 per-workspace (`/api/v1/workspaces/:id/live`) 改为 per-user (`/api/v1/live`)。详见 [ws-lookup-redesign.md](../ws-lookup-redesign.md)。

---

## 连接端点

### 当前 (per-workspace)

```
GET /api/v1/workspaces/:workspace_id/live?token=<sessionToken>&clientType=<type>&deviceId=<deviceId>
```

### 新设计 (per-user singleton)

```
GET /api/v1/live?token=<sessionToken>&clientType=<type>&deviceId=<deviceId>
```

**URL 协议映射**: `http://` → `ws://`, `https://` → `wss://`

### Query Parameters

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `token` | 是 | — | Session token (`sessions` 表) |
| `clientType` | 否 | `"desktop"` | 客户端类型, Web 使用 `"web"` |
| `deviceId` | 否 | — | 设备 ID, 用于自回显过滤和 sync cursor |

### 认证与授权

- `token` 校验 `sessions` 表, 过期 session 拒绝
- 禁用用户 (`enabled = false`) 拒绝
- 当前实现: 需要 workspace 的 `owner`/`admin`/`editor`/`viewer` 角色
- 新设计: 仅需有效 session, 服务端自动订阅用户所有 workspace

### 握手失败

| HTTP Status | 含义 | 客户端行为 |
|-------------|------|-----------|
| `401` | Token 无效/过期 | 不重连, 引导登录 |
| `403` | 用户被禁用 | 不重连 |
| `404` | Workspace 不存在 (当前设计) | Desktop: 停止重连, 发出 `cloud:workspace-gone` |
| `410` | Workspace 已删除 (当前设计) | 同 `404` |

---

## 连接生命周期

### `connected` 消息 (Server → Client)

握手成功后服务端立即发送:

**当前格式**:

```ts
{
  type: "connected",
  sessionId: string,
  workspaceClock: number
}
```

**新设计格式**:

```ts
{
  type: "connected",
  sessionId: string,
  workspaces: Array<{
    id: string,
    name: string,
    role: "owner" | "admin" | "editor" | "viewer",
    workspaceClock: number
  }>
}
```

`workspaceClock` = `MAX(document.updated_clock, trash.deleted_clock, folder.updated_clock, folder_deletion.deleted_clock)`

#### Desktop 收到 `connected` 后

1. `dispatch({ type: "SET_WS_CONNECTED", connected: true })`
2. (新设计) 解析 `workspaces` 数组, 对比各 vault binding 的 `lastSyncClock`, 决定哪些需要增量 pull

#### Web 收到 `connected` 后

1. 保存 `sessionId` (用于自回显过滤)
2. 保存 `workspaceClock` (用于判断是否有新变更)
3. 设置状态为 `connected`
4. 重置重连退避
5. 启动 30s ping interval

### Ping / Pong

```ts
// Client → Server
{ "type": "ping" }

// Server → Client
{ "type": "pong" }
```

- Desktop 和 Web 均 30s 发一次 ping
- 当前无超时检测 (设计问题 D6)

---

## 重连策略

### Desktop (Rust ws_client)

- 指数退避: 1s → 2s → 4s → ... → 60s (上限)
- 收到 404/410 时停止重连, 发出 `cloud:workspace-gone`
- 重连后 `connected` 事件会重新触发 UI 状态更新

### Web (useWorkspaceSocket)

- 固定退避序列: `[1s, 2s, 4s, 8s, 16s, 30s, 60s]`
- 连接成功后重置退避索引
- 断开后启动 10s 轮询 REST API 作为降级

### Desktop 断连降级

- `wsConnected` 设为 `false`
- `usePeriodicSync` 将 sync 间隔从 `max(interval, 300s)` 缩短为 `interval` (更频繁轮询)
- `online` 事件: 如果距上次 sync > 30s, 触发 `pullOnly`
- `visibilitychange` 事件: 如果距上次 sync > 60s, 触发 `pullOnly`

### Web 断连降级

- 状态设为 `disconnected`
- 启动 10s 轮询 `listDocuments` / `listFolders`
- 重连后 `reconcile()` 推送离线编辑, 刷新列表

---

## 自回显过滤

WS 广播包含发送者自身 (设计问题 D4), 客户端需自行过滤:

| 客户端 | 过滤逻辑 | 适用层 |
|--------|----------|--------|
| Desktop (Rust) | `deviceId == self.deviceId && source == "desktop"` | `ws_client.rs` |
| Desktop (TS) | 同上二次过滤 | `useCloudEvents.ts` |
| Web | `sourceSessionId === wsSessionId` | `Workspace.tsx` |

> **建议**: 新设计中服务端在 dispatch 时排除 sender session, 减少客户端过滤负担。

---

## Ack 机制 — ⚠️ DEPRECATED

> **已废弃**: 随着 WS 写操作迁移到 REST, ack 机制不再需要。Web 前端不再通过 WS 发送带 `ref` 的请求。WS 仅接收服务端推送的事件。

~~Web 前端通过 `request(msg)` 发送带 `ref` 的消息, 等待匹配的 `ack` 响应:~~

```ts
// Client → Server (带 ref)
{ type: "document:save", ref: "abc123", relativePath: "...", content: "..." }

// Server → Client (ack)
{ type: "ack", ref: "abc123", ok: true, ... }
```

- 30s 超时, 超时后 reject Promise
- Desktop 不使用 req/resp 模式, 所有操作走 REST

---

## 安全注意事项

- **D5**: Token 在 URL query string 中, 会出现在 access log 和 CDN 日志中。建议考虑短期 ticket 模式。
- Session token 有效期由 `sessions.expires_at` 控制, 过期后 WS 握手被拒。
