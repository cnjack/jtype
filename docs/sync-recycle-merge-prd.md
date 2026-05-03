# JType 同步增强 PRD：回收站 + Git 级智能合并 + 自动同步

日期：2026-05-03

## 1. 背景

当前同步系统存在三个核心缺口：

| 场景 | 现状 |
|------|------|
| 云端有人编辑了文档 | 本地无法感知，只有手动点同步才能拉取 |
| 用户在外部工具编辑了本地 vault 文件 | App 内存中的内容不会刷新 |
| 定期自动同步 | 不存在，仅保存后触发一次 autoSync（且需已绑定 workspace） |
| 删除文件 | 硬删除，不可恢复（云端 `DELETE FROM documents`，本地直接 `fs::remove_file`） |
| 合并算法 | 要求三份内容行数完全相同，不支持插入/删除，不同段落修改可能因行号错位而冲突 |

### 1.1 当前合并算法的问题

`util.rs:243-277` 中的 `three_way_merge`：

1. **行数不等 → 立即冲突**：`base_lines.len() != local_lines.len() || base_lines.len() != cloud_lines.len()` 直接返回 Conflict
2. **逐行对齐**：用行号索引比较 `base[i]` vs `local[i]` vs `cloud[i]`，不理解变更结构
3. **无法处理插入/删除**：因为只做了等长数组的逐元素对比
4. **不同段落修改可能误冲突**：如果 local 在第 5 行插入了一行，后续所有行号偏移 +1，导致错位

## 2. 产品目标

1. **数据安全**：删除可恢复，30 天回收站
2. **协作无感**：不同区域编辑自动合并，只有同一区域编辑才冲突
3. **实时同步**：自动拉取云端变更，自动监听本地变更，定时双向同步

## 3. 功能需求

### 3.1 FEAT-RECYCLE：回收站

#### 3.1.1 云端回收站

**数据库变更**：

新增 `document_trash` 表：

```sql
CREATE TABLE IF NOT EXISTS document_trash (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  relative_path VARCHAR(512) NOT NULL,
  title VARCHAR(512) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  content_hash CHAR(64) NOT NULL,
  version_id CHAR(36) NULL,
  deleted_by_user_id CHAR(36) NOT NULL,
  deleted_by_device_id VARCHAR(128) NULL,
  deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  restored_at TIMESTAMP NULL,
  CONSTRAINT document_trash_workspace_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
```

**API**：

| 方法 | 路径 | 说明 |
|------|------|------|
| `DELETE` | `/api/v1/workspaces/:id/documents/:doc_id` | 改为软删除：移入 `document_trash` |
| `GET` | `/api/v1/workspaces/:id/trash` | 列出回收站 |
| `POST` | `/api/v1/workspaces/:id/trash/:trash_id/restore` | 恢复文档 |
| `DELETE` | `/api/v1/workspaces/:id/trash/:trash_id` | 永久删除 |
| `DELETE` | `/api/v1/workspaces/:id/trash` | 清空回收站 |

**恢复逻辑**：
1. 原 `relative_path` 在 `documents` 中不存在 → 直接恢复
2. 原路径已被新文档占用 → 覆盖 / 重命名恢复（如 `intro (restored).md`）
3. 恢复时创建新的 `document_versions` 记录，`source = 'system'`

**同步行为**：
- 软删除产生 clock 递增，其他设备 pull 时感知
- pull 发现文档在云端不存在且在 trash 中 → 本地也移入回收站
- 回收站体积不纳入 `storage_budget_bytes`

#### 3.1.2 本地回收站

- 删除时移动到 `<vault_root>/.jtype/trash/<timestamp>/` 而非直接删除
- 新增 Tauri 命令：`trash_entry`、`list_trash`、`restore_from_trash`、`permanent_delete`、`empty_trash`
- 侧边栏增加回收站入口

### 3.2 FEAT-MERGE：Git 级智能合并

#### 3.2.1 算法升级

替换当前 `three_way_merge`（`util.rs:243-277`），使用基于 **Myers diff + hunk** 的三方合并。

