# JType 看板 — Jira 式 ticket link（`/browse/OCCSV-3371`）

状态：设计已定稿（用户 2026-06-23 锁定关键决策），待实现
初始日期：2026-06-23
更新日期：2026-06-23

> **目标**：支持 Jira 式工单链接 `/browse/OCCSV-3371`，其中 `OCCSV` = 看板的 ticket 前缀（board key），`3371` = 该看板内的顺序卡号。
> **配套**：本特性长在 [`unification-v2.md`](./unification-v2.md) 的文档型看板之上，复用其 §1.1 两条架构原则（`documents.id` 唯一键 + web 为主/desktop 为辅）。落地排在 v2 退役③、文件型看板坐稳之后。

---

## 0. 锁定决策（先读）

| 决策 | 选择 | 影响 |
|---|---|---|
| 号存哪 | **只存云端索引**（不进 `.md` frontmatter） | 号是云端特性；离线补号无需改写文档 content，实现更干净 |
| 离线发号 | **A+C**：在线建卡实时发号；离线建卡先无号，首次同步补号 | 号单调连续、零碰撞、不可变 |
| 主次 | **web 为主、desktop 为辅** | 桌面离线看不到号 / 解不了 `/browse` 可接受；只读缓存为可选增强 |

**核心后果**：ticket 号变成**云端能力**。`.md` 文件不带号 → git/桌面离线看不到 `OCCSV-3371`。但 **board key 在 `.board` 里（会同步）**，桌面能识别 `OCCSV-` 是合法前缀、能 linkify，只是离线点不开具体卡。

---

## 1. 数据模型

