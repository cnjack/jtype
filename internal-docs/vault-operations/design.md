# Vault 操作架构设计：Local-First 文件操作 + 云端同步

> 本文档定义 desktop app 端 vault 文件操作的核心架构原则和操作流程。  
> 核心理念：**本地文件系统是唯一真实数据源（source of truth），云端是可选的同步目标。**

## 1. 核心原则

### 1.1 Local-First

- Vault 就是一个本地文件夹，所有文件操作（创建、打开、编辑、保存、移动、删除）**直接操作本地文件系统**。
- App 左侧文件树直接映射本地文件系统结构，点击即打开本地文件。
- 离线状态下 vault 完全可用，云端不可达不影响本地操作。

### 1.2 Cloud 是 Hook，不是前置条件

- 云端同步是**事后通知**（post-hook），不是操作的前置审批。
- 本地操作成功 = 用户操作成功。云端同步失败只产生 pending 队列，不 block 用户。
- 用户可以选择不连接云端（纯本地模式）。

### 1.3 防循环（Anti-Loop）

- 从云端拉取的变更落盘后，**不再触发上行同步**。
- 机制：通过 `syncWriteSet` 标记由云端 pull 写入的路径，文件监视器（File Watcher）对这些路径的变更事件不触发 cloud push。

## 2. 操作分层

```
┌──────────────────────────────────────────────────────────┐
│                     User Action                          │
│  (create / open / save / rename / trash / delete)        │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│              Layer 1: Local File System                   │
│  - Tauri commands (workspace.rs)                         │
│  - 直接读写磁盘                                          │
│  - 操作成功后更新 AppState                                │
│  - 发射 vault 事件 (jtype:vault-*)                       │
└────────────────────────┬─────────────────────────────────┘
                         │ 成功后
                         ▼
┌──────────────────────────────────────────────────────────┐
│              Layer 2: Cloud Sync Hook                     │
│  - 检查 sync 是否启用 (binding + token + settings)       │
│  - Fire-and-forget REST 调用 / 加入 pending queue        │
│  - 失败不影响用户体验                                     │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│              Layer 3: File Watcher (被动)                 │
│  - 监控 vault 文件夹变更                                  │
│  - 外部工具修改文件 → 检测 → 更新 UI + 触发 sync hook    │
│  - 云端 pull 写入的文件 → 检测 → 更新 UI, 不触发 sync    │
└──────────────────────────────────────────────────────────┘
```

## 3. 各操作的详细流程

### 3.1 创建文档 (Create)

```
用户点击 "New Document"
  │
  ├─→ [Local] tauri.createEntry(root, relativePath, "markdown")
  │     - 创建本地 .md 文件
  │     - 返回更新后的 workspace snapshot
  │
  ├─→ [State] dispatch OPEN_FILE → 打开新文件在编辑器
  │
  └─→ [Cloud Hook] cloudRest("/documents/save", POST, { relativePath, content })
        - fire-and-forget, 失败静默
```

### 3.2 打开文档 (Open)

```
用户点击文件树 / Quick Switcher
  │
  └─→ [Local] tauri.readFile(fullPath)
        - 直接读本地文件
        - dispatch OPEN_FILE → 内容渲染到编辑器
        - 无 cloud 交互
```

### 3.3 保存文档 (Save)

```
用户按 Cmd+S / 自动保存
  │
  ├─→ [Local] tauri.writeFile(path, content)
  │     - 写入磁盘
  │     - dispatch SAVE_FILE → isDirty = false
  │
  └─→ [Cloud Hook] pushSingleDocument(relativePath, content)
        - Eager Sync: 立即推送到云端
        - 携带 baseContentHash 做三路合并
        - 失败后由 periodic sync 补偿
```

### 3.4 重命名/移动 (Rename/Move)

```
用户重命名文件或文件夹
  │
  ├─→ [Local] tauri.renameEntry(root, from, to)
  │     - 本地 mv 操作
  │     - 更新链接引用 (updateLinks)
  │     - dispatch UPDATE_WORKSPACE
  │
  └─→ [Cloud Hook] 
        方案 A: cloudRest("/documents/rename", POST, { from, to })  -- 实时
        方案 B: 记录到 pendingOps, 下次 sync push 时传递            -- 批量
```

