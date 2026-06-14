# JType 资源模型与多文件类型 — 产品需求文档

状态：设计中
初始日期：2026-06-13
更新日期：2026-06-13

> 本文档定义 JType 从「纯 Markdown 编辑器」演进为「多类型资源工作台」的产品方向，并统一**本地资源**与**云端/在线资源**的体验。它建立在既有的 vault / cloud workspace / vault binding / cloud profile / 单一 `sync_clock` / 看板（kanban）模型之上，**复用而非替换**现有同步架构。
>
> 它对应用户提出的两个诉求：
> 1. **支持更多文件类型**（PDF、表格、图、图片等），并在「文件创建」环节考虑类型；
> 2. **统一本地资源与在线（云端/远程）资源的体验**。
>
> 本文档以「资源（Resource）」作为统一抽象把这两个诉求收敛到同一个模型里。

## 1. 背景

### 1.1 现状：一切皆 Markdown

JType 当前在每一层都把「可打开 / 可编辑 / 可同步 / 可存储」的内容硬编码为 Markdown：

| 层 | 现状 | 关键位置 |
|----|------|---------|
| 桌面文件 I/O | `read_markdown`/`write_markdown` 经 `ensure_markdown` 对非 `.md` 直接报错「Only Markdown files are supported.」 | `src-tauri/src/workspace.rs` |
| 桌面文件树 | `read_children` 只收 markdown 与 asset 扩展名，**其余文件被静默丢弃**（`.txt`/`.csv`/`.xlsx`/`.docx` 在 vault 里根本不显示） | `workspace.rs` `read_children` |
| 前端打开 | `openMarkdownFile` 对非 markdown 路径直接 `return`；`OPEN_FILE` 永远 `kind:"markdown"` | `src/hooks/useFileSystem.ts` |
| 编辑器 | `EditorShell` 的 textarea `disabled={!isMarkdown}`，预览/属性/大纲/链接/发布面板全部 `currentKind==="markdown"` 才渲染 | `src/components/editor/EditorShell.tsx` |
| 云端存储 | `documents.content` 为 `mediumtext`（UTF-8 文本，≈16MB 上限），无 `kind`/`mime`/`content_type` 列；`save_document_version` 经 `normalize_relative_markdown_path` **强制把任意路径补成 `.md`** | `services/jtype-web/migrations/0001_init.up.sql`、`handlers/document.rs` |
| 云端同步 | push 仅采集 markdown 文本，pull 对非 markdown `continue` 跳过 | `src-tauri/src/lib.rs`、`workspace.rs` |
| 渲染 | 客户端唯一渲染器 `renderMarkdownToHtml`（marked+KaTeX+Mermaid+PlantUML+DOMPurify）；服务端**单个** `util.rs::markdown_to_html`（pulldown-cmark，由 `publish.rs`、`site.rs` **两处调用**）；桌面端另有独立的 `workspace.rs::markdown_to_html`（pulldown-cmark，供本地 publish/index） | `shared/lib/markdown.ts`、`util.rs`、`workspace.rs` |

### 1.2 已存在但未统一的三类内容

尽管对外是「纯 Markdown」，代码里其实已经隐含了**三种内容类别**——它们各自为政，没有共享抽象：

| 类别 | 存储（本地 / 云端） | 同步 | 编辑/查看 | 现状评价 |
|------|--------------------|------|-----------|---------|
| **Markdown 文档** | 磁盘 `.md` 文件 / `documents.content` 文本 | 三方文本合并（`smart_three_way_merge`） | 完整编辑器 | 一等公民，能力完备 |
| **资产文件（Asset）** | 磁盘二进制文件 / **无** | **完全不同步**（双向都排除） | **无查看器**（树里可见但点击只选中、空编辑器） | 「孤儿」：`EntryKind::Asset` 已存在（`png/jpg/jpeg/gif/webp/svg/pdf`），但本地不可看、云端不存在。注：桌面已有 `write_binary_file`（`Vec<u8>` over IPC，仅用于 PDF 导出），缺的是对称的 `read_binary_file` |
| **结构化应用文档（看板）** | `.jtype/kanban.json` / `kanban_*` 六张表 | 自成体系（pending-ops + 整板 LWW），共享 `sync_clock` | 独立模态/页面 | 「平行全栈」：自带表/接口/WS/本地存储/UI，**无 `kind` 判别列**，桌面↔云同步接线尚未接通 |

> **关键观察**：`EntryKind = folder | markdown | asset` 这个判别已经存在于 TS（`src/lib/types.ts:1`）与 Rust（`workspace.rs`）两侧，但 `asset` 是一条死路——它能进文件树，却不能打开、不能同步、不能进云端。**资产，是连接「多文件类型」与「本地/云端统一」两个诉求的同一个缺口。**

### 1.3 核心问题

