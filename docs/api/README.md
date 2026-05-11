# JType API & WS Operations — Overview

按 domain 拆分的 API 和 WebSocket 操作文档。每个文件包含 REST endpoints、WS events (server → client) 及客户端行为规范。

> **设计原则**: 所有写操作通过 REST HTTP 发送, WebSocket 仅用于接收服务端推送通知。客户端不再通过 WS 发送业务请求。

> **前身**: 本目录替代了原 [api-ws-operations.md](../api-ws-operations.md)。

---

## 文档索引

| 文件 | 内容 |
|------|------|
| [connection.md](connection.md) | WS 连接协议、认证、生命周期、重连、自回显过滤 |
| [workspace.md](workspace.md) | Workspace CRUD, `workspace:updated` ⚠️, `workspace:deleted` ⚠️, `workspace:invited` ⚠️ |
| [document.md](document.md) | 文档 CRUD (含 REST save)、`document:changed`, `document:deleted`, `document:trashed`, `document:status-changed` ⚠️ |
| [member.md](member.md) | 成员管理、邀请, `member:joined` ⚠️, `member:removed` ⚠️, `member:left` ⚠️, `member:role-changed` |
| [folder.md](folder.md) | 文件夹 CRUD, `sync:required` |
| [sync.md](sync.md) | Sync pull/push、三方合并、冲突解决, `sync:required` |
| [trash.md](trash.md) | 回收站 REST CRUD, 复用 document events |

⚠️ = 当前缺失, 需要新增实现的 WS event

---

## 未包含在 domain 文件中的 REST API

以下 REST API 无 WS 事件交互, 保留在 [api-ws-operations.md](../api-ws-operations.md) 中作为参考:

| Domain | Endpoints |
|--------|-----------|
| Auth | `POST /api/register`, `POST /api/login`, `GET /api/me` |
| Device OAuth | `POST /api/oauth/device/start`, `/approve`, `/poll` |
| User Profile | `GET/PUT /api/me/profile`, `PUT /api/me/site`, `GET /api/me/storage`, `GET /api/me/devices` |
| Admin | `GET/PUT /api/admin/users`, `GET /api/admin/workspaces`, `/domains`, `/stats` |
| Domains | `GET/POST/PUT /api/v1/domains`, verify, certificate |
| Public Sites | `GET /u/:site_user/...` |
| Health | `GET /health` |

---

## WS Event 全景图

### 已有事件 (已实现)

| Event | Scope | 触发方式 | Desktop 行为 | Web 行为 |
|-------|-------|---------|-------------|---------|
| `document:changed` | workspace | WS save, sync push, conflict resolve | self-filter → pullOnly() | self-filter → re-list docs, reload/warn |
| `document:deleted` | workspace | REST delete, trash permanent delete, empty trash | self-filter → pullOnly() | self-filter → re-list docs+trash, close editor |
| `document:trashed` | workspace | sync push deletedPaths, trash restore | self-filter → pullOnly() | self-filter → re-list docs+trash |
| `sync:required` | workspace | folder ops, broadcast lag | pullOnly() | re-list all |
| `member:role-changed` | workspace | role update, transfer | 更新本地 role 缓存 | 刷新成员列表 + 权限 |

### 新增事件 (待实现)

| Event | Scope | 触发方式 | Desktop 行为 | Web 行为 |
|-------|-------|---------|-------------|---------|
| `workspace:updated` | workspace | PUT workspace | 更新 UI 名称 | 更新页面/侧边栏名称 |
| `workspace:deleted` | workspace | DELETE workspace | unbind + 禁用 sync | 跳转列表页 |
| `workspace:invited` | user | 创建邀请 (需扩展) | 系统通知 | toast/badge |
| `member:joined` | workspace | accept invite | — | 刷新成员列表 |
| `member:removed` | workspace+user | remove member | 被移除者: unbind; 其他: — | 被移除者: 跳转; 其他: 刷新列表 |
| `member:left` | workspace | leave workspace | — | 刷新成员列表 |
| `document:status-changed` | workspace | update status | pullOnly() | 刷新文档列表 |

---

## Desktop vs Web 操作路径对比

> **已解决 (D3)**: 所有客户端统一通过 REST 发送写操作, WS 仅接收通知。

| 操作 | Desktop | Web |
|------|---------|-----|
| 保存文档 | REST `sync/push` (含 eager push) | REST `POST /documents/save` |
| 创建文档 | REST `sync/push` | REST `POST /documents/save` |
| 创建文件夹 | REST `sync/push` (folders 字段) 或 `POST /folders` | REST `POST /folders` |
| 删除文件夹 | REST `sync/push` 或 `DELETE /folders/:id` | REST `DELETE /folders/:id` |
| 移入回收站 | REST `sync/push` (deletedPaths) 或 `DELETE /documents/:id` | REST `DELETE /documents/:id` |
| 恢复文档 | REST `sync/push` (trashOperations) 或 `POST /trash/:id/restore` | REST `POST /trash/:id/restore` |
| 永久删除 | REST `sync/push` (trashOperations) 或 `DELETE /trash/:id` | REST `DELETE /trash/:id` |
| 清空回收站 | REST `sync/push` (trashOperations) 或 `DELETE /trash` | REST `DELETE /trash` |

---

## 通用约定

- JSON 字段使用 `camelCase`
- HTTP Auth: `Authorization: Bearer <sessionToken>`
- WS Auth: `token=<sessionToken>` in query string
- 错误响应: `{ "error": "message" }`
- 角色: server (`admin` / `user`), workspace (`owner` / `admin` / `editor` / `viewer`)
- 状态码: `400` 无效输入, `401` 未认证, `403` 权限不足, `404` 资源不存在, `500` 服务器错误

---

## 已知问题

详见 [ws-lookup-redesign.md](../ws-lookup-redesign.md) 的 Bug (B1-B4) 和设计问题 (D1-D9) 章节。

关键问题速查:

| # | 严重度 | 描述 | 状态 |
|---|--------|------|------|
| B1 | ~~HIGH~~ | ~~`folder:created`/`folder:deleted` 成功后无 ack~~ | ✅ 已解决: WS 写操作已废弃, 改用 REST |
| D1 | HIGH | 多个 REST handler 缺少 WS 通知 | 待实现 |
| D2 | HIGH | REST 无法 dispatch 到特定用户的 WS 连接 | 待实现 |
| D3 | ~~MEDIUM~~ | ~~Desktop/Web 操作路径不对称~~ | ✅ 已解决: 统一使用 REST |
| D4 | MEDIUM | 广播包含发送者, 需客户端自行过滤 | 待优化 |

---

## 相关文档

- [ws-lookup-redesign.md](../ws-lookup-redesign.md) — WS 架构重设计 (per-user singleton, ConnectionHub, auto-subscribe)
- [api-ws-operations.md](../api-ws-operations.md) — 原始完整 API 参考 (含 Auth, Admin, Domains 等非 WS 域)
