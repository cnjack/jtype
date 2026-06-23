# JType 看板 — 下一批功能设计（D1 依赖 / C3 日历 / D2 Webhook）

> ℹ️ **部分更新（2026-06-23）**：D1 依赖 / C3 日历已落地。**D2 Webhook 的基建设计（HMAC 签名 / 重试队列 / SSRF 防护 / 投递 worker）仍有效**，但**触发源已改**——不再挂在云端 DB 看板的 `kanban:*` 事件，而是**重接到文档保存路径**（`save_document`），作用域改用 board 文档 id。详见 **[`unification-v2.md`](./unification-v2.md) §2.5**。本文 D2 章节中"仅 DB 看板会发"的限定已不成立。

状态：**设计提案（仅设计，未实现，不含代码）**
初始日期：2026-06-20
来源：基于 [`gaps-and-roadmap.md`](./gaps-and-roadmap.md) 的用户决策收敛 —— 绿灯三项 D1 / C3 / D2，外加 A1 现状订正。
核验：本文每个 `file:line` 引用均由独立 agent 对真实仓库逐一核对（adversarial review）。少量行号为定位容差（±数行），已在文内据实标注。

> 本文不写任何代码，只描述方案、数据落点、接口与分阶段。落地前请先读 §0 —— 它是后续三个功能"数据该放哪"的硬约束。

---

## 0. 现状基础：两套看板与"数据落点铁律"（原 A1 订正）

本节是**现状订正**，不是新功能。说清楚"桌面建的看板为什么能在云端看到、反之亦然"，并澄清 JType 里**两套互不相通的看板系统**的边界，避免后续设计把数据放错地方。

### 0.1 核心结论：存在两套互不相通的看板

| | 系统 A：文件看板（用户实际在用） | 系统 B：DB 看板（并行系统） |
|---|---|---|
| 数据载体 | `.board` JSON 配置 + 每张卡片一个 `.md`（frontmatter + 正文） | MySQL `kanban_*` 表 |
| 同步通道 | **文档同步管道**（`document` 表 + `/sync/push`、`/sync/pull`） | 独立的 REST + WebSocket |
| 桌面端 | 有（`BoardView.tsx`） | **没有**（`kanban_local.rs` 已在 commit `1576515` 删除） |
| 云端 | `WebBoardView.tsx`（仍走文档 API） | `Kanban.tsx`（走 `kanban_*` REST/WS） |
| 实时事件 | `document:changed` / `document:deleted` | `kanban:card-updated` 等 |

两者**没有任何数据桥**：改一次 `.board` 不会触碰 `kanban_*` 表；一张 DB 看板卡片也永远不会生成 `.md` 文件。用户真正使用的、且能同时出现在桌面和云端的，是**系统 A（文件看板）**。

### 0.2 系统 A 同步原理（文件看板，桌面↔云端真正可用的那套）

