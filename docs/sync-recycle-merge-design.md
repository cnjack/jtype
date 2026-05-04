# JType 同步增强 — 技术设计

日期：2026-05-03

## 1. 设计目标

在现有同步基础设施上，以最小改动实现三个核心能力：

1. **智能合并**：用 `similar` crate 替换朴素行对齐算法，支持插入/删除/不同区域修改的自动合并
2. **回收站**：云端软删除 + 本地 `.jtype/trash/` 目录
3. **自动同步**：定时 pull/push + 启动/前台恢复 pull + 文件监听

## 2. 模块变更矩阵

| 层 | FEAT-MERGE | FEAT-RECYCLE | FEAT-AUTOSYNC |
|---|---|---|---|
| **DB migration** | `sync_conflicts` 加 `conflict_ranges JSON` | 新增 `document_trash` 表 | 无 |
| **Web Rust - util** | 替换 `three_way_merge`，新增 `smart_three_way_merge` | 无 | 无 |
| **Web Rust - handlers/document** | 调用新合并函数，写入 `conflict_ranges` | `delete_document` 改为软删除；新增 trash CRUD handlers | 无 |
| **Web Rust - handlers/sync** | 无变更（已有冲突流不变） | pull 时感知删除 | 无 |
| **Web Rust - lib.rs routes** | 无 | 新增 4 条 trash 路由 | 无 |
| **Web Rust - db/models** | `SyncConflict` 加 `conflict_ranges` | 新增 `TrashItem`、`RestoreRequest` 等 types | 无 |
| **Web Cargo.toml** | 新增 `similar = "2"` | 无 | 无 |
| **Tauri Rust - workspace** | 无 | 新增 trash 相关命令 | 无 |
| **Tauri Rust - lib** | 无 | 注册 trash 命令 | 无 |
| **Tauri Cargo.toml** | 无 | 无 | 新增 `notify = "6"` |
| **Frontend - types** | `SyncConflict` 加 `conflictRanges` | 新增 `TrashItem` type | 新增 `SyncStatus` type |
| **Frontend - hooks/useCloudSync** | 无 | pull 后感知删除 | 新增 `usePeriodicSync` |
| **Frontend - hooks/useFileWatcher** | 无 | 无 | 新增整个 hook |
| **Frontend - hooks/useFileSystem** | 无 | `deleteCurrentEntry` 改用 `trash_entry` | 无 |
| **Frontend - components** | 冲突面板增强 | 回收站面板 | 同步状态指示器 |

## 3. FEAT-MERGE 详细设计

### 3.1 算法：基于 `similar` crate 的三方合并

使用 `similar::TextDiff` 计算行级 diff，然后对两个 diff 结果做 hunk 级合并。

```rust
// services/jtype-web/src/util.rs

use similar::{TextDiff, ChangeTag};

pub enum SmartMergeResult {
    Merged(String),
    Conflict { conflict_ranges: Vec<ConflictRange> },
}

pub struct ConflictRange {
    pub base_start: usize,
    pub base_end: usize,
    pub local_lines: Vec<String>,
    pub cloud_lines: Vec<String>,
}

pub fn smart_three_way_merge(base: &str, local: &str, cloud: &str) -> SmartMergeResult {
    // Fast paths (same as before)
    if local == cloud { return SmartMergeResult::Merged(local.to_string()); }
    if base == cloud { return SmartMergeResult::Merged(local.to_string()); }
    if base == local { return SmartMergeResult::Merged(cloud.to_string()); }

    let base_lines: Vec<&str> = base.lines().collect();
    let local_lines: Vec<&str> = local.lines().collect();
    let cloud_lines: Vec<&str> = cloud.lines().collect();

    // Compute diffs
    let local_diff = TextDiff::from_lines(base, local);
    let cloud_diff = TextDiff::from_lines(base, cloud);

    // Convert to hunks: Vec<(base_start, base_end, replacement_lines)>
    let local_hunks = diff_to_hunks(&local_diff, &local_lines);
    let cloud_hunks = diff_to_hunks(&cloud_diff, &cloud_lines);

    // Check overlap and merge
    merge_hunks(&base_lines, &local_hunks, &cloud_hunks)
}
```

