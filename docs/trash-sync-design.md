# JType 回收站同步 — 技术设计文档

日期：2026-05-04

## 1. 架构概览

### 1.1 现状分析

JType 已具备独立的本地和云端回收站系统：

- **云端回收站**：`document_trash` 表管理软删除，支持恢复和永久删除
- **本地回收站**：`.jtype/trash/<timestamp>/` 目录结构，Tauri 命令支持管理
- **基础同步**：Pull 时通过 `deletedPaths` 感知云端删除，Push 时发送本地删除

**现有问题**：
1. 回收站操作不双向同步（恢复、永久删除、清空互不同步）
2. 本地和云端回收站列表分离，用户看不到合并视图
3. 冲突处理不完善（恢复已被永久删除的项目）
4. 永久删除事件未通知对端设备

### 1.2 设计目标

实现**统一的回收站同步机制**，使得：
- 本地和云端回收站项在同步时完全同步
- 用户从任一端操作（恢复/永久删除/清空）自动反映到另一端
- 回收站列表合并展示，标记项目来源
- 冲突操作返回明确的错误信息

### 1.3 核心概念

**回收站事件（Trash Event）**：
- `empty_trash` — 清空整个回收站
- `permanent_delete_all` — 按过期时间清理（系统自动）
- `permanent_delete_item` — 永久删除单个项目

**项目来源标记（Source）**：
- `cloud` — 来自云端删除
- `local` — 来自本地删除

**合并的回收站项（MergedTrashItem）**：
- 本地 `.jtype/trash/` 中的文件与云端 `document_trash` 合并
- 优先用云端数据（timestamp、hash、source）
- 本地特有文件标记为 `source: "local"`

### 1.4 同步流程图

```
┌─────────────────────────────────────────────────────┐
│                 Desktop & Web                       │
└─────────────────────────────────────────────────────┘
         │                              │
    .jtype/trash/         ←────────→    document_trash (MySQL)
    trash-metadata.json                 trash_events
         │                              │
         └──────────────────────────────┘
              Bidirectional Sync
    (Push deletedPaths, Pull trash events)
```

## 2. 数据库迁移方案

### 2.1 新增 006_trash_sync.sql 迁移

```sql
-- Migration 006: Trash sync infrastructure

ALTER TABLE document_trash
  ADD COLUMN source_device_id VARCHAR(128) NULL AFTER deleted_by_device_id,
  ADD COLUMN source_user_id CHAR(36) NULL AFTER source_device_id,
  ADD COLUMN restored_by_device_id VARCHAR(128) NULL AFTER restored_at,
  ADD COLUMN restored_by_user_id CHAR(36) NULL AFTER restored_by_device_id,
  ADD COLUMN restored_clock BIGINT NULL AFTER restored_by_user_id;

CREATE INDEX IF NOT EXISTS idx_document_trash_restored
  ON document_trash (workspace_id, restored_at, restored_clock);

CREATE TABLE IF NOT EXISTS trash_events (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  event_type ENUM('empty_trash', 'permanent_delete_all', 'permanent_delete_item') NOT NULL,
  event_data JSON NOT NULL,
  event_clock BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT trash_events_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_trash_events_clock (workspace_id, event_clock)
);

CREATE TABLE IF NOT EXISTS device_trash_cursors (
  device_id VARCHAR(128) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  last_trash_event_clock BIGINT DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (device_id, workspace_id),
  CONSTRAINT device_trash_cursors_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
```

## 3. 云端服务变更（Axum Rust）

### 3.1 models.rs 扩展类型

```rust
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashSyncPullResponse {
    pub workspace_id: String,
    pub items: Vec<TrashItem>,
    pub events: Vec<TrashEvent>,
    pub expired_trash_ids: Vec<String>,
    pub trash_cursor: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashEvent {
    pub id: String,
    pub event_type: String,
    pub event_clock: i64,
    pub event_data: serde_json::Value,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TrashOperation {
    RestoreItem { trash_id: String },
    PermanentDelete { trash_id: String },
    EmptyTrash { confirm: bool },
}
```

### 3.2 sync.rs pull() 修改

在现有 pull 响应中新增 `trash` 字段：

```rust
// 新增辅助函数
async fn load_trash_sync_data(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    since_trash_event_clock: i64,
) -> Result<TrashSyncPullResponse, AppError> {
    let events = load_trash_events_since(pool, workspace_id, since_trash_event_clock).await?;
    let items = load_all_undeleted_trash_items(pool, workspace_id).await?;
    let expired_trash_ids = find_expired_trash_ids(&items);
    let trash_cursor = events.last().map(|e| e.event_clock).unwrap_or(since_trash_event_clock);

    Ok(TrashSyncPullResponse {
        workspace_id: workspace_id.to_string(),
        items,
        events,
        expired_trash_ids,
        trash_cursor,
    })
}
```

### 3.3 sync.rs push() 修改

接受 `trash_operations` 字段，处理恢复/永久删除/清空操作：

```rust
async fn process_trash_operation(
    pool: &sqlx::Pool<sqlx::MySql>,
    workspace_id: &str,
    user: &AuthUser,
    device_id: Option<&str>,
    operation: TrashOperation,
) -> Result<(), TrashOperationError> {
    match operation {
        TrashOperation::RestoreItem { trash_id } => {
            // 检查项是否存在，恢复到 documents 表
            // 标记 restored_at, restored_by_device_id, restored_clock
        }
        TrashOperation::PermanentDelete { trash_id } => {
            // 创建 trash_event (permanent_delete_item)
            // 从 document_trash 删除
        }
        TrashOperation::EmptyTrash { .. } => {
            // 创建 trash_event (empty_trash)
            // DELETE FROM document_trash WHERE restored_at IS NULL
        }
    }
}
```

