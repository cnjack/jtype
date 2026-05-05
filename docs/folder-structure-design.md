# JType 文件夹结构 技术设计文档

日期：2026-05-04

## 1. 架构概览

### 1.1 文件夹在现有系统中的位置

JType 已经通过 `relative_path` 隐式支持嵌套目录结构。设计核心思想：

- **文件系统事实**: 本地 vault 中的实际文件夹和文件
- **隐式文件夹**: 由文档的 `relative_path` 推导，数据库**不单独存储 folder entity**
- **同步策略**: 文档路径变更时，对应的"文件夹操作"映射为文档路径的改变

### 1.2 设计决策

1. **数据库层不单独存 folder entity** — 文件夹隐式来自 `relative_path`
2. **本地和云端对称** — 本地是真实文件夹，云端通过路径推导
3. **文件夹操作的含义**:
   - 创建文件夹: 本地创建目录，push 时因文档路径包含该目录而隐式同步
   - 重命名文件夹: 递归更新所有子文档的 `relative_path`，sync 映射为多个文档 rename
   - 移动文件夹: 验证无循环移动，递归更新所有子文档路径
   - 删除文件夹: 级联删除所有子文档到回收站，push 时进入 `deletedPaths`

## 2. Tauri 后端修改 (workspace.rs)

### 2.1 新增命令概览

```rust
pub fn create_folder(root: &Path, folder_relative_path: &str) -> Result<(), String>
pub fn rename_folder(root: &Path, from_relative: &str, to_relative: &str) -> Result<Vec<String>, String>
pub fn move_folder(root: &Path, from_relative: &str, to_relative: &str) -> Result<Vec<String>, String>
pub fn delete_folder(root: &Path, folder_relative_path: &str, soft_delete: bool) -> Result<Vec<String>, String>
pub fn list_folder_contents(root: &Path, folder_relative_path: &str) -> Result<FolderContentsSummary, String>
```

### 2.2 create_folder

```rust
pub fn create_folder(root: &Path, folder_relative_path: &str) -> Result<(), String> {
    let folder_path = safe_join(root, folder_relative_path)?;
    if folder_path.exists() {
        return Err("Folder already exists.".to_string());
    }
    validate_folder_name(folder_relative_path)?;
    fs::create_dir_all(&folder_path).map_err(|e| format!("Failed to create folder: {}", e))
}
```

### 2.3 rename_folder

```rust
pub fn rename_folder(root: &Path, from_relative: &str, to_relative: &str)
    -> Result<Vec<String>, String>
{
    let from_path = safe_join(root, from_relative)?;
    if !from_path.is_dir() {
        return Err("Source folder not found.".to_string());
    }
    validate_folder_name(to_relative)?;
    let to_path = safe_join(root, to_relative)?;
    if to_path.exists() {
        return Err("Target folder already exists.".to_string());
    }
    if let Some(parent) = to_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let impacted = collect_docs_in_folder(root, from_relative)?;
    fs::rename(&from_path, &to_path).map_err(|e| e.to_string())?;
    Ok(impacted)
}
```

### 2.4 move_folder

```rust
pub fn move_folder(root: &Path, from_relative: &str, to_relative: &str)
    -> Result<Vec<String>, String>
{
    if to_relative.starts_with(&format!("{}/", from_relative)) {
        return Err("Cannot move folder into itself.".to_string());
    }
    let from_path = safe_join(root, from_relative)?;
    if !from_path.is_dir() {
        return Err("Source folder not found.".to_string());
    }
    let to_path = safe_join(root, to_relative)?;
    if to_path.exists() {
        return Err("Target location already exists.".to_string());
    }
    if let Some(parent) = to_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let impacted = collect_docs_in_folder(root, from_relative)?;
    fs::rename(&from_path, &to_path).map_err(|e| e.to_string())?;
    Ok(impacted)
}
```

### 2.5 delete_folder

