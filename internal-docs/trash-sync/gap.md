# JType 回收站与同步 — 实现差异分析

> 原始文档与实际实现之间的差异。

日期：2026-05-11

## 1. 已实现（与文档一致）

| 功能 | 状态 |
|------|------|
| `document_trash` 表（含 source_device_id, restored_clock 等扩展字段） | ✅ 已在 0001_init.up.sql |
| `trash_events` 表（empty_trash, permanent_delete_all, permanent_delete_item） | ✅ 已在 0001_init.up.sql |
| trash.rs 核心函数：`restore_trash_item_core()`, `permanent_delete_core()`, `empty_trash_core()` | ✅ 已实现 |
| sync.rs 中 `process_trash_operation()` 调用 trash.rs 核心函数 | ✅ 已实现 |
| live.rs WebSocket handler 也调用 `process_trash_operation()` | ✅ 已实现 |
| REST API 端点（GET/DELETE /trash, POST /trash/:id/restore, DELETE /trash/:id） | ✅ 已实现 |
| Tauri 命令 5 个：trash_workspace_entry, list_workspace_trash, restore_workspace_trash, permanent_delete_trash, empty_workspace_trash | ✅ 已注册 |
| workspace_sync_clock 表整合了 document_trash 和 trash_events 的 clock | ✅ 0003 migration |

## 2. 文档中规划但未验证的细节

| 项目 | 说明 |
|------|------|
| `device_trash_cursors` 表 | trash-sync-design.md 中规划了此表，但 0001_init.up.sql 中未创建。可能由 workspace_sync_clock 表替代 |
| `trash-metadata.json` 本地缓存文件 | 文档中设计了此文件存储云端回收站信息的本地缓存，需检查 workspace.rs 是否实际实现 |
| 合并回收站视图（MergedTrashItem） | PRD 要求本地 + 云端回收站合并展示，需检查前端是否实现 |
| 恢复冲突的"强制覆盖"选项 | PRD 标记为 P2，可能未实现 |
| 过期项自动清理 | PRD 标记为 P2，需检查是否有定时任务 |

## 3. 文档间不一致

| 项目 | sync-recycle-merge 文档 | trash-sync 文档 | 实际实现 |
|------|------------------------|-----------------|---------|
| 迁移文件名 | `005_conflict_ranges_and_trash.sql` | `006_trash_sync.sql` | 合并到 `0001_init.up.sql`（全新初始化） |
| document_trash 表结构 | 基础字段（无 source_device_id 等） | 扩展字段（source_device_id, restored_clock 等） | 扩展版本（与 trash-sync 一致） |
| Tauri 命令名 | `trash_entry`, `list_trash` 等 | 同上 | `trash_workspace_entry`, `list_workspace_trash` 等（加了 workspace 前缀） |
| Pull 返回 trash 数据 | 只有 `deletedPaths` | 完整的 trash items + events + expiredTrashIds | 需检查 sync.rs 实际返回 |

## 4. sync-recycle-merge 文档中的非 trash 内容

sync-recycle-merge-prd/design 文档还包含以下功能，不属于 trash 范畴，本次合并未纳入：

| 功能 | 说明 |
|------|------|
| **FEAT-MERGE 智能合并** | 基于 `similar` crate 的三方合并算法，替换朴素行对齐。包含 hunk 级合并、ConflictRange、sync_conflicts.conflict_ranges 字段 |
| **FEAT-AUTOSYNC 自动同步** | 定时 pull/push（usePeriodicSync）、启动/前台恢复 pull、本地文件监听（notify crate + useFileWatcher） |
| **同步状态指示器** | SyncStatusIndicator 组件，显示 idle/syncing/conflict/offline |

这些功能应归入各自的 feature 文档（如 sync-merge、auto-sync）。

## 5. 待确认项

- [ ] `device_trash_cursors` 是否被 `workspace_sync_clock` 替代
- [ ] 本地 `trash-metadata.json` 缓存是否实际使用
- [ ] 前端合并回收站视图（MergedTrashItem）是否已实现
- [ ] 过期项自动清理定时任务是否存在
- [ ] sync.rs pull 实际返回的 trash 数据结构

## 6. 建议删除的原始文档

以下计划文档已完成使命，可以删除：
- `docs/sync-recycle-merge-plan.md`
- `docs/trash-sync-plan.md`
