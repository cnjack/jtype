# Kanban 可编辑泳道设计

状态：Grok + Kimi 评审完成，已实现并通过 Desktop / Web / board-react 验证
日期：2026-07-29

配套 UI 设计：[swimlane-management-ui-design.md](./swimlane-management-ui-design.md)

> 目标：让泳道成为可持久化、可新增、可重命名、可排序、可删除的 board 级实体，并用稳定 key 与卡片关联。
> 本文的“编辑泳道”指泳道本身的生命周期管理；卡片二维拖拽不属于本期，但卡片必须能在 Peek 中选择泳道，形成完整使用闭环。

---

## 0. 代码现状确认

当前泳道不是独立实体，而是 `shared/lib/board.ts` 根据卡片字段临时计算出的分组：

```ts
groupValueOf(card, "status")   // card.columnKey
groupValueOf(card, "priority") // card.priority || "none"
groupValueOf(card, "assignee") // card.assignee || ""
```

`effectiveColumns()` 再生成需要展示的行：

| `swimlaneBy` | 泳道来源 | 当前映射键 | 能否显示空泳道 | 能否自由增删 |
|---|---|---|---|---|
| `status` | `.board.columns[]` | `columns[].key` | 能 | 数据层能，泳道 UI 没入口 |
| `priority` | 固定枚举 | `urgent/high/medium/low/none` | 能 | 不能，枚举固定 |
| `assignee` | 当前卡片负责人集合 | 负责人原始字符串 | 不能 | 不能，没有卡后泳道自动消失 |

`partitionSwimlanes()` 的结构是：

```text
Map<泳道属性值, Map<列属性值, Card[]>>
```

当前结论：

- 没有通用 `Swimlane` 类型；
- `.board` 没有 `swimlanes[]`；
- 卡片 frontmatter 没有 `swimlane` key；
- priority / assignee 泳道没有独立身份，名称和值是同一个字符串；
- assignee 泳道无法空置，没有卡片后自动消失；
- `BoardSwimlanes` 只有 `onSelect`，卡片二维拖拽仍明确留在一维看板；
- `BoardPeekProps` 没有泳道选项，当前不存在日常分配入口；
- `packages/board-react` 也有独立 `.board` / card mapping，不能只改桌面和 Web。

只有 status column 的 `key` 已经承担稳定 ID 的作用。`addColumn()` 根据名称生成一次 key，rename 只改 `name`，卡片通过 frontmatter `status: <key>` 关联。

---

## 1. 设计决策

### 1.1 两类泳道

保留派生泳道，增加第四种来源：**Custom swimlanes（自定义泳道）**。

| 泳道类型 | 数据来源 | 管理方式 |
|---|---|---|
| Status | `.board.columns[]` | 复用现有 column CRUD，只是把操作入口放到纵向泳道头 |
| Priority | 卡片 priority 枚举 | 只读派生；可转换为 custom |
| Assignee | 卡片 assignee 值 | 只读派生；可转换为 custom |
| Custom | `.board.swimlanes[]` | 支持新增、rename、排序、改色、删除 |

status 本身已经是有稳定 key 的实体，不再复制一份 custom 定义。priority / assignee 是卡片业务属性，不直接扩展其 schema；需要自由编辑时再显式转换为 custom。

### 1.2 稳定 key，不使用名称 mapping

为了与 `columns[].key` 对齐，泳道实体也使用 `key`，而不是另造一套 `id` 术语：

- `key` 是机器身份，生成后不可变；
- `name` 是显示名称，可以重命名；
- 卡片只保存 key；
- `.board` 不反向保存 `cardIds[]`；
- rename / reorder / 改色只写 `.board`，不批量改卡片。

### 1.3 本期范围

必须包含：

- status 泳道头复用 column CRUD；
- custom 泳道 add / rename / reorder / color / delete；
- 空泳道显示；
- Peek 中给卡片选择 custom 泳道；
- Desktop、Web、`packages/board-react` 读取同一模型；
- priority / assignee 到 custom 的可恢复转换；
- Unassigned 与悬空引用处理。

本期不包含：

- 卡片在二维网格中拖拽；
- 单元格内直接新建卡片；
- 泳道 WIP limit；
- 把 custom swimlane 作为横向 `groupBy`；
- multi-select 批量 Set swimlane；
- CLI 的泳道管理命令。

