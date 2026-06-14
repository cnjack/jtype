The boards you create in a workspace come alive in the web app. It's the place to drag work forward, see what teammates are doing as they do it, and slice a busy board down to just what matters to you. If you're brand new to boards, read [Boards & cards](/help/c/kanban/boards-and-cards) first — this article is about *using* a board, not building one.

## Open a board

Sign in to the web app and pick your workspace, then open the **Kanban** area. Your boards are listed there; click one to open it. You'll see your columns left to right — **To do**, **Doing**, **Done**, plus any you've added — each holding a stack of cards.

Click any card to open the **peek panel** on the side. It's a resizable detail view where you can edit the title, status, priority, assignee, due date, labels, and the Markdown description without leaving the board.

## Drag cards across columns

Moving work is a drag. Press on a card and drag it:

- **down or up** within a column to reorder it,
- **sideways** into another column to change its status.

When you drop a card, JType saves the move immediately and tightens the order so there are no gaps. Behind the scenes this is the same operation as `jtype card move --board B <card> --to-column C` — the board view just gives you a pointer-driven way to do it.

## Realtime updates

A board is live. When a teammate moves a card, renames a column, or edits a description, your board updates on its own — no refresh needed. Each change streams over a live connection and lands on every open board in the workspace within moments.

Your own actions never echo back to you as a flicker: the board knows which changes you made and quietly skips them, so you only see *other* people's edits arrive. If your connection drops, the board reloads the authoritative state as soon as it reconnects, so you never act on a stale view.

> Tip: open the same board on two screens — say your laptop and a meeting display — and drag a card on one. It moves on the other almost instantly. That's the realtime layer doing its job.

## Filter, sort, group, and search

A real board gets crowded. The toolbar above the columns gives you four ways to focus, and they stack:

- **Filter** — show only cards matching priority, assignee, label, or due date.
- **Sort** — order cards within each column, e.g. by priority or due date.
- **Group** — regroup the whole board by status, priority, or assignee.
- **Search** — type to narrow to cards whose title or text matches.

There's also a **Table** view if you'd rather scan everything as rows than as lanes. All of these run instantly in your browser and are personal: filtering or grouping changes *your* view only — it never moves anyone's cards or affects what a teammate sees. Your view preferences are remembered per board, so the board comes back the way you left it.

## Where to go next

- The model behind it all: [Boards & cards](/help/c/kanban/boards-and-cards).
- Keep cards flowing without opening the app: [What AI can do](/help/c/ai-mcp/what-ai-can-do).
- Make sure teammates can edit: [Members & roles](/help/c/sync-workspaces/members-and-roles).
