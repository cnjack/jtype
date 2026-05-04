# JType 核心管理与编辑交互升级：产品分析、PRD 与设计

## 1. 产品经理视角结论

JType 当前已经从单文档 Markdown viewer 走到了「本地 workspace + 同步 + 个人网站发布」的第一条主链路。下一步最关键的不是堆更多按钮，而是建立一个可扩展的产品交互骨架：让文件管理、编辑、发布、同步、AI 都通过同一套 workspace shell 和 command layer 组织起来。

参考 Notion 和 Obsidian 后，JType 最适合的定位不是「另一个 Notion」或「另一个 Obsidian」，而是：

> local-first Markdown workspace + 可发布个人文档站 + AI-ready 内容操作系统。

也就是说：

- 像 Obsidian 一样尊重本地 Markdown 文件，用户永远可以带走文件。
- 像 Notion 一样把文档变成可管理对象，有状态、属性、视图、发布流和组织结构。
- 比两者更早把 desktop 和 web site 打通：本地写完后同步到自己的用户站点。

## 2. 竞品交互分析

### 2.1 Notion 值得学习的地方

Notion 的核心不是编辑器本身，而是「内容管理感」：

- 左侧 sidebar 是整个 workspace 的地图。
- 页面可以无限层级嵌套，支持拖拽重组。
- Favorites、Private、Shared、Teamspace、Templates、Settings、Trash 都在稳定位置。
- Database 把页面变成有属性、筛选、排序、视图的管理对象。
- Wiki/Verified pages 引入 owner、验证状态、过期提醒，让知识库更可信。
- 发布和分享是页面的一部分，而不是额外导出动作。

对 JType 的启发：

- 不应该只展示 raw file tree，而要在文件树上叠加「内容管理层」。
- 左侧应该有 Favorites、Recent、Publish queue、Issues、Trash。
- Markdown frontmatter 应该被可视化为属性，而不只是一段 YAML。
- 发布状态应该跟文档状态绑定，用户打开文档就知道它是否已同步、已发布、已过期。

### 2.2 Obsidian 值得学习的地方

Obsidian 的核心是「本地可信 + 快速操作 + 知识关系」：

- Vault 就是本地文件夹，文件系统是事实来源。
- File explorer 支持新建、重命名、删除、拖拽移动、上下文菜单。
- Quick switcher 用键盘快速打开最近或搜索到的笔记。
- Command palette 让所有功能都能通过模糊搜索触发。
- Properties 把 YAML frontmatter 变成结构化字段。
- Backlinks、Outgoing links、Graph view、Local graph 让文档关系可见。
- Canvas 使用开放 JSON Canvas 格式，而不是封闭数据结构。

对 JType 的启发：

- JType 的根基应继续是普通 Markdown 文件。
- 快速打开和命令面板必须成为 P0 能力。
- 重命名/移动文档时要提示链接影响并可自动更新。
- AI index 不只服务 AI，也应该反哺用户：显示 backlinks、断链、关系图、发布问题。

## 3. 当前 JType 的主要提升点

### 3.1 管理层

当前 JType 已有 workspace tree，但还是偏「文件列表」。下一步应升级为「workspace 管理面板」：

- Workspace switcher
- Favorites
- Recent
- File tree
- Library views
- Publish queue
- Issues
- Trash

### 3.2 编辑层

当前 JType 有 Markdown 编辑和预览。下一步需要补足写作效率和结构化编辑：

- Write / Split / Preview / Focus 模式
- Markdown toolbar
- Insert menu
- Properties/frontmatter 面板
- Outline 面板
- Backlinks / Outgoing links 面板
- AI diff review 面板

### 3.3 菜单与命令层

当前功能主要分散在按钮里，后续会越来越难扩展。需要引入全局 command registry：

- 顶部菜单、右键菜单、工具栏按钮、快捷键、命令面板、AI 操作都调用同一个 command。
- 每个 command 有 id、label、icon、shortcut、scope、enabled state、handler。
- AI 功能后续也作为 command 接入，而不是单独做一套系统。

### 3.4 发布与同步层

当前已经能同步到个人网站，但 desktop 里的状态表达还不够产品化。需要明确状态阶梯：

- Dirty：编辑器内容未保存。
- Saved：已写入本地文件。
- Synced：已同步到 web service。
- Published：对外可访问。
- Outdated：本地比线上新。
- Failed：同步或发布失败。

## 4. PRD

### 4.1 背景

