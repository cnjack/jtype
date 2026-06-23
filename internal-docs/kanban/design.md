# JType 看板（Kanban）技术设计文档

状态：CLOUD（第 2–5、8–11 节）已实现 v1。**LOCAL（第 6 节）与 Desktop↔Cloud 同步（第 7 节）已撤回**——`kanban_local.rs` 曾实现后在提交 `1576515` 中整体删除（−672 行），当前 `main` 不存在。第 6/7 节保留为历史设计意图,**不反映当前代码**。桌面看板现为纯文件式（`.board` + `.md` 卡片）经文档同步管线收敛——详见 [`next-features-design.md` §0](./next-features-design.md) 与 [`gaps-and-roadmap.md`](./gaps-and-roadmap.md)。
初始日期：2026-06-13
更新日期：2026-06-20（标注 §6/§7 已撤回）

> ⚠️ **过时警告**：下文将 **LOCAL（`kanban_local.rs`）** 描述为已实现,但该模块已删除,当前 `main` 不存在。**仅 CLOUD + MULTI-DEVICE 部分反映现状。**
>
> 本文档（原始）描述 Kanban 功能在三种运行环境中的完整设计：**LOCAL**（桌面端离线存储 `kanban_local.rs`,**已撤回**）、**CLOUD**（Axum REST + MySQL）、**MULTI-DEVICE**（WebSocket 广播 + 收敛）。
>
> Kanban 复用与文档/回收站同步完全一致的本地优先（local-first）模型：workspace 级单调 `sync_clock`、pending-ops 队列、pull/push、三方收敛。所有陈述均以当前实现为准，未实现项明确标注于第 12、13 节。

## 1. 架构概览

```
Desktop App (Tauri 2)                              Web Service (Axum)
┌──────────────────────────┐                       ┌────────────────────────────────┐
│ {vault}/.jtype/kanban.json│ ◄── REST push/pull ──►│ MySQL                          │
│  LocalKanbanStore         │                       │  kanban_boards                 │
│   - boards[]              │                       │  kanban_columns                │
│   - lastSyncedClock       │                       │  kanban_cards                  │
│   - localClock            │                       │  kanban_labels                 │
│   - pendingOps[]          │                       │  kanban_card_labels (M:N)      │
│                           │                       │  kanban_card_trash (软删审计)   │
│ Tauri 命令 (kanban_local):│                       │                                │
│  kanban_load              │                       │ handlers/kanban/*.rs           │
│  kanban_create_board      │                       │  board.rs / column.rs          │
│  kanban_create_card       │                       │  card.rs / label.rs            │
│  kanban_move_card         │                       │  mod.rs (validate)             │
│  kanban_archive_card      │                       │  （trash 处理器在 card.rs）     │
│  kanban_restore_card      │                       │ hub::ConnectionHub             │
│  kanban_take_pending_ops  │ ◄── WebSocket 广播 ───►│  publish_to_workspace()        │
│  kanban_merge_remote_board│                       │  /api/v1/live                  │
└──────────────────────────┘                       └────────────────────────────────┘

Web Browser (React SPA)
┌──────────────────────────┐
│ REST 直连 cloud           │ ── HTTP ──► 同上 cloud 端点
│ WS /api/v1/live 接收事件   │ ── WS ────► 收到 kanban:* 事件后 refetch
│ （在线优先，无离线 IDB 缓存）│
└──────────────────────────┘

通信分工：
  Desktop  → REST push (drain pendingOps) + pull (merge board snapshots) ；WS 接收实时通知触发 pull
  Web      → REST 直接读写 cloud ；WS 接收实时通知触发 refetch
  Cloud    → 每次变更递增 workspaces.sync_clock，并 publish_to_workspace 广播事件
```

### 1.1 单一权威时钟（sync_clock）

- 与文档同步共用同一个 `workspaces.sync_clock`（单调 bigint，per-workspace）。
- 每一次 Kanban 写操作（建/改/移/归档/恢复/删板/标签变更）调用 `next_workspace_clock(tx, workspace_id)`，使该 workspace 内所有事件（文档、回收站、Kanban）获得**全序**。
- 时钟一旦分配即不可变；用于增量 pull、乐观锁冲突检测、多端收敛排序。

### 1.2 协议分工

| 操作 | Desktop | Web（在线） |
|------|---------|------------|
| 读取看板 | `kanban_load`（本地）+ REST pull 合并 | REST `GET .../boards/:board_id` |
| 创建/编辑 | 本地立即写入 + 入队 pendingOp，异步 push | REST 直连 cloud |
| 实时通知 | WS → Tauri 事件 → 触发 pull/merge | WS → refetch 受影响实体 |
| 冲突解决 | `updated_clock` LWW（merge_remote_board） | 乐观锁 `baseUpdatedClock`/`force`/409 |

> 设计原则：Cloud 是权威源；Desktop 本地乐观更新后由 `take_pending_ops` 异步回放；任一端的 `updated_clock` 是收敛的唯一裁决依据。

## 2. 数据库设计（Cloud / MySQL）

所有表的 `id` 均为 `CHAR(36)` UUID，由**调用方（前端）生成**并在本地与云端复用（见第 11 节锁定决策）。

> sqlx 未启用 `time`/`chrono` feature：所有 `TIMESTAMP`/`DATETIME` 列在 SELECT 时统一用 `CAST(ts AS CHAR)` 取出为字符串（如 `due_at`、`archived_at`、`expires_at`、`restored_at`、`created_at`、`updated_at`），再由应用层解析。写入时 `due_at` 经 `normalize_due_at` 归一为 `YYYY-MM-DD HH:MM:SS`。

### 2.1 kanban_boards 表

```sql
CREATE TABLE kanban_boards (
  id                 CHAR(36) PRIMARY KEY,
  workspace_id       CHAR(36) NOT NULL,
  name               VARCHAR(255) NOT NULL,
  description        TEXT NULL,
  position           INT NOT NULL DEFAULT 0,        -- workspace 内 0-based 排序
  created_by_user_id CHAR(36) NOT NULL,
  updated_clock      BIGINT NOT NULL DEFAULT 0,     -- 同步时钟
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_board_per_workspace (workspace_id, name),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
-- 索引
INDEX idx_boards_workspace_position (workspace_id, position)
```

