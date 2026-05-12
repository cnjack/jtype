# JType 共享 UI 组件层 技术设计文档

状态：提案
初始日期：2026-05-12

## 1. 背景与动机

JType 有两个独立的 React 前端：

| 维度 | Desktop（Tauri） | Web |
|------|-----------------|-----|
| 入口 | `src/` | `services/jtype-web/frontend/src/` |
| 构建 | Vite + Tauri | Vite |
| 路由 | 无（模式切换：empty / workspace / single-file） | react-router-dom v7 |
| 数据 | Tauri `invoke()` IPC → Rust 本地文件系统 | `fetch` → Axum REST API |
| 状态 | `useReducer` + Context（集中式） | 页面级 `useState`（分散式） |

两端共享了近乎相同的技术栈（React 19、Tailwind CSS 4、@headlessui/react、@heroicons/react、marked、DOMPurify、KaTeX、Mermaid、morphdom），但 UI 组件各自维护，导致：

1. **同一功能写两遍**：编辑器、预览、工具栏、侧边栏文件树、冲突解决、弹窗等。
2. **样式不一致**：Desktop 硬编码 hex（`#008884`），Web 使用 `@theme` CSS 变量（`text-brand`）。
3. **修一端忘另一端**：已知重复文件（`markdown.ts`、`frontmatter.ts`、`http.ts`）和 20+ 重复 CSS 类。
4. **Web 端 Workspace.tsx 超 1200 行**，编辑器/侧边栏/设置/成员/域名/回收站全内联，无法复用。

## 2. 现状盘点

### 2.1 组件对照

| 功能领域 | Desktop 组件 | Web 组件 | 重叠度 |
|----------|-------------|---------|--------|
| Markdown 预览渲染 | `EditorShell` 内 `renderToContainer` | `Workspace` 内 `renderToContainer` | ✅ 相同算法 |
| 编辑器 textarea + 工具栏 | `EditorShell` | `Workspace` 内联 | ✅ 相同图标集、相同快捷键 |
| 视图模式切换（write/split/preview） | `EditorShell` | `Workspace` 内联 | ✅ 相同状态机 |
| 滚动同步 | `EditorShell` | `Workspace` 内联 | ✅ 相同算法 |
| PromptDialog（文本输入弹窗） | `PromptDialog.tsx` + Context | `PromptDialog.tsx` + Context | ✅ 近乎相同 API |
| ConfirmDialog（确认弹窗） | `ConfirmDialog.tsx` + Context | `PromptDialog.tsx` 内联导出 | ⚠️ 相似，API 不同 |
| 冲突解决三面板 | `ConflictDialog.tsx`（Dialog 模态） | `ConflictResolver.tsx`（内嵌） | ⚠️ 相似布局，容器不同 |
| 侧边栏文件树 | `Sidebar.tsx` | `Workspace.tsx` 内联 | ⚠️ 相似交互，数据源不同 |
| Header / 用户菜单 | `Header.tsx` | `Layout.tsx` | ⚠️ 相似结构 |
| 浮动工具提示 | `EditorShell` 内 tooltip 逻辑 | `Workspace` 内 tooltip 逻辑 | ✅ 相同模式 |
| 文件夹创建/删除/移动弹窗 | 独立 Dialog 组件 | `Workspace` 内联 | ⚠️ 相似 |
| 命令面板 / 快速切换 | `CommandPalette` + `QuickSwitcher` | 无 | Desktop 独有 |
| OAuth / 账户 | `AccountDialog` | `AuthContext` + `Login` | 完全不同 |
| 欢迎页 / 落地页 | `WelcomeScreen` | `Landing` | 完全不同 |

### 2.2 共享 lib 文件现状

