# JType 多语言（i18n）支持 技术设计文档

状态：提案  
初始日期：2026-05-14

## 1. 背景与目标

JType 目前所有用户可见文本均硬编码在 JSX 中（英文），无国际化支持。为服务更广泛用户群体，需要为 Desktop App 和 Web 两端添加多语言支持。

### 1.1 支持语言

| 语言 | Locale Code | 优先级 |
|------|-------------|--------|
| English | `en` | 默认语言 |
| 简体中文 | `zh` | P0 |
| 日本語 | `ja` | P0 |
| 한국어 | `ko` | P0 |

### 1.2 设计原则

1. **共享优先**：翻译基础设施和共享组件的消息目录放在 `shared/` 层，Desktop 和 Web 复用。
2. **编译时提取**：利用 Lingui 的编译时消息提取，零运行时开销。
3. **类型安全**：所有消息 ID 有编译时检查，避免遗漏翻译。
4. **按需加载**：非默认语言的消息目录动态 `import()`，不增加默认 bundle 体积。
5. **体验一致**：Desktop 与 Web 的语言切换交互保持一致。

## 2. 技术选型：Lingui

### 2.1 为什么选 Lingui

| 对比维度 | Lingui | react-i18next |
|----------|--------|---------------|
| 消息提取 | 编译时自动提取（Vite 插件） | 手动维护 JSON |
| Bundle 大小 | ~3KB runtime | ~25KB |
| ICU MessageFormat | 原生支持 | 需额外包 |
| Vite 集成 | `@lingui/vite-plugin` 官方支持 | 社区方案 |
| 类型安全 | 编译时 catalog 类型生成 | 弱 |
| 复数/性别/日期 | 内置 ICU | 部分支持 |
| Monorepo/共享层 | 支持多 catalog 合并 | 需手动配置 |

### 2.2 核心依赖

```
# 两端共用
@lingui/core          # 核心运行时
@lingui/react         # React 绑定 (<Trans>, useLingui)
@lingui/macro         # 编译时宏 (t``, <Trans>, plural, select)

# 开发时
@lingui/cli           # 消息提取 & 编译
@lingui/vite-plugin   # Vite 构建集成
@lingui/babel-plugin-lingui-macro  # Babel macro 转换
```

## 3. 架构设计

### 3.1 目录结构

```
shared/
├── i18n/
│   ├── index.ts              # setupI18n(), activateLocale(), SUPPORTED_LOCALES
│   ├── locales/
│   │   ├── en/
│   │   │   └── messages.po   # 英文（源语言，自动提取）
│   │   ├── zh/
│   │   │   └── messages.po   # 中文翻译
│   │   ├── ja/
│   │   │   └── messages.po   # 日文翻译
│   │   └── ko/
│   │       └── messages.po   # 韩文翻译
│   └── lingui.config.ts      # Lingui 配置（共享 catalog）
├── components/
│   ├── LanguageSwitcher.tsx   # 共享语言切换组件
│   └── ...existing...
├── lib/
│   └── ...existing...
└── styles/
    └── ...existing...

src/                           # Desktop app
├── i18n/
│   ├── setup.ts              # Desktop i18n 初始化 + locale 持久化 (localStorage)
│   └── locales/              # Desktop 专有翻译 (Tauri 相关文案)
│       ├── en/messages.po
│       ├── zh/messages.po
│       ├── ja/messages.po
│       └── ko/messages.po

services/jtype-web/frontend/src/
├── i18n/
│   ├── setup.ts              # Web i18n 初始化 + locale 持久化
│   └── locales/              # Web 专有翻译 (路由/管理/登录等)
│       ├── en/messages.po
│       ├── zh/messages.po
│       ├── ja/messages.po
│       └── ko/messages.po
```

### 3.2 Catalog 分层策略

```
┌─────────────────────────────────────────────┐
│            Platform-specific Catalog         │
│  (src/i18n/locales or web/src/i18n/locales) │
│  Desktop: vault ops, Tauri dialogs          │
│  Web: login, admin, workspace management    │
└──────────────────────┬──────────────────────┘
                       │ merge (runtime)
┌──────────────────────▼──────────────────────┐
│           Shared Catalog                     │
│  (shared/i18n/locales)                       │
│  Editor toolbar, dialogs, file tree,         │
│  common actions, status messages             │
└─────────────────────────────────────────────┘
```