| 字段 | 说明 |
|------|------|
| `name` | workspace 内唯一；重复返回 400 |
| `position` | 追加策略 `COALESCE(MAX(position), -1) + 1`，可经 reorder 重排 |
| `updated_clock` | 每次 board 变更递增，参与 LWW |

### 2.2 kanban_columns 表

```sql
CREATE TABLE kanban_columns (
  id         CHAR(36) PRIMARY KEY,
  board_id   CHAR(36) NOT NULL,
  name       VARCHAR(255) NOT NULL,
  position   INT NOT NULL DEFAULT 0,         -- board 内 0-based 排序
  wip_limit  INT NULL,                       -- 仅作建议，服务端不强制
  color      CHAR(7) NULL,                   -- #RRGGBB
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_column_per_board (board_id, name),
  FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE
);
-- 索引
INDEX idx_columns_board_position (board_id, position)
```

| 字段 | 说明 |
|------|------|
| `name` | board 内唯一；重复返回 400 |
| `wip_limit` | **建议值**，服务端永不据此拦截建卡/移卡（见 11.7） |
| `color` | 经 `validate_hex_color` 校验，大小写不敏感 |

> 列无独立 DELETE 端点；仅随 board 硬删除级联删除（见 4.6 与开放项 13.3）。

### 2.3 kanban_cards 表

```sql
CREATE TABLE kanban_cards (
  id                 CHAR(36) PRIMARY KEY,
  workspace_id       CHAR(36) NOT NULL,
  board_id           CHAR(36) NOT NULL,
  column_id          CHAR(36) NOT NULL,
  title              VARCHAR(512) NOT NULL,
  description        MEDIUMTEXT NULL,
  position           INT NOT NULL DEFAULT 0,   -- column 内 0-based，仅对 active 卡有效
  priority           ENUM('none','low','medium','high','urgent') NOT NULL DEFAULT 'none',
  due_at             TIMESTAMP NULL,           -- 归一为 YYYY-MM-DD HH:MM:SS
  assignee_user_id   CHAR(36) NULL,
  properties_extra   JSON NULL,
  created_by_user_id CHAR(36) NOT NULL,
  updated_clock      BIGINT NOT NULL DEFAULT 0,
  version_id         CHAR(36) NOT NULL,        -- 每次更新换新 UUID，乐观锁辅助
  archived_at        TIMESTAMP NULL,           -- NULL = active；非空 = 已归档
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id)  REFERENCES kanban_boards(id)  ON DELETE CASCADE,
  FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_user_id) REFERENCES users(id)   ON DELETE SET NULL
);
-- 索引
INDEX idx_cards_column_position (column_id, position)
INDEX idx_cards_board           (board_id)
INDEX idx_cards_workspace       (workspace_id)
INDEX idx_cards_assignee        (assignee_user_id)
INDEX idx_cards_archived        (archived_at)
```

| 字段 | 说明 |
|------|------|
| `position` | **非唯一**；归档卡移除后可能留空隙，归档/移动/恢复时对 active 集合 0..n-1 重排压实 |
| `priority` | 经 `validate_priority` 校验，5 个精确字符串，大小写敏感 |
| `due_at` | 经 `normalize_due_at` 归一；SELECT 时 `CAST AS CHAR` |
| `assignee_user_id` | 须为 workspace 成员；用户被删则 `SET NULL`（卡变为未分配） |
| `version_id` | 每次更新生成新 UUID，配合 `updated_clock` 做乐观锁 |
| `archived_at` | 软删除标记；active 查询统一 `WHERE archived_at IS NULL` |

### 2.4 kanban_labels 表

```sql
CREATE TABLE kanban_labels (
  id          CHAR(36) PRIMARY KEY,
  board_id    CHAR(36) NOT NULL,
  name        VARCHAR(80) NOT NULL,
  color       CHAR(7) NOT NULL,              -- #RRGGBB
  description VARCHAR(255) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_label_per_board (board_id, name),
  FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE
);
-- 索引
INDEX idx_labels_board (board_id)
```

- 每 board 标签上限 **50**（`MAX_LABELS_PER_BOARD = 50`），在 `create_label` 中以 `COUNT(*)` 校验，超出返回 400。

### 2.5 kanban_card_labels 表（M:N 关联）

```sql
CREATE TABLE kanban_card_labels (
  card_id    CHAR(36) NOT NULL,
  label_id   CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (card_id, label_id),
  FOREIGN KEY (card_id)  REFERENCES kanban_cards(id)  ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES kanban_labels(id) ON DELETE CASCADE
);
-- 索引
INDEX idx_card_labels_label (label_id)
```

### 2.6 kanban_card_trash 表（归档/软删审计日志）

```sql
CREATE TABLE kanban_card_trash (
  id                    CHAR(36) PRIMARY KEY,   -- trash 记录 ID（非 card ID）
  workspace_id          CHAR(36) NOT NULL,
  card_id               CHAR(36) NOT NULL,      -- 被归档的卡 ID
  board_id              CHAR(36) NOT NULL,      -- 归档时快照
  column_id             CHAR(36) NOT NULL,      -- 归档时快照
  title                 VARCHAR(512) NOT NULL,  -- 快照
  description           MEDIUMTEXT NULL,        -- 快照
  priority              VARCHAR(16) NOT NULL,   -- 快照
  position              INT NOT NULL,           -- 归档时快照位置
  due_at                TIMESTAMP NULL,         -- 快照
  assignee_user_id      CHAR(36) NULL,          -- 快照
  properties_extra      JSON NULL,              -- 快照
  label_ids             JSON NULL,              -- 归档时 card_labels 的 label_id 数组快照（NULL 性为推断）
  created_by_user_id    CHAR(36) NOT NULL,      -- 原卡创建者
  archived_by_user_id   CHAR(36) NOT NULL,      -- 归档者
  archived_by_device_id VARCHAR(128) NULL,      -- 审计
  source_device_id      VARCHAR(128) NULL,      -- 审计
  source_user_id        CHAR(36) NULL,          -- 审计
  archived_clock        BIGINT NOT NULL,        -- 归档时 sync_clock
  archived_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at            TIMESTAMP NOT NULL,      -- archived_at + 30 天
  restored_at           TIMESTAMP NULL,          -- 恢复时设置
  restored_by_user_id   CHAR(36) NULL,
  restored_by_device_id VARCHAR(128) NULL,
  restored_clock        BIGINT NULL,             -- 恢复时 sync_clock
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
-- 索引
INDEX idx_card_trash_workspace (workspace_id)
INDEX idx_card_trash_expires   (expires_at)
INDEX idx_card_trash_restored  (restored_at)
```

