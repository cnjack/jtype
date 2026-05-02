# JType Vault + Cloud PRD

日期：2026-05-02

## 1. 背景

当前 JType 已经具备 Markdown 编辑、预览、本地文件、workspace、静态导出、Web sync、用户登录、发布站点等原型能力。但产品心智仍然混乱：

- Desktop 同时承担文件选择、workspace 管理、登录注册、同步入口。
- Workspace 概念弱于 Obsidian 式 vault。
- 登录注册放在 desktop 里，不利于 OAuth、自部署、多端扩展。
- Web 目前更像发布结果页，不像完整的云端服务。

因为产品尚未 release，不需要兼容旧 workspace 行为。本 PRD 定义一次方向重构：JType 从 workspace-first 改为 vault-first，Desktop 只管本地 vault 和 OAuth，Web 负责身份、管理、发布和站点设置。

## 2. 产品目标

### 2.1 北极星目标

用户第一次打开 JType 后，可以在 3 分钟内完成：

1. 创建或确认本地 vault。
2. 选择一个 JType Web 服务地址，默认 `http://localhost:13345`。
3. 通过浏览器登录或注册。
4. 回到 desktop。
5. 开始写 Markdown。
6. 同步并在个人网站看到内容。

### 2.2 阶段目标

MVP 目标：

- Desktop 不再出现登录注册表单。
- Desktop 不再让用户每次选择 workspace。
- Desktop 首次启动进入 vault setup。
- 默认 vault 路径为 `~/Documents/.jtype`。
- Web 提供 landing page、登录注册、OAuth、个人设置、后台管理。
- 第一个注册用户自动成为管理员。
- Admin 可管理用户和用户 cloud volume budget。
- 用户可管理自己的站点 title、custom domain、证书、online 文档和主题占位。

## 3. 产品原则

- Local-first：Markdown 文件在本地 vault 中可直接访问。
- Web-owned identity：账号、密码、OAuth、session 都只存在 Web。
- Desktop as device client：desktop 是已授权设备，不是账号系统。
- Self-hostable by default：默认服务地址为 localhost，允许用户填自部署地址。
- Vault is the product boundary：同步、版本、发布、预算都围绕 vault。
- No backward compatibility：未 release 阶段允许删除旧 workspace 交互和旧 API。

## 4. 核心概念

### 4.1 Vault

Vault 是用户的本地 Markdown 内容根目录。

默认路径：

```text
~/Documents/.jtype
```

Windows 示例：

```text
C:\Users\<user>\Documents\.jtype
```

Vault 内建议结构：

```text
.jtype/
  inbox/
  notes/
  published/
  assets/
  .jtype-meta/
    vault.json
    index.sqlite
    versions/
```

说明：

- 用户内容位于 vault 根目录下。
- `.jtype-meta` 是 JType 内部元数据，不参与普通发布。
- 后期如果要更贴近 Obsidian，可允许 `.jtype-meta` 改名，但 MVP 固定即可。

### 4.2 Remote Vault

Remote Vault 是 Web 服务中的云端 vault。

它负责：

- 保存文档当前版本。
- 保存文档版本历史。
- 保存附件对象。
- 记录 sync manifest。
- 执行 budget 检查。
- 为发布站点提供内容来源。

### 4.3 Cloud Volume Budget

Cloud volume budget 是管理员给用户或 vault 设置的云端存储额度。

预算包含：

- Markdown 内容版本。
- 附件对象。
- 发布资源。
- 版本历史对象。

预算不包含：

- 本地 vault 文件。
- 可重建的本地索引。
- Web session/token 元数据。

默认策略：

- 自部署默认每个用户 1 GB。
- 管理员可设置全局默认值。
- 管理员可为单个用户覆盖。
- 用户个人设置中显示已用量和剩余额度。

### 4.4 Version Control

Vault 版本控制不是 Git UI，而是 JType 内建的版本历史。

MVP 支持：

- 每次成功 sync 产生 remote version。
- 每个文档保存最新 N 个版本，N 由服务配置控制。
- 用户可在 Web 端查看文档版本列表。
- 用户可恢复某个文档版本。

