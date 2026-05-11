# JType 交互与 UX — 文档与实现差距分析

> 对比原始设计文档（interaction-design.md、interaction-upgrade-prd.md、pm-interaction-upgrade-zh.md、product-interaction-analysis.md）与当前代码实现。

## 1. 已实现（文档与代码匹配）

| 设计文档要求 | 实现位置 | 备注 |
|-------------|---------|------|
| Command registry | `useCommands.ts` | CommandDef 类型与文档设计基本一致 |
| Command palette | `CommandPalette.tsx` | Ctrl+Shift+P，模糊搜索，显示 shortcut |
| Quick switcher | `QuickSwitcher.tsx` | Ctrl+O，搜索/创建，最近文件 |
| 键盘快捷键 | `useKeyboardShortcuts.ts` | 10+ 快捷键已绑定 |
| Breadcrumb | `Breadcrumb.tsx` | 文档路径导航 |
| Header (模式感知) | `Header.tsx` | empty/vault/single-file 模式行为不同 |
| 多应用模式 | `App.tsx` / `AppState.tsx` | empty/vault/vault+doc/single-file |
| VaultHome | `VaultHome.tsx` | vault 模式无文档时展示 |
| WelcomeScreen | `WelcomeScreen.tsx` | 空模式欢迎页 |
| Favorites (基础) | `useCommands.ts` file.favorite | 使用 localStorage 存储 |
| 文件操作 | 多个 Dialog 组件 | 创建/重命名/删除/移动文件夹 |
| 冲突处理 | `ConflictDialog.tsx` | 同步冲突 UI |
| @headlessui/react 弹窗 | 所有 Dialog 组件 | 符合规范 |

## 2. 主要差距

### 2.1 App Shell 架构

| 设计文档 | 当前实现 | 差距 |
|---------|---------|------|
| Activity rail (48px, Files/Search/Library/Publish/AI/Settings) | 无 | 当前只有单一 Sidebar |
| 动态 sidebar（根据 activity 切换内容） | Sidebar.tsx 只显示文件树 | 缺少 Search/Library/Publish 等视图 |
| 右侧 Inspector (320px, 可折叠) | 无 | 完全缺失 |
| Inspector tabs (Preview/Properties/Outline/Links/Publish/AI) | 无 | 完全缺失 |
| Sidebar 可调整宽度 (220–420px) | 未确认 | 可能是固定宽度 |

### 2.2 Properties / Metadata

| 设计文档 | 当前实现 | 差距 |
|---------|---------|------|
| YAML frontmatter 可视化编辑面板 | 无 | frontmatter 只能在编辑器源码中编辑 |
| 字段：title/description/tags/slug/status/publish | Rust 侧 `parse_frontmatter` 提取，但前端无编辑 UI | 缺前端面板 |
| 修改后写回 Markdown | 无 | — |
| 验证 slug/status | 无 | — |

### 2.3 Outline / Links

| 设计文档 | 当前实现 | 差距 |
|---------|---------|------|
| Outline panel（标题列表，点击跳转） | 无 | — |
| Backlinks panel | 无 | — |
| Outgoing links panel | 无 | — |
| Missing/broken links 检测 | publish checks 中部分检查 | 无独立面板 |

### 2.4 文件树增强

| 设计文档 | 当前实现 | 差距 |
|---------|---------|------|
| 完整右键上下文菜单 | 有基础上下文菜单状态 (SET_CONTEXT_MENU) | 不确定菜单项是否完整 |
| 拖拽移动 | 无 | — |
| Expand all / Collapse all | 无 | — |
| Reveal current file | 无 | — |
| Favorites section (sidebar) | localStorage 存储存在 | sidebar 中无独立 section 展示 |
| Recent section (sidebar) | 无 | — |
| 状态颜色点 (灰/黄/蓝/绿/红) | 无 | 文件行无状态指示 |

### 2.5 发布与状态