**新算法流程**：

```
输入：base, local, cloud

1. 计算 base→local 的 diff → local_hunks[]
2. 计算 base→cloud 的 diff → cloud_hunks[]
3. 检测 hunks 是否重叠（基于 base 行号区间）
   → 不重叠：自动合并
   → 重叠但内容相同：自动合并
   → 重叠且内容不同：冲突
4. 构建合并结果
```

**合并判定**：

| local hunk | cloud hunk | 重叠 | 结果 |
|---|---|---|---|
| Unchanged | Modified | - | 取 cloud |
| Modified | Unchanged | - | 取 local |
| Modified A | Modified B | 否 | 两者都取 |
| Modified A | Modified A | 是 | 内容相同取任一 |
| Modified A | Modified B | 是 | **冲突** |
| Inserted (同一位置) | Inserted (同一位置) | 是 | **冲突** |
| Deleted (行 3-5) | Modified (行 4) | 是 | **冲突** |

**关键改进**：

| 维度 | 当前 | 新算法 |
|------|------|--------|
| 行数不等 | 立即冲突 | 正常处理 |
| 不同段落修改 | 可能因行号错位而冲突 | 自动合并 |
| 同一段落修改 | 冲突 | 冲突（正确） |
| 一方加行一方改行 | 立即冲突 | 自动合并 |

#### 3.2.2 冲突标记

```markdown
<<<<<<< local
用户在本地写的内容
=======
云端已有的内容
>>>>>>> cloud
```

**`sync_conflicts` 表增强**：

```sql
ALTER TABLE sync_conflicts ADD COLUMN conflict_ranges JSON NULL;
-- 格式：[{ "start_line": 10, "end_line": 15, "local_lines": [...], "cloud_lines": [...] }]
```

#### 3.2.3 冲突解决 UI 增强

新增**逐冲突区域解决**：每个冲突区域独立选择 local / cloud / 手动编辑，而非整个文件级别。

### 3.3 FEAT-AUTOSYNC：自动同步

#### 3.3.1 定时轮询同步

- 默认 30 秒间隔，可配置（15s / 30s / 60s / 关闭）
- 仅在 vault 已绑定 workspace 且有有效 token 时启用
- 使用 `silent: true` 模式
- 用户正在编辑时推迟 pull 覆盖
- 正在手动同步时跳过定时同步

#### 3.3.2 云端变更拉取

- App 启动时立即 pull 一次
- App 从后台恢复时 pull（防抖 60s）
- 网络恢复时 pull（防抖 30s）

#### 3.3.3 本地文件监听

- Tauri Rust 层使用 `notify` crate 监听 vault 根目录
- 通过 Tauri event 发送变更到前端
- 仅监听 `.md` / `.markdown` / `.mdown` / `.mkd`
- 排除 `.jtype/`、`.git/`、`node_modules/`、`target/`
- 同一文件 300ms debounce
- 保存自身触发的写入事件需过滤

#### 3.3.4 同步状态指示器

Header 右侧图标：已同步 / 同步中 / 冲突 / 离线

## 4. 非功能需求

| 项目 | 要求 |
|------|------|
| 定时同步间隔精度 | ±2s |
| 文件事件防抖 | ≤500ms |
| 内存占用增长 | < 10MB |
| 不影响手动保存 | 定时同步和文件监听不阻塞用户操作 |
| 冲突安全 | 任何情况不能静默丢失用户未保存内容 |
| 回收站默认保留 | 30 天 |

## 5. 优先级

| 优先级 | 功能 | 理由 |
|--------|------|------|
| P0 | FEAT-MERGE 智能合并 | 当前合并是同步体验最大瓶颈 |
| P0 | FEAT-RECYCLE 云端软删除 | 硬删除是不可恢复的数据安全问题 |
| P1 | FEAT-RECYCLE 本地回收站 | 依赖 Tauri 层变更 |
| P1 | FEAT-AUTOSYNC 定时同步 | 自动同步基础能力 |
| P2 | FEAT-AUTOSYNC 文件监听 | 锦上添花 |
