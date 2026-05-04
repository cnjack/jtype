# JType Vault + Cloud 竞品分析

日期：2026-05-02

## 1. 结论

JType 不应该继续做“选择 workspace 的 Markdown 工具”。更清晰的定位是：

> Local-first Markdown vault + self-hostable publishing cloud + OAuth device login + per-user website control.

这让 JType 和竞品形成差异：

- 对 Obsidian：学习 vault、local-first、remote vault、版本历史，但 JType 要把 Web 发布和管理后台做成一等能力。
- 对 Notion：学习 Web 站点配置、个人设置、custom domain、主题，但 JType 保留 Markdown 文件所有权和本地 vault。
- 对 GitBook/Docusaurus：学习 docs publishing、domain、SSL、静态输出，但 JType 不要求用户懂 Git 或 CI。
- 对 Outline：学习 self-hosted、管理员、用户和权限管理，但 JType 不做纯团队 wiki，而是个人/小团队的 Markdown 发布系统。
- 对 MWeb：学习编辑器体验、Library/External Folder 两种心智，但 JType 不继续暴露 workspace 选择，而是固定为 vault-first。

## 2. 竞品观察

### 2.1 Obsidian

公开资料显示，Obsidian 使用 vault 作为文件系统目录；Sync 里区分 local vault 和 remote vault，remote vault 是集中存储，多个本地设备连接到它。Obsidian Sync 还支持 selective sync、storage usage、版本历史、冲突处理、离线可用等能力。

对 JType 的启发：

- Vault 是比 workspace 更清楚的产品语言。
- 本地 vault 必须永远可用，登录失败、离线、服务器不可达时不能影响编辑。
- 云端同步应该以 remote vault 为概念，不是“上传一些文件”。
- Sync 设置必须有 storage usage 和 volume budget，否则用户无法理解云端成本。
- 版本历史应是 vault 的核心，不是发布历史的副产品。

JType 的差异机会：

- Obsidian 的发布是额外服务，JType 可以从第一天把“文档网站 + 管理后台 + custom domain”做成核心。
- Obsidian 偏插件生态，JType 可以偏“开箱即用的发布系统”。

### 2.2 MWeb

MWeb 明确分为 Library mode 和 External Folder mode。Library mode 首次使用会设置文档存储位置；External Folder mode 则偏纯 Markdown 编辑。MWeb 的编辑器支持 edit/preview、split、outline、快捷键、表格编辑、LaTeX、Mermaid 等写作辅助。

对 JType 的启发：

- 首次设置文档存储位置是合理的，用户不应该每次“选择 workspace”。
- 单文件或外部文件编辑应和 vault 管理区分，不要混入 sync/publish/用户管理。
- 编辑器体验需要围绕快捷键、右键、表格、公式、图表，而不是堆顶部按钮。

JType 的差异机会：

- MWeb 偏本地写作和多平台原生体验，JType 可以偏“本地写作 + 自部署云端网站”。
- JType 可以把 OAuth、admin、budget、domain、SSL 作为完整服务能力。

### 2.3 Notion

Notion Sites 支持站点定制、favicon、导航、分享预览、标题描述、主题，以及 custom domain。Notion 的 custom domain 是 Web 产品里的设置项，需要 DNS 验证。

对 JType 的启发：

- Web 端应该有完整的个人设置，而不是只渲染公开文档。
- 用户应该能配置站点 title、theme、domain、favicon、导航。
- custom domain 是 Web 设置，不应该放在 desktop。

JType 的差异机会：

- Notion 是云优先、闭源存储；JType 应该是 Markdown 文件优先、服务可自部署。
- Notion custom domain 依赖其付费计划；JType 自部署场景应允许管理员自己设 budget 和域名策略。

### 2.4 GitBook

GitBook 的核心是发布文档站点，支持 custom domain、site structure、site settings、analytics、authenticated access、SSO/SAML、LLM-ready docs 等。

对 JType 的启发：

