# JType 看板统一 v2 — 收敛到文档型看板 + 退役云端 DB 看板

状态：设计已定稿（用户 2026-06-23 锁定关键决策），待实现
初始日期：2026-06-23
更新日期：2026-06-23

> **目标**：把"云端 DB 看板"与"本地文件看板"**彻底融合成一套、云端本地互通**。
> 真相源（single source of truth）= **markdown 卡片（`.md`）+ `.board` 视图文件**；**退役**孤立的云端 DB 看板（`Kanban.tsx` + `kanban_*` 表）。
>
> **配套 / 被本文取代的文档**：
> - [`design.md`](./design.md) — v1 三环境云端设计，**整体退役**（其 LOCAL/CLOUD 都不再是方向）。
> - [`gaps-and-roadmap.md`](./gaps-and-roadmap.md)（2026-06-20）— "DB 看板保留为遗留" 的口径**已被本文推翻**，改为退役。
> - [`next-features-design.md`](./next-features-design.md) — D2 Webhook 的 HMAC/重试/SSRF 设计仍有效，但**触发源改挂文档事件**（见 §2.5）。
> - [`../doc-kanban-unification/design.md`](../doc-kanban-unification/design.md) §5 的"暂缓（后续 PRD）" = **本文**。
> - [`../web-board-alignment/design.md`](../web-board-alignment/design.md) §4.2 的"两条独立路径" = 本文要消除的对象。

---

## 0. 背景：三套看板 / 两套数据层（关键认知)

看板实际上是 **3 个渲染面、2 套数据层**（旧文档里"两套看板"的说法不完整）：

| | 渲染面 | 数据层 | 互通 |
|---|---|---|---|
| ① 桌面文件看板 | `src/components/BoardView.tsx` | `.board` JSON + `.md` 卡片（jtype-core 扫描） | ←→ 与②同源 |
| ② Web 文件看板 | `services/jtype-web/frontend/src/pages/WebBoardView.tsx` | 同一批 `.board`/`.md`，存云端 `documents` 表 | **✅ 已与桌面双向同步** |
| ③ Web 云端 DB 看板 | `services/jtype-web/frontend/src/pages/Kanban.tsx`，路由 `/workspaces/:id/kanban` | 独立 `kanban_*` MySQL 表 | **❌ 孤岛：无 `document_id`/`relative_path`、不同步、无 UI 入口** |

**关键事实**：①②已经"一套数据、两端渲染"，都跑同一个共享 `shared/components/board/BoardSurface.tsx`；保存 `.board`/`.md` → 撞 `updated_clock` → 广播 `DocumentChanged` → 另一端 sync 拉取。**"云端本地互通"在文件型看板上已经实现**——用户实际在用的就是这套。

因此"融合"= **把③独有的功能搬到文档模型 → 删掉③**，而**不是**搭新同步管道。

---

## 1. 目标架构

```
              shared/components/board/BoardSurface.tsx  (唯一 UI)
                          ▲                    ▲
          ┌───────────────┘                    └───────────────┐
   桌面 adapter                                          Web 文件 adapter
   src/components/BoardView.tsx                   WebBoardView.tsx
   (.board + .md 文件)                            (documents 表里的 .board + .md)
                          └──── 同一批文件，经文档同步双向互通 ────┘

   退役：Web 云端 DB adapter  Kanban.tsx  +  kanban_* 表  +  handlers/kanban/*
```

- 平台差异全部表达为 `BoardSurface` 的**可选 props**（`assigneeOptions`/`tagOptions`/`loadComments`/`loadActivity`）；不传则对应 UI 不渲染。纯客户端能力（分组/排序/筛选/表格/日历/泳道/任务进度/自定义字段/emoji/依赖）①②已全有。

**删 / 留 / 改总览**：

| 对象 | 处置 |
|---|---|
| ③ 的页面、路由、`handlers/kanban/*`、`api.ts` kanban 块、MCP/CLI kanban 工具 | **删** |
| `kanban_boards/columns/labels/cards/card_labels/card_trash` | **删**（存量为空，无需迁移脚本） |
| `kanban_card_comments` | **留+改键**：评论暂留云端 DB，但从 `card_id`(FK kanban_cards) 改挂 `document_id`(FK `documents.id`) |
| `kanban_webhooks` + `kanban_webhook_deliveries` + 投递 worker | **留+重接**：基建保留，触发源改挂文档保存路径 |

### 1.1 架构定调（两条不可动摇的原则）

