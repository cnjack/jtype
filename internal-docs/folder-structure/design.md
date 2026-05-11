# JType 文件夹结构 技术设计文档

状态：已实现
初始日期：2026-05-04
更新日期：2026-05-11

## 1. 架构概览

### 1.1 设计决策（与原始设计的关键变更）

原始设计提出数据库不单独存储文件夹实体，文件夹隐式来自文档的 `relative_path`。**实际实现中文件夹是一等同步实体**：

- `workspace_folders` 表存储文件夹，有独立的 `updated_clock`
- `workspace_folder_deletions` 表追踪删除
- 文件夹在 push/pull 中与文档并行同步
- 本地通过 `.jtype/sync-folder-bases/` 存储文件夹同步基线

原始设计提出单独的文件夹 Tauri 命令（`create_workspace_folder` 等）。**实际实现使用统一的 entry 命令**：

- `create_workspace_entry`（通过 `EntryKind` 支持文件和文件夹）
- `rename_workspace_entry`
- `delete_workspace_entry`

### 1.2 数据库 Schema

```sql
-- workspace_folders
CREATE TABLE workspace_folders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    workspace_id BIGINT NOT NULL,
    relative_path VARCHAR(1024) NOT NULL,
    updated_clock BIGINT NOT NULL DEFAULT 0,
    UNIQUE KEY (workspace_id, relative_path)
);

-- workspace_folder_deletions
CREATE TABLE workspace_folder_deletions (
    workspace_id BIGINT NOT NULL,
    relative_path VARCHAR(1024) NOT NULL,
    deleted_clock BIGINT NOT NULL,
    PRIMARY KEY (workspace_id, relative_path)
);
```

## 2. Tauri 后端 (workspace.rs)

### 2.1 注册的命令 (lib.rs)

| 命令 | 说明 |
|------|------|
| `create_workspace_entry` | 创建文件或文件夹（通过 EntryKind 区分） |
| `rename_workspace_entry` | 重命名文件或文件夹 |
| `delete_workspace_entry` | 删除文件或文件夹 |
| `collect_sync_folders` | 递归收集 vault 中所有文件夹用于同步 |
| `save_sync_folder_bases` | 保存文件夹同步基线到 `.jtype/sync-folder-bases/` |
| `delete_sync_folder_bases` | 删除指定文件夹的同步基线 |
| `load_sync_folder_bases` | 加载本地文件夹同步基线 |

### 2.2 路径验证 (validate_folder_name)

```rust
// 拒绝的名称：空字符串、超 255 字符、"."、".."、".jtype"、".git"、"node_modules"、"target"
// 拒绝的字符：< > : " | ? *
// 同时存在于 web service 的 util.rs (normalize_folder_path)
```

### 2.3 同步文件夹收集 (collect_sync_folders)

- 递归扫描 vault 目录
- 跳过 `.jtype`、`.git`、`node_modules`、`target` 等保留目录
- 返回 `Vec<SyncFolder>`（包含 relative_path）

### 2.4 同步基线管理

- `save_sync_folder_bases` — 写入 `.jtype/sync-folder-bases/` 文件
- `load_sync_folder_bases` — 读取已知的文件夹基线列表
- `delete_sync_folder_bases` — 从基线中移除已删除的文件夹

## 3. Web Service (handlers/folder.rs)

### 3.1 API 端点

| 端点 | Handler |
|------|---------|
| `GET /api/v1/workspaces/:workspace_id/folders` | `list_folders` |
| `POST /api/v1/workspaces/:workspace_id/folders` | `create_folder` |
| `DELETE /api/v1/workspaces/:workspace_id/folders/:folder_id` | `delete_folder` |

### 3.2 内部函数

| 函数 | 说明 |
|------|------|
| `upsert_folder_with_ancestors` | 创建文件夹及其所有祖先目录 |
| `load_folders_since(pool, workspace_id, since_clock)` | 加载指定 clock 之后更新的文件夹（用于 sync pull） |
| `load_deleted_folders_since(pool, workspace_id, since_clock)` | 加载指定 clock 之后删除的文件夹 |
| `record_folder_deletion` | 记录文件夹删除事件 |
| `delete_folder_by_path` | 按路径删除文件夹 |

