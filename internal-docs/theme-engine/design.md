# JType 主题引擎 — 技术设计

状态：已实现并验收
初始日期：2026-06-14

## 验收结果（2026-06-14）

- `cargo test --lib`：28 通过（含 spec 净化/夹紧/颜色校验/`from_custom_json` 单测）。
- `cargo test --test publish_tests`（实库 MySQL）：21 通过——保留全部旧断言，新增
  「12 主题 + swatch」「`GET /api/themes/:id`」「自定义主题保存/读取 + CSS 净化」
  「内联自定义主题预览」「每个内置主题可预览」。
- 浏览器验收（debug 二进制 + 实库，端口 13346）：站点设置「站点和主题」标签页正常——
  12 主题卡片带色板缩略图、选择即时落库（验证 `theme=tokyo` 持久化）、实时预览 iframe
  随主题更新（`--accent:#7aa2f7`）、自定义编辑器（8 色 + 7 滑块 + 5 下拉）从预设派生、
  改强调色为 `#ff8800` 保存为 `theme=custom`、公开站点 `/u/:user/:slug` SSR 渲染出
  `--accent:#ff8800`，`.md` 原始端点正常。无控制台报错。i18n 已抽取/编译并补齐中文。


## 1. 背景与目标

`site-publish` 已落地：每个 workspace 有一个 `site`，发布的页面由 Rust SSR 用主题渲染。
当前主题系统是 5 个手写的 `SiteTheme` trait 实现（`themes/{default,academic,terminal,paper,tokyo}.rs`），
每个主题把整段 CSS 硬编码进 Rust。这种做法有两个问题：

1. 新增主题需要写一个完整的 Rust 文件并重新编译 —— 无法做到「12 个主题」的规模化，也谈不上「自定义」。
2. 用户完全无法定义自己的主题。

目标：

1. **主题引擎**：把「主题」从「一段硬编码 CSS + HTML」变成**数据驱动的 `ThemeSpec`**（设计令牌 + 布局原型），
   由**单一通用渲染器**渲染任意 `ThemeSpec`。
2. **12 个内置主题**：以 `ThemeSpec` 预设的形式提供，风格各异。
3. **自定义主题**：用户可在站点设置里定义自己的主题（颜色 / 字体 / 布局 / 自定义 CSS），
   存为站点上的 JSON，发布站点即以该主题渲染。
4. **安全**：自定义主题的所有取值都经过校验与净化，防止 CSS 注入 / `</style>` 逃逸。
5. **向后兼容**：保留 `default/academic/terminal/paper/tokyo` 五个主题 ID 及其行为
   （集成测试依赖这些 ID）。

## 2. 架构

```
services/jtype-web/src/themes/
├── mod.rs        # 公开 API：RenderContext、ThemeInfo、resolve()、registry、净化入口
├── spec.rs       # ThemeSpec 数据模型 + serde + 校验/净化 + → CSS 变量
├── render.rs     # 通用渲染器：render_page / render_workspace_index / render_user_index + nav 树
└── presets.rs    # 12 个内置 ThemeSpec 预设
```

不再有 per-theme 的 `.rs` 文件。`SiteTheme` trait 被移除，调用方改为：

```rust
let spec = themes::resolve(&theme_id, custom_theme_json.as_deref());
let html = themes::render_page(&spec, &ctx);
```

## 3. 数据模型（`ThemeSpec`）

`ThemeSpec` 同时用于：（a）内置预设（编译期构造）；（b）自定义主题（反序列化自 DB JSON）。
因此字段使用 owned `String`，并对所有字段 `#[serde(default)]` 以容忍部分输入。

```rust
pub struct ThemeSpec {
    pub id: String,            // 内置 id 或 "custom"
    pub name: String,
    pub description: String,
    pub layout: Layout,        // 布局原型
    pub palette: Palette,      // 颜色
    pub typography: Typography,// 字体 + 尺度
    pub shape: Shape,          // 圆角 / 边框 / 密度
    pub custom_css: String,    // 追加的原始 CSS（净化后）
}

pub enum Layout { Sidebar, Header, Minimal }   // 默认 Sidebar

pub struct Palette {
    bg, surface, fg, muted, accent, accent_contrast,
    border, code_bg, code_fg: String,
    appearance: Appearance,    // Light | Dark（影响 color-scheme 与 mermaid 主题）
}

pub struct Typography {
    body_font, heading_font, mono_font: String, // CSS font stack
    base_size: u8,        // px，clamp 13..=22
    content_width: u16,   // px，clamp 520..=1100
    line_height: f32,     // clamp 1.3..=2.2
    heading_weight: u16,  // clamp 400..=900
    letter_spacing: f32,  // em，clamp -0.06..=0.12（标题）
}

pub struct Shape {
    radius: u8,           // px，clamp 0..=28
    border_width: u8,     // px，clamp 0..=3
    density: Density,     // Compact | Cozy | Comfortable（影响行距/内边距）
    sidebar_width: u16,   // px，clamp 200..=360（仅 Sidebar 布局）
}
```

