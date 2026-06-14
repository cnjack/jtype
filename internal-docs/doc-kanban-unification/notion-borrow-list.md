# Notion 看板操作借鉴清单

> 调研对象：Notion「Projects」库（Board / Table / Gantt 三视图）
> 调研方式：真实浏览器逐操作实操（卡片/列/工具栏菜单）+ Notion 官方文档系统梳理
> jtype 对照：当前 board 子系统逐文件 have / partial / missing 映射
> 目标：回答「我们有哪些可以借鉴的方案」，给出**按优先级排序**的可落地清单
> 配套文档：[notion-competitive-analysis.md](./notion-competitive-analysis.md)、[design.md](./design.md)

---

## 实现进度（持续更新）

- **批次一（P0 #1–#8）✅ 已实现并验收**：卡片 hover ••• 菜单、列折叠、列拖拽排序、列改色+彩色列、新建卡自动开 peek、可配置完成列、卡面任务进度 chip、卡面标签 chips（后端 `BoardCardInfo` 增 `tags/taskDone/taskTotal`，含单测）。
- **批次二核心（P1 #9–#12）✅ 已实现并验收**：Group by（状态/优先级/负责人）、Filter（优先级/负责人/标签）、列内 Sort（手动/截止/优先级/标题）、看板内 Search。
- **批次二增益（#13–#15）✅ 已实现并验收**：卡面正文预览（后端 `excerpt`）、卡片 icon（frontmatter `icon`）、列 WIP 限制（`BoardColumn.limit`，超限标红）。
- **批次三（#17）✅ 已实现并验收**：Board / Table 视图切换（`viewType` 持久化），Table 视图复用同一组卡片 + filter/sort/search，行点击开 peek。
- **#16 卡片模板 ✅ 已实现并验收**：`<boardDir>/.templates/*.md` 为模板；新建卡菜单「空白 / 模板」，从模板预填 frontmatter+正文；卡片菜单「存为模板」。后端 `scan_card_templates` 含单测。
- **P2（#18 起：Calendar/Timeline、泳道、多选、评论、聚合、封面）**：按本文 §4/§3-P2 的判断，**后置 / 部分不建议**，暂未实现。

> 至此本文 P0+P1（#1–#17）全部落地；P2 为文档明确「后置/不建议」项。验收统一方式：`tsc` + `cargo test` + `pnpm build` + i18n 抽取/翻译/编译 + 浏览器 harness 实操截图。

---

## 0. 一句话结论

**借鉴 Notion 的「交互范式」，不照搬它的「数据架构」。**

- Notion 的护城河是**云端 block 数据库**：relations / rollups / formulas / automations —— 这些必须有数据库引擎和服务端才成立。
- jtype 的护城河是**本地纯 Markdown vault**：`card = .md`、`board = view`，可移植、可 grep、Obsidian/Dataview 式。
- 因此判断每一项「该不该借」的标准只有一条：
  - ✅ **凡是能在 `.md` frontmatter / 正文里天然表达的** → 借鉴价值高，且改动小（多数落在现有文件里）。
  - ⚠️ **凡是必须引入数据库引擎 / 服务端的** → 弱 fit，长期再说或干脆不做（见 §4）。

---

## 1. 调研所得：Notion 看板的完整操作面

实操 + 文档交叉验证，Notion 看板的操作可归为六类：

| 类别 | 关键操作 |
|---|---|
| **卡片操作** | 侧边/居中/整页打开；卡面内联改属性；列内拖拽排序；跨列拖拽改分组值；改标题；复制卡片；复制链接；移动到；加收藏；设图标/封面；子任务；评论；编辑正文；套模板 |
| **列操作** | 新增列（给分组属性加选项）；重命名；改色；隐藏/显示；拖拽排序；列内排序；**列顶聚合计算**（Count/Sum/Avg/最早最晚日期…）；折叠/展开 |
| **看板配置** | Group by（按任意属性分组）；Sub-group（二级分组=网格）；Filter（嵌套 AND/OR 至 3 层）；Sort（多级）；Search；卡片尺寸 S/M/L；**卡片预览**（封面/正文/图片属性）；彩色列开关；属性可见性（眼睛图标 + 拖拽排序）；打开方式（侧栏/居中/整页） |
| **卡片内容** | 属性值；整页 block 正文；子任务；依赖（blocking/blocked-by）；评论；附件；模板 |
| **强能力** | Relations / Rollups / Formulas / 数据库模板 / Automations / Buttons / Linked database / 子任务+依赖（自动顺延日期）/ @提及 / 自增 ID |
| **视图类型** | Table / Board / Timeline / Calendar / List / Gallery / Chart / Form / Dashboard |

