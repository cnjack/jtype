# JType Agent Guide

JType is a **local-first Markdown vault** built with Tauri 2, Rust, React, TypeScript/Vite, Tailwind CSS, and an Axum web service.

## Architecture

```text
Desktop App (Tauri 2)
  - Frontend: React + TypeScript + Vite + Tailwind CSS (src/)
    - src/app/              App state, command context
    - src/components/       Layout, editor, sidebar, modals
    - src/hooks/            Filesystem, cloud sync, commands, shortcuts
    - src/lib/              Markdown, frontmatter, storage, Tauri wrapper
  - Backend: Rust (src-tauri/src/)
    - lib.rs                Tauri command registration, cloud profile, vault bindings
    - workspace.rs          File I/O, vault ops, publishing, validation, AI indexing
  - IPC: Tauri invoke() bridge

Web Service (Axum)
  - services/jtype-web/src/           Axum APIs, auth, sync, publishing, admin
  - services/jtype-web/frontend/      Web React frontend
  - infra/mysql/001_init.sql          Database schema
  - docker-compose.yml                MySQL + RustFS + jtype-web

Tests
  - tests/e2e/app.spec.ts             Playwright desktop-app E2E
  - tests/e2e/web-dashboard.spec.ts   Playwright web E2E
  - Rust unit tests in src-tauri and services/jtype-web
```

## Key Concepts

- **Vault**: Local Markdown directory root. User-facing term for local folders.
- **Cloud workspace**: Server-side isolation for members, documents, versions, sync, publishing, and budget.
- **Vault binding**: Device-local mapping from a cloud workspace to a local vault path.
- **Cloud profile**: Desktop global state for server URL, user, token, site URL, and device ID.
- **Site**: Published read-only web output.
- **Sync**: Bidirectional push/pull with workspace-scoped cursors, merge, and conflict resolution.

## Desktop UX Rules

- Empty mode shows the welcome screen.
- Opening a vault with no selected document shows `VaultHome`, not the editor shell.
- Single-file mode is a pure Markdown editor; hide account, sync, publish, and vault sidebar.
- Vault mode may show sidebar navigation, quick open, document editor, preview, document info, account/cloud sync, and publishing checks.
- Header actions must be mode-aware: empty (product identity + account entry only), vault with no document (quick open + account/cloud), document (save when dirty), single file (open file + save).
- User-facing copy: say "vault" for local folders, "cloud workspace" for server-side collaboration.
- Avoid exposing AI UI until real AI functionality is enabled.
- Remind to keep the same experience between desktop and web — no web-only features that aren't planned for desktop.

## Domain Agent Files

- [Frontend](docs/agents/frontend.md): UI, React state, commands, rendering
- [Backend (Tauri)](docs/agents/tauri-backend.md): Desktop Rust commands, file ops
- [Web Service](docs/agents/web-service.md): Axum API, auth, sync, publishing
- [Testing](docs/agents/testing.md): E2E patterns, mocking, test commands

## Quick Commands

| Task | Command |
|------|---------|
| Dev (desktop) | `npm run tauri dev` |
| Dev (frontend only) | `npm run dev` |
| Build frontend | `npm run build` |
| App E2E tests | `npx playwright test tests/e2e/app.spec.ts` |
| Web E2E tests | `npm run test:web` |
| All configured E2E | `npm run test:e2e` |
| Tauri Rust tests | `cargo test --manifest-path src-tauri/Cargo.toml` |
| Web service tests | `cargo test --manifest-path services/jtype-web/Cargo.toml --lib` |
| Web service API tests | `cargo test --manifest-path services/jtype-web/Cargo.toml` |
| Web service check | `cargo check --manifest-path services/jtype-web/Cargo.toml` |
| Docker services | `docker compose up -d` |
| Docker build web | `docker compose build jtype-web` |

## API Integration Testing

Integration tests for the web service live in `services/jtype-web/tests/`, organized by API group. Each file is an independent test binary. Shared helpers are in `tests/common/mod.rs`.