| 问题 | 影响 |
|------|------|
| 非 Markdown 文件在 vault 里被静默丢弃 | 用户把 PDF/表格/截图放进 vault，文件「凭空消失」，不可发现 |
| 资产节点可见但点击无反应（空编辑器） | 已有的 `EntryKind::Asset` 体验是断头路，造成困惑 |
| Markdown 引用的本地/相对图片**在桌面和发布站都不显示** | `![](./diagram.png)` 在桌面（CSP `null`、无 asset 协议）和已发布站点（不托管资产、不改写 URL）都坏掉，只有绝对 `http(s)` 图能用 |
| 资产从不进云端 | 同一篇文档在桌面（本地图存在）能看图，在 Web/发布站点看不到图——**本地与云端体验割裂** |
| 在线资源（远程 URL）与本地资源处理方式不一致 | 远程图直连、本地图断裂；没有统一的「资源」概念、缓存或离线策略 |
| 文件创建只会产出 `.md` | 「`.md`」在 6+ 处被硬编码追加；没有「新建何种类型」的入口；创建流程完全围绕 Markdown |
| 云端文档无类型字段、强制 `.md` | 云端模型只有一种内容；无法表达「这是一个表格/图/PDF 资源」 |
| 对象存储（RustFS）已在基础设施里却完全未接线 | `docker-compose.yml` 起了 RustFS，`.env.example` 声明了存储变量，但 Rust 代码零引用、`Cargo.toml` 无 S3 客户端依赖——能力已就位但未使用 |

### 1.4 为什么现在做

- 看板（kanban v1）已经证明 JType 需要**承载非 Markdown 的内容**；但它选择了「平行全栈」路线，若每个新类型都照抄会得到 N 套互不共享的栈。需要在引入更多类型**之前**确立统一的资源抽象，避免技术债扩散。
- 发布（site-publish）与「AI 友好 `.md`」已经把 JType 定位成「AI-ready 内容操作系统」；本地图在发布站点坏掉，是这个定位下显眼的体验缺口。
- 对象存储基础设施已具备，激活成本相对集中。

## 2. 产品目标

1. **统一资源抽象**：引入「资源（Resource）」作为跨本地/云端、跨类型的统一概念，让文件树、打开、渲染、引用解析都面向资源而非「Markdown 字符串」。
2. **可扩展的类型系统**：用**单一文件类型注册表**取代散落在 4 层的扩展名判断；新增类型只改注册表 + 注册查看器/编辑器，而非到处改 `.md` 判断。
3. **激活资产为一等资源**：让 `png/jpg/.../pdf` 等资产可在 vault 中被看见、被查看，并修复 Markdown 引用的本地图片在预览中不显示的问题。
4. **本地↔云端资产同步**：激活对象存储（RustFS），让资产随 workspace 在桌面与云端之间同步；同一文档在桌面、Web、发布站点呈现一致。
5. **本地/远程资源体验统一**：定义统一的资源引用与解析机制，让「本地文件」「云端对象」「远程 URL」三种来源在引用、渲染、缓存上获得一致体验。
6. **以类型为中心的创建体验**：把「新建文件」升级为「新建资源（含类型/模板选择）」，并明确每类资源的创建语义（新建文本文档 / 导入二进制资产 / 新建结构化看板）。
7. **不破坏既有 Markdown 体验与同步架构**：所有新类型复用单一 `sync_clock` 全序；Markdown 文档的存储、三方合并、发布保持不变。
8. **明确每类资源的能力边界**：用「能力矩阵」声明每种类型在编辑、预览、发布、AI 索引、搜索、冲突合并上的支持度，让降级是有意为之而非「悄悄变垃圾」。

## 3. 核心概念

### 3.1 资源（Resource）

**资源**是 JType 中一个有类型、可寻址的内容单元。Markdown 文档、PDF、图片、表格、看板都是资源。资源具有：

- **引用（reference）**：在 workspace 内稳定标识该资源（见 3.4）。
- **类型（kind / content type）**：决定如何渲染、编辑、同步（见 3.3、3.6）。
- **位置（location）**：字节实际所在——本地 vault 文件、云端对象、远程 URL（见 3.2）。
- **能力（capabilities）**：可编辑？可预览？可发布？可 AI 索引？（见 3.5）。

> 「资源」是统一层；它**不要求**所有类型用同一张表或同一种存储。它统一的是**对外的概念与接缝**（类型识别、打开/渲染分发、引用解析），而非物理存储。

### 3.2 两个正交维度：类型 × 位置

用户的两个诉求恰好对应资源的两个**正交**维度：

```
                位置（Location）→  本地 vault 文件   云端对象(RustFS)   远程 URL
类型（Type）↓
  文本文档(Markdown…)              磁盘 .md          documents 表        —（罕见）
  二进制资产(图片/PDF/表格…)        磁盘二进制        对象存储 + 元数据表  http(s) 引用
  结构化应用(看板…)                .jtype/*.json      *_  专用表          —
```

- **诉求 A（多文件类型）= 类型维度**：扩展「类型」轴，配齐每种类型的查看/编辑与能力矩阵。
- **诉求 B（本地/云端统一）= 位置维度**：让同一资源引用在不同位置/上下文（桌面、Web、发布）下被一致地解析与呈现。

### 3.3 资源类型分层（三层 taxonomy）

不同类型在存储与同步上有本质差异，强行塞进一张表会得不偿失。本 PRD 把类型分为三层，并为每层指定不同的落地策略：

| 层 | 例子 | 字节形态 | 存储策略 | 同步策略 | 交互 |
|----|------|---------|---------|---------|------|
| **T1 文本文档** | Markdown（现有）；未来：纯文本、代码、AsciiDoc… | UTF-8 文本 | `documents.content`（不变） | 三方文本合并（不变） | 文本编辑器（按类型切换渲染器） |
| **T2 二进制资产** | 图片、PDF；未来：表格(xlsx/csv)、音视频… | 不透明二进制 | 本地原文件 + 云端对象存储 + 资产元数据表 | 内容哈希去重 + **整文件 replace-wins（按 clock）** | 查看器（按类型）；多数先只读 |
| **T3 结构化应用** | 看板（现有）；未来：白板/画布、思维导图… | 结构化数据 | 看板模式（本地 JSON + 专用表，**平行全栈**） | 看板模式（pending-ops + LWW） | 专用 React 组件（模态/页面） |