| 设计文档 | 当前实现 | 差距 |
|---------|---------|------|
| 文档状态 chips (Dirty/Saved/Synced/Published/Outdated/Failed) | isDirty 追踪，同步/发布流程存在 | Header 中无清晰的多状态 chips UI |
| Publish queue view | 无 | — |
| Copy public URL from desktop | 无 | — |
| Pre-publish checks UI | publish.check 命令存在 | 无独立视图展示结果 |

### 2.6 Library / Management Views

| 设计文档 | 当前实现 | 差距 |
|---------|---------|------|
| Library table/list view | 无 | — |
| Saved views (Drafts/Published/Broken links) | 无 | — |
| Issue center | 无 | — |

### 2.7 编辑器增强

| 设计文档 | 当前实现 | 差距 |
|---------|---------|------|
| Write/Split/Preview/Focus 模式 | 部分实现（split/preview 快捷键存在） | focus 模式作为命令注册但不确定 UI |
| Markdown toolbar (bold/italic/link 等) | 快捷键存在 | 无可见工具栏 UI |
| Insert menu (table/callout/code block) | insert.table 快捷键存在 | 无菜单 UI |
| Slash commands | 无 | — |

### 2.8 Rename/Move 链接影响

| 设计文档 | 当前实现 | 差距 |
|---------|---------|------|
| Rename/move 时显示链接影响 | 无 | — |
| "Rename and Update Links" 选项 | 无 | — |

### 2.9 AI 交互

| 设计文档 | 当前实现 | 差距 |
|---------|---------|------|
| AI command scope selector | 无 | AGENTS.md 明确 AI UI 隐藏直到功能就绪 |
| Patch review panel | 无 | — |
| AI context preview | 无 | — |
| ai.index 命令 | ✅ 已注册 | 唯一的 AI 相关实现 |

### 2.10 技术设计 vs 实际代码结构

文档建议的模块结构：
```
src/commands/、src/shell/、src/navigation/、src/workspace/、src/metadata/、src/links/、src/publish/、src/ai/
```

实际代码结构：
```
src/hooks/useCommands.ts（单文件 command registry）
src/components/modals/CommandPalette.tsx、QuickSwitcher.tsx
src/components/layout/Header.tsx、Breadcrumb.tsx
src/components/sidebar/Sidebar.tsx
src/components/editor/EditorShell.tsx
```

差距：文档设想了更细粒度的模块拆分，实际实现更扁平，命令系统集中在单个 hook 中。当前结构对已有功能是合理的，模块化可在添加 inspector/library/publish 面板时逐步推进。

## 3. 文档本身的问题

### 3.1 重复内容

四份文档高度重叠：
- `interaction-design.md` 和 `pm-interaction-upgrade-zh.md` 内容几乎完全对应（英文/中文版本）
- `interaction-upgrade-prd.md` 和 `pm-interaction-upgrade-zh.md` 的 PRD 部分重复
- `product-interaction-analysis.md` 的竞品分析和差距分析与其他三份文档大量重复

### 3.2 过时内容

- 文档中仍使用 "workspace" 一词指代本地文件夹，当前产品用语是 "vault"
- AI 相关功能描述过于详细（patch review、context scope 等），但 AGENTS.md 明确 AI UI 暂不展示
- 部分计划的 Tauri 命令（`search_workspace`、`list_recent_documents`、`get_backlinks` 等）尚未实现

### 3.3 缺失的实现细节

- 文档未描述 VaultHome 和 WelcomeScreen 的交互（这是后来加的）
- 文档未提到 `ConfirmDialogContext` / `PromptDialogContext` 的 context-based 弹窗模式
- 文档未提到 `useCloudEvents` / `useEagerSync` / `usePeriodicSync` 等已实现的同步机制

## 4. 优先建议

1. **短期**：补充 file tree context menu、文档状态 chips、favorites/recent sidebar section
2. **中期**：实现 Inspector 面板（Properties + Outline 优先）、Activity rail
3. **长期**：Library view、Publish queue、Backlinks、Rename link impact
4. **暂缓**：AI 交互面板（等 AI 功能就绪）、Graph view、Canvas
