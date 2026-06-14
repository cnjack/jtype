# Technical Design — JType CLI Local-First (Phase 2)

**Status:** Draft v1 · **Owner:** jack · **Date:** 2026-06-14
**Related:** [`01-prd.md`](01-prd.md), [`02-design.md`](02-design.md)
**Supersedes:** the "bind + obsidian push/pull" CLI shape in `01-prd.md` §FR-C5 and
`02-design.md` §5 (those described a cloud-primary mirror; this doc makes the CLI
genuinely local-first). The MCP-server design in `02-design.md` §1–§4 is unchanged.

## 1. Problem

`DESIGN.md` opens with: *"JType is a **local-first Markdown vault**."* The desktop app
lives up to that — it reads/writes real `.md` files on disk (a vault folder marked by
`.jtype/`), watches them with `notify`, and treats cloud sync as **optional**
(fire-and-forget). The `jtype` CLI shipped as the opposite: a **pure cloud client** that
HTTP-calls `jtype-web` and addresses workspaces by **UUID**.

Consequences the user actually hit:

- `jtype note list --workspace "Jtype Vaullt"` → `404 Not Found: not found` — only the raw
  UUID works, because `--workspace` is interpolated straight into the REST path and the
  backend resolves by `w.id` only.
- The CLI cannot see the vault on disk at all; it needs a running server + the documents to
  have been synced. Two sources of truth (disk files vs server MySQL), two identifiers
  (local path vs UUID), and the path↔UUID binding lives **outside** the vault (global
  `~/.config/JType/vault-bindings.json`), invisible to the CLI.
- `note list` even leaks kanban `.board` config files as if they were notes.

This phase makes the CLI **local-first**: when you are inside a vault, the **disk files are
the source of truth** for notes; the cloud is an **optional remote** you push to / pull
from.

## 2. Locked decisions

| # | Decision | Consequence |
|---|---|---|
| **A** | **Credentials are not unified.** | The CLI keeps its own `~/.jtype/cli.json` (token, default `server_url`). It does **not** read the desktop app's `~/.config/JType/cloud-profile.json`. `serverUrl` + `workspaceId` for a vault come from the per-vault `.jtype/cloud.json`. |
| **B** | **Write-through = last-write-wins.** | On note create/update the CLI writes the file, then best-effort `POST …/documents/save` **without** `baseContentHash` → the server takes the content verbatim (`mergeStatus: accepted`), never `409`. The CLI's write wins; a concurrent cloud edit can be silently overwritten. Acceptable for the single-writer workflow; the desktop app's full 3-way engine + conflict UI is the human safety net. |
| **C** | **C3 — the CLI owns its own sync cursor.** | `lastPulledClock` lives in `.jtype/cloud.json` and is written **only** by the CLI. The desktop app keeps its own cursor in `vault-bindings.json`. Neither reads the other. The only cost is redundant re-fetches when both pull the same vault on the same machine — made free by **diff-before-write** (§7). The full SSOT migration (app reads `.jtype/cloud.json`) is **deferred** (M6) until real churn is observed. |

Rejected alternatives: unifying credentials now (A); conflict-aware write-through with
`baseContentHash`/`baseContent` (B — deferred, `.jtype/sync-base/` already has the bases to
enable it later); migrating the desktop app to a single shared cursor now (C / M6).

## 3. Target architecture

```
        ┌─────────────────────────────────────────────┐
        │  jtype-core  (pure Rust: vault file IO +     │
        │  frontmatter + markdown + sync-base/trash)   │
        │  deps: pulldown-cmark, serde, serde_json     │
        │  ZERO tauri / tokio / reqwest                │
        └───────────────┬──────────────┬──────────────┘
                        │              │
        ┌───────────────▼────┐  ┌──────▼───────────────────────┐
        │  src-tauri         │  │  jtype CLI                    │
        │  #[command] thin    │  │  local-first:                 │
        │  wrappers + watcher │  │  cwd → .jtype/ → read/write    │
        │  + WS + window      │  │  files directly. cloud = opt   │
        └────────────────────┘  └──────┬────────────────────────┘
                        │               │  write-through push (B)
                        └───────┬───────┘  + headless pull (C3)
                          ┌─────▼─────┐
                          │ jtype-web │  POST …/documents/save · POST …/sync/pull
                          └───────────┘
   vault ↔ cloud binding = .jtype/cloud.json  (per-vault, portable, no token)
```

Notes' source of truth = the disk files in the cwd vault. The cloud is reached only for
write-through and explicit `jtype sync`. Board/card stay cloud-only (Q4).

