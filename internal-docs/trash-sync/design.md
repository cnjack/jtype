# JType 回收站与同步 — 技术设计

> 合并自 sync-recycle-merge-design.md 和 trash-sync-design.md，已更新至实际实现状态。

日期：2026-05-04（最后更新：2026-05-11）

## 1. 架构概览

```
Desktop App (Tauri)                          Web Service (Axum)
┌─────────────────────┐                      ┌──────────────────────┐
│ .jtype/trash/       │ ◄── Sync Push/Pull ──► document_trash (MySQL)│
│ (本地回收站目录)      │                      │ trash_events          │
│                     │                      │                      │
│ Tauri 命令:          │                      │ handlers/trash.rs:   │
│ trash_workspace_entry│                      │  restore_trash_item_core()│
│ list_workspace_trash │                      │  permanent_delete_core()  │
│ restore_workspace_trash│                    │  empty_trash_core()       │
│ permanent_delete_trash │                    │                      │
│ empty_workspace_trash  │                    │ handlers/sync.rs:    │
└─────────────────────┘                      │  process_trash_operation()│
                                             └──────────────────────┘
```

核心原则：**trash.rs 定义核心函数，sync.rs 调用核心函数**。永远不在 sync.rs 中重复 trash SQL 逻辑。

## 2. 数据库设计

### 2.1 document_trash 表

```sql
CREATE TABLE document_trash (
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
  source_device_id VARCHAR(128) NULL,      -- 来源设备
  source_user_id CHAR(36) NULL,            -- 来源用户
  deleted_clock BIGINT NOT NULL DEFAULT 0,  -- 删除时 clock，增量同步用
  deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,            -- 30 天过期
  restored_at TIMESTAMP NULL,
  restored_by_device_id VARCHAR(128) NULL,
  restored_by_user_id CHAR(36) NULL,
  restored_clock BIGINT NULL,               -- 恢复时 clock
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- 索引
INDEX idx_document_trash_workspace_id (workspace_id)
INDEX idx_document_trash_ws_clock (workspace_id, deleted_clock)
INDEX idx_document_trash_expires_at (expires_at)
INDEX idx_document_trash_restored (workspace_id, restored_at, restored_clock)
```

### 2.2 trash_events 表

```sql
CREATE TABLE trash_events (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  event_type ENUM('empty_trash', 'permanent_delete_all', 'permanent_delete_item') NOT NULL,
  event_data JSON NOT NULL,
  event_clock BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
INDEX idx_trash_events_clock (workspace_id, event_clock)
```

## 3. 云端服务（Web Service）

### 3.1 trash.rs — 核心函数

所有 trash SQL 逻辑集中在 `handlers/trash.rs`，提供三个可复用的核心函数：

#### restore_trash_item_core()

```
1. 查询 document_trash 中目标项（WHERE id = ? AND workspace_id = ?）
2. 检查 documents 表是否已有同 relative_path 的文档
   - 有 → 返回冲突错误（restore_destination_exists）
3. 检查 workspace storage budget（ensure_workspace_budget）
4. INSERT 回 documents 表 + 创建 document_versions（source = 'restore'）
5. 设置 restored_at、restored_by_user_id、restored_by_device_id、restored_clock
6. 返回恢复后的文档
```

#### permanent_delete_core()

```
1. 从 document_trash 删除记录
2. 写入 trash_events（event_type = 'permanent_delete_item'）
3. 幂等：rows_affected == 0 不报错
```

#### empty_trash_core()

```
1. DELETE FROM document_trash WHERE workspace_id = ? AND restored_at IS NULL
2. 写入 trash_events（event_type = 'empty_trash'）
```

### 3.2 REST API handlers

trash.rs 中还提供 4 个 HTTP handler，对应 REST API 端点：

| Handler | 端点 | 调用 |
|---------|------|------|
| `list_trash` | GET /trash | 直接查询 document_trash |
| `restore_from_trash` | POST /trash/:id/restore | → `restore_trash_item_core()` |
| `permanent_delete` | DELETE /trash/:id | → `permanent_delete_core()` |
| `empty_trash` | DELETE /trash | → `empty_trash_core()` |

### 3.3 sync.rs — 同步协议中的 trash 处理

#### Pull 阶段