后期支持：

- 本地细粒度快照。
- Git-compatible export。
- Vault restore point。
- 分支或草稿预览。

## 5. 用户角色

### 5.1 Anonymous Visitor

- 访问 landing page。
- 访问公开发布站点。
- 不能进入 dashboard。

### 5.2 User

- 登录 Web。
- 通过 OAuth 连接 desktop。
- 管理个人设置。
- 管理自己的 online 文档。
- 管理自己的站点 title、theme、domain、certificate。
- 查看自己的 budget 使用情况。

### 5.3 Admin

第一个注册用户自动成为 Admin。

Admin 可：

- 进入 admin 后台。
- 查看用户列表。
- 禁用/启用用户。
- 设置用户 cloud volume budget。
- 查看全局存储使用情况。
- 查看 custom domain 和证书状态。
- 管理站点配置策略。

## 6. Desktop PRD

### 6.1 首次启动

首次启动不显示编辑器主界面，而是显示 welcome/setup：

内容：

- JType 标识。
- 服务地址输入框，默认 `http://localhost:13345`。
- Vault 路径显示，默认 `~/Documents/.jtype`。
- `Use default vault`。
- `Choose another vault folder`。
- `Continue without cloud`。
- `Sign in with browser`。

行为：

- 如果默认 vault 不存在，点击继续时创建。
- 如果服务地址不可达，提示用户可以继续本地模式，或修改服务地址。
- 点击登录时打开系统浏览器访问 Web OAuth authorize URL。

### 6.2 日常启动

如果已有 vault：

- 直接打开 vault。
- 不显示 Open Workspace。
- 顶部显示 vault 名称和同步状态。
- 如果已有 token，后台尝试刷新 token。
- 如果 token 无效，显示 `Connect cloud`，点击走 OAuth。

### 6.3 Desktop 顶部按钮状态

Vault 未设置：

- 显示 `Set up vault`。
- 显示 `Connect cloud`。
- 不显示 Save、Publish、Sync。

Vault 已设置、本地模式：

- 显示 Search。
- 显示 New。
- 显示 Save，在当前文档 dirty 时启用。
- 显示 Connect cloud。
- 不显示 Login/Register。

Vault 已设置、已连接云端：

- 显示 Search。
- 显示 New。
- 显示 Save。
- 显示 Sync。
- 显示 Site 或 Open Web。
- 右上角显示用户头像或 username。

单独打开外部 Markdown 文件：

- 进入 pure editor mode。
- 显示 Save。
- 显示 Write/Split/Preview。
- 不显示 Sync、Publish、Account、Vault Sidebar。

### 6.4 OAuth 登录流程

Desktop 点击 `Connect cloud`：

1. Desktop 生成 PKCE verifier/challenge。
2. Desktop 打开浏览器：

```text
{server}/oauth/authorize?client_id=jtype-desktop&redirect_uri=jtype://oauth/callback&code_challenge=...
```

3. 用户在 Web 登录或注册。
4. Web 授权后跳回 desktop callback。
5. Desktop 用 code + verifier 换 access token/refresh token。
6. Desktop 保存 token 到 OS secret store。
7. Desktop 显示连接状态。

### 6.5 Vault Sync

Desktop sync 入口：

- 手动 `Sync now`。
- 保存后可 debounce 自动 sync。
- 离线时进入 queue。

Sync 必须显示：

- Last sync time。
- Pending changes。
- Used volume / budget。
- Conflict count。

### 6.6 Vault Version Control

Desktop MVP：

- 保存时记录本地 dirty/saved。
- Sync 成功后展示 remote version ID。
- 当前文档可打开 `Version history`，跳转 Web 对应页面。

Desktop 不在 MVP 里做复杂版本 UI。

## 7. Web PRD

### 7.1 Landing Page

路径：

```text
GET /
```

目标：

