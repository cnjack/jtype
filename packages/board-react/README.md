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
    token={token}            // mcp-scope session token; XOR with `client`
    workspaceId="f006b727-…"
    boardRef="jcloud-dev"    // board name or .board relative path
  />
</div>
```

The component resolves `boardRef` to the `.board` config document itself
(exact path first, then unique basename anywhere in the workspace), scans the
board folder's card documents, and gives you the full board: selectable
vertical swimlanes (status, priority, assignee, or custom), cards,
drag-to-move (with document writeback), multi-select filters, search/sort,
Board/Table/Calendar views, and a
built-in read-only card detail.

The wrapper fills its container — **give the parent element a height.**

## Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `workspaceId` | `string` | required | Cloud workspace id (UUID). |
| `boardRef` | `string` | required | Board name (`jcloud-dev`) or `.board` relative path (`team/sprint.board`). Ambiguous names fail visibly, listing candidates. |
| `baseUrl` | `string` | — | jtype server origin. Use together with `token`; XOR with `client`. |
| `token` | `string` | — | Session token, typically `mcp`-scoped (mint via the OAuth device flow or the board Settings → MCP access panel). |
| `client` | `JTypeBoardDataClient` | — | Injected data client; replaces `baseUrl`+`token`. **Memoize it** — a new identity per render remounts the board. |
| `readOnly` | `boolean` | `false` | Hides every mutation affordance (drag, composers, menus). View switching stays usable but is kept local, never written back. |
| `currentUser` | `string` | — | Current user's display name. Enables the personal **My cards** filter. |
| `live` | `boolean` | `true` | Try the live SSE feed; see *Live updates* below. |
| `pollIntervalMs` | `number` | `30000` | Polling cadence (min 5000). |
| `initialCardPath` | `string` | — | Opens the matching Card once after the initial snapshot loads. Closing it does not make polling reopen it. |
| `onCardOpen` | `(card: BoardViewCard) => void` | — | Intercept card opens; replaces the built-in read-only detail panel. |
| `renderCardSupplement` | `(card: BoardViewCard) => ReactNode` | — | Add host-owned content after native Properties and Relations in the built-in editable Card detail. It is not rendered for `readOnly` or intercepted opens. |
| `onConnectionChange` | `(s: 'live' \| 'polling' \| 'error') => void` | — | Observe transport state transitions. |
| `locale` | `'en' \| 'zh' \| 'ja' \| 'ko'` | `'en'` | Board chrome language. The lingui instance is bundle-wide, so multiple boards on one page share the last-set locale. |
| `className`, `style` | | — | Extra class/style for the wrapper element. |

## Live updates vs polling (post kanban-unification-v2)

Since jtype PR #45 (commit `a4d2a31`), the live WS/SSE surfaces — including the
per-board SSE feed `GET /api/v1/workspaces/:id/boards/:boardRef/events` — only
accept **full-scope session tokens**. An `mcp`-scoped token (the kind an embed
normally holds) gets **403** there, while the REST document API accepts it.

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

With a full-scope session token (or an injected client whose backend holds
one and implements `subscribeBoardEvents`), the board goes properly live.

## Security notes

- **A raw `mcp` token in the host page grants that user's full notes + kanban
  access for its lifetime (90 days by default).** The board-pinned MCP URL is
  a convenience default, *not* an access boundary. Treat the token like a
  password. Embedding it directly is acceptable only for trusted, self-hosted
  host pages.
- **Recommended pattern: client injection.** Implement `JTypeBoardDataClient`
  against your own backend proxy and pass it as `client` — the jtype token
  stays server-side and the browser never talks to jtype directly. Every code
  path (initial load, polling, writes, the live subscription) goes through the
  injected client; there is no bypass.

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
cards between lanes without rewriting workflow order. Also included: card
create/delete, board/table/calendar, multi-select filters, search/sort,
read-only card detail, and localized chrome. Editable embeds use the shared
focused quick-create and card-detail dialogs, including description,
properties, relations, and sub-cards. Explicitly read-only embeds keep the
non-mutating detail; a host `onCardOpen` callback still replaces either
built-in path. Hosts that need execution receipts or other contextual data
without replacing the editor can use `renderCardSupplement`. The slot is
additive: jtype retains ownership of Card editing and mutations.
Not yet (flag-gated later): members/assignee options, versions/activity,
ticket badges (the `OCCSV-####` chip — the embed client has no ticket-index
endpoint, so cards never show it even when the board configures `ticketKey`),
comments, attachments upload, and rich Markdown preview. Notes remain fully
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