### 3.2 Hunk 表示

```rust
struct Hunk {
    base_start: usize,   // base 中的起始行号
    base_end: usize,     // base 中的结束行号（不含）
    replacement: Vec<String>,  // 替换后的行
}
```

从 `similar::TextDiff` 的迭代结果中提取：

```rust
fn diff_to_hunks<'a>(diff: &TextDiff, new_lines: &[&'a str]) -> Vec<Hunk> {
    // 遍历 diff.ops()，提取每个 Replace/Insert/Delete 操作
    // 映射到 base 行号区间 → Hunk
}
```

### 3.3 合并逻辑

```
1. 将 local_hunks 和 cloud_hunks 合并排序（按 base_start）
2. 逐对检查重叠：
   - 不重叠：两者都保留
   - 重叠但 replacement 相同：保留一个
   - 重叠且 replacement 不同：标记为 ConflictRange
3. 按 base 行号顺序构建最终内容：取 base 中未被 hunk 覆盖的行 + 各 hunk 的 replacement
```

### 3.4 与现有代码的集成点

`document.rs:save_document_version` 中：

```rust
// 当前（第 242 行）：
if let MergeResult::Merged(merged) = three_way_merge(base_content, &payload.content, &cloud_content) {

// 改为：
match smart_three_way_merge(base_content, &payload.content, &cloud_content) {
    SmartMergeResult::Merged(merged) => { /* 同现有逻辑 */ }
    SmartMergeResult::Conflict { conflict_ranges } => {
        // 创建 sync_conflict 时附带 conflict_ranges JSON
    }
}
```

### 3.5 `sync_conflicts` 表变更

```sql
ALTER TABLE sync_conflicts ADD COLUMN conflict_ranges JSON NULL;
```

`SyncConflict` struct 增加：

```rust
pub conflict_ranges: Option<String>,  // JSON string
```

前端 `SyncConflict` type 增加：

```typescript
conflictRanges?: Array<{
  baseStart: number;
  baseEnd: number;
  localLines: string[];
  cloudLines: string[];
}>;
```

## 4. FEAT-RECYCLE 详细设计

### 4.1 云端回收站

**删除流程变更**（`document.rs:delete_document`）：

```
1. 查询 document 的 content、content_hash、current_version_id
2. INSERT INTO document_trash (id, workspace_id, document_id, relative_path, title, content, content_hash, version_id, deleted_by_user_id, expires_at)
3. DELETE FROM documents WHERE id = ? AND workspace_id = ?
4. 注意：sync_conflicts 通过 FK CASCADE 会自动清理
```

**恢复流程**（新 handler `restore_from_trash`）：

```
1. SELECT * FROM document_trash WHERE id = ? AND workspace_id = ?
2. 检查 documents 中是否已有同 relative_path
   - 无：直接 INSERT 回 documents
   - 有：返回冲突，前端提示用户选择覆盖或重命名
3. DELETE FROM document_trash WHERE id = ?
4. 创建新的 document_versions 记录（source = 'system'）
```

**Pull 时感知删除**：

在 `sync.rs:pull` 中，除了返回新增/修改的文档，还需返回"已删除"列表：

```sql
-- 新增：查询 since_clock 之后被删除的文档
SELECT dt.relative_path, dt.deleted_clock
FROM document_trash dt
WHERE dt.workspace_id = ? AND dt.deleted_clock > ? AND dt.restored_at IS NULL
```

pull response 增加字段：

```rust
pub struct SyncPullResponse {
    pub workspace_id: String,
    pub documents: Vec<CloudDocument>,
    pub deleted_paths: Vec<DeletedPath>,  // 新增
    pub conflicts: Vec<SyncConflict>,
}

pub struct DeletedPath {
    pub relative_path: String,
    pub deleted_clock: String,
}
```

