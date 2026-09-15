# Kanban MCP contract

JType exposes Kanban automation over Streamable HTTP. Boards remain `.board`
documents and Cards remain Markdown documents; MCP does not create a second task
database.

## Endpoints and credentials

| Endpoint | Credential | Scope behavior |
|---|---|---|
| `POST /mcp/kanban` | OAuth or an `mcp`-scoped user token | The caller supplies `workspace_id` and `board`; normal workspace RBAC applies. |
| `POST /mcp/kanban/:workspace_id/:board` | A Board Settings token, or a broader authenticated token | Workspace and Board come only from the URL/grant. Tool arguments cannot override either value. |

A Board Settings token is only valid on its exact pinned MCP URL. It is not a
REST token and cannot be used by the React embed package. Pinned calls also
reject nested scope-like keys such as `workspace_id`, `board`, `path`, and
`base_content_hash` rather than silently ignoring them.

## Tools

Both Kanban surfaces expose the same Card mutation capabilities. The pinned
surface additionally exposes `get_card` and removes workspace/Board/CAS
arguments that the server can derive from the grant and its latest read.

| Group | Tools |
|---|---|
| Discovery | `list_workspaces` (unpinned only), `list_boards` (unpinned only), `get_board`, `list_cards`, `get_card` (pinned only) |
| Card lifecycle | `create_card`, `update_card`, `move_card`, `delete_card` |
| Labels and files | `set_card_labels`, `add_card_attachment`, `remove_card_attachment` |
| Relations | `set_card_relations` |
| Batch | `bulk_update_cards` |
| Statuses | `list_statuses`, `set_board_statuses` |
| Discussion | `list_card_comments`, `comment_card`, `resolve_card_comment` |

Card reads and successful mutations return structured content containing
`documentId`, `relativePath`, `contentHash`, core scheduling fields
(`start`, `due`, `reminder`, `archived`), tags, attachment references, and
relations (`parent`, `blockedBy`, `blocks`, `relates`).

## Optimistic concurrency

Unpinned Card writes require the stable `document_id` and the latest
`base_content_hash` returned as `documentId` and `contentHash` by a read. A stale
hash fails before the document is saved. Do not retry a stale mutation blindly:
read the Card again, reconcile the desired patch, and submit the new hash.

`set_board_statuses` similarly requires `board_document_id` and the Board
`base_content_hash` returned by `list_statuses` or `get_board`. Creation is the
only document mutation that cannot supply an existing document id/hash.

Pinned writes perform a fresh server-side read and use its hash for the save.

## Field encodings

- `start`, `due`, and the shared project `reminder` use a valid `YYYY-MM-DD`.
- `archived` is a Boolean. Deleting a Card is different: `delete_card` moves the
  Markdown document into recoverable workspace trash.
- `tags` and attachment/relation collections are JSON string arrays on MCP.
  They are serialized to the existing flat Markdown frontmatter convention.
- `parent`, `blocked_by`, `blocks`, and `relates` must resolve uniquely to Cards
  on the same Board. Full Board-relative paths or `documentId` avoid ambiguous
  legacy basenames. Self-links and basic parent/dependency cycles are rejected.

Attachments are references, not binary uploads. Accepted values are HTTPS URLs
or normalized vault-relative paths. HTTP and other schemes, absolute paths,
parent traversal, commas, CR/LF, and NUL are rejected.

## Batch receipts

`bulk_update_cards` accepts 1–100 independent patches and is intentionally
non-atomic. Its structured receipt has this shape:

```json
{
  "atomic": false,
  "requested": 3,
  "succeeded": 2,
  "failed": 1,
  "items": [
    { "index": 0, "documentId": "...", "ok": true, "card": {} },
    { "index": 1, "documentId": "...", "ok": false, "error": "..." }
  ]
}
```

Callers must inspect every item; a successful MCP transport does not imply that
every Card changed.

## Status replacement and recovery

`set_board_statuses` replaces the complete ordered `columns` list while
preserving all other `.board` JSON properties. At least one status is required,
keys must be unique, and a status containing Cards cannot be removed unless
`fallback_status` is supplied. The fallback must exist in both the old and new
lists so a partial migration remains readable.

`list_statuses` always returns `doneColumn`; legacy Boards without that property
report the compatible default `done`. To change it, pass the optional
snake_case `done_status` input to `set_board_statuses`. The key must exist in the
new `statuses` list. Omitting `done_status` preserves the current completed
status, and the call is rejected if the replacement list would remove it. A
successful replacement returns the effective `doneColumn` alongside the new
statuses and content hash. `doneColumn` is an output/config name, not an accepted
MCP input alias.

Affected Cards are moved independently and reported in `migrations`. The Board
configuration is saved only if all Card migrations succeed. Because the REST
document boundary cannot make the whole operation transactional, the response
always reports `atomic: false` and an explicit `applied` flag.

## Authorization and provenance

Every internal REST call reuses the authenticated caller and workspace RBAC.
Viewer credentials can read but cannot mutate. MCP writes send
`x-client-type: mcp` for version/audit provenance; this header never replaces
the authenticated user identity.