### 3.4 trash.rs 修改

`empty_trash` 和 `permanent_delete` 新增 `trash_events` 记录。

## 4. 桌面后端变更（Tauri Rust）

### 4.1 trash-metadata.json 管理

新增 `workspace.rs` 函数：

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashMetadata {
    pub items: Vec<LocalTrashItem>,
    pub last_synced_clock: i64,
}

pub fn load_trash_metadata(root_path: &str) -> Result<TrashMetadata, String>;
pub fn save_trash_metadata(root_path: &str, metadata: &TrashMetadata) -> Result<(), String>;
pub fn scan_local_trash(root_path: &str) -> Result<Vec<LocalTrashItem>, String>;
pub fn apply_trash_operations(root_path: &str, operations: &[(String, String)]) -> Result<(), String>;
```

### 4.2 lib.rs 命令注册

```rust
#[tauri::command]
async fn load_trash_metadata(root_path: String) -> Result<TrashMetadata, String>;
#[tauri::command]
async fn save_trash_metadata(root_path: String, metadata: TrashMetadata) -> Result<(), String>;
#[tauri::command]
async fn scan_local_trash(root_path: String) -> Result<Vec<LocalTrashItem>, String>;
#[tauri::command]
async fn apply_trash_operations(root_path: String, operations: Vec<(String, String)>) -> Result<(), String>;
```

## 5. 前端变更

### 5.1 types.ts 扩展

```typescript
export type MergedTrashItem = {
  id: string;
  documentId?: string;
  relativePath: string;
  title: string;
  contentHash?: string;
  deletedAt: string;
  expiresAt?: string;
  deletedClock?: number;
  source: "cloud" | "local";
  syncStatus: "local_only" | "synced" | "conflict" | "pending_restore";
};

export type TrashEvent = {
  id: string;
  eventType: "empty_trash" | "permanent_delete_item" | "permanent_delete_all";
  eventClock: number;
  eventData: Record<string, unknown>;
  createdAt: string;
};

export type TrashSyncPayload = {
  items: MergedTrashItem[];
  events: TrashEvent[];
  expiredTrashIds: string[];
  trashCursor: number;
};
```

### 5.2 useCloudSync.ts 修改

新增 `handleTrashSync()` 函数：

```typescript
async function handleTrashSync(trash: TrashSyncPayload): Promise<void> {
  // 1. 扫描本地回收站
  // 2. 合并本地和云端回收站
  // 3. 处理过期项和事件
  // 4. 保存元数据到 trash-metadata.json
  // 5. 更新 AppState
}
```

### 5.3 tauri.ts 包装函数

```typescript
loadTrashMetadata(rootPath: string): Promise<TrashMetadata>;
saveTrashMetadata(rootPath: string, metadata: TrashMetadata): Promise<void>;
scanLocalTrash(rootPath: string): Promise<LocalTrashItem[]>;
applyTrashOperations(rootPath: string, ops: [string, string][]): Promise<void>;
```

## 6. 数据流详解

### 6.1 Push 本地删除到云端

```
用户在 Desktop 删除文件
  → tauri.trashEntry() 移至 .jtype/trash/
  → Sync Push 发送 deletedPaths
  → Web Service 创建 document_trash 记录
  → Web 回收站显示该文件
```

### 6.2 Pull 云端删除到本地

```
Web 用户删除文件 → document_trash 记录
  → Desktop Pull 获取 deletedPaths + trash items
  → 本地 trashEntry() + 更新 trash-metadata.json
  → Sidebar 显示已删除项
```

### 6.3 恢复操作同步

```
Desktop 恢复 → 本地移出 .jtype/trash/
  → Push trash.restoredTrashIds
  → Web Service 标记 restored_at
  → 创建新 document + document_version
  → 其他设备 Pull 获取恢复的文档
```

### 6.4 清空回收站同步

```
Web 清空回收站
  → INSERT INTO trash_events (empty_trash)
  → DELETE FROM document_trash
  → Desktop Pull 获取 empty_trash event
  → 清空 .jtype/trash/ 和 trash-metadata.json
```

## 7. 错误处理

| 场景 | 错误码 | 处理 |
|------|--------|------|
| 恢复目标路径已存在 | `restore_destination_exists` | 提示用户重命名 |
| 恢复项已被永久删除 | `trash_item_not_found` | 提示用户该文件已不存在 |
| 并发删除同一项 | 幂等成功 | `rows_affected() == 0` 不报错 |
| 存储空间不足 | `StorageBudgetExceeded` | 恢复前检查 `ensure_workspace_budget()` |
| 网络故障中断同步 | 本地缓存 | `pendingTrashOperations` 队列重试 |

## 8. 测试策略

### 8.1 Rust 单元测试

- `load_trash_sync_data()` 处理 empty_trash 事件
- `permanent_delete_trash_item()` 创建事件记录
- 幂等性：并发删除不报错
- `restore_trash_item()` 路径冲突检测

### 8.2 E2E 测试

| 场景 | 验证内容 |
|------|--------|
| 本地删除 → 云端同步 | 文件出现在云端回收站 |
| 云端删除 → 本地同步 | 本地回收站元数据更新 |
| 恢复从云端 | 文件重新出现在活跃文档 |
| 清空回收站 Web | Desktop pull 返回 empty_trash 事件 |
| 并发删除同一项 | 第二个 DELETE 返回幂等成功 |
| 过期项自动删除 | expiredTrashIds 在 pull 中返回 |

---

文档版本：1.0
日期：2026-05-04
