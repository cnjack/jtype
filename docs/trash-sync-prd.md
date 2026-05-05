# JType 回收站同步 PRD

日期：2026-05-04

## 1. 背景

### 1.1 现状

JType 已具备基础的本地回收站和云端回收站功能：

**云端回收站（`document_trash` 表）**：
- 软删除：文档被删除时移入回收站而非硬删除
- 30 天自动过期
- API 端点：`/api/v1/workspaces/:id/trash/*`（list/restore/permanent_delete/empty_trash）
- 同步集成：push 发送 `deletedPaths` 时，服务器将文档移入回收站

**本地回收站（`.jtype/trash/<timestamp>/` 目录）**：
- 删除时将文件移至 `.jtype/trash/<timestamp>/<relative_path>`
- Tauri 命令：`trash_entry`、`list_trash`、`restore_from_trash`、`permanent_delete`、`empty_trash`
- 前端支持列表展示

**基础同步行为**：
- **Sync Push**：本地删除 → 发送 `deletedPaths` → 云端创建软删除记录
- **Sync Pull**：云端 `document_trash` 有更新 → 拉取 `deletedPaths` → 本地文件移入 `.jtype/trash/`

### 1.2 问题

1. **回收站列表不同步**：
   - 云端删除的文件不会出现在本地回收站 UI（除非完整同步一次）
   - 本地删除的文件不会出现在 Web 回收站界面

2. **恢复操作不同步**：
   - 用户在云端恢复文件 → 本地回收站中该文件仍存在
   - 用户在本地恢复文件 → 云端回收站中该文件仍存在
   - 可能导致再次同步时重复冲突

3. **清空回收站不同步**：
   - 用户在云端清空回收站 → 本地 `.jtype/trash/` 未清空
   - 用户在本地清空回收站 → 云端 `document_trash` 未清空
   - 数据不一致

4. **永久删除不同步**：
   - 用户在云端永久删除某个回收站文件 → 本地仍有备份
   - 用户在本地永久删除某个回收站文件 → 云端仍有备份
   - 存储冗余

5. **UI 不完整**：
   - 本地侧边栏显示回收站入口，但未展示合并后的云+本地回收站项
   - Web 回收站界面缺少本地文件来源标识

### 1.3 对用户的影响

- **协作场景不清晰**：多设备/用户编辑时，无法确认哪边做了删除
- **恢复歧义**：恢复后需要手动同步才能生效，用户体验割裂
- **存储浪费**：永久删除只在一端生效，另一端仍占用空间

## 2. 产品目标

1. **统一回收站视图**：本地 + 云端回收站合并展示，用户一目了然
2. **恢复操作自动同步**：任一端恢复 → 另一端自动同步生效
3. **清空回收站一致性**：任一端清空 → 双向同步完成
4. **永久删除一致性**：单项永久删除 → 双向同步生效
5. **冲突处理明确**：定义明确的冲突规则和优先级

## 3. 用户故事

### 3.1 场景：Desktop 删除，Web 查看恢复

**AS A** 本地开发者
**I WANT** 在 Desktop 删除的文件能立即在 Web 回收站中看到
**SO THAT** 我可以从 Web 恢复这个文件到本地

**流程**：
1. Desktop 删除文件 → 本地移入 `.jtype/trash/`
2. 触发自动同步 → 将 `deletedPath` 推送到云端
3. 云端创建 `document_trash` 记录 → `device_source = 'desktop'`
4. Web 回收站刷新 → 显示该文件，标记来源为 'desktop'
5. 用户点击恢复 → 服务器恢复文档 + 同步标记到本地

### 3.2 场景：Web 清空回收站，Desktop 同步感知

**AS A** 云端管理员
**I WANT** 清空 Web 回收站后，Desktop 本地 `.jtype/trash/` 自动清空
**SO THAT** 存储空间一致，用户不会误解有本地备份

**流程**：
1. Web 回收站点击"清空回收站"
2. 服务器执行 `DELETE FROM document_trash WHERE workspace_id = ? AND restored_at IS NULL`
3. 记录 `trash_cleared_event` 到 workspace 事件日志，clock 递增
4. Desktop 下次同步时：
   - Pull 返回 `trash_cleared: true` 和 `empty_at_clock: N`
   - 本地检查 `.jtype/trash/` 中所有文件的删除 clock
   - 删除 clock <= empty_at_clock 的文件

### 3.3 场景：多设备竞争删除和恢复

**AS A** 协作用户
**I WANT** 在两个设备上分别对同一个文件进行删除/恢复操作时，有明确的冲突解决规则
**SO THAT** 我知道最终会发生什么