CLI 仍可通过普通 Markdown frontmatter 看到 `swimlane` 字段；完整 `jtype card set --swimlane` / `board swimlane` 命令另行设计。

---

## 2. 数据模型

### 2.1 `.board` 配置

```json
{
  "id": "product-roadmap",
  "title": "Product roadmap",
  "groupBy": "status",
  "swimlaneBy": "custom",
  "columns": [
    { "key": "todo", "name": "To do" },
    { "key": "doing", "name": "Doing" },
    { "key": "done", "name": "Done" }
  ],
  "swimlanes": [
    {
      "key": "lane_platform_4f0e2e98",
      "name": "Platform",
      "color": "#0ea5e9"
    },
    {
      "key": "lane_growth_3e6b4ea5",
      "name": "Growth",
      "color": "#22c55e"
    }
  ]
}
```

共享类型：

```ts
export type BoardSwimlane = {
  /** Immutable machine identity. */
  key: string;
  name: string;
  color?: string | null;
};

export type BoardSwimlaneGroupKey =
  | BoardGroupKey
  | "custom";

export type BoardViewConfig = {
  // existing fields...
  groupBy?: BoardGroupKey;                    // 不允许 custom
  swimlaneBy?: BoardSwimlaneGroupKey;         // 允许 custom
  swimlanes?: BoardSwimlane[];
};

/** Canonical shape of the synced `.board` JSON document. */
export type BoardDocumentConfig = BoardViewConfig & {
  id: string;
};
```

`BoardDocumentConfig` 放在 `shared/lib/board.ts`，替代 Web 与 `packages/board-react` 当前各自声明的 `BoardConfigJSON`。桌面 `src/lib/types.ts` 的 `BoardConfig` 改为该 canonical type 的别名或兼容扩展，避免四处手工同步联合类型。

key 由客户端生成：

```text
lane_<slug>_<random suffix>
```

例如 `lane_platform_4f0e2e98`。创建时同时检查：

- 当前 `.board.swimlanes[].key`；
- 当前卡片已有 `swimlane` 引用；

从而避免删除后以同名重建泳道时，旧的悬空引用被意外重新关联。

### 2.2 卡片 frontmatter

```yaml
---
title: Add offline conflict indicator
board: product-roadmap
status: doing
swimlane: lane_platform_4f0e2e98
priority: high
---
```

归一化模型：

```ts
export type BoardViewCard = {
  // existing fields...
  swimlaneKey?: string | null;
};
```

映射关系：

```text
.board swimlanes[].key
           ▲
           │ frontmatter swimlane
           │
        Card.md
```

`RESERVED_CARD_KEYS` 必须加入 `"swimlane"`，防止用户自定义字段覆盖核心 mapping。

### 2.3 Unassigned 与悬空 key

shared 内部统一使用 `""` 表示 custom Unassigned：

- frontmatter 缺少 `swimlane` 或值为空：系统 Unassigned；
- 引用不存在的 key：也显示在 Unassigned，但产生 `dangling_swimlane` warning；
- `""` 本身不算悬空 warning；
- Unassigned 不写入 `swimlanes[]`，不能 rename 或 delete；
- 不自动清理悬空 key，避免同步暂态造成数据丢失。

shared 新增：

```ts
type BoardConfigIssue =
  | { kind: "duplicate_swimlane_key"; key: string }
  | { kind: "duplicate_swimlane_name"; name: string }
  | { kind: "dangling_swimlane"; key: string; cardCount: number };

validateSwimlanes(config, cards): BoardConfigIssue[];
```

`BoardSurface` 自己渲染这些 shared issues；不借用 adapter 的网络 `error` 字段。

为 dangling 恢复增加 transient filter：

```ts
type CardFilter =
  | { prop: "priority" | "assignee" | "tag"; value: string }
  | { prop: "swimlaneIssue"; value: "dangling" };
```

“Show affected cards” 关闭管理 Dialog、应用该 filter 并定位 Unassigned；不持久化到 `.board`。

---

## 3. 泳道管理 UI

### 3.1 工具栏入口

Swimlane 下拉：

```text
None
Status
Priority
Assignee
Custom swimlanes
```

另提供 Heroicon 图标 + tooltip 的 Manage swimlanes 按钮：

