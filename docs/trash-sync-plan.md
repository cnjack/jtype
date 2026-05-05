# JType 回收站同步 — 实施计划

日期：2026-05-04

## Phase 1: 数据库 + 服务端基础（P0）

### Step 1.1: 数据库迁移

| 文件 | 动作 |
|------|------|
| `infra/mysql/006_trash_sync.sql` | 新建：`trash_events` 表、`device_trash_cursors` 表、`document_trash` 扩展字段 |

### Step 1.2: 服务端类型扩展

| 文件 | 动作 |
|------|------|
| `services/jtype-web/src/db/models.rs` | 新增 `TrashEvent`、`TrashSyncPullResponse`、`TrashOperation`、`TrashOperationError` 类型 |

### Step 1.3: Sync Pull 扩展

| 文件 | 动作 |
|------|------|
| `services/jtype-web/src/handlers/sync.rs` | 修改 `pull()` 添加 trash 字段；新增 `load_trash_sync_data()`、`load_trash_events_since()`、`load_all_undeleted_trash_items()` |

### Step 1.4: Sync Push 扩展

| 文件 | 动作 |
|------|------|
| `services/jtype-web/src/handlers/sync.rs` | 修改 `push()` 接受 `trash_operations`；新增 `process_trash_operation()`、`restore_trash_item()`、`permanent_delete_trash_item()`、`empty_trash_with_event()` |

### Step 1.5: Trash 处理器增强

| 文件 | 动作 |
|------|------|
| `services/jtype-web/src/handlers/trash.rs` | 修改 `permanent_delete()` 和 `empty_trash()` 新增 `trash_events` 记录 |

**验证**: `cargo check --manifest-path services/jtype-web/Cargo.toml` + `cargo test`

---

## Phase 2: 桌面端基础（P0）

### Step 2.1: Trash 元数据管理

| 文件 | 动作 |
|------|------|
| `src-tauri/src/workspace.rs` | 新增 `TrashMetadata` 类型、`load_trash_metadata()`、`save_trash_metadata()`、`scan_local_trash()`、`apply_trash_operations()` |

### Step 2.2: 命令注册

| 文件 | 动作 |
|------|------|
| `src-tauri/src/lib.rs` | 注册 `load_trash_metadata`、`save_trash_metadata`、`scan_local_trash`、`apply_trash_operations` 命令 |

### Step 2.3: 前端类型

| 文件 | 动作 |
|------|------|
| `src/lib/types.ts` | 新增 `MergedTrashItem`、`TrashEvent`、`TrashSyncPayload` 类型 |

### Step 2.4: Tauri 包装

| 文件 | 动作 |
|------|------|
| `src/lib/tauri.ts` | 新增 `loadTrashMetadata()`、`saveTrashMetadata()`、`scanLocalTrash()`、`applyTrashOperations()` |

**验证**: `cargo test --manifest-path src-tauri/Cargo.toml` + `npm run build`

---

## Phase 3: 同步集成（P0）

### Step 3.1: 同步钩子修改

| 文件 | 动作 |
|------|------|
| `src/hooks/useCloudSync.ts` | 修改 `pullCloudWorkspace()` 处理 `trash` 字段；新增 `handleTrashSync()`；修改 `syncWorkspaceToWeb()` 发送 `trash_operations` |

### Step 3.2: AppState 扩展

| 文件 | 动作 |
|------|------|
| `src/app/AppState.tsx` | 新增 `mergedTrashItems` 状态和 `SET_MERGED_TRASH` action |

**验证**: 手动测试完整同步流程

---

## Phase 4: UI 集成（P1）

### Step 4.1: Sidebar 回收站面板

| 文件 | 动作 |
|------|------|
| `src/components/sidebar/Sidebar.tsx` | 修改回收站 activity 展示合并的 MergedTrashItem 列表 |

### Step 4.2: 恢复/删除操作

| 文件 | 动作 |
|------|------|
| `src/hooks/useFileSystem.ts` | 新增 `restoreFromTrash()`、`permanentDeleteFromTrash()`、`emptyTrash()` 操作，触发 sync |

**验证**: E2E 测试

---

## Phase 5: 测试（P1）

| 文件 | 动作 |
|------|------|
| `services/jtype-web/src/handlers/sync.rs` | Rust 单元测试 |
| `tests/e2e/app.spec.ts` | E2E 回收站同步场景 |

---

## 执行顺序

```
Phase 1 (服务端) → Phase 2 (桌面端) → Phase 3 (同步集成) → Phase 4 (UI) → Phase 5 (测试)
```