- 文档发布产品的 Web 后台需要覆盖：域名、认证访问、站点结构、分析、成员/组织管理。
- custom domain 流程应该包含 DNS 指引、验证状态、SSL 状态。

JType 的差异机会：

- GitBook 更偏团队文档和 SaaS，JType 可以提供轻量 self-hosted + desktop sync。
- JType 的 desktop vault 可以成为 GitBook 类产品缺失的本地写作入口。

### 2.5 Outline

Outline 提供 cloud hosted 和 self-hosted，强调团队知识库、Markdown 支持、实时协作、搜索、公开分享、权限、用户组、品牌颜色和 custom domain。

对 JType 的启发：

- 自部署不能只是“服务能跑起来”，还要有 admin UI。
- 第一个用户成为管理员是自部署产品常见且合理的 bootstrap 方式。
- Header 中应根据权限显示 Admin 入口。

JType 的差异机会：

- Outline 是 Web-first wiki；JType 是 Desktop-first vault + Web publishing。
- JType 可以降低 self-host 的认证复杂度：Web 负责登录，desktop 只走 OAuth。

### 2.6 Docusaurus

Docusaurus 负责把内容构建成静态站点，输出 build 目录，由用户选择 Vercel、Netlify、GitHub Pages、自托管等方式部署。

对 JType 的启发：

- 发布 pipeline 最好可以输出纯静态产物，降低托管成本。
- Web 服务也应该支持动态渲染与静态导出两种模式。

JType 的差异机会：

- Docusaurus 面向工程师，JType 应该让非工程用户不接触 Git/CI，也能发布。

## 3. JType 产品定位

### 3.1 目标用户

- 想保留 Markdown 文件所有权，但希望有 Notion/GitBook 式发布能力的个人用户。
- 想自部署文档服务的小团队。
- 想用桌面编辑、Web 管理和发布的内容创作者。
- 后期需要 AI 处理本地知识库，但不想把所有数据锁在 SaaS 里的用户。

### 3.2 非目标用户

- 只需要一个轻量单文件 Markdown viewer 的用户。
- 只需要企业级实时多人编辑的团队。
- 只想用纯 Git/CI 管理文档站点的工程团队。

## 4. 差异化原则

### 4.1 Desktop 不做账户系统

Desktop 不出现登录注册表单。它只做：

- Vault 初始化。
- 打开 OAuth 登录页面。
- 接收 OAuth callback。
- 保存 device token。
- 同步 vault。

### 4.2 Web 是身份和管理中心

Web 负责：

- Landing page。
- 登录注册。
- OAuth 授权。
- 用户个人设置。
- 管理后台。
- 站点发布和 custom domain。
- 证书上传和 SSL 状态。

### 4.3 Vault 是唯一内容根

不再让用户“选择 workspace”。首次启动设置 vault：

- 默认：`~/Documents/.jtype`
- 可改：用户选择本机任意目录。
- 后续启动直接进入 vault。
- 需要更换 vault 时走 Settings，而不是主界面的 Open Workspace。

### 4.4 云端是可替换服务

用户可以选择服务地址：

- 默认：`http://localhost:13345`
- 自部署：用户填写自己的 JType Web 服务地址。
- 后期 SaaS：可预置官方服务地址。

## 5. Sources

- Obsidian Sync settings and selective sync: https://obsidian.md/help/sync/settings
- Obsidian local and remote vaults: https://obsidian.md/help/Obsidian%2BSync/Local%2Band%2Bremote%2Bvaults
- MWeb basic usage: https://www.mweb.im/en-mweb-start
- MWeb editor introduction: https://www.mweb.im/en-mweb-editor
- Notion custom domain: https://www.notion.com/en-gb/help/connect-a-custom-domain-with-notion-sites
- Notion Sites customization: https://www.notion.com/help/edit-and-customize-your-notion-sites
- GitBook custom domain: https://gitbook.com/docs/publishing-documentation/custom-domain
- Outline product page: https://www.getoutline.com/
- Docusaurus deployment: https://www.docusaurus.io/docs/next/deployment