**① `documents.id` 是唯一连接键。** 看板**内容**永远是 `documents` 表里的 `.md`/`.board` 文件（双向同步，给互通/可移植/git/桌面/统一 vault）；所有云端**关系型"卫星"**一律键挂 `documents.id`，不再各自造卡片身份：

| 卫星 | 键 |
|---|---|
| `card_comments` | `document_id` |
| `webhooks.board_document_id` | board 的 `document_id` |
| `card_tickets`（见 [`ticket-links.md`](./ticket-links.md)） | `document_id` |
| 活动流 | 派生自 `document_versions`（按 doc） |

人类可读的 ticket 串（如 `OCCSV-3371`）**只是展示别名，永不做外键**——`document_id` 改名/移动都不变、且离线卡未铸号时就已存在；ticket 串会随 board key 改名而变。
> 前提：卫星都是云端特性，`document_id` 在卡片进入云端 `documents` 表后才有；"web 为主"下这是常态。

**② Web 为主，Desktop 为辅。** Web = 功能完整的主场（号 / 评论 / webhook / 活动这些富功能**在线才全**）；Desktop = 能离线读写同一批看板文件的**轻客户端**，离线不享有云端卫星。由此：

- 富功能"**云端独占**"可接受，不为离线妥协架构。
- **桌面只读缓存**（如 ticket 的 `tickets.json`）、**评论本地化（v3）** 一律**降级为可选/以后再说**，不进首版。
- **最终形态固定**：*文件存内容 + 薄云端表存关系型卫星*。**不要再把卡片塞回 DB**。

---

## 2. 功能补齐（parity）

③接了、而文件模型还没存储位的 5 项。除评论外都落进 frontmatter / `.board` / 已有表，零新基建。

| 功能 | ③ 现状 | 文件模型归宿 | 工作量 |
|---|---|---|---|
| 成员指派 | `kanban_cards.assignee_user_id` FK→users | §2.3 | 低-中 |
| 彩色标签 | `kanban_labels`(color) + 关联表 | §2.2 | 中 |
| 活动流 | `card.rs` 读时派生 | §2.4 | 低 |
| 评论 | `kanban_card_comments` 表 | §2.1（暂留云端，改键） | 中 |
| Webhook | `kanban_webhooks` + worker | §2.5（重接文档事件） | 中-高 |

### 2.1 评论（暂留云端 DB，改键到文档）
- **决策**：本轮评论**不进文件模型**，仍走云端表，但脱离即将删除的 `kanban_cards`。
- 表 `kanban_card_comments` → 重命名 `card_comments`，键 `card_id` → **`document_id`(FK `documents.id`)**。卡片就是文档，文档 id 稳定、改名/移动不丢评论。
- `WebBoardView` 接 `loadComments/addComment/deleteComment`（卡片的 `document_id` 即评论键）。桌面离线暂不显示评论（云端独占，可接受）。
- 后续若要真正本地化，再迁移到卡片正文 `## Comments` 区或 sidecar `.md`（留作 v3）。

### 2.2 彩色标签（存进 `.board`）
- 标签定义 `{ key, label, color }` 放进 **`.board` JSON 的 `labels[]`**；卡片 frontmatter `tags` 按 key 引用。
- 随 `.board` 文档同步，桌面/web 一致，**不要 DB**。`BoardTag` 已支持 color，只需 adapter 把 `.board.labels` 映进 `tagOptions`。

### 2.3 成员指派（member）
- Web adapter 给 `BoardSurface` 传 `assigneeOptions`（来自 `api.listMembers`）；选中后 frontmatter `assignee` 存**稳定 handle**（email 或用户名），两端都能渲染。
- 桌面无成员体系时保持自由文本，能正常显示同一字段。

### 2.4 活动流（派生自文档版本史）
- 复用**已有的 `document_versions` 表**（已记录 `updated_clock` + 编辑者）派生活动，比③现在硬编码的 4 种事件更细。
- adapter 实现 `loadActivity`：读卡片文档的版本史 → 映成 `BoardSurface` 的活动条目。无新表。

### 2.5 Webhook（保留基建，重接文档事件）
- **保留**：HMAC-SHA256 签名、`webhook_deliveries` 重试队列、SSRF 防护、后台投递 worker `tasks/webhook_delivery.rs`——全部不动。
- **重接触发源**：从 `handlers/kanban/card.rs` 的 3 处 `enqueue_event`，搬到 **`handlers/document.rs` 的 `save_document`**（及 sync push 的文档写入站点）：
  - 保存一个带 `board:` frontmatter 的 `.md` 卡片，或一个 `.board` 文件时，
  - 服务端**解析 frontmatter 的 `board` 字段**解出所属看板 → 匹配 `webhooks` 表中作用域命中的记录 → `enqueue_event`。
