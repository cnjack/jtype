# JType 回收站与同步 — 产品需求文档

> 合并自 sync-recycle-merge-prd.md 和 trash-sync-prd.md，已更新至实际实现状态。

日期：2026-05-04（最后更新：2026-05-11）

## 1. 背景

JType 早期版本中，删除文件为硬删除（云端 `DELETE FROM documents`，本地 `fs::remove_file`），不可恢复。同步时回收站操作不双向同步，恢复、永久删除、清空操作各自独立。

### 核心问题

| 问题 | 影响 |
|------|------|
| 硬删除不可恢复 | 数据安全风险 |
| 回收站列表不同步 | 云端删除不出现在本地回收站 UI，反之亦然 |
| 恢复/永久删除/清空操作不双向同步 | 数据不一致、存储冗余 |
| 多设备竞争操作无明确规则 | 协作体验模糊 |

## 2. 产品目标

1. **数据安全**：删除可恢复，30 天回收站过期
2. **统一回收站视图**：本地 + 云端回收站合并展示
3. **操作自动同步**：任一端的恢复/永久删除/清空操作自动反映到另一端
4. **冲突处理明确**：定义明确的冲突规则和优先级

## 3. 功能需求

### 3.1 云端回收站

**数据表**：`document_trash`

| 字段 | 说明 |
|------|------|
| id, workspace_id, document_id | 标识 |
| relative_path, title, content, content_hash | 文档快照 |
| version_id | 删除时的版本 |
| deleted_by_user_id, deleted_by_device_id | 删除操作者 |
| source_device_id, source_user_id | 来源设备/用户 |
| deleted_clock | 删除时的 clock，用于增量同步 |
| deleted_at, expires_at | 删除时间、过期时间（30 天） |
| restored_at, restored_by_device_id, restored_by_user_id, restored_clock | 恢复追踪 |

**API 端点**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/workspaces/:id/trash` | 列出回收站 |
| POST | `/api/v1/workspaces/:id/trash/:trash_id/restore` | 恢复文档 |
| DELETE | `/api/v1/workspaces/:id/trash/:trash_id` | 永久删除单项 |
| DELETE | `/api/v1/workspaces/:id/trash` | 清空回收站 |

**恢复逻辑**：
- 原 `relative_path` 不冲突 → 直接恢复到 `documents`
- 原路径已被占用 → 提示用户重命名
- 恢复前检查 `storage_budget`
- 恢复时创建新 `document_versions` 记录

### 3.2 本地回收站

- 删除时移动到 `<vault_root>/.jtype/trash/<timestamp>/` 而非直接删除
- Tauri 命令：`trash_workspace_entry`、`list_workspace_trash`、`restore_workspace_trash`、`permanent_delete_trash`、`empty_workspace_trash`
- 本地回收站存储元数据为 JSON

### 3.3 回收站事件追踪

**数据表**：`trash_events`

| 字段 | 说明 |
|------|------|
| id | 事件 ID |
| workspace_id | 所属 workspace |
| event_type | `empty_trash` / `permanent_delete_all` / `permanent_delete_item` |
| event_data | JSON 格式的事件详情 |
| event_clock | 事件 clock，用于增量同步 |

### 3.4 同步行为

**Push**：本地删除 → 发送 `deletedPaths` → 云端创建 `document_trash` 记录。Push 也可携带 trash 操作（恢复/永久删除/清空）。

**Pull**：返回 `deletedPaths`（新删除的文档路径）+ trash items + trash events。Desktop 据此更新本地 `.jtype/trash/` 和元数据。

**Sync handler**：`sync.rs` 中 `process_trash_operation()` 调用 `trash.rs` 的 `restore_trash_item_core()`、`permanent_delete_core()`、`empty_trash_core()` 核心函数。

### 3.5 冲突处理规则

| 场景 | 结果 |
|------|------|
| 恢复 + 云端已恢复 | 无操作，告知已在其他端恢复 |
| 恢复 + 云端已永久删除 | 冲突，提示文件已不存在 |
| 永久删除 + 云端已恢复 | 冲突，提示文件已恢复 |
| 并发清空 | 幂等，两次清空都成功 |
| 并发删除同一项 | 幂等，`rows_affected == 0` 不报错 |

### 3.6 用户故事

1. **Desktop 删除 → Web 恢复**：Desktop 删除文件 → 自动同步 → Web 回收站显示 → 用户恢复 → 文档重新出现
2. **Web 清空 → Desktop 同步**：Web 清空回收站 → 创建 trash_event → Desktop pull 获取事件 → 清空对应本地回收站
3. **多设备竞争**：不同设备删除不同文件 → 同步后两端回收站都有全部文件 → 各自恢复不冲突

## 4. 非功能需求

| 项目 | 要求 |
|------|------|
| 回收站默认保留 | 30 天 |
| 回收站列表加载 | < 500ms（< 1000 项） |
| 单项恢复 | < 1s |
| 批量清空 | < 2s |
| 冲突安全 | 不静默丢失用户数据 |
| 一致性 | 最终一致（eventually consistent） |
| 冲突优先级 | 恢复 > 永久删除 |
| 安全 | 用户只能操作所在 workspace 的回收站 |

## 5. 不在范围内

| 项目 | 原因 |
|------|------|
| 版本恢复（恢复到历史某个版本） | 属于版本控制系统 |
| 跨 workspace 恢复 | 违反隔离原则 |
| 回收站配额单独计算 | 目前计入总存储预算 |
| 自动恢复建议 | 需 AI 分析，V2 功能 |

## 6. 成功指标

- 用户能在 Desktop 和 Web 查看合并的回收站列表
- 跨端恢复/删除操作 100% 同步成功
- 冲突解决率 > 99%
- 回收站 UI 加载时间 < 500ms
