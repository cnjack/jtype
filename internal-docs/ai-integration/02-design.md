# Technical Design — JType AI Integration

**Related:** [`01-prd.md`](01-prd.md) · **Date:** 2026-06-14

## 1. Architecture overview

```
                         ┌─────────────────────────────────────────────┐
   MCP client (jcode,    │                jtype-web (Axum)             │
   Claude, Cursor) ──────┼─► POST /mcp  (Streamable HTTP, JSON-RPC)    │
   Authorization:Bearer  │      │  mcp::tools  (in-process dispatch)    │
                         │      └─► api_router.oneshot(sub-request) ───┼─► existing handlers
   CLI (jtype) ──────────┼─► /api/oauth/device_authorization, /token  │   (documents, kanban, …)
   device-auth + REST    │      /.well-known/oauth-*                    │
                         └─────────────────────────────────────────────┘
                                         │ MySQL (sqlx)
```

**Key decision — in-process dispatch.** MCP tools do **not** re-implement DB queries.
Each tool call builds an internal `http::Request` (method, URI, forwarded
`Authorization` bearer, JSON body) and runs it through a clone of the existing API
`Router` via `tower::ServiceExt::oneshot` — exactly how the integration tests drive the
app. This reuses all tested logic: RBAC (`require_workspace_role`), the sqlx CAST
handling, lamport clocks, version history, and WS broadcasts. Zero duplication, and it
**does not touch** the in-flight board-unification handlers.

### Wiring (`lib.rs`)
`build_router_with_hub` builds the API routes + state as today, then:
```rust
let api = /* existing routed+stated Router */;
let mcp = mcp::router(McpState { api: api.clone(), pool: pool.clone(), public_base_url });
let app = mcp.merge(api).layer(cors);   // mcp owns /mcp + /.well-known/* ; api keeps fallback
```

## 2. MCP protocol

- **Transport:** Streamable HTTP. `POST /mcp` accepts a single JSON-RPC request and
  returns a single JSON response (`Content-Type: application/json`) — permitted by the
  spec when the server doesn't need to stream. `GET /mcp` → `405` (no server-initiated
  stream). `DELETE /mcp` → `204` (stateless; no session to end).
- **Methods:** `initialize` (→ `protocolVersion`, `capabilities.tools`, `serverInfo`),
  `notifications/initialized` (→ 202, no body), `tools/list` (→ tool catalog),
  `tools/call` (→ `content:[{type:"text",text}]`, `isError` on tool failure), `ping`.
- **Errors:** protocol errors → JSON-RPC error object; tool/domain errors → a result with
  `isError:true` and a human-readable message (so the model can recover).

## 3. Authentication

- **Resource server:** `/mcp` requires `Authorization: Bearer <jtype session token>`
  (validated by reusing `middleware::auth::extract_user`). Missing/invalid →
  `401` + `WWW-Authenticate: Bearer resource_metadata="<base>/.well-known/oauth-protected-resource"`.
- **Discovery:**
  - `GET /.well-known/oauth-protected-resource` → `{ resource, authorization_servers:[base] }`
  - `GET /.well-known/oauth-authorization-server` → metadata advertising
    `device_authorization_endpoint`, `token_endpoint`, and
    `grant_types_supported:["urn:ietf:params:oauth:grant-type:device_code"]`.
- **Device grant (RFC 8628), wrapping the existing flow:**
  - `POST /api/oauth/device_authorization` → `{ device_code, user_code, verification_uri,
    verification_uri_complete, expires_in, interval }` (reuses `oauth::start` storage).
  - `POST /api/oauth/token` (`grant_type=…device_code`) → `{ access_token, token_type:"Bearer" }`
    on approval, else `400 {error:"authorization_pending"}` / `expired_token` / `access_denied`
    (reuses `oauth::poll` consume logic). The `access_token` **is** a session token.
- The existing approval UI (`/oauth/device?code=…`, `POST /api/oauth/device/approve`) is reused unchanged.

This is "the current OAuth way" (device flow) repackaged to satisfy MCP's OAuth needs.

## 4. Tool catalog → REST mapping

