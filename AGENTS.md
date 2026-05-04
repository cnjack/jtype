# JType Agent Guide

JType is a **local-first Markdown vault** built with Tauri 2, Rust, React, TypeScript/Vite, Tailwind CSS, and an Axum web service. It combines desktop Markdown editing, vault management, cloud workspace sync, web editing, publishing, and AI-ready indexing.

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
  - tests/e2e/app.spec.ts             Playwright desktop-app E2E with Tauri/fetch mocks
  - tests/e2e/web-dashboard.spec.ts   Playwright web E2E
  - Rust unit tests in src-tauri and services/jtype-web
```

## Key Concepts

- **Vault**: Local Markdown directory root. This is the user-facing term for local folders.
- **Cloud workspace**: Server-side isolation for members, documents, versions, sync, publishing, and budget.
- **Vault binding**: Device-local mapping from a cloud workspace to a local vault path.
- **Cloud profile**: Desktop global state for server URL, user, token, site URL, and device ID.
- **Site**: Published read-only web output.
- **Sync**: Bidirectional push/pull with workspace-scoped cursors, merge, and conflict resolution.

## Current Desktop UX Rules

- Empty mode shows the welcome screen.
- Opening a vault with no selected document shows `VaultHome`, not the editor shell.
- Single-file mode is a pure Markdown editor. Do not show account, sync, publish, or vault sidebar surfaces.
- Vault mode may show sidebar navigation, quick open, document editor, preview, document info, account/cloud sync, and publishing checks.
- Header actions must be mode-aware:
  - Empty: product identity and account entry only.
  - Vault with no document: quick open and account/cloud.
  - Document: save only when dirty.
  - Single file: open file and save.
- User-facing copy should say "vault" for local folders and "cloud workspace" for server-side collaboration.
- Avoid exposing AI UI until real AI functionality is enabled.

## Domain Agent Files

Detailed guidelines for each domain are in separate files:

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
| Web service check | `cargo check --manifest-path services/jtype-web/Cargo.toml` |
| Docker services | `docker compose up -d` |
| Docker build web | `docker compose build jtype-web` |

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

The SPA frontend handles dashboard, workspace, settings, admin, and OAuth routes. Do not use bare `/:username` for published sites because it conflicts with SPA routes like `/workspaces/:id`.

## Iconography

- **All UI icons must use Heroicons** (`@heroicons/react`).
- Replace any existing custom SVG icons with Heroicons equivalents.
- Action buttons should display an **icon + tooltip** (hide text label, use `title` attribute for tooltip).
- This rule applies to both the desktop app frontend and the web service frontend.

## UI Components

- **All Disclosure, Dialog, Dropdown Menu, and Popover components must use `@headlessui/react`**.
- Do not implement custom modal backdrops, dropdown toggles, or focus traps by hand.
- Use `Dialog` + `DialogPanel` for modals, `Menu` + `MenuButton` + `MenuItems` for dropdowns.
- This rule applies to both the desktop app frontend and the web service frontend.

## API Contract Sync Reminder

The desktop app frontend and web service share a hardcoded HTTP API contract. When modifying either side, update the other:

- Endpoint paths
- Request/response body shapes
- Auth header logic
- Public site route formats
- OAuth device-flow payloads
- Sync pull/push/conflict shapes

Search both frontend and web service code before assuming a change is isolated.