### 布局原型

| Layout | 结构 | 用于 |
|--------|------|------|
| `Sidebar` | 左固定侧栏（站点名 + nav 树）+ 右主内容 | default, terminal, tokyo, dracula, nord, forest, midnight |
| `Header` | 顶部 header（站点名 + 横向页面链接）+ 居中内容 | academic, solarized, newsprint |
| `Minimal` | 无导航骨架，仅居中内容 + 极简页眉 | paper, sepia |

颜色 / 字体 / 圆角全部来自令牌 → 注入为 `:root` CSS 变量；结构 CSS 按 `layout` 选择。
12 个主题的差异主要由 `palette + typography + layout + 少量 custom_css` 表达。

## 4. 通用渲染器

`render.rs` 提供：

```rust
pub fn render_page(spec: &ThemeSpec, ctx: &RenderContext) -> String;
pub fn render_workspace_index(spec, site_name, footer_html, username, slug, title, pages) -> String;
pub fn render_user_index(spec, username, workspaces) -> String;
```

渲染流程：

1. `spec.to_css_vars()` → `:root{--bg:…;--fg:…;--accent:…;--radius:…;--content-width:…;…}`。
2. `base_css(spec.layout)` → 引用上述变量的结构化 CSS（含响应式、prose 排版、代码块、mermaid 容器）。
3. 追加 `spec.custom_css`（已净化）。
4. 按 layout 生成 HTML 骨架（侧栏 nav 树 / 顶部 header / 极简）。

nav 树构建逻辑（folder/doc 递归）从旧 `default.rs` 提取到 `render.rs`，三种布局共用。
mermaid 主题按 `appearance` 选择 `neutral` / `dark`。

## 5. 自定义主题

### 存储

`0009_theme_engine.up.sql`：

```sql
ALTER TABLE sites ADD COLUMN custom_theme JSON DEFAULT NULL;
```

- `sites.theme = 'custom'` 且 `custom_theme` 非空时，渲染使用自定义 spec。
- `theme = 'custom'` 但 `custom_theme` 为空 → 回退 `default`。

### 解析

```rust
pub fn resolve(theme_id: &str, custom_theme: Option<&str>) -> ThemeSpec {
    if theme_id == "custom" {
        if let Some(json) = custom_theme {
            if let Ok(spec) = ThemeSpec::from_custom_json(json) { return spec; }
        }
        return presets::default_spec();
    }
    presets::builtin(theme_id).cloned().unwrap_or_else(presets::default_spec)
}
```

`ThemeSpec::from_custom_json` 反序列化后调用 `sanitize()`：所有字段被夹紧 / 净化（见 §6），
`id` 强制为 `"custom"`，`name` 截断。

## 6. 安全：校验与净化

自定义主题的输出会被发布站点的匿名访客加载，必须防注入。