### 3.5 移动到回收站 (Trash)

```
用户删除文件
  │
  ├─→ [Local] tauri.trashEntry(root, relativePath)
  │     - 移动到 .jtype/trash/<timestamp>/
  │     - dispatch UPDATE_WORKSPACE + CLEAR_DOCUMENT (如果当前打开)
  │
  ├─→ [Metadata] 记录 pending trash operation
  │     - trashMetadata.pendingTrashOps.push({ type: "trash", relativePath })
  │
  └─→ [Cloud Hook]
        方案 A: cloudRest("/trash", POST, { relativePath })         -- 实时
        方案 B: 下次 sync push 时 trashOperations 字段传递          -- 批量
```

### 3.6 恢复回收站 (Restore)

```
用户恢复文件
  │
  ├─→ [Local] tauri.restoreFromTrash(root, trashId)
  │     - 从 .jtype/trash/ 移回原路径
  │     - dispatch UPDATE_WORKSPACE
  │
  └─→ [Cloud Hook] cloudRest("/trash/:cloudTrashId/restore", POST)
        - 通知云端恢复对应条目
```

### 3.7 彻底删除 (Permanent Delete)

```
用户清空回收站 / 永久删除条目
  │
  ├─→ [Local] tauri.permanentDeleteTrash(root, trashId) / tauri.emptyTrash(root)
  │     - 物理删除文件
  │
  └─→ [Cloud Hook] cloudRest("/trash/:id", DELETE) / cloudRest("/trash", DELETE)
        - 通知云端同步删除
```

## 4. File Watcher 与 Cloud Pull 的防循环设计

### 4.1 问题

```
Cloud Pull 写入文件 → File Watcher 检测到变更 → 触发 Cloud Push → 无意义循环
```

### 4.2 方案对比

| 方案 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **时间窗口 (syncWriteSet + setTimeout)** | 写入后 N 秒内忽略 watcher 事件 | 简单 | 不精确；慢 FS 窗口不够，快 FS 窗口内外部修改被误过滤 |
| **Hash 对比 ✅ 推荐** | 写入时记录 `path→hash`，watcher 触发时读文件比对 | 精确无竞态；跨平台一致 | watcher 需读文件算 hash（但本来也要读来刷新 UI） |
| **xattr 扩展属性** | 写入时在文件上打 xattr 标记 | 无内存状态，app 崩溃重启后有效 | 编辑器 atomic save 会丢失 xattr（致命）；平台差异大；网络 FS/FAT32 不支持 |

**选择 Hash 对比的理由：**
1. 已有 `sha256Hex` 基础设施；sync-base 本身就是内容快照。
2. 不依赖文件系统特性，macOS / Linux / Windows 行为一致。
3. xattr 被排除：VS Code、Vim、Sublime 等编辑器均使用 atomic save（write tmp → rename），rename 后 xattr 丢失。
4. 内存中 `Map<path, hash>` 开销极低，每条 entry 在下次 watcher 消费后立即清除。

### 4.3 解决方案：Content Hash Gate

```typescript
// 全局维护 cloud pull 写入文件的内容 hash
const cloudWriteHashes = new Map<string, string>(); // fullPath → sha256

// ─── Cloud Pull 写入时 ────────────────────────────────────────
async function applyCloudDocuments(documents: CloudDocument[]) {
  // 1. 计算并记录每个文件将要写入的内容 hash
  for (const doc of documents) {
    const hash = await sha256Hex(doc.content);
    cloudWriteHashes.set(fullPath(doc.relativePath), hash);
  }

  // 2. 写入磁盘
  await tauri.applyCloudDocuments(root, documents);
}

// ─── File Watcher 收到变更事件时 ──────────────────────────────
async function onFileChanged(changedPaths: string[]) {
  for (const path of changedPaths) {
    const expectedHash = cloudWriteHashes.get(path);
    
    if (expectedHash) {
      // 这个路径是 cloud pull 写入的，验证内容是否还是我们写的
      const content = await tauri.readFile(path);
      const actualHash = await sha256Hex(content);
      
      // 清除记录（无论匹配与否，只判断一次）
      cloudWriteHashes.delete(path);
      
      if (actualHash === expectedHash) {
        // ✅ 内容 = 我们写的 → 是 cloud pull 的结果，跳过上行同步
        // 仍然刷新 UI（如果是当前打开的文件）
        refreshUIOnly(path, content);
        continue;
      }
      // ❌ 内容 ≠ 我们写的 → 有人在我们写入后又改了 → fall through 触发 push
    }
    
    // 外部修改（或 hash 不匹配）→ 触发上行同步
    triggerCloudSync(path);
    refreshUI(path);
  }
}
```