- `swimlaneBy === "status"`：打开 status 管理，复用 column actions；
- `swimlaneBy === "priority" | "assignee"`：提供 Convert to editable swimlanes；
- `swimlaneBy === "custom"`：打开 custom 管理 Dialog。

管理界面必须用 `@headlessui/react` 的 `Dialog` + `DialogPanel`。

### 3.2 Custom 管理面板

```text
⠿  ●  Platform                    12 cards       •••
⠿  ●  Growth                       7 cards       •••
⠿  ●  Operations                   0 cards       •••

+ Add swimlane
```

能力：

- inline 新增；
- inline rename；
- 拖拽排序；
- 修改颜色；
- 删除；
- 查看卡片数量；
- 显示 duplicate / dangling 数据警告。

名称规则：

- trim 后不能为空；
- 最长 80 字符；
- 同一 board 内大小写不敏感唯一；
- 名称只用于显示，不参与 mapping。

### 3.3 添加

添加只修改 `.board`：

```ts
swimlanes: [
  ...current,
  { key: newSwimlaneKey(name, cards), name }
]
```

没有卡片的新泳道也必须立即显示。

### 3.4 Rename、改色、排序

只修改 `.board.swimlanes[]`：

- rename 修改 `name`；
- color 修改 `color`；
- reorder 修改数组顺序；
- key 永远不变；
- 不修改任何卡片。

### 3.5 删除

评审后采用**配置级单写作为默认删除**。有卡片时 UI 同时展示两个明确选择，默认选第一项：

```text
Delete “Platform”?

(•) Keep cards in Unassigned                  Recommended
    Delete only the swimlane. Card references remain recoverable.

( ) Move cards before deleting
    Move to [ Growth ▾ ]

[Cancel] [Delete swimlane]
```

确认后只从 `.board.swimlanes[]` 删除定义：

- 单文档保存，不需要跨文档事务；
- 引用该 key 的卡片因悬空规则显示在 Unassigned；
- 原 key 保留在卡片中，可用于诊断或恢复；
- 用户以后在 Peek 选择其他泳道时会覆盖旧 key。

可选高级动作 “Move cards and delete”：

1. 选择另一条 custom 泳道或 Unassigned。
2. 先逐卡更新 `swimlane`。
3. 每次成功后更新本地 meta/hash。
4. 所有卡片成功后删除 `.board` 定义。
5. 任一保存失败立即 `await load()` 并停止；定义保留，已移动卡片保持已移动。
6. 重试是幂等的，只处理仍引用源 key 的卡片。

普通删除不依赖这个多文档动作。

### 3.6 卡片分配入口

这是功能闭环的必需项。

当 `swimlaneBy === "custom"` 时，`BoardPeek` 在 Status 后增加：

```text
Swimlane  [ Platform ▼ ]
```

类型：

```ts
export type BoardPeekProps = {
  // existing props...
  swimlaneOptions?: BoardOption[];
};
```

规则：

- 选项顺序来自 `.board.swimlanes[]`；
- 第一项为 Unassigned，值为 `""`；
- 选择后调用 `onChange({ swimlaneKey })`；
- Desktop、Web、board-react 写 adapter 都把 `swimlaneKey` 序列化为 frontmatter `swimlane`；
- 清为 Unassigned 时删除 frontmatter 字段，而不是写空字符串；
- 新建卡片默认进入 Unassigned；
- 同 board duplicate 保留 swimlane key；
- Save as template 必须删除 `swimlane`，避免模板跨 board 产生悬空引用；
- 从模板创建默认 Unassigned。

`packages/board-react` 的内置 `CardDetail` 是只读详情，只显示泳道名称；可写 embed 仍通过 host `onCardOpen` 或未来编辑详情处理。它至少必须正确读取、渲染 custom 泳道与卡片归属。

---

## 4. 派生泳道转换

### 4.1 哪些需要转换

- `status`：不转换。它已经由 `columns[].key` 持久化，只需在纵向泳道头暴露现有 add / rename / reorder / color / delete。
- `priority`：可转换为 custom。
- `assignee`：可转换为 custom。

转换保留原业务属性：

```text
转换前：
card.priority = "high"

转换后：
card.priority = "high"                 // 原业务属性保留
card.swimlane = "lane_high_a7c91d24"   // 新增视图归属
```

