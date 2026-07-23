JType supports a browser **OAuth** flow, a general **MCP access token**, and a stricter **one-board token** generated from Board settings. OAuth and general MCP tokens represent your MCP account access; a board token grants only the board it names.

## Which should I use?

**Prefer OAuth.** If your client supports it (Claude Desktop / claude.ai, Cursor, Claude Code), give it the server URL and approve once in the browser. Nothing is ever pasted or written into a config file, so there's no secret sitting on disk for you to manage.

**Use a scoped token when the client can't OAuth.** Some clients — `jcode`, Cline, and other generic MCP clients — only accept a static `Authorization: Bearer` header. For those, mint a token and paste it in.

| | OAuth | Scoped token |
|---|---|---|
| Setup | Approve in browser | Paste a header |
| Secret on disk | None | Yes (the token) |
| Scope | notes + kanban | notes + kanban |
| Expiry | 90 days | You choose (`--ttl-days`) |
| Best for | Claude, Cursor | jcode, Cline, generic |

For an automation that should see only one board, use **Board settings → MCP access** instead. The generated 90-day token works only with the exact pinned board URL shown there and cannot call the ordinary REST API.

## Mint a scoped token

From the CLI, after [logging in](/help/c/cli/install-and-login):

```bash
jtype login
jtype token create --label "jcode" --ttl-days 90
```

The token is printed **once** — copy it immediately and store it somewhere safe. You can't see it again.

Prefer the web? Open the dashboard's **AI Connections** page and choose **Generate token**.

Those routes produce a general `mcp` credential, which cannot reach admin endpoints or mint more tokens. The Board settings flow produces `mcp_kanban_board` authority instead and records the target board server-side.

## See and revoke tokens

A token works until it expires or you revoke it. To audit and revoke from the CLI:

```bash
jtype token list
jtype token revoke <id>
```

You can do the same from the dashboard's **AI Connections** page. Revoke a token the moment a device is lost or a client is retired — the next request from it gets a `401`.

## Security notes

- **Scoped.** AI credentials carry the `mcp` scope: notes and kanban only, never admin. See [What your AI can do](/help/c/ai-mcp/what-ai-can-do).
- **Board-bound when requested.** A Board settings token is additionally restricted to one immutable board document and its pinned endpoint.
- **Expiring.** OAuth grants and minted tokens expire (90 days by default). Device approval codes expire in 10 minutes and are single-use.
- **Revocable.** Kill any credential from `jtype token revoke` or the dashboard.
- **PKCE.** The OAuth flow is Authorization Code with PKCE (S256), and redirect URIs must be pre-registered — so an intercepted code can't be replayed.

## Where to go next

- [Connect your AI](/help/c/ai-mcp/connect-your-ai) — per-client setup with both methods.
- [Install and log in](/help/c/cli/install-and-login) — getting the `jtype` CLI ready.