JType 已具备本地 Markdown workspace、保存、静态导出、web sync、用户网站渲染等主链路。随着文档数量、同步状态、发布状态和未来 AI 能力增加，现有按钮式界面会逐渐难以承载复杂操作。

本 PRD 定义下一阶段的核心交互升级：建立类似 Notion/Obsidian 的 workspace shell、命令系统、快速打开、文档属性、文档关系和发布管理体验。

### 4.2 产品目标

让用户可以在 JType 中高效完成四类工作：

- 管理：组织、查找、筛选、移动、删除和恢复 Markdown 文档。
- 编辑：写 Markdown，同时编辑属性、查看目录、预览和链接关系。
- 发布：检查、同步、发布、复制公开 URL。
- AI 辅助：选择上下文、生成建议、审阅 diff、确认写入。

### 4.3 用户故事

- 作为个人知识库用户，我希望用键盘快速打开任意笔记，而不是在目录树里找。
- 作为技术写作者，我希望看到哪些文档还没发布、哪些链接断了。
- 作为发布站点用户，我希望每篇文档都能显示本地保存、同步、发布状态。
- 作为 Markdown 用户，我希望 frontmatter 可以可视化编辑，但文件仍然是普通 Markdown。
- 作为未来 AI 用户，我希望 AI 修改必须先展示 diff，不能直接覆盖我的文件。

### 4.4 功能范围

P0：

- 全局 command registry。
- Command palette。
- Quick switcher。
- Activity rail + 可折叠 sidebar。
- Document top bar：breadcrumb、标题、状态 chips、主要动作。
- File tree context menu。
- Favorites 和 Recent。
- Properties/frontmatter panel。
- Outline panel。

P1：

- Library table/list view。
- Publish queue。
- Issue center。
- Backlinks / outgoing links panel。
- Rename/move link impact preview。
- Trash/recovery。

P2：

- Workspace graph / local graph。
- Bulk property editing。
- Templates。
- Revision history / rollback。
- Visual canvas。
- AI patch review center。

不做：

- 完整 Notion block editor。
- 实时多人协作。
- 移动端。
- 企业级权限系统。
- 直接接入模型并自动改文件。

### 4.5 核心需求

#### App Shell

- 左侧增加 activity rail：Files、Search、Library、Publish、AI、Settings。
- Activity rail 右侧是动态 sidebar。
- 中间始终是当前文档 workbench。
- 右侧 inspector 支持 Preview、Properties、Outline、Links、Publish、AI。
- 切换侧边栏或 inspector tab 不丢失编辑器光标和滚动位置。

#### Command Registry

- 所有操作注册为 command。
- command 包含 id、title、aliases、icon、shortcut、scope、enabled、run。
- toolbar、menu、context menu、shortcut、command palette 都复用 command。
- disabled command 需要给出原因。

#### Command Palette

- 快捷键建议：`Ctrl+Shift+P`。
- 支持模糊搜索命令。
- 空搜索展示最近使用命令。
- 显示快捷键和 scope。
- AI command 后续可插入同一列表。

#### Quick Switcher

- 快捷键建议：`Ctrl+O`。
- 搜索 title、path、aliases、tags。
- 空搜索展示最近文档。
- Enter 打开文档。
- Shift+Enter 用输入名称创建新文档。

#### File Tree

- 支持右键菜单。
- 支持拖拽移动。
- 支持 expand all / collapse all。
- 支持 reveal current file。
- 支持 favorite。
- 文件行显示 dirty/synced/published/error 状态。
- 删除进入 trash 或需要明确确认。

#### Properties Panel

- 将 YAML frontmatter 显示为表单。
- 默认字段：title、description、tags、slug、status、publish、createdAt、updatedAt。
- 修改后写回 Markdown frontmatter。
- 保留未知字段。
- 不支持的复杂字段允许切回 source mode。

#### Links Panel

- 显示 outgoing links。
- 显示 backlinks。
- 显示 missing links。
- 显示 assets。
- broken link 支持定位和修复建议。

#### Publish Queue

- 展示 Ready、Draft、Outdated、Failed、Published。
- 展示缺标题、重复 slug、draft、断链、缺资源等发布检查。
- 提供 sync、preview、copy public URL。

#### AI Hook

- AI action 作为 command 注册。
- AI command 必须声明上下文范围：selection、document、folder、workspace。
- AI 输出必须是 proposed patches。
- 用户必须 review diff 后才能写入。

### 4.6 成功指标

- 1,000 个 Markdown 文件内，用户可以 5 秒内通过 quick switcher 打开目标文档。
- 80% 核心操作可以从 command palette 触达。
- 用户无需打开网站即可知道文档是否已同步/发布。
- 用户可以可视化编辑常见 frontmatter 字段。
- 重命名文档时能看到链接影响并选择是否更新。
- AI 写入必须经过 diff review。