**流程**：
1. Desktop 删除文件 A
2. Web 设备（同时在线）删除了不同的文件 B
3. Desktop 同步 → 推送 A 的删除 → 收到 B 的删除
4. 两边都看到 A 和 B 在回收站中
5. Desktop 用户恢复 A
6. Web 用户恢复 B
7. 下次同步：A 恢复在 Desktop 上，B 恢复在 Web 上，不冲突

### 3.4 场景：恢复后冲突

**AS A** 用户
**I WANT** 当我在本地恢复一个文件后，而另一个设备已经永久删除它，有明确的冲突通知
**SO THAT** 我不会丢失用户操作意图

**流程**：
1. Device A 删除文件 X → 移入云端回收站
2. Device B 查看回收站 → 看到 X
3. Device B 永久删除 X → 从 `document_trash` 中删除记录
4. Device A 恢复 X → 调用恢复 API
5. 服务器检查 → X 已不在 `document_trash` 中
6. 返回 `RestoreConflict` → Device A 提示用户"文件已在其他端被永久删除"

## 4. 功能需求

### 4.1 数据库扩展

#### 4.1.1 `document_trash` 表扩展

```sql
ALTER TABLE document_trash ADD COLUMN source_device_id VARCHAR(128) NULL;
ALTER TABLE document_trash ADD COLUMN source_user_id CHAR(36) NULL;
ALTER TABLE document_trash ADD COLUMN restored_by_device_id VARCHAR(128) NULL;
ALTER TABLE document_trash ADD COLUMN restored_by_user_id CHAR(36) NULL;
ALTER TABLE document_trash ADD COLUMN restored_clock BIGINT NULL;
```

#### 4.1.2 新增 `trash_events` 表

用于记录回收站清空/永久删除等全局操作，支持增量同步：

```sql
CREATE TABLE IF NOT EXISTS trash_events (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  event_type ENUM('empty_trash', 'permanent_delete_all', 'permanent_delete_item') NOT NULL,
  event_data JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event_clock BIGINT NOT NULL,

  CONSTRAINT trash_events_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_trash_events_clock (workspace_id, event_clock)
);
```

### 4.2 API 变更

#### 4.2.1 Sync Pull 扩展

**端点**：`POST /api/v1/workspaces/:id/sync/pull`

**新增响应字段**：

```json
{
  "workspaceId": "...",
  "documents": [],
  "deletedPaths": [],
  "conflicts": [],

  "trash": {
    "items": [
      {
        "id": "trash_item_id",
        "documentId": "doc_id",
        "relativePath": "notes/old-doc.md",
        "title": "Old Document",
        "contentHash": "abc123...",
        "deletedByUserId": "user_id",
        "sourceDeviceId": "device_abc",
        "deletedAt": "2026-05-04T10:00:00Z",
        "expiresAt": "2026-06-03T10:00:00Z",
        "restoredAt": null,
        "deletedClock": 1005,
        "source": "cloud"
      }
    ],
    "events": [
      {
        "eventType": "empty_trash",
        "eventClock": 1010,
        "createdAt": "2026-05-04T11:00:00Z"
      }
    ],
    "expiredTrashIds": ["id1", "id2"],
    "trashCursor": 1015
  }
}
```

#### 4.2.2 Sync Push 扩展

**端点**：`POST /api/v1/workspaces/:id/sync/push`

**新增请求字段**：

```json
{
  "deviceId": "...",
  "documents": [],
  "deletedPaths": [],

  "trash": {
    "restoredTrashIds": [
      {
        "trashId": "trash_item_id",
        "relativePath": "notes/old-doc.md",
        "restoredAt": "2026-05-04T10:30:00Z"
      }
    ],
    "permanentDeleteTrashIds": [
      {
        "trashId": "trash_item_id"
      }
    ],
    "emptyTrash": false,
    "lastTrashCursor": 1010
  }
}
```

**新增响应字段**：

```json
{
  "accepted": 0,
  "documents": [],
  "deletedPaths": [],
  "conflicts": [],

  "trash": {
    "restoredTrashIds": [
      {
        "trashId": "...",
        "status": "restored"
      }
    ],
    "permanentDeletedTrashIds": [
      {
        "trashId": "...",
        "status": "deleted"
      }
    ],
    "trashEmptyStatus": "cleared",
    "newTrashCursor": 1015
  }
}
```

