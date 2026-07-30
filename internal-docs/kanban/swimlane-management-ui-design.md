# Kanban 泳道管理 UI 设计

> **已于 2026-07-30 被取代。** 本文保留早期左侧横向泳道 UI 的历史记录；当前产品使用顶部标题的单一纵向泳道。现行设计见 [Vertical swimlanes and lightweight filters](./status-columns-filter-redesign.md)。

状态：Grok + Kimi 评审完成，推荐方案已确认并实现

日期：2026-07-29

配套数据设计：[swimlane-management-design.md](./swimlane-management-design.md)

视觉稿：[swimlane-management-ui.html](./mockups/swimlane-management-ui.html)

静态预览：[swimlane-management-ui.png](./mockups/swimlane-management-ui.png)

> 本文只定义用户能看到和操作的界面。数据 key、删除语义、转换 marker 和三端 adapter 以配套数据设计为准。

---

## 0. 待确认的产品决策

实现前只需要确认下面这组推荐默认值；它们已经体现在视觉稿与后续各章节中：

| 决策 | 推荐方案 |
|---|---|
| 管理入口 | Swimlane selector 右侧的 `AdjustmentsHorizontalIcon` |
| 可编辑类型 | custom 直接管理；status 复用列管理；priority / assignee 先转换 |
| card mapping | card 保存不可变 lane key；改名不改变映射 |
| key 可见性 | 常规界面只显示名称；row menu 的 Details 可查看 / 复制 Lane ID |
| 删除有卡泳道 | 默认删除定义，卡片显示在 Unassigned；可显式迁移到另一泳道 |
| 空泳道 | 始终保留并显示，直到用户删除 |
| 排序 | Desktop 专用 handle；keyboard / touch 使用 Move up / Move down |
| 小窗口 | 保留二维网格并横向滚动；管理 Dialog 使用窄屏 sheet |
| 卡片分配 | Peek 增加 Swimlane selector；支持清空到 Unassigned |

确认上述默认值后，UI 层不再需要额外产品选择，可以直接进入 P0–P3 实现。

---

## 1. 现有 UI audit

### 1.1 保留的产品语言

当前 BoardSurface 已经形成清晰的 JType 工作台语言：

- stone 中性色 + teal brand；
- 7–9px 的紧凑圆角控制，12px board container；
- 11–13px 元信息，14px 卡片标题；
- Heroicons outline；
- Headless UI Menu / Dialog；
- 小面积 brand-soft 作为 active / focus，而不是大面积强色；
- hover 才出现的次级操作。

泳道管理沿用这套语言，不另造“管理后台”风格。

### 1.2 当前泳道视觉问题

| 问题 | 当前表现 | UI 影响 |
|---|---|---|
| 泳道不是完整网格 | 泳道名称位于整行上方 | 行与列的对应关系弱，横向滚动后容易失去上下文 |
| 没有管理入口 | Toolbar 只有原生 select | 用户看不到泳道能否编辑 |
| 空泳道不可表达 | assignee 行由卡片动态生成 | 无法建立工作结构后再逐步填卡 |
| 泳道头无动作 | 只有 name + count | add / rename / reorder / color / delete 没有落点 |
| 卡片详情缺少泳道字段 | Peek 只含 status / priority / assignee | 自定义泳道没有日常分配闭环 |
| 缺少失败状态 | 现有 column 操作多用 prompt + error banner | 多泳道管理时错误与具体行脱节 |
| hardcoded surface | `#fbfdfb` / `#f6faf7` | 与 shared semantic token 纪律不一致 |

---

## 2. 信息架构

泳道能力分成三层，避免把所有操作挤进 toolbar：

```text
Board toolbar
  ├─ Swimlane selector
  └─ Manage button
       ├─ status      → Manage statuses
       ├─ priority    → Convert to editable swimlanes
       ├─ assignee    → Convert to editable swimlanes
       └─ custom      → Manage swimlanes

Board grid
  ├─ sticky lane rail
  ├─ custom lane row menu
  └─ Unassigned system row

Card Peek
  └─ Swimlane select
```

Board settings 继续承载 Webhook / MCP 等 board-level integration，不加入泳道列表。泳道是高频视图结构，入口应与 Swimlane selector 相邻。

