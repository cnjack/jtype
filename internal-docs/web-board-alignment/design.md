# Web 看板与桌面对齐成同一套体验 — 设计

> 目标:让 web 端看板(`services/jtype-web/frontend/src/pages/Kanban.tsx`,服务端 DB 看板)和桌面端看板
> (`src/components/BoardView.tsx`,本地 markdown 看板)**对齐成同一套体验**。
> 配套:[doc-kanban-unification/notion-borrow-list.md](../doc-kanban-unification/notion-borrow-list.md)(桌面端这套交互的来源)。

---

## 0. 现状(调研结论)

| 维度 | 桌面端(参考体验) | Web 端(现状) |
|---|---|---|
| 数据层 | 本地 `.md` 文件 + `.board` JSON(`tauri.*` / 文件系统) | 服务端 DB(REST + WebSocket,乐观锁 `updated_clock`) |
| 卡片字段 | frontmatter:title/status/priority/assignee(自由文本)/due/tags(自由文本)/icon + 正文 markdown | `kanban_cards`:title/columnId/priority(同枚举)/dueAt/assigneeUserId(成员)/labels(标签表,带色)/description(markdown,16MB)/**properties_extra(JSON,未用)** |
| 卡片缺字段 | — | **icon**、task-progress(都可在客户端解决,见下) |
| 列字段 | key/name/color/limit + doneColumn/colorColumns/viewType/groupBy(存 `.board`) | name/position/**color/wipLimit 已有**;无 doneColumn/视图设置存储 |
| 交互(桌面已做) | toolbar(Group/Sort/Filter/Search)、Board/Table 切换、列折叠/拖拽/改色/WIP/done、卡片 hover ••• 菜单、侧边可拖宽 peek、emoji 选择器、pointer 拖拽、卡面 task 进度/标签/excerpt、模板 | 列、卡片(modal 编辑)、HTML5 拖拽、labels、priority/due/assignee、归档/回收站、实时 |
| Web 缺的交互 | — | Group/Sort/Filter/Search、Table、侧边 peek、hover 菜单、列折叠/改色 UI、emoji、task 进度、excerpt、模板 |

**关键发现:**
1. Web 后端数据**已够用** —— priority/due/assignee/labels/column-color/wip 都在。
2. **icon** 塞进现成的 `properties_extra` JSON(列已存在)→ 只需后端 create/update 接受并回传该字段,**不改表**。
3. **task-progress** 从 `description` 的 markdown checkbox 客户端计算(和桌面同法)→ **零后端改动**。
4. **Group-by / Filter / Sort / Search / Table 视图全是客户端逻辑**(web 一次拉全量卡片)→ **零后端改动**。
5. **视图设置**(groupBy/sort/筛选/viewType/colorColumns/列折叠):桌面存 `.board`;web 无 board 配置位 → **存 localStorage(按 board 维度)**,体验一致即可。
6. Web 是浏览器(非 Tauri),HTML5/pointer 拖拽都能用;桌面的 pointer 拖拽方案在 web 同样适用且更顺手 → **共用 pointer 拖拽**。

---

## 1. 架构决策:抽共享展示层 + 各端薄适配器

为真正「同一套」(单一来源,避免两份 UI 漂移),把看板 UI 抽到 `shared/`,做成**数据无关的展示组件**,桌面/web 各写一个把自己数据层映射成「归一化模型 + actions」的薄适配器。

```
shared/lib/board.ts          归一化模型(BoardViewConfig / BoardViewCard)+ 纯函数(task 进度、排序、筛选、分组)
shared/components/board/
  BoardSurface.tsx           看板主体:toolbar + 列 + pointer 拖拽 + Board/Table + 挂 peek
  BoardPeek.tsx              侧边可拖宽 peek(emoji/状态/优先级/负责人/截止/标签/备注)
  BoardTable.tsx             表格视图
  EmojiField.tsx / Select.tsx 叶子控件(headless)
src/components/BoardView.tsx           桌面适配器:tauri/fs ↔ 归一化 + actions
services/jtype-web/frontend/src/pages/Kanban.tsx   web 适配器:REST ↔ 归一化 + actions
```

`@shared` 别名两端都已配置(桌面 `src/` 与 web frontend 都 `import ... from "@shared/..."`)。

### 1.1 归一化模型(`shared/lib/board.ts`)

```ts
type BoardViewColumn = { key: string; name: string; color?: string | null; limit?: number | null };
type BoardViewConfig = {
  title: string;
  columns: BoardViewColumn[];
  doneColumn?: string;        // 终态列 key
  colorColumns?: boolean;     // 彩色列开关(纯视图)
  viewType?: "board" | "table";
  groupBy?: "status" | "priority" | "assignee";
};
type BoardTag = { id?: string; label: string; color?: string | null };
type BoardViewCard = {
  id: string;                 // 桌面=文件路径;web=cardId
  columnKey: string;          // 桌面=status;web=columnId
  position: number;
  title: string;
  icon?: string | null;
  priority?: string | null;   // none/low/medium/high/urgent
  assignee?: string | null;   // 显示文本(web 用成员名;桌面用自由文本)
  due?: string | null;        // YYYY-MM-DD
  tags: BoardTag[];           // 桌面=自由文本{label};web=标签表{id,label,color}
  notes?: string;             // 正文/description(markdown)
  taskDone?: number; taskTotal?: number;
  excerpt?: string | null;
};
```

纯函数:`countTasks(md)`、`bodyExcerpt(md)`、`groupCards`、`sortCards`、`filterCards` —— 两端共用,消除重复(桌面后端 Rust 算 task/excerpt;web 在前端算,逻辑一致)。

### 1.2 actions 适配器(BoardSurface 的 props)

平台差异通过回调注入,展示组件不碰数据层:

```ts
type BoardActions = {
  moveCard(cardId, toColumnKey, index): Promise<void>;
  createCard(columnKey, title): Promise<void>;
  updateCard(cardId, patch: Partial<BoardViewCard>): Promise<void>;
  deleteCard(cardId): Promise<void>;
  duplicateCard?(cardId): Promise<void>;
  reorderColumns?(fromKey, toKey): Promise<void>;
  addColumn?(name): Promise<void>;
  renameColumn?(key, name): Promise<void>;
  deleteColumn?(key): Promise<void>;
  setColumnColor?(key, color): Promise<void>;
  setColumnLimit?(key, limit): Promise<void>;
  setConfig(patch: Partial<BoardViewConfig>): Promise<void>;  // 桌面写 .board;web 写 localStorage
};
```

**字段编辑的平台差异**(用可选 props 处理,而非分叉组件):
- `assigneeOptions?: {value,label}[]` —— 传了就用下拉(web 成员);否则自由文本(桌面)。
- `tagOptions?: BoardTag[]` —— 传了就用多选(web 标签表);否则逗号自由文本(桌面)。
- `onOpenFull?` —— 桌面可「在完整编辑器打开」;web 无,隐藏。

### 1.3 仅桌面/仅 web 的能力(不强行对齐)

- 桌面专属:wikilink、文档内 board 嵌入、`.templates/` 模板、「在完整编辑器打开」、「存为模板」「复制为 [[wikilink]]」。→ 这些是 markdown vault 特性,web 无对应;BoardSurface 用可选 props,web 不传即隐藏。
- web 专属:归档/回收站(桌面用 trash)、成员负责人、实时协作。→ 桌面 delete=trashEntry;web=archive。BoardSurface 暴露 `onDeleteCard`,语义各端自定。

---

## 2. 后端唯一改动:card 接受/回传 `properties_extra`(存 icon)

`kanban_cards.properties_extra JSON` 列已存在但前后端都没用。改动:
- `CreateKanbanCardRequest` / `UpdateKanbanCardRequest` 增加可选 `propertiesExtra: serde_json::Value`。
- create/patch 时持久化;`KanbanCard` 响应回传 `propertiesExtra`(前端已有 `propertiesExtra: unknown` 字段)。
- icon 约定:`properties_extra = { "icon": "🚀" }`。task 进度不存,前端从 description 算。
- 广播事件不变(icon 非关键路径,靠刷新拉取)。
- trash 快照已含 `properties_extra`,无需改。

> 不加 icon/task 专用列、不加服务端 filter/sort/group 端点 —— 视图全客户端,后端保持精简。

---

## 3. 数据映射

| 归一化 | 桌面(.md frontmatter) | web(KanbanCard) |
|---|---|---|
| id | 文件绝对路径 | `id` |
| columnKey | `status` | `columnId` |
| priority | `priority` | `priority` |
| assignee | `assignee`(自由文本) | `assigneeUserId` → 成员名(显示);编辑用成员下拉 |
| due | `due` | `dueAt`(取日期部分) |
| tags | `tags`(逗号) → `{label}[]` | `labelIds` → `{id,label,color}[]`(查 board.labels) |
| icon | `icon` | `propertiesExtra.icon` |
| notes | 正文 | `description` |
| taskDone/Total | 后端算(已有) | 前端 `countTasks(description)` |

| 归一化 config | 桌面(.board) | web |
|---|---|---|
| columns(key/name/color/limit) | `.board.columns` | `kanban_columns`(id 当 key) |
| doneColumn/colorColumns/viewType/groupBy | `.board` 字段 | localStorage `board-view:<boardId>` |

---

## 4. 实施阶段(每阶段独立可验收,桌面全程不破)

- **P0** 设计 + `shared/lib/board.ts`(本文 + 模型/纯函数)。
- **P1** `shared/components/board/*`(从桌面组件抽取,数据无关)。
- **P2** 桌面 BoardView 改薄适配器 → 用 shared;浏览器 harness 验收**行为不变**。
- **P3** 后端 `properties_extra`(icon)。
- **P4** web Kanban 改适配器 → 用 shared;浏览器验收 web 看板≈桌面。
- **P5** 两端 tsc/build + cargo + i18n + 浏览器端到端;docker rebuild 说明。

## 4.1 实现状态 ✅ 全部完成

- **P0–P5 已实现并验收**。两端现在共用 `shared/components/board/*`(BoardSurface / BoardPeek / BoardTable / controls)+ `shared/lib/board.ts`,单一来源。
- 桌面 `src/components/BoardView.tsx`、web `services/jtype-web/frontend/src/pages/Kanban.tsx` 均为薄适配器(各接自己的数据层)。
- 后端仅一处改动:`kanban_cards.properties_extra` 在 create/patch 中接受/回传(icon 存于此)。
- 验收:desktop tsc + web tsc + 两端 vite build + `cargo check`(web 后端) + i18n(shared zh 全译) + 浏览器 harness(桌面=迁移后行为不变截图/拖拽;web=shared 在 web 构建上下文渲染 + web 专属 peek 选项:成员负责人下拉 + 带色标签多选)。
- **docker**:web 前端打进镜像 + 后端有改动,运行中容器需 `docker compose build jtype-web && docker compose up -d jtype-web` 才能看到。

## 4.2 同一份数据(web 直接读 .board) ✅ 已实现

用户选择「同一份数据」后追加实现:web 打开同步上来的 `.board` 文件,直接渲染成同一个看板(读 `.board` JSON 配置 + 扫该看板文件夹下 `board:<id>` 的卡片 `.md` + 读写走文档 API)。桌面/web 是**同一批 markdown 文件**。

- **B(同步 `.board`)**:`collect_sync_documents` 增 `collect_board_files`(`.board` 作为不可发布的 opaque 文档,`status=draft`,含单测);服务端 `normalize_relative_markdown_path` / `is_board_path` 放行 `.board` 路径(不追加 `.md`、不解析 frontmatter)。
- **C(web 视图)**:新增 [WebBoardView.tsx](../../services/jtype-web/frontend/src/pages/WebBoardView.tsx) —— 文档层适配器接 `BoardSurface`;[Workspace.tsx](../../services/jtype-web/frontend/src/pages/Workspace.tsx) 打开 `.board` 时渲染它。
- 验收:desktop/web tsc + 两端 build + cargo(desktop 21 测试含新 `.board` 同步测试 + web check) + 浏览器 harness(内存文档库:web 读 `.board`+扫卡片 markdown 渲染;拖拽移动把卡片 markdown 写回 + 重扫反映)。
- **生效前提(两步,不只是 docker)**:① `docker compose build jtype-web && docker compose up -d jtype-web`;② **重启桌面 app 并同步一次**(桌面现在才会把 `.board` 推上云;之前从没上传)。之后 web 文件树里出现 `.board`,点开即同一个看板,双向同步。

> 说明:这与 §4.1 的「云端 DB 看板页」(`/workspaces/<id>/kanban`)是两条独立路径 —— DB 看板是 web 自建数据;`.board` 文档视图是桌面同款数据。

## 5. 验收标准

- 桌面看板:迁移后所有现有交互(Group/Sort/Filter/Search/Table/列操作/卡片操作/pointer 拖拽/peek/模板)行为与迁移前一致(harness 截图比对)。
- web 看板:具备 Group/Sort/Filter/Search、Board/Table 切换、侧边可拖宽 peek、emoji、卡面 task 进度/标签/优先级/负责人/截止、列折叠/改色/WIP、pointer 拖拽 —— 视觉与交互与桌面一致;数据走 REST,实时刷新保留,乐观锁保留。
- 两端共用 `shared/components/board/*` 单一来源。