> **设计原则**：
> - T1/T2 是「文件型」资源——在 vault 里有真实可见的 `relativePath`，可被 OS 关联、出现在树/最近/收藏。
> - T3 是「应用型」资源——是 `.jtype/` 下的隐藏应用状态（如 `kanban.json`），不是用户文件。
> - **本 PRD 的主线是 T1（已就绪，做注册表泛化）+ T2（核心：激活资产 + 云端统一）**；T3 维持看板既有模式，作为后续独立 PRD 的模板，不在本 PRD 增量内新增 T3 类型。
>
> **关于「序列图 / 其他格式」**（对应用户原话里的「sequence / 其他类型」）：时序图/流程图在 JType 当前已作为 Markdown 内联 fenced 代码块（Mermaid / PlantUML）渲染，**不是独立资源**，因此不属于本 PRD 的资源类型范畴；若未来需要把图作为独立可编辑文件（如 `.mmd`/`.puml`/画布），归入 T3 结构化应用，另起 PRD。

### 3.4 资源引用与解析（Resource Reference & Resolver）

这是「本地/云端统一」的连接组织（connective tissue），也是当前本地图片坏掉的根因。

- **规范引用形式**：资源在 workspace 内以 **vault 相对路径** 作为规范引用（与文档一致），Markdown 内沿用 `![](relative/path.png)`。远程资源以绝对 `http(s)` URL 表示。
- **解析器（Resolver）**：把规范引用解析为**当前上下文**可用的具体来源：

  | 上下文 | 本地资产 | 云端资产 | 远程 URL |
  |--------|---------|---------|---------|
  | 桌面预览/查看器 | 经 asset 协议 / `convertFileSrc` 指向本地文件 | 若本地缺失，回退到云端对象 URL | 直连（可选本地缓存） |
  | Web 编辑/预览 | （无本地盘）指向云端对象 URL | 云端对象 URL | 直连 |
  | 发布站点 SSR | 发布时复制到站点对象空间，改写为公开 URL | 改写为公开 URL | 保持原样 |

- **统一体验**：用户无需关心「这张图是本地的还是云上的」——引用一次，解析器按位置/上下文给出正确来源；缺失时按上表回退。

### 3.5 能力矩阵（Capability Matrix）

每种类型显式声明其能力，避免「Markdown 假设」悄悄套到非文本类型上产生垃圾输出。初始矩阵（✅ 支持 / ⚠️ 降级 / ❌ 不适用）：

| 能力 | Markdown(T1) | 图片(T2) | PDF(T2) | 表格(T2，后续) | 看板(T3) |
|------|:---:|:---:|:---:|:---:|:---:|
| 应用内查看 | ✅ | ✅ | ✅ | ⚠️ 只读预览 | ✅ |
| 应用内编辑 | ✅ | ❌ | ❌ | ⚠️ 后续 | ✅ |
| 预览/缩略图 | ✅ | ✅ | ✅ 首页 | ⚠️ | ✅ |
| 发布到站点 | ✅ | ✅ 作为资产 | ✅ 作为资产 | ⚠️ 下载链接 | ❌ 后续 |
| AI 索引 / `.md` 抓取 | ✅ | ❌（仅 alt/文件名） | ⚠️ 文本抽取(后续) | ⚠️ 后续 | ❌ |
| 大纲 / 双链 / frontmatter | ✅ | ❌ | ❌ | ❌ | ❌ |
| 冲突合并 | ✅ 三方文本 | ⚠️ replace-wins | ⚠️ replace-wins | ⚠️ replace-wins | ⚠️ 整板 LWW |
| 存储计量 | 文本字节 | 对象字节 | 对象字节 | 对象字节 | 行/结构 |
| 发布可见性 | 跟随页面发布状态 | **仅当被已发布页引用** | **仅当被已发布页引用** | 同左 | ❌ 后续 |

### 3.6 文件类型注册表（File-Type Registry）

当前「是否 Markdown / 是否 asset」的判断在 **4 层重复**（TS `isMarkdownPath`、桌面 Rust `is_markdown_path`+`is_asset_path`、Web Rust `is_markdown_path`、Web `normalize_relative_markdown_path`）。本 PRD 引入**单一类型注册表**作为唯一事实源：

- 每个条目：`{ kind, displayName, extensions[], tier(T1/T2/T3), mime, capabilities, viewer/editor, syncStrategy, icon }`。
- 注册表是「扩展名 → 类型 → 能力/查看器」的映射。新增类型 = 注册表加一条 + 提供查看器/编辑器。
- 落地约束：`shared/` 的 TS 注册表被两个前端共享；两个 Rust crate 无法直接 import TS，故 Rust 侧采用**同源生成或受测试保护的镜像**（与现有 `EntryKind` serde 锁步、`parse_frontmatter`/`validate_folder_name` 跨端镜像的做法一致）。

## 4. 关键设计决策（锁定/取舍）

