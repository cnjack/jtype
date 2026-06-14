# JType 文档与看板统一改造指南（Notion 竞品分析）

状态：提案
初始日期：2026-06-13
更新日期：2026-06-13

> 背景：用户反馈「我们的文档和看板（Kanban）给人太不统一」。本文档基于对 **Notion 的实地体验**（在真实账号 `nightc` 中创建 Projects 看板数据库、打开卡片、在文档里输入 `/board`）与 **Notion 官方文档/API** 的考证，对照 JType 现状（代码层面），给出一份**分阶段的统一改造指南**。
>
> 一句话结论：Notion 的「不割裂」来自一个根本设计——**只有一种原语：页面（page）=一叠块（block）。数据库只是「页面的集合」，看板只是数据库的一个视图，卡片就是一个页面。** JType 当下是**两套并行全栈**（Markdown 文档 vs 看板），这正是割裂感的来源。本指南建议把看板纳入「页面/资源」统一面，并据 JType 的本地优先 Markdown 现实（更接近 Obsidian 而非 Notion）给出可落地的渐进路径。

## 1. 竞品分析：Notion 如何统一文档与看板

### 1.1 核心模型（一句话）

**一切皆页面、皆块。** 数据库不是与文档并列的另一种东西，而是「页面的集合」；看板（Board）只是数据库的一个**视图**；一张卡片**就是一个页面/文档**。

- 「Every page is a stack of blocks」「Any block can be turned into any other block」（notion.com/help/what-is-a-block）
- 「Databases in Notion are collections of pages」「Every item you enter into your database is a Notion page. Open a database item to add more information... as you would with any other Notion page」（notion.com/help/intro-to-databases）
- API 直述「行就是页面」：若一个 page 的 parent 是 database/data source，其属性遵循该库的 schema；否则它「only property value is the title」（developers.notion.com/reference/page）

### 1.2 实地观察（在你的 Notion 账号中逐一验证）

| # | 观察到的机制 | 证据（实地操作） |
|---|------------|----------------|
| 1 | **一棵树**：看板数据库与文档在同一侧边栏 | 新建的 `Projects` 看板出现在左栏 *Private* 下，与文档页 `Github MFA` **并排**；没有单独的「Kanban」入口 |
| 2 | **一个新建入口**：文档与数据库同源创建 | 「Add new」弹窗同时给出 *Empty page*（文档）/ *Empty database* / 模板（*Projects* 看板、*Tasks Tracker*…） |
| 3 | **看板=数据库的一个视图** | `Projects` 顶部有 *By Status*（看板）/ *All Projects*（表格）/ *Gantt*（时间线）三个标签，**同一份数据**换个视图 |
| 4 | **卡片=文档**：卡片打开是一整页 | 点开卡片 *Quarterly sales planning* → 顶部属性（Status/Assignee/Priority/End date）+ 下方富文本正文（`About project` 段落、`Action items` 勾选框、`Documents` 嵌入块），**与架构文档同一个打开界面** |
| 5 | **看板能内联进文档** | 在文档正文里输入 `/board` → 菜单出现「Board view · Database」，可把看板作为**块**插入任意文档 |

### 1.3 官方模型佐证（统一机制清单）

1. **行即页面**：卡片、表格行、独立文档是**同一原语**（page 对象）。打开卡片＝打开一篇可写正文的文档。
2. **一切皆块**：`child_page`、`child_database` 本身是块类型，所以数据库能作为一个块嵌在页面里（内联数据库）。
3. **内联 vs 整页数据库**：整页库「appear just like any other page in your sidebar」，内联库嵌在页面中（API：`is_inline`），二者可互转。
4. **多视图**：「add as many views as you like... each displaying the same data differently」——表格/看板/时间线/日历/画廊/列表/图表。看板只是其中一个视图，不是独立数据存储。
5. **看板=按属性分组**：「Board view groups your database pages by a specific property」（状态/负责人/优先级），拖动卡片即改该属性值。
6. **侧边栏统一树**：页面与数据库都以 parent 挂在页面/teamspace 下，构成**一棵**层级树，而非两棵平行树。
7. **互链与关系**：任意页面（含库行）可被 `@mention`/内联链接，relation 属性跨库连接行——卡片与文档是同一种可寻址对象。