> 同一 card 允许**多条** trash 行：归档 → 恢复 → 再归档会各自生成新行；恢复时取最新一条未恢复行（`restored_at IS NULL ORDER BY archived_clock DESC LIMIT 1`）。

## 3. Cloud REST API（handlers/kanban）

所有端点均经 `require_workspace_role` 角色门控。前缀统一为 `/api/v1/workspaces/:workspace_id/kanban`。

### 3.1 Boards 端点

| 方法 | 路径 | 说明 | 角色 |
|------|------|------|------|
| GET | `/kanban/boards` | 列出 workspace 内所有 board | viewer+ |
| POST | `/kanban/boards` | 创建 board | editor+ |
| GET | `/kanban/boards/:board_id` | 取单 board（含 columns、cards、labels；仅 active 卡，不含 trash） | viewer+ |
| PATCH | `/kanban/boards/:board_id` | 更新 name/description | editor+ |
| POST | `/kanban/boards/reorder` | 重排 board 顺序 | editor+ |
| DELETE | `/kanban/boards/:board_id` | 硬删除（级联 columns/cards/labels/trash） | admin+ |

### 3.2 Columns 端点

| 方法 | 路径 | 说明 | 角色 |
|------|------|------|------|
| POST | `/kanban/boards/:board_id/columns` | 创建列 | editor+ |
| PATCH | `/kanban/columns/:column_id` | 更新 name/wip_limit/color | editor+ |
| POST | `/kanban/columns/reorder` | 重排 board 内列顺序 | editor+ |

> 无 DELETE 列端点：列仅随 board 硬删除级联清除。

### 3.3 Cards 端点

| 方法 | 路径 | 说明 | 角色 |
|------|------|------|------|
| GET | `/kanban/boards/:board_id/cards` | 列出卡（支持 `?includeArchived=true`） | viewer+ |
| POST | `/kanban/boards/:board_id/cards` | 创建卡 | editor+ |
| PATCH | `/kanban/cards/:card_id` | 更新字段（可选乐观锁 `baseUpdatedClock`/`force`） | editor+ |
| POST | `/kanban/boards/:board_id/cards/move` | 移动/重排（支持乐观锁） | editor+ |
| POST | `/kanban/cards/:card_id/archive` | 软删除 → kanban_card_trash | editor+ |
| POST | `/kanban/cards/:card_id/restore` | 从 trash 恢复（追加到列尾） | editor+ |
| DELETE | `/kanban/cards/:card_id` | 硬删除 | admin+ |
| GET | `/kanban/boards/:board_id/trash` | 列出活跃 trash 项（未恢复、未过期） | viewer+ |

### 3.4 Labels 端点

| 方法 | 路径 | 说明 | 角色 |
|------|------|------|------|
| GET | `/kanban/boards/:board_id/labels` | 列出 board 标签 | viewer+ |
| POST | `/kanban/boards/:board_id/labels` | 创建标签（每 board 上限 50） | editor+ |
| PATCH | `/kanban/labels/:label_id` | 更新 name/color/description | editor+ |
| DELETE | `/kanban/labels/:label_id` | 硬删除（级联 card_labels） | editor+ |

### 3.5 角色门控汇总

| 端点 | 角色门 |
|------|--------|
| 列出 boards / 取 board / 列出 cards / 列出 trash / 列出 labels | viewer+ |
| 创建/编辑 board、reorder boards | editor+ |
| 创建/编辑/reorder columns | editor+ |
| 创建/编辑/移动/归档/恢复 card | editor+ |
| 创建/编辑/删除 label | editor+ |
| 删除 board、硬删除 card | admin+（owner 或 admin） |

## 4. Cloud 生命周期规则

### 4.1 创建（board / column / card / label）

- **空名拒绝**：`name.trim()` 在 clamp 后不可为空，否则 400。board/column 用 `name`（「board name cannot be empty」/「column name cannot be empty」），card 用 `title`（「card title cannot be empty」）。
- **位置分配**：追加策略 `position = COALESCE(MAX(position), -1) + 1`。
- **重名校验**：board（workspace 内）、column（board 内）、label（board 内）唯一键 + DB 错误捕获 → 400。
- 创建 board 不在 cloud 端自动播种列；列由调用方依次 POST 创建（本地 `create_board` 才播种 3 列，见 6.2）。
- **创建广播**：创建复用对应实体的 `*-updated` 事件——board 创建广播 `kanban:board-updated`、column 创建广播 `kanban:column-updated`、card 创建广播 `kanban:card-updated`、label 创建广播 `kanban:label-changed`（事件目录见第 5 节，创建事件与改名/重排共用同一 key）。

### 4.2 归档（软删除）→ trash

```
1. kanban_cards.archived_at = NOW()（不物理删除）
2. INSERT kanban_card_trash：
   - 快照 title/description/priority/position/due_at/assignee/properties_extra
   - label_ids = 当前 card_labels 的 label_id JSON 数组
   - archived_clock = next_workspace_clock()
   - expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY)
   - 审计：archived_by_user_id / archived_by_device_id / source_user_id / source_device_id
3. 压实源列：剩余 active 卡重排 0..n-1（无空隙）
4. 广播 WS：kanban:card-archived { boardId, cardId, columnId, archivedClock }
```

