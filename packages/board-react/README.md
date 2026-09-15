# jtype-board-react

Embeddable React kanban board for jtype cloud workspaces. Renders the **same
shared `BoardSurface`** that powers the jtype desktop and web boards, wired to
an instance-based API client — drop it into any React app (React 18.2+ or 19)
on any origin.

```tsx
import { JTypeBoard } from 'jtype-board-react'
import 'jtype-board-react/style.css'

<div style={{ height: 600 }}>
  <JTypeBoard
    baseUrl="https://jtype.example.com"
    token={token}            // full REST session token; XOR with `client`
    workspaceId="f006b727-…"
    boardRef="jcloud-dev"    // board name or .board relative path
  />
</div>
```

The component resolves `boardRef` to the `.board` config document itself
(exact path first, then unique basename anywhere in the workspace), discovers
Markdown Cards whose `board` frontmatter matches that config, and gives you the
full board even when automation stores Cards outside the board folder: selectable
vertical swimlanes (status, priority, assignee, or custom), cards,
drag-to-move (with document writeback), multi-select filters, search/sort,
Board/Table/Calendar/Backlog/Gantt projections, My Work and Inbox scopes, and
a contextual side-sheet Card detail. All views operate on the same Markdown
Cards; Backlog and Gantt do not create a second planning data model.

The wrapper fills its container — **give the parent element a height.**

## Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `workspaceId` | `string` | required | Cloud workspace id (UUID). |
| `boardRef` | `string` | required | Board name (`jcloud-dev`) or `.board` relative path (`team/sprint.board`). Ambiguous names fail visibly, listing candidates. |
| `baseUrl` | `string` | — | jtype server origin. Use together with `token`; XOR with `client`. |
| `token` | `string` | — | Full session token accepted by the document REST API. A board-pinned token from **Settings → MCP access** is MCP-only and returns `403` here. Prefer `client` for production. |
| `client` | `JTypeBoardDataClient` | — | Injected data client; replaces `baseUrl`+`token`. **Memoize it** — a new identity per render remounts the board. |
| `readOnly` | `boolean` | `false` | Hides every mutation affordance (drag, composers, menus). View switching stays usable but is kept local, never written back. |
| `currentUser` | `string` | — | Current user's display name. Enables **My Work**, mentions, and personal due, reminder, and blocker Inbox signals. |
| `viewState` | `Partial<BoardPersonalViewState>` | — | Host-controlled personal display state: supplied keys are authoritative; omitted keys use the board-seeded in-memory defaults. It is never serialized into `.board`. |
| `onViewStateChange` | `(next: Partial<BoardPersonalViewState>) => void` | — | Receives a normalized next view state for the host to persist and feed back through `viewState`. Equal repeated reconciliation updates are deduplicated; omitting or ignoring this callback never creates a render loop. Without `viewState`, the package keeps an in-memory fallback. |
| `live` | `boolean` | `true` | Try the live SSE feed; see *Live updates* below. |
| `pollIntervalMs` | `number` | `30000` | Polling cadence (min 5000). |
| `initialCardPath` | `string` | — | Opens the matching Card once after the initial snapshot loads. Closing it does not make polling reopen it. |
| `additionalCardRoots` | `readonly string[]` | — | Omit to discover matching Cards across the workspace. Supply it to bound discovery to the board folder plus these relative roots; `[]` means the board folder only. Matching `board` frontmatter is always required. |
| `onCardOpen` | `(card: BoardViewCard) => void` | — | Intercept Card opens; replaces the built-in editable/read-only detail. |
| `renderCardSupplement` | `(card: BoardViewCard) => ReactNode` | — | Add host-owned content after native Card fields in the built-in editable or read-only detail. It is not rendered for intercepted opens. |
| `onConnectionChange` | `(s: 'live' \| 'polling' \| 'error') => void` | — | Observe transport state transitions. |
| `locale` | `'en' \| 'zh' \| 'ja' \| 'ko'` | `'en'` | Board chrome language. The lingui instance is bundle-wide, so multiple boards on one page share the last-set locale. |
| `className`, `style` | | — | Extra class/style for the wrapper element. |