---

## 3. Board toolbar

### 3.1 布局

```text
[Group: Status ▾] [Swimlane: Custom ▾] [sliders icon] [Sort: Manual ▾] [Filter]
```

- Manage button 紧跟 Swimlane selector。
- 图标：`AdjustmentsHorizontalIcon`。
- 纯图标，`title` / `aria-label` 根据当前模式变化：
  - Manage statuses
  - Make swimlanes editable
  - Manage swimlanes
- `swimlaneBy` 为 None 时隐藏。
- `readOnly` 时隐藏。
- loading / saving 时禁用并保持 tooltip。

### 3.2 Active 提示

Custom 模式下，Swimlane selector 使用：

```text
border-brand/30 bg-brand-soft/45 text-brand-dark
```

Manage button 不再额外填充强色，避免两个相邻 active control 竞争。

---

## 4. 二维泳道网格

### 4.1 Desktop 结构

```text
┌───────────────┬────────────────────┬────────────────────┬────────────────────┐
│ Swimlane      │ To do          3/5 │ Doing            2 │ Done              8 │
├───────────────┼────────────────────┼────────────────────┼────────────────────┤
│ ● Platform  5 │ card               │ card               │ card               │
│             ⋯ │ card               │                    │                    │
├───────────────┼────────────────────┼────────────────────┼────────────────────┤
│ ● Growth    3 │                    │ card               │ card               │
│             ⋯ │                    │                    │                    │
├───────────────┼────────────────────┼────────────────────┼────────────────────┤
│   Unassigned 2│ card               │                    │ card               │
└───────────────┴────────────────────┴────────────────────┴────────────────────┘
```

### 4.2 尺寸

| Element | Desktop |
|---|---|
| sticky lane rail | 144px |
| status column | `minmax(15rem, 1fr)` |
| column gap | 8px |
| row gap | 8px |
| lane row minimum | 96px |
| cell padding | 8px |
| card gap | 8px |
| header height | 38px |

Board 本体横向滚动；column header 与 lane rail 分别 sticky。左上角交叉单元显示当前泳道维度：

```text
Swimlane
Custom
```

### 4.3 Scroll / sticky 结构

二维视图使用**单一 scrollport + 单一 CSS grid**，不再保留当前“每条泳道一个独立 grid”的结构：

```text
BoardSurface flex area
└─ swimlane scrollport (overflow: auto)
   └─ one grid
      ├─ corner       sticky top + left   z-30
      ├─ column heads sticky top          z-20
      ├─ lane rails   sticky left         z-10
      └─ cells                             z-0
```

实现约束：

- corner / header / rail 都使用不透明 semantic surface，滚动时不透出卡片；
- Peek 打开后不压缩 status column 到 15rem 以下，scrollport 变窄并继续横向滚动；
- 3 列、6 列以及 Peek open 使用同一 grid，不做按列数分叉；
- 每条 lane 的 rail + cells 处于同一 implicit grid row，row 高度由该行最高 cell 决定；
- 多泳道依赖同一 scrollport 的纵向滚动，不嵌套第二个 vertical scroller；
- `<768px` 仍保持 2D grid，不把 cells 拆成纵向 card list。

响应式线框：

```text
Wide, Peek closed             Narrow / Peek open
┌────rail────┬──240──┬──240──┐ ┌──rail──┬──208──┬──208──┐
│ sticky     │       │       │ │ sticky  │       │       │ → horizontal scroll
└────────────┴───────┴───────┘ └─────────┴───────┴───────┘
```

### 4.4 Lane rail

每条 custom lane：

- 8px color dot；
- 单行 name，truncate + title；
- tabular card count；
- hover / focus-within 出现 `EllipsisHorizontalIcon`；
- 只有专用 `Bars3Icon` handle 启动 reorder，整条 rail 保持可滚动；
- Desktop handle 使用现有 4px threshold；
- `<768px` 不启用 pointer reorder，使用菜单 Move up / Move down；
- keyboard fallback 在菜单提供 Move up / Move down。

Status 泳道使用相同 rail，但菜单复用：

