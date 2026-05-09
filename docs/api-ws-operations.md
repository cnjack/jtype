# JType Web Service API and WebSocket Operations

This document describes the current HTTP routes registered by `services/jtype-web/src/lib.rs` and the live WebSocket protocol implemented by `services/jtype-web/src/handlers/live.rs`.

Sources reviewed: web service route composition, handlers, DB models, web frontend API client and socket hook, desktop cloud sync/WS client code, and web service/E2E tests.

## Conventions

- JSON fields use `camelCase` unless noted.
- Authenticated HTTP APIs require `Authorization: Bearer <sessionToken>`.
- WebSocket auth uses `token=<sessionToken>` in the query string.
- Session tokens are accepted only while the `sessions` row exists and `expires_at` is either `NULL` or in the future.
- Role names:
  - Server roles: `admin`, `user`.
  - Cloud workspace roles: `owner`, `admin`, `editor`, `viewer`.
- Common error body:

```json
{ "error": "message" }
```

- Common status mapping:
  - `400`: invalid input or pending OAuth authorization.
  - `401`: missing/invalid token.
  - `403`: disabled user or insufficient role.
  - `404`: missing resource or inaccessible workspace.
  - `500`: database/server error.

## Common Shapes

### `AuthResponse`

```ts
{
  token: string,
  username: string,
  siteUrl: string,
  role: "admin" | "user"
}
```

`GET /api/me` returns the same shape with `token: ""`.

### `ProfileResponse`

```ts
{
  id: string,
  username: string,
  role: string,
  displayName: string | null,
  email: string | null,
  siteTitle: string,
  enabled: boolean,
  storageBudgetBytes: number
}
```

### `WorkspaceSummary`

```ts
{
  id: string,
  name: string,
  slug: string,
  publishTitle: string,
  role: "owner" | "admin" | "editor" | "viewer",
  documentCount: number,
  storageBudgetBytes: number,
  storageUsedBytes: number
}
```

### `CloudDocument`

```ts
{
  relativePath: string,
  title: string,
  status: "draft" | "published" | "archived" | string,
  content: string,
  contentHash: string,
  versionId: string,
  updatedClock: number
}
```

### `DocumentListItem`

```ts
{
  id: string,
  relativePath: string,
  title: string,
  status: string,
  contentHash: string,
  updatedClock: number,
  versionId: string | null
}
```

### `FolderListItem`

```ts
{
  id: string,
  relativePath: string,
  updatedClock: number
}
```

### `SyncConflict`

```ts
{
  conflictId: string,
  relativePath: string,
  localContent: string,
  cloudContent: string,
  baseContent?: string,
  conflictRanges?: unknown
}
```

`GET /conflicts` serializes `conflictRanges` as a JSON string when present. Sync pull/push may return it as JSON value.

## Health

| Method | Path | Auth | Response | Semantics |
|---|---|---:|---|---|
| `GET` | `/health` | No | `text/plain` `ok` | Liveness check. |

## Auth

### `POST /api/register`

Auth: none.

Request:

```ts
{
  username: string,
  password: string,
  siteTitle?: string
}
```

Response: `AuthResponse`.

Semantics:

- Normalizes username.
- Validates password.
- Creates user; first user becomes server `admin`, later users become `user`.
- Creates and returns a session token.
- Defaults `siteTitle` to `"<username> Docs"`.

### `POST /api/login`

Auth: none.

Request:

```ts
{
  username: string,
  password: string
}
```

Response: `AuthResponse`.

Semantics:

- Normalizes username.
- Rejects disabled users.
- Verifies password and creates a new session token.

### `GET /api/me`

Auth: bearer.

Response: `AuthResponse` with an empty `token`.

Semantics: returns current session user identity and public site URL. Missing, invalid, or expired sessions return `401`.

## Device OAuth

Desktop uses this flow so it can connect through the browser without asking for a password.

### `POST /api/oauth/device/start`

Auth: none.

Request:

```ts
{
  deviceId?: string
}
```

Response:

```ts
{
  deviceCode: string,
  userCode: string,
  verificationUrl: string
}
```

Semantics:

- Creates a short-lived device authorization row, expiring after 10 minutes.
- `deviceId` is accepted but currently only defaulted locally; it is not persisted by this handler.

### `POST /api/oauth/device/approve`

Auth: bearer.