- 解释 JType 是 local-first Markdown vault + self-hosted cloud。
- 提供 Login/Register。
- 提供 Download Desktop。
- 提供 Docs。
- 已登录用户 header 显示 Dashboard。
- Admin 用户 header 显示 Admin。

主要模块：

- Hero：Write locally. Publish from your own cloud.
- Value props：Vault、OAuth desktop、Custom domain、Self-hosted。
- Product preview：Desktop vault + Web dashboard。
- Self-host callout：默认 localhost:13345。

### 7.2 Auth

Web 提供：

- Register。
- Login。
- Logout。
- OAuth authorize。
- OAuth token。
- OAuth revoke。

规则：

- 第一个注册用户自动设为 `admin`。
- 后续用户默认 `user`。
- 如果实例设置为 invite-only，后续注册需要 admin 邀请。

### 7.3 Dashboard

路径：

```text
GET /dashboard
```

展示：

- 用户 vault 列表。
- 最近同步状态。
- Cloud volume usage。
- Published site URL。
- Custom domain 状态。
- Online documents。

### 7.4 Online Documents

用户可：

- 查看云端文档列表。
- 搜索文档。
- 查看发布状态。
- 查看版本历史。
- 恢复版本。
- 设置文档是否公开。
- 删除远端文档。

Web MVP 不需要富文本编辑，避免和 desktop 编辑器重复。

### 7.5 Personal Settings

路径：

```text
GET /settings
```

设置项：

- Profile：username、display name、email。
- Site：title、description、favicon、theme。
- Domain：custom domain、DNS verification。
- SSL：上传证书和私钥。
- Devices：已连接 desktop device。
- Storage：budget usage。

### 7.6 Custom Domain + SSL

用户可添加 custom domain。

流程：

1. 输入 domain，例如 `docs.example.com`。
2. Web 生成 DNS TXT verification token。
3. 用户完成 DNS 配置。
4. Web 验证 domain ownership。
5. 用户上传 certificate 和 private key，或后期使用 ACME 自动签发。
6. Web 校验证书域名匹配和过期时间。
7. Web 启用 domain routing。

MVP 要求：

- 支持上传 PEM certificate chain。
- 支持上传 PEM private key。
- 私钥加密存储。
- 显示证书到期时间。
- 显示 SSL 状态：pending / valid / expiring / invalid。

### 7.7 Admin

路径：

```text
GET /admin
```

Header 规则：

- 只有 Admin 用户看到 Admin 入口。

Admin MVP：

- 用户列表。
- 用户详情。
- 启用/禁用用户。
- 设置用户 storage budget。
- 查看用户已用 storage。
- 查看 remote vault 列表。
- 查看 custom domain 状态。
- 查看实例配置。

## 8. 发布 PRD

每个用户有一个默认网站：

```text
/@{username}
```

用户可以绑定 custom domain：

```text
https://docs.example.com
```

发布来源：

- Remote vault 中标记为 published 的文档。
- 默认不发布 draft。

站点设置：

- title。
- description。
- theme。
- navigation mode。
- custom domain。
- SSL certificate。

## 9. 关键用户故事

### 9.1 首次自部署用户

作为自部署用户，我启动 Web 服务后，希望第一个注册账户自动成为管理员，这样我不需要手动改数据库。

验收：

- 空用户表时，第一个注册用户 role = admin。
- Header 显示 Admin。
- 第二个注册用户 role = user。

### 9.2 Desktop 用户登录

作为 desktop 用户，我希望点击 Connect cloud 后在浏览器登录，而不是在 desktop 填密码。

验收：

- Desktop 不出现 password input。
- 点击后打开 Web OAuth。
- 登录成功回到 desktop。
- Desktop 显示 username 和 sync 状态。

### 9.3 Vault 用户

作为用户，我希望第一次启动时默认创建 `~/Documents/.jtype`，这样不用理解 workspace。

验收：

- 首次启动显示 vault setup。
- 默认路径正确。
- 点击 continue 创建目录。
- 后续启动直接进入 vault。

### 9.4 Admin 管理 budget

作为管理员，我希望设置用户云端空间上限，避免自部署服务被单个用户占满。

