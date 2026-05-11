# Vault Cloud: Gaps Between Docs and Implementation

> Compares what the original docs describe vs what's actually implemented. Each gap is classified as **TODO** (should be built) or **REMOVE** (remove from docs).

## 1. OAuth Flow

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| Authorization Code + PKCE flow with `jtype://oauth/callback` custom protocol | Device flow: `POST /api/oauth/device/start`, `approve`, `poll` | **REMOVE** — Device flow is simpler and works. Remove PKCE/callback references from docs. |

## 2. Sync Protocol

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| 3-step sync: `sync/plan` → `sync/upload` → `sync/commit` with manifest | 2-step: `sync/push` (send changes) + `sync/pull` (receive changes) with `sync_clock` cursor | **REMOVE** — The plan/upload/commit protocol was never built. Docs should describe push/pull + clock. |
| Manifest-based sync with `clientCommitId` and per-file SHA256 | Push sends individual file changes with `base_version_id`; pull returns changes since clock | **REMOVE** — Manifest concept not used. |
| Desktop builds `sync-manifest.json` in `.jtype-meta/` | No local manifest file | **REMOVE** |

## 3. Database Tables

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| `vaults` table (server-side) | `workspaces` table | **REMOVE** — Renamed. Server uses "workspace" not "vault". |
| `oauth_clients` table | Not implemented (device flow doesn't need it) | **REMOVE** |
| `oauth_authorization_codes` table | `oauth_device_codes` table instead | **REMOVE** |
| `device_tokens` table | Not a separate table; device info tracked via `oauth_device_codes` + user devices API | **REMOVE** |
| `vault_sync_commits` table | Not implemented; sync uses `workspace.sync_clock` | **REMOVE** |
| `storage_usage` table | Not implemented as a separate table | **TODO** — Useful for budget enforcement. Currently budget checks may be inline. |
| `site_settings` table | Not a separate table; site settings stored in user fields or workspace | **REMOVE** |
| `workspace_folders` table | Implemented ✓ | OK |
| `workspace_folder_deletions` table | Implemented ✓ | OK |
| `document_trash` + `trash_events` tables | Implemented ✓ | OK |

## 4. Object Storage

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| Document content stored in RustFS/S3 as versioned objects | Document content stored in MySQL (`documents` table) | **REMOVE** — Update docs. Content is in MySQL for now. |
| Asset upload to RustFS with URL rewriting | Not implemented | **TODO** — Phase 7 in plans.md, not yet started. |
| Object storage layout: `workspaces/{id}/documents/{id}/versions/{id}.md` | Not used | **REMOVE** — Remove until object storage is actually used. |
| Budget enforcement via projected usage calculation before upload | Budget enforcement exists but may not match the described protocol | **TODO** — Verify and document actual budget logic. |

## 5. WebSocket

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| Not explicitly described in original architecture | Single shared WS at `/api/v1/live`, not workspace-scoped | **OK** — Document as-is. Not a gap, just missing from original design docs. |

## 6. Desktop Architecture

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| Desktop modes: `first-run`, `vault-local`, `vault-cloud`, `single-file` | Modes: `welcome`, `vault-home`, `document-edit`, `single-file` | **REMOVE** — Update to actual mode names. |
| `.jtype-meta/` directory with `vault.json`, `index.sqlite`, `sync-manifest.json`, `versions/` | `.jtype/` directory with `workspace.json`. No SQLite index, no sync-manifest, no local versions dir | **REMOVE** — Simplify to actual `.jtype/workspace.json`. |
| Local SQLite index for file summaries, frontmatter, backlinks | Not implemented; file tree built from filesystem scan | **REMOVE** — Was aspirational. Remove unless planned. |
| `vault.json` with `remoteVaultId`, vault `id`, `version` | `workspace.json` with simpler structure | **REMOVE** |
| Suggested directory structure: `inbox/`, `notes/`, `published/`, `assets/` | No enforced structure; user creates whatever folders they want | **REMOVE** — Don't prescribe directory structure. |
| Frontend module structure: `vault/`, `sync/`, `version/`, `tauri/` directories | Actual structure: `app/`, `components/`, `hooks/`, `lib/` | **REMOVE** — Update to actual. |
| Rust modules: `vault.rs`, `files.rs`, `oauth.rs`, `sync.rs`, `keychain.rs`, `protocol.rs` | Actual: `lib.rs`, `workspace.rs`, `ws_client.rs` | **REMOVE** — Update to actual. |

## 7. Web Service Architecture

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| Module structure with `auth/`, `landing/`, `dashboard/`, `admin/`, `vaults/`, `publishing/`, `domains/`, `storage/`, `workers/` | Actual: `handlers/` directory with per-feature files | **REMOVE** — Update to actual structure. |
| Published site route: `/@{username}` and `/@{username}/{path}` | Actual route: `/u/:username` and `/u/:username/:workspace_slug/*page_path` | **REMOVE** — `@` prefix was never used; `/u/` is actual. |
| Background workers for `usage.rs`, `ssl_checks.rs` | Not implemented as separate workers | **TODO** — May be useful for SSL expiry checks and usage recalculation. |
| Server-rendered HTML from Rust templates | Web frontend is a React SPA | **REMOVE** — SPA is actual. |

## 8. Publishing

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| Static site export under `.jtype/dist` | Desktop can export static HTML locally ✓ | OK |
| Multiple publish targets (GitHub Pages, S3/R2, Cloudflare Pages) | Only JType Web serves published content | **REMOVE** — Not planned for near term. |
| Theme system with `theme` field | Not implemented; basic rendering only | **TODO** — Low priority. |
| Navigation mode configuration | Not implemented | **TODO** — Low priority. |

## 9. AI Features

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| `.jtype/ai-context.jsonl` index generation | Desktop can generate AI index ✓ | OK (but UI is hidden) |
| AI command layer with diff-before-write | AI command abstractions exist in code ✓ | OK (but hidden until real AI) |
| Embedding, semantic search, model providers | Not implemented | **REMOVE** — Remove from active docs. Add back when planned. |

## 10. Version Control

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| Each sync produces remote version; N versions retained per doc | `document_versions` table exists; version history API works | OK |
| Local fine-grained snapshots | Not implemented | **REMOVE** — Not planned for MVP. |
| Git-compatible export | Not implemented | **REMOVE** — Not planned. |
| Vault restore point / branching | Not implemented | **REMOVE** — Not planned. |

## 11. Sync Clock

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| Not described in original sync protocol | `workspaces.sync_clock` bigint, incremented on each change | **OK** — This is the actual mechanism; document it. |
| Clock reliability | May have bugs per context notes | **TODO** — Investigate and fix sync clock edge cases. |

## 12. Conflict Resolution

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| Four options: accept local, accept cloud, keep both, manual merge | Two options implemented: accept local, accept cloud | **TODO** — "keep both" and "manual merge" not yet built. Low priority. |
| Conflict files written as `notes/hello.conflict-20260502.md` | Conflicts stored in `sync_conflicts` table, resolved via API | **REMOVE** — Conflict file approach was superseded by DB-based conflicts. |

## 13. Misc

| Doc says | Actually implemented | Status |
|----------|---------------------|--------|
| Invite-only registration mode | Not implemented | **TODO** — Useful for self-hosted. |
| Token storage in OS keychain / Tauri stronghold | Stored in cloud profile file | **TODO** — Should use secure storage. |
| Markdown pipeline: unified/remark/rehype | Uses `marked` + `DOMPurify` | **OK** — Current approach works; unified is a future consideration. |
| CodeMirror 6 editor | Implemented ✓ | OK |

## Summary

| Category | REMOVE (outdated) | TODO (should build) |
|----------|-------------------|---------------------|
| OAuth | 1 | 0 |
| Sync protocol | 3 | 0 |
| Database | 5 | 1 |
| Object storage | 2 | 2 |
| Desktop architecture | 7 | 0 |
| Web service | 3 | 1 |
| Publishing | 2 | 2 |
| AI | 1 | 0 |
| Version control | 3 | 0 |
| Conflict resolution | 1 | 1 |
| Misc | 0 | 2 |
| **Total** | **28** | **9** |

Most gaps are architectural proposals that were superseded by simpler implementations. The 9 TODOs are genuine missing features, mostly low priority.