运行时通过 `i18n.load(locale, { ...sharedMessages, ...platformMessages })` 合并。

### 3.3 Vite 构建集成

**lingui.config.ts**（根目录，供 CLI 使用）：

```ts
import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
  locales: ["en", "zh", "ja", "ko"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "shared/i18n/locales/{locale}/messages",
      include: ["shared/"],
    },
    {
      path: "src/i18n/locales/{locale}/messages",
      include: ["src/"],
      exclude: ["src/main.ts"], // 排除 legacy vanilla JS
    },
  ],
  format: "po",
};

export default config;
```

Web 端额外配置：

```ts
// services/jtype-web/frontend/lingui.config.ts
const config: LinguiConfig = {
  locales: ["en", "zh", "ja", "ko"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "shared/i18n/locales/{locale}/messages",
      include: ["../../../shared/"],
    },
    {
      path: "src/i18n/locales/{locale}/messages",
      include: ["src/"],
    },
  ],
  format: "po",
};
```

**Vite 插件配置**（两端）：

```ts
// vite.config.ts
import { lingui } from "@lingui/vite-plugin";

export default defineConfig({
  plugins: [
    react({ babel: { plugins: ["@lingui/babel-plugin-lingui-macro"] } }),
    lingui(),
    // ...existing plugins
  ],
});
```

### 3.4 Runtime 初始化

```ts
// shared/i18n/index.ts
import { i18n } from "@lingui/core";

export const SUPPORTED_LOCALES = ["en", "zh", "ja", "ko"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  zh: "简体中文",
  ja: "日本語",
  ko: "한국어",
};

export async function activateLocale(locale: SupportedLocale) {
  const { messages } = await import(`./locales/${locale}/messages.ts`);
  i18n.load(locale, messages);
  i18n.activate(locale);
}

export function getDefaultLocale(): SupportedLocale {
  // 1. 检查 localStorage 持久化
  const stored = localStorage.getItem("jtype-locale");
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale;
  }
  // 2. 检查浏览器语言
  const browserLang = navigator.language.split("-")[0];
  if (SUPPORTED_LOCALES.includes(browserLang as SupportedLocale)) {
    return browserLang as SupportedLocale;
  }
  // 3. 默认英文
  return "en";
}

export { i18n };
```

### 3.5 React Provider 集成

```tsx
// Desktop: src/main.tsx
import { I18nProvider } from "@lingui/react";
import { i18n, activateLocale, getDefaultLocale } from "@shared/i18n";

// 在 app mount 前激活
await activateLocale(getDefaultLocale());

root.render(
  <I18nProvider i18n={i18n}>
    <App />
  </I18nProvider>
);
```

```tsx
// Web: services/jtype-web/frontend/src/main.tsx (类似)
import { I18nProvider } from "@lingui/react";
import { i18n, activateLocale, getDefaultLocale } from "@shared/i18n";

await activateLocale(getDefaultLocale());

root.render(
  <I18nProvider i18n={i18n}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </I18nProvider>
);
```

## 4. UI 交互设计

### 4.1 语言切换入口位置

**方案对比：**

| 方案 | 位置 | 优势 | 劣势 |
|------|------|------|------|
| A. 头像右侧 | Header 最右 | 随时可见，切换便利 | 增加 Header 视觉密度 |
| B. 头像菜单内 | MenuItems 中 | 不占额外空间，符合 Settings 归类 | 需两次点击 |
| C. 侧边栏底部 | Sidebar 固定底部 | Desktop 适用 | Web 无侧边栏时不适用 |
| D. Settings 内 | 设置弹窗 | 低频操作合理归类 | 发现性差，新用户找不到 |

**推荐方案：B（头像菜单内）+ 首次引导**

理由：
1. 语言切换属于低频设置操作（用户设置一次后很少再改），不值得占用 Header 常驻空间。
2. 放在头像菜单中与 "Profile"、"Settings" 等账户设置类操作归为一组，符合用户心智模型。
3. Desktop 和 Web 都有头像菜单，体验一致。
4. 可在菜单项中直接展示当前语言标识（如国旗 emoji 或语言缩写），提供视觉线索。

