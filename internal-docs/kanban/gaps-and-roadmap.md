# JType 看板 — 缺口盘点与优先级路线图

> 🛑 **部分推翻（2026-06-23）**：本文 §0 的"**DB 看板保留为次要/遗留**"口径已被推翻——决定**退役 DB 看板**，看板彻底收敛到文档型并云端本地互通。当前真相源见 **[`unification-v2.md`](./unification-v2.md)**。
> 另：本文 2026-06-20 后已有变化——**B1 评论（`0016_kanban_comments`）、D2 Webhook（`0017_kanban_webhooks`）均已落地（落在 DB 看板上）**；§1 表格里它们的"待设计/待做"状态过时。下方路线图作为历史审计留存。

状态：现状审计 + 决策收敛（基于 `main` HEAD 实际代码 + 用户 2026-06-20 逐条决策）
初始日期：2026-06-20
更新日期：2026-06-23（加退役横幅 + 标注 B1/D2 已落地）

> 配套文档：
> - [`design.md`](./design.md) — v1 三环境设计。**第 6/7 节已过时**（依赖的 `kanban_local.rs` 已在提交 `1576515` 删除）。
> - [`next-features-design.md`](./next-features-design.md) — 已设计的绿灯项（D1 依赖 / C3 日历 / D2 Webhook）+ §0「现状基础：两套看板与数据落点铁律」。
> - [`agent-orchestration-design.md`](./agent-orchestration-design.md) — Symphony 式编排设计（搁置,留作搬进 jcode 的参考）。

---

## 0. 一句话现状

看板有**两套互不相通的系统**：云端 DB 看板（`Kanban.tsx` + `kanban_*` 表,成熟,但桌面不可达）与**文件看板**（`.board` + `.md` 卡片,用户实际在用,桌面↔云端经文档同步双向可见）。两者复用同一个 `BoardSurface`,故视图级功能对两套都生效。模型已定为 **markdown 卡片**;~~DB 看板暂保留为次要/遗留~~ **→ 已改为退役 DB 看板（2026-06-23,见 [`unification-v2.md`](./unification-v2.md)）**,新 per-card 功能以文件看板为真相源。

> 订正（2026-06-23）：更准确说是**三个渲染面/两套数据层**——① 桌面文件看板、② Web 文件看板（`WebBoardView.tsx`,已与桌面双向同步)、③ Web 云端 DB 看板(`Kanban.tsx`,孤岛)。①②已互通,③待退役。

---

## 1. 全部任务清单（状态总览）

> 用户决策口径:**逐条点过的按其决策;未点评的一律视为「认可/绿灯」。** C2 已明确丢弃;D3/D4/编排明确搁置到 jcode。