**实操中最值得记下的两个细节：**
1. **卡片 hover** 直接露出「编辑铅笔」+「•••」，「•••」菜单含 Open in（侧栏/居中/整页/新标签）、Copy link、Duplicate（⌘D）、Move to、Move to Trash —— 全程不用打开卡片。
2. **列顶「+」** 在列**顶部**就地建卡，且内联给出 `Add Assignee` / `Add Priority` 快捷填属性；列「•••」菜单 = Edit groups / Hide aggregation / Hide group / Move to Trash。

---

## 2. jtype 现状（逐文件映射）

完整 have / partial / missing 见下方借鉴表的「现状」列。一句话概括：

- **已具备**：卡片内联建卡、侧边 peek 编辑（标题/状态/优先级/负责人/截止/正文，350ms 防抖自动存）、拖拽移动+重排（带落点指示线 + position 重排）、列增删改、刷新、逾期标红、文档内只读 board 嵌入、wikilink、卡片计数。
- **半成品**：`groupBy` 字段已埋点但**从未被读取**（分组硬编码 `status`）；`BoardColumn.color` 有数据有渲染但**无设置 UI**；逾期判定硬编码列 key `'done'`；卡片属性固定六项。
- **缺失**：见 §3 的 P1/P2。

关键文件：[BoardView.tsx](../../src/components/BoardView.tsx)、[CardPeek.tsx](../../src/components/CardPeek.tsx)、[CardPropertyStrip.tsx](../../src/components/editor/CardPropertyStrip.tsx)、[types.ts](../../src/lib/types.ts)、[workspace.rs](../../src-tauri/src/workspace.rs)、[EditorShell.tsx](../../src/components/editor/EditorShell.tsx)。

---

## 3. 借鉴清单（按优先级）

成本标度：🟢 低（半天~1天）/ 🟡 中（2~4天）/ 🔴 大（1周+）。

### P0 — 抹平「手感差距」：低成本、高频、全部落在现有文件里

| # | Notion 操作 | jtype 现状 | 建议方案 | 成本 | 落点 |
|---|---|---|---|---|---|
| 1 | 卡片 hover 出「•••」快捷菜单 | 仅 peek 内有删除/打开整页 | 卡面 hover 露出「•••」→ 打开 peek / 在完整编辑器打开 / **复制为 `[[wikilink]]`** / **复制卡片** / 删除 | 🟢 | BoardView 卡片渲染 |
| 2 | 列折叠/展开 | 缺失（列恒为展开） | 列头点击折叠成竖条 + 保留计数；状态可存 `.board` | 🟢 | BoardView 列渲染 |
| 3 | 拖拽给列排序 | 缺失（仅增删改，顺序锁定于 config 数组） | 列头 draggable，落定后写回 `config.columns` 顺序 + `saveConfig` | 🟡 | BoardView + saveConfig |
| 4 | 列改色 / 彩色列 | **partial**：`BoardColumn.color` 有数据有渲染，无 UI | 列「•••」菜单加取色器；顶栏「彩色列」开关 | 🟢 | BoardView（addColumn/renameColumn 从不设 color） |
| 5 | 新建卡内联填属性 | 仅标题（composer 是纯 textarea） | 建卡后自动开 peek（或 composer 内联快捷设优先级/截止），对齐 Notion「+」体验 | 🟢 | BoardView composer + createCardWithTitle |
| 6 | 终态列可配置 | **partial**：逾期判定硬编码列 key `'done'` | `.board` 标记某列为 done/terminal；逾期抑制 + 计算引用它 | 🟢 | BoardView（逾期判定）+ types |
| 7 | 卡面任务进度 | 缺失（正文 `- [ ]` 已存在但卡面不显示） | 卡面渲染 `x/y` 勾选进度 chip（统计正文 checkbox）—— **纯 markdown 天然 fit** | 🟢🟡 | BoardView 卡片渲染 |
| 8 | 卡面标签 chips | 缺失（`tags:` 是 vault 既有约定） | 读 frontmatter `tags:` 渲染 tag chips（颜色可派生） | 🟢 | BoardView 卡片渲染 + BoardCard |

### P1 — 把「board 是一种 view」做实 + Markdown 原生增益