- Rename；
- Color；
- Set as done；
- Set WIP limit；
- Delete；
- Move up / down。

Manage statuses 是完整、权威的 status 管理面：

- Add status；
- Rename / color / WIP / done / reorder / delete。

rail menu 是同一 action definition 的快捷入口，除全局 Add 外不允许出现能力差异。

当 `groupBy === "status"` 且泳道为 custom / priority / assignee 时：

- status column header 保留同一 per-column menu；
- 最后一列头之后提供 `PlusIcon` Add status；
- 用户不需要切回无泳道视图才能管理 status。

Priority / assignee 派生泳道不显示 row menu。

### 4.5 Unassigned

Unassigned 固定在最后：

- 不显示 color；
- 不显示 row menu；
- 使用 `text-brand-gray`；
- 有 dangling key 时显示 amber warning dot + tooltip：
  - “2 cards refer to deleted swimlanes.”
- 没有未分配或悬空卡片时整行隐藏。
- lane total 与 column header count 都按当前 `vis`（search/filter 后）计算。
- 点击 warning 或 Issues 中的 “Show affected cards”：
  1. 关闭 Dialog；
  2. 应用临时 filter `Swimlane: Missing`；
  3. 只显示 dangling 卡片；
  4. 滚动到 Unassigned；
  5. 用户逐张从 Peek 重新分配，或清除 filter。

### 4.6 Empty custom view

没有泳道时不显示空棋盘：

```text
┌─────────────────────────────────────────┐
│  [RectangleGroupIcon]                   │
│  Create your first swimlane             │
│  Add stable horizontal groups that stay │
│  visible even when they have no cards.  │
│                                         │
│  [+ Add swimlane]                       │
└─────────────────────────────────────────┘
```

CTA 打开 Manage Dialog 并自动进入 add row。

---

## 5. Manage swimlanes Dialog

### 5.1 为什么用 Dialog

管理涉及排序、颜色、校验、删除和 conversion progress，不适合塞进窄 dropdown。使用 Headless UI Dialog 能：

- 保持键盘 focus；
- 容纳错误与恢复状态；
- Desktop/Web 共用；
- 小窗口自然转为 sheet。

### 5.2 Desktop layout

- width：640px；
- max-height：`min(680px, 88dvh)`；
- radius：16px；
- backdrop：`bg-stone-950/30 backdrop-blur-sm`；
- panel：`bg-white`，不用 hardcoded hex；
- header / scroll body / quiet footer 三段。

```text
┌──────────────────────────────────────────────────────────┐
│ Manage swimlanes                                    [×]  │
│ Horizontal groups for this board. Names can change;      │
│ card mapping stays attached to each swimlane.            │
├──────────────────────────────────────────────────────────┤
│ ⠿  ●  Platform                         12 cards      [⋯] │
│ ⠿  ●  Growth                            7 cards      [⋯] │
│ ⠿  ●  Operations                        0 cards      [⋯] │
│                                                          │
│ [+ Add swimlane]                                         │
│                                                          │
│ Issues                                                   │
│ ⚠ 2 cards refer to deleted swimlanes [Show affected cards] │
├──────────────────────────────────────────────────────────┤
│ Changes save automatically.                        [Done] │
└──────────────────────────────────────────────────────────┘
```

### 5.3 Row anatomy

| 区域 | 行为 |
|---|---|
| drag handle | Desktop pointer reorder；menu Move up/down 为 keyboard/touch 主路径 |
| color | 点击打开 Headless UI Popover；复用 `COLUMN_COLORS` |
| name | 单击选择；Enter/F2 或 menu Rename 进入 inline edit |
| count | read-only tabular number |
| more menu | Rename / Change color / Move up / Move down / Details / Delete |
| save state | Dialog header 显示 quiet saving 状态；具体失败留在对应 row 并提供 Retry |

修改即时保存，不设置全局 Save：

- Enter / blur 提交 rename；
- Escape 取消本行编辑；
- reorder drop 后保存；
- color click 后保存；
- footer 文案明确 “Changes save automatically.”

这样关闭 Dialog 不存在“是否丢弃更改”的二次决策。

### 5.4 Lane identity details

