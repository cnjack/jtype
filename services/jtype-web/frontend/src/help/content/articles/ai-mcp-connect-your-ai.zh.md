JType 内置了一个 **MCP 服务器**（Model Context Protocol），它把你的**笔记与看板**开放给 AI 助手。连接之后，Claude、Cursor、Cline 或 `jcode` 这类工具就能搜索和阅读你的笔记、起草和更新文档、梳理你的看板——使用你的数据，并经你授权。

- **服务器地址：** `https://<你的-jtype-主机>/mcp`——本地为 `http://localhost:13345/mcp`
- **传输方式：** Streamable HTTP（JSON-RPC）
- **认证：** OAuth 2.1（浏览器方式，推荐）**或**受限访问令牌（备用）

## 两种连接方式

**OAuth（推荐）。** 对于支持 MCP OAuth 的客户端，你只需把服务器地址交给它。客户端会自动发现认证服务器、打开浏览器，你**授权一次**即可连接。无需粘贴任何内容、也不会写入配置文件，而且它获得的权限仅限于笔记与看板。

**受限令牌（备用）。** 有些客户端只接受静态的 `Authorization` 请求头。对这类客户端，铸造一个受限、会过期、可吊销的令牌并粘贴进去即可。如何选择以及如何创建，参见 [OAuth 与受限令牌](/help/c/ai-mcp/oauth-vs-token)。

## 各客户端的配置

### Claude 桌面端 / claude.ai

1. 打开 **Settings → Connectors → Add custom connector**。
2. 粘贴地址：`https://<你的-jtype-主机>/mcp`。
3. 在浏览器中授权。完成——这走的是 OAuth。

### Claude Code

```bash
claude mcp add --transport http jtype https://<你的-jtype-主机>/mcp
```

首次使用时，Claude Code 会在浏览器中跑一遍 OAuth 流程。若要改用令牌，追加 `--header "Authorization: Bearer <令牌>"`。

### Cursor

打开 **Settings → MCP → Add HTTP server**，粘贴地址，然后在 OAuth 提示中授权。

### Cline / 通用 MCP 客户端（令牌）

```jsonc
{
  "mcpServers": {
    "jtype": {
      "type": "http",
      "url": "https://<你的-jtype-主机>/mcp",
      "headers": { "Authorization": "Bearer <你的令牌>" }
    }
  }
}
```

### jcode

```jsonc
// ~/.jcode/config.json
"mcp_servers": {
  "jtype": {
    "type": "http",
    "url": "https://<你的-jtype-主机>/mcp",
    "headers": { "Authorization": "Bearer <你的令牌>" }
  }
}
```

随后用 `jcode mcp list` 验证。

### 仅支持 stdio 的客户端

如果某个客户端只支持 stdio，`jtype` 命令行可以运行一个本地桥接，转发到 HTTP 端点：

```jsonc
{ "mcpServers": { "jtype": { "type": "stdio", "command": "jtype", "args": ["mcp-stdio"] } } }
```

请先运行 `jtype login`，桥接才能拿到令牌。参见[安装并登录](/help/c/cli/install-and-login)。

## 试一试

连接成功后，对你的助手说：

> “列出我的 JType 工作区，找出关于发布的笔记，并在我的 Launch 看板中添加一张高优先级卡片‘起草发布计划’。”

它会依次调用 `list_workspaces` → `search_notes` → `list_boards` → `create_card`。

## 疑难排查

- **`/mcp` 返回 `401 Unauthorized`**——令牌已过期或被吊销。重新连接（OAuth）或创建一个新令牌。
- **客户端无法走 OAuth**——改用带 `Authorization` 请求头的令牌方式。
- **`jcode mcp list` 看不到 jtype**——检查 `~/.jcode/config.json`，并确认地址可达。

## 接下来去哪儿

- [你的 AI 能做什么](/help/c/ai-mcp/what-ai-can-do)——完整的工具列表、读取与写入之分。
- [OAuth 与受限令牌](/help/c/ai-mcp/oauth-vs-token)——如何选择、铸造与吊销。
