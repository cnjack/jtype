# JType 图片资源（Asset）存储 — 技术设计

状态：已实现并验收
初始日期：2026-06-14

## 验收结果（2026-06-14）

- `cargo test --lib`：30 通过（含 `storage` 的 InMemory put/get/delete round-trip 与图片魔数嗅探）。
- `cargo test --test asset_tests`（实库 MySQL + InMemory 存储）：7 通过——上传+公开代理读取、
  列出、去重、拒绝非图片/SVG/空、超限、未认证 401 + 非成员拒绝。
- 全量 `cargo test`：所有测试二进制 0 失败（含既有 21 publish、各模块测试）。
- **LocalFileSystem 后端**实跑（debug 二进制，端口 13346）：上传真实 PNG → 对象落盘于
  `./.jtype-storage/assets/{ws}/{sha}.png`（内容寻址）→ 公开代理 `/assets/:ws/:id` 返回
  `image/png` + `immutable` + `nosniff`，字节一致 → 嵌入文档发布后公开站点渲染 `<img>` 且图片可加载。
- **浏览器端**：编辑器工具栏「插入图片」按钮、**粘贴上传**端到端可用（粘贴 PNG → 上传 →
  插入 `![name](/assets/...)`，相同字节去重），文档标记未保存；编辑预览与发布页均渲染 `<img>`，
  无控制台报错。顺带修复了 web 编辑器 `#editor` id 缺失导致工具栏插入函数静默失效的既有问题。
- **RustFS（S3）后端 smoke**（端口 13347，`JTYPED_STORAGE_ENDPOINT=http://127.0.0.1:9000`）：
  S3 `put` 上传成功 → 经 web 代理字节一致读回 → 直接对 RustFS 的对象键 `HEAD` 返回 200，
  证实对象物理存于 RustFS，且对象存储从不直接暴露给客户端。

## 1. 背景与目标

JType 的 Markdown 目前只能引用外部图片 URL 或本地文件路径——无法在云端编辑/发布时携带图片。
基础设施里已经预置了 **RustFS**（S3 兼容对象存储，`docker-compose.yml` + `.env.example`
的 `RUSTFS_*` / `JTYPED_STORAGE_*`），但 web 服务从未接入。

目标：

1. Markdown 支持图片：编辑器里粘贴 / 拖拽 / 选择图片即上传，返回可插入的 URL。
2. 图片等 asset 存入 **S3 兼容对象存储（RustFS）**；本地/测试可退回文件系统后端。
3. **对象存储绝不直接对外暴露**——所有读取都经过 web 服务代理（`/assets/...`）。
4. 编辑、渲染、发布全链路可用：已发布站点的图片同样经 web 代理读取。

## 2. 架构

```
浏览器编辑器  ──upload──►  POST /api/v1/workspaces/:id/assets  ──put──►  ObjectStore (RustFS/S3)
                                       │ 记录 assets 表
Markdown 存 `/assets/:ws/:id` ◄────────┘
公开站点 / 编辑预览  ──GET /assets/:ws/:id──►  web 代理  ──get──►  ObjectStore（S3 不暴露）
```

### 存储抽象