验收：

- Admin 可以设置用户 budget。
- 用户 sync 超限时返回明确错误。
- Desktop 显示 budget exceeded。

### 9.5 用户绑定 custom domain

作为用户，我希望把公开文档绑定到自己的域名，并上传证书启用 HTTPS。

验收：

- 用户可输入 domain。
- Web 给出 DNS verification token。
- 验证通过后允许上传 certificate/private key。
- 证书有效后 domain 可访问用户站点。

## 10. 非目标

MVP 不做：

- 多人实时协作编辑。
- Web 富文本编辑器。
- AI 功能。
- Git provider OAuth。
- 自动 ACME 签证书。
- 复杂主题市场。
- 旧 workspace 数据迁移。

## 11. 成功指标

产品指标：

- 首次 vault setup 完成率 > 80%。
- OAuth 连接成功率 > 90%。
- 第一次 sync 成功率 > 90%。
- 用户能在 3 分钟内完成 first publish。

技术指标：

- 1,000 个 Markdown 文件 vault 初次索引 < 5 秒可进入编辑。
- 普通 sync 增量上传 < 2 秒。
- Web landing 首屏响应 < 300ms 本地部署环境。
- Admin 用户列表 10,000 用户内分页响应 < 500ms。

## 12. Open Questions

- 自部署默认是否允许 public registration，还是默认第一个 admin 后关闭开放注册？
- SSL MVP 是否必须支持上传证书，还是允许先反向代理终止 TLS？
- Remote vault 的版本历史保留策略按版本数、时间、还是 budget 自动裁剪？
- Desktop token 存储是否统一用 Tauri stronghold / OS keychain？

## 13. Cloud Workspace Collaboration Addendum

这次修正后的产品模型是：**Vault 是本地工作副本，Workspace 是云端协作与隔离单元**。用户可以本地创建 vault，也可以加入云端 workspace；每个云端 workspace 在每台设备上都需要绑定一个本地 vault 路径后才能在 desktop 中打开。

### 13.1 Corrected Concept Model

| Concept | Owner | Scope | Product meaning |
| --- | --- | --- | --- |
| Global user profile | Desktop app | Device-global | 当前登录用户、云服务地址、OAuth token、device id。它不是 vault 配置。 |
| Local vault | Desktop app | Local folder | Markdown 文件、本地索引、本地历史、本地偏好。一个用户可以有多个 vault。 |
| Cloud workspace | Web/cloud | Team or individual | 云端隔离、成员、邀请、发布、预算、版本和同步历史的边界。 |
| Workspace member | Web/cloud | Per workspace | Owner/admin/editor/viewer 权限和邀请状态。 |
| Vault binding | Desktop app | Per device + workspace | `cloud_workspace_id -> local_vault_path` 的本地映射，并保存 sync cursor 和本地设备状态。 |
| Published site | Web/cloud | Per workspace | 从 workspace 文档生成的公开只读站点。 |

关键规则：

- 创建本地 vault 不需要登录，也不需要云端 workspace。
- 将本地 vault 连接到云端时，可以创建新的 cloud workspace，也可以绑定已有 workspace。
- 用户被邀请到某个 cloud workspace 后，desktop 在登录后能看到它，但第一次打开前必须选择或创建一个本地 vault 目录。
- 切换 cloud workspace 本质上是切换 active vault binding。没有 binding 时先进入“选择本地 vault”流程。
- 用户信息、server URL、OAuth token、device id 属于 desktop global state。vault 只保存本地路径、workspace binding、sync cursor 和 vault 偏好。
- 单文件模式保持纯 Markdown 编辑器体验，不出现 workspace、sync、publish、account 等复杂入口。

### 13.2 Workspace Isolation And Collaboration

Cloud workspace 是协作和资源隔离边界：

- 文档、附件、对象存储 prefix、版本、冲突、发布配置、custom domain、budget 都按 `workspace_id` 隔离。
- Workspace 支持通过邮箱、用户名或邀请链接邀请成员。
- 角色：
  - Owner: 账单/预算、custom domain、危险设置、成员管理。
  - Admin: 成员管理、发布、文档管理。
  - Editor: 创建、编辑、同步文档。
  - Viewer: 读取云端文档和私有预览。
