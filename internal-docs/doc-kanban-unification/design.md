# JType 文档/看板统一 — 技术设计与验收标准

状态：已实现（桌面本地优先；云端/Web 看板暂缓）
初始日期：2026-06-13
更新日期：2026-06-13

> 落地 [notion-competitive-analysis.md](notion-competitive-analysis.md) 的统一方案。**功能未上线，本地数据可随意重写，不做向后兼容**。本设计以**桌面本地优先（Markdown 文件）**为主线；旧的 `kanban_local.rs` / 全屏看板模态 / 云端 `kanban_*` 子系统在本轮**退役或暂不接线**（云端/Web 看板列为后续）。

## 1. 核心模型

**卡片即文档，看板即视图。** 全部落在 Markdown 文件上：

### 1.1 卡片（Card）= 一篇 `.md` 笔记
- 普通 Markdown 文件，frontmatter 携带看板属性（全部为扁平 `key: value` 字符串，契合现有 `parseFrontmatter`）：

```
---
board: roadmap          # 所属看板 id（无此字段则只是普通文档）
status: doing           # 所在列（列 key）
position: 1             # 列内顺序
priority: high          # 可选
assignee: jack          # 可选
due: 2026-07-01         # 可选
---
# 标题（或来自 frontmatter title / 文件名）
任意 Markdown 正文……
```

- 卡片**就是文档**：进文件树、进搜索、进回收站、可被 `[[双链]]` 引用、在同一个 `EditorShell` 打开——全部复用现有 Markdown 基础设施。

### 1.2 看板（Board）= 一个 `.board` 视图文件
- 新扩展名 `.board`，新 `EntryKind::Board`，内容是 **JSON 配置**（列是数组，不能用扁平 frontmatter）：

```json
{
  "id": "roadmap",
  "title": "Roadmap",
  "groupBy": "status",
  "columns": [
    { "key": "todo",  "name": "To do" },
    { "key": "doing", "name": "Doing" },
    { "key": "done",  "name": "Done" }
  ]
}
```

- 看板是**视图**：它的卡片 = vault 内所有 frontmatter `board == id` 的 `.md` 笔记，按 `status` 分到各列、按 `position` 排序。
- 看板在文件树里是一个 `board` 资源节点（看板图标），点击在**内容面内打开** `BoardView`（不再是全屏 `z-40` 模态）。
- 约定：某看板 `<dir>/roadmap.board` 的卡片新建到同级 `<dir>/roadmap/` 文件夹（卡片仍是普通笔记，位置仅是约定，扫描按 `board` 字段全库匹配，不限目录）。

## 2. 组件与数据流

```
文件树节点(.board)──点击──▶ openBoard(path)
   └─ load_board(root, path) → { config, cards[] }   (Rust)
                                  │
                          BoardView（内容面内，非模态）
                          ├─ 列 = config.columns
                          ├─ 卡 = cards 按 status 分组、position 排序
                          ├─ 点卡 ──▶ openMarkdownFile(card.path)  → EditorShell（文档+属性条）
                          ├─ 拖卡 ──▶ 改卡 frontmatter status/position（读→parse→write）
                          └─ 加卡 ──▶ 新建 .md（board+status+position frontmatter）→ 打开
```

## 3. Rust 表面（最小新增；卡片增删改走现有 md 读写）

| 命令 | 作用 |
|------|------|
| `EntryKind::Board` + `is_board_path`（`.board`） | 文件树把 `.board` 识别为 board 节点 |
| `create_board(root, relativePath, config_json)` | 写 `.board` 文件（+ 建卡片文件夹），返回 WorkspaceSnapshot |
| `read_board_file(path) -> String` / `write_board_file(path, content)` | 纯文本读写 `.board`（绕过 `ensure_markdown` 的 md 限制） |
| `scan_board_cards(root, board_id) -> Vec<CardInfo>` | 遍历 `.md`，`parse_frontmatter`，取 `board == id` 的卡片元数据（path/title/status/position/priority/assignee/due） |

- 卡片**创建/移动**复用现有 `read_markdown_file`/`write_markdown_file` + 前端 `parseFrontmatter`/`writeFrontmatter`（卡片是 `.md`）。
- `read_children` 增加 `.board` 分支；`board` 节点排序在 markdown 之后、asset 之前（或与文档同列）。

## 4. 前端表面