priority 的 `none` 与 assignee 的空字符串不 materialize 为真实泳道，统一进入系统 Unassigned。

### 4.2 可恢复、幂等的转换

`.board` 增加仅在转换期间存在的 marker：

```ts
type SwimlaneMigration = {
  version: 1;
  source: "priority" | "assignee";
  mapping: Array<{
    value: string;
    swimlaneKey: string;
  }>;
};

type BoardDocumentConfig = {
  // ...
  swimlaneMigration?: SwimlaneMigration;
};
```

流程：

1. 从当前 active `swimlaneBy` 生成非空值 → stable key mapping。
2. 把 `swimlanes[]` 与 `swimlaneMigration` 写入 `.board`，但保持旧 `swimlaneBy`。
3. 按 marker mapping 逐卡写 `swimlane`；已是目标 key 的卡跳过。
4. 每张 Web 卡保存成功后更新本地 meta/hash，避免重试使用过期 hash。
5. 写完后重新扫描卡片：
   - 新出现的 source value 追加 definition + mapping；
   - 新卡或未映射卡补写；
   - 直到一次稳定扫描没有缺口。
6. 最终单次写 `.board`：
   - `swimlaneBy: "custom"`；
   - 删除 `swimlaneMigration`。
7. 任一步失败：
   - 保持旧派生视图；
   - marker 与 mapping 保留；
   - `await load()`；
   - 下次 Convert 继续同一 marker，不生成第二套 key。

转换期间另一设备看到部分 `swimlane` 字段也不会改变旧视图；只有最后翻转后 custom mapping 才生效。

---

## 5. 共享代码改动

### 5.1 `shared/lib/board.ts`

新增或修改：

- `BoardSwimlane`
- `BoardSwimlaneGroupKey`
- `BoardDocumentConfig`
- `BoardViewCard.swimlaneKey`
- `BoardViewConfig.swimlanes`
- `RESERVED_CARD_KEYS += "swimlane"`
- `effectiveSwimlanes(config, cards, swimlaneBy, unassignedLabel)`
- `customSwimlaneKeyOf(card)`
- `validateSwimlanes(config, cards)`
- runtime `normalizeSwimlaneBy(value)`：未知值降级为无泳道

类型边界必须保持：

```ts
groupBy?: BoardGroupKey;                 // status | priority | assignee
swimlaneBy?: BoardSwimlaneGroupKey;      // 上述 + custom
```

不要让 `"custom"` 进入 `groupBy` 或一维 `moveCard` 语义。

当 `swimlaneBy === "custom"`：

- 行顺序严格使用 `config.swimlanes[]`；
- 空泳道也返回；
- Unassigned 在存在未分配/悬空卡片时追加；
- 分桶只使用 `card.swimlaneKey`；
- `BoardSwimlanes` 不再对 partition 后的 cell 做第二套语义不同的 filter。

### 5.2 `shared/components/board/types.ts`

```ts
type BoardActions = {
  // existing actions...
  addSwimlane?: (name: string) => Promise<void> | void;
  updateSwimlane?: (
    key: string,
    patch: Partial<Pick<BoardSwimlane, "name" | "color">>,
  ) => Promise<void> | void;
  reorderSwimlanes?: (fromKey: string, toKey: string) => Promise<void> | void;
  deleteSwimlane?: (
    key: string,
    destinationKey?: string | null,
  ) => Promise<void> | void;
  convertToCustomSwimlanes?: (
    source: "priority" | "assignee",
  ) => Promise<void> | void;
};
```

`BoardPeekProps` / `BoardSurfaceProps` 增加 `swimlaneOptions` 所需能力。shared Dialog 只收 props/callbacks，不直接读 Tauri 或 REST。

### 5.3 `BoardSurface.tsx` / `BoardSwimlanes.tsx` / `BoardPeek.tsx`

- `swimlaneKey` 类型扩大为 `BoardSwimlaneGroupKey | null`；
- dropdown 显式加入 custom；
- `partitionSwimlanes` / `BoardSwimlanes` props 接受 custom lane key；
- custom 模式使用 `effectiveSwimlanes()`；
- status 泳道头显示既有 column actions；
- custom 泳道头显示颜色、计数和操作菜单；
- status 作为横向列时 column header 保留完整 column menu，并提供 Add status；
- Peek 显示 custom swimlane selector；
- `BoardSwimlanes` 接收真实 `sortBy`，不再硬编码 manual；
- `readOnly` 隐藏管理与编辑入口；
- 新增 UI 使用 shared semantic tokens，顺手移除 `BoardSwimlanes` 当前硬编码的 neutral/brand surface hex。