> 注：Notion 是**云端块数据库**。JType 是**本地优先 Markdown 库**，不能也不应照搬其后端模型（见 §4.1）。但「卡片即文档、看板即视图、同一棵树、可互链/内联」这几条**体验层原则**完全可以本地化实现——这正是 Obsidian（Kanban 插件把看板存成 Markdown、Dataview 把笔记按属性聚合成看板/表格）走的路。JType 的真实参照系是 Obsidian，落地手段是 Notion 的原则 + Markdown/frontmatter 的载体。

## 2. JType 现状：为什么割裂（代码实证）

JType 的文档与看板是**两套互不相干的并行全栈**。下表逐维度对照：

| 维度 | Markdown 文档 | 看板（Kanban） |
|------|--------------|---------------|
| 云端存储 | `documents` 表（`content mediumtext`） | **另起** 6 张 `kanban_*` 表；卡片是 `kanban_cards` 行的 `description MEDIUMTEXT` 字段 |
| 本地存储 | vault 里真实的 `.md` 文件 | 隐藏的 `.jtype/kanban.json`（app 状态，不是用户文件） |
| 文件树 | `EntryKind::Markdown` 节点 | **不在树里**（`EntryKind` 只有 `Folder\|Markdown\|Asset`，无 kanban） |
| 打开界面 | 内嵌 `EditorShell`（同一内容面） | 桌面：**全屏模态** `fixed inset-0 z-40`；Web：**独立路由** `/workspaces/:id/kanban` |
| 导航入口 | 点文件树节点 | 桌面专属「Kanban」按钮；Web 独立 URL（`Layout` 里**没有**指向 `/kanban` 的链接） |
| 卡片身份 | 文档/页面 | **不是文档**：无 `relative_path`、无正文 body、无版本、不可在编辑器打开 |
| 互链/嵌入 | `.md`/asset 相对路径 | **无**：文档无法链接/嵌入看板，卡片无法引用文档 |
| 搜索 | 只搜 `markdown` 节点 | 看板**完全不被搜索**，自身也无搜索 |
| 回收站 | `document_trash` + `.jtype/trash` | **另一套** `kanban_card_trash`（独立 30 天 cron） |
| 同步 | `/sync/push\|pull` 三方文本合并 | **另一套** pending-ops + 整板 LWW |
| 后端路由 | `handlers::document` `/documents*` | `handlers::kanban` `/kanban/*` |
| 类型命名空间 | `FileTreeNode`/`CloudDocument` | `LocalKanban*`/`PendingKanbanOp`，无共享基类型 |

**最伤体验的三点**：

1. **卡片不是文档**（`kanban_cards.description` 是纯文本，不能当成 `.md` 页面打开、写正文、被链接）。
2. **看板不在文件树**，且桌面以**全屏模态**打开——视觉上「整个 app 被换掉了」，最直接造成「两个 app」的割裂感。
3. **文档与看板之间零引用**（不能互链、不能内联嵌入、不能一起搜索）。

### 2.1 与现有 Resource PRD 的关系（重要）

`internal-docs/resources/prd.md`（设计中）已经识别了这个割裂，并提出「资源（Resource）」统一抽象，把内容分三层：T1 文本文档（Markdown）、T2 二进制资产（图片/PDF）、T3 结构化应用（**看板**）。

但该 PRD 在 §3.3 / §4.1 / §5.7 / §10 明确做了一个决定：

> **「T3 是『应用型』资源，是 `.jtype/` 下的隐藏 app 状态，*不是用户文件*」「T3 维持看板既有模式」，统一只发生在「接缝层」（类型注册表 + 打开/渲染分发 + 引用解析），不把看板折叠进「页面/文档」面，本 PRD 增量内不动 T3。**

**这个决定正是用户割裂感的根源**：它把看板有意地留作平行全栈、把卡片定义为「非用户文件」。本指南的核心建议就是**修订这一方向**（见 §6）——把看板从「隐藏应用」变成「页面/资源」家族的一员。