### 4.3 恢复（从 trash）

```
1. 取最新未恢复行：
   WHERE card_id=? AND workspace_id=? AND restored_at IS NULL
   ORDER BY archived_clock DESC LIMIT 1 FOR UPDATE
2. 校验原列仍存在；若已删除 → 400「original column was deleted; cannot auto-restore」
3. 追加到目标列尾（非原位置）：
   position = MAX(position)+1 WHERE column_id=? AND archived_at IS NULL
   （原位置可能已被归档期间新增的卡占用）
4. UPDATE kanban_cards：archived_at=NULL, column_id=?, position=new_pos,
   updated_clock=next_clock, version_id=new_uuid
5. 恢复标签：删除该卡所有 card_labels，按 trash 行 label_ids 重新 INSERT IGNORE
   （IGNORE 处理归档期间被删除的标签）
6. 标记 trash 行：restored_at=NOW(), restored_by_user_id=?,
   restored_by_device_id=?, restored_clock=next_clock
7. 广播 WS：kanban:card-restored { boardId, cardId, columnId, restoredClock }
8. fetch_card_value 返回完整卡快照
```

### 4.4 trash 过期与清理 cron

```
1. 服务启动时 spawn 清理任务（tasks::cleanup_trash::spawn）
2. 每 1 小时执行：
   DELETE FROM kanban_card_trash
   WHERE restored_at IS NULL AND expires_at < CURRENT_TIMESTAMP
3. 已恢复行（restored_at 非空）不清理，作为审计历史保留
```

### 4.5 board 硬删除

```
1. MySQL FK ON DELETE CASCADE 级联清除：
   - kanban_columns（本 board）
   - kanban_cards（本 board，触发卡的 FK 级联）
   - kanban_labels（本 board）
   - kanban_card_labels（经卡级联）
   - kanban_card_trash 行（已归档卡，纳入级联）
2. 角色门：admin+（owner 或 admin）
3. 广播 WS：kanban:board-deleted { boardId, deletedClock }
```

### 4.6 列硬删除

不提供端点。列仅随 board 删除级联清除（避免删列引发的卡孤儿/位置重整复杂度，见 13 节）。

### 4.7 卡位置一致性

- **仅对 active 卡**：`WHERE column_id=? AND archived_at IS NULL`。
- **0-based 无空隙**：active 集合内 0,1,2,...。
- **归档时压实**：源列剩余兄弟卡重排。
- **移动/重排时压实**：目标列全部重排 0..n-1。
- **恢复时追加**：`position = max+1`。

### 4.8 移动/重排算法

- **列内重排**：`ORDER BY position ASC FOR UPDATE` 取全部 active 卡 → 移除被移卡 → 在目标位置插入（clamp 到列表长度）→ 0..n-1 重排。
- **跨列移动**：压实源列 → 取目标列 active 卡 → 插入被移卡（clamp）→ 目标列重排 → 原子更新被移卡 `column_id` 与 `position`。
- **禁止移动归档卡**：`archived_at IS NOT NULL` → 400「cannot move archived card; restore first」。

### 4.9 列出 cards / trash 的过滤

- `GET .../cards`：默认 `archived_at IS NULL`（仅 active）；`?includeArchived=true` 时不过滤。
- `GET .../trash`：`restored_at IS NULL AND expires_at > CURRENT_TIMESTAMP`，`ORDER BY archived_at DESC`，返回 `KanbanCardTrashItem`（含审计字段与 `label_ids` 快照）。

## 5. WebSocket 事件目录

经 `hub::ConnectionHub::publish_to_workspace(workspace_id, event, exclude_session?)` 向订阅该 workspace 的所有会话广播（排除发起会话）。所有事件统一携带：

| 字段 | 说明 |
|------|------|
| `type` | 事件类型 key（如 `kanban:card-updated`） |
| `workspaceId` | 所属 workspace |
| `sourceSessionId` | 发起会话（可选，广播时排除） |
| `source` | `"web"`（Web 发起）；Desktop REST push 经 `x-device-id` 标识 |
| `deviceId` | 可选，来自 `x-device-id` 请求头 |

事件 JSON 为 **camelCase**。

### 5.1 Board 事件

| 事件 | 触发源 | 字段 |
|------|--------|------|
| `kanban:board-updated` | board 名称/位置变更 | `boardId, name, position, updatedClock, editedBy` |
| `kanban:board-deleted` | board 硬删除 | `boardId, deletedClock` |

### 5.2 Column 事件

| 事件 | 触发源 | 字段 |
|------|--------|------|
| `kanban:column-updated` | 列创建/改名/重排 | `boardId, columnId, name, position, updatedClock, editedBy` |

### 5.3 Card 事件

| 事件 | 触发源 | 字段 |
|------|--------|------|
| `kanban:card-updated` | 卡创建/编辑/移动/重排 | `boardId, columnId, cardId, title, position, priority, updatedClock, editedBy` |
| `kanban:card-archived` | 卡软删除入 trash | `boardId, cardId, columnId, archivedClock` |
| `kanban:card-restored` | 卡从 trash 恢复 | `boardId, cardId, columnId, restoredClock` |
| `kanban:card-deleted` | 卡硬删除 | `boardId, cardId, columnId, deletedClock` |

### 5.4 Label 事件

| 事件 | 触发源 | 字段 |
|------|--------|------|
| `kanban:label-changed` | 标签创建/更新/删除（触发 board 全量标签 refetch） | `boardId, updatedClock, editedBy` |

### 5.5 自回声过滤（Self-Echo Filter）

- **Web**：payload 含 `sourceSessionId`，浏览器比对自身 session_id，相等则跳过。
- **Desktop**：payload 含 `source` + `deviceId`，`ws_client` 比对本地 `device_id`，相等则跳过，避免双重同步。

## 6. LOCAL — 桌面端离线存储（kanban_local.rs）