Request:

```ts
{
  userCode: string
}
```

Response: `204 No Content`.

Semantics:

- Uppercases and trims `userCode`.
- Marks the pending device code as approved by the authenticated web user.
- Returns `404` for missing, expired, consumed, or already-approved codes.

### `POST /api/oauth/device/poll`

Auth: none.

Request:

```ts
{
  deviceCode: string
}
```

Response: `AuthResponse`.

Semantics:

- Desktop polls with `deviceCode`.
- Before approval, returns `400` with `authorization pending`.
- On approval, consumes the device code and returns a new session token.

## User Profile

### `GET /api/me/profile`

Auth: bearer.

Response: `ProfileResponse`.

### `PUT /api/me/profile`

Auth: bearer.

Request:

```ts
{
  displayName?: string,
  email?: string
}
```

Response: `ProfileResponse`.

Semantics:

- `displayName` must be at most 255 chars.
- Non-empty `email` must contain `@`; empty email clears it.

### `PUT /api/me/site`

Auth: bearer.

Request:

```ts
{
  siteTitle?: string
}
```

Response: `ProfileResponse`.

Semantics: updates the user's public site title; value must be 1 to 255 chars when provided.

### `GET /api/me/storage`

Auth: bearer.

Response:

```ts
{
  totalBudgetBytes: number,
  totalUsedBytes: number,
  workspaces: Array<{
    workspaceId: string,
    workspaceName: string,
    budgetBytes: number,
    usedBytes: number
  }>
}
```

Semantics: returns the user's storage budget and usage grouped by active cloud workspace membership.

### `GET /api/me/devices`

Auth: bearer.

Response:

```ts
Array<{
  deviceId: string,
  workspaceId: string,
  workspaceName: string,
  lastSeenClock: number,
  updatedAt: string
}>
```

Semantics: lists sync cursors for cloud workspaces where the current user is an active member.

## Admin

All admin routes require a bearer token for a user whose server role is `admin`.

### `GET /api/admin/users`

Response: `AdminUser[]`.

```ts
{
  id: string,
  username: string,
  role: string,
  siteTitle: string,
  displayName: string | null,
  email: string | null,
  enabled: boolean,
  workspaceCount: number,
  storageUsedBytes: number,
  storageBudgetBytes: number,
  createdAt: string
}
```

Semantics: lists users with workspace count and aggregate document storage.

### `GET /api/admin/users/:user_id`

Response: `AdminUser`.

Semantics: returns one user's admin detail.

### `PUT /api/admin/users/:user_id`

Request:

```ts
{
  role?: "admin" | "user",
  enabled?: boolean,
  storageBudgetBytes?: number
}
```

Response: `AdminUser`.

Semantics:

- Admin cannot disable themselves.
- `storageBudgetBytes` must be non-negative.
- Role must be `admin` or `user`.

### `GET /api/admin/workspaces`

Response:

```ts
Array<{
  id: string,
  name: string,
  slug: string,
  ownerUsername: string | null,
  memberCount: number,
  documentCount: number,
  storageBudgetBytes: number,
  storageUsedBytes: number
}>
```

### `GET /api/admin/domains`

Response:

```ts
Array<{
  id: string,
  domain: string,
  username: string,
  status: string,
  sslStatus: string | null
}>
```

### `GET /api/admin/stats`

Response:

```ts
{
  totalUsers: number,
  totalWorkspaces: number,
  totalDocuments: number,
  totalStorageBytes: number,
  totalDomains: number
}
```

## Cloud Workspaces

### `GET /api/v1/workspaces`

Auth: bearer.

Response:

```ts
{
  workspaces: WorkspaceSummary[]
}
```

Semantics: lists cloud workspaces visible to the current user through active membership, legacy `user_id`, or `owner_user_id`.

### `POST /api/v1/workspaces`

Auth: bearer.

Request:

```ts
{
  name: string,
  storageBudgetBytes?: number
}
```

Response: `WorkspaceSummary`.

Semantics:

- Normalizes the name.
- Creates a cloud workspace and active `owner` membership.
- Slug is generated from the workspace name.
- Budget defaults to `1073741824` bytes.

### `GET /api/v1/workspaces/:workspace_id`

Auth: bearer.

Required workspace role: `owner`, `admin`, `editor`, or `viewer`.