沿用看板设计文档的「锁定决策」体例：每条给出决策、理由、代价。

### 4.1 判别策略：分层落地，而非单一 `kind` 列，也不照抄「平行全栈」

- **决策**：**不**给 `documents` 表加一个万能 `kind` 列把所有类型塞进去；也**不**为每个文件类型照抄看板式平行全栈。改为按 3.3 分层：T1 留在 `documents`（按类型切渲染器/编辑器），T2 用「对象存储 + 资产元数据表」，T3 维持看板模式。统一发生在**接缝层**（类型注册表 + 打开/渲染分发 + 引用解析），而非物理表。
- **理由**：T1/T2/T3 的字节形态、合并语义、计量方式根本不同；强行同表会让文本合并/哈希/预算逻辑对二进制失效。看板已证明「应用型」内容适合平行栈，但「文件型」二进制不该各自起一套同步。
- **代价**：存在多种存储后端，需要靠注册表与解析器维持「对外一致」；不是「一张表搞定一切」的简洁。

### 4.2 二进制存储：激活对象存储（RustFS），不塞进 MySQL

- **决策**：T2 资产字节存入对象存储（RustFS/S3，基础设施已就位但未接线）；MySQL 仅存资产**元数据**（`workspace_assets` 表，见第 7 节）。
- **理由**：`mediumtext` 上限 ≈16MB 且为 UTF-8 文本，无法承载二进制；把二进制塞进同步 JSON 字符串会撑爆负载。对象存储正是为此预留。
- **代价**：当前**零** S3 客户端依赖（`Cargo.toml` 无 `aws-sdk-s3`/`rust-s3`/`object_store`），需新增 S3 兼容 SDK + `AppState` 接线 + 读取已声明但未使用的 `JTYPED_STORAGE_*` 环境变量；并需更新 `vault-cloud/gap.md` 中「资产上传到 RustFS = 未实现 TODO」「`storage_usage` 表 = 未实现 TODO」的条目（见第 10 节对齐；gap.md 现有对一个**不存在的 `plans.md`「Phase 7」**的引用应一并清理）。

### 4.3 资源标识：v1 维持 relativePath 为键，T2 引入内容寻址对象键

- **决策**：T1/T2 文件的 workspace 内标识 v1 继续用 `relativePath`（与现有 `UNIQUE(workspace_id, relative_path)`、`.jtype/sync-base` 键一致）；T2 资产在对象存储侧用**内容哈希寻址**的对象键（便于去重）。稳定不可变的资源 id（让重命名=移动而非删除+新建）推迟到二进制存储落地的同一阶段一并引入。
- **理由**：保持与现有同步协议兼容、降低 v1 风险；内容寻址让相同图片跨文档/跨设备天然去重。
- **代价**：v1 重命名 T2 资产 = 删除引用+新建引用；服务端虽已铸造 `documents.id`/`version_id`，桌面身份逻辑仍不使用，统一 id 是已知的后续重构。
- **对象生命周期（refcount，重要）**：因内容寻址会让多个引用（同文档重命名、或多文档引用同一图）共享同一对象，**删除一个引用不得物理删除共享对象**。对象按 `content_hash` 在 `workspace_assets` 行间引用计数；对象存储 GC 仅在「最后一个引用行被从回收站硬清除」时才回收字节。缺此机制时 `DELETE /assets/:id` + 回收站自动过期（沿用 kanban/文档回收站 cron）会误删仍被引用的字节——见 4.6 与 7.1。

### 4.4 内容传输：二进制走 multipart/预签名直传，不做 base64 塞 JSON

- **决策**：桌面新增 `read_binary_file` 命令 + asset 协议用于**本地查看**；二进制上行/下行优先采用 multipart 上传或**预签名 URL 直传对象存储**，而非 base64 嵌 JSON。文本（T1）继续走现有字符串 push/pull。
- **既有先例**：桌面已有 `write_binary_file`（`lib.rs:160`，`Vec<u8>` over IPC，PDF 导出在用），证明「二进制不经 base64 走 IPC」这条路在仓库内已跑通；Phase 1 只需补对称的 `read_binary_file`，复用 `tauri.ts` 既有二进制封装，而非另发明传输。
- **理由**：base64 膨胀 ~33% 且占满文本同步通道；预签名直传让大文件不经过 Axum 进程内存。
- **代价（两条云端传输今天都不可用，须显式补依赖）**：(1) multipart 接收需把 `axum` 改为 `features=["ws","multipart"]`（当前仅 `ws`，`axum::extract::Multipart` 不编译）；(2) 预签名直传 RustFS 需一个 S3 兼容 SDK 生成签名——**仓库当前无任何 S3 客户端 crate**。二者都是硬前置依赖，不是「现成可选其一」。另需上传/下载鉴权（预签名校验 workspace 角色）、前端区分文本/二进制两条路径。

### 4.5 资产引用改写：定义规范存储形式 + 按上下文解析（见 3.4）

