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

## New Feature Workflow

Do not assume that every feature belongs on every surface. Before implementation,
analyze where the capability belongs, which layers it affects, what can be
shared, and which artifacts or documentation must follow it. The result may be
Desktop-only, Web-only, shared across both, package-only, or backend-only.

### 1. Feature Impact Analysis

Before editing code, add an impact matrix to the implementation notes or PR.
Mark every row **Yes**, **No**, or **N/A**, and give a short reason. A "No"
decision is valid; it just must be deliberate.

| Area | Questions to answer |
|------|---------------------|
| Desktop app | Does this support local-first/offline vault work, local files, Tauri capabilities, or a focused desktop workflow? What is its entry point and persistence adapter? |
| Web app | Does this require cloud workspaces, collaboration, members/roles, admin, publishing, browser access, or server-owned data? What is its entry point and permission behavior? |
| Shared model/utilities | Do Desktop, Web, the board package, CLI, MCP, or backend need the same types, validation, IDs, parsing, or transformations? |
| Shared UI | Is the interaction and information architecture materially the same on Desktop and Web? Can it stay props-in/callbacks-out without platform branches? |
| Web service/API | Does it change HTTP contracts, auth, persistence, migrations, events, sync, conflicts, budgets, webhooks, or storage? |
| `packages/board-react` | Does the embeddable Kanban package expose or persist the affected board capability? Does its public API, types, bundle, example, or README need to change? |
| CLI/MCP | Should automation or headless users be able to read or mutate the feature? Do tool schemas or help text need updates? |
| In-app Help | Does the feature add or change a user-visible workflow, setting, limitation, or concept covered by the Help Center? |
| Other docs | Do README, API docs, internal design docs, screenshots, examples, or release notes become inaccurate? |
| Release/deployment | Which artifacts must be rebuilt or promoted: Desktop installers, Web image, board package, CLI binaries, or none? |

Use repository searches to support the matrix. Do not infer that a change is
isolated from its filename.

### 2. Surface Decision Rules

Choose surfaces based on product responsibility, not symmetry:

- Prefer **Desktop** for local vault and filesystem workflows, offline behavior,
  native OS integration, and single-file editing.
- Prefer **Web** for cloud collaboration, member/role-aware behavior, admin,
  publishing, and server-only capabilities.
- Implement on **both** when the same user-owned document or board can be opened
  and edited on both surfaces and inconsistent behavior would corrupt, hide, or
  surprise users.
- A feature can intentionally differ by surface. Keep the domain model
  compatible, then document the UX difference and its reason.
- Do not add placeholder UI to a surface that cannot provide the real behavior.

For each affected surface, define the entry point, default/empty state,
existing-data state, read-only/permission state, persistence path, error
recovery, and user-visible acceptance criteria.

### 3. Decide What To Share

Share the smallest stable layer that is genuinely common:

- Put common types, parsing, validation, stable IDs, migrations, and pure
  transformations in `shared/lib/` when multiple consumers need them.
- Put UI in `shared/components/` only when Desktop and Web have substantially
  the same interaction. Shared UI must remain props-in/callbacks-out.
- Keep platform data access in adapters: Tauri/filesystem behavior in `src/`,
  Web API behavior in `services/jtype-web/frontend/src/`.
- If workflows differ, share primitives or the domain model instead of forcing
  a single component full of platform conditionals.
- A shared component is not proof of integration. Each selected host still
  needs an explicit entry point, adapter, and persistence test.

### 4. Decide Whether Kanban Package Changes

Update `packages/board-react` when the feature changes board data or behavior
that external embedded boards should expose. In that case:

- Update package source, public props/types, adapters, and localized strings as
  applicable.
- Update `packages/board-react/README.md` and the example when consumers need new
  setup or behavior guidance.
- Rebuild the checked-in `packages/board-react/dist/` output.
- Run `npm run build` and `npm test` from `packages/board-react/`.

Do not update the package for app-shell-only behavior, Desktop filesystem
features, Web admin UI, or other capabilities the embeddable board cannot use.
Record that decision in the impact matrix.

### 5. Decide Whether Documentation Changes

Update documentation when the feature changes what a user can do, how they find
it, its data model, configuration, permissions, limitations, or recovery flow.

- In-app Help lives in
  `services/jtype-web/frontend/src/help/content/`. Update the relevant article
  source and maintained locale variants when the user workflow changes.
- Update `packages/board-react/README.md` for public package behavior.
- Update API docs for contract or tool changes.
- Update internal design/ADR material when the architectural decision changes.
- Update screenshots, examples, and release notes when old material would
  misrepresent the product.

Docs are not required for invisible refactors with no behavior or contract
change. State why docs are unchanged in the impact matrix.

### 6. Implement And Test The Selected Scope

Implementation and verification follow the matrix; unaffected surfaces are not
modified merely for parity.

- Add unit tests for shared models and transformations.
- Add a real Desktop entry-point/persistence test when Desktop is **Yes**.
- Add a real Web entry-point/API persistence test when Web is **Yes**.
- Add package tests and rebuild `dist/` when `packages/board-react` is **Yes**.
- Add API/Rust tests when service contracts or persistence are **Yes**.
- Test discoverability from the normal default state, not only a fixture where
  the feature is already enabled.
- A shared fixture is useful for component behavior but does not replace the
  selected host integration tests.

### 7. Review, Release, And Verify

- The PR must include the completed impact matrix, acceptance criteria, tests
  run, documentation decisions, migration notes, and visuals for each changed UI
  surface.
- Review the user flow from its real entry point and default state.
- Build and release only the affected artifacts identified in the matrix.
- Verify every released artifact comes from a commit containing the change.
- Promote Kubernetes changes with an explicit context and namespace.
- `/health` proves service availability, not feature completion. Run a
  feature-specific smoke test on every promoted or published surface, including
  persistence after reload where applicable.

### Definition Of Done

A feature is complete when:

- Every impact area has a Yes/No/N/A decision with rationale.
- Every **Yes** area is implemented, tested, documented, and released as needed.
- Shared code is used only where the model or interaction is genuinely shared.
- Every selected UI surface exposes the feature from a discoverable real entry
  point and handles its relevant states.
- Package bundles, public types, examples, and Help content are updated when
  their impact rows are **Yes**.
- Feature-specific verification passes on the artifacts and environments that
  were actually released.
