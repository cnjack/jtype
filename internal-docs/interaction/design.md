# JType 交互设计文档

> 合并自：interaction-design.md、pm-interaction-upgrade-zh.md（设计部分）
> 描述当前已实现的交互结构与计划中的目标设计。

## 1. 设计方向

JType 是专注写作与发布的 workspace，不是通用 IDE 也不是重型 CMS。界面应安静、紧凑、快速。

## 2. 应用模式（已实现）

JType 桌面端有四种模式，由当前状态决定 Header 行为和可见组件：

| 模式 | 条件 | 展示内容 |
|------|------|----------|
| Empty | 无 vault 无文件 | WelcomeScreen，Header 仅显示产品标识 + 账户入口 |
| Vault (无文档) | 有 vault，未选中文档 | VaultHome，Header 显示 quick open + 账户/cloud |
| Vault (有文档) | 有 vault + 选中文档 | EditorShell + Sidebar，Header 显示保存（dirty 时） |
| Single-file | 直接打开单个 .md | 纯 Markdown 编辑器，隐藏账户/同步/发布/sidebar |

## 3. 当前布局结构

```text
+--------------------------------------------------------------------------------+
| Header: 面包屑 / 标题        状态指示        操作按钮                            |
+---------------------------+----------------------------------------------------+
| Sidebar (文件树)           | EditorShell (CodeMirror Markdown 编辑器)           |
|                           |                                                    |
| - 文件树导航               | - 源码编辑                                         |
| - 文件夹折叠/展开          | - 预览                                             |
|                           |                                                    |
+---------------------------+----------------------------------------------------+
```

### 已实现组件

- **Header.tsx**：顶部栏，模式感知，显示面包屑、状态、操作按钮
- **Breadcrumb.tsx**：文档路径导航
- **Sidebar.tsx**：左侧文件树导航
- **VaultHome.tsx**：vault 模式下无文档选中时的首页
- **WelcomeScreen.tsx**：空模式欢迎页
- **EditorShell.tsx**：CodeMirror 为基础的 Markdown 编辑器

### 缺失组件（设计中）

- Activity rail（左侧图标导航栏）
- 右侧 Inspector 面板
- Properties / Outline / Links 面板
- Library view / Publish queue view

## 4. 目标布局结构（计划）

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

- Activity rail：48px
- Sidebar：默认 260px，可折叠、可调整
- Inspector：默认 320px，可折叠
- Workbench 占剩余空间
- 窄窗口优先收起 inspector，再收起 sidebar

## 5. 命令系统（已实现）

### 5.1 Command Registry

`useCommands` hook 定义 `CommandDef` 类型：

```ts
interface CommandDef {
  id: string;
  title: string;
  aliases?: string[];
  scope?: string[];
  shortcut?: string;
  isEnabled: () => boolean;
  disabledReason?: () => string;
  run: () => void;
}
```

已注册命令：

| ID | 标题 | 快捷键 |
|----|------|--------|
| file.open | Open Markdown file | — |
| workspace.open | Open vault folder | — |
| file.save | Save current file | Ctrl+S |
| file.new | Create new document | — |
| file.rename | Rename current entry | F2 |
| file.delete | Delete current entry | — |
| file.favorite | Toggle favorite | — |
| publish.export | Export static site | — |
| publish.check | Run publish checks | — |
| sync.workspace | Sync vault to cloud workspace | — |
| ai.index | Build AI index | — |
| view.commandPalette | Open command palette | Ctrl+Shift+P |
| view.quickSwitcher | Open quick switcher | Ctrl+O |
| view.focus | Toggle focus mode | — |

### 5.2 Command Palette（已实现）

- 快捷键：`Ctrl+Shift+P`（macOS `Cmd+Shift+P`）
- 模糊搜索命令列表
- 显示快捷键和 disabled reason
- 组件：`CommandPalette.tsx`

### 5.3 Quick Switcher（已实现）

- 快捷键：`Ctrl+O`（macOS `Cmd+O`）
- 空搜索显示最近文档
- 按 title/path 搜索
- Enter 打开，Shift+Enter 创建新文档
- 组件：`QuickSwitcher.tsx`

## 6. 键盘快捷键（已实现）

`useKeyboardShortcuts` hook 定义的快捷键：

| 快捷键 | 动作 |
|--------|------|
| Ctrl+Shift+P | 打开 command palette |
| Ctrl+O | 打开 quick switcher |
| Ctrl+S | 保存文件 |
| Ctrl+R | 预览模式 |
| Ctrl+4 | 分屏模式 |
| Ctrl+Shift+T | 插入表格 |
| Ctrl+B | 加粗 |
| Ctrl+I | 斜体 |
| Ctrl+K | 链接 |
| F2 | 重命名 |
| Escape | 关闭所有弹窗 |

## 7. 模态框系统（已实现）

所有弹窗使用 `@headlessui/react` 的 Dialog 组件：

| 组件 | 用途 |
|------|------|
| CommandPalette | 命令面板 |
| QuickSwitcher | 快速切换 |
| AccountDialog | 账户/云同步设置 |
| ConfirmDialog | 通用确认（基于 ConfirmDialogContext） |
| PromptDialog | 通用输入提示（基于 PromptDialogContext） |
| ConflictDialog | 同步冲突解决 |
| CreateNoteDialog | 创建文档 |
| CreateFolderDialog | 创建文件夹 |
| DeleteFolderDialog | 删除文件夹 |
| MoveFolderDialog | 移动文件夹 |
| SyncPromptDialog | 同步提示 |
| PaletteModal | 通用面板容器 |

## 8. 编辑器（已实现）

- **EditorShell.tsx**：基于 CodeMirror 的 Markdown 编辑器
- 支持模式：Write（编辑）、Split（编辑+预览）、Preview（纯预览）
- 编辑器工具栏命令通过 command 系统触发
- 保存：Ctrl+S 触发 file.save 命令

## 9. Sidebar 文件树（已实现）

- **Sidebar.tsx**：显示 vault 文件树
- 支持文件夹折叠/展开
- 点击文件打开编辑
- 基础文件操作（创建、重命名、删除）

### 缺失功能（计划）

- Favorites section（sidebar 中显示）
- Recent section
- 状态颜色指示（灰/黄/蓝/绿/红）
- 完整右键上下文菜单
- 拖拽移动
- Expand all / Collapse all
- Reveal current file

## 10. 文档状态设计（部分实现）

状态阶梯：

| 状态 | 含义 | 实现情况 |
|------|------|----------|
| Dirty | 编辑器内容与磁盘不同 | ✅ isDirty 状态跟踪 |
| Saved | 已写入本地文件 | ✅ 保存后清除 dirty |
| Synced | 已同步到 web service | ✅ 同步流程已实现 |
| Published | 对外可访问 | ✅ 发布流程已实现 |
| Outdated | 本地比线上新 | ⬜ 未有明确 UI |
| Failed | 同步或发布失败 | ⬜ 错误状态展示有限 |

## 11. 图标与组件规范

- 所有 UI 图标使用 **Heroicons**（`@heroicons/react`）
- 弹窗/下拉使用 **@headlessui/react**
- 操作按钮：图标 + tooltip（隐藏文字标签，用 `title` 属性）
- 用户面向用语："vault" 指本地文件夹，"cloud workspace" 指服务端协作空间
