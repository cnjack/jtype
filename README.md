# JType

JType is a local-first Markdown workspace with desktop editing, directory management, web sync, and per-user document site publishing.

## Product Direction

This project is planned to evolve into JType: a local-first Markdown workspace
for editing, directory management, publishing, and future AI-assisted workflows.

- [Product requirements](docs/product-requirements.md)
- [High-level design](docs/high-level-design.md)

## Run

```bash
npm install
npm run tauri dev
```

## Backend Locations

There are two Rust backends in this repo:

- Desktop embedded backend: `src-tauri/src/lib.rs` and `src-tauri/src/workspace.rs`.
  - This is the Tauri backend used by the desktop app for local files, workspace operations, static export, validation, and AI index generation.
  - It starts automatically when you run `npm run tauri dev`.
- Companion web backend: `services/jtype-web`.
  - This is the Axum service for user registration/login, workspace sync, and public sites like `http://localhost:8080/@username`.
  - Start it with Docker Compose: `docker compose up -d`.

The desktop app should talk to the web backend over HTTP. It should not connect directly to MySQL.

## Build

```bash
npm run tauri build
```

## Test

```bash
npm run build
cd src-tauri && cargo test
npm run test:e2e
```

## Local Services

```bash
docker compose up -d
```

See [service infrastructure](docs/services.md) for the MySQL and RustFS setup.
See [runtime guide](docs/runtime.md) for how the desktop app talks to the Rust backend and local services.

The current Windows bundle target is `nsis` so packaged builds work on this machine.

## Notes

- Uses Tauri dialog and filesystem plugins to choose and read Markdown files.
- Renders Markdown with `marked`.
- Sanitizes rendered HTML with `dompurify`.