---

## 6. 三个消费面

### 6.1 Desktop

涉及：

- `src/lib/types.ts`
- `src/components/BoardView.tsx`

读取无需扩 Rust/Tauri 边界：

```ts
swimlaneKey: c.properties?.swimlane || null
```

`services/jtype-core` 已把完整 frontmatter 暴露为 `BoardCardInfo.properties`，不必再增加一个重复的 `swimlane_id` 字段。

写入：

- `updateCard({ swimlaneKey })` 写/删 frontmatter `swimlane`；
- add/update/reorder/delete definition 复用 `writeBoardFile`；
- status 泳道 CRUD 继续复用现有 column actions；
- template 保存清除 `swimlane`；
- conversion 复用逐卡 `readFile` + `writeFile`，结束或失败时统一 `load()`。

### 6.2 Web

涉及：

- `services/jtype-web/frontend/src/pages/WebBoardView.tsx`

读取：

```ts
swimlaneKey: fm.data.swimlane || null
```

写入：

- `updateCard({ swimlaneKey })` 经 `saveCard()` 写/删 frontmatter；
- `.board` 经 `saveBoardConfig()` 保存；
- bulk migration 每张成功后更新本地 meta/hash；
- 失败必须 `await load()`，不能只 `setError()`；
- 不新增 API、迁移或 WebSocket event。

### 6.3 `packages/board-react`

必须同步：

- `boardData.ts` 删除本地 `BoardConfigJSON` 重复定义，使用 shared `BoardDocumentConfig`；
- `toViewConfig()` 传 `swimlanes` / custom `swimlaneBy`；
- `cardFromDoc()` 读取 `fm.data.swimlane`；
- `applyCardPatch()` 写/删 `swimlane`；
- `CardDetail` 显示 custom 泳道名称或 Unassigned；
- read-only local view prefs 可以切 custom，但绝不保存 `.board`；
- package 的可写 adapter 使用同一 config/card mapping；
- 更新 board-react unit tests 与发布类型，不手改 `dist/`。

### 6.4 同步与混合版本

泳道定义随 `.board` 同步，卡片归属随 `.md` 同步，现有 document/sync 事件已覆盖。

新版本运行时：

- 未知 `swimlaneBy` 降级为 None，而不是落入 `groupValueOf` 的默认分支；
- duplicate/dangling 配置显示 warning，不静默修复。

旧客户端读取 `swimlaneBy: "custom"` 时不会写坏 frontmatter，但可能错误渲染派生行。发布说明需标注 custom swimlane 的最低 Desktop/Web/embed 版本；不能声称旧版本完整展示。

---

## 7. 删除、转换与并发边界

1. 普通 delete 只写 `.board`，是推荐路径。
2. Move cards and delete 是显式多文档操作，失败时定义保留。
3. conversion 用 persisted migration marker 保证重试 key 稳定。
4. conversion 翻转前必须重扫，吸收并发新增/同步卡片。
5. Web 每张 bulk save 后更新 hash；失败立即 reload。
6. Desktop 没有跨文件事务，中断后 marker 允许继续。
7. 同名泳道不允许新建；重复旧数据仍按 key 渲染并警告。
8. duplicate key 只采用第一条定义并显示错误，不自动改 key。
9. custom 为空时显示 “Add first swimlane” 空状态。
10. 模板中的旧 `swimlane` 必须清除；同 board duplicate 可以保留。

---

## 8. 测试与验收

### 8.1 Shared 纯逻辑

- custom 泳道按 `.board.swimlanes[]` 顺序返回；
- 空泳道仍返回；
- card 按 `swimlaneKey` 映射；
- missing / empty / dangling 的 Unassigned 语义；
- rename 不改变 mapping；
- duplicate key/name 校验；
- unknown `swimlaneBy` 降级；
- status / priority / assignee 旧逻辑不退化；
- `RESERVED_CARD_KEYS` 包含 swimlane。

