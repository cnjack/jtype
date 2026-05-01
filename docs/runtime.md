# JType Runtime Guide

## 1. What Runs Today

JType currently has three backend-facing layers. If you are looking for "the backend", there are two Rust code locations:

- Desktop backend: `src-tauri/src/lib.rs` registers Tauri commands, and `src-tauri/src/workspace.rs` implements local file/workspace behavior.
- Web backend: `services/jtype-web/src/main.rs` and `services/jtype-web/src/lib.rs` implement the Axum HTTP service for login, sync, and public sites.

Runtime layers:

- Embedded desktop backend: Rust commands inside the Tauri app.
- JType web service: Rust Axum server in `services/jtype-web` for users, sync, and public websites.
- Service infrastructure: Docker MySQL + RustFS.

The desktop app does not need MySQL or RustFS for local editing. It can open folders, edit Markdown, export static HTML, and build AI indexes through the embedded Rust backend. MySQL is used when syncing a workspace to the companion website.

## 2. Start The Desktop App

Development mode:

```bash
npm run tauri dev
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

MySQL is available at:

```text
mysql://jtype:jtype-local@127.0.0.1:3306/jtype
```

RustFS endpoints:

```text
S3 API: http://127.0.0.1:9000
Console: http://127.0.0.1:9001
```

JType web:

```text
http://127.0.0.1:8080
```

## 4. How Desktop Talks To Backend

The frontend calls Tauri commands:

```ts
import { invoke } from "@tauri-apps/api/core";

const workspace = await invoke("open_workspace", { path });
```

Those commands are registered in `src-tauri/src/lib.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    open_workspace,
    read_markdown_file,
    write_markdown_file,
    export_static_site,
    validate_workspace,
    build_ai_index
])
```

The command implementation delegates to `src-tauri/src/workspace.rs`, which owns the local filesystem behavior:

- open workspace
- build file tree
- create/rename/delete entries
- read/write Markdown
- write `.jtype/workspace.json`
- write `.jtype/publish.json`
- export `.jtype/dist`
- write `.jtype/ai-context.jsonl`

## 5. How Services Will Fit

The Docker services and the hosted sync API are implemented for the current vertical slice.

Recommended next runtime shape:

```text
Desktop UI
  -> Tauri invoke
    -> Rust desktop command
      -> Local filesystem for local-first editing
      -> HTTP client to JType web service for sync/publish

JType web service
  -> MySQL for users, sessions, workspaces, and documents
  -> rendered public user sites at /@username
  -> RustFS for future published assets and bundles
```

Do not connect the desktop app directly to MySQL for normal product flows. Keep MySQL behind the Rust web service API so auth, sync conflicts, and publishing permissions can be enforced consistently.

## 6. Sync Flow

1. Start `docker compose up -d`.
2. Start desktop with `npm run tauri dev`.
3. Open a local workspace.
4. In the Web Sync panel, register or login.
5. Click Sync, or save a Markdown file after login.
6. Visit `http://localhost:8080/@username`.

## 7. Current ACL Notes

Tauri plugin commands must be allowed in `src-tauri/capabilities/default.json`.

The app currently allows:

- `dialog:allow-open` for file/folder picker.
- `fs:allow-read-text-file` for plugin file reads.
- custom Tauri commands for local workspace operations.
- `opener:allow-open-path` for opening exported HTML preview files.

After changing ACL permissions, restart `npm run tauri dev` or rebuild the packaged app.