> 🛑 **本节已撤回,不反映当前代码。** `src-tauri/src/kanban_local.rs`(`LocalKanbanStore`、`kanban_take_pending_ops`、`kanban_merge_remote_board` 等)在提交 `1576515` 中被整体删除(−672 行),当前 `main` 不存在这些符号。下文仅作历史设计记录。桌面看板现为纯文件式(`.board` + `.md` 卡片),无独立本地 store。

### 6.1 磁盘存储位置与 JSON 形态

文件路径：`{vault_root}/.jtype/kanban.json`，经 `serde_json::to_string_pretty()` 写入。

```json
{
  "boards": [LocalBoard, ...],
  "lastSyncedClock": 0,
  "localClock": 0,
  "pendingOps": [PendingKanbanOp, ...]
}
```

**LocalBoard / LocalColumn / LocalCard / LocalLabel / PendingKanbanOp**（camelCase 字段）：

```rust
LocalBoard {
  id: String, name: String, description: Option<String>,
  position: i32, updated_clock: i64,
  columns: Vec<LocalColumn>, cards: Vec<LocalCard>, labels: Vec<LocalLabel>,
}

LocalColumn {
  id: String, name: String, position: i32,
  wip_limit: Option<i32>, color: Option<String>,
}

LocalCard {
  id: String, column_id: String, title: String,
  description: Option<String>, position: i32,
  priority: String,            // default "none"
  due_at: Option<String>, assignee_user_id: Option<String>,
  label_ids: Vec<String>, archived_at: Option<String>, updated_clock: i64,
}

LocalLabel {
  id: String, name: String, color: String, description: Option<String>,
}

PendingKanbanOp {
  op_type: String,             // "type" in JSON
  board_id: String, card_id: Option<String>,
  payload: serde_json::Value,  // op-specific
  local_clock: i64,            // 入队时戳，入队后不可变
}
```

> 与 cloud 表的映射：LocalBoard 内联其 columns/cards/labels（cloud 端为分表）。`label_ids`（卡内联标签 ID 数组）对应 cloud 的 `kanban_card_labels` 关联。本地不存 `kanban_card_trash` 审计行——归档卡仅以 `archived_at` 非空标记保留在 `cards[]` 中。

### 6.2 本地操作与不变量

| 操作 | 不变量 / 行为 | 入队 op |
|------|--------------|---------|
| `create_board(id,name,desc,column_ids[3])` | 校验 `column_ids.len()==3`，依次播种「To do/Doing/Done」位 0/1/2；board 名 workspace 内唯一（大小写敏感）；`position = max+1` | `createBoard` `{name, description}` |
| `delete_board(board_id)` | 删除 board；`pending_ops.retain(board_id != ?)` 清掉该板所有旧 op，仅留 delete | `deleteBoard` `{clock: local_clock}` |
| `create_card(board_id,column_id,id,title,desc,priority,label_ids)` | 标题 trim 非空；列须在板上；`position = max(列内非归档)+1`（追加） | `createCard` `{columnId, title, priority}` |
| `move_card(board_id,card_id,target_col,target_pos)` | 压实源列 0..n；目标列插入并重排；`idx = clamp(target_pos, 0, len)`；禁移归档卡 | `moveCard` `{targetColumnId, targetPosition}` |
| `archive_card(board_id,card_id,archived_at)` | 设 `archived_at`；压实源列；二次归档报错 | `archiveCard` `{}` |
| `restore_card(board_id,card_id)` | 清 `archived_at`；`position = max(非归档)+1`（追加列尾）；非归档卡报错 | `restoreCard` `{}` |
| `column_cards(board_id,column_id)` | 只读查询，返回非归档卡按 position 升序 | 无 |
| `take_pending_ops()` | 排空队列，返回 drained ops；后续 mutation 用新 `local_clock` | 无 |

### 6.3 pending-ops 队列语义

- 每次 mutation 先取当前 `local_clock` 戳到 op（入队后不可变），再 `local_clock += 1`（从 0 起单调）。
- op 追加进 `pending_ops`；同步层调用 `take_pending_ops()` 排空后回放到 cloud REST。
- **删板特例**：`delete_board` 用 `pending_ops.retain(|op| op.board_id != board_id)` 移除该板所有先前 op，仅留 `deleteBoard`，防止把卡/列 op 回放给已删板。
- op 类型取值：`createBoard` / `deleteBoard` / `createCard` / `moveCard` / `archiveCard` / `restoreCard`。

### 6.4 merge_remote_board — updated_clock LWW

```rust
fn merge_remote_board(&mut self, remote: LocalBoard, cloud_clock: i64) {
  if cloud_clock > self.last_synced_clock {
    self.last_synced_clock = cloud_clock;     // 追踪见过的最高服务端 clock
  }
  match self.boards.iter_mut().find(|b| b.id == remote.id) {
    Some(local) if local.updated_clock >= remote.updated_clock => {
      // 本地更新或相等 —— 保留本地（其 pending ops 仍在队列）
    }
    Some(local) => { *local = remote; }       // 远端更新 —— 整板替换
    None => self.boards.push(remote),         // 来自对端的新板 —— 追加
  }
}
```

不变量：
- 裁决用 `board.updated_clock`（非 `cloud_clock`）。
- `last_synced_clock` 仅在 `cloud_clock` 更高时前进。
- 本地 `updated_clock >= remote` → 整板保留（含队列中未推送的 pending ops）。
- 远端更高 → 整板快照覆盖。
- 无同 ID 本地板 → 追加。

### 6.5 注册的 Tauri 命令

所有命令（除 `kanban_take_pending_ops`）经 `kanban_mutate` 助手：load → 应用闭包（含入队副作用）→ `save_kanban_store` → 返回整个 store 供前端重渲染。