## 3. 目标模型：卡片即文档，看板即视图（JType 本地化）

把 Notion 的体验原则映射到 JType 的本地优先 Markdown 载体：

| Notion 概念 | JType 本地化落地 |
|------------|----------------|
| 页面 page = 一叠块 | 一个 **Markdown 文件**（frontmatter 属性 + 正文 body） |
| 数据库行 row 即页面 | **卡片 = 一篇带 frontmatter 的 `.md` 笔记**（`status`/`priority`/`assignee`/`due` 写进 frontmatter，正文是任意 Markdown） |
| 看板 Board = 数据库的一个视图 | **看板 = 对一组笔记按 `status` 属性分组的视图**（视图定义本身也可存成一个 `.md`/小 json，像 Obsidian Kanban 插件） |
| 多视图（board/table/…） | 同一组笔记可切「看板 / 列表（表格）」视图 |
| 卡片打开=整页文档 | 卡片在**同一个 `EditorShell`** 打开：顶部属性条 + 下方 Markdown 正文（正是 §1.2 观察 4 的形态） |
| 内联数据库 `/board` | 在文档里用一个围栏块（如 ```` ```jtype-board <id|query> ```` ）或嵌入指令内联渲染看板 |
| `@mention`/relation | `[[wikilink]]` 双链：文档↔卡片↔看板互相引用 |

> **为何 frontmatter 驱动**：它让卡片**保持是真实的 `.md` 文件**（本地优先、可移植、可被文档同步链路覆盖、可被现有 Markdown 编辑器/搜索/回收站直接复用），同时获得 Notion 式「卡片即文档、看板即视图」的统一体验。这是「用 Notion 的原则、Markdown 的载体」。

## 4. 分阶段改造指南

按「感知收益 / 改动成本」排序，**越靠前越便宜、越早消除割裂感**。每阶段可独立交付。

### Phase 0 —「同一个 app」：把看板搬进统一面（最便宜，最大感知收益）

不改存储，只改**呈现与导航**：

- **看板进文件树**：在 `EntryKind`/资源类型里加 `board`，让看板作为节点出现在侧边栏文件树（与文档并排），而不是藏在专属按钮后面。
- **取消全屏模态，改为内容面内打开**：把 `KanbanBoard` 从 `fixed inset-0 z-40` 全屏覆盖，改成在 `workbench-body` 内容区打开（像文档一样），保留同一套 header/侧边栏 chrome。
  - 涉及：`src/app/App.tsx`（`kanbanOpen` → 改为按 `currentKind === "board"` 在 `EditorShell` 区域路由）、`src/components/KanbanBoard.tsx`（去掉 `fixed inset-0 z-40` 根、改为填充内容面）。
- **统一入口**：保留「新建资源」选择器（已实现）作为创建入口；打开则统一走「点文件树节点」。Web 端在 `Layout` 加上看板的导航链接（当前 `/kanban` 路由无任何 in-app 链接）。

> 仅 Phase 0 就能消除「整个 app 被换掉」的最强割裂感，且**不动后端**。

### Phase 1 —「卡片即文档」：核心统一

- **卡片获得 Markdown 正文 + 属性条**，在**同一个 `EditorShell`** 打开：顶部一条属性 strip（status/priority/assignee/due），下方是 Markdown 正文编辑/预览。形态对标 §1.2 观察 4 的卡片页。
- 两条落地路线（择一，建议 B 为最终态）：
  - **A（小步）**：把 `kanban_cards.description` 当作 Markdown 正文，用现有 Markdown 渲染器在卡片详情里渲染/编辑。改动小，但卡片仍不是「文件」、仍不可被文档体系链接/搜索。
  - **B（本地优先最终态，推荐）**：**卡片背后是一篇 `.md` 文件**（frontmatter 存属性、正文是 body）。卡片＝笔记＝文档，天然进文件树、进搜索、进文档同步与回收站，可被双链引用。看板侧只保留「视图/分组」状态。
- 涉及：`EditorShell`（增加属性条 + 按资源类型分发，已有 `currentKind` 分发骨架）、卡片存储模型（路线 B 需要把卡片与文档存储打通）。

### Phase 2 —「看板即视图」：深层统一（frontmatter 驱动）

- 看板不再拥有自己的卡片数据，而是**对一组笔记按 `status` 属性分组的视图**：
  - 加一张卡片 = 新建一篇带该看板标签 + `status` 的笔记；
  - 拖动卡片到另一列 = 改该笔记 frontmatter 的 `status`；
  - 这正是 Notion「board = group-by-property」、Obsidian「Dataview 聚合笔记」的做法。
- 顺带获得**多视图**：同一组笔记可切「看板 / 列表」视图（视图平价）。
- 这是最深的一步，建议在 Phase 1（卡片即文件）落地后再做。

### Phase 3 — 互链与内联嵌入

- **双链**：`[[wikilink]]`/`@` 在文档↔卡片↔看板之间互相引用；扩展现有引用解析（Resource PRD 已规划「引用解析器/接缝层」，正好承载）。
- **内联看板块**：在 Markdown 文档里用围栏块 ```` ```jtype-board <board-id 或 query> ```` 内联渲染一个看板/列表视图——对标 Notion 的 `/board`。