```rust
pub fn delete_folder(root: &Path, folder_relative_path: &str, soft_delete: bool)
    -> Result<Vec<String>, String>
{
    let folder_path = safe_join(root, folder_relative_path)?;
    if !folder_path.is_dir() {
        return Err("Folder not found.".to_string());
    }
    let impacted = collect_docs_in_folder(root, folder_relative_path)?;
    if impacted.is_empty() {
        fs::remove_dir(&folder_path).map_err(|e| e.to_string())?;
        return Ok(Vec::new());
    }
    if soft_delete {
        for doc_relative_path in &impacted {
            trash_entry(root, doc_relative_path)?;
        }
        // 清理空目录
        let _ = fs::remove_dir_all(&folder_path);
    } else {
        fs::remove_dir_all(&folder_path).map_err(|e| e.to_string())?;
    }
    Ok(impacted)
}
```

### 2.6 list_folder_contents

```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderContentsSummary {
    pub folder_name: String,
    pub total_documents: usize,
    pub total_subfolders: usize,
    pub document_names: Vec<String>,
}
```

### 2.7 路径验证

```rust
fn validate_folder_name(name: &str) -> Result<(), String> {
    if name.is_empty() { return Err("Folder name cannot be empty.".to_string()); }
    if name.len() > 255 { return Err("Folder name too long.".to_string()); }
    if name == "." || name == ".." || name == ".jtype" {
        return Err(format!("'{}' is a reserved name.", name));
    }
    for c in name.chars() {
        if matches!(c, '<' | '>' | ':' | '"' | '|' | '?' | '*') {
            return Err(format!("Invalid character '{}'.", c));
        }
    }
    Ok(())
}
```

### 2.8 lib.rs 命令注册

```rust
#[tauri::command]
fn create_workspace_folder(root_path: String, folder_relative_path: String)
    -> Result<WorkspaceSnapshot, String>;
#[tauri::command]
fn rename_workspace_folder(root_path: String, from_relative_path: String, to_relative_path: String)
    -> Result<(WorkspaceSnapshot, Vec<String>), String>;
#[tauri::command]
fn move_workspace_folder(root_path: String, from_relative_path: String, to_relative_path: String)
    -> Result<(WorkspaceSnapshot, Vec<String>), String>;
#[tauri::command]
fn delete_workspace_folder(root_path: String, folder_relative_path: String, soft_delete: bool)
    -> Result<(WorkspaceSnapshot, Vec<String>), String>;
#[tauri::command]
fn list_folder_contents(root_path: String, folder_relative_path: String)
    -> Result<FolderContentsSummary, String>;
```

## 3. 前端修改

### 3.1 AppState 扩展

```typescript
// 新增：文件夹树展开/折叠状态
expandedFolders: Set<string>;  // 存储展开的文件夹相对路径

// 状态持久化：localStorage key = workspace_${rootPath}_expanded_folders
```

### 3.2 Sidebar 树视图 (TreeNode)

```typescript
interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
  isExpanded: boolean;
  onToggleExpand: (relativePath: string) => void;
  onContextMenu: (node: FileTreeNode, x: number, y: number) => void;
  onDragStart?: (node: FileTreeNode) => void;
  onDrop?: (target: FileTreeNode, source: FileTreeNode) => void;
  selectedPath?: string;
}
```

- 文件夹显示 `ChevronRightIcon`（旋转表示展开/折叠）+ `FolderIcon` + 名称
- 文件显示 `DocumentTextIcon` + 名称
- 支持拖拽（`draggable`）和右键菜单

### 3.3 右键菜单 (FolderContextMenu)

**文件夹菜单项**：新建文件、新建文件夹、重命名、移动到、复制路径、删除、在系统中显示

**文件菜单项**：打开、预览打开、重命名、移动到、复制路径、删除、在系统中显示

### 3.4 对话框组件

#### CreateFolderDialog

- 输入文件夹名称，显示父文件夹路径
- 验证名称，调用 `tauri.createFolder()`

#### FolderDeleteDialog

- 显示文件夹内容统计（文档数、子文件夹数）
- 两个选项：保留文档 / 删除到回收站
- 调用 `tauri.deleteFolder(rootPath, path, softDelete)`

#### MoveToFolderDialog

- 文件夹树选择器（FolderTreePicker）
- 排除自身路径防止循环移动
- 显示目标路径预览

### 3.5 面包屑导航 (Breadcrumb)

```typescript
// src/components/layout/Breadcrumb.tsx
// 从 currentRelativePath 分割路径，显示每一级可点击的导航
// vault > projects > ai > research > paper.md
```

