# PRD — JType AI Integration (MCP + CLI + Skills)

**Status:** Draft v1 · **Owner:** jack · **Date:** 2026-06-14
**Related:** [`00-research.md`](00-research.md), [`02-design.md`](02-design.md)

## 1. Summary

Make a JType cloud workspace — its Markdown documents **and** its kanban boards —
a first-class, AI-controllable surface, exactly the way Notion / Linear / Obsidian
do it, but reusing JType's existing Axum service, RBAC, and OAuth **device flow**.

We ship **three integration modalities**:

1. **Online MCP server** — `POST /mcp` on jtype-web, **Streamable HTTP** transport,
   authenticated with the **existing OAuth** (RFC 8628 device grant) + bearer session
   tokens, satisfying the MCP Authorization spec (protected-resource + auth-server
   metadata, `WWW-Authenticate` challenge).
2. **CLI tool** — `jtype`, shipped alongside the desktop app, authenticating via the
   **device auth flow**, able to manage documents and kanban projects, to `enable`
   a local **Obsidian**/Markdown vault, and to run as a local **stdio MCP** bridge.
3. **Agent Skills** — verified `SKILL.md` skills for note capture/organization and
   board triage that drive the CLI/MCP, installed and proven inside the **`jcode`**
   agent against a real model.

## 2. Goals / Non-goals

**Goals**
- G1. An MCP client (Claude, Cursor, `jcode`, …) can connect to a JType workspace over
  Streamable HTTP and **read & manage notes and kanban cards** with the user's permissions.
- G2. Authentication reuses JType's OAuth device flow, packaged so it **satisfies MCP's
  OAuth requirements** (discovery metadata + bearer resource server).
- G3. A bundled `jtype` CLI logs in via device flow and performs the same note/project
  operations from a terminal or a script, **including binding a local Obsidian vault**.
- G4. Reusable Skills let an agent perform real workflows ("capture this into my vault",
  "triage the board") on top of the MCP/CLI.
- G5. **Every** MCP tool and **every** CLI command has an automated test that passes.
- G6. A live, end-to-end proof inside `jcode`: a real model conversation that calls the
  tools and changes real data (happy path verified).

**Non-goals**
- Realtime collaborative editing over MCP (sync already exists; out of scope here).
- Full OAuth Authorization-Code + browser consent UI / dynamic client registration UI
  (we implement the **device grant** path, which our clients use, plus the discovery docs).
- Comment threads / worklogs (JType has no comment model yet).
- Confluence/Jira-style custom field engines.

## 3. Users & use cases

- **Knowledge worker in an AI client** — "Find my notes on X, summarize, and create a
  card to follow up." → `search_notes`, `get_note`, `create_card`.
- **Developer with `jcode`/Claude Code** — wires the JType MCP into their agent and asks
  it to file/triage work items while coding.
- **Obsidian user** — `cd ~/Vault` and any AI agent (via the CLI) reads/updates the local
  `.md` files directly; `jtype bind` once, and changes write-through to the cloud. (See
  [`03-cli-local-first.md`](03-cli-local-first.md).)
- **Automation / CI** — scripts the `jtype` CLI with a device-minted token.

## 4. Functional requirements

### 4.1 MCP server (jtype-web)
- FR-M1. `POST /mcp` implements MCP JSON-RPC 2.0: `initialize`, `notifications/initialized`,
  `tools/list`, `tools/call`. Streamable HTTP (single-JSON responses; `GET /mcp` → 405).
- FR-M2. Auth: `Authorization: Bearer <jtype session token>`. Missing/invalid →
  `401` with `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource"`.
- FR-M3. Discovery: `GET /.well-known/oauth-protected-resource` and
  `GET /.well-known/oauth-authorization-server` advertise the device grant + endpoints.
- FR-M4. OAuth device grant in RFC 8628 shape: `POST /api/oauth/device_authorization`
  and `POST /api/oauth/token` (`grant_type=urn:ietf:params:oauth:grant-type:device_code`),
  wrapping the existing approve/poll logic; `authorization_pending` while unapproved.
- FR-M5. Tools (≥14), each mapping to existing handlers, respecting workspace RBAC:
  - Notes: `list_workspaces`, `list_notes`, `get_note`, `search_notes`, `create_note`,
    `update_note`, `append_note`
  - Kanban: `list_boards`, `get_board`, `list_cards`, `create_card`, `update_card`,
    `move_card`, `list_members`
- FR-M6. Tool results return Markdown/JSON text content; errors return `isError` results,
  not transport failures.

### 4.2 CLI (`jtype`)
- FR-C1. `jtype login` runs the device flow (prints user code + URL, polls), stores the
  token in `~/.jtype/cli.json` (0600). `logout`, `whoami`.
- FR-C2. `jtype workspace list`.
- FR-C3. Notes: `note list|get|search|create|update` (`--workspace`, `--path`, `--content/-`).
- FR-C4. Kanban: `board list|get`, `card list|create|update|move`.
- FR-C5. Local-first vault (revised in [`03-cli-local-first.md`](03-cli-local-first.md)):
  when run inside a vault (a `.jtype/`-marked folder, discovered from `cwd`), the `note`
  commands read/write the local `.md` files **directly** — the disk is the source of truth,
  no `--workspace` needed. `jtype bind --workspace <id|name>` records the vault↔cloud binding
  in `.jtype/cloud.json`; `jtype vault status` shows it. Cloud is optional: note create/update
  write-through to the workspace, and `jtype sync` does a headless pull/push.
  (This replaces the earlier `obsidian enable/status/push/pull` cloud-mirror shape.)
- FR-C6. `jtype mcp-stdio` exposes the tool set over stdio JSON-RPC (bridges to `/mcp`).
- FR-C7. `--json` for machine-readable output on read commands.

### 4.3 Skills
- FR-S1. `jtype-notes` skill — capture/organize into the vault (drives `note` cmds / MCP).
- FR-S2. `jtype-kanban` skill — board triage (list → classify → update/move cards).
- FR-S3. Skills install into `jcode` and are picked up by its skill loader.

### 4.4 Tests & live proof
- FR-T1. Rust integration tests: MCP `initialize`/`tools/list` + one happy-path
  `tools/call` per tool; OAuth metadata + device-grant token endpoint.
- FR-T2. CLI e2e: a scripted run exercises every command against the live server and
  asserts success; unit tests for vault-diff logic.
- FR-T3. Live `jcode` session against `glm-5.2` calls ≥1 note tool and ≥1 kanban tool and
  mutates real data; transcript captured.

## 5. Success metrics
- 100% of MCP tools and CLI commands covered by a passing test.
- A captured `jcode` transcript shows the model invoking JType MCP tools and the
  resulting note/card visible via the API.
- `jtype bind` + a note write-through round-trips a local vault file to a cloud document
  (see [`03-cli-local-first.md`](03-cli-local-first.md)).

## 6. Risks & mitigations
- **MySQL/sqlx lacks chrono** → CAST timestamps to CHAR (known gotcha). Mitigation:
  back MCP tools by **dispatching into existing handlers in-process** (they already
  handle this) rather than re-querying.
- **Headless agent needs a model** → use the already-configured `jcode` provider
  (`zhipuai-coding-plan/glm-5.2`); no new keys required.
- **OAuth scope creep** → ship device grant + discovery only; defer auth-code/DCR UI.
- **Not breaking in-flight board-unification work** → MCP/CLI are additive modules;
  no edits to existing handler logic.
