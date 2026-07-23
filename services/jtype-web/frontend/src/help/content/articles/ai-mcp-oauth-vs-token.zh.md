JType 支持浏览器 **OAuth**、通用 **MCP 访问令牌**，以及从看板设置生成、更严格的**单看板 token**。OAuth 与通用 MCP token 代表你的 MCP 账号访问能力；单看板 token 只授予它所绑定的那块看板。

## 我该用哪种？

**优先用 OAuth。** 如果你的客户端支持它（Claude 桌面端 / claude.ai、Cursor、Claude Code），把服务器地址给它，在浏览器里授权一次即可。整个过程无需粘贴任何内容，也不会写入配置文件，因此磁盘上不会留下需要你维护的密钥。

**当客户端无法走 OAuth 时，再用受限令牌。** 有些客户端——`jcode`、Cline 以及其他通用 MCP 客户端——只接受静态的 `Authorization: Bearer` 请求头。对这类客户端，铸造一个令牌并粘贴进去。

| | OAuth | 受限令牌 |
|---|---|---|
| 配置 | 浏览器授权 | 粘贴请求头 |
| 磁盘上的密钥 | 无 | 有（令牌本身） |
| 权限范围 | 笔记 + 看板 | 笔记 + 看板 |
| 有效期 | 90 天 | 你来定（`--ttl-days`） |
| 适合 | Claude、Cursor | jcode、Cline、通用客户端 |

如果某个自动化只应该看到一块看板，请改用**看板设置 → MCP access**。生成的 90 天 token 只能配合界面显示的固定看板 URL 使用，也不能调用普通 REST API。

## 铸造一个受限令牌

在命令行中，[登录](/help/c/cli/install-and-login)之后：

```bash
jtype login
jtype token create --label "jcode" --ttl-days 90
```

令牌只会打印**一次**——请立即复制并妥善保存。之后无法再次查看。

更喜欢网页？打开仪表盘的 **AI Connections** 页面，选择 **Generate token**。

这些途径生成的是通用 `mcp` 凭据，**无法**触达管理类 endpoint，也无法铸造更多 token。看板设置流程生成的则是 `mcp_kanban_board` 权限，并在服务端记录目标看板。

## 查看并吊销令牌

令牌在过期或被你吊销之前一直有效。在命令行中审计与吊销：

```bash
jtype token list
jtype token revoke <id>
```

你也可以在仪表盘的 **AI Connections** 页面做同样的事。一旦设备丢失或某个客户端停用，立即吊销对应令牌——它的下一次请求就会收到 `401`。

## 安全说明

- **受限。** AI 凭据带有 `mcp` 范围：仅限笔记与看板，从不涉及管理。参见[你的 AI 能做什么](/help/c/ai-mcp/what-ai-can-do)。
- **可进一步绑定看板。** 看板设置 token 还会绑定到一个不可变的看板 document 与固定 endpoint。
- **会过期。** OAuth 授权与铸造的令牌都会过期（默认 90 天）。设备授权码 10 分钟过期且仅可使用一次。
- **可吊销。** 用 `jtype token revoke` 或仪表盘随时作废任意凭据。
- **PKCE。** OAuth 流程为带 PKCE（S256）的授权码模式，且重定向 URI 必须预先注册——因此被截获的授权码无法被重放。

## 接下来去哪儿

- [把你的 AI 连接到 JType](/help/c/ai-mcp/connect-your-ai)——两种方式的各客户端配置。
- [安装并登录](/help/c/cli/install-and-login)——让 `jtype` 命令行就绪。
