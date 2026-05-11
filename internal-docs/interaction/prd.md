# JType 交互与 UX 升级 — 产品需求文档

> 合并自：interaction-upgrade-prd.md、pm-interaction-upgrade-zh.md、product-interaction-analysis.md

## 1. 背景

JType 已完成本地 Markdown vault + web 同步 + 个人站点发布主链路。随着文档数量增长和功能增加（同步状态、发布状态、AI），按钮式界面难以扩展。需要建立可扩展的交互骨架。

**产品定位**：local-first Markdown workspace + 可发布个人文档站 + AI-ready 内容操作系统。

- 像 Obsidian 尊重本地 Markdown 文件
- 像 Notion 把文档变成可管理对象
- 桌面端与 web site 打通

## 2. 产品目标

让用户高效完成四类工作：

- **管理**：组织、查找、筛选、移动、删除和恢复文档
- **编辑**：写 Markdown，编辑属性、查看目录、预览和链接关系
- **发布**：检查、同步、发布、复制公开 URL
- **AI 辅助**：选择上下文、生成建议、审阅 diff、确认写入

## 3. 用户故事

- 用键盘快速打开任意笔记（quick switcher）
- 看到哪些文档还没发布、哪些链接断了
- 每篇文档显示本地保存/同步/发布状态
- frontmatter 可视化编辑，文件仍是普通 Markdown
- AI 修改必须先展示 diff

## 4. 功能范围与优先级

### P0 — 已实现或正在实现

| 功能 | 状态 |
|------|------|
| Command registry（`useCommands` hook） | ✅ 已实现 |
| Command palette（`CommandPalette.tsx`） | ✅ 已实现 |
| Quick switcher（`QuickSwitcher.tsx`） | ✅ 已实现 |
| 键盘快捷键（`useKeyboardShortcuts`） | ✅ 已实现 |
| Breadcrumb（`Breadcrumb.tsx`） | ✅ 已实现 |
| File tree + Sidebar（`Sidebar.tsx`） | ✅ 已实现 |
| Document top bar（`Header.tsx`） | ✅ 已实现 |
| 文件创建/重命名/删除 | ✅ 已实现 |
| Favorites（localStorage） | ✅ 已实现 |
| 多种应用模式（empty/vault/single-file） | ✅ 已实现 |
| VaultHome（无文档时展示） | ✅ 已实现 |
| 确认对话框、冲突对话框 | ✅ 已实现 |
| 文件夹创建/删除/移动 | ✅ 已实现 |

### P0 — 计划中

| 功能 | 说明 |
|------|------|
| Activity rail（左侧导航栏） | 当前 sidebar 是纯文件树，缺少 Files/Search/Library/Publish 切换 |
| 右侧 Inspector（Properties/Outline/Links） | 目前没有右侧面板 |
| Properties/frontmatter panel | frontmatter 只在编辑器源码中可见 |
| Outline panel | 无标题大纲导航 |
| File tree context menu（右键菜单） | 需要完整右键上下文菜单 |
| 文档状态 chips（Dirty/Synced/Published） | Header 中状态展示有限 |

### P1 — 计划中

| 功能 | 说明 |
|------|------|
| Library table/list view | 文档管理表格视图 |
| Publish queue view | 发布队列 |
| Backlinks / outgoing links panel | 文档关系面板 |
| Rename/move link impact preview | 重命名时显示链接影响 |
| Trash/recovery | 回收站 |
| Issue center | 验证问题中心 |

### P2 — 远期

| 功能 | 说明 |
|------|------|
| Workspace graph / local graph | 知识图谱 |
| Bulk property editing | 批量属性编辑 |
| Templates | 文档模板 |
| Revision history / rollback | 版本历史 |
| AI patch review center | AI 修改审查 |

### 不做

- 完整 Notion block editor
- 实时多人协作
- 移动端
- 企业级权限系统

## 5. 核心需求

### 5.1 Command Registry

**已实现**：`useCommands` hook 定义了 `CommandDef` 类型，包含 id/title/aliases/scope/shortcut/isEnabled/disabledReason/run。当前已注册命令：file.open、workspace.open、file.save、file.new、file.rename、file.delete、file.favorite、publish.export、publish.check、sync.workspace、ai.index、view.commandPalette、view.quickSwitcher、view.focus 等。

**待完善**：toolbar/menu/context menu 尚未全部复用 command 层。

### 5.2 Command Palette

**已实现**：`Ctrl+Shift+P` 打开，支持模糊搜索，显示快捷键，显示 disabled reason。

### 5.3 Quick Switcher

**已实现**：`Ctrl+O` 打开，搜索文件标题/路径，空搜索显示最近文件，Enter 打开，Shift+Enter 创建新文档。

### 5.4 App Shell 升级

**需求**：
- 左侧增加 activity rail：Files、Search、Library、Publish、AI、Settings
- Sidebar 根据 activity 切换内容
- 右侧 inspector 支持 Properties/Outline/Links/Publish
- 切换侧边栏不丢失编辑器状态

### 5.5 Properties Panel

**需求**：
- 将 YAML frontmatter 显示为可编辑表单
- 默认字段：title、description、tags、slug、status、publish、createdAt、updatedAt
- 修改后写回 Markdown frontmatter
- 保留未知字段
- 验证 slug/status

### 5.6 Publish 状态阶梯

- Dirty：编辑器内容未保存
- Saved：已写入本地文件
- Synced：已同步到 web service
- Published：对外可访问
- Outdated：本地比线上新
- Failed：同步或发布失败

## 6. 成功指标

- 1,000 文件内，quick switcher 5 秒内打开目标文档
- 80% 核心操作可从 command palette 触达
- 用户无需打开网站即可知道文档同步/发布状态
- 用户可可视化编辑常见 frontmatter 字段
- 重命名文档时能看到链接影响
- AI 写入必须经过 diff review

## 7. 分阶段计划

### Milestone 1：Command Shell ✅ 基本完成

- [x] command registry
- [x] command palette
- [x] quick switcher
- [x] document top bar（Header + Breadcrumb）
- [ ] file tree context menu（部分）

### Milestone 2：Management Surfaces

- [x] favorites（基础版）
- [ ] recent files（sidebar section）
- [ ] properties panel
- [ ] outline panel
- [ ] library view
- [ ] issue view

### Milestone 3：Relationship And Publish

- [ ] backlinks / outgoing links
- [ ] rename/move impact preview
- [ ] publish queue
- [ ] sync status chips
- [ ] copy public URL from desktop

### Milestone 4：AI-Ready UX

- [ ] AI command scope selector
- [ ] patch review panel
- [ ] AI context preview
- [ ] safe apply/reject flow
