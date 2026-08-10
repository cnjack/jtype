Your board doesn't have to live only inside JType. With the `jtype-board-react` package you can drop a live, interactive board straight into your own website or app — columns, cards, drag-to-move — reading and writing the exact same data as the JType web and desktop boards. If you just want to *use* a board, read [The web board view](/help/c/kanban/web-board-view) instead; this article is for putting one inside another product.

## What you need

- A **board** in one of your workspaces (see [Boards and cards](/help/c/kanban/boards-and-cards)).
- Its **workspace id** and **board name** — the workspace id is the `…/workspaces/<id>` part of the URL when the workspace is open; the board name is just the board's file name without `.board` (e.g. a board file `roadmap.board` has the name `roadmap`).
- A **REST-capable user/session token** so the component can reach your data, or an injected `client` that proxies the same document API. A board-pinned token from **Board settings → MCP access** is MCP-only and returns `403` on the REST and live endpoints used by this package. For production, keep the session token on your server and use `client` (see *Keeping your token safe* below).

## Add it to a React app

The board ships as a normal npm package with peer-dependencies on React 18 or 19:

```bash
npm install jtype-board-react
```

```tsx
import { JTypeBoard } from 'jtype-board-react'
import 'jtype-board-react/style.css'

export function MyBoard() {
  return (
    <JTypeBoard
      baseUrl="https://jtype.nightc.com"
      token={yourSessionToken}
      workspaceId="3eec2a30-…"
      boardRef="roadmap"
    />
  )
}
```

That's the whole setup. The board resolves its columns and cards from that name, renders them, and writes card moves back to your workspace — so a card you drag in your app moves in JType too, and a change made in JType shows up in your embed. The style sheet is self-contained and scoped, so it won't restyle the rest of your page (and your page won't restyle the board).

## Live updates vs. auto-refresh

If the board can open a live connection it updates the moment a teammate moves a card. When a live connection is unavailable, the board falls back to **auto-refreshing every 30 seconds** and shows a small "Auto-refresh" chip in the corner — it never pretends to be live when it isn't. You can watch which mode it's in with the `onConnectionChange` prop (`'live'` / `'polling'` / `'error'`). A board-pinned MCP token cannot load the initial REST snapshot at all; polling is not an authorization workaround.

## Keeping your token safe

A full session token is an **account credential**: whoever holds it can use the document APIs available to that user for as long as it remains valid. Putting one in page JavaScript is acceptable only for a trusted, self-hosted internal tool. For anything public, **do not ship the token to the browser**. Instead, pass the component a `client` that routes requests through your own server and enforces the intended workspace/board boundary. In that mode the browser never sees a JType token. (The package README documents the complete client contract, including atomic `createOnly` handling.)

## Good to know

- **Read-only embeds**: set `readOnly` to show a board without any edit or drag affordances.
- **What renders today**: selectable vertical swimlanes (status, priority, assignee, or custom), Board/Table/Calendar/Backlog/Gantt projections, drag to move/reorder, multi-select and bulk edits, search/sort/filters, and editable or read-only Card detail. Members, comments, server Activity, uploads, and ticket badges are not supplied by the bundled client.
- **Personal work**: pass `currentUser` to enable **My Work** and Card-derived **Inbox** signals.
- **Revoking access**: because the embed uses an ordinary token, you can revoke it any time from your token list — the embed simply stops loading and shows an error state, never stale data.
