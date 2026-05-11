# JType Vault + Cloud Architecture Design

> Consolidated from `docs/vault-cloud-architecture.md`, `docs/high-level-design.md`, `docs/services.md`, `docs/runtime.md`. Updated to reflect actual implementation as of 2026-05.

## 1. Architecture Overview

```
Desktop App (Tauri 2)
  ├── Frontend: React + TypeScript + Vite + Tailwind CSS (src/)
  ├── Backend: Rust (src-tauri/src/)
  │   ├── lib.rs          — Tauri command registration, cloud profile, vault bindings
  │   ├── workspace.rs    — File I/O, vault ops, publishing, validation, AI indexing
  │   └── ws_client.rs    — WebSocket client for live notifications
  └── IPC: Tauri invoke() bridge

Web Service (Axum)
  ├── services/jtype-web/src/        — Axum APIs, auth, sync, publishing, admin
  ├── services/jtype-web/frontend/   — Web React frontend (SPA)
  └── Infrastructure: MySQL + RustFS (reserved)

Communication:
  Desktop → HTTP fetch → JType Web API → MySQL
  Desktop → WebSocket → JType Web /api/v1/live (single shared connection)
```

## 2. Desktop Architecture

### 2.1 Frontend Modules

```
src/
  app/
    App.tsx              — Root component, mode routing
    AppState.tsx         — Global state management
    aiCommands.ts        — AI command definitions
  components/
    editor/              — CodeMirror editor, preview
    layout/              — EditorShell, Header, Sidebar, VaultHome, WelcomeScreen
    modals/              — Account, Conflict, CreateFolder, CreateNote,
                           CommandPalette, QuickSwitcher, SyncPrompt
    sidebar/             — File tree, sidebar panels
  hooks/
    useCloudSync.ts      — Cloud push/pull sync logic
    useCloudEvents.ts    — WebSocket event handling
    useEagerSync.ts      — Immediate sync on save
    usePeriodicSync.ts   — Background periodic sync
    useFileSystem.ts     — Local file operations
    useFileWatcher.ts    — File system change detection
    useCommands.ts       — Command registry
    useKeyboardShortcuts.ts — Shortcut bindings
  lib/
    frontmatter.ts       — Frontmatter parse/write
    markdown.ts          — Markdown rendering
    http.ts              — HTTP client for cloud API
    storage.ts           — Local storage utilities
    tauri.ts             — Tauri invoke wrapper
    types.ts             — Canonical TypeScript types
    utils.ts             — General utilities
```

### 2.2 Rust Backend

```
src-tauri/src/
  lib.rs          — Command registration, cloud profile state, vault bindings
  workspace.rs    — File I/O, file tree, create/rename/delete, frontmatter parsing,
                    publishing validation, AI indexing, trash operations
  ws_client.rs    — WebSocket client for /api/v1/live
```

### 2.3 Desktop Modes

```ts
type DesktopMode = "welcome" | "vault-home" | "document-edit" | "single-file";
```

- `welcome`: No vault configured. Shows welcome screen.
- `vault-home`: Vault open, no document selected. Shows VaultHome.
- `document-edit`: Vault open, document selected. Shows editor.
- `single-file`: External Markdown file opened directly. Pure editor, no sync/publish/account.

### 2.4 Desktop Local State

**Cloud profile** (stored in Tauri app config, NOT inside vault):

```json
{
  "serverUrl": "http://localhost:13345",
  "userId": "usr_...",
  "username": "jack",
  "siteUrl": "http://localhost:13345/u/jack",
  "deviceId": "dev_...",
  "token": "..."
}
```

**Vault bindings** (stored locally, mapping cloud workspace → local path):

```json
{
  "workspaceId": "wks_...",
  "localVaultPath": "/Users/jack/Documents/.jtype",
  "syncCursor": 42
}
```

Rules:
- Tokens must NOT be stored inside the vault folder.
- Deleting cloud profile must NOT delete vault files.
- Single-file mode bypasses cloud profile, bindings, and sync.

### 2.5 OAuth Device Flow

The actual implementation uses **device flow**, not Authorization Code + PKCE:

```
1. Desktop → POST /api/oauth/device/start
   Response: { device_code, user_code, verification_url }
2. Desktop opens browser to verification_url
3. User logs in on Web and approves device
   POST /api/oauth/device/approve
4. Desktop polls POST /api/oauth/device/poll with device_code
5. On approval, receives access token
6. Desktop stores token in cloud profile
```

## 3. Web Service Architecture

### 3.1 Technology Stack

- **Language**: Rust
- **Framework**: Axum
- **Database**: MySQL
- **Object Storage**: RustFS/S3 (reserved, not actively used for document content)
- **Frontend**: React SPA served from `services/jtype-web/frontend/`

### 3.2 Source Layout