Response: `WorkspaceSummary`.

### `PUT /api/v1/workspaces/:workspace_id`

Auth: bearer.

Required workspace role: `owner` or `admin`.

Request:

```ts
{
  name?: string,
  publishTitle?: string
}
```

Response: `WorkspaceSummary`.

Semantics: updates workspace display name and/or publish title.

### `DELETE /api/v1/workspaces/:workspace_id`

Auth: bearer.

Required workspace role: `owner`.

Response: `204 No Content`.

Semantics: deletes the cloud workspace; database cascades clean related rows.

### `GET /api/v1/workspaces/:workspace_id/manifest`

Auth: bearer.

Required workspace role: `owner`, `admin`, `editor`, or `viewer`.

Response:

```ts
{
  workspaceId: string,
  documents: Array<{
    relativePath: string,
    title: string,
    status: string,
    contentHash: string,
    versionId: string,
    updatedClock: number
  }>
}
```

Semantics: returns document metadata for sync/indexing without document content.

## Members

### `GET /api/v1/workspaces/:workspace_id/members`

Auth: bearer.

Required workspace role: any active role.

Response:

```ts
Array<{
  userId: string,
  username: string,
  role: "owner" | "admin" | "editor" | "viewer",
  status: string,
  joinedAt: string | null
}>
```

### `POST /api/v1/workspaces/:workspace_id/members/:user_id/remove`

Auth: bearer.

Required workspace role: `owner` or `admin`.

Response: `204 No Content`.

Semantics:

- Marks target member as `removed`.
- Cannot remove owner.
- Admin cannot remove another admin.
- Already removed members return idempotent `204`.

### `PUT /api/v1/workspaces/:workspace_id/members/:user_id`

Auth: bearer.

Required workspace role: `owner`.

Request:

```ts
{
  role: "admin" | "editor" | "viewer"
}
```

Response: member object.

Semantics:

- Owner cannot change their own role through this endpoint.
- Target must be an active member.

### `POST /api/v1/workspaces/:workspace_id/leave`

Auth: bearer.

Required workspace role: any active role.

Response: `204 No Content`.

Semantics: current user leaves the workspace. Owner cannot leave and must transfer ownership first.

### `POST /api/v1/workspaces/:workspace_id/transfer`

Auth: bearer.

Required workspace role: `owner`.

Request:

```ts
{
  newOwnerUserId: string
}
```

Response: `204 No Content`.

Semantics: transfers ownership to another active member; previous owner becomes `admin`.

## Invites

### `POST /api/v1/workspaces/:workspace_id/invites`

Auth: bearer.

Required workspace role: `owner` or `admin`.

Request:

```ts
{
  email?: string,
  role?: "admin" | "editor" | "viewer"
}
```

Response:

```ts
{
  inviteId: string,
  workspaceId: string,
  role: string,
  inviteToken: string
}
```

Semantics: creates an invite with token hash stored server-side. Default role is `editor`.

### `POST /api/v1/workspaces/:workspace_id/invites/:invite_id/revoke`

Auth: bearer.

Required workspace role: `owner` or `admin`.

Response: `204 No Content`.

Semantics: revokes an unaccepted, unrevoked invite.

### `POST /api/v1/workspace-invites/:invite_token/accept`

Auth: bearer.

Response: `WorkspaceSummary`.

Semantics:

- Looks up invite by token hash.
- Adds or reactivates membership with the invite role.
- Marks the invite accepted.

## Folders

### `GET /api/v1/workspaces/:workspace_id/folders`

Auth: bearer.

Required workspace role: any active role.

Response: `FolderListItem[]`.

Semantics: lists all current workspace folders.

### `POST /api/v1/workspaces/:workspace_id/folders`

Auth: bearer.

Required workspace role: `owner`, `admin`, or `editor`.

Request:

```ts
{
  relativePath: string
}
```

Response: `FolderListItem`.

Semantics:

- Normalizes the folder path.
- Creates ancestor folders as needed.
- Publishes `sync:required` over WS with reason `folder-changed`.

### `DELETE /api/v1/workspaces/:workspace_id/folders/:folder_id`

Auth: bearer.

Required workspace role: `owner`, `admin`, or `editor`.

Response: `204 No Content`.

Semantics:

- Records a folder deletion clock.
- Deletes the folder and child folders.
- Publishes `sync:required` over WS with reason `folder-changed`.

