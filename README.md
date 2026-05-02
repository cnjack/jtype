# JType

JType is a local-first Markdown vault editor with desktop editing, cloud workspace sync, web editing, publishing, and AI-ready indexing.

The product model is:

- **Vault**: a local Markdown folder on the user's device.
- **Cloud workspace**: the server-side collaboration, sync, publishing, budget, and membership boundary.
- **Vault binding**: a per-device mapping from one cloud workspace to one local vault path.
- **Site**: the published read-only output for a user/workspace.

Desktop remains local-first. Web owns identity, OAuth, cloud workspaces, admin, custom domains, and online editing.

## Current App Experience

- First launch shows a welcome screen with:
  - Use default vault (`~/Documents/.jtype`)
  - Open vault
  - Open Markdown file
  - Recent vaults/files
- Opening a vault with no selected document shows a vault home state, not a disabled editor.
- Single-file mode is a focused Markdown editor with no sync, account, or publish surfaces.
- Vault mode includes file navigation, quick open, document editor, split preview, document info, publishing checks, and account/cloud sync.
- Desktop login is browser-based OAuth through the web service. Desktop does not collect passwords.

## Architecture

```text
Desktop App (Tauri 2)
  Frontend: React + TypeScript + Vite + Tailwind CSS (src/)
  Backend: Rust commands in src-tauri/src/
  IPC: Tauri invoke bridge

Web Service
  Backend: Axum in services/jtype-web/src/
  Web frontend: React app in services/jtype-web/frontend/
  Data: MySQL + RustFS via docker-compose.yml

Tests
  App E2E: tests/e2e/app.spec.ts
  Web E2E: tests/e2e/web-dashboard.spec.ts
  Rust tests: src-tauri and services/jtype-web
```

## Run

```bash
npm install
npm run tauri dev
```

Frontend-only preview:

```bash
npm run dev
```

Local web/cloud services:

```bash
docker compose up -d
```

The default cloud service URL is `http://localhost:13345`.

## Backend Locations

There are two Rust backends in this repo:

- Desktop embedded backend: `src-tauri/src/lib.rs` and `src-tauri/src/workspace.rs`
  - Used by Tauri for local files, vault operations, static export, validation, profile storage, vault bindings, and AI index generation.
  - Starts automatically with `npm run tauri dev`.
- Companion web backend: `services/jtype-web`
  - Axum service for registration/login, device OAuth, cloud workspaces, sync, conflicts, admin, settings, custom domains, and public sites.
  - Starts with Docker Compose.

The desktop app talks to the web backend over HTTP. It should not connect directly to MySQL or RustFS.

## URLs

- Web landing: `http://localhost:13345/`
- Dashboard and app pages: handled by the web SPA.
- Published sites: `/u/:username` and `/u/:username/:page_path`

Do not use bare `/:username` routes for public sites because they conflict with SPA routes like `/workspaces/:id`.

## Build

```bash
npm run build
npm run tauri build
```

## Test

```bash
npm run build
npx playwright test tests/e2e/app.spec.ts
npm run test:web
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path services/jtype-web/Cargo.toml --lib
```

`npm run test:e2e` runs the configured Playwright suite. For focused desktop app work, prefer `npx playwright test tests/e2e/app.spec.ts`.

## Documentation

- [Project plan](docs/plans.md)
- [Runtime guide](docs/runtime.md)
- [Service infrastructure](docs/services.md)
- [Vault/cloud PRD](docs/vault-cloud-prd.md)
- [Vault/cloud architecture](docs/vault-cloud-architecture.md)
- [UX suggestions](suggestion.md)
- Agent guides:
  - [Frontend](docs/agents/frontend.md)
  - [Tauri backend](docs/agents/tauri-backend.md)
  - [Web service](docs/agents/web-service.md)
  - [Testing](docs/agents/testing.md)

## Notes

- Markdown rendering uses `marked`, `dompurify`, KaTeX, and Mermaid.
- The desktop app uses Tauri dialog, filesystem, and opener plugins.
- AI UI remains hidden until real AI functionality is ready, but indexing infrastructure exists.
- The current Windows bundle target is `nsis`.