### Rules

- Use `tower::ServiceExt::oneshot` (not reqwest or a live server) for API tests.
- Never reuse `app` across `req` calls without `.clone()` — `oneshot` consumes the service.
- Each `#[tokio::test]` must call `common::setup().await`.
- Use `common::uid()` / `common::wname()` for test data names.
- Add corresponding test cases when adding new endpoints.
- DB migrations must not be edited after deployment — add new versioned files instead.
- Admin tests promote users via direct SQL `UPDATE users SET role='admin'`.

## Naming Conventions

- User-facing local directory: "vault"
- User-facing server-side collaboration boundary: "cloud workspace"
- Internal code: `workspace` in Rust types/commands and `state.workspace` is acceptable for compatibility.
- DOM IDs may still use `workspace-*` when tied to existing tests or internal APIs.
- User-visible text should not say "workspace" for local-only contexts.

## URL Routing Conventions

Public published sites use the `/u/:username` prefix:

- `/u/:username`: user's published site index
- `/u/:username/:page_path`: individual published page

The SPA frontend handles dashboard, workspace, settings, admin, and OAuth routes. Do not use bare `/:username` for published sites because it conflicts with SPA routes.

## Iconography

- All UI icons must use **Heroicons** (`@heroicons/react`).
- Replace any existing custom SVG icons with Heroicons equivalents.
- Action buttons should display an **icon + tooltip** (hide text label, use `title` attribute).

## UI Components

- All Disclosure, Dialog, Dropdown Menu, and Popover components must use `@headlessui/react`.
- Do not implement custom modal backdrops, dropdown toggles, or focus traps by hand.
- Use `Dialog` + `DialogPanel` for modals, `Menu` + `MenuButton` + `MenuItems` for dropdowns.

## API Contract Sync

The desktop app frontend and web service share a hardcoded HTTP API contract. When modifying either side, update the other:

- Endpoint paths
- Request/response body shapes
- Auth header logic
- Public site route formats
- OAuth device-flow payloads
- Sync pull/push/conflict shapes

Search both frontend and web service code before assuming a change is isolated.

## TypeScript Type & Utility Discipline

- **Canonical types** live in `src/lib/types.ts`. Never redefine types inline in components, hooks, or `main.ts`.
- **`RecentItem`**, **`FileTreeNode`**, **`SyncConflict`**, **`AppCommand`**, etc. — import from `src/lib/types.ts`.
- **`main.ts`** is a legacy vanilla-JS layer. It has its own `Activity` and `AppState` types that intentionally differ from the React app's types. Do not merge them blindly.
- **Frontmatter utilities** (`parseFrontmatter`, `writeFrontmatter`, `titleFromMarkdown`) live in `src/lib/frontmatter.ts`. Do not reimplement inline.
- **Markdown rendering** (`renderMarkdownToHtml`) lives in `src/lib/markdown.ts`. The web frontend has a copy at `services/jtype-web/frontend/src/lib/markdown.ts` — keep them in sync until a shared package is created.

## Rust Cross-Platform Consistency

Tauri desktop (`src-tauri/src/workspace.rs`) and web service (`services/jtype-web/src/util.rs`) share equivalent utilities. When modifying one, check the other:

| Utility | Tauri | Web Service |
|---------|-------|-------------|
| `parse_frontmatter` | `workspace.rs` | `util.rs` |
| `extract_title` | `workspace.rs` | `util.rs` |
| `normalize_status` | `workspace.rs` | `util.rs` |
| `validate_folder_name` / `normalize_folder_path` | `workspace.rs` | `util.rs` |

### Rules

- **`parse_frontmatter`** must normalize `\r\n` → `\n` before parsing. Both copies do this.
- **`extract_title`** must check frontmatter `title` field first, then fall back to `# heading`.
- **`normalize_status`** must check both `status: draft` and `publish: false`. Use the extracted function, not inline logic.
- **Reserved folder names** (`.jtype`, `.git`, `node_modules`, `target`) must match between Tauri's `validate_folder_name` and web's `normalize_folder_path`.