**唯一判定谓词**：桌面侧单一事实来源 `is_syncable_document_path`（[`services/jtype-core/src/lib.rs:1332`](services/jtype-core/src/lib.rs#L1332)）：`is_markdown_path || is_board_path || is_diagram_path`。`.board` 和卡片 `.md` 能跨端，正因为落在这个谓词里。

**三道同步闸门必须镜像一致**（缺一即静默丢数据，即已记录的 `.board` apply-gate 回归）：
- **push（上行收集）**：`collect_sync_documents`，[`services/jtype-core/src/lib.rs:514`](services/jtype-core/src/lib.rs#L514)（`.board`/图表按不透明内容处理，不解析 frontmatter）。
- **sync-base（合并基线）**：`collect_files_recursive`，[`services/jtype-core/src/lib.rs:715`](services/jtype-core/src/lib.rs#L715)。
- **apply（下行落盘）**：`apply_cloud_documents`，[`src-tauri/src/lib.rs:451`](src-tauri/src/lib.rs#L451)（`.board` 落盘回归测试在 `lib.rs:1020`）。

服务端独立镜像同一规则：[`services/jtype-web/src/util.rs:217`](services/jtype-web/src/util.rs#L217) 的 `is_syncable_document_path` 同样是 `markdown || board || diagram`；`.board`/卡片 `.md` 作为普通行存入 `document` 表，由 `handlers::sync::push` 处理。

**完整链路**：桌面上行 `collectSyncDocuments` → `POST /sync/push`（[`src/hooks/useCloudSync.ts:325`](src/hooks/useCloudSync.ts#L325)）；桌面下行 `/sync/pull` → `apply_cloud_documents` 落盘（[`src/hooks/useCloudSync.ts:561`](src/hooks/useCloudSync.ts#L561)）。sync 路由注册在 [`services/jtype-web/src/lib.rs:290`](services/jtype-web/src/lib.rs#L290)，**与 DB 看板路由是分开的路由组**。

**卡片数据模型**：字段全部来自 frontmatter（`status`/`position`/`priority`/`assignee`/`due`/`tags`/`icon`）；`taskDone/taskTotal` 不是字段，而是**从正文 `- [ ]` / `- [x]` 计算**（`count_tasks`，[`services/jtype-core/src/lib.rs:1404`](services/jtype-core/src/lib.rs#L1404)），归属门控为 frontmatter `board == board_id`（`:1457`），返回结构 `BoardCardInfo`（`:1338`，`rename_all="camelCase"`）。云端 `WebBoardView.tsx` 是同一文档管线的镜像（`api.getDocument` 读 `.board` + `api.listDocuments` 扫 `.md`），**不是 DB 看板**。

**共享 UI**：两端渲染同一个 `BoardSurface`、同一个 `BoardViewCard` 模型（[`shared/lib/board.ts:31`](shared/lib/board.ts#L31)，`id` = 桌面文件路径 / web 卡片 id）。Board/Table 切换、`groupBy`（status/priority/assignee）已存在。

**实时刷新走 document 事件**：`WebBoardView.tsx:114` 订阅 socket，仅在 `event.type` 以 `document`/`sync` 开头时去抖 200ms 重拉。`kanban:*` 事件只由 `handlers/kanban/*` 产生，文件看板从不发出它们。

### 0.3 数据落点铁律（对后续 per-card 新数据的硬约束）

> 这是 §1（D1）必须遵守的核心约束，也是 §3（D2）非对称性的根源。

凡是"**必须同时出现在桌面和云端**"的 per-card 新数据，**必须放进卡片 `.md` 的 frontmatter** —— 因为只有它能搭上既有文档同步从而到达两端。落地点固定三处镜像：
1. `scan_board_cards_inner` 解析新 frontmatter key → 填入 `BoardCardInfo`（[`services/jtype-core/src/lib.rs:1468`](services/jtype-core/src/lib.rs#L1468)，结构 `:1338`）；
2. 在 `BoardViewCard` 上暴露字段（[`shared/lib/board.ts:31`](shared/lib/board.ts#L31)）；
3. 在 `shared/components/board/*` 渲染（两端自动一致）。

- 子任务一律是正文 `- [ ]` 复选框，**不**做成子文档。
- **不要**把这类数据只放进 `kanban_*` 表或新建迁移 —— 那会让桌面端完全看不到、也不同步。
- `.board` JSON 虽也按文档同步，但对管线**不透明、不解析 frontmatter**，因此 per-card 数据不应放 `.board` 里；它只承载 board 级配置（列、`doneColumn`、`groupBy`）。
- 迁移编号备注（仅当给**系统 B** 加数据时相关）：`services/jtype-web/migrations/` 从 0005 跳到 0007（无 0006），最高 0015，下一个号是 **0016**。系统 A **不需要任何迁移**。

---

## 1. D1 — 卡片依赖关系（blocker / relates）

### 1.1 背景与约束

真相源放在**卡片 Markdown frontmatter**，依赖数据随文档同步自动到达两端，无需新增同步 gate、迁移或 WS 事件。DB 看板侧只做可选「便利镜像」，永不作真相源。三条关键约束：
1. frontmatter 解析器（Rust [`lib.rs:1153`](services/jtype-core/src/lib.rs#L1153)；TS [`shared/lib/frontmatter.ts:14`](shared/lib/frontmatter.ts#L14)）只支持**扁平 `key: value` 字符串**，多值必须逗号分隔串（照搬 `tags` 的 `parse_card_tags` / `parseTagList`）。
2. `writeFrontmatter` 合并时**丢弃空值键**（[`shared/lib/frontmatter.ts:46`](shared/lib/frontmatter.ts#L46)），无依赖的卡片不携带该键。
3. 卡片**没有稳定 UUID**：`BoardViewCard.id` 桌面是文件路径、web 是 `relativePath`。跨卡引用必须用**文件名/slug**（即 `[[wikilink]]`），不能用 id。

### 1.2 数据模型与存放位置（含同步影响）

真相源：卡片 frontmatter 三个扁平字符串字段，逗号分隔的 `[[slug]]`（沿用 `copyCardLink` 的 token 约定，[`src/components/BoardView.tsx:232`](src/components/BoardView.tsx#L232)）：

```yaml
---
title: 实现登录页
board: project-x
status: doing
blocked_by: [[design-spec]], [[api-contract]]
blocks: [[release-checklist]]
relates: [[auth-research]]
---
```

- `blocked_by`：本卡被哪些卡阻塞（上游）。`blocks`：本卡阻塞哪些卡（下游，反向边）。`relates`：无方向关联。
- 解析与 `parse_card_tags`/`parseTagList` 一致（去外层 `[ ]`、按 `,` 切、`trim`），额外剥 `[[ ]]` 得 slug。空字段不写键。

**同步影响：零新增。** 依赖数据在 frontmatter 内，随文档体走三道 gate，桌面↔云端自动可见。

**归一化模型扩展（唯一共享改动点）**：`BoardViewCard`（[`shared/lib/board.ts:31`](shared/lib/board.ts#L31)）加 `blockedBy?: string[]` / `blocks?` / `relates?`（slug 列表）。「阻塞中」状态**不落盘**，渲染期推导。

- 桌面解析：`BoardCardInfo`（[`lib.rs:1338`](services/jtype-core/src/lib.rs#L1338)）加 `blocked_by: Vec<String>` 等（serde 自动转 camelCase），`scan_board_cards_inner`（`:1468`）用新增的 `parse_links`（在 `parse_card_tags` 基础上剥 `[[ ]]`）填充；`BoardView.tsx:76` 透传。
- Web 解析：`WebBoardView.tsx:81` 处新增 `parseLinks(fm.data.blocked_by)`（`parseLinks` 放 `shared/lib/board.ts`，与 `parseTagList` 并列）。

### 1.3 接口/命令

**文件型看板：无新增命令。** 复用既有写路径：
- 桌面 `actions.updateCard`（[`BoardView.tsx:160`](src/components/BoardView.tsx#L160)）新增分支：`if (patch.blockedBy !== undefined) next.blocked_by = patch.blockedBy.map(s => '[['+s+']]').join(', ')`，`blocks`/`relates` 同理；空数组→空串→被丢弃。
- Web `saveCard`（`WebBoardView.tsx:145`）已带乐观并发，序列化同上，签名不变。

**DB 看板（可选镜像，非真相源）**：不新增列，复用 `kanban_cards.properties_extra JSON`（[`migrations/0007_kanban.up.sql:65`](services/jtype-web/migrations/0007_kanban.up.sql#L65)），塞进 `UpdateKanbanCardRequest` 已有的 `properties_extra` patch（`models.rs` 该字段在 `:797`，结构 `:786-800`），遵循 `base_updated_clock`+`force` 乐观并发。**不新增路由、不新增迁移。**
> 诚实说明：DB 看板的 `properties_extra` 依赖只服务 `Kanban.tsx`，**不会到达桌面**。第一阶段只做文件型看板。

### 1.4 WebSocket 事件

**无新增。** 文件型卡片改动走 `document:changed`（[`hub.rs:8`](services/jtype-web/src/hub.rs#L8)），`WebBoardView` 已对 `document`/`sync` 前缀事件整盘 refetch、桌面对 vault 快照变化防抖重扫，A 卡改依赖会自动让对端重算徽标。DB 镜像若做则复用 `kanban:card-updated`，不新增 variant。

### 1.5 前端/视图

1. **派生 blocked flag（共享纯函数）**：放 `shared/lib/board.ts`，输入全量 `BoardViewCard[]`+`config`，输出被阻塞卡 id 集合。建 slug→card 索引；对每卡遍历 `blockedBy`，若上游卡所在列 `!== doneColumn`（[`board.ts:64`](shared/lib/board.ts#L64)）则 blocked；`blocks` 折算为反向上游。仿 `BoardSurface.tsx:561` 的 `overdue` 派生风格，但需全盘上下文，故在 adapter 层算好下传。
2. **卡面 Blocked 徽标**：`BoardSurface.tsx:647` meta chip 行追加一枚（如「🔒 被 2 项阻塞」），并补 `hasMeta`（`:562`）判定。
3. **Peek 依赖编辑器**：`BoardPeek.tsx:128` 字段网格加 Blocked by / Blocks / Relates 三行，复用 tags 的多选形态（`:183`），选项 = 同盘其它卡片标题。
4. **复用 `[[wikilink]]`** 做引用展示与「Copy link」（`BoardView.tsx:232`）。

### 1.6 校验与边界

- **token 解析与同盘作用域**：jtype-core 无现成 `[[wikilink]]` 解析器，必须与当前 board 已扫描卡片集匹配；越界 token 标灰/忽略，但保留原串不静默丢。
- **环检测在应用层**：内存构图拒绝/忽略成环边；派生层加 visited 集防死循环。
- **双向一致性**：不强制双写，以 `blocked_by` 为主、`blocks` 为便利反向；派生 helper 同时消费两者去重。
- **重命名**：引用按 slug，文件改名→旧引用变越界 token（标灰）；第一阶段不做自动改名联动。
- **空值/容错**：空字段不写键；token `trim`；slug 比对建议大小写不敏感或经 `slugify`（`board.ts:108`）。

### 1.7 分阶段

- **阶段 1（MVP，端到端）**：`BoardViewCard` 加三字段 + `parseLinks` + blocked 派生 helper；Rust `BoardCardInfo` 加三字段 + `parse_links` + 填充；桌面/Web 适配器透传+写回；`BoardSurface` Blocked 徽标。**零迁移、零新 WS、零新 gate。**
- **阶段 2（编辑体验）**：`BoardPeek` 三个依赖多选字段、环检测提示、越界标灰、`blocks` 反向边消费。
- **阶段 3（可选 DB 镜像）**：仅当 `Kanban.tsx` 也需要时，塞 `properties_extra`，明确标注 cloud-only、不下行、非真相源。

### 1.8 开放问题

- `blocks`/`blocked_by` 是否写入时自动维护反向边（双写一致性，但增加跨文件写与并发风险），还是仅 `blocked_by` 为主由派生层合并？
- 卡片重命名是否联动更新所有 `[[wikilink]]` 引用（类 Obsidian rename-link）？第一阶段建议仅标灰。
- `relates` 是否在卡面渲染徽标，还是仅 Peek 可见？
- DB 看板是否在本里程碑就需要依赖？不需要则阶段 3 整体推迟。
- slug 比对大小写敏感还是经 slugify 归一化？

---

## 2. C3 — 到期 / 日历视图

在现有「看板 / 表格」切换外新增第三种「日历 / 待办清单（Agenda）」视图，作为对已同步 markdown 卡片模型的**纯展示与分组层**。读取共享模型的 `due` 字段（[`shared/lib/board.ts:42`](shared/lib/board.ts#L42)），按日期摆进月历格子并提供按到期排序的清单。**0 新表、0 迁移、0 新 WS 事件**。

### 2.1 数据模型与存放位置（含同步影响）

不引入任何新 per-card 数据：
- **到期日 `due`**：来自 frontmatter `due:`（`YYYY-MM-DD`），**不是 DB 列**。桌面读：[`lib.rs:1479`](services/jtype-core/src/lib.rs#L1479)；Web 读：`WebBoardView.tsx:89`。随 `.md` 文档同步两端，**与 DB 版 `kanban_cards.dueAt` 无关**。
- **视图选择 `viewType:'calendar'`**：存 `.board` JSON 配置；`.board` 本身是被同步文档（桌面 `writeBoardFile`，[`BoardView.tsx:112`](src/components/BoardView.tsx#L112)；Web `saveDocument`，`WebBoardView.tsx:131`），故设置也到达两端。
  > 注意 `shared/components/board/types.ts:23` 注释写「web → localStorage」是**过时注释**，实际 Web 已改 `saveDocument` 写 `.board`，建议顺手修正。
- 子任务仍是正文 `- [ ]`，`taskDone/taskTotal` 由 `countTasks`（[`board.ts:66`](shared/lib/board.ts#L66)）计算，日历只读计数显示徽标。

**净结论**：纯前端特性，数据与设置都已通过现有文档同步覆盖两端。
> 附带收益:DB 看板 `Kanban.tsx` 也复用同一个 `BoardSurface`([`Kanban.tsx:381`](services/jtype-web/frontend/src/pages/Kanban.tsx#L381)),因此日历视图对 DB 看板**自动生效**,无需额外适配。

### 2.2 接口/命令

无需新增后端或 Tauri 命令。卡片读取复用 `scan_board_cards`（`lib.rs:1428`）/ Web `listDocuments`+`getDocument`+`parseFrontmatter`，`BoardCardInfo` 无需改动。编辑到期复用 `actions.updateCard(id,{due})`（桌面 `BoardView.tsx:168` 写 frontmatter `due`，Web 同字段）；**不走 `moveCard`**（那是改 `status` 列的）。

### 2.3 WebSocket 事件

**不新增。** `kanban:*` 属 DB 看板。Web 实时性来自既有：`WebBoardView` 收到任意 `document:*`/`sync:*` 去抖 refetch（`WebBoardView.tsx:117`），`due` 随文档同步广播 `document:*`，日历天然实时。

### 2.4 前端/视图

遵循「一份数据，多种视图」，把日历做成 `BoardSurface` 内第三分支，而非新路由。

1. **扩展 `viewType` 联合类型（三处都加 `'calendar'`）**：[`shared/lib/board.ts:16`](shared/lib/board.ts#L16)、桌面 `src/lib/types.ts:23`、Web `WebBoardView.tsx:25`。任一遗漏会报错或丢同步进来的设置。
2. **头部加第三个切换按钮**：`BoardSurface.tsx:258` 按钮组里，`onClick={() => void actions.setConfig({ viewType: "calendar" })}`，复用已导入的 `CalendarDaysIcon`（`:9`）。
3. **视图渲染分支加 `'calendar'`**：`BoardSurface.tsx:423` 改三态分支，渲染 `<BoardCalendar/>`，喂与表格/看板**完全相同的已过滤集** `vis`（`:113`）+ `selectedId`/`setSelectedId`/`today`/`doneKey`。点击卡片调同一 `setSelectedId`，复用同一个 `BoardPeek`，到期编辑用 Peek 现成 `<input type="date">`（`BoardPeek.tsx:173`）——**零新增编辑 UI**。
4. **新建 `shared/components/board/BoardCalendar.tsx`（无状态展示组件）**：照 `BoardTable.tsx` 范式（无内部取数）。月历 6×7 网格按日列卡；逾期标红逐字复用 `card.due && card.due < today && card.columnKey !== doneKey`（与 `BoardTable.tsx:55` 一致）；今天高亮；Agenda 子模式用 `sortCards(vis,"due")`（`board.ts:158`，零填充日期可词法比较），无 `due` 排末尾/「未排期」。在 `index.ts:3` 加 export。
5. **日期分桶纯函数放 `board.ts`**：仿 `effectiveColumns`/`groupValueOf` 风格，加 `groupCardsByDay` / `monthMatrix`。保持「无外部日期库」约定：展示与比较一律用 `YYYY-MM-DD` 字符串。
6. **日历 UI 状态**：子模式 month/agenda **(已定:需跨设备记住)** —— 在三处 config 类型加可选 `calendarMode?: "month" | "agenda"`（[`shared/lib/board.ts:16`](shared/lib/board.ts#L16)、桌面 `src/lib/types.ts:23`、Web `WebBoardView.tsx:25`,与 `viewType` 同样的「三处镜像」纪律）,经 `actions.setConfig({ calendarMode })` 写 `.board` 随文档同步两端;临时光标（当前年月、翻页）用本地 `useState`,不写 `.board`。
7. **i18n**：组件在 `shared/`，字符串走 `@lingui`（`<Trans>` 与 t 模板字面量），归 **shared** catalog，需 extract+compile（三 catalog 拆分）。

### 2.5 校验与边界

- 无 `due` 不进网格，清单归「未排期」（`sortCards` 的 `9999-99-99` 兜底）。
- 逾期判定必须带 `columnKey !== doneKey` 才不标红（避免误标已完成卡）。
- `due` 假定零填充 `YYYY-MM-DD`（`<input type="date">` 产出即此格式）；对手工编辑的非法值，分桶时不匹配 `^\d{4}-\d{2}-\d{2}$` 则当「未排期」，不抛错。
- 时区：`todayStr()`（`board.ts:103`）用本地时区，全程字符串比较。
- 搜索/过滤一致性：日历必须消费 `BoardSurface` 已算好的 `vis`，不自己重算。`groupBy` 对日历无意义，`viewType==="calendar"` 时建议隐藏 groupBy 选择器（`:323`，现已用 `viewType==="board"` 包裹）。

### 2.6 分阶段

- **阶段一（只读日历，最小可用）**：三处扩展 `viewType` + 切换按钮 + 第三分支 + `BoardCalendar.tsx`（月历+逾期标红+点击开 Peek）+ 分桶纯函数 + 单测 + i18n。点击即可在 Peek 改 `due`。覆盖两端，0 迁移、0 WS。
- **阶段二（Agenda + 持久化）**：month/agenda 子切换，复用 `sortCards(vis,"due")`；**(已定需持久化)** 按「三处镜像」加 `calendarMode` 持久化 `.board`,随同步两端。
- **阶段三（拖拽改期，可选）**：月历格间拖卡 → `actions.updateCard(id,{due:targetDay})`（**不是 moveCard**），写回 frontmatter 随文档同步；Web 靠现有 `document:*` 刷新。仍无新后端、无新 WS。

### 2.7 开放问题

- ~~月历/清单子模式是否跨设备记住?~~ **已定:需要,三处 config 加 `calendarMode`。**
- 拖拽改期是否纳入首批？纯前端但桌面/Web 实现成本不同。
- `calendar` 模式下 sort 下拉（`BoardSurface.tsx:337`）是否也隐藏？
- 周起始日（周一 vs 周日）是否可配置？
- 非法 `due` 归「未排期」是否符合预期，还是给可见格式警告？

---

## 3. D2 — 看板 Webhook 注册与外发

为 `services/jtype-web`（云端）新增**看板 Webhook 注册、管理与事件外发**能力。检索 `webhook/outbound/hmac` 均无现有实现，是全新能力。

### 3.1 关键前提：两套系统的非对称性（必须先讲清楚）

- **文件型看板**（用户在用）：`.board` + `.md`，作为普通文档同步，**不产生 `kanban:*` 卡片级事件**。服务器只能在 `handlers/sync.rs:148`（`DocumentChanged`，载荷为 `relative_path` + `content_hash` 等文档级字段，**无卡片语义**）与 `:190`（`DocumentTrashed`）看到**粗粒度文档级事件**。`is_board_path()`（[`util.rs:171`](services/jtype-web/src/util.rs#L171)）只能判断「这是 .board 文件」，无法解析卡片。
- **DB 型云看板**（`Kanban.tsx`）：`kanban_*` 表 + handler，富语义事件在 [`hub.rs:96`](services/jtype-web/src/hub.rs#L96)（`kanban:card-updated` 等）。

**分层结论**：只有 DB 型看板能产出「卡片创建/移动/归档」的有价值 Webhook 载荷；文件型 `.board` 看板的 Webhook 最多只能投递「文档已变更/已删除」路径级载荷（本期不做，见开放问题）。每类事件下文都显式标注适用系统。

### 3.2 数据模型与存放位置（含同步影响）

Webhook 注册信息与投递台账是**纯服务器端基础设施，只存新建 MySQL 表，绝不进 frontmatter**（webhook 是带密钥的云端 HTTP 中继，桌面无意义、有意不同步）。下一个迁移号 **0016**，配对 `0016_kanban_webhooks.up.sql`/`.down.sql`，由 `db::migrations::run_all`（[`lib.rs:83`](services/jtype-web/src/lib.rs#L83)）执行。DDL 沿用 `0007_kanban.up.sql` 约定（`CHAR(36)` PK、`workspace_id` FK ON DELETE CASCADE、`ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`、`updated_at ON UPDATE CURRENT_TIMESTAMP`）。注意 `exec_sql` 朴素分号切分器（`migrations.rs:160`：不能有行中 `--`、不感知字符串内分号）。

**表一 `kanban_webhooks`（注册表）**：`id` PK；`workspace_id` FK；`board_id` NULL（NULL=工作区内所有 DB 看板）；`name VARCHAR(160)`；`target_url VARCHAR(2048)`；`secret CHAR(64)`（见密钥抉择）；`event_types JSON`（`["kanban:card-updated",...]` 或 `["*"]`）；`custom_headers JSON NULL`；`enabled TINYINT(1) DEFAULT 1`；`created_by_user_id` FK；`last_delivery_at`/`last_status`；`created_at`/`updated_at`。索引 `(workspace_id)`、`(board_id)`、`(workspace_id, enabled)`。

**表二 `kanban_webhook_deliveries`（投递/重试台账）**：`id` PK；`webhook_id` FK CASCADE；`workspace_id`（冗余便于清理）；`event_type VARCHAR(64)`；`payload JSON`（投递时点冻结快照）；`status ENUM('pending','delivering','succeeded','failed','dead')`；`attempt_count`/`max_attempts INT DEFAULT 6`；`last_status_code`/`last_error`；`next_retry_at`（指数退避）；`created_at`/`updated_at`。索引 `(webhook_id)`、`(status, next_retry_at)`。

> **CAST 强约束**：sqlx build（`Cargo.toml:23`）不含 chrono/time，所有 SELECT 的时间列必须 `CAST(col AS CHAR)`（先例 `card.rs:83` 的 `CAST(due_at AS CHAR)`），否则 500。

**签名密钥存储抉择**：token 类约定存 sha256 哈希（`auth.rs:145`），但 Webhook 服务器**自己要用密钥对每条出站载荷做 HMAC-SHA256**，必须拿明文。
- **方案 A（推荐）明文存储**：`util::random_token()`（`util.rs:19`）生成，明文入 `secret`，创建响应**仅此一次回显**明文（之后掩码 `whsec_••••` + 轮换）。代价：DB 泄露=密钥泄露（与第三方 token 同级，GitHub/Stripe 通行做法）。
- **方案 B 可逆加密存储**：主密钥对称加密入库，签名时解密。更安全但引入密钥管理复杂度。
**已拍板:采用方案 A(明文存储)。** `secret` 为明文 `CHAR(64)`,创建时一次性回显明文,之后只显示掩码 `whsec_••••` + 支持轮换。`hmac` crate **当前不是依赖**,需在 `Cargo.toml` 新增（`sha2 0.10`、`reqwest 0.12` 已就绪）。

### 3.3 接口/命令

在 [`lib.rs:318-382`](services/jtype-web/src/lib.rs#L318) 的 kanban 路由块追加（前缀 `/api/v1/workspaces/:workspace_id/kanban/webhooks`，指向 `handlers::kanban::webhook::*`），并在 `handlers/kanban/mod.rs:11` 加 `pub mod webhook;`：`GET`(list)、`POST`(create)、`GET/:id`、`PATCH/:id`、`DELETE/:id`、`POST/:id/test`、`POST/:id/rotate-secret`、`GET/:id/deliveries`。

**鉴权**：`extract_user` + `require_workspace_role(...,&["owner","admin"])`（比 editor 级卡片写入更严，对齐 `card.rs:54` 用法；不用全局 `require_admin`）。

**模型结构体**（新增于 `db/models.rs` ~680-903 kanban 区块旁，沿用风格）：`CreateKanbanWebhookRequest`（`name/targetUrl/boardId?/eventTypes/customHeaders?`，`rename_all="camelCase"`）；`UpdateKanbanWebhookRequest`（可清空字段用 `double_option`，对齐 `models.rs:788`）；`KanbanWebhook`（响应**不含明文密钥**，只 `secretMasked`+`lastDeliveryAt/lastStatus`，时间 CAST）；`KanbanWebhookCreated`（仅 POST 返回一次性明文 `secret`）；`WebhookDelivery`（`status/attemptCount/lastStatusCode/lastError/nextRetryAt`，时间 CAST）。

### 3.4 出站投递机制（核心）

**触发：在现有 `publish_to_workspace` 调用站点旁挂接「入队」。** `handlers/kanban/card.rs` 已在 **六** 个站点广播 `kanban:*`，正是入队点（核验后的精确行号）：
- `:257` create / `:510` patch / **`:704` move**（route `POST /kanban/boards/:board_id/cards/move`，`lib.rs:357`，**「卡片移到另一列」是最有价值的 webhook 触发**，核验时发现原设计漏列已补回）/ `:840` archive / `:999` restore / `:1066` delete。

入队逻辑：查 `kanban_webhooks WHERE workspace_id=? AND enabled=1 AND (board_id IS NULL OR board_id=?)` 且 `event_types` 命中（或 `["*"]`）→ 向 `kanban_webhook_deliveries` 插 `status='pending'` 行（载荷即时冻结）。
> 投递是服务器→外部 HTTP，不是 WS，**不新增 `kanban:webhook-*` WS 变体**，直接复用 `hub.rs` 既有 `kanban:*` 作触发源。

**投递 worker**：新建 `services/jtype-web/src/tasks/webhook_delivery.rs`，严格复制 `tasks/cleanup_trash.rs` 形状（`spawn(pool)` + `tokio::time::interval` + `Arc<AtomicBool>` 防重入，`cleanup_trash.rs:19`），逻辑放 `run_once(pool)`；在 `tasks/mod.rs:9` 加 `pub mod webhook_delivery;`，`lib.rs:97`（`cleanup_trash::spawn` 旁）spawn。每 tick：
1. `SELECT ... WHERE status IN ('pending','failed') AND (next_retry_at IS NULL OR next_retry_at<=NOW()) ORDER BY created_at LIMIT N`（时间列 CAST）。
2. `reqwest::Client`（先例 `admin.rs:383` 的 `builder().user_agent("jtype-web").timeout(10s)`）POST 载荷。
3. `X-JType-Signature: sha256=<hex>`：webhook 密钥为 key 对**原始请求体字节** HMAC-SHA256。
4. 更新 `status/attempt_count/last_status_code/last_error/next_retry_at`；失败指数退避（`min(2^attempt*30s, 上限)`）；超 `max_attempts` 置 `dead`。
5. 刷新 `kanban_webhooks.last_delivery_at/last_status`。

**出站头**：`Content-Type: application/json`、`X-JType-Event`、`X-JType-Delivery`、`X-JType-Signature`，外加注册的 `custom_headers`。**台账清理**：可在 worker 内顺带 `DELETE WHERE status IN ('succeeded','dead') AND created_at < NOW()-INTERVAL 30 DAY`，无需新表。

### 3.5 WebSocket 事件

**不为投递动作发明新 WS 事件**（投递是服务器→外部 HTTP）。可选：若管理 UI 需实时反映投递失败/自动停用，再加 `kanban:webhook-delivery` 变体（携 `workspace_id`/`webhook_id`/`status`/`source_session_id`，对齐 hub.rs 既有 kanban 字段约定）。本期建议**先不加**,UI 轮询 `/deliveries` 即可。

### 3.6 前端/视图

管理面板挂在 DB 看板宿主页 `Kanban.tsx` 旁（同一套 DB 看板才是这些 Webhook 的观测对象），作为「看板设置→Webhook」标签：列表、新建表单（URL、事件多选、看板范围、自定义 header）、密钥一次性回显+复制、测试/轮换按钮、投递历史抽屉。**不在文件型看板 UI 暴露**（`WebBoardView.tsx` / `shared/components/board/*` 那套不产生卡片级事件，混放会误导）。

### 3.7 校验与边界

- `target_url`：生产强制 `https://`；拒绝内网/回环以防 SSRF（拒 `localhost`、`127/8`、`10/8`、`172.16/12`、`192.168/16`、`169.254/16`、IPv6 ULA/回环），仿 `mod.rs:120` 的 `validate_uuid` 风格实现。
- `event_types`：每项必须是 `hub.rs` 已知 `kanban:*` 字面量或 `"*"`；空数组拒绝。
- `board_id` 非空时必须属于该 workspace（对齐 `card.rs:65` 归属校验）。
- 每工作区 Webhook 上限（如 ≤20）；`name`≤160、`url`≤2048、header 长度/条数上限。
- 重试上限 `max_attempts`（默认 6）超限置 `dead` + `last_status='failed'`；可选「连续 N 次 dead 自动 `enabled=0`」。
- 幂等：`X-JType-Delivery` 供接收方去重；同事件对同 webhook 只入队一条。
- 删 Webhook 时 deliveries 经 FK cascade 一并删除。

### 3.8 分阶段

- **阶段 1（注册+CRUD）**：迁移 `0016_kanban_webhooks`（两表）、模型、`handlers::kanban::webhook` CRUD+鉴权+URL/事件/范围校验、路由、`Kanban.tsx` 管理面板（含密钥一次性回显）。**不外发**,仅落库。
- **阶段 2（外发+重试）**：加 `hmac` 依赖；`webhook_delivery.rs` worker（spawn+退避+HMAC）；在 card.rs **六个** publish 站点旁挂接入队；`/deliveries` 接口+UI 抽屉；`/test` 端点。
- **阶段 3（增强，可选）**：自动停用、台账清理 cron、可选 `kanban:webhook-delivery` WS、扩展 board/column/label 事件类型。
- **阶段 4（远期，单独立项）**：文件型 `.board` 看板 Webhook（在 `sync.rs` 的 `DocumentChanged`/`DocumentTrashed` 站点入队，仅路径级载荷），或服务器解析 `.board`/`.md` 还原卡片语义。

### 3.9 开放问题

- ~~密钥存储:方案 A 明文 还是 方案 B 可逆加密?~~ **已定:方案 A 明文(`secret` 明文列,创建时一次性回显)。**
- 文件型 `.board` 看板是否需要 Webhook？目前只能投递路径级载荷（无卡片语义），是否值得让服务器解析内容还原语义,还是本期明确只支持 DB 型看板?
- SSRF：是否在投递时（非仅注册时）对解析 IP 二次校验以防 DNS rebinding？是否允许纯 http 内网目标?
- 投递并发：单 worker 串行是否够,还是需限速/并发池/熔断?
- 事件覆盖:阶段 1/2 仅覆盖 card.rs 六个卡片事件,是否同时支持 board/column/label 事件（hub.rs 已有变体,入队侧补挂站点即可）?