## 5. Interaction Design

### 5.1 总体布局

```text
+--------------------------------------------------------------------------------+
| Workspace / Breadcrumbs                    Dirty  Synced  Published     Publish |
+------+---------------------------+---------------------------------------------+
| Rail | Sidebar                   | Document Workbench                 Inspector |
|      |                           |                                             |
|  F   | Files                     | # Current Document                         |
|  S   | Favorites                 |                                             |
|  L   | Recent                    | Markdown editor / split preview            |
|  P   | Workspace Tree            |                                             |
| AI   |                           |                                             |
| ?    |                           |                                             |
+------+---------------------------+---------------------------------------------+
```

布局规则：

- Activity rail：48px。
- Sidebar：默认 260px，可折叠，可调整宽度。
- Inspector：默认 320px，可折叠。
- Workbench 占据剩余空间。
- 小窗口下优先收起 inspector，再收起 sidebar。

### 5.2 Activity Rail

项目：

- Files
- Search
- Library
- Publish
- AI
- Settings

交互：

- 单击切换 sidebar 内容。
- 当前项有明显 active indicator。
- hover 显示 tooltip。
- Publish/Issues 可以显示 badge。

### 5.3 Files Sidebar

结构：

- Workspace header
- Favorites
- Recent
- Files
- Trash

文件行：

```text
[chevron] [icon] Title.md                         [status dot] [...]
```

状态颜色：

- 灰色：local only。
- 黄色：dirty。
- 蓝色：synced。
- 绿色：published。
- 红色：error。

### 5.4 Document Top Bar

结构：

```text
Workspace / folder / Current.md     Draft  Dirty  Synced  Published     [Check] [Sync]
```

包含：

- Breadcrumb。
- 可编辑标题。
- Favorite toggle。
- 状态 chips。
- Run checks。
- Sync。
- More menu。

### 5.5 Editor Workbench

模式：

- Write：只显示编辑器。
- Split：编辑器 + 预览。
- Preview：只显示预览。
- Focus：隐藏 sidebar 和 inspector。

Toolbar：

- Bold
- Italic
- Link
- Code
- Quote
- Task list
- Table
- Image
- More insert

快捷键：

- `Ctrl+S` 保存。
- `Ctrl+O` quick switcher。
- `Ctrl+Shift+P` command palette。
- `Ctrl+B` bold。
- `Ctrl+I` italic。
- `Ctrl+K` link。
- `F2` rename current file。

### 5.6 Inspector

Tabs：

- Preview：安全渲染 Markdown。
- Properties：编辑 frontmatter。
- Outline：当前文档标题结构。
- Links：outgoing、backlinks、missing links、assets。
- Publish：发布检查、URL、sync 状态。
- AI：上下文范围、建议命令、pending patches。

### 5.7 Command Palette

```text
Search commands...

Recently used
  Save current file                     Ctrl+S
  Sync workspace

Commands
  New note                              Ctrl+N
  Run publish checks
  Build AI index
```

结果行包含：

- icon
- command title
- scope
- shortcut
- disabled reason

### 5.8 Quick Switcher

```text
Open or create note...

Recent
  Product Plan                         docs/plans.md
  Runtime Notes                        docs/runtime.md

Results
  Interaction Upgrade PRD              docs/interaction-upgrade-prd.md
```

行为：

- 空搜索显示 recent。
- 输入后按 title/path/tag/alias 搜索。
- Enter 打开。
- Shift+Enter 创建。

### 5.9 Library View

表格字段：

- Title
- Path
- Status
- Tags
- Updated
- Sync
- Publish
- URL

默认视图：

- All documents
- Drafts
- Published
- Needs review
- Broken links
- Recently edited

### 5.10 Publish Queue

分组：

- Ready
- Draft
- Outdated
- Failed
- Published

行结构：

```text
Title                         /path/to/file.md       Outdated       [Check] [Sync]
```

详情区：

- validation issues
- last synced time
- public URL
- asset sync status
- revision later

### 5.11 Rename/Move Impact Dialog

```text
Rename "old.md" to "new.md"

Impact:
- 4 Markdown links can be updated automatically.
- 1 public URL may change.
- 0 missing assets.

[Cancel] [Rename Only] [Rename and Update Links]
```

原则：

- 不静默破坏链接。
- 展示受影响文件。
- 更新链接也走 patch/review 思路。