- 一个用户可以属于多个 workspace。
- Web 的第一个注册用户仍然是 server admin，但 server admin 和 workspace owner 是两层不同权限。

### 13.3 Desktop Workspace UX

Desktop 应该保持 local-first：

1. 首次启动默认建议创建 `Documents/.jtype` 作为本地 vault。
2. 用户可以一直离线使用，把它当作本地 Markdown 编辑器。
3. 连接云端时，desktop 打开 web OAuth，不在 desktop 内输入密码。
4. OAuth 完成后，desktop 保存 global cloud identity，并拉取当前用户可访问的 workspace 列表。
5. Workspace switcher 展示三类对象：
   - local-only vault；
   - 已绑定本地路径的 cloud workspace；
   - 已加入但尚未绑定本地路径的 cloud workspace。
6. 选择未绑定 workspace 时，先进入“选择本地 vault 目录”页面。默认建议 `Documents/.jtype/<workspace-slug>`。
7. 绑定完成后才能开始同步并进入编辑区。

### 13.4 Web Workspace UX

Web 负责账号、团队、云端文档和发布：

- Landing page 解释 local-first Markdown、自部署云端、workspace sync、发布站点。
- Auth pages 处理登录、注册、OAuth callback、desktop authorization。
- Workspace dashboard 展示用户可访问的所有 workspace。
- Workspace settings 包含成员、邀请、quota/budget、title、custom domain、证书、发布默认值、主题。
- Cloud editor 支持在浏览器中编辑文档。浏览器编辑产生普通 workspace version，并通过同步回到 desktop。
- Admin console 仍然是 server-level：用户、全局限制、存储健康、服务配置。

### 13.5 Bidirectional Sync Product Rules

因为 desktop 和 web 都可以编辑，同步必须是双向的：

- Desktop push 本地文件变化到绑定的 workspace。
- Desktop pull 云端、web、其他成员的变化到本地 vault。
- Web 编辑创建 `source = web` 的版本。
- Desktop 编辑创建 `source = desktop` 且带 `device_id` 的版本。
- 删除、重命名、附件、frontmatter 变化都作为 workspace event/version 处理。
- Sync 必须按 workspace 隔离，一个 workspace 失败不能阻塞其他 workspace。

默认冲突策略：

1. 当 local 和 cloud 都从同一个 base 修改时，先做三方 Markdown merge。
2. 如果 auto-merge 干净，保存 merged version，并在历史里标记为 auto-merged。
3. 如果 auto-merge 失败，创建 conflict item。
4. Conflict UI 必须提供：
   - accept local version；
   - accept cloud version；
   - keep both versions；
   - manual merge in editor。
5. 默认 UI 不暴露 Git 术语；高级历史面板可以展示 base/local/cloud version 详情。

### 13.6 MVP Acceptance Criteria

- 可以从 web 创建 cloud workspace。
- 可以从 desktop vault 绑定流程创建 cloud workspace。
- Workspace owner/admin 可以邀请其他用户。
- 被邀请用户可以在 web 接受邀请，并在 desktop OAuth 后看到该 workspace。
- Desktop 打开未绑定 workspace 前，必须选择一个本地 vault 路径。
- Web cloud edit 可以在 desktop sync 后出现在本地 vault。
- Desktop edit 可以在 web sync 后出现在 cloud workspace。
- 冲突编辑会产生 conflict state，并至少支持 accept local / accept cloud。
- Workspace quota/budget 按 workspace 执行，而不是按本地 vault 执行。
- 重置 desktop global profile 不会删除本地 vault 文件。

### 13.7 Non-Goals For MVP

- 多人实时协作光标和 presence。
- CRDT continuous collaboration。
- 超出行/块级三方合并的语义级 Markdown 自动冲突解决。
- 一个本地 vault 同时绑定多个 cloud workspace。
