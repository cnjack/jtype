JType ships a built-in **MCP server** (Model Context Protocol) that exposes your **notes and kanban boards** to AI assistants. Once connected, tools like Claude, Cursor, Cline, or `jcode` can search and read your notes, draft and update documents, and triage your board — using your data, with your permission.

- **Server URL:** `https://<your-jtype-host>/mcp` — locally `http://localhost:13345/mcp`
- **Transport:** Streamable HTTP (JSON-RPC)
- **Auth:** OAuth 2.1 (browser, recommended) **or** a scoped access token (fallback)

## Two ways to connect

**OAuth (recommended).** For clients that speak MCP OAuth, you just hand them the server URL. The client discovers the auth server, opens a browser, you **approve once**, and it's connected. Nothing is pasted or stored in a config file, and the access it gets is scoped to notes and kanban only.

**Scoped token (fallback).** Some clients only accept a static `Authorization` header. For those, mint a scoped, expiring, revocable token and paste it in. See [OAuth vs scoped token](/help/c/ai-mcp/oauth-vs-token) for how to choose and how to create one.

## Per-client setup

### Claude Desktop / claude.ai

1. Open **Settings → Connectors → Add custom connector**.
2. Paste the URL: `https://<your-jtype-host>/mcp`.
3. Approve in the browser. Done — this uses OAuth.

### Claude Code

```bash
claude mcp add --transport http jtype https://<your-jtype-host>/mcp
```

On first use Claude Code runs the OAuth flow in your browser. To use a token instead, append `--header "Authorization: Bearer <token>"`.

### Cursor

Open **Settings → MCP → Add HTTP server**, paste the URL, and approve the OAuth prompt.

### Cline / generic MCP client (token)

```jsonc
{
  "mcpServers": {
    "jtype": {
      "type": "http",
      "url": "https://<your-jtype-host>/mcp",
      "headers": { "Authorization": "Bearer <your token>" }
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
    "url": "https://<your-jtype-host>/mcp",
    "headers": { "Authorization": "Bearer <your token>" }
  }
}
```

Then verify with `jcode mcp list`.

### stdio-only clients

If a client only speaks stdio, the `jtype` CLI can run a local bridge to the HTTP endpoint:

```jsonc
{ "mcpServers": { "jtype": { "type": "stdio", "command": "jtype", "args": ["mcp-stdio"] } } }
```

Run `jtype login` first so the bridge has a token. See [Install and log in](/help/c/cli/install-and-login).

## Try it

Once connected, ask your assistant:

> "List my JType workspaces, find notes about the launch, and add a high-priority card 'Draft the launch plan' to my Launch board."

It will chain `list_workspaces` → `search_notes` → `list_boards` → `create_card`.

## Troubleshooting

- **`401 Unauthorized` from `/mcp`** — the token expired or was revoked. Reconnect (OAuth) or create a new token.
- **The client won't OAuth** — use the token method with an `Authorization` header instead.
- **`jcode mcp list` doesn't show jtype** — check `~/.jcode/config.json` and that the URL is reachable.

## Where to go next

- [What your AI can do](/help/c/ai-mcp/what-ai-can-do) — the full tool list, reads vs writes.
- [OAuth vs scoped token](/help/c/ai-mcp/oauth-vs-token) — choosing, minting, and revoking.