Lane ID 是映射基础，但不是日常编辑字段。用户从 row menu 打开 Headless UI Popover：

```text
Lane details
Name       Platform
Lane ID    lane_platform_4f0e2e98    [Copy]
Used by    12 cards
```

- ID 只读且不可重新生成；
- rename / color / reorder 不改变 ID；
- Copy 使用 `ClipboardDocumentIcon`，成功后在同一按钮显示 “Copied”；
- 不在主列表直接显示 ID，避免技术信息压过泳道名称；
- card frontmatter 的 `swimlane` 值与这里显示的 Lane ID 完全一致。

### 5.5 Add row

点击 Add 后原位插入：

```text
⠿  ○  [Swimlane name________________] [Add] [Cancel]
```

- autofocus；
- Enter = Add；
- Escape = Cancel；
- empty / duplicate / >80 chars 在输入框下方 inline error；
- 添加成功后保留当前 scroll position；
- 不自动创建卡片。

### 5.6 Loading / saving / error

- 数据已随 board 在内存中，打开 Dialog 不显示无意义 skeleton。
- 保存期间 header 显示 `Saving…`，使用 `aria-live="polite"`。
- 用 `aria-disabled` 拦截正在保存的 row action，不用原生 disabled，保证 tooltip / focus 仍可用。
- `.board` conflict：顶部 inline error：
  - “This board changed on another device. We reloaded the latest swimlanes.”
- network error：
  - row 保留用户输入；
  - 显示 Retry；
  - 不自动关闭 Dialog。

---

## 6. Delete flow

### 6.1 Empty lane

```text
Delete “Operations”?
This empty swimlane will be removed from the board.

[Cancel] [Delete]
```

### 6.2 Lane with cards

Dialog 中用两个 radio choice 明确数据结果：

```text
Delete “Platform”?
12 cards currently use this swimlane.

(•) Keep cards in Unassigned                  Recommended
    Delete only the swimlane. Card references remain recoverable.

( ) Move cards before deleting
    Move to [ Growth ▾ ]

[Cancel] [Delete swimlane]
```

选择第二项后 CTA 为 “Move cards and delete”。

设计原则：

- 默认选配置级单写；
- 不把高级迁移藏在二次菜单；
- 危险按钮仅最终 CTA 用 red；
- “Recommended” 使用普通小字，不使用抢眼 badge。

### 6.3 Progress / failure

第二项必须使用 Headless UI RadioGroup + Listbox；没有合法目标时禁用第二项。

Move cards and delete：

```text
Moving cards… 7 of 12
[████████████░░░░░░]
Do not close this dialog.
```

- busy 时忽略 backdrop / Escape close；
- progress 文案使用 `aria-live="polite"`；
- 成功后关闭 confirm，Manage row 消失；
- 失败显示：
  - “7 cards moved. 5 remain in Platform.”
  - [Retry remaining] [Back]
- 不回滚已成功卡片。

---

## 7. Convert derived swimlanes

Priority / Assignee 的 Manage 按钮打开 conversion Dialog：

```text
Make priority swimlanes editable?

JType will create independent swimlanes from the current priority rows.
Card priority values will stay unchanged.

Preview
● Urgent       3 cards
● High         8 cards
● Medium       5 cards
  Unassigned   2 cards   (will stay Unassigned)

[Cancel] [Create editable swimlanes]
```

### 7.1 Progress states

```text
Creating editable swimlanes

Assigning cards                                  11 / 16
[████████████░░░░░░]

You can retry safely if this operation is interrupted.
```

- busy 中不允许关闭，进度容器使用 `aria-live="polite"`；
- 失败后 CTA = Resume conversion；
- marker 存在时再次打开直接进入 resume state；
- 完成后 toast：
  - “Editable swimlanes created. Priority values were preserved.”

---

## 8. Card Peek

Custom 模式下，在 Status 后插入：

```text
Status     Doing
Swimlane  ● Platform
Priority   High
```

规则：

- 扩展 `BoardOption` 为 `{ value, label, color?, warning? }`，由 `ListboxSelect` 统一渲染 color dot / warning；
- 第一项 Unassigned，无 color；
- dangling key 显示：
  - `⚠ Unassigned · previous swimlane missing`