## Documents

### `GET /api/v1/workspaces/:workspace_id/documents`

Auth: bearer.

Required workspace role: any active role.

Response: `DocumentListItem[]`.

Semantics: lists cloud documents ordered by relative path.

### `GET /api/v1/workspaces/:workspace_id/documents/:document_id`

Auth: bearer.

Required workspace role: any active role.

Response: `CloudDocument`.

### `DELETE /api/v1/workspaces/:workspace_id/documents/:document_id`

Auth: bearer.

Required workspace role: `owner`, `admin`, or `editor`.

Optional header: `x-device-id`.

Response: `204 No Content`.

Semantics:

- Moves the document into `document_trash` with a 30-day expiry.
- Deletes the document row.
- Publishes `document:deleted` over WS.

### `PUT /api/v1/workspaces/:workspace_id/documents/:document_id/status`

Auth: bearer.

Required workspace role: `owner`, `admin`, or `editor`.

Request:

```ts
{
  status: "draft" | "published" | "archived"
}
```

Response: `DocumentListItem`.

Semantics: updates document publish status metadata.

### `GET /api/v1/workspaces/:workspace_id/documents/:document_id/versions`

Auth: bearer.

Required workspace role: any active role.

Response:

```ts
Array<{
  id: string,
  parentVersionId: string | null,
  source: string,
  contentHash: string,
  content: string,
  createdAt: string
}>
```

Semantics: returns the latest 50 document versions by creation time descending.

## Sync

### `POST /api/v1/workspaces/:workspace_id/sync/pull`

Auth: bearer.

Required workspace role: any active role.

Request:

```ts
{
  sinceClock?: number,
  deviceId?: string,
  sinceTrashEventClock?: number
}
```

Response:

```ts
{
  workspaceId: string,
  folders: FolderListItem[],
  deletedFolders: Array<{ relativePath: string, deletedClock: number }>,
  documents: CloudDocument[],
  deletedPaths: Array<{ relativePath: string, deletedClock: number }>,
  conflicts: SyncConflict[],
  trash?: {
    items: Array<{
      id: string,
      documentId: string,
      relativePath: string,
      title: string,
      contentHash: string,
      deletedByUserId: string,
      sourceDeviceId?: string,
      sourceUserId?: string,
      deletedAt: string,
      expiresAt: string,
      deletedClock: number
    }>,
    events: Array<{
      id: string,
      eventType: "empty_trash" | "permanent_delete_item" | string,
      eventClock: number,
      eventData: unknown,
      createdAt: string
    }>,
    expiredTrashIds: string[],
    trashCursor: number
  }
}
```

Semantics:

- Returns folders, folder deletions, documents, document deletions, and open conflicts since `sinceClock` (default `0`).
- `deletedPaths` only returns items when `sinceClock != 0`.
- If `deviceId` is provided, updates `workspace_sync_cursors.last_seen_clock` to the max returned clock.
- If `sinceTrashEventClock` is provided, includes `trash` data and trash event cursor.

### `POST /api/v1/workspaces/:workspace_id/sync/push`

Auth: bearer.

Required workspace role: `owner`, `admin`, or `editor`.

Request:

```ts
{
  deviceId?: string,
  folders?: Array<{ relativePath: string }>,
  documents: Array<{
    relativePath: string,
    title?: string,
    status?: string,
    content: string,
    baseContentHash?: string,
    baseContent?: string
  }>,
  deletedPaths?: Array<{ relativePath: string }>,
  trashOperations?: Array<
    | { type: "restore", trashId: string }
    | { type: "permanent_delete", trashId: string }
    | { type: "empty_trash" }
  >
}
```

Response:

```ts
{
  workspaceId: string,
  accepted: number,
  folders: FolderListItem[],
  documents: Array<CloudDocument & {
    mergeStatus: "accepted" | "merged" | "unchanged"
  }>,
  deletedPaths: Array<{ relativePath: string, deletedClock: number }>,
  conflicts: SyncConflict[]
}
```

Semantics:

- Upserts folders and ancestors, publishing `sync:required` if folder state changed.
- Saves documents with base hash/content conflict detection.
- If base hash does not match current cloud hash and both local/cloud changed, server attempts three-way merge when `baseContent` is provided; otherwise creates a sync conflict.
- `deletedPaths` move documents to cloud trash.
- `trashOperations` restore, permanently delete, or empty trash using the same internal logic as trash endpoints.
- Publishes WS events for document changes, trash, and required sync refreshes.
- If `deviceId` is provided, updates the device cursor.

