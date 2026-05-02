# Testing Agent Guide

## Framework

- **E2E**: Playwright, Chromium
- **Desktop app config**: `playwright.config.ts`, Vite dev server on port 1420
- **Web config**: `playwright.web.config.ts`
- **Desktop app tests**: `tests/e2e/app.spec.ts`
- **Web dashboard tests**: `tests/e2e/web-dashboard.spec.ts`

## Running Tests

```bash
npm run build
npx playwright test tests/e2e/app.spec.ts
npm run test:web
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path services/jtype-web/Cargo.toml --lib
cargo check --manifest-path services/jtype-web/Cargo.toml
```

For app-only frontend changes, run:

```bash
npm run build
npx playwright test tests/e2e/app.spec.ts
```

## Desktop E2E Pattern

Desktop app E2E runs against the Vite dev server, not a real Tauri window. Tauri commands and web API calls are mocked in `test.beforeEach()`.

```typescript
window.__TAURI_INTERNALS__ = {
  invoke: async (cmd, args) => { /* mock Tauri command */ }
};

window.fetch = async (input, init) => { /* mock web API */ };
window.__E2E_FS__ = { /* in-memory file system */ };
window.__SYNC_REQUESTS__ = [];
window.__VAULT_BINDINGS__ = [];
```

## Locator Rules

- Prefer accessible locators: `getByRole`, `getByLabel`.
- Use scoped locators when the UI has duplicate text:
  - `page.locator("#workspace-sidebar").getByRole(...)`
  - `page.locator("#command-results").getByRole(...)`
  - `page.locator("#quick-results").getByRole(...)`
- Do not rely on old `MD` / `WS` prefixes; user-facing labels are now readable.
- Avoid matching global text when the same note appears in sidebar, vault home, recent list, and command palette.

## Important Helpers

- `openWorkspace(page)`: clicks `#welcome-open-folder`.
- `openFile(page)`: opens the command palette and chooses "Open Markdown file".
- For vault-home flows, assert `#vault-home` before selecting a document.

## Mock Responses Currently Handled

Tauri commands include:

- `initial_open_paths`
- `load_cloud_profile`
- `save_cloud_profile`
- `list_vault_bindings`
- `bind_cloud_workspace`
- `open_default_vault`
- `plugin:event|listen`
- `plugin:dialog|open`
- `open_workspace`
- `read_markdown_file`
- `write_markdown_file`
- `create_workspace_entry`
- `rename_workspace_entry`
- `delete_workspace_entry`
- `export_static_site`
- `validate_workspace`
- `plugin:opener|open_path`
- `plugin:opener|open_url`
- `build_ai_index`
- `collect_sync_documents`
- `apply_cloud_documents`

Fetch URLs include:

- `/api/register`
- `/api/login`
- `/api/oauth/device/start`
- `/api/oauth/device/poll`
- `/api/v1/workspaces`
- `/api/v1/workspaces/:id/sync/pull`
- `/api/v1/workspaces/:id/sync/push`
- `/api/v1/workspaces/:id/conflicts/:id/resolve`
- `/api/sync/workspace`

## Current App E2E Coverage

- Welcome screen and default vault opening
- Vault home when a vault is open with no selected document
- Workspace/vault sidebar file opening
- Single-file mode without sidebar/account/sync
- Editing and saving
- Static export from document info
- Browser OAuth connect and sync
- Command palette
- Quick switcher from vault home
- Frontmatter properties
- Outline
- Favorites
- Publish panel
- Split preview
- KaTeX formulas
- Mermaid diagrams
- Table insert/edit/context actions
- Cloud edit pull
- Desktop edit push
- Sync conflicts and resolution
- Workspace invite accept and local vault binding

## Regression Risks To Test

- Header buttons in empty, vault-home, document, and single-file modes.
- Info panel staying as a right inspector on desktop widths.
- No-document vault state not showing document publish controls.
- Table/Formula/Mermaid insertions around fenced code blocks.
- Account dialog workspace binding rows and current binding status.
- Public site URL route format `/u/:username`.