直接使用 [`object_store`](https://docs.rs/object_store) crate 的 `ObjectStore` trait，
`AppState` 持有 `Arc<dyn ObjectStore>`：

| 后端 | 用途 | 选择条件 |
|------|------|----------|
| `AmazonS3`（自定义 endpoint，path-style，allow_http） | 生产，连 RustFS/S3 | 设置了 `JTYPED_STORAGE_ENDPOINT` |
| `LocalFileSystem`（根目录） | 本地开发无 S3 时 | 设置了 `JTYPED_STORAGE_LOCAL_DIR`，或默认 `./.jtype-storage` |
| `InMemory` | 集成测试 | `build_router` 默认（测试不需要 S3） |

`storage::from_env()` 在 `run_from_env` 里构建生产后端；`build_router` 默认 `InMemory`，
使既有测试无需 S3 即可运行。

## 3. 数据模型

`0010_assets.up.sql`：

```sql
CREATE TABLE assets (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  storage_key VARCHAR(600) NOT NULL,      -- 对象键
  content_type VARCHAR(128) NOT NULL,
  byte_size BIGINT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  original_name VARCHAR(255) DEFAULT NULL,
  created_by_user_id CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assets_ws_sha (workspace_id, sha256),  -- 同 workspace 去重
  KEY idx_assets_workspace (workspace_id),
  CONSTRAINT assets_ws_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
```

- **内容寻址去重**：同一 workspace 内重复上传同一图片（sha256 相同）复用既有记录。
- 对象键：`assets/{workspace_id}/{sha256}{ext}`。
- `byte_size` 记录用量（暂不强制 workspace 预算，留作后续）。

## 4. 安全：类型与访问

| 方面 | 措施 |
|------|------|
| 允许的类型 | `image/png,jpeg,gif,webp,avif`。**禁止 SVG**（内联 SVG 可执行脚本，是同源 XSS 向量）。按魔数嗅探，不轻信 Content-Type |
| 大小上限 | 单文件 10 MB |
| 上传权限 | workspace 的 editor/admin/owner |
| 读取（`/assets/:ws/:id`） | 公开，但路径含两个不可猜测 UUID（workspace_id + asset_id）；行业惯例 |
| 对象存储暴露 | 永不直接暴露——`/assets` 由 web 流式代理；S3 凭证只在服务端 |
| 缓存 | 代理响应 `Cache-Control: public, max-age=31536000, immutable`（id 不可变） |
| 响应头 | 强制按白名单 `Content-Type`，加 `X-Content-Type-Options: nosniff` |

## 5. API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/v1/workspaces/:id/assets` | editor+ | 原始字节上传（`Content-Type` 头 + 可选 `X-Filename`），校验类型/大小，put 到存储，写 `assets`，返回 `{id,url,contentType,byteSize}` |
| GET | `/api/v1/workspaces/:id/assets` | viewer+ | 列出 workspace 资源 |
| DELETE | `/api/v1/workspaces/:id/assets/:asset_id` | editor+ | 删除 DB 行 + 存储对象 |
| GET | `/assets/:workspace_id/:asset_id` | 公开 | web 代理流式返回图片字节（S3 不暴露） |

返回的 `url` 为相对路径 `/assets/{ws}/{id}`，存进 Markdown。该路径同源服务于编辑预览与
公开站点，无需重写。

## 6. 前端（web 编辑器）

`services/jtype-web/frontend/src/pages/Workspace.tsx` 的 `<textarea>` 编辑器：

- **粘贴**：`onPaste` 检测剪贴板图片 → 上传 → 光标处插入 `![name](url)`。
- **拖拽**：`onDrop` 图片文件 → 上传 → 插入。
- **工具栏按钮**：「插入图片」打开文件选择 → 上传 → 插入。
- 上传中插入占位 `![Uploading…]()`，完成后替换为真实链接；失败回滚 + 提示。

`api.ts` 增加 `uploadAsset(workspaceId, file) -> {id,url,...}`（`fetch` 传二进制 body）。

Markdown 渲染（`shared/lib/markdown.ts` marked + DOMPurify，以及 SSR `pulldown-cmark`）
本就把 `![alt](url)` 渲染为 `<img>`，主题 CSS 已含 `.prose img{max-width:100%}`，无需改动。

## 7. 桌面端

桌面 `EditorShell` 与本地优先模型下，图片理想是落到本地 vault 的 `assets/` 目录；
但本特性核心是「经 web 暴露的 S3」，故本期完整交付 **web 端**，桌面端粘贴上传列为后续
（共享渲染层已支持 `<img>`，桌面引用云 `/assets/...` 绝对 URL 亦可显示）。

## 8. 验收

1. `storage` 单测：InMemory 后端 put/get/delete round-trip；类型嗅探与大小校验。
2. `cargo test --test asset_tests`（实库 MySQL + InMemory 存储）：上传→列出→GET 代理→删除、
   去重、类型拒绝（SVG/非图片）、超限、权限（非成员 403 / viewer 不能上传）、未认证。
3. 实跑：debug 二进制（LocalFileSystem 后端）+ 浏览器，编辑器粘贴/选择图片→插入→预览/发布
   显示图片；公开站点 `/assets/:ws/:id` 返回正确字节与 Content-Type。
4. （尽力）对 live RustFS 做一次 S3 后端 smoke：上传并经 `/assets` 读回。
