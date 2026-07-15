# Kanban Events — Push, Live SSE, and Sequence Pull

文档型 Kanban 卡片（带 `board:` frontmatter 的 `.md`）在首次保存时产生
`kanban:card-created`，后续实际内容变更产生 `kanban:card-updated`。未变化的
重复保存以及普通 Markdown 文档不会产生事件。

同一个事件会进入三个通知路径：HTTP webhook、实时 SSE、持久化 sequence
pull。自动化消费者应优先使用 sequence pull；SSE 适合低延迟 UI，但连接中断
时需要再用 sequence pull 补齐。

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
      "event": "kanban:card-created",
      "workspaceId": "workspace-uuid",
      "board": "b_90t96pg4",
      "card": {
        "path": "infra/分析一下项目.md",
        "title": "分析一下项目",
        "status": "todo",
        "priority": null,
        "assignee": null,
        "due": null
      },
      "editedBy": "jack",
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
