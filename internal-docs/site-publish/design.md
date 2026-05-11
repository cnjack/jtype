# JType 发布与站点管理 — 技术设计

状态：设计中
初始日期：2026-05-12
更新日期：2026-05-12

## 1. 架构概览

```
Desktop App (Tauri)                          Web Service (Axum)
┌─────────────────────┐                      ┌──────────────────────────┐
│ 编辑器              │                      │ sites (per workspace)    │
│ 发布/取消发布按钮    │ ── HTTP API ──►      │ published_pages (MySQL)  │
│ Inspector 发布区块   │                      │                          │
│ 站点设置            │                      │ handlers/publish.rs:     │
│ 主题选择 + 预览      │                      │   publish_document()     │
│ 批量发布面板         │                      │   unpublish_document()   │
│                     │                      │   publish_batch()        │
│                     │                      │   preview()              │
│                     │                      │                          │
│                     │                      │ handlers/site.rs (SSR):  │
│                     │                      │   user_site_index()      │
│                     │                      │   workspace_page()       │
│                     │                      │   serve_raw_markdown()   │
│                     │                      │                          │
│                     │                      │ themes/mod.rs:           │
│                     │                      │   render(theme, data)    │
└─────────────────────┘                      └──────────────────────────┘
                                                        │
                                                  公开站点访问
                                                        │
                                             ┌──────────▼──────────┐
                                             │ /u/:username/...    │
                                             │ Rust SSR 渲染        │
                                             │ 读 published_pages  │
                                             │ 主题模板渲染          │
                                             └─────────────────────┘
```

## 2. 数据库设计

### 2.1 documents 表变更

```sql
-- 删除旧的 status 枚举列
ALTER TABLE documents DROP COLUMN status;

-- 新增发布缓存列
ALTER TABLE documents ADD COLUMN is_published BOOL NOT NULL DEFAULT FALSE;

-- 迁移数据：原 status='published' → is_published=TRUE
-- （在 migration 脚本中先迁移再删列）
```

`is_published` 是反范式缓存列，由 publish/unpublish 操作自动维护：
- `publish_document()` → `SET is_published = TRUE`
- `unpublish_document()` → `SET is_published = FALSE`
- 用于文档列表查询（无需 JOIN `published_pages`）

### 2.2 sites 表

每个 workspace 一个站点。

```sql
CREATE TABLE sites (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL DEFAULT '',
  footer_html TEXT DEFAULT NULL,
  theme VARCHAR(64) NOT NULL DEFAULT 'default',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
```

字段说明：

| 字段 | 说明 |
|------|------|
| name | 站点显示名称，用于 HTML `<title>` 和站点首页 |
| footer_html | 自定义页脚 HTML（用户需要出于法律/备案原因展示） |
| theme | 主题 ID，对应 `themes/` 模块中的主题 |

### 2.3 published_pages 表

已发布内容的快照。公开站点**只读取此表**。

```sql
CREATE TABLE published_pages (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  relative_path VARCHAR(512) NOT NULL,
  title VARCHAR(512) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  content_hash CHAR(64) NOT NULL,
  version_id CHAR(36) DEFAULT NULL,
  published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (site_id, workspace_id, relative_path),
  INDEX idx_published_pages_document (document_id),
  INDEX idx_published_pages_site (site_id),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
```

### 2.4 custom_domains 扩展

```sql
ALTER TABLE custom_domains ADD COLUMN site_id CHAR(36) DEFAULT NULL;
ALTER TABLE custom_domains ADD FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL;
```

域名绑定到 workspace 的 site，访问自定义域名等价于 `/u/:username/:workspace_slug`。

## 3. 代码变更：status 移除

### 3.1 需要删除的代码

