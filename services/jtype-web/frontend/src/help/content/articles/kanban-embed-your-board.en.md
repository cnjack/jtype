Your board doesn't have to live only inside JType. With the `jtype-board-react` package you can drop a live, interactive board straight into your own website or app — columns, cards, drag-to-move — reading and writing the exact same data as the JType web and desktop boards. If you just want to *use* a board, read [The web board view](/help/c/kanban/web-board-view) instead; this article is for putting one inside another product.

## What you need

- A **board** in one of your workspaces (see [Boards and cards](/help/c/kanban/boards-and-cards)).
- Its **workspace id** and **board name** — the workspace id is the `…/workspaces/<id>` part of the URL when the workspace is open; the board name is just the board's file name without `.board` (e.g. a board file `roadmap.board` has the name `roadmap`).
- A **token** so the component can reach your data. Any `mcp`-scope token works — mint one exactly as you would for an AI client (see [Connect your AI](/help/c/ai-mcp/connect-your-ai) and [OAuth vs a scoped token](/help/c/ai-mcp/oauth-vs-token)). A React app can hold the token directly, or — recommended for anything public — keep it on your server (see *Keeping your token safe* below).

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
      token={yourMcpToken}
      workspaceId="3eec2a30-…"
      boardRef="roadmap"
    />
  )
}
```

That's the whole setup. The board resolves its columns and cards from that name, renders them, and writes card moves back to your workspace — so a card you drag in your app moves in JType too, and a change made in JType shows up in your embed. The style sheet is self-contained and scoped, so it won't restyle the rest of your page (and your page won't restyle the board).

## Live updates vs. auto-refresh

If the board can open a live connection it updates the moment a teammate moves a card. A **scoped `mcp` token can't open the live channel**, so the board falls back to **auto-refreshing every 30 seconds** and shows a small "Auto-refresh" chip in the corner — it never pretends to be live when it isn't. You can watch which mode it's in with the `onConnectionChange` prop (`'live'` / `'polling'`).

## Keeping your token safe

An `mcp` token is an **account credential**: whoever holds it can read and write every note and board you can reach, for as long as it's valid. Putting a raw token in a page's JavaScript is fine for an internal tool on a trusted site, but for anything public **don't ship the token to the browser**. Instead, pass the component a `client` that routes its requests through your own server, where the token stays. In that mode the browser never sees a JType token at all. (Your developers will find the `client` prop and the full prop list in the package's README.)

## Good to know

- **Read-only embeds**: set `readOnly` to show a board without any edit or drag affordances.
- **What renders today**: editable status columns, cards, drag to move/reorder, board/table/calendar, optional horizontal rows, multi-select filters, search/sort, and a read-only card detail. Card notes show as plain text, and members, versions, comments and ticket badges aren't in the embed yet.
- **Personal filter**: pass `currentUser` to enable **My cards** in the filter popover.
- **Revoking access**: because the embed uses an ordinary token, you can revoke it any time from your token list — the embed simply stops loading and shows an error state, never stale data.