#### 4.2.3 REST API 新增/修改

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/workspaces/:id/trash/:trash_id/restore` | 恢复单个回收站项 → 设置 `restored_at`、`restored_by_user_id` |
| `DELETE` | `/api/v1/workspaces/:id/trash/:trash_id` | 永久删除单个项 → 从 `document_trash` 删除记录 |
| `POST` | `/api/v1/workspaces/:id/trash/empty` | 清空回收站 → `DELETE` 所有未还原项 + 创建 trash_event 记录 |
| `DELETE` | `/api/v1/workspaces/:id/trash` | 同 empty 操作 |

### 4.3 Desktop 应用扩展

#### 4.3.1 统一回收站视图类型

```typescript
type MergedTrashItem = {
  trashId: string;
  relativePath: string;
  name: string;
  trashedAt: number;
  source: 'local' | 'cloud';
  documentId?: string;
  sourceDeviceId?: string;
  sourceUserId?: string;
  expiresAt?: number;
};

type TrashItemDetail = {
  trashId: string;
  relativePath: string;
  name: string;
  trashedAt: number;
  source: 'local' | 'cloud';
  size?: number;
  preview?: string;
  contentHash?: string;
  sourceDeviceId?: string;
  sourceUserId?: string;
  expiresAt?: number;
};
```

#### 4.3.2 本地缓存

新增 `.jtype/trash-metadata.json` 记录云端回收站信息的本地缓存：

```json
{
  "lastSyncedTrashCursor": 1015,
  "cloudTrashItems": [
    {
      "trashId": "cloud_trash_uuid",
      "relativePath": "notes/old.md",
      "documentId": "doc_id",
      "trashedAt": "2026-05-04T10:00:00Z",
      "expiresAt": "2026-06-03T10:00:00Z",
      "sourceDeviceId": "device_id"
    }
  ],
  "pendingRestores": [],
  "pendingDeletes": []
}
```

### 4.4 同步逻辑更新

#### 4.4.1 Desktop Sync Flow

```
修改 syncWorkspaceToWeb() 流程：

1. Collect Phase (现有逻辑)
   - 收集本地所有 .md 文件
   - 加载 sync bases

2. Prepare Trash Operations (新增)
   - 读取 .jtype/trash-metadata.json
   - 检查本地 .jtype/trash/ 中有哪些待同步的恢复/删除操作
   - 标记 pendingRestores 和 pendingDeletes

3. Pull Phase (现有 + 扩展)
   - Fetch 文档、删除路径、冲突
   - 新增：Fetch 回收站项 + trash events
   - 更新本地 .jtype/trash-metadata.json
   - 对于 "restored in cloud" 的项：从本地 .jtype/trash/ 删除
   - 对于 "permanently deleted in cloud" 的项：从本地 .jtype/trash/ 删除
   - 对于 trash empty event：清空相应范围的本地回收站

4. Push Phase (现有 + 扩展)
   - 推送本地文档和 deletedPaths
   - 新增：推送 pendingRestores、pendingDeletes、emptyTrash 标记
   - 接收响应后，清理已推送的标记

5. Save Phase (现有 + 扩展)
   - 保存 sync bases
   - 新增：更新 .jtype/trash-metadata.json 中的 lastSyncedTrashCursor
```

### 4.5 冲突处理规则

#### 4.5.1 恢复冲突

| 场景 | 云端状态 | 本地操作 | 结果 |
|------|--------|--------|------|
| 恢复 + 云端已还原 | 已恢复 (restored_at != NULL) | 恢复 | 无操作，告知用户已在其他端恢复 |
| 恢复 + 云端已永久删除 | 不存在 | 恢复 | 冲突，用户可选择强制恢复或放弃 |
| 恢复 + 云端仍在回收站 | restored_at = NULL | 恢复 | 成功 |

#### 4.5.2 删除冲突

| 场景 | 云端状态 | 本地操作 | 结果 |
|------|--------|--------|------|
| 永久删除 + 云端有副本 | document_trash 中仍存在 | 永久删除 | 成功，两端都删除 |
| 永久删除 + 云端已恢复 | document 中存在 | 永久删除 | 冲突，提示用户云端文件已恢复 |

#### 4.5.3 清空冲突

| 场景 | 本端 | 对端 | 解决方案 |
|------|-----|------|--------|
| 并发清空 | Desktop 清空 + Push | Web 同时清空 | 幂等，两次清空都成功 |
| 清空后恢复 | Desktop 清空 | Web 恢复 | 恢复冲突，参考 4.5.1 |

## 5. 数据流图

### 5.1 恢复操作流程

```
Desktop:
  用户点击"恢复"
    ↓
  本地移出 .jtype/trash/
    ↓
  记录恢复操作到 trash-metadata.json (pendingRestores)
    ↓
  触发 Sync
    ├─ Pull (接收云端新回收站项)
    │   ↓
    │   更新 trash-metadata.json
    │   ↓
    │   应用云端恢复 → 删除本地 .jtype/trash/ 中的项
    │
    └─ Push
        ↓
        发送 trash.restoredTrashIds = [...]
        ↓
        Web 服务处理：
        ├─ 检查 document_trash 中项是否存在
        ├─ 设置 restored_at、restored_by_device_id
        ├─ 创建新 document 版本（source='restore'）
        ├─ 返回状态 (restored | not_found | conflict)
        │
        └─ Desktop 接收：
            ├─ 更新 trash-metadata.json
            ├─ 如果 not_found/conflict → 弹窗提示用户
            └─ 清理 pendingRestores