### Card discovery boundaries

By default the first snapshot inspects every Markdown document in the cloud
workspace and includes only documents whose `board` frontmatter equals the
resolved board id. This preserves membership when Cards are created in
automation or execution directories rather than beside the `.board` file.
Unchanged documents are served from the package's `contentHash` cache on later
polls.

For a deliberately bounded embed, pass `additionalCardRoots`. The board's own
folder is always included; only the supplied roots are added. Passing an empty
array restricts discovery to the board folder. Invalid absolute or traversing
roots are ignored.

## Live updates vs polling (post kanban-unification-v2)

The document REST API used by the bundled client and the per-board SSE feed
`GET /api/v1/workspaces/:id/boards/:boardRef/events` require a **full session
token**. A board-pinned MCP credential is deliberately limited to the MCP
transport and gets **403** on these ordinary REST/SSE routes.

So the embed's strategy is:

1. With `live={true}` it attempts the SSE feed once the board config is loaded
   (the feed is keyed by the board's logical id).
2. If the server rejects the token (401/403), the board **permanently settles
   on polling for that mount — visibly**: the corner chip shows
   "Auto-refresh · 30s" and `onConnectionChange('polling')` fires. There is no
   silent fake-live.
3. Network-level SSE failures retry every 30s while polling keeps the board
   fresh; a working stream shows the green "Live" chip and pauses polling.
4. Polling is cheap: each tick lists documents and re-downloads only those
   whose `contentHash` changed.

With a full session token (or an injected client whose backend holds one and
implements `subscribeBoardEvents`), the board goes properly live.

## Security notes

- **Do not paste a board-pinned MCP token into `token`.** It is intentionally
  unusable with this package's REST adapter. A full browser/session token is
  broader: it can access the documents available to that user, so treat it
  like a password and expose it only in a trusted, self-hosted page.
- **Recommended pattern: client injection.** Implement `JTypeBoardDataClient`
  against your own backend proxy and pass it as `client` — the jtype token
  stays server-side and the browser never talks to jtype directly. Every code
  path (initial load, polling, writes, the live subscription) goes through the
  injected client; there is no bypass.

  The proxy must forward `saveDocument`'s `createOnly: true` flag and enforce
  it atomically with a `409` response. Quick-create uses that contract and
  retries a bounded sequence of suffixed paths, so an ordinary Markdown note
  or a Card belonging to another board can never be overwritten.

  ```tsx
  import { JTypeBoard, type JTypeBoardDataClient } from 'jtype-board-react'

  const client: JTypeBoardDataClient = useMemo(() => ({
    listDocuments: (ws) => myFetch(`/api/jtype-proxy/${ws}/documents`),
    getDocument: (ws, id) => myFetch(`/api/jtype-proxy/${ws}/documents/${id}`),
    saveDocument: (ws, req) => myFetch(`/api/jtype-proxy/${ws}/documents/save`, { method: 'POST', body: JSON.stringify(req) }),
    deleteDocument: (ws, id) => myFetch(`/api/jtype-proxy/${ws}/documents/${id}`, { method: 'DELETE' }), // optional
    // subscribeBoardEvents optional — omit to always poll
  }), [])

  <JTypeBoard client={client} workspaceId={ws} boardRef="jcloud-dev" />
  ```

- The bundled client never logs and never puts the token in error messages.
  One caveat of the direct (non-injected) live mode: the SSE endpoint
  authenticates via `?token=` query (EventSource-style, mirroring jtype's own
  web client), so the token can appear in server-side access logs of *your
  jtype server*. The injected-client pattern avoids this entirely.
- The default `createJTypeClient` uses no localStorage and no globals —
  N instances with different servers/tokens coexist on one page.
- Personal view preferences follow the same rule: pass `viewState` and persist
  `onViewStateChange` yourself. This keeps identity and retention decisions in
  the host instead of creating a hidden cross-app preference store.

## Errors are first-class

Bad token, missing/ambiguous board, unreachable server, or an unparsable
`.board` doc render an explicit error panel (with Retry) — never a blank
board. Failures after the first successful load keep the last data and show a
banner + the red connection chip, recovering automatically on the next
successful poll.

## Styling and theming

- `style.css` is mandatory and fully scoped: every rule is prefixed with
  `:where(.jtb-scope)` (or self-matches an element that carries the class), and
  the board ships its own minimal reset instead of a global preflight — host
  pages are never repainted. The board's dropdown menus anchor in body-level
  Headless UI portals *outside* the wrapper, so the scope class is threaded
  onto each portal panel itself — never onto Headless UI's global
  `[data-headlessui-portal]` attribute. This means a host that also uses
  Headless UI v2 keeps its own portalled menus/dialogs completely untouched:
  our reset and theme variables apply only to elements under `.jtb-scope`.
- Theme via CSS variables on the scope: `--color-brand`, `--color-brand-dark`,
  `--color-brand-soft`, `--color-brand-gray`, `--color-brand-light`,
  `--color-line` (plus the standard Tailwind palette variables). Override
  them on `.jtb-scope` in your own CSS.
- Utility sizes are rem-based and follow the host's root font size (a
  non-16px `html { font-size }` scales the board accordingly).