- 保存仍走当前 350ms debounce / immediate select save；
- readOnly CardDetail 只显示 resolved name；
- 非 custom 模式不显示该字段，避免与 priority / assignee 派生行重复。

---

## 9. Responsive

### 9.1 Desktop / large Web（≥1024px）

- 完整 sticky lane rail；
- 640px centered management Dialog；
- delete / convert 使用 440–480px confirm Dialog；
- Peek 维持当前 360px 可拖宽侧栏。

### 9.2 Tablet / narrow desktop（768–1023px）

- lane rail 132px；
- status column 220px；
- management Dialog `min(640px, calc(100vw - 32px))`；
- Peek 与现有 narrow behavior 一致。

### 9.3 Small Web / narrow window（<768px）

Board 仍横向滚动，不把 cells 纵向打散：

- lane rail 116px；
- status column 208px；
- sticky rail 保留；
- Manage / Delete / Convert 变为 bottom sheet：
  - `max-h-[92dvh]`
  - top corners 20px
  - bottom edge flush
- list row touch target ≥44px；
- rail ellipsis / color / row action touch target ≥44px；
- pointer reorder 关闭，菜单 Move up/down 是触摸端排序入口。

Desktop 和 Web 使用同一 breakpoint / component，不做 Web-only 管理体验。

---

## 10. Interaction state matrix

| State | Toolbar manage | Row menu | Peek selector | Dialog |
|---|---|---|---|---|
| None | hidden | — | hidden | — |
| status | visible | column actions | hidden | Manage statuses |
| priority | visible | hidden | hidden | Convert priority |
| assignee | visible | hidden | hidden | Convert assignee |
| custom | visible | visible；status 列头也保留 column menu | visible | Manage swimlanes |
| custom empty | visible | — | visible / only Unassigned | add-first state |
| readOnly | hidden | hidden | read-only resolved label | unavailable |
| migration busy | disabled | hidden | disabled | progress |
| config conflict | enabled after reload | current data | latest mapping | inline notice |

---

## 11. Accessibility

- 所有图标按钮必须有 `title` + `aria-label`。
- Dialog 使用 `DialogTitle`，description 通过 `aria-describedby`。
- row list 使用语义 `ul/li` + `aria-label="Swimlanes"`。
- 不使用高交互成本的 `role="grid"`；每条泳道用有 heading 的 `section`，卡片仍是 buttons。
- reorder 后用 live region：
  - “Growth moved to position 1 of 3.”
- color 不能作为唯一识别信息，始终显示 name。
- focus ring：`focus-visible:ring-4 focus-visible:ring-brand/10`。
- destructive CTA 不依赖红色，文案明确 Delete。
- Escape：
  - 普通 Dialog 关闭；
  - inline edit 只取消 edit；
- busy migration 不关闭，并用 live status 解释。
- Move / Convert progress 使用 `aria-live="polite"`。
- `prefers-reduced-motion` 下取消 row transform，仅保留 opacity。

---

## 12. Motion

| Interaction | Motion |
|---|---|
| Dialog enter/exit | opacity + translateY 4px，180ms |
| row reorder | transform，160ms |
| inline add | height/opacity，160ms |
| save check | opacity，120ms，停留 800ms |
| color popover | opacity + scale .98，120ms |

不用弹簧或大幅位移；这是信息密集工作台，不做营销式动画。

---

## 13. Copy / i18n

新增核心文案：

- Manage swimlanes
- Manage statuses
- Make swimlanes editable
- Add swimlane
- Changes save automatically.
- Keep cards in Unassigned
- Move cards before deleting
- Move cards and delete
- Create editable swimlanes
- Resume conversion
- Previous swimlane missing
- This board changed on another device.
- Show affected cards
- Swimlane: Missing

所有 shared 文案使用 `<Trans>` 或 `` t`...` ``，进入 shared catalog 并补齐 zh / ja。

中文用户文案使用“泳道”；本地路径继续说“仓库”，云端边界说“云端工作区”。

---

## 14. Component plan