- 表 `kanban_webhooks` → 重命名 `webhooks`，`board_id` 去掉对 `kanban_boards` 的 FK，改存 **board 文档 id**（nullable = 全部看板）。
- 事件名沿用 `kanban:card-updated` / `kanban:card-archived` 等，保持 payload 兼容。
- ⚠️ 需要服务端在文档保存路径上做 frontmatter 解析（已有 util 可复用）；若先求简，可先只支持 workspace 级作用域（不按 board 过滤），board 级作为二期。

---

## 3. 数据库变更（迁移 `0018_drop_kanban`）

> 迁移是 **append-only**：**绝不编辑** `0007/0016/0017`，新增 `0018` 并注册进 [`db/migrations.rs`](../../services/jtype-web/src/db/migrations.rs)。
> ⚠️ 迁移 runner 的分句器很朴素（见记忆 migration-runner-naive-splitter / [`migrations.rs`]）：剥掉整行 `--` 注释后按 `;` 裸切，**无字符串/行内注释意识**。SQL 草案里**不要写行内 `--` 注释、不要在语句里出现裸 `;`**。

**因存量为空，推荐"删旧建新"而非 ALTER 改键**（避免查 FK 约束名的麻烦）：

```sql
-- 0018_drop_kanban.up.sql  （草案；正式落地前以实际列定义校对）

DROP TABLE IF EXISTS kanban_webhook_deliveries;
DROP TABLE IF EXISTS kanban_webhooks;
DROP TABLE IF EXISTS kanban_card_comments;
DROP TABLE IF EXISTS kanban_card_labels;
DROP TABLE IF EXISTS kanban_card_trash;
DROP TABLE IF EXISTS kanban_cards;
DROP TABLE IF EXISTS kanban_labels;
DROP TABLE IF EXISTS kanban_columns;
DROP TABLE IF EXISTS kanban_boards;

CREATE TABLE card_comments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  author_user_id CHAR(36) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_card_comments_ws FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_card_comments_doc FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT fk_card_comments_author FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE webhooks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  board_document_id CHAR(36) NULL,
  name VARCHAR(120) NOT NULL,
  target_url VARCHAR(2048) NOT NULL,
  secret CHAR(64) NOT NULL,
  event_types JSON NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_delivery_at TIMESTAMP NULL,
  last_status VARCHAR(32) NULL,
  created_by_user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_webhooks_ws FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_webhooks_doc FOREIGN KEY (board_document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT fk_webhooks_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE webhook_deliveries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  webhook_id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('pending','succeeded','failed','dead') NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 6,
  last_status_code INT NULL,
  last_error TEXT NULL,
  next_retry_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deliveries_webhook FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE,
  CONSTRAINT fk_deliveries_ws FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
```

> `.down.sql` 反向（drop 新 3 表 + 重建旧 9 表）可直接复用 `0007/0016/0017` 的 `.up` 拼成，仅用于本地回滚演练。

**删除顺序（子→父，已编码进上面）**：`webhook_deliveries → webhooks → card_comments → card_labels → card_trash → cards → labels → columns → boards`。所有 FK 为 CASCADE/SET NULL，按此序 `DROP TABLE IF EXISTS` 即干净。

---

## 4. 后端改动（`services/jtype-web/src/`）

- **删** `handlers/kanban/` 整目录（board/card/column/label/comment/mod）。
- `handlers/mod.rs`：去掉 `pub mod kanban;`。
- `lib.rs`：删 ~18 条 kanban 路由（boards/columns/cards/trash/move/archive/restore/comments/activity/labels）。
- `db/models.rs`：删 Kanban 结构体块。
- `hub.rs`：删 `WorkspaceEvent` 的 `kanban:*` 变体（document/member/workspace 变体保留）。
- `tasks/cleanup_trash.rs`：去掉 `kanban_card_trash` 清理（**保留** `document_trash`）。
- **新增/搬迁**：评论端点改挂 `document_id`（新 `handlers/comments.rs` 或并入 document handler）；webhook 端点（注册/列表/删除）保留，触发逻辑搬进 `handlers/document.rs::save_document`（见 §2.5）。`tasks/webhook_delivery.rs` 保留。

## 5. 前端改动（`services/jtype-web/frontend/src/`）