| 字段类型 | 规则 |
|----------|------|
| 颜色（`palette.*`） | 必须匹配 `#hex(3/4/6/8) \| rgb/rgba() \| hsl/hsla() \| 命名色`，否则回退预设值 |
| 字体栈 | 仅允许 `[A-Za-z0-9 _,'"-]`、长度 ≤ 200，否则回退 |
| 数值（size/width/line-height/radius/...） | 数值夹紧到允许区间 |
| `custom_css` | 删除 `<`、`>`、`\`；删除 `@import`、`expression(`、`javascript:`；长度 ≤ 20 000，防 `</style>` 逃逸与外部 import |
| `name` | HTML 转义 + 截断 80 |

净化是**回退而非报错**：非法值替换为安全默认，保证渲染永不失败。
（站点设置 API 在保存前仍会做一次 `serde` 形状校验，畸形 JSON 返回 400。）

## 7. API 变更

### `GET /api/themes`（无需认证）

返回所有内置主题的卡片信息，增加预览色板（供前端画缩略图，无需 iframe）：

```jsonc
[{ "id": "default", "name": "JType Default", "description": "...",
   "layout": "sidebar", "appearance": "light",
   "swatch": { "bg": "#fbfdfb", "fg": "#18181b", "accent": "#008884", "surface": "#f7faf8" } }]
```

`ThemeInfo` 扩展 `layout/appearance/swatch` 字段；旧字段 `id/name/description` 不变（向后兼容）。

### `GET /api/themes/:id`（无需认证）

返回某内置主题完整 `ThemeSpec`，用于「从预设派生自定义主题」。未知 id → 404。

### 站点设置

`UpdateSiteSettingsRequest` 增加 `customTheme: Option<ThemeSpecInput>`：

```rust
pub struct UpdateSiteSettingsRequest {
    pub name: Option<String>,
    pub footer_html: Option<String>,
    pub theme: Option<String>,          // 允许 "custom"
    pub custom_theme: Option<serde_json::Value>, // 仅当 theme=="custom" 时使用
}
```

- `theme == "custom"`：要求 `custom_theme` 形状有效，净化后存入 `sites.custom_theme`。
- `theme` 为内置 id：照常校验，`custom_theme` 不变。
- `SiteSettingsResponse` 增加 `customTheme: Option<Value>` 字段，便于前端编辑回填。
- `is_valid_theme` 扩展为接受 `"custom"`。

### 预览

`PreviewRequest` 增加 `customTheme: Option<Value>`，使编辑器能在保存前预览自定义主题：

```rust
pub struct PreviewRequest { pub content, pub theme: Option<String>, pub custom_theme: Option<Value> }
```

`theme == "custom"` 时用请求里的 `custom_theme` 即时渲染。

## 8. 12 个内置主题

| ID | 名称 | 外观 | 布局 | 特征 |
|----|------|------|------|------|
| `default` | JType Default | light | sidebar | 绿色科技、Inter、圆角卡片（保持原样） |
| `academic` | Academic | light | header | 衬线（Georgia）、窄正文、顶部导航 |
| `terminal` | Terminal | dark | sidebar | 等宽、#0d1117、绿字、方角、扫描线 |
| `paper` | Paper | light | minimal | 极简白、serif 标题、超窄正文、大量留白 |
| `tokyo` | Tokyo Night | dark | sidebar | 深蓝 #1a1b26、柔紫蓝 |
| `dracula` | Dracula | dark | sidebar | #282a36、粉紫强调 |
| `nord` | Nord | dark | sidebar | #2e3440、冰蓝 #88c0d0 |
| `solarized` | Solarized | light | header | #fdf6e3、青/橙强调 |
| `forest` | Forest | light | sidebar | 暖绿大地色、serif 标题 |
| `sepia` | Sepia | light | minimal | 暖褐阅读色、serif、护眼 |
| `newsprint` | Newsprint | light | header | 黑白高对比、editorial serif、栏线 |
| `midnight` | Midnight | dark | sidebar | 纯黑灰、蓝色强调、现代 |

新增主题只需在 `presets.rs` 增加一个 `ThemeSpec` 构造并登记到 registry —— 无需改 DB / 路由 / 渲染器。

## 9. 前端（web）

`services/jtype-web/frontend/`：在 workspace 设置对话框新增「站点 / Site」标签页：

- **主题选择器**：卡片网格，每张卡用 `swatch` 颜色画迷你预览 + 名称 + 描述；选中即 `PUT /site`。
- **自定义主题编辑器**：选「Custom」后展开表单——布局下拉、颜色选择器（bg/fg/accent/surface/border/code）、
  字体预设下拉、圆角/正文宽度/字号滑块、自定义 CSS textarea；「从预设派生」按钮拉取 `GET /api/themes/:id` 填充。
- **实时预览**：表单变化时 `POST /preview`（带 `customTheme`）渲染到 iframe。
- **站点设置**：站点名、footer HTML。

API client（`api.ts`）增加 `listThemes / getTheme / getSiteSettings / updateSiteSettings / previewContent`。

## 10. 验收

1. `cargo test --lib`：spec 净化 / 夹紧 / 颜色校验 / `from_custom_json` 的单元测试。
2. `cargo test --test publish_tests`：保留旧断言（≥5 主题、5 个已知 ID、preview）+ 新增
   自定义主题保存/读取/预览、`GET /api/themes/:id`、12 主题计数。
3. 实际渲染抽查：对每个内置主题 `POST /preview` 确认产出包含其调色板关键色且无 panic。
4. 前端构建通过；主题选择器 + 自定义编辑器在浏览器预览中可用（截图）。
