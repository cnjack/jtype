# JType 发布与站点管理 — 产品需求文档

状态：设计中
初始日期：2026-05-12
更新日期：2026-05-12

## 1. 背景

JType 的发布功能允许用户将 Markdown 文档渲染为公开可访问的静态站点。当前实现中，所有 `status = 'published'` 的文档自动出现在公开站点上，没有显式的发布操作、预览流程或版本快照机制。

### 当前问题

| 问题 | 影响 |
|------|------|
| 文档自动发布，无显式发布操作 | 编辑中的内容可能被公开展示 |
| 无发布预览 | 用户无法在发布前检查最终效果 |
| 公开站点直接读取 documents 表 | 每次访问实时渲染、无快照、性能差 |
| 只有单一主题 | 无法个性化站点风格 |
| 无站点元数据管理 | 缺少站点名称、footer、主题配置 |
| 自定义域名绑定到 workspace 而非站点 | 域名与发布概念不对齐 |
| 无 AI 友好的内容访问方式 | AI 爬虫无法获取结构化 Markdown |
| documents.status 字段与发布概念耦合 | 状态既是编辑工作流标签又控制发布可见性，语义混乱 |

## 2. 产品目标

1. **显式发布**：文档必须经过明确的"发布"操作才会出现在公开站点
2. **快照式发布**：发布时冻结文档内容，后续编辑不影响已发布版本
3. **发布预览**：发布前可预览最终渲染效果
4. **多主题支持**：内置多套风格迥异的主题，易于扩展
5. **站点管理**：用户可配置站点名称、footer、主题
6. **域名绑定到站点**：自定义域名与站点概念对齐
7. **AI 友好**：支持 `.md` 后缀访问返回原始 Markdown
8. **状态简化**：移除 `documents.status` 字段，发布状态由 `published_pages` 唯一控制

## 3. 核心概念

### 3.1 Site（站点）

**每个 workspace 拥有一个 Site**，是该 workspace 所有已发布内容的容器。

- Site 有名称（`name`）、页脚（`footer_html`）、主题（`theme`）
- Site 通过 `/u/:username/:workspace_slug` 路由访问
- 自定义域名绑定到 Site
- 用户站点首页 `/u/:username` 聚合该用户所有 workspace 的 site

### 3.2 Published Page（已发布页面）

发布操作创建文档内容的快照，存入 `published_pages` 表。

- 一个 document 可以反复发布，每次发布更新快照内容
- 取消发布（unpublish）删除对应的 published_page 记录
- 公开站点只读取 `published_pages`，不直接读取 `documents`

### 3.3 发布模型

```
documents 表              published_pages 表
┌──────────────────┐      ┌──────────────────┐
│ content          │      │                  │
│ is_published=F   │      │                  │
│                  │      │                  │
│ ──── publish ──────────►│ published page   │
│ is_published=T   │      │ (content frozen) │
│                  │      │                  │
│ ──── unpublish ────────►│ (record deleted) │
│ is_published=F   │      │                  │
└──────────────────┘      └──────────────────┘
```

- **删除 `documents.status` 列**（原来的 `draft`/`ready`/`published`/`archived` 枚举）
- **新增 `documents.is_published` 列**（`BOOL DEFAULT FALSE`），作为查询性能的反范式缓存
- `is_published` 在 publish 时设为 TRUE，unpublish 时设为 FALSE
- 任何文档都可以发布，不受前置状态限制
- frontmatter 中的 `status` 字段保留为用户自定义元数据，不再有系统语义

### 3.4 主题

内置主题：

| 主题 ID | 名称 | 风格 |
|---------|------|------|
| `default` | JType Default | 现有的绿色科技风，Inter 字体，侧边栏导航 |
| `academic` | Academic | 衬线字体，宽正文，学术论文风，无侧边栏 |
| `terminal` | Terminal | 等宽字体，暗色背景，终端/黑客风 |
| `paper` | Paper | 极简白底，窄正文，打印友好 |
| `tokyo` | Tokyo Night | 深蓝底色，柔和配色，暗色主题 |

主题通过 Rust 模板系统实现，每个主题提供：
- CSS 变量 / 完整样式
- HTML 结构模板（header、nav、content、footer）
- 响应式适配

### 3.5 AI 友好访问

访问 `/u/:username/:workspace_slug/page.md`（注意 `.md` 后缀）返回原始 Markdown 内容（`Content-Type: text/markdown`），而非 HTML 渲染。

这使得 AI 爬虫、MCP 工具、其他自动化工具可以直接获取结构化内容。

## 4. 功能需求

### 4.1 站点设置 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/workspaces/:id/site` | 获取 workspace 的站点配置 |
| PUT | `/api/v1/workspaces/:id/site` | 更新站点配置（name、footer_html、theme） |
| GET | `/api/themes` | 获取可用主题列表（无需认证） |

### 4.2 发布 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/workspaces/:id/documents/:doc_id/publish` | 发布文档（创建/更新快照） |
| DELETE | `/api/v1/workspaces/:id/documents/:doc_id/publish` | 取消发布（删除快照） |
| GET | `/api/v1/workspaces/:id/documents/:doc_id/publish` | 获取发布状态与已发布快照信息 |
| POST | `/api/v1/workspaces/:id/publish-batch` | 批量发布多个文档 |
| GET | `/api/v1/workspaces/:id/published` | 列出该 workspace 的所有已发布页面 |

### 4.3 预览 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/workspaces/:id/preview` | 提交 Markdown 内容 + 主题，返回渲染后的完整 HTML |

### 4.4 公开站点路由