## 4. `jtype-core` crate (M1)

`src-tauri/src/workspace.rs` (~2070 lines) is already pure: it imports only
`pulldown_cmark`, `serde`, and `std`, takes `&Path`/`&str`, returns `Result<T, String>`,
and has **no** `tauri`/`AppHandle`/`Emitter`/webview symbols. It lifts verbatim into a new
crate `services/jtype-core` (its in-file `#[cfg(test)]` suite moves with it and keeps
passing).

- **Crate deps:** `pulldown-cmark = "0.13"`, `serde = { features=["derive"] }`,
  `serde_json = "1"`; dev-dep `tempfile = "3"`. No tauri/tokio/reqwest/notify/dirs.
- **src-tauri rewire (minimal):** delete `mod workspace;`, add a path dependency on
  `jtype-core`, and alias `use jtype_core as workspace;` so every existing
  `workspace::…` call-site and the `#[tauri::command]` wrappers compile unchanged.
- **Stays desktop-only (NOT in core):** the `notify` file watcher + `app.emit`, the
  WebSocket/cloud listener (`ws_client`), window/splash control, the CLI installer, and the
  OS-config-path storage for `cloud-profile.json` / `vault-bindings.json` / `vault-settings`
  — all of these touch `AppHandle`/OS paths and are the boundary line.
- **Note:** the `#[serde(rename_all = "camelCase")]` DTOs keep camelCase on the wire — both
  the Tauri IPC bridge and any CLI `--json` output depend on it.

The CLI's pull-apply (§7) uses a small local apply helper rather than moving
`apply_cloud_documents` out of `lib.rs`, keeping M1's edits to `lib.rs` to two lines.

## 5. Vault model in the CLI (M2)

- **Vault discovery:** walk up from `cwd` for a `.jtype/` directory (reuse
  `jtype_core::detect_vault_root`), git-style. Not in a vault → a readable error
  (`not inside a JType vault; cd into one or pass --vault <path>`). An optional global
  `--vault <path>` overrides cwd.