- **删** `pages/Kanban.tsx`；`main.tsx` 去掉 import + `/kanban` 路由。
- `api.ts`：删 `kanban: { … }` 客户端块及 `Kanban*` 类型；**保留/迁移**评论、webhook 的 API（改挂文档维度）。
- `WebBoardView.tsx`：接 `assigneeOptions`（成员）、`tagOptions`（`.board.labels`）、`loadComments/addComment`、`loadActivity`，达成与③的功能对齐。
- i18n：删除 `Kanban.tsx` 后跑 `lingui extract` 自动剪死字符串（注意 MCP/营销文案里的 "kanban" 词条要保留，见记忆 i18n-catalog-split）。
- Help：删 `kanban-boards-and-cards`、`kanban-web-board-view` 文章 + `KanbanExplainer` Remotion（glob 自动注销）；其余散文提及改写。

## 6. MCP / CLI / 测试 / 文档清理

- **MCP**（`mcp/tools.rs`）：6 个 kanban 工具（`list_boards/get_board/list_cards/create_card/update_card/move_card`）**改写成打本地 vault 模型**（读写 `.board`/`.md` 文档），或删除。notes 工具不动。
- **CLI**（`jtype-cli/src/kanban.rs`）：整模块删，`main.rs` 去掉 `Board`/`Card` 子命令。
- **测试**：删 `tests/kanban_tests.rs`、`kanban_e2e_tests.rs`；修 `mcp_tests.rs`、`jtype-cli/tests/e2e.sh` 的 kanban 段。
- **文档**：本文为新真相源；旧文档（`design.md`/`gaps-and-roadmap.md`/`next-features-design.md`/`doc-kanban-unification`/`web-board-alignment`）已加状态横幅指向本文。
- **AI skill** `internal-docs/ai-integration/skills/jtype-kanban/SKILL.md`：随 MCP/CLI 改写或更新。

---

## 7. 落地阶段与顺序

1. **功能补齐**（不依赖删除，先做，立刻让②变强）：彩色标签 → 成员指派 → 活动流。
2. **评论改键**：`card_comments` 挂 `document_id`，`WebBoardView` 接评论 UI。
3. **Webhook 重接**：`webhooks` 表改造 + 触发源搬到 `save_document`。
4. **清理③**：删 `Kanban.tsx`/路由/`handlers/kanban`/`api.ts` 块/MCP·CLI 工具/测试/help。
5. **`0018_drop_kanban`**：删旧建新 + 注册进 `migrations.rs`。

> 顺序原则：**先建后拆**——先把②补到不输③，再删③，删除放最后最安全。

---

## 8. 验收标准

**通用门槛（每阶段）**：`tsc --noEmit`（desktop + web）= 0；两端 `vite build` = 0；`cargo check` + `cargo test`（jtype-web + src-tauri）通过；应用启动无 console 错误。

- AC1 彩色标签：在 `.board` 定义带色标签，卡片打标后，桌面与 web 同色渲染；新增/改色随 `.board` 同步到另一端。
- AC2 成员指派：web peek 出现成员下拉，选中写回 frontmatter `assignee`，桌面打开同卡显示同一负责人。
- AC3 活动流：卡片 peek 的活动条来自文档版本史，编辑卡片后新增一条，**无新表**。
- AC4 评论：web 上对某卡评论，刷新/换设备仍在；评论键为该卡 `document_id`，卡片改名后评论不丢。
- AC5 Webhook：在统一看板上改一张卡（②的 `.md`），命中作用域的 webhook 收到签名请求；`/kanban` 旧页已不存在。
- AC6 清理：`/workspaces/:id/kanban` 路由 404；`grep -ri "kanban_" services/jtype-web/src` 仅余迁移历史文件；`kanban_boards` 等 6 表不存在；`card_comments`/`webhooks`/`webhook_deliveries` 三表存在且键正确。
- AC7 互通回归：web 建/改 `.board` 卡片 → 桌面同步可见；桌面改 → web 可见（②已有能力不回退）。

## 9. 风险与未决

- **评论本地化**留到 v3（本轮仅改键，仍云端独占，桌面离线不显示评论）。
- **Webhook board 级作用域**依赖服务端在保存路径解析 frontmatter；若求简先做 workspace 级，board 级二期。
- **成员 handle 选型**（email vs 用户名）需与现有成员标识统一；桌面无成员体系，跨端显示需约定回退。
- **存量为空是删除前提**：落地前用 `SELECT COUNT(*)` 逐表确认 `kanban_*` 确无真实数据，否则需补一次性导出脚本。