## MVP scope

Included: vertical swimlane management and drag-to-move with `status`,
`priority`, `assignee`, or custom `swimlane` frontmatter writeback. Manual
within-lane reorder applies to Status swimlanes; alternate dimensions move
cards between lanes without rewriting workflow order. Also included: Card
create/delete/archive, Board/Table/Calendar/Backlog/Gantt views, My Work and
Inbox scopes, multi-select filters, search/sort, side-sheet detail, schedule
fields, labels, relations, attachments references, and localized chrome.
Editable embeds use the shared
focused quick-create and card-detail dialogs, including description,
properties, relations, and sub-cards. The project-workspace chrome is fully
translated in English and Simplified Chinese; Japanese and Korean currently
fall back to English for newly added strings. Explicitly read-only embeds keep the
non-mutating detail; a host `onCardOpen` callback still replaces either
built-in path. Hosts that need execution receipts or other contextual data
without replacing the editor can use `renderCardSupplement`. The slot is
additive: jtype retains ownership of Card editing and mutations.
Not yet: member-directory assignee options, server Activity/comments in the
standalone package,
ticket badges (the `OCCSV-####` chip — the embed client has no ticket-index
endpoint, so cards never show it even when the board configures `ticketKey`),
attachment upload, and rich Markdown preview. Notes remain fully
editable Markdown, while the package's Preview uses safe plain text so the
KaTeX/Mermaid document-renderer chain is deliberately excluded from the
embed bundle.

## Installing from git

`dist/` is **committed** on this package's branch precisely so it can be
consumed as a git dependency without running the jtype build toolchain
(lingui + tailwind) at install time — there is intentionally no `prepare`
script:

```bash
pnpm add "git+https://github.com/cnjack/jtype.git#feat/board-react-embed&path:/packages/board-react"
```

(npm itself cannot install a subdirectory of a git repo; use pnpm, or vendor
the tarball: `cd packages/board-react && npm pack`.)

When changing the package, rebuild and commit `dist/` together with the
source: `npm run build` (typecheck + vite lib build + CSS scoping; verifies
the CSS scoping invariant and emits `dist/index.js`, `dist/index.d.ts`,
`dist/style.css`).

## Development

```bash
cd packages/board-react
npm install
npm run build      # tsc --noEmit && vite build && scope-css
npm test           # unit tests + real Cloud-sized embed browser regression
```

A manual-verification host lives in `example/` (React 18 consumer):

```bash
cd example && npm install && npm run dev
# open the printed URL, paste baseUrl/token/workspaceId/boardRef, Mount
```