- **Per-vault binding — `.jtype/cloud.json`** (new file, sibling of the existing
  `workspace.json` / `publish.json`):

  ```json
  { "workspaceId": "<uuid>", "serverUrl": "http://localhost:13345",
    "workspaceSlug": "jtype-vaullt", "workspaceName": "Jtype Vaullt",
    "lastPulledClock": 0 }
  ```

  It carries `serverUrl` so the CLI is self-contained from the vault dir alone (the desktop
  app's `vault-bindings.json` lacks `serverUrl` — that gap is the core blocker for a CLI).
  **No token here** (secret; stays in `~/.jtype/cli.json`). It is automatically ignored by
  the desktop file watcher (the `.jtype/` filter) and the file tree (extension filter), so
  adding it is non-disruptive.
- **`~/.jtype/cli.json`** (unchanged shape): `{ server_url, token, username }`. The
  per-vault `serverUrl` in `cloud.json` overrides the CLI's default when operating on a
  bound vault.
- **New commands:** `jtype bind --workspace <id|name>` (resolve via `workspace list`, write
  `.jtype/cloud.json`), `jtype vault status` (show vault root + binding + cursor).

## 6. Command behavior

| Command | Phase-2 mode | Behavior |
|---|---|---|
| `note list` | **LOCAL** | walk vault for `*.md`, **exclude `*.board`** (fixes the leak), title from frontmatter/H1/filename |
| `note get <path>` | **LOCAL** | read `vault_root/<path>` (append `.md` if missing); no cloud, no doc-id |
| `note search` | **LOCAL** | walk + read files; same `limit`/snippet logic as today |
| `note create` / `update` | **LOCAL + write-through** | write file first (authoritative); then if logged in `POST …/documents/save` and print `mergeStatus`; if not, save locally + soft notice |
| `board list/get`, `card *` | **REMOTE** | unchanged HTTP; workspace defaults to the bound `workspaceId`, else `--workspace`, else friendly error |
| `workspace list` | **REMOTE** | unchanged; the source for `jtype bind` |
| `login/logout/whoami`, `token *`, `mcp-stdio` | unchanged | — |
| `sync` (new) | REMOTE | §7 |

- **`--workspace`** becomes `Option<String>` on note/board/card. For notes it is ignored
  (the cwd vault decides); for board/card it overrides the bound `workspaceId`.
- **Friendly not-logged-in error:** `cfg.require_token()?` is called at the top of the
  `Board` / `Card` / `Token` command arms so the user sees
  `not logged in — run \`jtype login\` first` instead of a raw `401 Unauthorized` from deep
  in the HTTP client. **Note commands never get this guard** — they must work offline/logged
  out (that is the whole point of local-first).
- **Path safety:** a `--path` like `../../etc/passwd` is confined to the vault root via
  `jtype_core::safe_join`.

## 7. Write-through & sync (M3 push, M5 pull)

- **Write-through (on every note create/update):** `POST /api/v1/workspaces/{id}/documents/save`
  with `{ relativePath, content, title? }`. Per decision **B**, omit `baseContentHash` →
  `mergeStatus: accepted`, never `409`. Best-effort: a network/auth failure does **not**
  fail the local write; print a soft notice. The server computes `contentHash`; do not send
  it.
- **`jtype sync` (headless fallback, satisfies Q3):**
  - **pull:** `POST /api/v1/workspaces/{id}/sync/pull` with `{ sinceClock, deviceId }` →
    one round-trip returning changed document bodies keyed by `relativePath`, `deletedPaths`,
    and `conflicts`. **No doc-id lookup needed.**
  - **apply (diff-before-write):** for each returned doc, write `vault_root/<relativePath>`
    **only if** the new content's hash differs from what is on disk. This makes a redundant
    re-pull a no-op — no file churn, no spurious desktop `vault-file-changed` events, no
    fight with the app. Deletions remove the file (and its `.jtype/sync-base/` entry).
  - **cursor (C3):** advance `lastPulledClock = max(updatedClock, deletedClock)` over the
    response and persist it into `.jtype/cloud.json`. The CLI never reads the app's cursor;
    two independent cursors converge, redundancy is the only cost, diff-before-write makes it
    free.
  - **push:** `POST …/sync/push` (batch) or per-note `…/documents/save`; same last-write-wins
    semantics as write-through.
- **Auth/role:** writes need workspace role `owner|admin|editor` (viewer → `403`); unknown
  workspace/non-member → `404`. The CLI distinguishes `403` (read-only) from `404` (no
  access) when surfacing errors. Send a stable `X-Device-Id` so the server keeps a per-device
  cursor.

## 8. Milestones

| M | Scope | Touches desktop app? | Risk |
|---|---|---|---|
| **M1** | Extract `jtype-core`; rewire `src-tauri` (2-line `lib.rs` change + Cargo path dep) | yes (mechanical, no behavior change; tests move) | low |
| **M2** | CLI vault layer: cwd detection, `.jtype/cloud.json`, `jtype bind`/`vault status`; `--workspace` → `Option` | no | low |
| **M3** | Notes local-first read/write + write-through push; `.board` filter | no (M3 file writes are picked up by the app's existing watcher) | med |
| **M4** | Board/card stay remote; workspace resolution from binding; friendly not-logged-in guard | no | low |
| **M5** | `jtype sync` pull/push, CLI-owned cursor, diff-before-write | no | med |
| **M6 (deferred)** | Desktop app reads/writes `.jtype/cloud.json` as the single source of truth (binding + cursor) + one-time importer from `vault-bindings.json` | **yes** | — do only if churn appears |
| **2.5 (deferred)** | `mcp-stdio` serves the **local** vault directly (AI agents edit disk files with no server) | — | — |

## 9. Testing

- `jtype-core`: the lifted in-file unit tests run via `cargo test -p jtype-core` and validate
  the extraction with zero changes.
- CLI unit tests: vault discovery, `.jtype/cloud.json` round-trip, `.board` exclusion,
  `safe_join` path-escape rejection, write-through body assembly.
- CLI e2e (`services/jtype-cli/tests/e2e.sh`): the **local-first** note flow runs in a temp
  vault with **no server** (create → list → get → search on disk). The cloud flow (bind →
  write-through push → `sync` pull round-trip, board/card, MCP, tokens) runs against a live
  server when one is reachable.

## 10. Doc deltas applied in this phase

- `01-prd.md` §FR-C5: the `obsidian enable/status/push/pull` surface is revised — notes are
  local-first against the cwd vault; `jtype bind` + `jtype sync` replace `obsidian
  enable/push/pull`. A pointer to this doc is added.
- `02-design.md` §5: the config shape `{…, vaults: {<path>: {workspace_id}} }` is corrected
  (per-vault binding lives in `.jtype/cloud.json`, not in `cli.json`); the note commands and
  `obsidian` commands are revised to the local-first model. The MCP-server sections (§1–§4)
  are unchanged.