- **决策**：Markdown 内资产引用以 vault 相对路径为规范形式；渲染/发布时由解析器按上下文改写（桌面 → 本地/asset 协议；Web/发布 → 云端/公开 URL）。改写点共四处：(1) 客户端 `shared/lib/markdown.ts` 渲染（桌面预览 + Web 预览共用）；(2) 服务端**实时 SSR** `site.rs::render_workspace_site` → `util.rs::markdown_to_html`（每次请求实时渲染 `published_pages.content`，**没有静态复制产物**）；(3) **发布时**把已发布页引用的资产复制/登记到公开站点对象空间（新步骤，`publish.rs` 当前只存原始 Markdown，不复制资产）；(4) 桌面本地静态导出 `workspace.rs::markdown_to_html`（如保留该路径）。
- **理由**：这是让「本地图能在各上下文都显示」并连接本地↔云端的唯一接缝；当前所有渲染点都原样透传 `src`，所以本地/相对图全坏。
- **代价**：(a) 桌面把本地 `src` 改写成 asset 协议 URL 后，`shared/lib/markdown.ts:142` 的 `DOMPurify.sanitize` 用**默认配置**会剥离非 `http(s)`/`data` 协议——必须显式放开所选协议（`ALLOWED_URI_REGEXP` 或 `ADD_URI_SAFE_ATTR`），否则改写后的 URL 被清掉；(b) 多个渲染/发布点都要接入同一改写契约。

### 4.6 同步收敛：按类型分策略，但共享单一 `sync_clock`

- **决策**：T1=三方文本合并（不变）；T2=内容哈希去重 + 整文件 replace-wins（按 clock LWW）；T3=看板整板 LWW。三者都必须经 `next_workspace_clock` 推进同一 `workspaces.sync_clock` 以维持 workspace 内全序。T2 资产是否走 `/sync` 还是独立端点见 5.4。
- **理由**：复用「单一权威时钟 + 各实体自带 updated_clock」的既有架构（文档/文件夹/回收站/看板都如此）；二进制无逐行 diff 意义，replace-wins 最简单可预测。
- **多端收敛 UX**：A、B 两设备在同一 `relative_path` 各自导入不同图、先于同步——replace-wins 会丢弃其一。v1 取舍：镜像文档的 `conflict_sibling_path`（`util.rs:215`）为被覆盖的资产**铸造冲突副本**（`<名> local conflict.<ext>`），不静默丢字节；若 v1 暂不做副本，则须在本节**显式声明接受静默 replace-wins 丢失**，二选一不可含糊。
- **代价**：冲突 UI 需支持「整文件二选一」而非逐行合并。

### 4.7 可编辑性分层：查看优先，编辑后置

- **决策**：每个类型在能力矩阵里标注「只读查看器」或「完整编辑器」。T2 资产 v1 一律**只读查看**（图片查看器、PDF 查看器）；编辑能力（如表格编辑）作为后续。
- **理由**：只读查看（`read_binary_file` + 查看器组件）不触发合并/预算/发布的复杂度，能以小得多的范围交付可见价值。
- **代价**：用户短期内只能查看而非在应用内编辑二进制资产（可「在 OS 中打开」作为逃生口）。

### 4.8 发布与 AI 访问的降级是显式契约

- **决策**：发布 SSR 与 `.md` 原文抓取对非文本类型给出**明确降级**：图片/PDF 作为资产随站点发布并可访问；表格/看板 v1 给下载链接或占位，不在 `.md` 抓取里返回二进制。
- **理由**：发布与「AI-ready `.md`」是既有产品价值，必须说明非文本类型如何降级，避免被当成回归。
- **代价**：发布站点对非文本类型不是「所见即所得」；需在 UI/文档明示。

## 5. 功能需求

### 5.1 文件类型注册表（Phase 0｜唯一前置投资）

- 建立 `shared/` TS 注册表 + Rust 镜像（同源生成或受测镜像），收敛现有 4 层扩展名判断。
- 文件树**不再静默丢弃**未知类型：未识别扩展名以「通用文件」类型出现在树中（可「在 OS 中打开 / 复制路径」，不可在应用内编辑）。
- `EntryKind` 从 `folder|markdown|asset` 扩展为由注册表驱动的类型标识（保持 TS↔Rust serde 锁步、向后兼容，见第 7 节）。
- **桌面爆炸半径**：泛化 `EntryKind` 不止改 4 个扩展名判断函数——`workspace.rs` 中每个遍历/排序点都要改：`read_children`、`sort_nodes`（硬编码三变体序）、`collect_markdown_files_inner`、`collect_files_recursive`、`collect_docs_recursive`、`list_folder_contents`。Phase 0 桌面侧改动面比「合并 4 函数」更大。

### 5.2 本地资源查看器（Phase 1）

- 新增桌面 `read_binary_file` Tauri 命令（对称于既有 `write_binary_file`），并**启用 asset 协议**：在 `tauri.conf.json` 增 `app.security.assetProtocol = { enable: true, scope: [...] }`，在 `capabilities/default.json` 增对应 asset-protocol 权限/scope（当前只有 `fs:allow-read-text-file`，无 `core:asset`）。注：CSP 现为 `null`（webview 不拦协议），**真正的拦路是 asset 协议未注册**，而非 CSP；`convertFileSrc` 依赖该协议启用。
- 查看器注册表：按类型把打开分发到对应组件——图片查看器、PDF 查看器（先用浏览器内置/`<embed>`），路由点在 `EditorShell`（按 `currentKind` 分流）与 `Sidebar` 节点点击。
- 激活既有 `EntryKind::Asset` 节点：点击资产 → 打开查看器（而非空编辑器）。
- **修复本地图预览**：在应用内 Markdown 预览中接入 4.5 的解析器，让 `![](./img.png)` 在桌面预览里真正显示（发布路径的改写在 Phase 2）。
- 无云端 schema 改动、无同步、无合并、无预算改动。