| 文件 | 变更 |
|------|------|
| `services/jtype-web/src/util.rs` | 删除 `normalize_status()` 函数 |
| `services/jtype-web/src/handlers/document.rs` | 移除 status 相关字段处理 |
| `services/jtype-web/src/handlers/sync.rs` | 移除 `normalize_status()` 调用 |
| `services/jtype-web/src/db/models.rs` | 所有含 `status: String` 的结构体改为 `is_published: bool` |
| `services/jtype-web/src/lib.rs` | 删除 `normalize_status` 测试 |
| `src-tauri/src/workspace.rs` | 删除 `normalize_status()` 函数及调用 |
| `src/main.ts` | 移除 `publishStatus` 相关逻辑 |
| `src/hooks/useFileSystem.ts` | 移除 `status` 默认值写入 |

### 3.2 models.rs 变更摘要

```rust
// 删除 UpdateDocumentStatusRequest（原 PUT .../status 端点删除）

// CloudDocument, DocumentListItem 等
pub struct CloudDocument {
    pub relative_path: String,
    pub title: String,
    pub is_published: bool,       // 替代原 status: String
    pub content: String,
    pub content_hash: String,
    pub version_id: String,
    pub updated_clock: i64,
}

pub struct DocumentListItem {
    pub id: String,
    pub relative_path: String,
    pub title: String,
    pub is_published: bool,       // 替代原 status: String
    pub content_hash: String,
    pub updated_clock: i64,
    pub version_id: Option<String>,
}
```

### 3.3 删除的 API 端点

```
DELETE: PUT /api/v1/workspaces/:id/documents/:doc_id/status
```

状态更新不再是独立操作，发布通过 publish API 控制。

## 4. 主题系统

### 4.1 架构

```
services/jtype-web/src/themes/
├── mod.rs          # 主题注册表、SiteTheme trait、render 入口
├── default.rs      # JType Default 主题
├── academic.rs     # Academic 主题
├── terminal.rs     # Terminal 主题
├── paper.rs        # Paper 主题
└── tokyo.rs        # Tokyo Night 主题
```

### 4.2 主题 Trait

```rust
pub struct ThemeInfo {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
}

pub struct RenderContext<'a> {
    pub site_name: &'a str,
    pub footer_html: &'a str,
    pub workspace_title: &'a str,
    pub workspace_slug: &'a str,
    pub username: &'a str,
    pub pages: &'a [PageMeta],      // 导航用
    pub current_page: &'a PageMeta, // 当前页面
    pub content_html: &'a str,      // 渲染后的 HTML 正文
}

pub struct PageMeta {
    pub relative_path: String,
    pub title: String,
    pub href: String,
}

pub trait SiteTheme: Send + Sync {
    fn info(&self) -> ThemeInfo;
    fn render_page(&self, ctx: &RenderContext) -> String;
    fn render_index(&self, site_name: &str, footer_html: &str,
                    username: &str, workspaces: &[WorkspaceMeta]) -> String;
}
```

### 4.3 主题列表

