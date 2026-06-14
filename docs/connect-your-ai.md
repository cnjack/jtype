# Connect JType to your AI

JType exposes your **notes and kanban boards** to AI agents through a built-in
**MCP server** (Model Context Protocol). Once connected, assistants like Claude,
Cursor, Cline, or `jcode` can search and read your notes, create and update
documents, and triage your kanban board — with your permission and your data.

- **Server URL:** `https://<your-jtype-host>/mcp` (locally: `http://localhost:13345/mcp`)
- **Transport:** Streamable HTTP
- **Auth:** OAuth 2.1 (browser, recommended) **or** a scoped access token (fallback)

---

## What the AI can do

| Notes | Kanban |
|---|---|
| `list_workspaces` · `list_notes` · `get_note` | `list_boards` · `get_board` · `list_cards` |
| `search_notes` · `create_note` | `create_card` · `update_card` · `move_card` |
| `update_note` · `append_note` | `list_members` |

Read tools return Markdown; writes respect your workspace role. Admin actions
are **never** available to an AI token.

---

## Two ways to connect

### A. OAuth (recommended — no token to copy)

For clients that support MCP OAuth (Claude Desktop / claude.ai connectors,
Cursor, Claude Code), just give them the **server URL**. The client discovers
the auth server automatically, opens a browser, you **approve once**, and it's
connected. No token is ever pasted or stored in a config file. Tokens issued
this way are scoped to `mcp` and expire after 90 days.

### B. Scoped token (fallback — for clients that can't OAuth)

Some clients (e.g. `jcode`) only accept a static `Authorization` header. For
those, mint a **scoped, expiring, revocable** token and paste it in.

**Get a token — pick one:**

- **CLI:** `jtype login` then `jtype token create --label "jcode" --ttl-days 90`
  (printed once — copy it).
- **Web:** Dashboard → **AI Connections** → **Generate token**.

These tokens are `mcp`-scoped: they can manage your notes and kanban but **cannot**
reach admin endpoints or mint more tokens. Revoke any time with
`jtype token revoke <id>` or from the dashboard.

---

## Client setup

### Claude Desktop / claude.ai (custom connector)
1. **Settings → Connectors → Add custom connector**.
2. URL: `https://<your-jtype-host>/mcp`.
3. Approve in the browser. Done — uses OAuth (A).

### Claude Code
```bash
claude mcp add --transport http jtype https://<your-jtype-host>/mcp
```
On first use Claude Code runs the OAuth flow in your browser. (Or pass a token:
`--header "Authorization: Bearer <token>"`.)

### Cursor
**Settings → MCP → Add new server** → choose HTTP → paste the URL. Approve OAuth.

### Cline / generic MCP client (token)
```jsonc
{
  "mcpServers": {
    "jtype": {
      "type": "http",
      "url": "https://<your-jtype-host>/mcp",
      "headers": { "Authorization": "Bearer <token from `jtype token create`>" }
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
    "headers": { "Authorization": "Bearer <token from `jtype token create`>" }
  }
}
```
Then verify with `jcode mcp list`.

### Local / stdio-only clients
The `jtype` CLI can act as a local stdio MCP server that bridges to the HTTP
endpoint — useful for clients that only speak stdio:
```jsonc
{ "mcpServers": { "jtype": { "type": "stdio", "command": "jtype", "args": ["mcp-stdio"] } } }
```
(Run `jtype login` first so the bridge has a token.)

---

## Try it

Ask your assistant:

> "List my JType workspaces, find notes about the launch, and add a high-priority
> card 'Draft the launch plan' to my Launch board."

It will call `list_workspaces` → `search_notes` → `list_boards` → `create_card`.

---

## Security

- **Scoped:** AI tokens carry the `mcp` scope — notes + kanban only, never admin.
- **Expiring:** OAuth and minted tokens expire (90 days); device approval codes
  expire in 10 minutes and are single-use.
- **Revocable:** `jtype token list` / `jtype token revoke <id>`, or the dashboard.
- **PKCE:** the OAuth flow uses Authorization Code + PKCE (S256); redirect URIs
  must be pre-registered.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `401 Unauthorized` from `/mcp` | Token expired or revoked — reconnect (OAuth) or `jtype token create` again. |
| Client won't OAuth | Use the token method (B) with an `Authorization` header. |
| `jcode mcp list` doesn't show jtype | Check `~/.jcode/config.json` `mcp_servers.jtype` and that the URL is reachable. |
| "redirect_uri not registered" | The client's callback URL must be registered (OAuth clients register automatically via DCR). |