### 5.12 AI Patch Review

流程：

1. 用户运行 AI command。
2. JType 展示本次上下文范围。
3. AI 返回 proposed patches。
4. Review panel 展示 diff。
5. 用户 accept/reject/partial apply。
6. JType 写入文件并更新 index。

## 6. 技术设计建议

### 6.1 前端模块

```text
src/
  commands/
    registry.ts
    commandTypes.ts
    defaultCommands.ts
    shortcuts.ts
  shell/
    activityRail.ts
    sidebar.ts
    topbar.ts
    inspector.ts
  navigation/
    commandPalette.ts
    quickSwitcher.ts
    breadcrumbs.ts
  workspace/
    fileTreeView.ts
    libraryView.ts
    issueView.ts
  editor/
    editorToolbar.ts
    insertMenu.ts
    outline.ts
  metadata/
    propertiesPanel.ts
    frontmatterModel.ts
  links/
    backlinksPanel.ts
    linkImpact.ts
  publish/
    publishQueue.ts
    publishStatus.ts
  ai/
    aiCommandSurface.ts
    patchReview.ts
```

### 6.2 Command 类型

```ts
type CommandScope =
  | "global"
  | "workspace"
  | "file"
  | "folder"
  | "editor"
  | "selection"
  | "publish"
  | "ai";

type AppCommand = {
  id: string;
  title: string;
  aliases?: string[];
  icon?: string;
  shortcut?: string;
  scope: CommandScope[];
  isEnabled: () => boolean;
  disabledReason?: () => string | undefined;
  run: () => Promise<void> | void;
};
```

### 6.3 后端/Tauri 后续 commands

- `search_workspace`
- `list_recent_documents`
- `toggle_favorite`
- `parse_frontmatter`
- `update_frontmatter`
- `extract_outline`
- `get_document_links`
- `get_backlinks`
- `preview_rename_impact`
- `apply_rename_with_link_updates`
- `move_to_trash`
- `restore_from_trash`

### 6.4 `.jtype/workspace.json` 扩展

```json
{
  "favorites": ["docs/plans.md"],
  "recentDocuments": [
    { "path": "docs/plans.md", "openedAt": "2026-05-01T00:00:00Z" }
  ],
  "savedViews": [
    { "name": "Drafts", "filter": { "status": "draft" } }
  ]
}
```

## 7. 测试设计

Unit tests：

- command registry enable/disable。
- fuzzy command matching。
- quick switcher ranking。
- frontmatter parse/update 保留未知字段。
- link extraction / backlink indexing。
- rename impact calculation。

Integration tests：

- rename file and update links。
- edit properties and save Markdown。
- run publish checks from command palette。
- build library view from workspace index。

E2E tests：

- 打开 command palette 并保存文件。
- quick switcher 打开文件。
- favorite 文件并验证 sidebar。
- 修改 property 并验证 Markdown 内容。
- run publish check 并看到 issue list。
- rename document 并接受 link update。

## 8. 分阶段计划

### Milestone 1：Command Shell

- [ ] command registry。
- [ ] command palette。
- [ ] quick switcher。
- [ ] document top bar。
- [ ] file tree context menu。

### Milestone 2：Management Surfaces

- [ ] favorites。
- [ ] recent files。
- [ ] properties panel。
- [ ] outline panel。
- [ ] library view。
- [ ] issue view。

### Milestone 3：Relationship And Publish

- [ ] backlinks / outgoing links。
- [ ] rename/move impact preview。
- [ ] publish queue。
- [ ] copy public URL。
- [ ] sync status history。

### Milestone 4：AI-Ready UX

- [ ] AI command scope selector。
- [ ] patch review panel。
- [ ] AI context preview。
- [ ] safe apply/reject flow。

## 9. 参考资料

- Notion sidebar navigation: https://www.notion.com/en-gb/help/navigate-with-the-sidebar
- Notion databases: https://www.notion.com/help/intro-to-databases
- Notion wikis and verified pages: https://www.notion.com/en-gb/help/wikis-and-verified-pages
- Obsidian file explorer: https://help.obsidian.md/Plugins/File%20explorer
- Obsidian command palette: https://help.obsidian.md/plugins/command-palette
- Obsidian quick switcher: https://help.obsidian.md/plugins/quick-switcher
- Obsidian properties: https://help.obsidian.md/properties
- Obsidian backlinks: https://help.obsidian.md/Plugins/Backlinks
- Obsidian graph view: https://help.obsidian.md/plugins/graph
- Obsidian canvas: https://help.obsidian.md/plugins/canvas