| 文件 | 状态 | 差异 |
|------|------|------|
| `markdown.ts` | 🟢 功能一致 | 逐行近似相同 |
| `frontmatter.ts` | 🟢 功能一致 | Web 内联定义 `FrontmatterParse` 类型；Desktop 多一个 `titleFromMarkdown()` |
| `http.ts` | 🟢 完全一致 | 逐字节相同 |
| `utils.ts` | 🔴 大幅不同 | Desktop ~100 行 15+ 函数；Web ~12 行仅 `fuzzyMatch` + `EditorMode` |

### 2.3 CSS 重复类（两端均定义）

以下 CSS 组件类在两个 `styles.css` / `index.css` 中均有定义：

`toolbar-button` `toolbar-button-primary` `sidebar-action` `sync-input` `workspace-row` `workspace-row-bound` `editor-tool` `view-mode-button` `view-mode-button-active` `subtle-button` `compact-select` `status-chip` `status-chip-neutral` `status-chip-warning` `status-chip-success` `header-action-group` `header-icon-button` `header-icon-button-primary` `header-icon-button-warning` `header-icon-button-danger` `header-tooltip` `header-tooltip-label` `floating-tooltip` `field-label` `field-input` `field-textarea` `tree-button` `tree-button-active` `document-info-section` `context-menu` `context-menu-button` `panel-card` `command-row` `soft-scrollbar`

但两端实现存在颜色差异：Desktop 使用 `text-[#008884]`，Web 使用 `text-brand`。

### 2.4 不可共享的平台绑定

| Desktop 独有（Tauri 依赖） | Web 独有 |
|---------------------------|---------|
| `useFileSystem` / `useFileWatcher`（Tauri IPC） | `api.ts`（REST 客户端） |
| `useCloudSync` / `useEagerSync`（Tauri invoke） | `useWorkspaceSocket`（WebSocket） |
| `AccountDialog`（设备 OAuth 流程） | `useOfflineSync`（IndexedDB） |
| `WelcomeScreen`（原生文件对话框） | `AuthContext`（token 认证） |
| `SyncPromptDialog`（桌面入职流程） | React Router 页面（Login、Admin、Landing） |

## 3. 设计方案

### 3.1 方案选型

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A. Monorepo workspace package | 在根目录创建 `packages/ui/`，发布为内部包 | 版本控制、独立测试 | 需配置 monorepo 工具（turborepo/nx），构建链复杂 |
| B. 路径别名共享目录 | 创建 `shared/` 目录，两端 Vite 配置 `resolve.alias` | 零构建开销、改完即生效 | 无法独立版本控制，alias 配置散落两端 |
| C. Git submodule | 共享代码独立仓库 | 版本隔离 | 开发体验差，同步困难 |

**推荐方案 B**：路径别名共享目录。理由：

- 项目规模适中，不需要 monorepo 的版本管理开销。
- 两端已使用相同的 Vite + Tailwind + React 技术栈，`resolve.alias` 是零成本方案。
- 可随时升级到方案 A（把 `shared/` 变成 `packages/ui/`），不破坏现有结构。

### 3.2 目录结构

```
jtype/
├── shared/
│   ├── components/         # 共享 React 组件
│   │   ├── ConfirmDialog.tsx
│   │   ├── PromptDialog.tsx
│   │   ├── PromptDialogContext.tsx
│   │   ├── ConfirmDialogContext.tsx
│   │   ├── ConflictResolver.tsx
│   │   ├── MarkdownPreview.tsx
│   │   ├── EditorToolbar.tsx
│   │   ├── ViewModeToggle.tsx
│   │   ├── FloatingTooltip.tsx
│   │   ├── FileTreeNode.tsx
│   │   ├── ContextMenu.tsx
│   │   ├── StatusChip.tsx
│   │   └── index.ts
│   ├── hooks/              # 共享 React hooks
│   │   ├── useScrollSync.ts
│   │   ├── useFloatingTooltip.ts
│   │   ├── usePrompt.ts
│   │   ├── useConfirm.ts
│   │   └── index.ts
│   ├── lib/                # 共享工具库
│   │   ├── markdown.ts
│   │   ├── frontmatter.ts
│   │   ├── http.ts
│   │   ├── utils.ts        # fuzzyMatch, slugify, basename 等纯函数
│   │   └── types.ts        # FrontmatterParse, EditorMode 等共享类型
│   └── styles/
│       ├── tokens.css      # 设计令牌（颜色、间距、圆角）
│       ├── components.css  # 共享 CSS 组件类
│       └── preview.css     # Markdown 预览样式
├── src/                    # Desktop 前端（不变）
├── services/jtype-web/frontend/src/  # Web 前端（不变）
```

