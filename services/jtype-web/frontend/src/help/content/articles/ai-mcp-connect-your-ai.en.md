JType ships built-in **MCP endpoints** (Model Context Protocol) for notes and kanban. Tools like Claude, Cursor, Cline, or `jcode` can work with your Markdown data using the authority you explicitly grant.

- **Notes URL:** `https://<your-jtype-host>/mcp`
- **General kanban URL:** `https://<your-jtype-host>/mcp/kanban`
- **One-board URL:** generated from **Board settings → MCP access**, in the form `https://<your-jtype-host>/mcp/kanban/<workspace>/<board>`
- **Transport:** Streamable HTTP (JSON-RPC)
- **Auth:** OAuth 2.1 for the general endpoint, or a static token bound to one board

## Two ways to connect

**OAuth (recommended).** For clients that speak MCP OAuth, hand them either the notes URL or the general kanban URL. The client discovers the auth server, opens a browser, you **approve once**, and it's connected. Nothing is pasted or stored in a config file. The two URLs expose separate tool catalogs.

**Scoped token (fallback).** Some clients only accept a static `Authorization` header. For those, mint a scoped, expiring, revocable token and paste it in. See [OAuth vs scoped token](/help/c/ai-mcp/oauth-vs-token) for how to choose and how to create one.

**One-board connection.** Open the board, choose **Board settings → MCP access**, then generate and copy the config shown there. Its token and URL are both enforced for that board: the client cannot discover another workspace or board, override the pin, or reuse the token against REST. `create_card` returns a `documentId` that remains stable while the card exists; the remaining card, content, move, and comment tools use it.

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

With the notes endpoint connected, ask:

> "Find notes about the launch and draft a release checklist."

With a board-scoped endpoint connected, ask:

> "Create a high-priority card 'Draft the launch plan', add the outline to its Markdown body, and move it to Doing."

The assistant can operate only on the board whose config you copied.

## Troubleshooting

- **`401 Unauthorized` from `/mcp`** — the token expired or was revoked. Reconnect (OAuth) or create a new token.
- **A board token gets `401` on `/mcp` or `/mcp/kanban`** — expected. Use the exact pinned URL copied from Board settings.
- **The client won't OAuth** — use the token method with an `Authorization` header instead.
- **`jcode mcp list` doesn't show jtype** — check `~/.jcode/config.json` and that the URL is reachable.

## Where to go next

- [What your AI can do](/help/c/ai-mcp/what-ai-can-do) — the full tool list, reads vs writes.
- [OAuth vs scoped token](/help/c/ai-mcp/oauth-vs-token) — choosing, minting, and revoking.