### 4.2 具体交互流程

```
┌─────────────────────────────────────────────┐
│  Header                      [🔍] [☁] [JW] │
│                                      ↑      │
│                              Avatar MenuButton
└──────────────────────────────────────│──────┘
                                       ▼
                         ┌──────────────────────┐
                         │  Jack Wang           │
                         │  admin               │
                         ├──────────────────────┤
                         │  👤 Profile          │
                         │  ☁️ Cloud workspace   │
                         │  🌐 Language › En    │ ← 语言切换项（展示当前语言）
                         ├──────────────────────┤
                         │  🚪 Log out          │
                         └──────────┬───────────┘
                                    │ click "Language"
                                    ▼
                         ┌──────────────────────┐
                         │  ← Language          │
                         ├──────────────────────┤
                         │  ○ English        ✓  │ ← 当前选中
                         │  ○ 简体中文          │
                         │  ○ 日本語            │
                         │  ○ 한국어            │
                         └──────────────────────┘
```

### 4.3 LanguageSwitcher 共享组件

```tsx
// shared/components/LanguageSwitcher.tsx
interface LanguageSwitcherProps {
  currentLocale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
  /** 渲染模式：inline = 直接列表, menu-item = 作为菜单子级 */
  variant: "inline" | "menu-item";
}
```

**两种渲染变体：**

1. **`menu-item`**（默认）：作为头像菜单的一个 `MenuItem`，点击后展开子面板或替换菜单内容显示语言列表。
2. **`inline`**：独立的语言选择列表，可用于 Settings 页面或欢迎页面。

### 4.4 Desktop 特殊场景

| 场景 | 处理方式 |
|------|----------|
| 空模式（Welcome Screen） | 欢迎页底部右下角显示语言选择链接 |
| 单文件模式（无头像菜单） | Header 右侧显示小型语言切换图标 |
| Vault 模式 | 头像菜单内标准入口 |

### 4.5 Web 特殊场景

| 场景 | 处理方式 |
|------|----------|
| 登录页（未登录） | 页面右上角显示独立语言切换按钮 |
| 已登录 | 头像菜单内标准入口 |
| Public site（发布页） | 页面底部 footer 显示语言选择 |

## 5. 消息管理工作流

### 5.1 开发流程

```
1. 开发者在 JSX 中使用宏：
   import { t, Trans } from "@lingui/macro";
   <button title={t`Quick open`}>...</button>
   <Trans>Cloud workspace</Trans>

2. 运行提取命令：
   $ npm run i18n:extract
   → 自动扫描源码，更新 .po 文件中的 msgid

3. 翻译者翻译 .po 文件（或接入翻译平台如 Crowdin/Lokalise）

4. 编译消息：
   $ npm run i18n:compile
   → 生成优化后的 messages.ts（tree-shakable）

5. 构建时 Vite 插件自动处理 macro → runtime 转换
```

### 5.2 NPM Scripts

```json
{
  "scripts": {
    "i18n:extract": "lingui extract",
    "i18n:extract:web": "lingui extract --config services/jtype-web/frontend/lingui.config.ts",
    "i18n:compile": "lingui compile",
    "i18n:compile:web": "lingui compile --config services/jtype-web/frontend/lingui.config.ts"
  }
}
```

### 5.3 翻译文件格式（PO）

```po
# shared/i18n/locales/zh/messages.po
msgid "Quick open"
msgstr "快速打开"

msgid "Cloud workspace"
msgstr "云工作区"

msgid "Unsaved"
msgstr "未保存"

msgid "Sign in"
msgstr "登录"

msgid "Log out"
msgstr "退出登录"

msgid "{count, plural, one {# document} other {# documents}}"
msgstr "{count, plural, other {# 个文档}}"
```

## 6. Locale 持久化策略

| 平台 | 存储位置 | Key | 备注 |
|------|----------|-----|------|
| Desktop | `localStorage` | `jtype-locale` | Tauri WebView 本地存储 |
| Web | `localStorage` | `jtype-locale` | 浏览器本地存储 |
| Cloud（未来） | 用户 profile | `preferred_locale` | 跨设备同步 |

