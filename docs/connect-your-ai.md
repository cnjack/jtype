# Connect JType to your AI

JType exposes your **notes and kanban boards** to AI agents through a built-in
**MCP server** (Model Context Protocol). Once connected, assistants like Claude,
Cursor, Cline, or `jcode` can search and read your notes, create and update
documents, and triage your kanban board — with your permission and your data.

- **Notes server:** `https://<your-jtype-host>/mcp` (locally: `http://localhost:13345/mcp`)
- **Kanban server:** `https://<your-jtype-host>/mcp/kanban`
- **Transport:** Streamable HTTP
- **Auth:** OAuth 2.1 (browser, recommended) **or** a scoped access token (fallback)

---

## Install JType

### Desktop app

Download the installer for your OS from the
[**latest release**](https://github.com/cnjack/jtype/releases/latest):

| OS | File |
|---|---|
| macOS (Apple Silicon) | `JType_*_aarch64.dmg` |
| macOS (Intel) | `JType_*_x64.dmg` |
| Windows | `JType_*_x64-setup.exe` |

### CLI (`jtype`)

The `jtype` CLI is what lets you log in and drive notes/kanban from a terminal.
Pick whichever fits:

- **From the desktop app (easiest):** Settings → **Tools → Command line** → toggle
  **Install jtype to your PATH**. The app downloads the right binary for your OS
  and puts it on your PATH.
- **macOS / Linux:**
  ```sh
  curl -fsSL https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.sh | sh
  ```
- **Windows (PowerShell):**
  ```powershell
  irm https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.ps1 | iex
  ```
- **From source (needs Rust):** `cargo install --path services/jtype-cli`

Then sign in: `jtype login`.

---

## What the AI can do

| Notes | Kanban |
|---|---|
| `list_workspaces` · `list_notes` · `get_note` | `list_boards` · `get_board` · `list_cards` |
| `search_notes` · `create_note` | `create_card` · `update_card` · `move_card` · `delete_card` |
| `update_note` · `append_note` | labels · attachment references · relations · batch updates · status management |

Read tools return Markdown; writes respect your workspace role. Admin actions
are **never** available to an AI token.

Notes and Kanban are separate MCP tool surfaces. Connect `/mcp/kanban` when the
assistant needs Board tools. For a single Board, Board Settings can generate a
pinned URL `/mcp/kanban/<workspace>/<board>` and a token that works only on that
URL. That Board-pinned token is not a general REST/embed token. See the
[Kanban MCP contract](api/kanban-mcp.md) for mutation and recovery semantics.

---

## Two ways to connect

### A. OAuth (recommended — no token to copy)

For clients that support MCP OAuth (Claude Desktop / claude.ai connectors,
Cursor, Claude Code), give them the **Notes or Kanban server URL** you need. The client discovers
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
2. URL: `https://<your-jtype-host>/mcp` for Notes, or `/mcp/kanban` for Boards.
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

For clients configured as JSON, add a second server entry pointing to
`https://<your-jtype-host>/mcp/kanban` when Board tools are required. The same
OAuth or broad `mcp` token can authorize both unpinned surfaces.

### Local / stdio-only clients
The `jtype` CLI can act as a local stdio MCP server that bridges to the HTTP
endpoint — useful for clients that only speak stdio:
```jsonc
{ "mcpServers": { "jtype": { "type": "stdio", "command": "jtype", "args": ["mcp-stdio"] } } }
```
(Run `jtype login` first so the bridge has a token.)

For the separate Kanban surface, use `"args": ["mcp-stdio", "--kanban"]`.

---

## Try it

With both Notes and Kanban servers connected, ask your assistant:

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
