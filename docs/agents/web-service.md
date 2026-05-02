# Web Service Agent Guide

## Tech Stack

- Framework: Axum
- Database: MySQL through `sqlx`
- Auth: Argon2 password hashing, hashed bearer/session tokens
- Runtime: Tokio
- Default bind: `127.0.0.1:13345`
- Object storage: RustFS for future asset/publication storage
- Web frontend: React app under `services/jtype-web/frontend`

## File Structure

- `services/jtype-web/src/lib.rs`: service setup and route composition.
- `services/jtype-web/src/handlers/`: auth, OAuth, workspaces, documents, sync, domains, admin, site.
- `services/jtype-web/src/db/`: schema/migration helpers and models.
- `services/jtype-web/src/middleware/`: auth middleware.
- `services/jtype-web/frontend/`: web React frontend for landing, login, dashboard, workspace editor, settings, admin.
- `infra/mysql/001_init.sql`: base schema.
- `docker-compose.yml`: MySQL + RustFS + jtype-web.

## Product Model

- Web owns accounts, passwords, OAuth, sessions, admin, settings, custom domains, cloud workspace membership, and cloud editing.
- Desktop uses browser-based OAuth and stores only a token/profile locally.
- Cloud workspace is the server-side isolation boundary for documents, versions, conflicts, publishing, budget, assets, and members.
- Local vaults are desktop-only folders. Web APIs should not call local folders "vaults" unless describing a desktop binding.

## API Endpoints

### Auth

- `POST /api/register`: create user. First user becomes server admin.
- `POST /api/login`: password login.
- `GET /api/me`: current user.

### Device OAuth

- `POST /api/oauth/device/start`: begin desktop device OAuth.
- `POST /api/oauth/device/approve`: approve device code from authenticated web session.
- `POST /api/oauth/device/poll`: desktop polls for approval.

Desktop UI copy should say "Connect in browser"; desktop should not ask for passwords.

### Cloud Workspaces

- `GET /api/v1/workspaces`: list visible workspaces.
- `POST /api/v1/workspaces`: create workspace.
- `GET /api/v1/workspaces/:id`: workspace details.
- `GET /api/v1/workspaces/:id/manifest`: document metadata list.
- `PUT /api/v1/workspaces/:id/documents`: save a document from web editor.

### Invites

- `POST /api/v1/workspaces/:id/invites`: create invite.
- `POST /api/v1/workspaces/:id/invites/:invite_id/revoke`: revoke invite.
- `POST /api/v1/workspace-invites/:token/accept`: accept invite.

### Sync

- `POST /api/v1/workspaces/:id/sync/pull`: pull documents since cursor.
- `POST /api/v1/workspaces/:id/sync/push`: push local changes.
- `POST /api/v1/workspaces/:id/conflicts/:conflict_id/resolve`: accept local/cloud resolution.
- `POST /api/sync/workspace`: legacy bulk sync compatibility endpoint.

### Custom Domain

- Ownership verification through DNS TXT.
- Certificate upload and validation.
- SSL status tracking.

### Public Sites

- `GET /u/:username`: user's published site index.
- `GET /u/:username/*path`: published page.

Do not add public routes at bare `/:username`; those conflict with SPA routes.

## Database Tables

- Core auth: `users`, `sessions`, `oauth_device_codes`
- Workspaces: `workspaces`, `workspace_members`, `workspace_invites`, `workspace_sync_cursors`
- Documents: `documents`, `document_versions`, `sync_conflicts`
- Publishing/domains: `publish_targets`, `publish_revisions`, custom domain/certificate tables
- AI-ready storage: `ai_chunks`

## Sync Model

- Document versions use Lamport-style clocks.
- Sync cursors are per workspace and per device.
- Pull sends cloud changes since the device cursor.
- Push sends local versions with base hashes.
- The server attempts merge and creates conflict records when auto-merge fails.
- Conflict resolution supports accepting local or cloud content.

## Auth Model

- Passwords are Argon2 hashed.
- Sessions/tokens are random and hashed in the database.
- Device OAuth uses a short user code plus a long device code with expiry.
- Roles exist at two levels:
  - Server: admin/user
  - Workspace: owner/admin/editor/viewer

## Schema Migrations

Schema is self-managed by startup code and compatibility migrations. There is no external migration runner yet.

## Environment Variables

- `JTYPED_DATABASE_URL`: MySQL connection string.
- `JTYPED_BIND_ADDR`: server bind address. Default `127.0.0.1:13345`.
- `JTYPED_PUBLIC_BASE_URL`: public base URL for generated links.

## Tests

Run:

```bash
cargo test --manifest-path services/jtype-web/Cargo.toml --lib
cargo check --manifest-path services/jtype-web/Cargo.toml
npm run test:web
```

When changing API contracts, also update:

- `src/hooks/useCloudSync.ts`
- `src/lib/types.ts`
- `tests/e2e/app.spec.ts`
- `tests/e2e/web-dashboard.spec.ts`