### 5.3 文件创建体验（「新建…」类型选择器）

把「新建文件」升级为「新建资源」，并按类型层明确创建语义：

| 类型层 | 「创建」语义 | 入口 |
|--------|-------------|------|
| T1 文本文档 | 新建空文本文件（默认 Markdown，可选其他文本类型/模板） | 「新建文档」对话框增加类型/模板选择 |
| T2 二进制资产 | **导入**（不是「新建空 PDF」）：从磁盘选择 / 拖拽 / 粘贴截图 → 写入 vault（+ 后续上传云端） | 文件树「导入资产」、编辑器内拖拽/粘贴 |
| T3 结构化应用 | 新建看板（沿用现有 `kanban_create_board`） | 现有看板入口 |

- 取代 `.md` 在 6+ 处的硬编码追加：创建路由依据所选类型决定扩展名/落点，统一经一个 `createResource(kind, …)` 入口。
- 拖拽/粘贴图片：写入 vault 资产目录约定（见开放问题 11.1 决定具体目录），插入 Markdown 引用。

### 5.4 云端资产存储与同步（Phase 2｜本地/云端统一核心）

- 激活 RustFS：`AppState` 接入对象存储客户端。注意当前 `docker-compose.yml` 的 `jtype-web` service **未注入任何 `JTYPED_STORAGE_*` 环境变量**（容器在跑但未连到 web 服务），且存在两套命名（compose 侧 `RUSTFS_ACCESS_KEY/SECRET_KEY` vs 应用侧 `JTYPED_STORAGE_ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY` + 冗余 `RUSTFS_BUCKET`）——激活是「接线 + 命名归一」，不只是「读现成变量」。
- 新增资产 API（鉴权 + workspace 角色门控，CORS/鉴权对齐既有写端点）：

  | 方法 | 路径 | 说明 |
  |------|------|------|
  | POST | `/api/v1/workspaces/:id/assets`（multipart 或预签名换取） | 上传资产，返回对象键/URL/哈希/大小 |
  | GET | `/api/v1/workspaces/:id/assets/:asset_id` | 下载/重定向到对象 URL |
  | GET | `/api/v1/workspaces/:id/assets` | 列出资产（含 `updated_clock`） |
  | DELETE | `/api/v1/workspaces/:id/assets/:asset_id` | 删除一个**引用**（软删/回收站对齐文档）；对象字节仅在最后引用被硬清除时经 GC 回收（refcount，见 4.3） |

- 资产纳入同步：桌面 push 采集 T2 资产（按内容哈希去重，仅传新增/变更字节），pull 下行资产元数据并按需取字节；收敛用 replace-wins（4.6）。是否复用 `/sync` 或独立资产端点在设计阶段定，但必须推进同一 `sync_clock`。
- **存储预算统一计量（横切，勿低估）**：预算从「仅 `OCTET_LENGTH(documents.content)`」扩展为「文本字节 + 对象字节」。涉及 **4+ 处**计量查询（`user.rs`、`workspace.rs`、`admin.rs`、`document.rs::ensure_workspace_budget`）+ 新增 `storage_usage` 表（gap.md 已标 TODO）。这是独立工作项，单独列入 roadmap，不与上传 API 混为一条。

### 5.5 资产引用解析与发布改写（Phase 2）

- **访问控制（防私有资产泄漏，重要）**：公开站点为无鉴权实时 SSR（`site.rs::render_workspace_site` 无 auth guard）。因此**只有被「已发布页」引用的资产**才在发布时复制/登记进**公开站点对象空间**，公开 URL 指向该已发布副本，**绝不**把 workspace 私有对象键直接改写成公开 URL（否则未发布文档的私有资产会经可猜测 URL 泄漏）。公开副本使用不可猜测键或签名 URL。
- 两个改写接入点：(a) 发布时资产复制/登记（新步骤）；(b) 实时 SSR 路径 `site.rs::render_workspace_site` → `util.rs::markdown_to_html` 改写 `src`。
- 客户端预览解析器（5.2 已接）与服务端 SSR 解析器共享「规范引用 → 上下文 URL」契约。

### 5.6 在线/远程资源统一（Phase 3）

- 统一「本地资产 / 云端资产 / 远程 URL」三种来源在引用、渲染、缓存上的体验：
  - 远程 `http(s)` 资源：可选「拉取并固化为 workspace 资产」或保持远程引用（带本地缓存）。
  - 资源详情/属性面板统一展示来源（本地/云端/远程）、大小、是否已同步、公开 URL。
  - 解析器对缺失来源按 3.4 回退（本地缺失 → 云端；离线 → 缓存）。

### 5.7 结构化应用类型（Phase 4+｜看板模式，后续 PRD）

- 新增 T3 类型（白板/画布、思维导图等）沿用看板「平行全栈」模板：专用迁移表、`handlers/<type>/`、`/api/v1/workspaces/:id/<type>/*` 路由、`<type>:*` WS 事件、`src-tauri/src/<type>_local.rs` + `.jtype/<type>.json`、`<type>Sync.ts`、独立 React 面。
- 每个 T3 类型作为**独立 PRD**，复用本 PRD 确立的类型注册表与资源概念。本 PRD 增量内不新增 T3 类型。

## 6. 用户界面与交互流程

