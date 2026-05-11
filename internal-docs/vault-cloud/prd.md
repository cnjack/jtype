# JType Vault + Cloud 产品需求文档

> 合并自 `docs/product-requirements.md` 和 `docs/vault-cloud-prd.md`，更新至 2026-05 实际实现状态。

## 1. 产品定位

JType 是一个 local-first 的 Markdown 内容工作台：

- 本地 vault（文件夹）是内容根目录，Markdown 文件在本地、可迁移、可用其他工具打开。
- 云端 workspace 提供同步、版本历史、发布站点和团队协作。
- 自部署优先，默认服务地址 `http://localhost:13345`。

产品心智：**Desktop 管本地 vault + OAuth 设备登录，Web 管身份、云端文档、管理后台和发布站点。**

## 2. 目标用户

- 个人知识管理用户：维护笔记和文档，多设备同步。
- 技术写作者：用 Markdown 管理文档站、教程。
- 小团队内容维护者：低成本发布页面、协作审阅。
- 自部署用户：不想把数据锁在 SaaS 里。

## 3. 核心概念

### 3.1 Vault（本地）

用户本地 Markdown 内容根目录。默认路径 `~/Documents/.jtype`。

- 用户内容位于 vault 根目录。
- `.jtype/` 目录存放本地元数据（workspace.json、索引缓存）。
- Vault 离线可用，不依赖云端。

### 3.2 Cloud Workspace（云端）

云端协作与隔离单元。负责：

- 文档版本存储和版本历史。
- 成员管理和邀请。
- 同步历史和冲突处理。
- 发布站点内容来源。
- 存储预算检查。

### 3.3 Vault Binding（本地映射）

每台设备上 `cloud_workspace_id → local_vault_path` 的映射，保存 sync cursor 和设备状态。

### 3.4 Cloud Profile（桌面全局状态）

Desktop 全局状态：server URL、user、token、device ID。不存在 vault 内部。

## 4. 用户角色

### 4.1 Anonymous Visitor

- 访问 landing page 和公开发布站点。

### 4.2 User

- 通过 Web 登录/注册。
- 通过 OAuth 连接 desktop。
- 管理个人设置（profile、site、domain、certificate）。
- 管理自己的云端文档。
- 查看存储预算使用情况。

### 4.3 Admin

第一个注册用户自动成为 Admin。可以：

- 管理用户列表（启用/禁用）。
- 设置用户存储预算。
- 查看全局存储和 domain 状态。

## 5. Desktop 功能

### 5.1 启动模式

| 模式 | 条件 | 行为 |
|------|------|------|
| Welcome | 无 vault | 显示欢迎界面，引导创建或打开 vault |
| Vault Home | 有 vault，无选中文档 | 显示 vault 首页 |
| Document Edit | 有 vault，有选中文档 | 编辑器 + 预览 |
| Single File | 外部打开 Markdown 文件 | 纯编辑器，无 sync/publish/account |

### 5.2 Vault 管理

- 默认 vault 路径 `~/Documents/.jtype`，首次启动可选择其他目录。
- 目录树显示文件夹、Markdown 文件。
- 支持新建、重命名、移动、删除文件和文件夹。
- 支持快速搜索（Command Palette / Quick Switcher）。
- 支持最近文件。

### 5.3 编辑与预览

- Markdown 源码编辑（CodeMirror 6）。
- Write / Split / Preview 三种模式。
- 支持 GFM、frontmatter、KaTeX 公式、Mermaid 图表。
- 保存写回本地文件，管理 dirty 状态。
- 文件外部修改时提示刷新。

### 5.4 文件入口

- 按钮选择本地 Markdown 文件。
- 系统文件关联（双击 `.md` 打开 JType）。
- 拖拽文件/文件夹。
- 最近文件和最近 vault。

### 5.5 OAuth 设备登录

Desktop 不出现密码输入框。登录流程：

1. 点击 "Connect in browser"。
2. Desktop 发起 device flow，获取 device code 和 user code。
3. 打开系统浏览器到 Web 审批页面。
4. 用户在 Web 端登录并批准设备。
5. Desktop 轮询获取 token。
6. 保存 token 到本地（cloud profile）。

### 5.6 同步

- 手动 Sync now 或保存后自动 debounce sync。
- 显示 last sync time、pending changes、conflict count。
- RESTful push/pull + WebSocket 通知。
- 冲突时提供 accept local / accept cloud 选择。

### 5.7 Header 按钮状态

| 状态 | 显示 |
|------|------|
| 无 vault | Set up vault, Connect cloud |
| Vault 本地模式 | Search, New, Save (dirty 时), Connect cloud |
| Vault 已连接云端 | Search, New, Save, Sync, Account |
| 单文件模式 | Open File, Save, Write/Split/Preview |

## 6. Web 功能

### 6.1 Landing Page

- 解释 JType 产品定位。
- 提供 Login/Register。
- 提供 Download Desktop。
- 已登录用户显示 Dashboard，Admin 显示 Admin。

### 6.2 认证

- Register / Login / Logout。
- OAuth device flow（approve/poll）。
- 第一个注册用户自动成为 admin。

### 6.3 Dashboard

- Cloud workspace 列表。
- 最近同步状态。
- 存储使用量。
- Published site URL。

### 6.4 Workspace 管理

- 创建/查看 workspace。
- 邀请成员（owner/admin/editor/viewer）。
- 管理文档列表。
- 查看版本历史。
- Workspace manifest。

### 6.5 个人设置

- Profile：username、display name、email。
- Site：title、description。
- Domain：custom domain + DNS 验证。
- SSL：上传证书和私钥。
- Devices：已连接设备列表。
- Storage：预算使用情况。

### 6.6 Admin 后台

- 用户列表和详情。
- 启用/禁用用户。
- 查看 workspace 列表。
- 查看 domain 和全局统计。

### 6.7 发布站点

每个用户的站点路由：

```
/u/:username
/u/:username/:workspace_slug
/u/:username/:workspace_slug/:page_path
```

发布来源：cloud workspace 中状态为 published 的文档。

## 7. 同步与冲突

### 7.1 双向同步

- Desktop push 本地文件变化到 cloud workspace。
- Desktop pull 云端/web/其他成员的变化到本地 vault。
- Web 编辑产生 `source = web` 的版本。
- Desktop 编辑产生 `source = desktop` 且带 device_id 的版本。
- 同步按 workspace 隔离。

### 7.2 冲突策略

1. 当 local 和 cloud 都修改了同一文档，先尝试三方 Markdown merge。
2. Auto-merge 成功则保存 merged version。
3. Auto-merge 失败则创建 conflict item。
4. Conflict UI 提供：accept local / accept cloud。

## 8. 非目标

MVP 不做：

- 多人实时协作编辑。
- CRDT 协作。
- AI 功能（UI 隐藏直到功能就绪）。
- 自动 ACME 证书。
- Web 富文本编辑器（MVP 仅支持简单编辑）。
- 图片附件上传到对象存储。
- 复杂主题市场。

## 9. 成功指标

- 首次 vault setup 完成率 > 80%。
- OAuth 连接成功率 > 90%。
- 第一次 sync 成功率 > 90%。
- 1,000 个 Markdown 文件 vault 索引 < 5 秒。
- 普通 sync 增量 < 2 秒。