### 3.3 同步集成 (sync.rs)

- **Pull**: 返回 `folders` 和 `deleted_folders`，使用 `updated_clock` / `deleted_clock`
- **Push**: 接收 `folders` 和 `deleted_folders` 数组，分别执行 upsert 和删除记录

## 4. 前端

### 4.1 AppState

```typescript
expandedFolders: Set<string>;  // 展开的文件夹相对路径
// Actions: TOGGLE_EXPAND_FOLDER, SET_EXPANDED_FOLDERS
// 打开文档时自动展开父文件夹
```

### 4.2 Sidebar 树视图

- TreeNode 递归渲染 `FileTreeNode`
- 文件夹显示 ChevronRight（旋转表示展开）+ FolderIcon + 名称
- 支持 `draggable` 拖拽和 `onDrop` 放置
- 右键菜单区分文件夹和文件

### 4.3 对话框组件

| 组件 | 位置 | 说明 |
|------|------|------|
| `CreateFolderDialog` | `src/components/modals/CreateFolderDialog.tsx` | 输入名称，验证，调用 createFolder |
| `DeleteFolderDialog` | `src/components/modals/DeleteFolderDialog.tsx` | 显示内容统计，确认删除 |
| `MoveFolderDialog` | `src/components/modals/MoveFolderDialog.tsx` | 文件夹树选择器，排除循环 |

### 4.4 Breadcrumb

- `src/components/layout/Breadcrumb.tsx`
- 从 currentRelativePath 分割路径显示导航

### 4.5 Quick Open

- `QuickSwitcher` 支持 `folder:` 前缀过滤
- 搜索结果显示完整相对路径

### 4.6 useFileSystem hooks

- `createFolder(folderRelativePath)` — 调用 Tauri + 通知云端 REST + 触发 sync push
- `renameFolder(from, to)` — 重命名文件夹及内部文档路径

### 4.7 tauri.ts 包装

```typescript
createFolder(rootPath, folderRelativePath): Promise<WorkspaceSnapshot>
renameFolder(rootPath, from, to): Promise<[WorkspaceSnapshot, string[]]>
// 使用 create_workspace_entry / rename_workspace_entry 的统一命令
```

## 5. 同步行为

### 5.1 文件夹同步流程

```
Push:
  1. collect_sync_folders() 获取当前 vault 所有文件夹
  2. 与 sync-folder-bases 对比
     - 新增文件夹 → push folders[]
     - 消失文件夹 → push deleted_folders[]
  3. 云端 upsert/record_deletion
  4. 更新本地 sync-folder-bases

Pull:
  1. load_folders_since(clock) 获取新增/更新的文件夹
  2. load_deleted_folders_since(clock) 获取已删除的文件夹
  3. 本地创建/删除对应目录
  4. 更新 sync-folder-bases
```

### 5.2 clock 计算

- Pull 响应的 `next_clock` 取 folders 和 deleted_folders 的 clock 最大值
- 文件夹和文档的 clock 独立但在同一个 pull 响应中返回

## 6. 跨平台一致性

| 工具函数 | Tauri (workspace.rs) | Web Service (util.rs) |
|----------|---------------------|-----------------------|
| `validate_folder_name` | ✓ | ✓ (normalize_folder_path) |

修改任一侧时必须同步更新另一侧的保留名称列表和验证逻辑。

## 7. 错误处理

| 错误 | 场景 | 处理 |
|------|------|------|
| 文件夹已存在 | 创建时目标已存在 | 提示用户重试 |
| 路径太长 | 名称超过 255 字符 | 拒绝操作 |
| 无效字符 | 名称包含 `<>:"\|?*` | 提示移除无效字符 |
| 保留名称 | `.jtype`、`.git` 等 | 拒绝操作 |
| 循环移动 | 将文件夹移入自身子文件夹 | 拒绝操作 |