> 遵循既有规范：图标用 Heroicons（icon+tooltip）；Dialog/Menu/Popover 用 `@headlessui/react`；共享组件遵循 props-in/callbacks-out，不在 `shared/` 内引入平台 API；用户文案对本地用「vault」、对云端协作用「cloud workspace」。

### 6.1 文件树

- 节点图标按注册表类型区分（Markdown / 图片 / PDF / 表格 / 通用文件 / 文件夹）。
- 未识别类型显示为「通用文件」而非消失；右键菜单按能力矩阵裁剪（仅「在 OS 中打开 / 复制路径 / 删除」等）。
- 资产/文档节点显示同步与来源标记（本地 / 已上传云端 / 仅远程）。

### 6.2 新建资源

- 「新建」入口（命令面板、侧边栏、快速切换器）弹出**类型选择器**：文本文档（含模板）/ 导入资产 / 新建看板。
- `CreateNoteDialog` 升级为可选类型/模板；`QuickSwitcher` 的「Create "x"」按所选类型决定后缀。

### 6.3 查看器/编辑器路由

- 打开资源时按注册表类型分发到对应查看器/编辑器；`EditorShell` 顶层依 `currentKind` 选择渲染哪种表面（textarea+预览 / 图片查看器 / PDF 查看器 / …），而非「非 markdown 即禁用」。
- 只读查看器提供「在 OS 中打开」「下载」等动作；不展示属性/大纲/双链等文本专属面板。

### 6.4 拖拽 / 粘贴导入

- 编辑 Markdown 时拖入/粘贴图片：写入 vault 资产目录，插入规范引用，预览即时显示（解析器）。
- 拖入其他文件：导入为对应类型资产或通用文件。

### 6.5 桌面命令

| 命令 | 说明 |
|------|------|
| `import_asset` | 导入二进制资产到当前 vault/文件夹 |
| `open_resource` | 按类型打开资源（取代仅 markdown 的 open） |
| `reveal_in_os` / `open_with_os` | 在 OS 中显示/打开（非文本类型逃生口，既有 `revealItemInDir`/`openPath`） |

## 7. 数据模型与迁移

### 7.1 新增：`workspace_assets`（T2 资产元数据，云端）

新增迁移 `services/jtype-web/migrations/0008_assets.up.sql`（磁盘现有迁移最高为 `0007_kanban`，`0006` 为历史缺号，故下一个可用编号是 `0008`）。沿用既有体例：`CHAR(36)` UUID 主键、`workspace_id` FK `ON DELETE CASCADE`、`updated_clock BIGINT`、软删/回收站对齐文档。示意字段：

```
workspace_assets(
  id CHAR(36) PK,
  workspace_id CHAR(36) NOT NULL FK -> workspaces,
  relative_path VARCHAR(512) NOT NULL,     -- workspace 内规范引用
  content_hash CHAR(64) NOT NULL,          -- sha256，内容寻址/去重
  object_key VARCHAR(...) NOT NULL,        -- 对象存储键
  mime VARCHAR(128) NOT NULL,
  size_bytes BIGINT NOT NULL,
  kind VARCHAR(32) NOT NULL,               -- 注册表类型
  updated_clock BIGINT NOT NULL DEFAULT 0,
  created_at / updated_at TIMESTAMP,
  UNIQUE(workspace_id, relative_path)
)
```

> **对象引用计数（见 4.3）**：物理对象的回收不取决于单行删除。对象按 `content_hash` 被多行共享；GC 需扫描「无任何 `workspace_assets` 行引用的 `content_hash`」再回收，避免删一个引用误删共享字节。是否落为独立 `object_refs` 表或按 `content_hash` 聚合扫描，在设计阶段定。

> ⚠️ **sqlx 陷阱（项目级）**：sqlx 未启用 `chrono`/`time` feature——本表所有 `TIMESTAMP` 列在 SELECT 时必须 `CAST(col AS CHAR)`，否则查询 500（与看板、用户记忆一致）。

### 7.2 类型字段与注册表

- 引入类型注册表（3.6）；T1 文档是否在 `documents` 加 `content_type`/`kind` 列由设计阶段定（v1 可继续按扩展名推断以降低破坏性）。
- `EntryKind`（TS `src/lib/types.ts` ↔ Rust `workspace.rs`）扩展为注册表驱动，保持 camelCase serde 锁步。

### 7.3 兼容性与灰度

- **未知类型 serde 前向兼容**：混合版本的桌面/云端在灰度期可能收到未知 `kind`——反序列化需容错（未知类型降级为「通用文件」而非反序列化失败）。这是迁移段必须处理的真实风险。
- **路径强制 `.md` 的解除**：`normalize_relative_markdown_path` 当前对任意路径补 `.md`；放开它需谨慎分层，避免把 `a.csv` 静默存成 `a.csv.md` 造成数据损坏——v1 仅对显式注册类型放开。
- **既有 vault 兼容**：之前被静默丢弃的文件在升级后会出现在树里——属预期改善，需在发布说明里告知。
- Markdown 文档的存储/三方合并/发布**不变**；资产同步为新增能力，不影响既有文档同步游标。

## 8. 非功能需求