## Trash Operation Dedup

Trash SQL logic lives in `services/jtype-web/src/handlers/trash.rs` as reusable core functions:

- `restore_trash_item_core()` — restores a trashed document, enforces workspace budget
- `permanent_delete_core()` — permanently deletes a trash item, writes trash event
- `empty_trash_core()` — bulk deletes all trash, writes trash event

The sync handler (`sync.rs` `process_trash_operation`) calls these core functions. **Never duplicate trash SQL in sync.rs** — add new logic to `trash.rs` core functions instead.

## Shared UI Component Layer

Desktop (`src/`) and Web (`services/jtype-web/frontend/src/`) share a common UI component layer via path alias `@shared` pointing to `shared/`.

### Directory Structure

```text
shared/
├── components/     # Shared React components (dialogs, editor, toolbar, tree)
├── hooks/          # Shared React hooks (scroll sync, tooltip, prompt, confirm)
├── lib/            # Shared utilities (markdown, frontmatter, http, types)
└── styles/         # Shared CSS (design tokens, component classes, preview)
```

### Vite Alias

Both frontends resolve `@shared` via `vite.config.ts`:
- Desktop: `'@shared': path.resolve(__dirname, 'shared')`
- Web: `'@shared': path.resolve(__dirname, '../../../shared')`

Both `tsconfig.json` have matching `paths` entries.

### Shared Component Design Principles

1. **Props-in, Callbacks-out** — Shared components only accept props and callbacks. Never import `@tauri-apps/api`, `invoke()`, or platform-specific `fetch`/`api.ts` inside `shared/`.
2. **Data adaptation in platform layer** — Shared components define interfaces (e.g. `FileTreeNodeData`). Platform code converts Tauri IPC or REST API data to those interfaces before passing as props.
3. **Semantic Tailwind classes only** — Use `text-brand`, `bg-brand-soft`, etc. from `shared/styles/tokens.css`. Never hardcode hex values (`#008884`) in shared components.
4. **Extend via slots, not branches** — When a feature is platform-specific, use `extraActions` / `renderProps` slots instead of `if (isTauri)` branches.
5. **No state management coupling** — Shared components must not depend on `useReducer`, `useState`, or any specific state pattern. Accept state via props.

### Design Token Rules

- All brand colors are defined as `@theme` CSS variables in `shared/styles/tokens.css`.
- Desktop and Web CSS entry files `@import '@shared/styles/tokens.css'`.
- Replace all hardcoded hex references (`text-[#008884]`, `bg-[#006f6b]`, etc.) with semantic classes (`text-brand`, `bg-brand-dark`, `bg-brand-soft`).
- Token mapping: `--color-brand: #008884`, `--color-brand-dark: #006f6b`, `--color-brand-soft: #e8f6f2`, `--color-brand-gray: #6f817a`, `--color-brand-light: #22b8ad`, `--color-line: rgb(13 13 12 / 0.06)`.

### Known Shared Code (Former Duplication)

The following files live in `shared/lib/` and are imported by both frontends:

| Shared (`shared/lib/`) | Former Desktop | Former Web |
|------------------------|----------------|------------|
| `markdown.ts` | `src/lib/markdown.ts` | `services/jtype-web/frontend/src/lib/markdown.ts` |
| `frontmatter.ts` | `src/lib/frontmatter.ts` | `services/jtype-web/frontend/src/lib/frontmatter.ts` |
| `http.ts` | `src/lib/http.ts` | `services/jtype-web/frontend/src/lib/http.ts` |

### Shared CSS Component Classes

Shared component CSS classes live in `shared/styles/components.css`. Both frontends import this file. Platform-specific classes remain in their respective CSS entry files.

### When Modifying Shared Code

- Changes to `shared/` affect both Desktop and Web. Verify both builds pass.
- When adding a new shared component, follow the Props-in/Callbacks-out pattern.
- When a shared component needs platform-specific behavior, add a slot prop — do not add platform detection.