| ID | 风格 | 特点 |
|----|------|------|
| `default` | 现代科技 | 绿色调、Inter 字体、左侧边栏导航、圆角卡片 |
| `academic` | 学术论文 | 衬线字体 (Georgia)、居中窄正文 (680px)、无侧边栏、大标题、脚注样式 |
| `terminal` | 终端/黑客 | 等宽字体、暗色背景 (#0d1117)、绿色文字、方角、扫描线效果 |
| `paper` | 极简白纸 | 无装饰、超窄正文 (600px)、大量留白、serif 标题 + sans 正文 |
| `tokyo` | Tokyo Night | 深蓝 (#1a1b26)、柔和紫蓝配色、代码块高亮、圆角 |

### 4.4 主题扩展

添加新主题只需要：

1. 在 `themes/` 下创建 `new_theme.rs`，实现 `SiteTheme` trait
2. 在 `themes/mod.rs` 的 `THEMES` 注册表中添加条目

无需修改数据库、路由或其他模块。

## 5. Rust 模块设计

### 5.1 handlers/publish.rs

```rust
/// POST /api/v1/workspaces/:workspace_id/documents/:document_id/publish
pub async fn publish_document(...)
```

逻辑：
1. 验证用户有 workspace 的 editor+ 权限
2. 获取或创建 workspace 的 `site` 记录（lazy init）
3. 读取 document 当前内容
4. INSERT ON DUPLICATE UPDATE 到 `published_pages`
5. 更新 `documents.is_published = TRUE`
6. 返回已发布页面信息（包含公开 URL）

```rust
/// DELETE /api/v1/workspaces/:workspace_id/documents/:document_id/publish
pub async fn unpublish_document(...)
```

逻辑：
1. 验证权限
2. 删除对应 `published_pages` 记录
3. 更新 `documents.is_published = FALSE`
4. 返回 204

```rust
/// POST /api/v1/workspaces/:workspace_id/publish-batch
pub async fn publish_batch(...)
```

逻辑：
1. 接受 `{ document_ids: Vec<String> }`
2. 获取或创建 site
3. 批量 INSERT/UPDATE `published_pages`
4. 批量更新 `documents.is_published = TRUE`
5. 返回各文档的发布结果

```rust
/// GET /api/v1/workspaces/:workspace_id/published
pub async fn list_published(...)
```

```rust
/// GET /api/v1/workspaces/:workspace_id/documents/:document_id/publish
pub async fn get_publish_status(...)
```

返回：是否已发布、published_at、published_content_hash vs current_content_hash。

```rust
/// POST /api/v1/workspaces/:workspace_id/preview
pub async fn preview(...)
```

接受 `{ content: String, theme: Option<String> }`，渲染返回完整 HTML。

### 5.2 handlers/site.rs（重写）

公开站点渲染，完全使用 `published_pages` + `sites` + 主题系统。

```rust
/// GET /u/:username
pub async fn user_site_index(...)
```

逻辑：
1. 查询用户的所有 workspace 的 site 信息
2. 查询每个 site 的 published_pages 数量
3. 使用 `default` 主题渲染用户首页

```rust
/// GET /u/:username/:workspace_slug/*page_path
pub async fn workspace_page(...)
```

逻辑：
1. 检查 page_path 是否以 `.md` 结尾 → 如果是，返回原始 Markdown
2. 加载 workspace 的 site 配置
3. 从 `published_pages` 加载内容
4. 将 Markdown 转为 HTML
5. 使用 site 的主题渲染完整页面（包含 footer_html）

```rust
/// 原始 Markdown 访问
fn serve_raw_markdown(content: &str) -> Response
```

返回 `Content-Type: text/markdown; charset=utf-8`，body 为原始 Markdown。

### 5.3 站点设置 API

```rust
/// GET /api/v1/workspaces/:workspace_id/site
pub async fn get_site_settings(...)

/// PUT /api/v1/workspaces/:workspace_id/site
pub async fn update_site_settings(...)
```

UpdateSiteSettingsRequest:
```rust
pub struct UpdateSiteSettingsRequest {
    pub name: Option<String>,
    pub footer_html: Option<String>,
    pub theme: Option<String>,       // 需验证是已注册主题 ID
}
```

### 5.4 themes/mod.rs

```rust
use std::collections::HashMap;
use once_cell::sync::Lazy;

mod default;
mod academic;
mod terminal;
mod paper;
mod tokyo;

static THEMES: Lazy<HashMap<&'static str, &'static dyn SiteTheme>> = Lazy::new(|| {
    let mut m = HashMap::new();
    m.insert("default", &default::DefaultTheme as &dyn SiteTheme);
    m.insert("academic", &academic::AcademicTheme as &dyn SiteTheme);
    m.insert("terminal", &terminal::TerminalTheme as &dyn SiteTheme);
    m.insert("paper", &paper::PaperTheme as &dyn SiteTheme);
    m.insert("tokyo", &tokyo::TokyoTheme as &dyn SiteTheme);
    m
});

pub fn get_theme(id: &str) -> &'static dyn SiteTheme {
    THEMES.get(id).copied().unwrap_or(THEMES["default"])
}

pub fn list_themes() -> Vec<ThemeInfo> {
    THEMES.values().map(|t| t.info()).collect()
}

pub fn is_valid_theme(id: &str) -> bool {
    THEMES.contains_key(id)
}
```

## 6. Site 懒初始化

首次发布文档或首次更新站点设置时自动创建 site：

```rust
async fn ensure_site(pool: &Pool<MySql>, workspace_id: &str, workspace_name: &str) -> Result<String, AppError> {
    // 1. SELECT id FROM sites WHERE workspace_id = ?
    // 2. 如果存在 → 返回 id
    // 3. 如果不存在 → INSERT (name 默认为 workspace_name)
    // 4. 返回 site.id
}
```

## 7. 路由变更

### 7.1 新增路由

```rust
// 主题列表（无需认证）
.route("/api/themes", get(handlers::publish::list_themes))

// 站点设置
.route("/api/v1/workspaces/:workspace_id/site",
    get(handlers::publish::get_site_settings)
    .put(handlers::publish::update_site_settings))

// 发布操作
.route("/api/v1/workspaces/:workspace_id/documents/:document_id/publish",
    post(handlers::publish::publish_document)
    .delete(handlers::publish::unpublish_document)
    .get(handlers::publish::get_publish_status))
.route("/api/v1/workspaces/:workspace_id/publish-batch",
    post(handlers::publish::publish_batch))
.route("/api/v1/workspaces/:workspace_id/published",
    get(handlers::publish::list_published))

// 预览
.route("/api/v1/workspaces/:workspace_id/preview",
    post(handlers::publish::preview))
```

### 7.2 删除路由

```rust
// 删除 status 更新端点
// 原: PUT /api/v1/workspaces/:workspace_id/documents/:document_id/status
```

### 7.3 站点路由不变

```rust
.route("/u/:site_user", get(handlers::site::user_site_index))
.route("/u/:site_user/:workspace_slug", get(handlers::site::workspace_index))
.route("/u/:site_user/:workspace_slug/*page_path", get(handlers::site::workspace_page))
```

`.md` 后缀的处理在 `workspace_page` handler 内部判断。

## 8. 性能考量

| 方面 | 设计 |
|------|------|
| 文档列表查询 | 使用 `documents.is_published` 列，无需 JOIN |
| 公开站点查询 | 只查 `published_pages` + `sites`，不触及 `documents` |
| 内容存储 | `published_pages.content` 是冻结快照，不需 JOIN document_versions |
| 主题渲染 | 纯 Rust 字符串拼接，无模板引擎依赖 |
| 导航树 | 从 `published_pages.relative_path` 构建，已有索引 |

## 9. 安全考量

| 方面 | 措施 |
|------|------|
| footer_html 注入 | 存储原始输入，渲染时限制标签白名单（`<p>`, `<a>`, `<span>`, `<br>`, `<strong>`, `<em>`） |
| 发布权限 | 只有 workspace 的 editor/admin/owner 可以发布 |
| 站点设置权限 | workspace 的 admin/owner 可以修改 |
| .md 原始内容 | 只返回已发布内容，不泄露未发布草稿 |

## 10. 迁移策略

### 10.1 数据库迁移

Migration `0005_sites.up.sql`：
1. `documents` 表增加 `is_published BOOL DEFAULT FALSE`
2. 迁移数据：`UPDATE documents SET is_published = TRUE WHERE status = 'published'`
3. 删除 `documents.status` 列
4. 创建 `sites` 表（per workspace）
5. 创建 `published_pages` 表
6. `custom_domains` 添加 `site_id` 列

### 10.2 Breaking Change

- 现有公开站点将变为空白（因为没有 `published_pages` 记录）
- 用户需要重新手动发布文档
- 提供 `publish-batch` API 方便一次性迁移
- `documents.status` 列被删除，所有依赖它的代码需要更新