- **不破坏既有同步全序**：所有新类型经 `next_workspace_clock` 推进单一 `sync_clock`。
- **预算可执行**：文本+对象统一计量，避免二进制落地后预算形同虚设。
- **鉴权与 CORS**：资产端点复用 Bearer + `require_workspace_role`；预签名/上传需校验角色与大小/MIME 白名单（当前唯一上传路径仅做 PEM 前缀校验，需补足）。
- **渲染一致性边界**：服务端发布渲染（pulldown-cmark）与客户端（marked+KaTeX+Mermaid+PlantUML）本就不一致；新类型不得扩大该差异，资产改写需在两侧契约一致。
- **桌面离线**：本地查看（Phase 1）完全离线可用；远程资源提供缓存策略（Phase 3）。
- **大文件**：二进制走预签名直传，不经 Axum 进程内存；`mediumtext` 不承载二进制。
- **Web 离线对等**：v1 新类型在 Web 端可为「在线优先」（与看板一致），但必须在文档中明示，以免被当作相对桌面的能力缺失。

## 9. 分阶段交付（Roadmap）

| 阶段 | 范围 | 依赖 | 价值 |
|------|------|------|------|
| **Phase 0** | 单一文件类型注册表；停止丢弃未知文件；`EntryKind` 泛化 | 无 | 去风险的前置投资，立即收敛 4 层重复 |
| **Phase 1** | 本地只读查看器（图片/PDF）；`read_binary_file` + asset 协议；激活 Asset 节点；修复**桌面应用内**预览本地图 | Phase 0 | 无云端改动即交付可见价值（注：**发布站点的本地图仍坏，要到 Phase 2 才修**） |
| **Phase 2a** | 激活 RustFS；`workspace_assets` + 上传/下载/列表/删除 API（含 refcount/GC）；资产同步（replace-wins） | Phase 1 | 资产进云端 |
| **Phase 2b** | 发布资产改写 + 访问控制（仅已发布页资产入公开空间）；实时 SSR `src` 改写 | Phase 2a | **本地↔云端统一核心**，发布站点图片可用 |
| **Phase 2c** | 统一存储预算计量（文本+对象，4+ 查询 + `storage_usage` 表） | Phase 2a | 二进制落地后预算可执行 |
| **Phase 3** | 本地/云端/远程资源体验统一；远程资源固化/缓存；资源属性面板 | Phase 2 | 「在线资源与本地资源体验统一」 |
| **Phase 4+** | 新 T3 结构化类型（白板/表格…）作为独立 PRD，复用资源抽象 | Phase 0 抽象 | 类型生态扩展 |

> **被有意推迟（显式声明，非遗漏）**：二进制云端存储与稳定资源 id 推迟到 Phase 2 一并做；二进制类型合并仅 replace-wins，不做逐行合并；表格/图等编辑能力后置；Web 离线对等与非文本发布 SSR 的完整支持按阶段降级。

## 10. 非目标 / 与既有文档的对齐

- **非目标（本 PRD 增量）**：在应用内**编辑**二进制资产（图片标注、表格编辑等）；非文本类型的逐行冲突合并；新增 T3 结构化类型的具体实现（另起 PRD）；Web 端富文本所见即所得编辑。
- **与 `vault-cloud` 的对齐**：`vault-cloud/prd.md` §8 非目标曾列「图片附件上传到对象存储」。本 PRD **有意推进并取代**该条——需在 `vault-cloud` 文档中相应更新，避免两份文档相互矛盾。
- **与 `vault-cloud/gap.md` 的对齐**：gap 文档把「资产上传到 RustFS + URL 改写」「`storage_usage` 表」标为**未实现 TODO**。本 PRD 的 Phase 2 即激活该路径，落地后需更新这些条目。注：gap.md 现有「Phase 7 in plans.md」指向一个**仓库中不存在的 `plans.md`**，是悬空引用，应一并清理（本 PRD 不依赖该阶段编号）。
- **术语纪律**：服务端一律「workspace」，「vault」仅指本地；资产引用、资源类型等新概念需沿用既有术语风格。

## 11. 开放问题

1. **资产目录约定**：拖拽/粘贴的资产落在 vault 哪个目录（如 `assets/` 或与文档同级）？`vault-cloud/gap.md` 曾建议移除既有 assets 目录约定——需重新定调。
2. **T1 是否加 `content_type` 列**：文档类型是按扩展名推断（破坏性最小）还是落库为显式列？影响混合版本兼容。
3. **资产同步通道**：复用 `/sync/push|pull` 还是独立资产端点？二者都须推进同一 `sync_clock`。
4. **预签名 vs 代理上传**：桌面直传对象存储（预签名）还是经 Axum 代理？影响鉴权与内网拓扑。
5. **稳定资源 id 时机**：是否在 Phase 2 引入稳定 id（让重命名=移动），并据此调整 `UNIQUE(workspace_id, relative_path)` 与 sync-base 键。
6. **PDF/表格的查看器深度**：PDF 用浏览器内置即可；表格只读预览的渲染来源（csv 自解析 / xlsx 库）与体量。
7. **遗留 `src/main.ts`**：该 vanilla 文件含自己的 `currentKind` 门控与 marked 引入，是否仍被任何构建加载需在动工前确认，以正确估算 UI 改造面。
8. **未知扩展名默认**：「通用文件」节点是否允许在 OS 打开即可，还是需要最小预览（如纯文本嗅探）。
9. **Web 离线对等**：新类型是否需要复用文档的 IndexedDB 离线层，还是 v1 在线优先（同看板）。