| # | Notion 操作 | jtype 现状 | 建议方案 | 成本 | 落点 |
|---|---|---|---|---|---|
| 9 | **Group by 任意属性** | **partial**：`groupBy` 字段已埋点但永不读取，硬编码 `status` | 顶栏 Group by 选择器（status/priority/assignee/tag/任意 frontmatter）。**基础解锁项**，呼应已有埋点 | 🟡 | BoardView 分组逻辑 + scan_board_cards |
| 10 | Filter（筛选） | 缺失 | 按 priority/assignee/due/tag/status 过滤；Dataview 式表达，对 jtype 是天然 fit | 🟡 | BoardView 状态 + 顶栏 |
| 11 | 列内 Sort | 缺失（只按 position） | 列内可选按 due/priority/title 排序（保留手动 position 为默认） | 🟡 | BoardView 排序 |
| 12 | 看板内 Search | 缺失 | 顶栏搜索框，标题/正文即时过滤 | 🟢 | BoardView 顶栏 |
| 13 | 卡片正文预览 | 缺失 | 卡面显示正文首行/摘要（Notion 的 Card preview = Page content） | 🟢 | BoardView 卡片渲染 |
| 14 | 卡片图标/emoji | 缺失 | frontmatter `icon:` emoji 渲染在卡面 + peek | 🟢 | BoardView + CardPeek |
| 15 | **WIP 限制** | 缺失（Notion 自己也没有 → 可反超） | `BoardColumn.limit`，超限列头高亮。看板原生需求，**差异化亮点** | 🟢 | types + BoardView 列头 |
| 16 | 卡片模板 | 缺失（vault 已有「模板」概念） | 新建卡可选模板，预填 frontmatter + 正文 | 🟡 | BoardView createCard + 模板源 |
| 17 | **表格视图（Table）** | 缺失（board 是唯一渲染器） | `.board` 加 `views[]`，先做 Table 视图（一份卡片数据，两种视图）。Notion 核心「一数据多视图」的第一步 | 🔴 | types（BoardConfig.views）+ 新 TableView 组件 |

### P2 — 高价值但重 / 后置

| # | 操作 | 判断 |
|---|---|---|
| 18 | Calendar / Timeline(Gantt) 视图 | 高价值，依赖多视图框架（#17）落地后再做 |
| 19 | Sub-group / 泳道 | 中大，二级分组；多视图之后 |
| 20 | 多选 / 批量操作 | 中等；体验增益，非阻塞 |
| 21 | 卡片评论 / 活动日志 | 单人本地 vault 弱 fit，后置 |
| 22 | 列顶聚合（Sum/Avg/日期范围…） | jtype 已有计数；进阶聚合按需再加 |
| 23 | 卡片封面图 | 资源体系（见 resources/prd.md）成熟后再接 |

---

## 4. 明确「不借鉴」清单 —— 守住 jtype 的边界

这些是 Notion 的强项，但**与本地纯 Markdown 模型弱 fit / 必须引入数据库引擎或服务端**，建议**不做**或用 jtype 既有机制替代：

| Notion 能力 | 为什么不借 | jtype 的替代 |
|---|---|---|
| Relations / Rollups | 需要数据库引擎与跨表关系；frontmatter 是扁平字符串 | `[[wikilink]]` 提供 relations-lite，已够 |
| Formulas | 需要表达式求值引擎，偏离纯文本 | 不做；必要时 Dataview 式查询 |
| Automations / Buttons / Webhook / 发邮件 | 服务端能力，违背 local-first | 不做 |
| Linked database / 子数据库 | 与「单个 `.board` 文件」模型冲突 | 多视图（#17）已覆盖「一数据多视图」诉求 |
| Form 视图 | 采集场景弱 fit | 跳过 |
| 子任务 + 依赖自动顺延日期 | 调度引擎较重 | 先用正文 checklist（#7）覆盖子任务诉求 |

---

## 5. 推荐路线（三批）

- **批次一（P0，#1–#8）**：纯「手感」对齐 + Markdown 原生增益，全部低成本、小改、落在现有文件。做完即可让 board 的日常操作体验接近 Notion。
- **批次二（P1 核心，#9–#12）**：`Group by + Filter + Sort + Search` —— 真正把「board 只是一种 view」做实（直接兑现 `BoardConfig.groupBy` 早已埋下的伏笔）。再叠加 #13–#16 的 markdown 原生增益与 WIP 反超点。
- **批次三（#17 起）**：Table 视图，完成从「一个看板」到「一份数据多视图」的关键一跃；之后才谈 Calendar/Timeline。

> 说明：本文档仅做调研与方案排序，未改动任何代码。需要的话我可以按批次一逐项进入设计 + 实现。
