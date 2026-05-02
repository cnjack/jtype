# JType Web Sync Design

> Status note: this is the first web-sync design and is kept for historical context. Current runtime uses the web service at `http://localhost:13345`, browser OAuth, cloud workspaces, vault bindings, bidirectional sync, and public site routes under `/u/:username`.

## Goal

Build a companion website for this project so the desktop app can sync local Markdown vaults to cloud workspaces and publish user-owned documentation sites.

Each user has:

- username/password account
- an authenticated sync API
- one or more cloud workspaces
- a public site at `http://localhost:13345/u/username`
- published Markdown pages rendered with a Protocol-inspired documentation layout

## Runtime Shape

```text
Desktop App
  - local Markdown editing
  - local vault management
  - Tauri Rust commands for filesystem access
  - HTTPS/HTTP API client for sync

JType Web Service
  - Rust Axum server
  - user registration/login
  - token-based auth
  - workspace document sync endpoint
  - per-user public documentation site

MySQL
  - users
  - sessions
  - workspaces
  - documents
  - publish metadata

RustFS
  - reserved for future asset bundles and published binary assets
```

## API

### `POST /api/register`

Request:

```json
{
  "username": "jack",
  "password": "secret",
  "siteTitle": "Jack Docs"
}
```

Response:

```json
{
  "token": "...",
  "username": "jack",
  "siteUrl": "http://localhost:13345/u/jack"
}
```

### `POST /api/login`

Request:

```json
{
  "username": "jack",
  "password": "secret"
}
```

Response is the same as register.

### `POST /api/sync/workspace`

Auth: `Authorization: Bearer <token>`

Request:

```json
{
  "workspaceName": "docs",
  "documents": [
    {
      "relativePath": "index.md",
      "title": "Home",
      "status": "published",
      "content": "# Home"
    }
  ]
}
```

Response:

```json
{
  "workspaceName": "docs",
  "documentCount": 1,
  "siteUrl": "http://localhost:13345/u/jack"
}
```

## Public Website

Public pages:

- `GET /u/:username`
- `GET /u/:username/path/to/page`

The site renders all non-draft Markdown documents for that user. Navigation is generated from synced document paths.

## Desktop Flow

1. User opens a local workspace.
2. User registers or logs in from the Sync panel.
3. Desktop stores service URL and token in localStorage.
4. User edits and saves Markdown locally.
5. If logged in, Desktop collects Markdown documents through Tauri and posts them to `/api/sync/workspace`.
6. User can open `http://localhost:13345/u/username` to see the published site.

## Protocol Reference Adaptation

The reference at `C:\Users\Jack\Downloads\protocol` uses:

- fixed left navigation
- narrow readable content column
- zinc neutral palette
- emerald accent markers
- API/documentation style rhythm

The JType public site follows that structure while staying server-rendered and lightweight.