| Tool | Args | Internal request |
|---|---|---|
| `list_workspaces` | — | `GET /api/v1/workspaces` |
| `list_notes` | `workspace_id`, `folder?` | `GET …/documents` (filter by path prefix) |
| `get_note` | `workspace_id`, `path` | list → resolve id → `GET …/documents/:id` (returns Markdown) |
| `search_notes` | `workspace_id`, `query`, `limit?` | list → match title/path, then fetch+grep content (capped) |
| `create_note` | `workspace_id`, `path`, `content`, `title?` | `POST …/documents/save` |
| `update_note` | `workspace_id`, `path`, `content` | `POST …/documents/save` (with `baseContentHash`) |
| `append_note` | `workspace_id`, `path`, `content` | get_note → concat → save |
| `list_boards` | `workspace_id` | `GET …/kanban/boards` |
| `get_board` | `workspace_id`, `board_id` | `GET …/kanban/boards/:id` (columns+cards+labels) |
| `list_cards` | `workspace_id`, `board_id`, `column_id?` | `GET …/boards/:id/cards` (filter by column) |
| `create_card` | `workspace_id`, `board_id`, `column_id`, `title`, `description?`, `priority?`, `assignee_user_id?`, `due_at?` | `POST …/boards/:id/cards` |
| `update_card` | `workspace_id`, `card_id`, `title?`, `description?`, `priority?`, `assignee_user_id?`, `due_at?` | `PATCH …/kanban/cards/:id` |
| `move_card` | `workspace_id`, `board_id`, `card_id`, `target_column_id`, `target_position?` | `POST …/boards/:id/cards/move` |
| `list_members` | `workspace_id` | `GET …/members` (resolve assignee IDs) |

Naming/argument style mirrors Linear/GitHub (snake_case tool names; `update_card` folds
status/assignee/priority into one mutation). Results are compact JSON or Markdown text.

## 5. CLI (`jtype`) — `services/jtype-cli` (Rust bin: clap + reqwest + tokio)

- Config `~/.jtype/cli.json` (0600): `{ server_url, token, username }`. The per-vault
  cloud binding (`workspaceId` + `serverUrl` + `lastPulledClock`) lives **in the vault** at
  `.jtype/cloud.json`, not in `cli.json` — see [`03-cli-local-first.md`](03-cli-local-first.md).
- Commands:
  - `login` (device flow: device_authorization → print code+URL → poll /token until approved → store), `logout`, `whoami`
  - `workspace list`
  - `note list|get|search|create|update` — **local-first**: operate on the cwd vault's
    `.md` files directly (`--workspace` optional/ignored for notes); create/update also
    write-through to the bound cloud workspace. See [`03-cli-local-first.md`](03-cli-local-first.md).
  - `board list|get`, `card list|create|update|move` — remote (cloud); `--workspace` defaults
    to the vault's bound `workspaceId`
  - `bind --workspace <id|name>` (record binding in `.jtype/cloud.json`), `vault status`,
    `sync` (headless pull/push) — replaces the earlier `obsidian enable/push/pull`
  - `mcp-stdio` — read JSON-RPC from stdin, forward to `/mcp` with bearer, write to stdout
  - global `--json`, `--server`
- Auth: device flow against the new RFC 8628 endpoints; token reused as bearer for REST.
- Pure logic unit-tested (vault diff: which local files changed vs content hash).

## 6. Skills (`<root>/.jcode/skills/<name>/SKILL.md`)

jcode loads project skills from `.jcode/skills`. Frontmatter: `name`, `description`, `slash`.
Skills drive the `jtype` CLI (preferred for shell) and/or the MCP tools.

- `jtype-notes` — capture/organize: search the vault, create/update notes with consistent
  frontmatter + paths (`/jtype-notes`).
- `jtype-kanban` — board triage: list cards, classify by priority, propose & apply
  `update_card`/`move_card`, confirm-before-write (`/jtype-kanban`).

## 7. Testing

- **Rust integration** (`tests/mcp_tests.rs`): against the shared `common::setup()` router.
  `initialize`, `tools/list` (asserts all tools present), and one happy-path `tools/call`
  per tool (seed user/workspace/board, assert effect). `tests/oauth_mcp_tests.rs`: metadata
  docs + device-grant `/token` (pending → approve → access_token), 401 challenge header.
- **CLI e2e** (`services/jtype-cli/tests/` + a `scripts/cli-e2e.sh`): build the binary, run
  every subcommand against the live server (localhost:13345), assert exit code + output;
  unit tests for vault-diff.
- **Live `jcode` proof**: `jcode -p "<task>" --unsafe` in a scratch project with the jtype
  MCP server + skills configured, model `glm-5.2`; capture `~/.jcode/sessions/*.jsonl`,
  assert ≥1 jtype tool call and verify the created note/card via the API.

## 8. jcode integration recipe (for phase 6)

```jsonc
// ~/.jcode/config.json  (merge)
"mcp_servers": {
  "jtype": { "type": "http", "url": "http://localhost:13345/mcp",
             "headers": { "Authorization": "Bearer <device-minted token>" } }
}
```
Skills: drop `SKILL.md` folders into the scratch project's `.jcode/skills/`.
Run: `cd <scratch> && jcode -p "…" --unsafe`.

## 9. Out of scope / follow-ups
Auth-code + DCR consent UI; comments; streaming tool results; desktop sidecar bundling of
the CLI binary (we ship the crate + build; Tauri `externalBin` wiring is a follow-up).
