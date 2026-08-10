# Kanban Events — Push, Live SSE, and Sequence Pull

文档型 Kanban 卡片（带 `board:` frontmatter 的 `.md`）在首次保存时产生
`kanban:card-created`，后续实际内容变更产生 `kanban:card-updated`。未变化的
重复保存以及普通 Markdown 文档不会产生事件。

从 schema v30 开始，事件同时携带稳定 `eventId`、语义化 `domainEvent`、
`card.documentId`、服务端生成的 Actor/Client/Token label，以及字段级
`changes`。正文只记录 `body: changed` 标记，不保存全文 diff。文档移入 Trash
会产生 `kanban:card-deleted`；评论 create/update/delete/resolve/reopen 和新增
有效成员 mention 也进入同一 sequence log，不另建任务数据库。

修改 Card 的 `board` frontmatter 是一次投影迁移，不是普通单边 update。服务端
在同一文档事务中先向旧 board 写 `kanban:card-deleted`，再以新的 sequence 向
新 board 写 `kanban:card-created`；两条都携带相同的 `board` field diff，并会
分别进入 pull、SSE 和 webhook，避免旧 board 留下幽灵 Card。

同一个事件会进入三个通知路径：HTTP webhook、实时 SSE、持久化 sequence
pull。自动化消费者应优先使用 sequence pull；SSE 适合低延迟 UI，但连接中断
时需要再用 sequence pull 补齐。

---

## Board Card snapshot

### `GET /api/v1/workspaces/:workspace_id/boards/:board_ref/cards`

- **Auth**: `Authorization: Bearer <token>`
- **Required role**: `owner` / `admin` / `editor` / `viewer`
- **Response**: 完整 `CloudDocument[]`，稳定按 `relativePath` 升序排列；每项包含
  `documentId`、`relativePath`、`title`、`content`、`contentHash`、`versionId`、
  `updatedClock`、`isPublished`

服务端通过事务内维护的 `board_document_memberships` 投影精确定位 Card，再与
`documents` 一次 JOIN 返回正文；读取不会扫描或解析 cloud workspace 的其他
Markdown。`board_ref` 使用区分大小写的二进制排序规则。Board 是逻辑 id，与目录无关：
同一 Board 的 Card 可以分布在多个目录；仅处在同一目录、没有 `board`、属于其他
Board，或 `board` 只是前缀相似的 Markdown 都不会返回。该快照用于首次打开 Board，
避免客户端先列出全部 Markdown 再逐个请求正文；后续增量更新仍使用 sequence pull
和 SSE。

---

## Durable sequence pull

### `GET /api/v1/workspaces/:workspace_id/boards/:board_ref/events/pull`

- **Auth**: `Authorization: Bearer <token>`
- **Token scope**: full session 或 `mcp`
- **Required role**: `owner` / `admin` / `editor` / `viewer`

Query parameters:

| 参数 | 默认值 | 范围 | 说明 |
|------|--------|------|------|
| `afterSequence` | `0` | `>= 0` | 只返回 sequence 严格大于该值的事件 |
| `limit` | `100` | `1..1000` | 单页最多返回的事件数 |

Response:

```json
{
  "events": [
    {
      "sequence": 2380,
      "eventId": "event-uuid",
      "event": "kanban:card-created",
      "domainEvent": "card.created",
      "workspaceId": "workspace-uuid",
      "board": "b_90t96pg4",
      "card": {
        "documentId": "document-uuid",
        "path": "infra/分析一下项目.md",
        "title": "分析一下项目",
        "status": "todo",
        "priority": null,
        "assignee": null,
        "due": null
      },
      "editedBy": "jack",
      "actor": { "kind": "user", "userId": "user-uuid", "label": "jack" },
      "client": { "kind": "web" },
      "changes": [
        { "field": "status", "after": "todo" },
        { "field": "body", "after": true }
      ],
      "updatedClock": 2380
    }
  ],
  "nextSequence": 2380,
  "hasMore": false
}
```

`sequence` 复用 workspace 单调递增的 `updatedClock`。不同 board 之间可能有
序号空洞，这是正常现象；消费者只能按大小比较，不应假设连续。
事件行与对应文档版本在同一个数据库事务提交，因此不会出现较大 sequence 已
可见、较小 sequence 随后才写入的情况。

消费规则：

1. 使用已提交的 cursor 请求 `afterSequence=<cursor>`。
2. 按返回顺序处理本页 `events`。
3. 只有本页所有事件都成功处理后，才持久化 `nextSequence`。
4. `hasMore=true` 时立即请求下一页；失败时仍从旧 cursor 重试。

服务端不会把 cursor 推过本页未返回的事件，因此分页不会跳事件。事件至少可
重复读取；下游副作用应使用 `(workspaceId, sequence)` 做幂等键。

---

## Live SSE

### `GET /api/v1/workspaces/:workspace_id/boards/:board_ref/events?token=<full-session-token>`

SSE 仍只接受 full session token（浏览器 `EventSource` 无法设置 Authorization
header）。每条消息的 JSON payload 与 sequence pull 相同，并将 `sequence`
同时写入 SSE `id` 字段。

SSE 总线本身不重放历史。发生断线或 lag 后，客户端应使用最后已提交的 sequence
调用 durable pull，再重新连接 SSE。

---

## HTTP webhooks

HTTP webhook 使用相同 payload，因此也包含 `sequence`。现有签名和投递重试
语义不变。

---

## Card Activity

### `GET /api/v1/workspaces/:workspace_id/documents/:document_id/activity`

- **Auth**: `Authorization: Bearer <token>`
- **Required role**: `owner` / `admin` / `editor` / `viewer`
- **Query**: `limit` 默认 100，范围 1..200；可选 `beforeSequence` 读取更早一页
- **Order**: 最新事件优先

Response:

```json
{
  "events": [
    {
      "id": "event-uuid",
      "kind": "card.status_changed",
      "at": "2026-08-11T10:00:00.000000Z",
      "actor": { "kind": "agent", "userId": "user-uuid", "label": "jack" },
      "client": { "kind": "mcp" },
      "token": { "label": "release-agent" },
      "changes": [
        { "field": "status", "before": "todo", "after": "doing" }
      ]
    }
  ],
  "nextSequence": 2380,
  "hasMore": false
}
```

`actor` 来自已认证 session：full session 为 `user`，任何 agent scope 强制为
`agent`；Token secret/hash/fingerprint 永不进入事件。Client hint 使用 allowlist：
agent scope 强制为 `mcp`，full session 只允许 `desktop` 或 `web`，未知值回退
`web`，`system` 仅由服务端内部写路径使用。

v30 前没有结构化事件的现有文档会回退到 `document_versions`，映射为
`card.created` / `card.updated`；这部分是最多 `limit` 条的兼容快照，没有
sequence cursor。