**关键特性：**
- **精确判断**：不是"我写过这个文件所以跳过"，而是"文件当前内容就是我写入的那个版本所以跳过"。
- **无竞态**：不依赖时间窗口。即使 watcher 延迟 5 秒触发，只要文件内容没被二次修改，仍能正确判断。
- **防止误过滤**：如果 cloud pull 写入后，外部工具立即又改了文件 → hash 不匹配 → 正确触发 push。
- **自清理**：每个 entry 在 watcher 消费后立即删除，不会无限增长。

### 4.4 当前实现的 Anti-Loop 机制

现有代码已有的防循环（保留不冲突）：
- `lastSaveTimeRef`: 保存后 1 秒内忽略 watcher 事件（防止用户自己保存触发 UI 刷新抖动）
- `isDirty` 检查: 编辑器有未保存内容时不覆盖
- `content !== editorContent`: 内容相同则不刷新编辑器

**Content Hash Gate 是增量补充**，解决的是 cloud pull → watcher → push 的循环，不替代上述机制。

### 4.5 边界情况处理

| 场景 | Hash Gate 行为 |
|------|---------------|
| Cloud pull 写入 A.md，watcher 正常触发 | hash 匹配 → skip push ✅ |
| Cloud pull 写入 A.md，用户立即用 vim 又改了 A.md | hash 不匹配 → push ✅ |
| Cloud pull 写入 A.md，app 崩溃重启 | Map 丢失，watcher 重新触发 → 触发 push，但 sync-base = cloud 内容 → push 时服务端判断无变化，no-op ✅ |
| Watcher 被批量事件淹没，同一路径多次触发 | 第一次消费后 delete entry，后续触发会当作外部修改 → push，但内容与 sync-base 相同 → no-op ✅ |
| 大批量 pull (100+ 文件) | Map 暂存 100 entries，每个被 watcher 消费后删除，峰值内存 < 1KB ✅ |

## 5. 同步模式总览

### 5.1 上行同步 (Local → Cloud)

| 触发源 | 触发时机 | 机制 |
|--------|---------|------|
| 用户保存 | Cmd+S 后 | Eager Sync (pushSingleDocument) |
| 用户操作 | create/rename/trash/delete 后 | Cloud Hook (fire-and-forget REST) |
| 外部修改 | File Watcher 检测到 | Periodic Sync / 手动 Sync |
| 定时 | 每 30s (WS 连接时 300s) | Periodic Sync (syncWorkspaceToWeb) |

### 5.2 下行同步 (Cloud → Local)

| 触发源 | 触发时机 | 机制 |
|--------|---------|------|
| WebSocket 事件 | 其他设备/Web 修改 | 立即 pull |
| 定时 | Periodic Sync 周期 | pull + push |
| 窗口聚焦 | 切换回 app | pull (if 60s elapsed) |
| 网络恢复 | 重新在线 | pull (if 30s elapsed) |

### 5.3 下行同步的磁盘写入规则

1. **新文件**（云端有，本地无）→ 直接写入本地磁盘。
2. **更新文件**（云端比本地新）→ 写入磁盘，但：
   - 如果本地内容 = sync base → 安全覆盖。
   - 如果本地内容 ≠ sync base（本地有修改）→ 跳过，等 push 做三路合并。
3. **删除文件**（云端标记删除）→ 本地移到 .jtype/trash/。
4. **所有落盘操作** → 加入 `syncWriteSet`，不触发上行同步。

## 6. 数据存储结构