| 命令 | 签名 | 返回 |
|------|------|------|
| `kanban_load` | `(root_path)` | `LocalKanbanStore` |
| `kanban_create_board` | `(root_path, id, name, description?, column_ids[3])` | `LocalKanbanStore` |
| `kanban_delete_board` | `(root_path, board_id)` | `LocalKanbanStore` |
| `kanban_create_card` | `(root_path, board_id, column_id, id, title, description?, priority?, label_ids?)` | `LocalKanbanStore` |
| `kanban_move_card` | `(root_path, board_id, card_id, target_column_id, target_position: i32)` | `LocalKanbanStore` |
| `kanban_archive_card` | `(root_path, board_id, card_id, archived_at)` | `LocalKanbanStore` |
| `kanban_restore_card` | `(root_path, board_id, card_id)` | `LocalKanbanStore` |
| `kanban_take_pending_ops` | `(root_path)` | `Vec<PendingKanbanOp>`（排空并持久化空队列） |
| `kanban_merge_remote_board` | `(root_path, board: LocalBoard, cloud_clock: i64)` | `LocalKanbanStore` |

```rust
fn kanban_mutate<F>(root_path: &str, f: F) -> Result<LocalKanbanStore, String>
where F: FnOnce(&mut LocalKanbanStore) -> Result<(), String> {
    let root = PathBuf::from(root_path);
    let mut store = kanban_local::load_kanban_store(&root)?;
    f(&mut store)?;                                  // 应用 mutation（入队 op 副作用）
    kanban_local::save_kanban_store(&root, &store)?; // 持久化
    Ok(store)                                        // 返回更新后的 store
}
```

## 7. 同步数据流（Desktop）

> 🛑 **本节已撤回,不反映当前代码。** 它依赖第 6 节的 `kanban_local.rs`(`take_pending_ops`/`merge_remote_board`),而该模块已在提交 `1576515` 中删除。结构化的 Desktop↔Cloud 看板同步**从未发布**,实现也已撤回。当前桌面看板的跨端收敛靠 **文档同步管线**(`.board`/`.md` 作为普通文档)——见 [`next-features-design.md` §0](./next-features-design.md)。下文仅作历史设计记录。
>
> （原注：本节描述的 push 回放 / pull 合并 / WS 触发定向 pull 为设计意图,非已发布行为。）

### 7.1 Push（本地 → 云端）

```
1. 同步层调用 kanban_take_pending_ops(root_path)
   └─ 排空 pendingOps，得到带 local_clock 的有序 op 列表
2. 按 local_clock 顺序回放到 cloud REST：
   createBoard  → POST   /kanban/boards
   createCard   → POST   /kanban/boards/:board_id/cards
   moveCard     → POST   /kanban/boards/:board_id/cards/move
   archiveCard  → POST   /kanban/cards/:card_id/archive
   restoreCard  → POST   /kanban/cards/:card_id/restore
   deleteBoard  → DELETE /kanban/boards/:board_id
   （携带 X-Device-Id: dev_... 用于 WS 自回声过滤与审计来源）
3. cloud 每个写操作递增 workspaces.sync_clock，写入实体 updated_clock，
   并 publish_to_workspace 广播对应 kanban:* 事件
4. 回放成功即视为已 drain（队列已在步骤 1 清空）；
   失败则该 op 丢失对应 ——v1 依赖后续 pull 重新拉取权威快照收敛
   （注：本地乐观状态已写入 cards/boards，cloud 权威值经 pull 回流）
```

### 7.2 Pull（云端 → 本地）

```
1. 同步层 GET /kanban/boards 与 /kanban/boards/:board_id（含 columns/cards/labels）
2. 对每个 cloud board 快照，组装成 LocalBoard
3. 调用 kanban_merge_remote_board(root_path, board, cloud_clock)
   └─ updated_clock LWW：本地更高保留本地（含未推 pending ops），远端更高整板覆盖
4. lastSyncedClock 前进到见过的最高 cloud_clock
```

### 7.3 WS 触发的定向 pull

```
Desktop ws_client 收到 kanban:* 事件
  → 先做自回声过滤：source == "desktop" 且 deviceId == 本地 device_id → 跳过
  → 否则触发对受影响 board 的 pull（GET board）→ merge_remote_board
  → 周期性 sync 兜底处理遗漏事件
```

## 8. 同步数据流（Web 在线）

Web 端为**在线优先**，无 IndexedDB 离线层（与文档同步不同——文档 Web 端有 `pending_saves`，Kanban v1 不做 Web 离线缓冲）：

```
1. 读：REST GET /kanban/boards/:board_id（含 columns/cards/labels）
2. 写：REST 直连 cloud（PATCH/POST/move/archive/restore/delete）
   - 写卡时可带乐观锁 baseUpdatedClock + 可选 force
3. 实时：WS /api/v1/live 收到 kanban:* 事件
   - 自回声过滤：sourceSessionId == 本会话 → 跳过
   - 否则按事件类型 refetch：
       board/column/card-updated → refetch 受影响实体
       card-archived/restored/deleted → refetch 卡列表 / trash
       label-changed → refetch board 全量标签
4. 离线写：v1 不支持（无 pending 队列）；连接恢复后重新读取权威状态
```

## 9. MULTI-DEVICE 收敛

### 9.1 乐观并发（Cloud 侧，per-card）

PATCH card 与 POST move card 支持乐观锁：

```
请求字段：baseUpdatedClock?（可选），force?（可选 bool）
事务内 SELECT ... FOR UPDATE 锁住卡行，检查与写入原子：

if baseUpdatedClock 提供 且 base != 当前 updated_clock 且 force != true:
    → 409 Conflict
    {
      "error": "conflict",
      "cardId": "...",
      "latest": <KanbanCard>,        // 最新快照，客户端可重试
      "baseUpdatedClock": <提供的 base>
    }
if force == true:
    → 无视 clock 不匹配照常写入（客户端覆盖）
```

### 9.2 收敛（Local 侧，per-board LWW）

Desktop 经 `merge_remote_board` 以 `updated_clock` 做整板 last-writer-wins（见 6.4）。

### 9.3 多端收敛示例