| 路由 | 说明 |
|------|------|
| `/u/:username` | 用户首页，列出所有有已发布页面的 workspace |
| `/u/:username/:workspace_slug` | workspace 站点首页 |
| `/u/:username/:workspace_slug/*page_path` | 文档页面（HTML 渲染） |
| `/u/:username/:workspace_slug/*page_path.md` | 文档页面（原始 Markdown） |

### 4.5 域名绑定

自定义域名绑定到 `site`（即绑定到 workspace 的 site）：

- `custom_domains` 表新增 `site_id` 列
- 域名验证流程不变（DNS TXT 记录）
- 绑定后，通过自定义域名访问等效于 `/u/:username/:workspace_slug`

## 5. 用户界面与交互流程

### 5.1 UI 入口

#### A. 文档编辑器 Header — 发布按钮

编辑器 header 的 action 区域（与保存按钮同行）：

- **未发布文档**：显示 `发布` 按钮（Heroicon: `ArrowUpOnSquareIcon`）
- **已发布文档**：显示 `已发布` 状态标签 + `取消发布` 下拉选项
- **已发布但内容有变更**：显示 `重新发布` 按钮（橙色高亮），tooltip 显示"已发布版本与当前内容不同"

#### B. 文档信息面板（Inspector）

Inspector 面板中显示发布区块：

- 发布状态：已发布 / 未发布
- 已发布时间（published_at）
- 已发布内容 hash vs 当前内容 hash（是否有变更）
- 公开链接（可点击跳转）
- `发布` / `重新发布` / `取消发布` 按钮

#### C. 侧边栏文件树 — 发布状态标记

文件树中已发布文档显示视觉标记：

- 文件名旁显示小圆点（绿色 = 已发布且同步，橙色 = 已发布但有未发布变更）
- 右键菜单增加"发布" / "取消发布"选项

#### D. VaultHome — 批量发布

VaultHome 页面（无选中文档时）增加"发布管理"区域：

- 显示 workspace 的所有文档列表，标注发布状态
- 支持多选 + 批量发布 / 批量取消发布
- 筛选：全部 / 已发布 / 未发布 / 有变更

#### E. 站点设置入口

侧边栏底部或 VaultHome 中增加"站点设置"入口：

- 站点名称编辑
- 主题选择（卡片式选择器，每个主题有缩略图 + 描述）
- 页脚 HTML 编辑（textarea）
- 站点公开链接
- 自定义域名管理入口

### 5.2 发布交互流程

#### 首次发布

1. 用户在编辑器中完成文档
2. 点击 header 中的 `发布` 按钮
3. 弹出确认面板：显示文档标题、公开路径预览
4. 可选择"发布前预览"按钮 → 在新标签页打开预览渲染
5. 确认发布 → 调用 `POST .../publish` API
6. 按钮变为 `已发布` 状态，文件树中出现绿色标记

#### 预览

1. 在确认发布面板中点击"预览"
2. 调用 `POST /api/v1/workspaces/:id/preview`，传入当前 Markdown 内容
3. 返回完整 HTML，在新窗口/iframe 中展示
4. 用户确认效果后返回发布流程

#### 更新已发布内容

1. 用户修改文档后，header 按钮变为 `重新发布`（橙色高亮）
2. 文件树中标记变为橙色
3. Inspector 面板显示"内容已变更，点击重新发布"
4. 点击重新发布 → 更新 `published_pages` 快照

#### 取消发布

1. 已发布文档 header 的下拉菜单中点击"取消发布"
2. 或在 Inspector 面板中点击"取消发布"
3. 弹出确认对话框："确定取消发布？页面将从公开站点移除"
4. 确认 → 调用 `DELETE .../publish` API
5. 按钮恢复为 `发布`，文件树标记消失

#### 更换主题

1. 进入站点设置
2. 主题选择器以卡片形式展示所有可用主题
3. 选择主题后右侧显示实时预览（使用预览 API）
4. 保存 → 立即生效，所有已发布页面以新主题渲染

### 5.3 桌面端命令

| 命令 | 说明 |
|------|------|
| `publish_document` | 发布当前文档 |
| `unpublish_document` | 取消发布当前文档 |
| `preview_publish` | 预览发布效果 |
| `open_site_settings` | 打开站点设置 |
| `batch_publish` | 打开批量发布面板 |

可通过 Quick Open (Cmd+P) 或快捷键触发。

## 6. 非功能需求

- 公开站点为纯 Rust SSR，不依赖前端 SPA
- 已发布内容从 `published_pages` 读取，不触及 `documents` 表
- 主题系统基于模板，便于后续添加新主题
- `.md` 后缀访问返回 `Content-Type: text/markdown; charset=utf-8`

## 7. 数据迁移

这是一个 **breaking change**：

### 7.1 documents.status 移除

- 删除 `documents.status` 列
- 新增 `documents.is_published` 列（`BOOL DEFAULT FALSE`）
- 迁移脚本将原 `status = 'published'` 的文档设 `is_published = TRUE`
- `normalize_status` 函数删除（web service + Tauri 端）
- frontmatter 中 `status`/`publish` 字段不再有系统语义

### 7.2 站点与已发布页面

- 创建 `sites` 表（per workspace）
- 创建 `published_pages` 表
- 现有公开站点将变为空白（无 `published_pages` 记录）
- 用户需要手动发布文档或使用批量发布功能
- 提供批量发布 API 方便一次性迁移

### 7.3 自定义域名

- `custom_domains` 新增 `site_id` 列
- 域名绑定从 `workspace_id` 迁移到 `site_id`

这是有意为之的：发布应该是一个显式的用户操作。
