# JType Runtime Guide

## 1. What Runs Today

JType has two Rust backends plus one web frontend:

- **Desktop backend**: `src-tauri/src/lib.rs` registers Tauri commands, and `src-tauri/src/workspace.rs` implements local vault behavior.
- **Web backend**: `services/jtype-web/src/main.rs` and `services/jtype-web/src/lib.rs` run the Axum HTTP service for auth, OAuth, cloud workspaces, sync, publishing, admin, and public sites.
- **Web frontend**: `services/jtype-web/frontend/` provides the browser UI for landing, login, dashboard, online editing, settings, and admin.

Runtime layers:

- Embedded desktop backend: Rust commands inside the Tauri app.
- Desktop frontend: React/Vite UI in `src/`.
- JType web service: Axum server in `services/jtype-web`.
- Service infrastructure: Docker MySQL + RustFS.

The desktop app does not need MySQL or RustFS for local editing. It can open a vault, open a single Markdown file, edit, preview, export static HTML, and build AI indexes through the embedded Rust backend.

MySQL and RustFS become relevant when the user connects cloud sync, web editing, publishing, domains, storage budgets, and admin.

## 2. Start The Desktop App

Development mode:

```bash
npm run tauri dev
```

Frontend-only preview:

```bash
npm run dev
```

Build installer:

```bash
npm run tauri build
```

The Windows installer is generated under:

```text
src-tauri/target/release/bundle/nsis/
```

## 3. Start Local Services

Copy environment defaults if needed:

```bash
copy .env.example .env
```

Start MySQL, RustFS, and the web service:

```bash
docker compose up -d
```

Check status:

```bash
docker compose ps
```

Stop services:

```bash
docker compose down
```

MySQL:

```text
mysql://jtype:jtype-local@127.0.0.1:3306/jtype
```

RustFS:

```text
S3 API: http://127.0.0.1:9000
Console: http://127.0.0.1:9001
```

JType web:

```text
http://127.0.0.1:13345
```

## 4. How Desktop Talks To Local Files

The React frontend calls Tauri commands:

```ts
import { invoke } from "@tauri-apps/api/core";

const workspace = await invoke("open_workspace", { path });
```

Command names still use `workspace` internally for compatibility, but UI copy should say **vault** for local folders.

Commands are registered in `src-tauri/src/lib.rs` and implemented in `src-tauri/src/workspace.rs`.

Local commands handle:

- opening the default vault at `~/Documents/.jtype`
- opening a selected vault folder
- opening a single Markdown file
- building the file tree
- creating/renaming/deleting entries
- reading/writing Markdown
- writing `.jtype/workspace.json`
- writing `.jtype/publish.json`
- exporting `.jtype/dist`
- writing `.jtype/ai-context.jsonl`

## 5. How Desktop Talks To Cloud

Desktop never talks directly to MySQL or RustFS.

Desktop cloud flow:

```text
Desktop React UI
  -> Tauri commands for local files/profile/bindings
  -> HTTP fetch to JType web service
  -> Axum validates auth, workspace membership, budget, versions, and conflicts
  -> MySQL/RustFS behind the web service
```

Important local state:

- Cloud profile: server URL, user, site URL, token, device ID.
- Vault bindings: cloud workspace ID to local vault path.

## 6. Sync Flow

1. Start services with `docker compose up -d`.
2. Start desktop with `npm run tauri dev`.
3. Open or create a local vault.
4. Click account/cloud entry in the top right.
5. Click "Connect in browser".
6. Complete OAuth on the web service.
7. Return to desktop and sync the current vault with a cloud workspace.
8. Visit the public site at `/u/:username` once documents are published.

## 7. Public Site Routes

Published sites use:

```text
/u/:username
/u/:username/:page_path
```

Do not use bare `/:username`, because web SPA routes like `/workspaces/:id` need the root namespace.

## 8. ACL Notes

Tauri plugin commands must be allowed in `src-tauri/capabilities/default.json`.

The app needs permissions for:

- dialog open for file/folder picker
- filesystem read/write for selected Markdown files and vaults
- opener URL/path actions for OAuth and exported preview
- custom Tauri commands for local vault operations

After changing ACL permissions, restart `npm run tauri dev` or rebuild the packaged app.