```
T=0 Desktop 同步至 clock=100，Web 同步至 clock=100
T=1 Web 编辑 board A 上某卡标题
     → REST PATCH /kanban/cards/:id（带 baseUpdatedClock=100 对应值）
     → cloud: next_workspace_clock → updated_clock=101，version_id 换新
     → 广播 kanban:card-updated { ..., updatedClock:101, sourceSessionId: webSess }
T=2 Cloud 广播到达 Desktop（source="web"，非自回声）
     → ws_client 触发 GET board A → 组装 LocalBoard(updated_clock=101)
     → merge_remote_board：本地板 updated_clock=100 < 101 → 整板覆盖
     → lastSyncedClock = 101
T=3 Desktop 此前离线编辑过 board A（本地 updated_clock 已升至 102，有 pending op）
     → merge 时本地 102 >= 远端 101 → 保留本地板（含 pending op）
     → take_pending_ops → push 到 cloud
     → cloud 接受，clock 再升，广播回 Web
T=4 Web 收到事件 refetch → 两端收敛到同一权威快照
```

> 注：cloud 提供 per-card 乐观锁（409 精确冲突），Desktop 本地合并为 per-board LWW（整板裁决）。二者粒度不同——见 13 节「per-card 实时合并 vs 整板快照 LWW」开放项。

## 10. 校验与契约规则

### 10.1 乐观锁

见 9.1。作用于 PATCH card、POST move card；锁范围为单卡行 `FOR UPDATE`，检查与写入原子。

### 10.2 重名校验

| 实体 | 唯一键 | 失败 |
|------|--------|------|
| board | `uniq_board_per_workspace(workspace_id, name)` | 400「board name '...' already exists in this workspace」 |
| column | `uniq_column_per_board(board_id, name)` | 400「column name '...' already exists on this board」 |
| label | `uniq_label_per_board(board_id, name)` | 400「label name '...' already exists on this board」 |

### 10.3 assignee 校验

- `validate_assignee(pool, workspace_id, assignee_user_id: Option<&str>)`（mod.rs）。
- `None`（未分配）始终允许。
- 若提供，须为：workspace 活跃成员（`status='active'`）**或** workspace owner（`w.user_id`）**或** `owner_user_id`，否则 400「assignee is not a member of this workspace」。
- 检查时机：`create_card`、`patch_card`（含 assignee 字段时）。
- FK `ON DELETE SET NULL`：用户被删则卡变未分配。

### 10.4 due_at 归一化

- `normalize_due_at(s: &str) -> Result<String, AppError>`。
- 接受：ISO-8601（`YYYY-MM-DDTHH:MM:SS[Z][±HH:MM][.frac]`，时区信息丢弃为 naive）；MySQL datetime（直通）；纯日期（`YYYY-MM-DD` → 补 `00:00:00`）。
- 非法 → 400「due_at must be 'YYYY-MM-DD HH:MM:SS' or an ISO-8601 datetime, got '...'」。
- 输出恒为 `YYYY-MM-DD HH:MM:SS`。

### 10.5 priority 校验

- `validate_priority(p)`，合法值 `none|low|medium|high|urgent`（大小写敏感）；非法 400；缺省 `none`。

### 10.6 hex 颜色校验

- `validate_hex_color(s)`，须 7 字符 `#RRGGBB`（大小写不敏感）；非法 400「color must be '#RRGGBB', got '...'」；作用于列 color 与标签 color。

### 10.7 字符串截断（clamp）

`clamp_str(s, max)` 在 UTF-8 字符边界按字节截断（不切断多字节字符）：

| 实体字段 | 上限 |
|----------|------|
| board name | 255 字节 |
| board description | 65535 字节 |
| column name | 255 字节 |
| card title | 512 字节 |
| card description | 16 MB − 1（MEDIUMTEXT 上限） |
| label name | 80 字节 |
| label description | 255 字节 |

### 10.8 标签上限

每 board 50 个；`create_label` 中 `COUNT(*) < 50`，否则 400「max 50 labels per board (current: ...)」。

### 10.9 workspace 时钟推进

- `next_workspace_clock(tx, workspace_id)`（委托 document.rs）：递增 `workspaces.sync_clock` 并返回新值。
- 每个 Kanban mutation 在 DB 写入与 WS 广播中携带 `next_clock`，确保 workspace 内事件全序。

## 11. 锁定决策（Locked Decisions）

记录 v1 的关键取舍及理由。每项注明权衡。

### 11.1 整数 position + 全列重排（非 lexorank）

- **决策**：卡/列/板用 `INT position`，每次移动/归档/恢复对受影响集合做 0..n-1 全量重排压实。
- **理由**：v1 优先实现简单与确定性；board 内卡数量级有限，全列重排成本可接受。lexorank（分数/字符串排序键，避免重排）列为未来优化（见 13）。
- **代价**：高并发同列重排可能产生更多 `updated_clock` 抖动；由乐观锁 409 兜底。

### 11.2 归档压实源列

- **决策**：归档卡后，源列剩余 active 卡立即重排为 0..n-1 无空隙。
- **理由**：保证 active 集合位置稠密，前端渲染与拖拽位置计算无需处理空隙。

### 11.3 恢复确定性 + 追加列尾

- **决策**：恢复取**最新未恢复** trash 行（`restored_at IS NULL ORDER BY archived_clock DESC LIMIT 1 FOR UPDATE`），卡追加到目标列尾（`position = max+1`），不回原位。
- **理由**：归档期间原位置可能已被新卡占用；追加列尾避免位置冲突，行为可预测。原列被删则拒绝恢复（400）。

### 11.4 软删除 + 30 天保留 + 每小时 cron

- **决策**：归档为软删除（`archived_at` 标记 + `kanban_card_trash` 快照行），`expires_at = archived_at + 30 天`，每小时清理任务删除过期且未恢复的行。
- **理由**：与文档回收站一致的可恢复窗口；已恢复行保留作审计。
- **代价**：同一卡可有多条 trash 行（归档→恢复→再归档），恢复逻辑须显式取最新未恢复行。

### 11.5 乐观并发：cloud 用 sync_clock（baseUpdatedClock/force/409）

- **决策**：PATCH/move card 携带 `baseUpdatedClock`；服务端比对当前 `updated_clock`，不匹配且非 `force` 则 409 返回 `latest` 快照。
- **理由**：精确 per-card 冲突检测，客户端可在拿到 latest 后重试或强制覆盖。

