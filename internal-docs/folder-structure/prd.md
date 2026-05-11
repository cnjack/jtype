# JType 文件夹结构 PRD

状态：已实现
初始日期：2026-05-04
更新日期：2026-05-11

## 1. 背景

JType 支持通过文件夹组织文档，是知识管理的核心能力。用户可以在本地 vault 和云端 workspace 中创建、重命名、移动、删除文件夹，并通过同步保持一致。

### 为什么重要

- 100+ 文档时平铺列表不可用，需要层级结构
- 反映现实的信息层级（项目 > 主题 > 文档）
- 发布站点时文件夹对应 URL 路径，方便 SEO 和导航
- 类似 Obsidian / Notion 的用户心智

## 2. 核心概念

### 2.1 文件夹是一等实体

与原始设计不同，实际实现中文件夹是**一等同步实体**：

- 数据库有 `workspace_folders` 表（id, workspace_id, relative_path, updated_clock）
- 文件夹删除通过 `workspace_folder_deletions` 表追踪（workspace_id, relative_path, deleted_clock）
- 文件夹有自己的同步时钟，在 push/pull 中作为独立实体同步
- 本地通过 `.jtype/sync-folder-bases/` 存储文件夹同步基线

### 2.2 文件夹路径

- 使用 `/` 分隔符
- 有效：`notes/`、`projects/ai/research/`
- 根目录为空字符串
- `validate_folder_name` 拒绝保留名称（`.jtype`、`.git`、`node_modules`、`target`）和无效字符（`<>:"|?*`）

### 2.3 文件夹内容归属

一个文件夹的内容包括：

1. 直接子文件：`relative_path` 为 `folder/filename.md` 的文档
2. 直接子文件夹：路径前缀匹配的子目录
3. 删除文件夹时级联删除所有子文档到回收站

## 3. 功能清单（已实现）

### 3.1 侧边栏文件树

- 展开/折叠文件夹（`expandedFolders` 状态持久化）
- 打开文档时自动展开父文件夹
- 拖拽支持文件和文件夹移动
- 右键菜单：新建文件、新建文件夹、重命名、移动到、复制路径、删除

### 3.2 文件夹操作对话框

- **CreateFolderDialog**：输入文件夹名称，显示父路径，验证名称
- **DeleteFolderDialog**：显示文件夹内容统计，确认删除到回收站
- **MoveFolderDialog**：文件夹树选择器，排除自身防循环

### 3.3 面包屑导航

- Breadcrumb 组件显示当前文件路径
- 每级可点击导航

### 3.4 快速打开增强

- QuickSwitcher 支持 `folder:` 前缀过滤
- 搜索结果显示完整相对路径

### 3.5 云端同步

- 文件夹在 push/pull 中作为独立实体同步
- 文件夹删除通过 `deleted_clock` 追踪
- 本地文件夹同步基线存储在 `.jtype/sync-folder-bases/`

### 3.6 Web API

- `GET /api/v1/workspaces/:workspace_id/folders` — 列出文件夹
- `POST /api/v1/workspaces/:workspace_id/folders` — 创建文件夹
- `DELETE /api/v1/workspaces/:workspace_id/folders/:folder_id` — 删除文件夹

## 4. 后续目标（未实现）

- 文件夹模板
- 文件夹快速访问（Favorites）
- 文件夹内搜索
- 文件夹分享设置
- 批量文件操作