Pull response 包含 trash 相关数据：
- `deletedPaths`：since_clock 之后被删除的文档路径和 deleted_clock
- trash items：当前回收站内容（未恢复项）
- trash events：since_clock 之后的事件（清空、永久删除）

#### Push 阶段

Push request 可携带 trash 操作，由 `process_trash_operation()` 处理：

```rust
pub async fn process_trash_operation(
    pool, hub, workspace_id, user, device_id, operation, exclude_session
) -> Result<()> {
    match operation {
        RestoreItem { trash_id } => trash::restore_trash_item_core(...),
        PermanentDelete { trash_id } => trash::permanent_delete_core(...),
        EmptyTrash => trash::empty_trash_core(...),
    }
}
```

`live.rs` 中的 WebSocket handler 也调用同一个 `process_trash_operation()`。

## 4. 桌面端（Tauri）

### 4.1 本地回收站目录结构

```
vault-root/
  .jtype/
    trash/
      <timestamp>/
        <relative_path>   (被删除的文件)
      metadata.json        (trash 项元数据)
```

### 4.2 Tauri 命令

| 命令 | 功能 |
|------|------|
| `trash_workspace_entry(root_path, relative_path)` | 将文件移入 `.jtype/trash/<timestamp>/`，返回刷新后的 workspace |
| `list_workspace_trash(root_path)` | 列出本地回收站所有项 |
| `restore_workspace_trash(root_path, trash_id, relative_path)` | 从回收站恢复文件到原路径 |
| `permanent_delete_trash(root_path, trash_id)` | 永久删除回收站项 |
| `empty_workspace_trash(root_path)` | 清空整个本地回收站 |

### 4.3 前端集成

- `useFileSystem.ts` 中 `deleteCurrentEntry` 调用 `trash_workspace_entry`（而非硬删除）
- 确认弹窗文案："Move ... to trash?"
- 侧边栏提供回收站入口，展示合并的本地 + 云端回收站项

## 5. 同步数据流

### 5.1 本地删除 → 云端同步

```
用户在 Desktop 删除文件
  → trash_workspace_entry() 移至 .jtype/trash/
  → Sync Push 发送 deletedPaths
  → Web Service 创建 document_trash 记录（deleted_clock 递增）
  → Web 回收站显示该文件
```

### 5.2 云端删除 → 本地同步

```
Web 用户删除文件 → document_trash 记录
  → Desktop Pull 获取 deletedPaths
  → 本地 trashEntry() 移入 .jtype/trash/
  → 更新本地回收站 UI
```

### 5.3 恢复操作同步

```
Desktop 恢复文件
  → 本地移出 .jtype/trash/ 回原路径
  → Push trash operation (RestoreItem)
  → Web Service: restore_trash_item_core()
    → 设置 restored_at、restored_clock
    → 创建新 document + document_version
  → 其他设备 Pull 获取恢复的文档
```

### 5.4 永久删除同步

```
Web 永久删除某项
  → permanent_delete_core()
    → 从 document_trash 删除记录
    → 创建 trash_event (permanent_delete_item)
  → Desktop Pull 获取 trash_events
  → 从本地 .jtype/trash/ 删除对应文件
```

### 5.5 清空回收站同步

```
Desktop 清空回收站
  → 删除 .jtype/trash/ 所有内容
  → Push trash operation (EmptyTrash)
  → Web Service: empty_trash_core()
    → DELETE FROM document_trash WHERE restored_at IS NULL
    → 创建 trash_event (empty_trash)
  → Web 回收站刷新为空
```

## 6. 错误处理

| 场景 | 错误码 | 处理 |
|------|--------|------|
| 恢复目标路径已存在 | `restore_destination_exists` | 提示用户重命名 |
| 恢复项已被永久删除 | `trash_item_not_found` | 提示文件已不存在 |
| 并发删除同一项 | 幂等成功 | `rows_affected == 0` 不报错 |
| 存储空间不足 | `StorageBudgetExceeded` | 恢复前检查 `ensure_workspace_budget()` |
| 网络故障中断同步 | 本地缓存 | pending 队列下次重试 |

## 7. 前端类型

```typescript
// src/lib/types.ts

export type TrashItem = {
  id: string;
  relativePath: string;
  title: string;
  deletedAt: string;
  expiresAt: string;
};

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
```