```
vault-root/
├── documents/           # 用户 Markdown 文件 (任意结构)
│   ├── note-a.md
│   └── subfolder/
│       └── note-b.md
├── .jtype/              # 本地元数据 (git-ignored)
│   ├── workspace.json   # vault 配置
│   ├── sync-base/       # 各文件上次同步时的内容快照
│   │   ├── note-a.md
│   │   └── subfolder/
│   │       └── note-b.md
│   ├── sync-folder-bases.json  # 文件夹列表快照
│   ├── trash/           # 本地回收站
│   │   └── <timestamp>/
│   │       └── original/path/file.md
│   └── trash-metadata.json     # 回收站元数据 + pending ops
```

## 7. 状态机

```
                    ┌─────────────────┐
                    │   Pure Local    │
                    │  (no binding)   │
                    └────────┬────────┘
                             │ bind workspace
                             ▼
                    ┌─────────────────┐
          ┌────────│   Sync Idle     │────────┐
          │        └────────┬────────┘        │
          │                 │                  │
  user action        periodic timer       WS event
  + cloud hook       / focus / online     (remote change)
          │                 │                  │
          ▼                 ▼                  ▼
  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
  │ Push (eager) │  │  Full Sync  │  │  Pull Only   │
  │   single doc │  │ pull + push │  │  apply local │
  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘
         │                  │                 │
         └──────────────────┼─────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │   Sync Idle     │
                    └─────────────────┘
```

## 8. 冲突处理

当 push 到云端时发现版本不匹配：

1. 服务端尝试三路合并 (base + local + cloud)。
2. 合并成功 → 返回 merged content，desktop 接受。
3. 合并失败 → 返回 conflict 记录，desktop 显示冲突解决 UI。
4. 用户选择：accept_local / accept_cloud / manual_merge。

**冲突不 block 本地操作** — 本地文件始终保持用户最后保存的版本。

## 9. 与现有实现的对比和改进方向

### 9.1 已符合设计的部分

| 设计点 | 现有实现 |
|--------|---------|
| 本地操作优先 | ✅ 所有 CRUD 先走 tauri 命令 |
| Cloud Hook fire-and-forget | ✅ cloudRest 静默失败 |
| Eager Sync on save | ✅ useEagerSync.pushSingleDocument |
| Periodic fallback | ✅ usePeriodicSync 30s 间隔 |
| File Watcher | ✅ useFileWatcher 监控 vault 根目录 |
| Sync bases for 3-way merge | ✅ .jtype/sync-base/ |

### 9.2 需要增强的部分

| 改进点 | 当前问题 | 目标 |
|--------|---------|------|
| Anti-loop 机制 | 仅靠 1s 时间窗口 + isDirty 判断 | 引入 Content Hash Gate (§4.3) |
| File Watcher → Cloud Push | watcher 只刷新 UI，不主动触发 push | watcher 检测到外部修改时也应触发 sync |
| Rename 的 cloud 通知 | 依赖下次 full sync 才能传递 rename | 增加实时 REST hook 或 pendingOps |
| Trash 的 cloud 通知 | 已有 pendingTrashOps 机制 | 可选增加实时 REST hook 减少延迟 |
| 创建文件夹的 cloud 通知 | 依赖 full sync 时 folders 字段 | 可选实时通知 |

### 9.3 不需要改变的部分

- Sync 协议 (push/pull + clock) — 已经成熟。
- WebSocket 通知 — 已经工作良好。
- 冲突解决 — 已有完整 UI。
- Vault binding / Cloud profile — 架构合理。

## 10. 实现优先级

| 优先级 | 任务 | 复杂度 |
|--------|------|--------|
| P0 | 引入 Content Hash Gate 防循环机制 | 低 |
| P0 | File Watcher 对外部修改触发 sync push | 中 |
| P1 | Rename 操作的实时 cloud hook | 低 |
| P1 | Trash/Delete 操作的实时 cloud hook (已部分实现) | 低 |
| P2 | 创建文件夹的实时 cloud hook | 低 |
| P2 | Pending operations 队列持久化（离线操作重连后推送） | 中 |
| P3 | 批量外部修改的智能合并推送（防止 watcher 连续触发多次 push） | 中 |