### 1.1 `.board` 加 board key
`BoardViewConfig`（[`shared/lib/board.ts`](shared/lib/board.ts#L23)）顶层**新增** board 级字段 `ticketKey: string`：
- 注意现有的 `key`（[`board.ts:7`](shared/lib/board.ts#L7)）是**列** key，**勿复用**；用 `ticketKey` 避免歧义。
- 格式：大写字母/数字，`^[A-Z][A-Z0-9]{1,9}$`。从 board 标题派生默认值（"OCC Services" → `OCCSV`），用户可改。
- **workspace 内唯一**（否则 `OCCSV-3371` 有歧义）。

### 1.2 卡片 frontmatter — **不带号**
决策为"只存云端索引"，故卡片 `.md` 的 frontmatter **不新增** ticket/number 字段，保持 [`BoardCardInfo`](services/jtype-core/src/lib.rs#L1342) 现状。卡片身份对内走 `documents.id`（云端 UUID）、对外走 ticket（云端索引计算）。

### 1.3 云端两张薄表（迁移 `0019_card_tickets`）

```sql
-- 0019_card_tickets.up.sql  （草案；避开 migration runner 朴素分句器：无行内 -- 注释、语句内无裸分号）

CREATE TABLE board_sequences (
  workspace_id CHAR(36) NOT NULL,
  ticket_key VARCHAR(12) NOT NULL,
  last_number BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id, ticket_key),
  CONSTRAINT fk_board_seq_ws FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE card_tickets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  ticket_key VARCHAR(12) NOT NULL,
  number BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_card_tickets_doc (document_id),
  UNIQUE KEY uq_card_tickets_ref (workspace_id, ticket_key, number),
  CONSTRAINT fk_card_tickets_ws FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_card_tickets_doc FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
```

- `card_tickets` 是 **ticket 的单一真相源**：`ticket_key` + `number` 是**铸号时的快照**，行一旦写入不再改 → ID 永久稳定（board key 改名只影响新卡，旧行仍是 `OCCSV-3371`）。
- `UNIQUE(document_id)`：**一卡一号、终身一号**，让发号**幂等**。
- `UNIQUE(workspace_id, ticket_key, number)`：防重号。
- `board_sequences`：**唯一发号源**，`last_number` 只增不减。

---

## 2. 发号（A + C）

服务端是**唯一发号者**（两条路都过 server），故 `last_number` 权威、无碰撞、无需客户端自愈。

```
在线建卡（web / 联网桌面）:
  建卡(已有 documents.id) → allocate(workspace, ticketKey, documentId)
    → server 事务: UPDATE board_sequences SET last_number=last_number+1
                   INSERT card_tickets(documentId, ticketKey, number)
    → 返回 OCCSV-N → 卡片立即显示号                              ✅ 即时

离线建卡（断网桌面）:
  建卡(无号) → 离线引用走 documents.id / path
    ↓ 联网首次 sync(push)
  server 扫"有 board: frontmatter、card_tickets 无行"的文档 → 逐个 allocate(纯插行)
    → 下次该卡在 web 打开即显示号                                ⏳ 首同步后
```

- **幂等**：`allocate` 先查 `card_tickets` 是否已有该 `document_id`，有则直接返回，不重复发。离线卡反复同步只补一次。
- **无 content 改写**：号不进 frontmatter → 补号只是 `INSERT` 一行索引，`.md` 文件原封不动，**不触发 content_hash 变化 / 三方合并**。这正是"只存云端索引"相对"写 frontmatter"的最大实现红利。
- **事务**：`UPDATE board_sequences` + `INSERT card_tickets` 同一事务；`UNIQUE(document_id)` 兜底并发重复。

> 备选方案对比（A 云端实时 / B `.board` 计数器 / C 离线补号 / D 设备号段）见 [`unification-v2.md`] 决策过程；B 因"不可变 ID + 离线碰撞"否决，D 因"空洞/乱序"仅在"离线必须即时有号"时才用——本设计取 A+C。

---

## 3. 解析、路由与跳转

### 3.1 `/browse/:ticket`（Web，主场）
1. 解析 `OCCSV-3371` → `(ticket_key=OCCSV, number=3371)`；非法格式 → 400。
2. 查 `card_tickets`（按 `workspace_id + ticket_key + number`）→ `document_id` → 经 `documents` 取 `relative_path`。
3. 跳到工作区并打开该卡（如 `/workspaces/:id?doc=<path>&card=<id>`，落进 `WebBoardView` 的 peek）。
4. 查不到 → 404 / "已删除"页。**号删了永不复用**（`last_number` 不回退）。

> `/browse/:ticket` 需在某 workspace 上下文里解析（ticket 作用域 = workspace）。若 URL 不含 workspace，需先按用户可见的 workspace 解析 `ticket_key`（key 在 workspace 内唯一，但跨 workspace 可能重名 → 需带 workspace 或做消歧）。

### 3.2 Desktop（辅）
- 在线：调云端 resolve 端点，同 web。
- 离线：默认**解不了**（号在云端）。可选增强：同步时拉 `card_tickets` 快照到 `.jtype/tickets.json` 只读缓存，桌面据此显示/解析。**首版不做，标为可选。**

### 3.3 移板 / 删除策略
- **卡片移到别的 board**：保留原 ticket（行键 `document_id`，不重铸）→ ID 稳定。（如需"跨板换号"再单独设计。）
- **删除/归档**：`last_number` 不回退，号永不复用；归档卡保留号。

---

## 4. Markdown 自动链接

仿 [`shared/lib/markdown.ts` `renderWikilinks`](shared/lib/markdown.ts#L137) 新增 `renderTicketLinks`：把正文里的 `OCCSV-3371` 渲成 `<span class="ticket-link" data-ticket="OCCSV-3371">`，平台层解析跳转（与 `data-wikilink` 同套路；记得把 `data-ticket` 加进 [`markdown.ts:194`](shared/lib/markdown.ts#L194) 的 DOMPurify `ADD_ATTR`）。

- **pattern**：`\b([A-Z][A-Z0-9]{1,9})-(\d+)\b`。
- **必须白名单**：只对**已知 board key** 生效，否则 `UTF-8`/`COVID-19`/`SHA-256` 全被误链。
  - 渲染层传入当前 vault/workspace 的 `ticketKey` 集合；前缀不在集合内则不链。
  - 桌面从 `.board` 文件扫 `ticketKey`（`.board` 会同步，故桌面也有 key 集合）；web 从 board 列表 / `card_tickets`。
- **解析**：web 查 `card_tickets`；桌面在线查 resolve，离线靠可选缓存（无则 span 不可点）。

---

## 5. Board key 生命周期

| 事件 | 处理 |
|---|---|
| 派生默认 | 从 board 标题取大写首字母/缩写（"OCC Services"→`OCCSV`），用户可改 |
| 唯一性 | 创建/改 key 时校验 workspace 内不重复（云端唯一约束 + 桌面扫 `.board` 校验） |
| 改名 | 已铸号在 `card_tickets` 是快照，不动 → 旧 ID 永久有效。可选：`.board` 存 `aliasKeys[]`，`/browse` 与 linkify 白名单也认旧前缀 |
| 首卡后冻结 | 建议铸出首张号后默认锁定 key（或仅允许走 alias），避免链接面变动 |

---

## 6. 后端改动点（`services/jtype-web/src/`）

- **迁移** `0019_card_tickets`（§1.3）+ 注册进 [`db/migrations.rs`](services/jtype-web/src/db/migrations.rs)（append-only，紧跟 v2 的 `0018_drop_kanban`）。
- **allocate 端点**：`POST /api/v1/workspaces/:id/tickets/allocate { documentId }` → 解析该文档 board → 取 `ticketKey` → 事务发号 → 返回 `{ ticket, number }`。幂等。
- **push handler 补号**：在 [`handlers/sync.rs`](services/jtype-web/src/handlers/sync.rs) push 处理里，对新到/变更的文档，若 frontmatter 有 `board:` 且 `card_tickets` 无行，则 allocate（纯插行，不改 content）。
- **resolve 端点**：`GET /api/v1/workspaces/:id/browse/:ticket` 或页面路由 → 查表 → 返回/重定向到卡片。
- **board key 校验端点**：创建/改 `.board` 时校验 `ticketKey` 唯一与格式。

## 7. 前端改动点（`services/jtype-web/frontend/src/`）

- `WebBoardView`：加载本看板时一并拉 `card_tickets`（`document_id → ticket` map），卡片渲染 ticket 徽标；创建卡片后调 `allocate` 拿号回填徽标。
- `main.tsx`：加 `/browse/:ticket` 路由（解析 → 重定向到 workspace + 打开卡）。
- `shared/lib/markdown.ts`：`renderTicketLinks` + DOMPurify `ADD_ATTR: data-ticket`；平台层（web/desktop）实现 `data-ticket` 点击解析。
- `.board` 编辑 UI：暴露 `ticketKey` 字段（带唯一性校验提示）。

---

## 8. 分期

1. **模型**：`.board` 加 `ticketKey` + 校验；迁移 `0019` 两表。
2. **在线发号（A）**：`allocate` 端点 + `WebBoardView` 显示徽标 + 创建即发号。
3. **解析/路由**：`/browse/:ticket` + resolve 端点。
4. **离线补号（C）**：push handler 补号。
5. **markdown linkify**：`renderTicketLinks` + board-key 白名单。
6. **可选增强**：桌面 `tickets.json` 只读缓存（按需）。

做完 1+2+3 即可：在线建的卡都有 `OCCSV-3371` 并能 `/browse` 打开。4 是离线增强，5 是正文链接体验。

---

## 9. 验收标准

通用门槛同 [`unification-v2.md` §8]（tsc/build/cargo/启动无错）。

- AC1：`.board` 设 `ticketKey=OCCSV`；同 workspace 再设一个 `OCCSV` 被拒（唯一性）。
- AC2：web 新建卡 → 立即显示 `OCCSV-N`，N 较上一张 +1；`card_tickets` 有对应行（键 `document_id`）。
- AC3：`/browse/OCCSV-3371` 打开对应卡；不存在的号 → 404；删卡后该号 `/browse` 仍 404 且**不被新卡复用**。
- AC4：断网桌面建卡(无号) → 联网同步后，该卡在 web 显示号；重复同步不重号（幂等）。
- AC5：正文写 `OCCSV-3371` 在预览渲成可点链接并跳转；写 `UTF-8`/`COVID-19` **不**被链接（白名单生效）。
- AC6：把卡片 `board:` 改到另一 board → 其 ticket **不变**（移板保号）。
- AC7：改 board 的 `ticketKey` → 已有卡的 `OCCSV-N` 不变（快照稳定）；若启用 alias，旧前缀 `/browse` 仍可达。

## 10. 边界与未决

- **跨 workspace 重名 key**：`/browse/:ticket` 需带 workspace 上下文或做消歧（key 仅 workspace 内唯一）。
- **桌面离线解析**：默认不支持，依赖可选 `tickets.json` 缓存。
- **board key 派生算法**：标题→缩写规则需定（取大写首字母？前 N 字符?），可先用"标题大写去空格取前 5–6 位 + 去重后缀"，允许用户覆盖。
- **大量离线卡补号顺序**：同一 board 多张离线卡在一次 sync 补号，顺序按 push 顺序/创建时间，需定一个确定性排序避免号序随机。