切换语言时：
1. 写入 `localStorage`
2. 调用 `activateLocale(newLocale)`
3. UI 通过 `I18nProvider` 自动 re-render（无需页面刷新）

## 7. 渐进式迁移策略

### Phase 1: 基础设施搭建
- 安装 Lingui 依赖
- 创建 `shared/i18n/` 目录结构
- 配置 Vite 插件
- 添加 `I18nProvider` 到两端入口
- 实现 `LanguageSwitcher` 组件

### Phase 2: 共享组件翻译
- 翻译 `shared/components/` 中所有硬编码文本
- EditorToolbar, ConfirmDialog, PromptDialog, FileTreeNode, StatusChip 等

### Phase 3: Desktop 专有翻译
- Header, Sidebar, AccountDialog, WelcomeScreen
- Vault 操作文案（新建/重命名/删除确认等）
- 同步状态消息

### Phase 4: Web 专有翻译
- Layout, Login, Workspace, Admin
- 设置面板、成员管理、域名配置等

### Phase 5: 完善 & 上线
- 校对所有语言翻译
- 添加首次访问语言检测引导
- 接入翻译管理平台（可选）
- 发布

## 8. 需要翻译的文本盘点

### 8.1 Desktop Header (`src/components/layout/Header.tsx`)
- "Back to home", "Cloud workspace: ...", "Local vault mode"
- "Quick open", "Open file", "Unsaved"
- "Profile", "Cloud workspace", "Log out", "Sign in"

### 8.2 Desktop Sidebar (`src/components/sidebar/Sidebar.tsx`)
- "No vault", "documents", "Open another vault"
- "Choose a local folder", "Settings", "Close vault", "New Document"

### 8.3 Web Layout (`services/jtype-web/frontend/src/components/Layout.tsx`)
- "Settings", "Admin", "Sign out"

### 8.4 Shared Components
- EditorToolbar: "Bold", "Italic", "Link", "Code", "List", etc.
- ConfirmDialog: "Confirm", "Cancel"
- PromptDialog: "OK", "Cancel"
- StatusChip: "draft", "published"
- FileTreeNode: context menu items

### 8.5 估算

| 范围 | 预估 msgid 数 |
|------|--------------|
| Shared components | ~40 |
| Desktop 专有 | ~80 |
| Web 专有 | ~60 |
| **总计** | **~180** |

## 9. 技术注意事项

### 9.1 日期/数字格式
- 使用 `Intl.DateTimeFormat` 和 `Intl.NumberFormat`，由 locale 自动决定格式。
- 不需要额外的格式化库。

### 9.2 RTL 支持
- 当前四种语言均为 LTR，暂不需要 RTL 布局支持。
- 如未来添加阿拉伯语/希伯来语，需额外 CSS `dir="rtl"` 支持。

### 9.3 字体兼容
- CJK 字符需确认系统字体栈覆盖。
- 当前使用系统字体栈（`-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`），CJK 字符在各平台均有系统字体覆盖，无需额外字体文件。

### 9.4 文本长度变化
- 德语/法语翻译可能比英语长 30%+，但当前四种语言中：
  - 中文/日文/韩文通常比英文短（字符更紧凑）。
  - 不太需要担心 UI 布局溢出，但仍应使用 `truncate` / `min-w-0` 防御。

### 9.5 SEO（Web 端）
- Public site 页面添加 `<html lang="xx">` 属性。
- 考虑 URL 中是否需要 locale 前缀（如 `/ja/u/username`）—— 建议首期不加，通过 `Accept-Language` 和 localStorage 决定。

## 10. 开放问题

1. **翻译管理平台**：是否接入 Crowdin/Lokalise/Weblate 进行协作翻译？还是初期手动维护 .po 文件？
2. **Cloud sync locale**：用户 locale 偏好是否同步到云端 profile？跨设备切换时自动应用？
3. **文档内容语言 vs UI 语言**：用户写作语言和 UI 语言独立——UI 切到日文但文档仍是中文，这是期望行为，但是否需要文档语言标记功能（frontmatter `lang` 字段）？
4. **Public site 多语言**：发布的站点是否支持多语言版本？还是仅 UI chrome 翻译？