```
services/jtype-web/src/
  main.rs              — Entry point
  lib.rs               — App builder, router setup
  handlers/
    auth.rs            — Register, login, session
    oauth.rs           — Device flow endpoints
    workspace.rs       — Workspace CRUD, manifest
    member.rs          — Member management, invites
    document.rs        — Document CRUD, versions
    folder.rs          — Folder CRUD
    sync.rs            — Push/pull sync, conflict resolution
    trash.rs           — Trash list, restore, permanent delete, empty
    domain.rs          — Custom domains, verification, certificates
    admin.rs           — Admin user/workspace management
    user.rs            — Profile, site, storage, devices
    live.rs            — WebSocket handler
    site.rs            — Published site rendering
  util.rs              — Shared utilities (frontmatter, title extraction)
```

### 3.3 API Routes (Implemented)

**Auth:**
```
POST /api/register
POST /api/login
GET  /api/me
```

**User:**
```
GET  /api/me/profile
PUT  /api/me/profile
PUT  /api/me/site
GET  /api/me/storage
GET  /api/me/devices
```

**OAuth Device Flow:**
```
POST /api/oauth/device/start
POST /api/oauth/device/approve
POST /api/oauth/device/poll
```

**Workspaces:**
```
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/workspaces/:id
PATCH  /api/v1/workspaces/:id
GET    /api/v1/workspaces/:id/manifest
POST   /api/v1/workspaces/:id/invites
DELETE /api/v1/workspaces/:id/invites/:invite_id
```

**Members:**
```
GET    /api/v1/workspaces/:id/members
DELETE /api/v1/workspaces/:id/members/:user_id
PATCH  /api/v1/workspaces/:id/members/:user_id
POST   /api/v1/workspaces/:id/leave
POST   /api/v1/workspaces/:id/transfer
```

**Documents:**
```
GET    /api/v1/workspaces/:id/documents
PUT    /api/v1/workspaces/:id/documents/:path
GET    /api/v1/workspaces/:id/documents/:path
DELETE /api/v1/workspaces/:id/documents/:path
PATCH  /api/v1/workspaces/:id/documents/:path/status
GET    /api/v1/workspaces/:id/documents/:path/versions
```

**Folders:**
```
GET    /api/v1/workspaces/:id/folders
POST   /api/v1/workspaces/:id/folders
DELETE /api/v1/workspaces/:id/folders/:path
```

**Sync:**
```
POST /api/v1/workspaces/:id/sync/push
POST /api/v1/workspaces/:id/sync/pull
GET  /api/v1/workspaces/:id/conflicts
POST /api/v1/workspaces/:id/conflicts/:conflict_id/resolve
```

**Trash:**
```
GET    /api/v1/workspaces/:id/trash
POST   /api/v1/workspaces/:id/trash/empty
POST   /api/v1/workspaces/:id/trash/:item_id/restore
DELETE /api/v1/workspaces/:id/trash/:item_id
```

**Domains:**
```
GET    /api/v1/domains
POST   /api/v1/domains
GET    /api/v1/domains/:id
POST   /api/v1/domains/:id/bind
POST   /api/v1/domains/:id/verify
POST   /api/v1/domains/:id/certificate
```

**WebSocket:**
```
GET /api/v1/live    (single shared connection, not workspace-scoped)
```

**Admin:**
```
GET  /api/admin/users
GET  /api/admin/users/:id
PUT  /api/admin/users/:id
GET  /api/admin/workspaces
GET  /api/admin/domains
GET  /api/admin/stats
```

**Published Sites:**
```
GET /u/:username
GET /u/:username/:workspace_slug
GET /u/:username/:workspace_slug/*page_path
```

## 4. Database Schema

### 4.1 Implemented Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (id, username, email, password_hash, role, status) |
| `sessions` | Web sessions |
| `oauth_device_codes` | Device flow codes (device_code, user_code, approval state) |
| `workspaces` | Cloud workspaces (id, owner, name, slug, sync_clock, budget) |
| `workspace_members` | Membership (workspace_id, user_id, role, status) |
| `workspace_invites` | Invitations with token and expiry |
| `documents` | Workspace documents (workspace_id, path, title, status, content) |
| `document_versions` | Version history per document |
| `workspace_sync_cursors` | Per-device sync cursor per workspace |
| `sync_conflicts` | Conflict records (base, local, cloud versions) |
| `document_trash` | Soft-deleted documents |
| `trash_events` | Trash operation audit log |
| `custom_domains` | Custom domain records with verification status |
| `ssl_certificates` | Certificate metadata (not_before, not_after, fingerprint, status) |
| `workspace_folders` | Explicit folder records per workspace |
| `workspace_folder_deletions` | Folder deletion tracking for sync |

Schema source: `infra/mysql/001_init.sql` + `services/jtype-web/migrations/`