前端 pull 后处理 `deleted_paths`：
- 如果本地对应文件未被修改 → 移入 `.jtype/trash/`
- 如果本地有未保存修改 → 不删除，提示用户

### 4.2 本地回收站

**目录结构**：

```
vault-root/
  .jtype/
    trash/
      2026-05-03T10-00-00/
        intro.md
        notes/
          meeting.md
```

**Tauri 新增命令**：

```rust
#[tauri::command]
async fn trash_entry(root_path: String, relative_path: String) -> Result<WorkspaceSnapshot, String> {
    let trash_dir = format!("{}/.jtype/trash/{}", root_path, timestamp());
    fs::create_dir_all(&trash_dir)?;
    let src = format!("{}/{}", root_path, relative_path);
    let dst = format!("{}/{}", trash_dir, relative_path);
    // 确保目标目录存在
    if let Some(parent) = Path::new(&dst).parent() {
        fs::create_dir_all(parent)?;
    }
    fs::rename(&src, &dst)?;
    open_workspace(&root_path) // 返回刷新后的 workspace
}

#[tauri::command]
async fn list_trash(root_path: String) -> Result<Vec<TrashItem>, String> { ... }

#[tauri::command]
async fn restore_from_trash(root_path: String, trash_id: String, relative_path: String) -> Result<WorkspaceSnapshot, String> { ... }

#[tauri::command]
async fn permanent_delete(root_path: String, trash_id: String) -> Result<(), String> { ... }

#[tauri::command]
async fn empty_trash(root_path: String) -> Result<(), String> { ... }
```

**前端 `deleteCurrentEntry` 变更**：

```typescript
// 当前：
const workspace = await tauri.deleteEntry(state.workspace.rootPath, state.currentRelativePath);
// 改为：
const workspace = await tauri.trashEntry(state.workspace.rootPath, state.currentRelativePath);
```

确认弹窗文案从 "Delete ... This removes it from disk." 改为 "Move ... to trash?"

## 5. FEAT-AUTOSYNC 详细设计

### 5.1 定时同步

新增 `src/hooks/usePeriodicSync.ts`：

```typescript
export function usePeriodicSync(syncFn: () => Promise<void>, intervalMs: number, enabled: boolean) {
  const timerRef = useRef<number | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!enabled) { stop(); return; }
    timerRef.current = window.setInterval(async () => {
      if (syncingRef.current) return; // 上一次还在跑就跳过
      syncingRef.current = true;
      try { await syncFn(); } finally { syncingRef.current = false; }
    }, intervalMs);
    return () => stop();
  }, [enabled, intervalMs]);

  // 暴露 triggerNow 供 focus 事件调用
}
```

在 `App.tsx` 中集成：

```typescript
const isSyncEnabled = !!(state.workspace && state.syncToken && currentBinding);
usePeriodicSync(
  () => sync.syncWorkspaceToWeb({ silent: true }),
  30000,
  isSyncEnabled
);
```

### 5.2 启动时 pull + 前台恢复 pull

在 `App.tsx` 的初始化 useEffect 中：

```typescript
// 已有 loadCloudProfile + loadVaultBindings 之后
if (currentBinding && syncToken) {
  sync.pullCloudWorkspace(currentBinding); // 启动时 pull
}
```

前台恢复 pull（通过 Tauri window focus 事件或 `visibilitychange`）：

```typescript
useEffect(() => {
  const handler = () => {
    if (!document.hidden && isSyncEnabled && Date.now() - lastSyncRef.current > 60000) {
      sync.pullCloudWorkspace(currentBinding);
    }
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}, [isSyncEnabled]);
```

### 5.3 文件监听

Tauri Rust 层新增 `notify` watcher：

