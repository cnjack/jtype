# JType 文件夹结构 — 实施计划

日期：2026-05-04

## Phase 1: Tauri 后端（P0）

### Step 1.1: 文件夹操作函数

| 文件 | 动作 |
|------|------|
| `src-tauri/src/workspace.rs` | 新增 `create_folder()`、`rename_folder()`、`move_folder()`、`delete_folder()`、`list_folder_contents()`、`validate_folder_name()`、`collect_docs_in_folder()`、`FolderContentsSummary` 类型 |

### Step 1.2: 命令注册

| 文件 | 动作 |
|------|------|
| `src-tauri/src/lib.rs` | 注册 `create_workspace_folder`、`rename_workspace_folder`、`move_workspace_folder`、`delete_workspace_folder`、`list_folder_contents` 命令 |

**验证**: `cargo test --manifest-path src-tauri/Cargo.toml`

---

## Phase 2: 前端基础组件（P0）

### Step 2.1: 类型和 Tauri 包装

| 文件 | 动作 |
|------|------|
| `src/lib/tauri.ts` | 新增 `createFolder()`、`renameFolder()`、`moveFolder()`、`deleteFolder()`、`listFolderContents()` |
| `src/lib/types.ts` | 新增 `FolderContentsSummary` 类型 |

### Step 2.2: AppState 扩展

| 文件 | 动作 |
|------|------|
| `src/app/AppState.tsx` | 新增 `expandedFolders: Set<string>` 状态和 `TOGGLE_EXPAND_FOLDER`、`SET_EXPANDED_FOLDERS` actions |

### Step 2.3: Sidebar 树视图

| 文件 | 动作 |
|------|------|
| `src/components/sidebar/Sidebar.tsx` | 实现展开/折叠树视图，FileTreeNode 递归渲染，拖拽支持 |

**验证**: `npm run build`

---

## Phase 3: 对话框和交互（P0）

### Step 3.1: 右键菜单

| 文件 | 动作 |
|------|------|
| 新建 `src/components/modals/FolderContextMenu.tsx` | 文件夹/文件右键菜单组件 |

### Step 3.2: 创建文件夹对话框

| 文件 | 动作 |
|------|------|
| 新建 `src/components/modals/CreateFolderDialog.tsx` | 输入文件夹名，调用 createFolder |

### Step 3.3: 删除文件夹确认

| 文件 | 动作 |
|------|------|
| 新建 `src/components/modals/FolderDeleteDialog.tsx` | 显示内容统计，选择软删除/保留文档 |

### Step 3.4: 移动到文件夹

| 文件 | 动作 |
|------|------|
| 新建 `src/components/modals/MoveToFolderDialog.tsx` | 文件夹树选择器，排除循环 |

**验证**: `npm run build` + 手动测试 UI

---

## Phase 4: 面包屑和搜索增强（P0）

### Step 4.1: 面包屑导航

| 文件 | 动作 |
|------|------|
| 新建 `src/components/layout/Breadcrumb.tsx` | 路径导航组件 |
| `src/components/editor/EditorShell.tsx` 或 `Header.tsx` | 集成面包屑 |

### Step 4.2: Quick Open 增强

| 文件 | 动作 |
|------|------|
| `src/components/modals/QuickSwitcher.tsx` | 支持 `folder:` 前缀过滤，显示完整路径 |

**验证**: 手动测试

---

## Phase 5: 同步集成（P1）

### Step 5.1: 同步钩子修改

| 文件 | 动作 |
|------|------|
| `src/hooks/useCloudSync.ts` | 确保文件夹重命名/删除正确映射到 `deletedPaths` + 新文档；处理 impacted 路径列表 |

### Step 5.2: useFileSystem 扩展

| 文件 | 动作 |
|------|------|
| `src/hooks/useFileSystem.ts` | 新增 `createFolder()`、`renameFolder()`、`moveFolder()`、`deleteFolder()` 钩子函数 |

**验证**: 手动测试同步流程

---

## Phase 6: 测试（P1）

| 文件 | 动作 |
|------|------|
| `src-tauri/src/workspace.rs` | Rust 单元测试（创建/重命名/移动/删除/验证） |
| `tests/e2e/app.spec.ts` | E2E 文件夹操作和同步测试 |

---

## 执行顺序

```
Phase 1 (Tauri 后端) → Phase 2 (前端基础) → Phase 3 (对话框) → Phase 4 (面包屑+搜索) → Phase 5 (同步) → Phase 6 (测试)
```