### Phase 4 — 统一生命周期

- **一套搜索**：把卡片/看板纳入全局搜索（当前搜索只过滤 `markdown` 节点）。
- **一套回收站**：卡片走文档回收站（路线 B 后天然合并），淘汰独立的 `kanban_card_trash` 双轨。
- **一套类型**：`FileTreeNode`/资源类型容纳 board/card，消除并行类型命名空间。

## 5. 差距对照与目标

| 维度 | Notion | JType 现状 | JType 目标（本指南） |
|------|--------|-----------|--------------------|
| 原语 | 页面=块；行即页面 | 文档 vs 看板两套 | 资源=（Markdown 文件/视图）；卡片即文档 |
| 看板定位 | 数据库的一个视图 | 独立 app 子系统 | 笔记集合的一个分组视图 |
| 卡片 | 一整页文档 | `kanban_cards.description` 文本 | 带 frontmatter 的 `.md` 笔记 |
| 打开界面 | 同一页面面 | 全屏模态/独立路由 | 同一 `EditorShell` 内容面 |
| 导航 | 同一棵侧栏树 | 专属按钮/独立 URL | 同一文件树节点 |
| 互链/嵌入 | `@mention`/内联库 | 无 | 双链 + 内联看板块 |

## 6. 对 Resource PRD 的修订建议

建议修订 `internal-docs/resources/prd.md` 的 T3 方向：

- §3.3「T3 是应用型、不是用户文件」「主线不含 T3」→ 改为：**T3 看板是「视图型资源」，其卡片是 T1 文本文档（带 frontmatter）**；看板是对文档集合的分组视图。
- §4.1「T3 维持看板模式」「不折叠进页面面」→ 改为：**卡片折叠进「文档/页面」面**（卡片即 `.md`），看板退化为视图层；保留「单一 `sync_clock` 全序」等已对的决策。
- 结论：把「接缝层统一」升级为「**原语层统一**（卡片即文档）」——这才是消除用户割裂感所必需的，也与 Notion/Obsidian 的成熟模型一致。

## 7. 非目标与风险

- **不照搬 Notion 云端块数据库**：JType 本地优先 + Markdown 可移植性是底线，卡片必须能落地为普通 `.md` 文件。
- **渐进、不重写**：Phase 0/1 可在不推翻现有 kanban 子系统的前提下交付；Phase 2 才触及数据模型迁移。
- **迁移**：现有 `kanban_cards.description` → `.md` 卡片需要一次性迁移脚本（路线 B）。
- **同步收敛**：卡片变文件后，看板的「列/分组/顺序」仍需要轻量视图状态同步（可复用单一 `sync_clock`）。

## 8. 如果只做一件事（Quick Win）

**做 Phase 0**：把看板从「专属按钮 + 全屏模态」改成「文件树里的一个节点 + 在同一内容面打开」。不动后端、改动集中在 `App.tsx`/`KanbanBoard.tsx`/侧边栏，却能立刻消除「这是另一个 app」的最强割裂感——这是性价比最高的一步。
