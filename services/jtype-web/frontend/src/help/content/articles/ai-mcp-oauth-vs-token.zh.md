JType 的 MCP 服务器接受两类凭据：浏览器 **OAuth** 流程，或你粘贴进配置文件的**受限访问令牌**。两者授予的权限相同——笔记与看板，从不涉及管理。区别在于凭据如何创建与存放。

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

## 铸造一个受限令牌

在命令行中，[登录](/help/c/cli/install-and-login)之后：

```bash
jtype login
jtype token create --label "jcode" --ttl-days 90
```

令牌只会打印**一次**——请立即复制并妥善保存。之后无法再次查看。

更喜欢网页？打开仪表盘的 **AI Connections** 页面，选择 **Generate token**。

两种途径产出的凭据相同：它带有 `mcp` 范围，因此能管理你的笔记与看板，但**无法**触达管理类端点，也无法铸造更多令牌。

## 查看并吊销令牌

令牌在过期或被你吊销之前一直有效。在命令行中审计与吊销：

```bash
jtype token list
jtype token revoke <id>
```

你也可以在仪表盘的 **AI Connections** 页面做同样的事。一旦设备丢失或某个客户端停用，立即吊销对应令牌——它的下一次请求就会收到 `401`。

## 安全说明

- **受限。** AI 凭据带有 `mcp` 范围：仅限笔记与看板，从不涉及管理。参见[你的 AI 能做什么](/help/c/ai-mcp/what-ai-can-do)。
- **会过期。** OAuth 授权与铸造的令牌都会过期（默认 90 天）。设备授权码 10 分钟过期且仅可使用一次。
- **可吊销。** 用 `jtype token revoke` 或仪表盘随时作废任意凭据。
- **PKCE。** OAuth 流程为带 PKCE（S256）的授权码模式，且重定向 URI 必须预先注册——因此被截获的授权码无法被重放。

## 接下来去哪儿

- [把你的 AI 连接到 JType](/help/c/ai-mcp/connect-your-ai)——两种方式的各客户端配置。
- [安装并登录](/help/c/cli/install-and-login)——让 `jtype` 命令行就绪。