### 4.2 Key Design Decisions

- **Workspace, not vault**: Server-side tables use `workspace_id`, not `vault_id`. "Vault" is local-only terminology.
- **sync_clock**: Workspaces have a `sync_clock` bigint that increments on each change, used as the cursor for pull-based sync.
- **Document content**: Stored in the `documents` table (MySQL), not in object storage. RustFS is reserved for future asset storage.
- **Trash**: Separate `document_trash` + `trash_events` tables with reusable core functions in `trash.rs`.

## 5. Sync Protocol

### 5.1 Actual Implementation

Sync uses RESTful push/pull with a monotonic clock:

**Pull:**
1. Desktop sends `workspace_id`, `device_id`, `last_seen_clock`.
2. Server returns ordered changes since that clock (creates, updates, deletes).
3. Desktop applies changes to local vault.
4. Desktop updates local sync cursor.

**Push:**
1. Desktop detects local file changes.
2. Desktop sends changed files with `base_version_id`.
3. Server checks if current version matches base.
4. Match → create new version, increment `sync_clock`.
5. Mismatch → attempt three-way Markdown merge.
6. Clean merge → save merged version.
7. Failed merge → create `sync_conflicts` record.

### 5.2 WebSocket Notifications

- Single shared connection at `/api/v1/live`.
- Not workspace-scoped (all events for the authenticated user on one connection).
- Used to trigger eager pull when changes happen on other devices or web.

### 5.3 Conflict Resolution

Available resolutions:
- `accept_local`: Cloud adopts the local version.
- `accept_cloud`: Desktop overwrites local file with cloud version on next pull.

## 6. Publishing

### 6.1 Published Site Routes

```
/u/:username                          — User site index
/u/:username/:workspace_slug          — Workspace document list
/u/:username/:workspace_slug/:path    — Individual page
```

Do NOT use bare `/:username` — it conflicts with SPA routes.

### 6.2 Current State

- Server renders published documents from MySQL.
- Documents with `status = published` are publicly accessible.
- Custom domain binding and DNS verification are implemented.
- Certificate upload and validation are implemented.
- Image attachment rewriting is NOT implemented.

## 7. Custom Domains & SSL

### 7.1 Domain Flow

1. User adds domain via API.
2. Server generates DNS TXT verification token.
3. User configures DNS.
4. User triggers verification; server checks DNS.
5. Verified domain can be bound to a workspace.

### 7.2 SSL

- User uploads PEM certificate chain and private key.
- Server validates: key matches cert, domain SAN/CN matches, reads expiry.
- Private key stored encrypted.
- SSL status: pending / valid / expiring / invalid.
- Actual TLS termination is expected at the reverse proxy (Caddy/Nginx/Traefik).

## 8. Infrastructure

### 8.1 Local Development

```bash
# Start MySQL + RustFS + web service
docker compose up -d

# Start desktop dev
npm run tauri dev

# Frontend-only preview
npm run dev
```

### 8.2 Service Endpoints

| Service | URL |
|---------|-----|
| JType Web | http://localhost:13345 |
| MySQL | mysql://jtype:jtype-local@127.0.0.1:3306/jtype |
| RustFS S3 API | http://127.0.0.1:9000 |
| RustFS Console | http://127.0.0.1:9001 |

### 8.3 Desktop ↔ Services

- Desktop reads/writes local vault files via Tauri Rust commands.
- Desktop calls JType Web HTTP APIs for cloud operations.
- Desktop NEVER connects directly to MySQL or RustFS.
- Desktop can work fully offline for local editing.

## 9. Security

- **Auth**: Password login only on Web. Desktop uses device flow OAuth.
- **Admin bootstrap**: First registered user becomes admin.
- **Certificate keys**: Stored encrypted at rest. Never returned from API.
- **Markdown**: Published HTML sanitized. Raw HTML disabled by default for public pages.
- **Tokens**: Stored in desktop cloud profile, not inside vault folders.
- **File access**: Only user-authorized files/directories via Tauri ACL.

## 10. Shared Code

### 10.1 Rust Utilities (Keep in Sync)

| Utility | Tauri (`workspace.rs`) | Web (`util.rs`) |
|---------|----------------------|-----------------|
| `parse_frontmatter` | ✓ | ✓ |
| `extract_title` | ✓ | ✓ |
| `normalize_status` | ✓ | ✓ |
| `validate_folder_name` | ✓ | ✓ (as `normalize_folder_path`) |

### 10.2 TypeScript Utilities (Keep in Sync)

| File | Desktop (`src/lib/`) | Web (`services/jtype-web/frontend/src/lib/`) |
|------|---------------------|----------------------------------------------|
| `markdown.ts` | ✓ | ✓ |
| `frontmatter.ts` | ✓ | ✓ |