### 8.2 管理与卡片闭环

- add / rename / color / reorder 持久化；
- status 纵向泳道可以复用 column CRUD；
- 默认删除只写 `.board`，卡片显示 Unassigned；
- Move cards and delete 失败时定义仍存在并 reload；
- Peek 可选 custom lane / Unassigned；
- Desktop 与 Web `updateCard` 正确写/删 frontmatter；
- 新卡默认 Unassigned；
- duplicate 保留；template 清除；
- readOnly 隐藏 mutation UI。

### 8.3 转换

- priority / assignee → custom；
- none / empty 不生成实体泳道；
- marker 重试复用原 key；
- 翻转前重扫并补齐并发新卡；
- 中途失败仍保持旧视图；
- 完成后移除 marker；
- Desktop/Web 同步后 mapping 一致。

### 8.4 board-react

- `BoardDocumentConfig` custom round-trip；
- `cardFromDoc()` 读取 swimlane；
- `applyCardPatch()` 写入与清除 swimlane；
- `toViewConfig()` 保留 definitions；
- read-only local `swimlaneBy: custom` 不写服务器；
- `CardDetail` 显示泳道名称与 Unassigned。

### 8.5 构建门槛

```bash
npm run build
cd services/jtype-web/frontend && npm run build
cd ../../../packages/board-react && npm run typecheck
cd ../.. && npm run test:unit -- tests/unit/boardSwimlanes.spec.ts
npm run test:unit -- tests/unit/boardReactClient.spec.ts tests/unit/boardReactViewPrefs.spec.ts
```

所有 shared 新文案必须使用 `<Trans>` / `` t`...` ``，完成 extract / compile 并补齐 zh、ja。

---

## 9. 实施顺序

### P0：Canonical model 与三端读取

- `BoardDocumentConfig`
- `BoardSwimlane` / `BoardSwimlaneGroupKey`
- card `swimlaneKey`
- reserved key / runtime normalize / validation
- Desktop、Web、board-react 读取
- pure unit tests

### P1：可用闭环

- custom 空泳道渲染
- Manage Dialog
- add / rename / reorder / color
- Peek card assignment
- 三端写入与 CardDetail 展示
- i18n

### P2：删除

- 默认 config-only delete
- dangling warning
- 可选 Move cards and delete
- reload / hash / retry 验收

### P3：派生泳道转换

- priority / assignee conversion marker
- 幂等 resume
- drift rescan
- 两端同步验收

---

## 10. Grok / Kimi 评审结论与处置

两份独立评审都批准了“显式泳道定义 + 稳定引用 + card frontmatter 单向 mapping”的方向，并共同指出原稿不能直接实现。

已接受：

- 补 Peek 卡片分配闭环；
- 纳入 `packages/board-react`；
- `RESERVED_CARD_KEYS += "swimlane"`；
- `id` 改为与 columns 一致的稳定 `key`；
- 普通 delete 改为 `.board` 单写，批量迁移降为可选；
- conversion 加 persisted marker、幂等 resume、翻转前重扫；
- assignee empty / priority none 不 materialize；
- status 直接复用 column CRUD，不复制 custom 定义；
- 收敛 canonical `.board` type；
- 未知 `swimlaneBy` runtime 降级；
- 移除首版 lane WIP limit。

未直接采用：

- “完全删除 conversion”：已有 priority/assignee 泳道用户需要迁移路径，保留在 P3。
- “删除定义后同时清空所有 card key”：这仍是 N+1 写；默认保留悬空 key更适合恢复，用户重新分配时自然覆盖。
- “给 jtype-core 增加 swimlane_id”：现有 `properties` 已完整携带 frontmatter，本期不扩大 Rust 边界。

---

## 11. 完成定义

- status 泳道在纵向展示时仍能增删改；
- 用户可以创建没有卡片的 custom 泳道；
- 泳道拥有稳定、不可变 key；
- 卡片通过 `swimlane: <key>` 映射；
- Peek 能日常分配与清除泳道；
- rename / reorder / 改色不修改卡片；
- 默认删除只写 `.board`，卡片安全落入 Unassigned；
- priority / assignee 可幂等转换为 custom；
- Desktop、Web、board-react 读取同一份 `.board` / `.md` 数据；
- 混合版本、悬空引用和失败重试都有明确降级行为。
