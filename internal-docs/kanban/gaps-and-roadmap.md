# JType 看板 — 缺口盘点与优先级路线图

状态：现状审计（基于 `main` HEAD 实际代码，非设计意图）
初始日期：2026-06-20

> 配套文档：[`design.md`](./design.md) 描述了 v1 的三环境设计。**注意 `design.md` 第 6/7 节已过时**——它依赖的桌面本地优先 store `src-tauri/src/kanban_local.rs` 已在提交 `1576515`（"AI integration … + in-flight board WIP"）中被整体删除（−672 行）。本文档以当前 HEAD 的真实代码为准，并在最后一节列出需要回写修订的过时文档。

---

## 0. 一句话现状

云端（Web/DB）看板已相当成熟；桌面看板已退化为**纯文件式**（`.board` + `.md`），与云端 DB 看板**不共享数据模型**；曾经实现过的结构化桌面↔云端同步**已被移除**。AI/MCP/CLI 只能操作云端那套。

---

## 1. 现状盘点（两套互不相通的看板）

| 维度 | 云端 / Web 看板 | 桌面看板 |
|------|----------------|----------|
| 存储 | MySQL 6 张表（见下） | `.board` JSON + vault 内 `.md` 卡片 |
| 入口 | REST + WebSocket 实时 | Tauri 本地命令 |
| 数据模型 | 结构化关系表 | 文件；卡片即 markdown 笔记 |
| 代码 | `services/jtype-web/src/handlers/kanban/*.rs`、`migrations/0007_kanban.up.sql` | [`src/components/BoardView.tsx`](src/components/BoardView.tsx)、[`src-tauri/src/lib.rs:245`](src-tauri/src/lib.rs#L245)（read/write/create board file、scan cards） |
| AI / MCP / CLI | ✅ [`mcp/tools.rs:99`](services/jtype-web/src/mcp/tools.rs#L99)、[`cli/src/kanban.rs`](services/jtype-cli/src/kanban.rs) | ❌ 够不到 |
| 同步 | 自身即权威 | 仅 `.board` 文件作为**不透明文档**走文档同步管线（[`lib.rs:1010` 回归测试](src-tauri/src/lib.rs#L1010)） |

**云端 schema（`0007_kanban.up.sql`，共 6 表）**：`kanban_boards`、`kanban_columns`、`kanban_cards`、`kanban_labels`、`kanban_card_labels`(M:N)、`kanban_card_trash`(软删审计)。

**云端已实现的能力（成熟）**：boards/columns/cards/labels CRUD、整数 position + 全列重排、5 级优先级、due_at、assignee（限 workspace 成员）、标签（≤50/板）、软删除 + 30 天回收站 + 每小时清理 cron、乐观锁（`baseUpdatedClock`/`force`/409）、WebSocket 实时广播 + 自回声过滤、Board/Table 双视图、按 status/priority/assignee 分组、拖拽、卡片 peek、模板（桌面）。

**共享 UI**：[`shared/lib/board.ts`](shared/lib/board.ts) + [`shared/components/board/*`](shared/components/board/) 两端复用同一套看板界面。

---

## 2. 缺口清单（可执行项）

每条标注：**现状 → 缺什么 → 影响 → 粗估工作量（S/M/L/XL）**。

### A. 结构性缺口（最高杠杆）

- [ ] **A1 桌面↔云端结构化同步缺失（曾实现后被删）** — XL
  现状：`kanban_local.rs` 已删除；桌面看板与云端 DB 看板是两套模型。
  缺：要么恢复/重写本地优先 store + 同步层，要么明确"桌面看板 = `.board` 文件 + 文档同步"为唯一路线并废弃 DB 同步意图。
  影响：web 上建的结构化看板（含卡片/标签/回收站）在桌面看不到；反之亦然。这是当前最大的认知与功能断层。

- [ ] **A2 数据模型二选一未拍板** — M（决策）+ L（落地）
  现状：文件式（markdown 卡片）与 DB 式（关系表）并存且语义不同（如任务进度：文件式从 markdown `- [ ]` 现算，DB 式无子任务实体）。
  缺：一份"统一数据模型 / 映射规则"的决策（桌面文件式是否升格为 DB 真子集？映射哪些字段？）。
  影响：不拍板，A1 无从设计。

### B. 卡片协作 / 元数据缺口

- [ ] **B1 卡片评论 / 讨论** — M
  现状：无 `comment` 表、无处理器（已核实）。缺独立评论实体（带作者、时间、@提及）。影响：卡片无法承载协作讨论。**自洽、不牵动同步，适合先做。**
- [ ] **B2 活动 / 变更历史** — M
  现状：除回收站审计外无 activity log。缺"谁在何时改了什么"的时间线。影响：多端协作无可追溯性；也是 D（agent 编排）回报工作的载体前置。
- [ ] **B3 附件** — M
  现状：无 attachment 表；图片只能塞进 markdown 描述。可复用 web 现有 UUID 资产存储 / 桌面 blob 通道。影响：卡片无法挂设计稿/PDF/截图。
- [ ] **B4 结构化子任务 / checklist** — M
  现状：任务进度从 markdown 复选框现算，非实体。缺可独立排序/指派/筛选的子任务。影响：无法把卡片拆成可独立追踪的工作项。

### C. 看板功能缺口

- [ ] **C1 删除 / 合并列** — S
  现状：列只有 create/patch/reorder，**无 DELETE 端点**（[`lib.rs:321-380`](services/jtype-web/src/lib.rs#L321)），列仅随整板级联删除。缺独立删列（含卡片迁移策略）。**小而自洽,适合先做。**
- [ ] **C2 跨板移动卡片** — M
  现状：卡片锁死在所属 board（`move_card` 只在同板内换列）。缺 board 间移动。影响：无法在项目板之间流转卡片。
- [ ] **C3 到期 / 日历视图与提醒** — M
  现状：`due_at` 只存不提醒、无聚合视图。缺到期列表 / 日历 / 通知。影响：截止日期形同虚设。
- [ ] **C4 泳道 / 二维分组（Swimlane）** — M
  现状：`groupBy` 单选 status/priority/assignee。缺二维（如列=状态 × 行=负责人）。影响：复杂看板表达力不足。
- [ ] **C5 卡片自定义字段 / 属性** — M
  现状：`properties_extra` JSON 仅存 icon。缺用户可定义的结构化字段（story point、链接、状态机字段等）。影响：限制看板适配不同工作流（也是 D 的前置，见 D 文档）。

### D. AI / Agent 编排缺口（详见单独设计文档）

- [ ] **D1 卡片 blocker / 依赖关系** — M
  现状：完全没有。影响：agent 无法判断"这张卡能否现在开工"（对照 Symphony 的 blocker 机制）。
- [ ] **D2 事件外发 / webhook** — M
  现状：有面向前端的 WS 广播，但无"轮询看板→拉起 agent"的 orchestrator 入口。影响：无法驱动自主 agent。
- [ ] **D3 卡片"工作证据"载体** — M
  现状：卡片无结构化的运行结果 / 链接 / 状态机字段（仅 priority + 自由 `properties_extra`）。影响：agent 无处回贴 CI 状态 / PR / 复杂度（Symphony 的核心要求）。
- [ ] **D4 带状态机语义的 MCP 动作** — M
  现状：MCP 工具是 CRUD 级（list/get/create/move）。缺"认领卡片 / 标记进行中 / 回报结果"等动作。影响：agent 只能机械读写,无法表达工作流意图。

> D1–D4 的目标形态与最小原型见 [`agent-orchestration-design.md`](./agent-orchestration-design.md)（仅设计，不实现）。

---

## 3. 优先级矩阵

| 优先级 | 项 | 理由 |
|--------|-----|------|
| **P0 决策** | A2 数据模型拍板 | 阻塞 A1；不拍板，桌面/云端断层持续 |
| **P0 高杠杆** | A1 桌面↔云端同步 | 当前最大功能断层（且曾实现，有 git 历史可参考） |
| **P1 快速见效** | C1 删列、B1 评论、B2 活动历史 | 自洽、不牵动同步、协作刚需 |
| **P1 体验** | C3 到期视图、B3 附件 | 高频痛点 |
| **P2 表达力** | B4 子任务、C2 跨板移动、C4 泳道、C5 自定义字段 | 提升适配面 |
| **P2 探索** | D1–D4 agent 编排 | 战略方向，依赖 C5/B2，单独立项 |

---

## 4. 建议路线图（分阶段）

- **阶段 0 — 决策与对齐**：拍板 A2（统一数据模型）；同步修订过时的 `design.md`（见第 5 节）。
- **阶段 1 — 协作打底（P1，互不依赖，可并行）**：C1 删列 → B1 评论 → B2 活动历史 → B3 附件。
- **阶段 2 — 同步收口（P0 高杠杆）**：依据阶段 0 决策落地 A1。git 历史中 `053113b`/`9f96ece` 可作恢复/重写参考。
- **阶段 3 — 表达力（P2）**：C2/C3/C4/C5/B4 按需。
- **阶段 4 — Agent 编排（P2 探索）**：在 C5（自定义字段）+ B2（活动历史）就绪后，按 `agent-orchestration-design.md` 推进 D1–D4。

---

## 5. 需要回写修订的过时文档

- [ ] [`design.md` 第 6 节「LOCAL — 桌面端离线存储（kanban_local.rs）」](./design.md)：该文件已删除，整节失效，需标注"已移除"或重写。
- [ ] [`design.md` 第 7 节「同步数据流（Desktop）」](./design.md)：依赖已删除的 `take_pending_ops`/`merge_remote_board`，需标注为未实现且实现已撤回。
- [ ] `design.md` 头部状态行（"Desktop↔Cloud 同步接线…尚未接通,为设计意图"）：应升级为"曾实现后移除（提交 1576515）"，避免误导。

---

## 附：本审计核实过的事实锚点

- 云端 6 表：`migrations/0007_kanban.up.sql`
- 路由全集（含 column 无 delete、card 有 archive/restore/delete）：[`services/jtype-web/src/lib.rs:321-380`](services/jtype-web/src/lib.rs#L321)
- MCP 工具集（list_boards/get_board/list_cards/create_card/move_card）：[`services/jtype-web/src/mcp/tools.rs:99`](services/jtype-web/src/mcp/tools.rs#L99)
- 桌面文件式看板：[`src/components/BoardView.tsx`](src/components/BoardView.tsx) + [`src-tauri/src/lib.rs:245-303`](src-tauri/src/lib.rs#L245)
- `.board` 文件级文档同步回归测试：[`src-tauri/src/lib.rs:1010`](src-tauri/src/lib.rs#L1010)
- `kanban_local.rs` 删除证据：`git show --stat 1576515` → `src-tauri/src/kanban_local.rs | 672 --------`
- 无 comment/attachment/activity/checklist 表或处理器：对 `handlers/kanban` 与 migration 的 grep 均为空