### 3.6 tauri.ts 包装函数

```typescript
createFolder(rootPath: string, folderRelativePath: string): Promise<void>;
renameFolder(rootPath: string, from: string, to: string): Promise<{snapshot, impacted}>;
moveFolder(rootPath: string, from: string, to: string): Promise<{snapshot, impacted}>;
deleteFolder(rootPath: string, path: string, softDelete: boolean): Promise<{snapshot, impacted}>;
listFolderContents(rootPath: string, path: string): Promise<FolderContentsSummary>;
```

## 4. 同步行为 (Cloud Sync)

### 4.1 文件夹重命名的同步映射

```
本地重命名 projects/ → archive/
  → 旧路径文档 (projects/meeting.md) 在 syncBases 中存在但本地不存在
  → 识别为"本地删除" → 加入 deletedPaths
  → 新路径文档 (archive/meeting.md) 在本地存在但 syncBases 不存在
  → 识别为"本地创建" → 作为新文档 push
  → 云端结果：旧文档软删除，新文档创建
```

### 4.2 文件夹删除的同步映射

```
本地删除 notes/archive/ (含 3 个文档)
  → 文档移入 .jtype/trash/
  → Sync Push 发送 deletedPaths = [notes/archive/old1.md, ...]
  → 云端将这些文档移入 document_trash
  → 其他设备 Pull 获取 deletedPaths → 本地也删除
```

### 4.3 文件夹结构冲突

```
Local:  meetings/ → meet-logs/
Cloud:  meetings/ → meet-records/

Sync merge 检测到 relative_path 冲突
  → 提示用户选择：
    1. 使用本地版本 (meet-logs/)
    2. 使用云端版本 (meet-records/)
    3. 保留两个版本
```

## 5. 快速打开 / 搜索集成

### 5.1 Quick Open 增强

- 支持 `folder:` 前缀过滤：`folder:projects` 只搜索 projects 内的文件
- 搜索结果显示完整相对路径，帮助区分同名文档
- 打开文档后侧边栏自动展开到该文件所在文件夹

### 5.2 搜索结果格式

```
文件名 (粗体)
  完整相对路径 (小字灰色)
```

## 6. Web Dashboard 修改

### 6.1 文档列表树视图

- 工作空间页面增加展开/折叠的文件夹树
- 文件夹图标 + 名称 + 子项计数
- 文件图标 + 名称 + 相对路径

### 6.2 发布时保留文件夹结构

```
本地: archive/2024/blog/post.md
发布: /u/username/archive/2024/blog/post
```

## 7. 错误处理

| 错误 | 场景 | 处理 |
|------|------|------|
| 文件夹已存在 | 新建时目标已存在 | 提示用户重试 |
| 路径太长 | 嵌套超过系统限制 | 提示减少嵌套深度 |
| 无效字符 | 名称包含 `<>:"\|?*` | 提示移除无效字符 |
| 循环移动 | 将文件夹移入子文件夹 | 提示不能移入自己的子文件夹 |
| 权限错误 | 文件系统无写入权限 | 提示权限不足 |
| 同步冲突 | Pull 时本地文件夹被云端删除 | 提示冲突，选择保留或接受 |

## 8. 测试策略

### 8.1 Rust 单元测试

```rust
#[test] fn test_create_folder() { /* 创建成功、重复创建报错 */ }
#[test] fn test_rename_folder_updates_docs() { /* 子文档路径自动更新 */ }
#[test] fn test_move_folder_circular_check() { /* 循环移动被拒绝 */ }
#[test] fn test_delete_folder_soft_delete() { /* 文档移入回收站 */ }
#[test] fn test_validate_folder_name() { /* 非法字符被拒绝 */ }
```

### 8.2 E2E 测试 (Playwright)

| 场景 | 验证内容 |
|------|--------|
| 创建文件夹 | 树中显示新文件夹 |
| 重命名文件夹 | 子文档路径更新 |
| 删除文件夹 | 确认对话框、文档进入回收站 |
| 拖拽文件到文件夹 | 路径正确变更 |
| 文件夹操作同步到云端 | 云端文档路径一致 |

---

文档版本：1.0
日期：2026-05-04