```

### 5.2 永久删除流程

```
Web:
  用户点击"永久删除"
    ↓
  调用 DELETE /api/v1/workspaces/:id/trash/:trash_id
    ↓
  服务器：
    ├─ 从 document_trash 删除记录
    ├─ 创建 trash_event (permanent_delete_item)
    ├─ 返回成功
    │
    └─ Desktop 下次 Sync:
        ├─ Pull 获取 trash_events
        ├─ 查找 permanent_delete_item 事件
        ├─ 从本地 .jtype/trash/ 删除对应文件
        ├─ 更新 trash-metadata.json
        └─ 显示"已在 Web 端永久删除"通知
```

### 5.3 清空回收站流程

```
Desktop:
  用户点击"清空回收站"
    ↓
  弹窗确认
    ↓
  删除 .jtype/trash/ 所有内容
    ↓
  标记 emptyTrash = true 到 push payload
    ↓
  Sync.Push:
    └─ 服务器：
        ├─ DELETE FROM document_trash WHERE workspace_id = ? AND restored_at IS NULL
        ├─ 创建 trash_event (empty_trash, event_clock=N)
        ├─ 返回 trashEmptyStatus = "cleared"
        │
        └─ Web 回收站下次刷新：
            └─ 显示空的回收站列表
```

## 6. 优先级

| 功能 | 优先级 | 说明 |
|------|------|------|
| 云端回收站列表拉取 + 本地缓存 | P0 | 必须：基础同步能力 |
| 恢复操作同步 | P0 | 必须：用户可恢复文件 |
| 本地恢复 → 云端同步 | P0 | 必须：协作一致性 |
| 永久删除单项同步 | P1 | 重要：清理存储 |
| 清空回收站同步 | P1 | 重要：批量操作一致性 |
| 冲突 UI 和解决 | P1 | 重要：用户清晰感知 |
| 回收站过期自动清理 | P2 | 优化：30 天自动清理 |
| 恢复冲突的"强制覆盖"选项 | P2 | 可选：高级用户功能 |

## 7. 非功能性需求

### 7.1 性能

- 回收站列表加载 < 500ms（< 1000 项）
- 单项恢复 < 1s
- 批量清空回收站 < 2s

### 7.2 一致性

- 双向同步操作后，两端回收站状态最终一致（eventually consistent）
- 同一项的冲突操作优先级：恢复 > 永久删除
- 时钟戳确保因果关系可追踪

### 7.3 存储

- 回收站元数据 < 1MB（通常 < 100KB）
- 文件内容在 `document_trash` 表中计入 `storage_budget`

### 7.4 安全

- 永久删除后 30 天才真正清理文件
- 用户只能操作所在 workspace 的回收站
- 软删除记录保留审计信息（deleted_by_user_id、device_id）

## 8. Out of Scope

| 项目 | 原因 |
|------|------|
| 版本恢复（恢复到文档历史某个版本） | 属于版本控制系统，不是回收站功能 |
| 跨 workspace 恢复 | 违反 workspace 隔离原则 |
| 自动恢复建议 | 需要 AI/ML 分析，V2 功能 |
| 回收站配额单独计算 | 目前计入总存储预算 |
| Web UI 拖拽移动删除文件到回收站 | 当前 UX 采用逻辑删除按钮 |

## 9. 实现计划

### Phase 1（P0 Core）

- 数据库字段扩展（source_device_id, restored_clock 等）
- trash_events 表创建
- Web 服务 Sync Pull 返回 trash.items
- Desktop 拉取回收站项，存入 trash-metadata.json
- 恢复操作基础实现（Web → Desktop 和反向）

### Phase 2（P1 Core）

- 永久删除单项同步实现
- 清空回收站同步实现
- trash_events 事件流式处理
- 冲突检测和 UI 提示

### Phase 3（P2 Polish）

- 过期项自动清理任务
- 性能测试和优化（1000+ 项列表）
- 文档和用户指南

## 10. 成功指标

- 用户能在 Desktop 和 Web 查看合并的回收站列表
- 跨端恢复/删除操作 100% 同步成功
- 冲突解决率 > 99%
- 回收站 UI 加载时间 < 500ms

---

文档版本：1.0
最后更新：2026-05-04