### 3.3 Vite 别名配置

**Desktop `vite.config.ts`**：

```ts
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  // ...existing config
})
```

**Web `services/jtype-web/frontend/vite.config.ts`**：

```ts
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../../shared'),
    },
  },
  // ...existing config
})
```

两端对应的 `tsconfig.json` 增加 paths 映射：

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["./shared/*"]  // Desktop
      // 或 Web: "../../../shared/*"
    }
  }
}
```

### 3.4 设计令牌统一

创建 `shared/styles/tokens.css`，统一所有颜色/间距/圆角变量：

```css
@theme {
  --color-brand: #008884;
  --color-brand-light: #22b8ad;
  --color-brand-dark: #006f6b;
  --color-brand-soft: #e8f6f2;
  --color-brand-gray: #6f817a;
  --color-line: rgb(13 13 12 / 0.06);
}
```

两端 CSS 入口文件均 `@import '@shared/styles/tokens.css'`，然后所有组件统一使用 `text-brand`、`bg-brand-dark` 等 Tailwind 语义类，**不再硬编码 hex**。

### 3.5 共享组件设计原则

#### 原则 1：Props-in, Callbacks-out

共享组件只接受 props 和回调，不直接调用 Tauri invoke / fetch API。

```tsx
// ✅ 共享组件
interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

// ❌ 不要在共享组件里做这种事
import { invoke } from '@tauri-apps/api/core'
```

#### 原则 2：数据适配在平台层

共享组件定义接口（如 `FileTreeNodeData`），平台层负责将 Tauri IPC 数据或 REST API 数据转换为该接口。

```tsx
// shared/components/FileTreeNode.tsx
export interface FileTreeNodeData {
  name: string
  path: string
  isFolder: boolean
  children?: FileTreeNodeData[]
  isExpanded?: boolean
}

interface FileTreeNodeProps {
  node: FileTreeNodeData
  depth: number
  isActive: boolean
  onSelect: (path: string) => void
  onToggle: (path: string) => void
  onContextMenu?: (e: React.MouseEvent, path: string) => void
}
```

#### 原则 3：样式通过 Tailwind 类组合 + CSS 变量

共享组件使用语义化 Tailwind 类（`text-brand`、`bg-brand-soft`）或 `shared/styles/components.css` 中的预定义类。不使用 hardcoded hex。

#### 原则 4：可选功能用 slot / render props

某些功能仅在一端需要时，用 slot 或 render props 扩展，而不是在共享组件中加条件分支。

```tsx
// 共享 EditorToolbar 有基础格式按钮
// Desktop 通过 extraActions 添加发布状态、收藏等
<EditorToolbar
  onBold={...}
  onItalic={...}
  extraActions={<PublishStatusChip />}
