JType 为笔记与看板内置了多个 **MCP endpoint**（Model Context Protocol）。Claude、Cursor、Cline 或 `jcode` 可以在你明确授予的权限范围内处理 Markdown 数据。

- **笔记地址：** `https://<你的-jtype-主机>/mcp`
- **通用看板地址：** `https://<你的-jtype-主机>/mcp/kanban`
- **单看板地址：** 从**看板设置 → MCP access** 生成，格式为 `https://<你的-jtype-主机>/mcp/kanban/<workspace>/<board>`
- **传输方式：** Streamable HTTP（JSON-RPC）
- **认证：** 通用 endpoint 使用 OAuth 2.1；单看板 endpoint 使用绑定到该看板的静态 token

## 两种连接方式

**OAuth（推荐）。** 对于支持 MCP OAuth 的客户端，把笔记 URL 或通用看板 URL 交给它。客户端会自动发现认证服务器、打开浏览器，你**授权一次**即可连接。无需粘贴任何内容，也不会写入配置文件；两个 URL 会暴露彼此分开的工具目录。

**受限令牌（备用）。** 有些客户端只接受静态的 `Authorization` 请求头。对这类客户端，铸造一个受限、会过期、可吊销的令牌并粘贴进去即可。如何选择以及如何创建，参见 [OAuth 与受限令牌](/help/c/ai-mcp/oauth-vs-token)。

**单看板连接。** 打开看板，进入**看板设置 → MCP access**，生成 token 并复制界面给出的配置。token 与 URL 都会在服务端固定到该看板：客户端无法发现其他 workspace/board、覆盖 pin，或把 token 改用于 REST。`create_card` 会返回在卡片存续期间稳定的 `documentId`，后续卡片读取、正文编辑、移动和评论工具都使用这个 ID。

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

连接笔记 endpoint 后，可以说：

> “找出关于发布的笔记，并起草一份发布检查清单。”

连接单看板 endpoint 后，可以说：

> “创建一张高优先级卡片‘起草发布计划’，把提纲写进 Markdown 正文，然后移到 Doing。”

助手只能操作你复制配置时所在的那块看板。

## 疑难排查

- **`/mcp` 返回 `401 Unauthorized`**——令牌已过期或被吊销。重新连接（OAuth）或创建一个新令牌。
- **看板 token 访问 `/mcp` 或 `/mcp/kanban` 返回 `401`**——这是预期行为；请使用看板设置中复制的完整固定 URL。
- **客户端无法走 OAuth**——改用带 `Authorization` 请求头的令牌方式。
- **`jcode mcp list` 看不到 jtype**——检查 `~/.jcode/config.json`，并确认地址可达。

## 接下来去哪儿

- [你的 AI 能做什么](/help/c/ai-mcp/what-ai-can-do)——完整的工具列表、读取与写入之分。
- [OAuth 与受限令牌](/help/c/ai-mcp/oauth-vs-token)——如何选择、铸造与吊销。
