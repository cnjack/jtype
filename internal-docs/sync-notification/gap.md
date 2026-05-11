# Sync & Notification — Gap 分析

> 来源: ws-lookup-redesign.md §6 (Bugs & Issues), notification-sync-impl-design.md §9 (排除项), notification-sync-v3.md 对比当前实现

---

## 1. 已知 Bug

| # | 严重度 | 位置 | 描述 | 状态 |
|---|--------|------|------|------|
| B1 | **HIGH** | `handlers/live.rs` | `folder:created` 和 `folder:deleted` 成功后不返回 ack。只在失败时发送 error ack，成功时仅 publish `sync:required`。Web 前端 `request()` 会 30s timeout reject。 | 待修复 |
| B2 | **MEDIUM** | `handlers/live.rs` | `folder:deleted` 的 `record_folder_deletion` 和 SQL DELETE 错误处理: tx 隐式 rollback 依赖 drop，但错误消息不含细节。 | 待修复 |
| B3 | **MEDIUM** | `hub.rs` | `subscribe()` 存在 TOCTOU race: 先 read-lock 检查 → release → write-lock 创建。`or_insert_with` 能正确处理但有多余的 write-lock 竞争。（如果已迁移到 ConnectionHub per-session mpsc 模式则不适用） | 需确认 |
| B4 | **LOW** | `ws_client.rs` | WsOutbox 使用 broadcast channel (capacity=64)，WS 断开期间消息会丢失。Desktop 当前不通过 WS 发送操作消息所以影响不大。 | 已知风险 |

## 2. Sync Clock 问题

用户反馈 sync clock 可能存在 bug。需要排查以下场景:

- clock 递增是否在事务内完成（并发写入是否可能产生相同 clock 值）
- push handler 中多文档批量处理时 clock 递增逻辑是否正确
- pull 返回的 `currentClock` 是否与实际最新 clock 一致
- delete/trash 操作是否正确递增 clock

## 3. 设计问题

| # | 严重度 | 描述 | 状态 |
|---|--------|------|------|
| D1 | **HIGH** | 部分 REST handler 缺少 WS 通知: `delete_workspace`, `remove_member`, `update_member_role`, `leave_workspace`, `transfer_ownership` 执行完业务逻辑后无 WS 通知。 | 待实现 |
| D3 | **MEDIUM** | Desktop 和 Web 操作路径不对称: 同一 "创建文件夹" 操作，Web 走 WS `folder:created`，Desktop 走 HTTP `sync/push`。两套路径行为不一致可能产生难以排查的 bug。 | 已知设计妥协 |
| D5 | **MEDIUM** | Token 在 URL query string 中: 会出现在 Nginx access log、CDN 日志。设计了 ticket 模式但未实现。 | 待实现 |
| D6 | **LOW** | 心跳超时检测不完整: 客户端 30s ping，但双方未检测 pong 超时。TCP 无声断开（NAT 超时）时连接保持在 hub 中直到下次发送失败。 | 待修复 |
| D7 | **LOW** | broadcast channel 容量固定 256: 高并发编辑可能频繁 lag，增加不必要的全量 pull。（如已迁移到 per-session mpsc 则不适用） | 需确认 |

## 4. 功能 Gap

### 4.1 Web 离线支持

| 功能 | 状态 | 说明 |
|------|------|------|
| IndexedDB `offlineDb.ts` | `[设计中]` | 设计完成，代码未实现 |
| `useOfflineSync` hook | `[设计中]` | 离线保存 + 重连协调 |
| 离线保存降级链 (WS→REST→IDB) | `[部分实现]` | WS→REST 已有，IDB 层未实现 |
| 重连后自动协调（reconciliation） | `[设计中]` | Pull→分类→合并→Push 流程已设计 |
| Pending saves 状态指示 | `[设计中]` | "Offline (3 saved)" UI 未实现 |

### 4.2 冲突处理增强

| 功能 | 状态 | 说明 |
|------|------|------|
| Content conflict (三方合并) | `[已实现]` | `smart_three_way_merge` + `sync_conflicts` 表 |
| Create-create conflict | `[部分]` | 当前无 base 时可能直接覆盖，需要修改为创建冲突记录 |
| Edit-delete conflict | `[部分]` | 需要在 push handler 中增加检测逻辑 |
| Web 冲突解决 UI | `[设计中]` | Desktop 有 ConflictDialog，Web 端缺失 |

### 4.3 WS 事件补全

| 事件 | 状态 | 优先级 |
|------|------|--------|
| `workspace:updated` | `[设计中]` | MEDIUM |
| `workspace:deleted` | `[设计中]` | HIGH |
| `member:joined` | `[设计中]` | MEDIUM |
| `member:removed` | `[设计中]` | HIGH |
| `member:left` | `[设计中]` | MEDIUM |
| `member:role-changed` | `[设计中]` | MEDIUM |
| `document:status-changed` | `[设计中]` | MEDIUM |
| `workspace:invited` (user-scoped) | `[设计中]` | LOW |

### 4.4 安全增强

| 功能 | 状态 | 说明 |
|------|------|------|
| 一次性 ticket 替代 query string token | `[设计中]` | `POST /api/v1/live/ticket` → 30s 过期 ticket |
| 每连接消息频率限制 (60/min) | `[设计中]` | 未实现 |
| 每用户并发 WS 连接数限制 (10) | `[设计中]` | 未实现 |

### 4.5 未来功能（明确排除当前范围）

| 功能 | 状态 | 说明 |
|------|------|------|
| Presence（在线状态） | `[未计划]` | ConnectionHub 天然支持 `workspace_online_users()` |
| Like/unlike | `[未计划]` | 需要新建 DB schema + API |
| Redis Pub/Sub（多实例） | `[未计划]` | 单实例够用 |
| BroadcastChannel 多 tab 协调 | `[明确排除]` | IndexedDB 共享天然解决 |

## 5. 废弃代码

| 代码 | 位置 | 说明 |
|------|------|------|
| `folder:changed` WS handler | `handlers/live.rs` | 没有客户端发送此消息，应移除 |
| `cloud_ws_send` Tauri command | `src-tauri/src/lib.rs` | 已注册但前端 hooks 从未调用，是死代码 |
| 旧 per-workspace WS endpoint | `/api/v1/workspaces/:workspace_id/live` | 如已迁移到 `/api/v1/live`，旧 endpoint 应标记 deprecated |

## 6. 文档问题

| # | 描述 |
|---|------|
| DOC1 | `api-ws-operations.md` 引用了不存在的 `PUT /api/v1/workspaces/:id/documents` 和 `POST /api/sync/workspace`（已废弃 endpoint） |
| DOC2 | `src/main.ts` 中有对旧 endpoint `POST /api/sync/workspace` 的引用（可能是残留） |