/>
```

## 4. 实施计划

### Phase 0：基础设施（1 天）

1. 创建 `shared/` 目录结构。
2. 配置两端 Vite `resolve.alias` 和 `tsconfig.json` paths。
3. 创建 `shared/styles/tokens.css`，从 Desktop `styles.css` 和 Web `index.css` 提取统一设计令牌。
4. 两端 CSS 入口文件改为 `@import '@shared/styles/tokens.css'`。
5. 验证两端 `npm run dev` / `npm run build` 正常工作。

### Phase 1：共享 lib 层（1 天）

将已确认一致的 lib 文件迁移到 `shared/lib/`：

| 文件 | 迁移动作 |
|------|---------|
| `markdown.ts` | 移入 `shared/lib/`，两端改为 `import from '@shared/lib/markdown'` |
| `frontmatter.ts` | 移入 `shared/lib/`，内联 `FrontmatterParse` 类型，补齐 `titleFromMarkdown` |
| `http.ts` | 移入 `shared/lib/`，两端改为 `import from '@shared/lib/http'` |
| `utils.ts` | 提取共享纯函数（`fuzzyMatch`、`slugify`、`basename`、`escapeHtml`）到 `shared/lib/utils.ts`，平台特有函数留原处 |

### Phase 2：共享样式层（1 天）

1. 提取两端重复的 CSS 组件类到 `shared/styles/components.css`。
2. 提取 `.preview` Markdown 渲染样式到 `shared/styles/preview.css`。
3. Desktop `styles.css` 改为 `@import '@shared/styles/components.css'` + 仅保留 Desktop 独有类。
4. Web `index.css` 改为 `@import '@shared/styles/components.css'` + 仅保留 Web 独有类。
5. **将 Desktop 中所有 hardcoded hex 替换为 `@theme` 语义类**（如 `text-[#008884]` → `text-brand`）。

### Phase 3：共享弹窗组件（2 天）

1. 将 `PromptDialog` 迁移到 `shared/components/`：
   - 统一 props 接口（`open`、`title`、`defaultValue`、`confirmLabel`、`onConfirm`、`onClose`）。
   - 颜色改用 `text-brand`、`bg-brand` 等语义类。
   - 两端删除各自实现，改为 `import from '@shared/components'`。

2. 将 `ConfirmDialog` 迁移到 `shared/components/`：
   - 统一为 props-based API（放弃 Desktop 的 hook-based 特殊模式）。
   - 保留 `useConfirm()` Context 在 `shared/hooks/`。

3. 创建 `shared/components/ConflictResolver.tsx`：
   - 纯 UI 组件：接受 `localContent`、`cloudContent`、`onResolve(resolution)` props。
   - Desktop 包装为 Dialog 模态，Web 内嵌使用。

### Phase 4：共享编辑器组件（3 天）

这是工作量最大的阶段，因为 Web 端需要先拆分 `Workspace.tsx`。

1. **先决条件**：将 Web `Workspace.tsx`（1200+ 行）拆分为：
   - `WorkspaceSidebar.tsx`
   - `WorkspaceEditor.tsx`
   - `WorkspaceSettings.tsx`
   - `WorkspaceMembers.tsx`
   - `WorkspaceTrash.tsx`

2. 提取 `shared/components/MarkdownPreview.tsx`：
   - 封装 `renderToContainer` + preview 容器 + scroll sync。
   - Props：`content: string`、`containerRef`。

3. 提取 `shared/components/EditorToolbar.tsx`：
   - 基础格式按钮（bold、italic、link、code、heading、list、table）。
   - `extraActions` slot 用于平台扩展。

4. 提取 `shared/components/ViewModeToggle.tsx`：
   - 三态切换（write / split / preview）。

5. 提取 `shared/hooks/useScrollSync.ts`：
   - 编辑器与预览的双向滚动同步算法。

### Phase 5：共享文件树组件（2 天）

1. 定义 `FileTreeNodeData` 接口（在 `shared/lib/types.ts`）。
2. 提取 `shared/components/FileTreeNode.tsx`：纯渲染组件，展开/折叠/选中/右键菜单。
3. 提取 `shared/components/ContextMenu.tsx`：通用右键菜单组件。
4. Desktop `Sidebar.tsx` 用适配器将 Tauri 文件树数据转换为 `FileTreeNodeData`。
5. Web 侧边栏用适配器将 REST API 数据转换为 `FileTreeNodeData`。

## 5. 迁移策略

### 5.1 逐步替换，不做大重写

每个 Phase 独立可交付。完成一个 Phase 后两端均可正常构建运行，再进入下一个 Phase。

### 5.2 迁移步骤（以 PromptDialog 为例）

```
1. 将 src/components/modals/PromptDialog.tsx 复制到 shared/components/PromptDialog.tsx
2. 修改颜色引用：hardcoded hex → semantic class
3. Desktop: 将 import 改为 '@shared/components/PromptDialog'，删除原文件
4. Web: 将 import 改为 '@shared/components/PromptDialog'，删除原文件
5. 验证两端构建 + 运行
```

### 5.3 验证清单

每个 Phase 完成后：

- [ ] `npm run build`（Desktop 前端构建通过）
- [ ] `cd services/jtype-web/frontend && npm run build`（Web 前端构建通过）
- [ ] `npm run tauri dev`（Desktop 开发模式正常）
- [ ] Web 开发模式正常
- [ ] 视觉对比：共享组件在两端外观一致

## 6. 最终目标状态

```
shared/
├── components/           # 12 个共享组件
│   ├── ConfirmDialog.tsx
│   ├── PromptDialog.tsx
│   ├── ConflictResolver.tsx
│   ├── MarkdownPreview.tsx
│   ├── EditorToolbar.tsx
│   ├── ViewModeToggle.tsx
│   ├── FloatingTooltip.tsx
│   ├── FileTreeNode.tsx
│   ├── ContextMenu.tsx
│   ├── StatusChip.tsx
│   ├── PromptDialogContext.tsx
│   ├── ConfirmDialogContext.tsx
│   └── index.ts
├── hooks/                # 4 个共享 hooks
│   ├── useScrollSync.ts
│   ├── useFloatingTooltip.ts
│   ├── usePrompt.ts
│   └── useConfirm.ts
├── lib/                  # 4 个共享 lib
│   ├── markdown.ts
│   ├── frontmatter.ts
│   ├── http.ts
│   ├── utils.ts
│   └── types.ts
└── styles/               # 3 个共享样式文件
    ├── tokens.css
    ├── components.css
    └── preview.css
```

**预期收益**：

| 指标 | 当前 | 目标 |
|------|------|------|
| 重复 lib 文件 | 3 对（6 个文件） | 0（3 个共享文件） |
| 重复 CSS 类 | 30+ 个类两端各写一遍 | 0（统一在 `components.css`） |
| 重复组件 | PromptDialog, ConfirmDialog, ConflictResolver, 编辑器/预览/工具栏 | 0（12 个共享组件） |
| Web `Workspace.tsx` | ~1200 行 mega-component | 拆分为 5 个模块，编辑器部分复用共享组件 |
| 新 UI 变更同步成本 | 改两处 | 改一处 |

## 7. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Tailwind v4 `@theme` 在 alias 路径下不生效 | 样式丢失 | Phase 0 先验证 alias + `@theme` 的兼容性 |
| Web `Workspace.tsx` 拆分引入回归 | 功能异常 | Phase 4 先写 E2E 测试覆盖核心编辑流程，再拆分 |
| 两端 React 版本微差（19.2.5 vs 19.1.0） | 运行时差异 | 对齐到同一小版本 |
| 共享组件 API 变更需要两端同步更新 | 构建失败 | TypeScript 类型检查自然保障，CI 同时构建两端 |
| Desktop `useReducer` 与 Web `useState` 状态模式差异 | 共享组件的状态传入方式不同 | 共享组件只接受 props，不感知状态管理模式 |

## 8. 未来演进

- 当项目规模增长到需要独立版本控制时，可将 `shared/` 升级为 monorepo workspace package（Turborepo / pnpm workspaces）。
- 可考虑用 Storybook 为共享组件建立可视化文档和交互测试。
- 长期可考虑统一两端状态管理方案（如 Zustand），进一步降低适配成本。