### `GET /api/v1/workspaces/:workspace_id/conflicts`

Auth: bearer.

Required workspace role: any active role.

Response: `SyncConflict[]`.

Semantics:

- Lists open conflicts.
- Deduplicates by `relativePath`, keeping the latest conflict per path.

### `POST /api/v1/workspaces/:workspace_id/conflicts/:conflict_id/resolve`

Auth: bearer.

Required workspace role: `owner`, `admin`, or `editor`.

Request:

```ts
{
  resolution: "accept_local" | "accept_cloud" | "manual_merge" | "keep_both",
  content?: string
}
```

Response: `CloudDocument`.

Semantics:

- `accept_local`: saves conflict local content.
- `accept_cloud`: keeps cloud content.
- `manual_merge`: saves `content`; `content` is required.
- `keep_both`: creates a sibling document using local content and marks the conflict resolved.
- Publishes `document:changed` for the saved/resolved document.

## Trash

### `GET /api/v1/workspaces/:workspace_id/trash`

Auth: bearer.

Required workspace role: any active role.

Response:

```ts
Array<{
  id: string,
  documentId: string,
  relativePath: string,
  title: string,
  contentHash: string,
  deletedByUserId: string,
  deletedAt: string,
  expiresAt: string
}>
```

Semantics: lists non-restored trash items newest-first.

### `DELETE /api/v1/workspaces/:workspace_id/trash`

Auth: bearer.

Required workspace role: `owner`, `admin`, or `editor`.

Response: `204 No Content`.

Semantics:

- Permanently deletes all non-restored trash items.
- Records an `empty_trash` trash event.
- Publishes `document:deleted` over WS for each deleted path.

### `POST /api/v1/workspaces/:workspace_id/trash/:trash_id/restore`

Auth: bearer.

Required workspace role: `owner`, `admin`, or `editor`.

Optional header: `x-device-id`.

Response: `CloudDocument`.

Semantics:

- Restores a trash item as a new document row with status `draft`.
- If a live document exists at the same path, it is deleted first.
- Marks trash item restored and records restore metadata.
- Publishes `document:trashed` with `action: "restored"`.

### `DELETE /api/v1/workspaces/:workspace_id/trash/:trash_id`

Auth: bearer.

Required workspace role: `owner`, `admin`, or `editor`.

Response: `204 No Content`.

Semantics:

- Permanently deletes one trash item.
- Records a `permanent_delete_item` trash event.
- Publishes `document:deleted` when the path is known.

## Domains

### `GET /api/v1/domains`

Auth: bearer.

Response: `DomainResponse[]`.

```ts
{
  id: string,
  domain: string,
  workspaceId: string | null,
  workspaceName: string | null,
  verificationToken: string,
  dnsTxtRecord: string,
  status: string,
  verifiedAt: string | null,
  sslStatus: string | null,
  sslExpiresAt: string | null
}
```

Semantics: lists custom domains owned by current user.

### `POST /api/v1/domains`

Auth: bearer.

Request:

```ts
{
  domain: string,
  workspaceId?: string
}
```

Response: `DomainResponse`.

Semantics:

- Domain is lowercased and must contain `.`.
- If binding to a workspace, current user must be workspace `owner` or `admin`.
- Creates a verification token and `dnsTxtRecord` of `jtype-verify=<token>`.

### `GET /api/v1/domains/:domain_id`

Auth: bearer.

Response: `DomainResponse`.

Semantics: returns a domain owned by current user.

### `PUT /api/v1/domains/:domain_id/binding`

Auth: bearer.

Request:

```ts
{
  workspaceId?: string
}
```

Response: `DomainResponse`.

Semantics: binds or unbinds the domain to/from a workspace. Binding requires workspace `owner` or `admin`.

### `POST /api/v1/domains/:domain_id/verify`

Auth: bearer.

Response: `DomainResponse`.

Semantics: currently marks the domain as verified without performing live DNS lookup. Returns `400` if already verified.

### `POST /api/v1/domains/:domain_id/certificate`

Auth: bearer.

Request:

```ts
{
  certChainPem: string,
  privateKeyPem: string
}
```

Response: `DomainResponse`.

Semantics:

- Domain must already be verified.
- `certChainPem` must start with `-----BEGIN CERTIFICATE-----`.
- `privateKeyPem` must contain a private key PEM header.
- Previous active certificates are revoked; the private key is stored only as a hash.

## Public Sites

Public site routes return HTML, not JSON, and do not require auth.

| Method | Path | Semantics |
|---|---|---|
| `GET` | `/u/:site_user` | User's published workspace index. |
| `GET` | `/u/:site_user/:workspace_slug` | Workspace site index. Selects `index.md` when available, otherwise first published document. |
| `GET` | `/u/:site_user/:workspace_slug/*page_path` | Published page. Path candidates are raw path, `path.md`, and `path/index.md`. |

Only documents with `status = 'published'` appear. Published site URLs intentionally use `/u/:username/...`; bare `/:username` is reserved for SPA routing and must not be used for public sites.

## SPA and Static Assets

Any route not matched above falls through to `serve_frontend`:

- If the path matches an embedded frontend asset, it is served with a guessed content type.
- Otherwise, `frontend/dist/index.html` is returned for SPA routes.

This fallback is not part of the JSON API contract.

## WebSocket: Workspace Live Channel

### Connection

Route:

```text
GET /api/v1/workspaces/:workspace_id/live?token=<sessionToken>&clientType=<type>&deviceId=<deviceId>
```

Transport URL:

- `http://...` becomes `ws://...`.
- `https://...` becomes `wss://...`.

Query:

```ts
{
  token: string,
  clientType?: string, // defaults to "desktop"; web uses "web"
  deviceId?: string
}
```

Auth/authorization:

- `token` is validated against `sessions`.
- Expired sessions are rejected.
- Disabled users are rejected.
- User must have one of `owner`, `admin`, `editor`, `viewer`.
- Viewer may connect but cannot perform mutating WS operations.

Close/reconnect behavior:

- Web frontend reconnects with backoff from 1s to 60s.
- Desktop listener reconnects with exponential backoff to 60s.
- Desktop stops reconnecting when the WS handshake returns `404` or `410`.

### Initial Server Message

Immediately after successful upgrade:

```ts
{
  type: "connected",
  sessionId: string,
  workspaceClock: number
}
```

`workspaceClock` is the max of document update clocks, trash deletion clocks, folder update clocks, and folder deletion clocks.

### Client to Server Operations

#### `ping`

Request:

```ts
{ type: "ping" }
```

Response:

```ts
{ type: "pong" }
```

Both web and desktop send a ping every 30 seconds.

#### `document:save`

Required role: `owner`, `admin`, or `editor`.

Request:

```ts
{
  type: "document:save",
  ref?: string,
  relativePath: string,
  title?: string,
  status?: string,
  content: string,
  baseContentHash?: string,
  baseContent?: string
}
```

Success ack:

```ts
{
  type: "ack",
  ref?: string,
  ok: true,
  relativePath: string,
  contentHash: string,
  updatedClock: number,
  document: {
    relativePath: string,
    contentHash: string,
    updatedClock: number
  }
}
```

Conflict ack:

```ts
{
  type: "ack",
  ref?: string,
  ok: false,
  error: "conflict",
  conflictId: string,
  relativePath: string
}
```

Other failure ack:

```ts
{
  type: "ack",
  ref?: string,
  ok: false,
  error: string
}
```

Semantics:

- Reuses the same save/version/conflict logic as sync push.
- Publishes `document:changed` to the workspace hub on successful save.
- `source` on the broadcast is the WS `clientType`.
- `deviceId` on the broadcast comes from the connection query.

#### `folder:created`

Required role: `owner`, `admin`, or `editor`.

Request:

```ts
{
  type: "folder:created",
  ref?: string,
  relativePath: string
}
```

Response:

- No success ack is currently sent.
- Viewer or error responses use:

```ts
{
  type: "ack",
  ref?: string,
  ok: false,
  error: string
}
```

Semantics:

- Creates folder and ancestors.
- Publishes `sync:required` with reason `folder-changed`.

#### `folder:deleted`

Required role: `owner`, `admin`, or `editor`.

Request:

```ts
{
  type: "folder:deleted",
  ref?: string,
  relativePath: string
}
```