| ID | 任务 | 状态 | 估时 | 数据落点 / 备注 |
|----|------|------|------|----------------|
| A1 | 同步现状订正 | ✅ 已完成(写入设计 §0) | — | 同步可用,经文档管线;非缺口 |
| A2 | 数据模型 | ✅ 已决策,无需开发 | — | = markdown 卡片 |
| B4 | 子任务 | ✅ 已决策,无需开发 | — | 正文 `- [ ]`,`taskDone/taskTotal` 现算 |
| C2 | 跨板移动卡片 | 🗑️ 丢弃 | — | 删了重建即可 |
| **D1** | **卡片依赖(blocker/relates)** | 🟢 绿灯·**已设计** | M | frontmatter `blocked_by/blocks/relates`;零迁移/WS/gate |
| **C3** | **到期 / 日历视图** | 🟢 绿灯·**已设计** | M | 读 frontmatter `due`;纯前端;对两套看板自动生效 |
| **D2** | **看板 Webhook 注册+外发** | 🟢 绿灯·**已设计** | M-L | 新表(迁移 0016)+ HMAC 投递 worker;密钥**方案 A 明文**;仅 DB 看板(文件看板见 phase-4) |
| **B1** | **卡片评论 / 讨论** | 🟢 绿灯·待设计 | M | 无 comment 表;文件看板下"评论存哪"是难点(DB-only vs 卡片正文 vs 旁挂 `.md`),需设计抉择 |
| **B2** | **活动 / 变更历史** | 🟢 绿灯·待设计 | M | 可考虑复用文档同步的 `updated_clock`/`edited_by` 派生,而非新表 |
| **B3** | **附件** | 🟢 绿灯·待设计 | M | 复用桌面 blob 通道 + web UUID 资产存储;以 markdown 链接挂在卡片正文 |
| **C1** | **删除 / 合并列** | 🟢 绿灯·待设计 | S | 文件看板=改 `.board` columns + 迁移卡片 `status`;DB 看板=补 DELETE column 端点([`lib.rs:321-380`](services/jtype-web/src/lib.rs#L321) 现无) |
| **C4** | **泳道 / 二维分组** | ✅ 可编辑泳道已实现 | M | 可持久化泳道、稳定 key、增删改、卡片映射与可恢复转换见 [`swimlane-management-design.md`](./swimlane-management-design.md) |
| **C5** | **卡片自定义字段** | 🟢 绿灯·待设计 | M | 文件看板=任意 frontmatter key + 在 `.board` 声明展示字段;`properties_extra` 仅 DB 看板 |
| D3 | agent 工作证据载体 | ⏸️ 搁置到 jcode | — | 见 agent-orchestration-design |
| D4 | 状态机语义 MCP 动作 | ⏸️ 搁置到 jcode | — | 同上 |
| — | 轮询 orchestrator | ⏸️ 搁置到 jcode | — | 同上 |
| DOC | 订正过时文档 | 📝 待做 | S | design.md §6/§7/头部 + `types.ts:23`(见 §3) |

合计待开发:**绿灯 8 项**(D1/C3/D2 已设计 + B1/B2/B3/C1/C5 待设计)+ 文档订正。

---

## 2. 优先级与建议顺序

| 优先级 | 项 | 理由 |
|--------|-----|------|
| **P0** | D1 依赖、C3 日历 | 已绿灯·已设计、纯文件看板/纯前端、零基建风险,可独立交付 |
| **P0** | C1 删列 | 小、自洽,可随手穿插 |
| **P1** | C5 自定义字段 | 纯前端/frontmatter,延续文件看板路线,风险低 |
| **P1** | B3 附件 | 复用既有资产/blob 通道,模式成熟 |
| **P2** | D2 Webhook | 牵涉新迁移 + 投递 worker + 密钥安全,面更大;且仅服务 DB 看板(价值取决于是否用 DB 看板) |
| **P2** | B2 活动历史 | 若复用文档历史派生则轻,若做新表则重;先调研 |
| **P2** | B1 评论 | 文件看板下存储模型需先拍板,最不自洽,放后 |
| **P3** | DOC 文档订正 | 随时可做 |

**建议批次**：
1. **第一批(纯文件看板/前端,零基建)**：D1、C3、C1、C5 —— 互不依赖,可并行,对你实际在用的看板立刻有用。
2. **第二批(复用既有基建)**：B3 附件、B2 活动历史。
3. **第三批(需先拍板/面大)**：B1 评论(存储模型)、D2 Webhook(密钥已定方案 A,但需确认是否做文件看板 phase-4)。

> **D2 范围待确认**:webhook 只在 `kanban:*` 富事件触发 = **只有 DB 看板会发**。若要服务你实际用的文件看板,需提前 phase-4(在 `handlers/sync.rs` 文档变更站点入队,仅路径级载荷),工作量更大。按"未点评即认可"口径,phase-4 暂记为**认可但排在最后**,落地前再确认。

---

## 3. 需要回写修订的过时文档（DOC 任务）

> ✅ 2026-06-23：design.md 头部 + §6/§7 已加撤回/退役横幅;本文已加退役横幅。文档订正大部完成,余项随 v2 落地清理。

- [x] [`design.md` 第 6 节「LOCAL — kanban_local.rs」](./design.md)：已加 ⚠️ 撤回标注 + v2 退役横幅。
- [x] [`design.md` 第 7 节「同步数据流(Desktop)」](./design.md)：已标注实现撤回。
- [x] `design.md` 头部状态行:已更新为「曾实现后移除(提交 1576515)」+ v2 退役横幅。
- [ ] [`shared/components/board/types.ts`](shared/components/board/types.ts) 注释「web → localStorage」：`WebBoardView` 已改 `saveDocument` 写 `.board`(随 v2 §5 核对修正)。

---

## 附：本审计核实过的事实锚点

- 云端 6 表:`migrations/0007_kanban.up.sql`(boards/columns/cards/labels/card_labels/card_trash);下一个迁移号 0016
- 文件看板同步三道闸门:`collect_sync_documents`/`collect_files_recursive`(jtype-core)+ `apply_cloud_documents`([`src-tauri/src/lib.rs:451`](src-tauri/src/lib.rs#L451)),回归测试 `lib.rs:1010`
- DB 看板与文件看板复用同一 `BoardSurface`：[`Kanban.tsx:381`](services/jtype-web/frontend/src/pages/Kanban.tsx#L381)
- 路由全集(column 无 delete;card 有 archive/restore/delete):[`services/jtype-web/src/lib.rs:321-380`](services/jtype-web/src/lib.rs#L321)
- MCP 工具:`kanban/*`(仅 DB 看板)+ `documents`(markdown 笔记,含文件看板 `.md` 卡片) [`services/jtype-web/src/mcp/tools.rs`](services/jtype-web/src/mcp/tools.rs)
- `kanban_local.rs` 删除证据:`git show --stat 1576515` → `src-tauri/src/kanban_local.rs | 672 --------`
- 无 comment/attachment/activity/checklist 表或处理器:对 `handlers/kanban` 与 migration 的 grep 均为空
- 卡片 frontmatter 字段 + `- [ ]` 任务计数:`count_tasks` [`services/jtype-core/src/lib.rs:1404`](services/jtype-core/src/lib.rs#L1404),`BoardCardInfo` `:1338`