```text
shared/components/board/
  BoardSurface.tsx
  BoardSwimlanes.tsx
  BoardPeek.tsx
  SwimlaneManagerDialog.tsx
  SwimlaneDeleteDialog.tsx
  SwimlaneConversionDialog.tsx
  SwimlaneRow.tsx
```

建议抽取：

```ts
type EditableGroupItem = {
  key: string;
  name: string;
  color?: string | null;
  cardCount: number;
};
```

`SwimlaneManagerDialog` 与 status 管理可以共享 list primitive，但业务 action 仍由 props 注入。shared 组件不读 Tauri、REST 或平台状态。

### 14.1 Visual token mapping

实现不新增 neutral hex，使用以下唯一映射：

| Surface | Tailwind semantic class |
|---|---|
| board canvas | `bg-stone-50` |
| cell / lane rail | `bg-stone-100/60` |
| sticky header / corner | `bg-white` |
| active / selected | `bg-brand-soft` |
| line | `border-line` |
| subtle text | `text-brand-gray` |
| panel shadow | `shadow-emerald-950/10` |

泳道类别色只复用现有 `COLUMN_COLORS` 数据 palette；不在 JSX/CSS 新写任意 hex。视觉稿 HTML 内的 hex 只服务静态预览，不能作为实现样式源。

### 14.2 Existing behavior fixed with the grid rewrite

- `BoardSwimlanes` 接收真实 `sortBy`；
- 删除当前硬编码的 `sortCards(..., "manual")`；
- 删除 partition 后的重复 `groupValueOf` filter；
- column count / lane count 都基于 `vis`；
- status column menus 在 2D grid 中保留。

---

## 15. UI 验收标准

1. 用户从 toolbar 能发现并打开正确的管理能力。
2. custom 空泳道在没有卡片时仍可见。
3. add / rename / color / reorder / delete 都有明确 hover、focus、saving、error 状态。
4. 删除有卡泳道默认结果明确为 Unassigned，高级迁移是显式选择。
5. priority / assignee conversion 在开始前说明原属性保留。
6. custom 卡片能在 Peek 中选择或清除泳道。
7. status 作为纵向泳道或 custom grid 的横向列时都不丢失 column CRUD。
8. Desktop 与 Web 小窗口使用同一 responsive component。
9. readOnly embed 不显示 mutation affordance。
10. keyboard、screen reader、touch 都有不依赖拖拽的完整路径。
11. UI 按 §14.1 使用 stone / brand / line semantic classes，不新增 brand/neutral hex。
12. 新文案完成 shared i18n。
13. Sort 在泳道视图中真实生效。
14. Show affected cards 会应用 Missing swimlane filter 并定位 Unassigned。
15. Lane details 显示的只读 ID 与 card frontmatter `swimlane` 值一致，rename / color / reorder 后保持不变。

---

## 16. 视觉稿边界

HTML/PNG 是视觉方向与密度基准，不是可复制的生产代码：

- production icon 一律使用 Heroicons；稿中的 unicode 只是占位；
- 文档规格优先于稿中演示数字；
- production Dialog / RadioGroup / Listbox 一律使用 Headless UI；
- 视觉稿覆盖 Board、Manage、Delete、Peek、Conversion、Empty 和 Lane identity；progress / bottom sheet 以本文线框和状态规格为准。

---

## 17. Grok / Kimi 评审结论

两份独立评审均给出“修订后可实现”的结论。共同意见已经进入本稿：

- 明确单一 scrollport + 单一 CSS grid，以及 sticky corner / header / rail 的层级；
- custom 纵向泳道下仍完整保留 status 列菜单和新增入口；
- “Show affected cards” 使用临时 Missing swimlane filter，并定位 Unassigned；
- 删除对话框补齐目标泳道选择，默认仍为保留 dangling key；
- 桌面仅从专用 handle 拖动，触屏通过菜单上移 / 下移；
- `sortBy`、filtered count、empty lane、readOnly、saving / error 与 a11y 状态均进入验收标准；
- 收敛 surface token、Headless UI primitive、Heroicons 和 shared i18n 的实现约束。

评审中提到的逐卡选择迁移、二维卡片拖拽和 bottom sheet 专属交互不进入 P0；前两项继续保留为后续能力，窄屏先使用同一响应式 Dialog。
