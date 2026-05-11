# Sync & Notification — 产品需求

> 整合来源: notification-sync-v3.md, notification-sync-impl-design.md, realtime-notification-design.md, web-sync-design.md

---

## 1. 核心定位

JType 是 local-first Markdown vault 应用。Cloud 是唯一权威数据源（single source of truth），Desktop App 和 Web Browser 都是 replicator——维护本地副本，通过 push/pull/notify 保持一致。

## 2. 用户场景

### 2.1 Desktop App 用户

| 场景 | 需求 |
|------|------|
| 离线编辑 | 无网络时正常编辑保存到本地磁盘，重连后自动同步到 cloud |
| 实时感知 | Web 或其他设备修改文档后，Desktop 尽快感知并拉取最新内容 |
| 即时推送 | 保存后尽快推送到 cloud，而非等待下一次定时同步 |
| 冲突解决 | 多端同时编辑导致冲突时，提供清晰 UI 让用户选择解决方案 |
| 多 vault 后台同步 | 即使只打开一个 vault，也能收到其他 vault 对应 workspace 的变更事件 |

### 2.2 Web 用户

| 场景 | 需求 |
|------|------|
| 实时保存 | 保存文档后立即持久化到 cloud |
| 实时协同感知 | 其他用户修改文档时，浏览器内实时收到通知、刷新文档列表 |
| 离线兜底 | 网络中断时保存到 IndexedDB，重连后自动协调同步 |
| 冲突解决 | 与 Desktop 相同的冲突解决能力 |
| 降级保护 | WebSocket 不可用时自动降级到 REST 保存 + 轮询 |

### 2.3 多端协同

| 场景 | 需求 |
|------|------|
| Desktop ↔ Web | 一端修改，另一端秒级感知 |
| Desktop ↔ Desktop | 多设备同步，通过 cloud 中转 |
| 冲突检测 | 基于 content hash + sync base 的变更检测 |
| 冲突合并 | 行级三方合并（base/local/cloud），合并失败交给用户 |

## 3. 功能需求

### 3.1 同步协议

- **P0**: REST push/pull 批量同步（Desktop 主通道）
- **P0**: 基于 workspace clock + device cursor 的增量同步
- **P0**: Content hash (SHA-256) 变更检测
- **P0**: 三方合并（smart_three_way_merge）
- **P0**: 冲突记录与解决（accept_local / accept_cloud / keep_both / manual_merge）

### 3.2 实时通知

- **P0**: WebSocket 实时广播文档变更/删除/回收站操作
- **P0**: 自回显过滤（sourceSessionId / deviceId）
- **P0**: Desktop 收到通知后定向拉取变更文件
- **P0**: Web 收到通知后刷新文档列表 + stale warning
- **P1**: Workspace 管理事件通知（member 增删改、workspace 删除）
- **P2**: Presence（在线状态、正在编辑提示）

### 3.3 Web 保存

- **P0**: WebSocket document:save（请求-ack 模式）
- **P0**: REST save 降级通道
- **P1**: IndexedDB 离线保存 + 重连协调

### 3.4 Desktop 即时推送

- **P0**: 保存后异步推送单文件到 cloud（eager push）
- **P0**: Periodic sync 作为安全网（WS 在线 5 分钟，离线 30 秒）

### 3.5 连接管理

- **P0**: 自动重连（指数退避 1s→2s→4s→...→60s）
- **P0**: 心跳保活（30s ping/pong）
- **P0**: 连接状态指示（Connected / Offline / Syncing）
- **P1**: 单一用户级 WS 连接（覆盖所有 workspace，替代 per-workspace 连接）

## 4. 冲突分类

| 场景 | 分类 | 解决方式 |
|------|------|----------|
| 仅本地修改 | Local edit only | 自动推送 |
| 仅 cloud 修改 | Cloud edit only | 自动拉取 |
| 双方修改同文件 | Content conflict | 三方合并，失败则人工 |
| 双方创建同名文件 | Create-create conflict | 人工解决（无公共祖先） |
| 本地编辑 + cloud 删除 | Edit-delete conflict | 优先保留数据 |
| 本地删除 + cloud 编辑 | Delete-edit conflict | 优先保留数据 |
| 双方删除 | Both deleted | 确认删除，无冲突 |

## 5. 非功能需求

- WebSocket 消息上限: 256 KB
- Broadcast channel 容量: 256 条，溢出发送 `sync:required`
- Token 通过 query param 传递（WS API 无法设置自定义 header）
- 生产环境强制 WSS (TLS)
- viewer 角色只读，不能通过 WS 执行写操作

## 6. 明确排除

| 排除项 | 原因 |
|--------|------|
| 操作日志（op log） | final-state-only 更简单 |
| 多 tab BroadcastChannel 协调 | IndexedDB 共享天然解决 |
| Redis Pub/Sub | 单实例阶段不需要 |
| Rename 追踪 | delete + create 更简单 |
| Web Service Worker | 过于复杂 |
| 版本自动回退 | document_versions 表可手动查 |