### 11.6 本地合并：updated_clock LWW（整板）

- **决策**：Desktop `merge_remote_board` 以板的 `updated_clock` 做整板 last-writer-wins。
- **理由**：v1 Desktop 不做 per-card 三方合并；整板 LWW 实现简单，本地高 clock 板（含未推 pending ops）受保护不被陈旧远端覆盖。
- **代价**：粒度粗——同板不同卡的并发编辑可能整板覆盖；见 13 节开放项。

### 11.7 WIP limit 仅作建议（服务端不强制）

- **决策**：`wip_limit` 为可选元数据，服务端**永不**据此拦截建卡/移卡。
- **理由**：原始设计提出可硬性阻止超限——实际实现刻意不阻止，「以免上限让看板变得不可用」。前端 UI 在 active 卡数 ≥ wip_limit 时仅给出警告。

### 11.8 assignee 必须是 workspace 成员

- **决策**：卡 assignee 须为活跃成员或 owner，否则 400；用户删除时 FK `SET NULL`。
- **理由**：防止把卡指派给无权访问 workspace 的用户。

### 11.9 dueAt 归一为 MySQL DATETIME

- **决策**：`due_at` 经 `normalize_due_at` 统一存为 naive `YYYY-MM-DD HH:MM:SS`，时区信息丢弃。
- **理由**：避免跨端时区歧义；v1 按 naive 本地时间语义处理。

### 11.10 sqlx 无 time feature → SELECT 中 CAST(ts AS CHAR)

- **决策**：因 sqlx 未启用 time/chrono feature，所有时间列在每条 SELECT 中显式 `CAST(col AS CHAR)` 取为字符串，应用层再解析。
- **理由**：避免引入额外 sqlx feature 与类型映射；统一以字符串跨 REST/JSON 传输。
- **范围**：`due_at`、`archived_at`、`expires_at`、`restored_at`、`created_at`、`updated_at` 等所有时间列。

### 11.11 ID 由调用方生成并本地/云端复用

- **决策**：board/column/card/label 的 UUID 由前端生成，本地 store 与 cloud 表复用同一 ID。
- **理由**：免去本地↔云端 ID 映射；离线创建的实体 push 后 ID 不变。
- **开放风险**：见 13 节（client-generated id 的去重与冲突边界）。

## 12. 错误处理

| 错误 | 场景 | 处理 |
|------|------|------|
| `conflict`（409） | PATCH/move card 时 `baseUpdatedClock` 与当前 `updated_clock` 不符且非 force | 返回 `latest` 卡快照，客户端重试或 force 覆盖 |
| 400 board/column/label 重名 | 唯一键冲突 | 提示改名 |
| 400 空名 | board/column 的 name 或 card 的 title trim 后为空 | 拒绝创建 |
| 400 assignee 非成员 | assignee 不是活跃成员/owner | 提示选择有效成员 |
| 400 非法 priority | 不在 `none|low|medium|high|urgent` | 提示合法取值 |
| 400 非法 due_at | 格式不符 | 提示 `YYYY-MM-DD HH:MM:SS` 或 ISO-8601 |
| 400 非法颜色 | 非 `#RRGGBB` | 提示 hex 格式 |
| 400 标签超限 | board 标签数 ≥ 50 | 提示已达上限 |
| 400 移动归档卡 | `archived_at IS NOT NULL` | 提示先恢复 |
| 400 恢复原列已删 | 恢复时原 column 不存在 | 提示原列已删除 |
| 403 角色不足 | 低于端点所需 viewer/editor/admin | 拒绝操作 |
| 本地校验失败 | `kanban_*` 命令（列不在板上、二次归档、恢复非归档卡、`column_ids.len()!=3`、本地重名等） | 返回 `Result::Err(String)`，前端提示，不写盘 |
| 网络故障中断 push | take_pending_ops 后回放失败 | 本地状态已乐观写入；后续 pull 拉取 cloud 权威快照收敛 |

## 13. 开放问题与后续工作

1. **client-generated vs server-generated id 与映射**：当前 ID 由前端生成、本地/云端复用（11.11）。需明确多端同时离线创建产生 ID 碰撞（极低概率 UUID）或重复 push 的去重边界；是否需要服务端 ID 校验/重映射层。
2. **per-card 实时合并 vs 整板快照 LWW**：cloud 提供 per-card 乐观锁（409），Desktop 本地为整板 `updated_clock` LWW（11.6）。后续可引入 per-card 三方合并/CRDT，避免整板覆盖丢失同板其他卡的并发编辑。
3. **列删除**：当前无独立删列端点（4.6），仅随 board 级联删除。后续需定义删列时卡的去向（迁移到默认列 / 一并归档 / 拒绝删非空列）与位置重整。
4. **跨板移动卡（cross-board move）**：当前 move 限于同 board 内跨列；卡 `board_id` 固定。跨板移动需处理 `board_id`/`column_id`/`labels`（标签是 board 级）的重映射。
5. **lexorank / 分数排序键**：替换整数 position 全列重排（11.1），降低高并发重排抖动与 `updated_clock` 噪声。
6. **Web 离线层**：Kanban Web 端目前在线优先、无 IndexedDB pending 队列（第 8 节）。后续可对齐文档同步的 `pending_saves`/`documents_cache`/`sync_state` 三 store 模型，支持 Web 离线编辑与 reconcile。
7. **Desktop pendingOps 失败重试与幂等**：当前 `take_pending_ops` 排空后若 push 失败，依赖后续 pull 收敛。需明确失败 op 的重新入队/重放策略与服务端幂等保证（按 `local_clock` 去重）。
8. **trash 的多端可见性**：cloud `kanban_card_trash` 经 board trash 端点可查；Desktop 本地仅以 `archived_at` 标记归档卡，无独立本地 trash 审计。是否需将 cloud trash 元数据下行到本地。
9. **WIP limit 强制选项**：当前纯建议（11.7）。是否提供 per-column 可选「硬上限」开关供团队按需启用。