Response:

- No success ack is currently sent.
- Viewer or error responses use a failed `ack`.

Semantics:

- Records folder deletion.
- Deletes folder and children from `workspace_folders`.
- Publishes `sync:required` with reason `folder-changed`.

#### `folder:changed`

Request:

```ts
{
  type: "folder:changed",
  ref?: string
}
```

Response: no direct ack.

Semantics: legacy fallback; does not persist anything, only broadcasts `sync:required` with reason `folder-changed`.

#### `trash:restore`

Required role: `owner`, `admin`, or `editor`.

Request:

```ts
{
  type: "trash:restore",
  ref?: string,
  trashId: string
}
```

Success ack:

```ts
{
  type: "ack",
  ref?: string,
  ok: true
}
```

Failure ack:

```ts
{
  type: "ack",
  ref?: string,
  ok: false,
  error: string
}
```

Semantics: restores a trash item using the same internal operation as sync push `trashOperations`.

#### `trash:permanent_delete`

Required role: `owner`, `admin`, or `editor`.

Request:

```ts
{
  type: "trash:permanent_delete",
  ref?: string,
  trashId: string
}
```

Response: success/failure `ack`.

Semantics: permanently deletes a trash item using the same internal operation as sync push `trashOperations`.

#### `trash:empty_trash`

Required role: `owner`, `admin`, or `editor`.

Request:

```ts
{
  type: "trash:empty_trash",
  ref?: string
}
```

Response: success/failure `ack`.

Semantics: empties cloud trash using the same internal operation as sync push `trashOperations`.

### Server to Client Broadcasts

The server broadcasts workspace events through `NotificationHub` to all connected clients for that workspace.

#### `document:changed`

```ts
{
  type: "document:changed",
  sourceSessionId: string,
  relativePath: string,
  contentHash: string,
  updatedClock: number,
  editedBy: string,
  source: string,
  deviceId: string | null
}
```

Produced by:

- WS `document:save`.
- Sync push document saves.
- Conflict resolution.

Client semantics:

- Web ignores events whose `sourceSessionId` equals the current session.
- Desktop ignores events where `source === "desktop"` and `deviceId` equals its own device id.
- Other clients refresh/pull the changed document.

#### `document:deleted`

```ts
{
  type: "document:deleted",
  sourceSessionId: string,
  relativePath: string,
  deletedClock: number
}
```

Produced by:

- REST document delete.
- Trash permanent delete.
- Trash empty, once per path.

Client semantics: refresh document lists/trash or trigger desktop remote change.

#### `document:trashed`

```ts
{
  type: "document:trashed",
  sourceSessionId: string,
  relativePath: string,
  action: "trashed" | "restored" | string
}
```

Produced by:

- Sync push `deletedPaths` with `action: "trashed"`.
- Trash restore with `action: "restored"`.

Client semantics: refresh document lists/trash or trigger desktop remote change.

#### `sync:required`

```ts
{
  type: "sync:required",
  reason: string,
  missedEvents?: number
}
```

Produced by:

- Folder create/delete or legacy folder change.
- Broadcast lag, with `reason: "lagged"` and `missedEvents`.

Client semantics: refresh folders/documents/trash or run a sync pull.

### Other Server Messages

#### `pong`

```ts
{ type: "pong" }
```

Response to JSON `ping`.

#### `ack`

Used as a request/response envelope for client operations that include `ref`. Web frontend tracks pending requests by `ref` and times out after 30 seconds.

## Compatibility and Observed Drift

The current router is the authority for runtime HTTP endpoints. A few older callers/tests still reference routes that are not currently registered in `services/jtype-web/src/lib.rs`:

- `PUT /api/v1/workspaces/:workspace_id/documents`
  - Referenced by `services/jtype-web/tests/common/mod.rs`, some tests, and web E2E mocks as a save-document API.
  - Current runtime save path is WS `document:save` for web editing and `POST /api/v1/workspaces/:workspace_id/sync/push` for desktop/bulk sync.
- `POST /api/sync/workspace`
  - Referenced by older desktop code in `src/main.ts`, `services/jtype-web/tests/sync_tests.rs`, historical agent docs, and `lib.rs.bak`.
  - Not registered by the current `build_router`.

Treat those as stale compatibility references unless the route is restored in `lib.rs`.
