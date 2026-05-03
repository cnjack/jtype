# JType 同步增强 — 实施计划

日期：2026-05-03

## 实施阶段

### Phase 1: FEAT-MERGE — 智能合并（P0）

预计改动：6 个文件

| 步骤 | 文件 | 动作 |
|------|------|------|
| 1.1 | `services/jtype-web/Cargo.toml` | 添加 `similar = "2"` |
| 1.2 | `services/jtype-web/src/util.rs` | 替换 `three_way_merge` 为 `smart_three_way_merge`；保留旧函数（标记 deprecated）用于测试兼容 |
| 1.3 | `infra/mysql/002_trash_and_merge.sql` | 新增 migration：`sync_conflicts` 加 `conflict_ranges JSON NULL` |
| 1.4 | `services/jtype-web/src/db/models.rs` | `SyncConflict` 增加 `conflict_ranges` 字段 |
| 1.5 | `services/jtype-web/src/handlers/document.rs` | `save_document_version` 中调用新合并函数；`create_sync_conflict` 写入 conflict_ranges |
| 1.6 | `services/jtype-web/src/handlers/sync.rs` | `resolve_conflict` 和 `load_open_conflicts` 读取 conflict_ranges；pull/push 返回 conflict_ranges |
| 1.7 | `services/jtype-web/src/lib.rs` | 更新 tests 中 `merges_non_overlapping_line_edits` 等测试用例 |
| 1.8 | 前端 `src/lib/types.ts` | `SyncConflict` 增加 `conflictRanges` |

验证：`cargo test --manifest-path services/jtype-web/Cargo.toml --lib`

---

### Phase 2: FEAT-RECYCLE 云端 — 回收站 API（P0）

预计改动：7 个文件

| 步骤 | 文件 | 动作 |
|------|------|------|
| 2.1 | `infra/mysql/002_trash_and_merge.sql` | 新增 `document_trash` 表 |
| 2.2 | `services/jtype-web/src/db/models.rs` | 新增 `TrashItem`、`DeletedPath`、`RestoreRequest` types；`SyncPullResponse` 增加 `deleted_paths` |
| 2.3 | `services/jtype-web/src/handlers/document.rs` | `delete_document` 改为软删除（INSERT INTO document_trash + DELETE FROM documents） |
| 2.4 | 新建 `services/jtype-web/src/handlers/trash.rs` | `list_trash`、`restore_from_trash`、`permanent_delete`、`empty_trash` 四个 handler |
| 2.5 | `services/jtype-web/src/handlers/mod.rs` | 添加 `pub mod trash;` |
| 2.6 | `services/jtype-web/src/lib.rs` | 注册 4 条 trash 路由 |
| 2.7 | `services/jtype-web/src/handlers/sync.rs` | `pull` 返回 `deleted_paths`（从 document_trash 查询 since_clock 之后的删除） |

验证：`cargo check --manifest-path services/jtype-web/Cargo.toml` + `cargo test`

---

### Phase 3: FEAT-RECYCLE 本地 — Tauri 回收站（P1）

预计改动：4 个文件

| 步骤 | 文件 | 动作 |
|------|------|------|
| 3.1 | `src-tauri/src/workspace.rs` | 新增 `trash_entry`、`list_trash`、`restore_from_trash`、`permanent_delete`、`empty_trash` 函数 |
| 3.2 | `src-tauri/src/lib.rs` | 注册 5 个新 Tauri 命令 |
| 3.3 | `src/lib/tauri.ts` | 添加对应的 TypeScript wrapper |
| 3.4 | `src/hooks/useFileSystem.ts` | `deleteCurrentEntry` 改用 `trash_entry`；确认文案更新 |

验证：`cargo test --manifest-path src-tauri/Cargo.toml`

---

### Phase 4: FEAT-AUTOSYNC — 自动同步（P1）

预计改动：5 个文件

| 步骤 | 文件 | 动作 |
|------|------|------|
| 4.1 | 新建 `src/hooks/usePeriodicSync.ts` | 定时同步 hook |
| 4.2 | `src/hooks/useCloudSync.ts` | pull 后处理 `deletedPaths`；暴露 `pullOnly` 方法 |
| 4.3 | `src/app/AppState.tsx` | 增加 `syncStatus`、`lastSyncAt` 状态和 actions |
| 4.4 | `src/app/App.tsx` | 集成 `usePeriodicSync`；启动时 pull；visibilitychange pull |
| 4.5 | `src/lib/types.ts` | 新增 `TrashItem`、`DeletedPath`、`SyncStatus` types |

验证：`npm run build` + 手动测试同步流程

---

### Phase 5: FEAT-AUTOSYNC — 文件监听（P2）

预计改动：4 个文件

| 步骤 | 文件 | 动作 |
|------|------|------|
| 5.1 | `src-tauri/Cargo.toml` | 添加 `notify = "6"` |
| 5.2 | `src-tauri/src/workspace.rs` | 新增 `start_file_watcher` / `stop_file_watcher` |
| 5.3 | `src-tauri/src/lib.rs` | 注册 watcher 命令 |
| 5.4 | 新建 `src/hooks/useFileWatcher.ts` | 前端文件变更监听 hook |

验证：手动测试外部编辑文件后 App 内自动刷新

---

### Phase 6: UI 增强（P1）

预计改动：3 个文件

| 步骤 | 文件 | 动作 |
|------|------|------|
| 6.1 | 新建 `src/components/SyncStatusIndicator.tsx` | 同步状态图标 |
| 6.2 | 新建 `src/components/ConflictResolutionPanel.tsx` | 逐区域冲突解决面板 |
| 6.3 | 新建 `src/components/TrashPanel.tsx` | 回收站面板 |

---

## 执行顺序

```
Phase 1 (MERGE) → Phase 2 (RECYCLE cloud) → Phase 3 (RECYCLE local)
                                            → Phase 4 (AUTOSYNC)
                                            → Phase 5 (FILE WATCHER)
                                            → Phase 6 (UI)
```

Phase 1 和 2 可独立开发，3 和 4 可并行，5 和 6 在 3/4 完成后开始。

先从 Phase 1 开始。