```rust
use notify::{Watcher, RecursiveMode, Event};

#[tauri::command]
async fn start_file_watcher(app: tauri::AppHandle, root_path: String) -> Result<(), String> {
    let (tx, rx) = std::sync::mpsc::channel();
    let mut watcher = notify::recommended_watcher(tx).map_err(|e| e.to_string())?;
    watcher.watch(Path::new(&root_path), RecursiveMode::Recursive).map_err(|e| e.to_string())?;

    std::thread::spawn(move || {
        while let Ok(event) = rx.recv() {
            if let Ok(event) = event {
                // 过滤：仅 md 文件，排除 .jtype/.git/node_modules/target
                if should_emit(&event) {
                    app.emit("vault-file-changed", &event.paths).ok();
                }
            }
        }
    });
    Ok(())
}
```

前端新增 `src/hooks/useFileWatcher.ts`：

```typescript
export function useFileWatcher(rootPath: string | null, onChange: (paths: string[]) => void) {
  useEffect(() => {
    if (!rootPath || !tauri.isAvailable) return;
    tauri.startFileWatcher(rootPath);
    const unlisten = listen<string[]>('vault-file-changed', debounce((event) => {
      onChange(event.payload);
    }, 300));
    return () => { unlisten.then(fn => fn()); };
  }, [rootPath]);
}
```

### 5.4 同步状态指示器

新增 `src/components/SyncStatusIndicator.tsx`：

状态值：
- `idle` — 已同步
- `syncing` — 同步中
- `conflict` — 有冲突
- `offline` — 离线/未连接

## 6. 数据库迁移

新增 `infra/mysql/005_conflict_ranges_and_trash.sql`：

```sql
-- 回收站表
CREATE TABLE IF NOT EXISTS document_trash (...);

-- sync_conflicts 增加冲突区域
ALTER TABLE sync_conflicts ADD COLUMN conflict_ranges JSON NULL;

-- pull 感知删除：document_trash 的 deleted_clock 需要 clock 一致的比较
-- 使用 workspace_sync_cursors.last_seen_clock 不够（删除不产生 clock）
-- 方案：软删除时也在 documents 被删前记录 clock 到 trash 表
ALTER TABLE document_trash ADD COLUMN deleted_clock BIGINT NOT NULL DEFAULT 0;
```

## 7. 前端类型变更

### 7.1 types.ts

```typescript
// SyncConflict 增加
export type SyncConflict = {
  conflictId: string;
  relativePath: string;
  localContent: string;
  cloudContent: string;
  baseContent?: string;
  conflictRanges?: ConflictRange[];
};

export type ConflictRange = {
  baseStart: number;
  baseEnd: number;
  localLines: string[];
  cloudLines: string[];
};

// 新增
export type TrashItem = {
  id: string;
  relativePath: string;
  title: string;
  deletedAt: string;
  expiresAt: string;
};

export type DeletedPath = {
  relativePath: string;
  deletedClock: string;
};

export type SyncStatus = "idle" | "syncing" | "conflict" | "offline";
```

### 7.2 AppState 增加

```typescript
// AppState 新增字段
syncStatus: SyncStatus;
lastSyncAt: number;
trashItems: TrashItem[];
```

## 8. API 合同同步

### 8.1 新增路由

```
GET    /api/v1/workspaces/:id/trash
POST   /api/v1/workspaces/:id/trash/:trash_id/restore
DELETE /api/v1/workspaces/:id/trash/:trash_id
DELETE /api/v1/workspaces/:id/trash
```

### 8.2 变更路由

```
DELETE /api/v1/workspaces/:id/documents/:doc_id  → 软删除（移入 trash）
POST   /api/v1/workspaces/:id/sync/pull          → response 增加 deletedPaths
```

### 8.3 前端需同步更新

- `useCloudSync.ts` pull 后处理 `deletedPaths`
- `useFileSystem.ts` delete 改用 trash
- 新增 `usePeriodicSync.ts`
- 新增 `useFileWatcher.ts`