- `types.ts`：`EntryKind += "board"`；新增 `BoardConfig`/`BoardColumn`/`BoardCard`。
- `shared/lib/fileTypes.ts`：注册 `board` 类型（图标 `ViewColumnsIcon`）。
- `tauri.ts`：`createBoard`/`readBoardFile`/`writeBoardFile`/`scanBoardCards` 绑定。
- `BoardView.tsx`（新）：内容面内看板（列/卡/拖拽/加卡/打开卡）。
- `App.tsx`：删除全屏 `KanbanBoard` 模态接线；`currentKind==="board"` 在内容面渲染 `BoardView`。
- `EditorShell.tsx`：卡片（带 `board` frontmatter 的 `.md`）打开时，正文上方显示**属性条**（status 下拉 / priority / assignee / due）。
- `useFileSystem.ts`：`openBoard`、`createBoard`、卡片 `createCard`/`moveCard`（frontmatter 改写）。
- `Sidebar.tsx`：board 图标 + board 节点点击 → `openBoard`。
- `shared/lib/markdown.ts`：(a) `[[wikilink]]` → 链接；(b) 围栏块 ```` ```jtype-board <id|path> ```` → 只读内联看板。
- `NewResourceDialog.tsx`：「看板」→ 创建 `.board` 文件并内容面打开（替换旧 kanban 模态入口）。

## 5. 退役/暂缓

- **退役**：桌面 `KanbanBoard` 全屏模态、`kanban_local.rs`/`kanban.json`、`kanbanSync.ts`（本地优先看板改由 Markdown 卡片承载）。保留文件以防引用编译错误时再删，但从 App 接线移除。
- ~~**暂缓（后续 PRD）**：云端 `kanban_*` 表、Web `Kanban.tsx` 页面、看板的云端同步。~~ **→ 已立项（2026-06-23）**：该"后续 PRD"即 **[`../kanban/unification-v2.md`](../kanban/unification-v2.md)**——决定**退役**云端 DB 看板,把其功能搬到文档型看板并云端本地互通。本轮聚焦桌面本地体验（用户强调「本地」）。文档/卡片本就走现有文档同步链路。

## 6. 验收标准（Acceptance Criteria）

### 通用门槛（每阶段都必须过）
- `tsc --noEmit`（desktop + web）= 0 错；`vite build` = 0；`cargo check`/`cargo test`（src-tauri）= 通过；应用启动无 console 错误。

### Phase 0 — 看板进树、内容面打开
- AC0.1 `.board` 文件作为 `board` 节点出现在文件树（专属图标）。
- AC0.2 点击 board 节点在**内容面内**打开（无全屏 `fixed inset-0 z-40` 覆盖）；header/侧栏 chrome 保留。
- AC0.3 「新建资源」选「看板」会创建 `.board` 文件并打开它（不再开旧模态）。
- AC0.4 App 内已无对旧全屏 `KanbanBoard` 模态的渲染接线。

### Phase 1B — 卡片即文档
- AC1.1 卡片是真实 `.md` 文件（frontmatter board/status/...＋正文）。
- AC1.2 点卡片在 `EditorShell` 以**文档**打开，正文可编辑/预览。
- AC1.3 卡片文档顶部有属性条（status/priority/assignee/due），改 status 写回 frontmatter。
- AC1.4 卡片出现在文件树/搜索/回收站（因为它就是笔记）。

### Phase 2 — 看板即视图
- AC2.1 `BoardView` 从 `scan_board_cards` 取卡，按 `status` 分列、`position` 排序。
- AC2.2 加卡：在某列新建 `.md`（带 board+status+position），即时出现在该列且可打开。
- AC2.3 移卡（拖拽或属性条改 status）：改写卡 frontmatter，视图刷新到目标列。
- AC2.4 删卡 = 删除该 `.md`（走文档删除/回收站）。

### Phase 3 — 互链与内联嵌入
- AC3.1 文档/卡片正文里 `[[笔记名]]` 在预览中渲染为可点链接，解析到对应 vault 笔记。
- AC3.2 文档正文里 ```` ```jtype-board <id> ```` 在预览中渲染为只读看板（列＋卡标题）。

### Phase 4 — 统一生命周期
- AC4.1 快速打开/搜索能搜到 board 文件与卡片笔记。
- AC4.2 卡片删除走文档回收站（与普通文档同一套）。
- AC4.3 类型命名空间统一（`EntryKind` 含 board；无残留的双轨 kanban 渲染接线）。

## 7. 验证方式
- 单元/构建门槛（§6 通用）。
- 浏览器隔离验证：用临时 harness 在真实浏览器挂载 `<BoardView>`（mock 数据）确认列/卡/加卡/属性条交互；挂载卡片文档确认属性条写回；预览验证 `[[link]]` 与 `jtype-board` 嵌入。
- 运行真机 tauri dev：建看板 → 加卡 → 打开卡写正文 → 拖动改列 → 在文档里 `[[卡片]]` 和内联看板，端到端确认。
