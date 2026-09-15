The boards you create in a workspace come alive in the web app. It's the place to drag work forward, see what teammates are doing as they do it, and slice a busy board down to just what matters to you. If you're brand new to boards, read [Boards & cards](/help/c/kanban/boards-and-cards) first — this article is about *using* a board, not building one.

## Open a board

Sign in to the web app and pick your workspace, then open the **Kanban** area. Your boards are listed there; click one to open it. You'll see vertical swimlanes left to right — **To do**, **Doing**, **Done**, plus any you've added — each holding a stack of cards.

Click any card to open the **Card detail sheet** on the side. It keeps the board visible and remembers the scroll, selection, filters, and focused Card you came from. Closing the sheet — or returning from a related Card — restores that context and keyboard focus. Editors can change the title, schedule, status, priority, assignee, labels, relations, attachments, reminder, archive state, and Markdown description there. Viewers get the same context without mutation controls.

## Drag cards across swimlanes

Moving work is a drag. Press on a card and drag it:

- **down or up** within a status swimlane to reorder it,
- **sideways** into another swimlane to change the selected field.

When the board uses Status swimlanes, a sideways drop changes `status`; Priority changes `priority`; Assignee changes `assignee`; Custom changes the stable `swimlane` ID. JType saves the move immediately. A status move is the same operation as `jtype card move --board B <card> --to-column C` — the board view just gives you a pointer-driven way to do it.

## Manage the status workflow

Statuses are the default swimlanes of a JType board. Open **Manage statuses** beside the **Swimlanes** control to add, rename, reorder, recolor, or delete them, set a WIP limit, and choose which status counts as done.

Each status has a stable internal ID. Renaming **Doing** to **In progress**, for example, changes the label without losing its cards. When you delete a status that still has cards, the confirmation names the first remaining status that will receive them; cancel if that fallback is not the workflow you want.

## Realtime updates

A board is live. When a teammate moves a card, renames a column, or edits a description, your board updates on its own — no refresh needed. Each change streams over a live connection and lands on every open board in the workspace within moments.

Your own actions never echo back to you as a flicker: the board knows which changes you made and quietly skips them, so you only see *other* people's edits arrive. If your connection drops, the board reloads the authoritative state as soon as it reconnects, so you never act on a stale view.

> Tip: open the same board on two screens — say your laptop and a meeting display — and drag a card on one. It moves on the other almost instantly. That's the realtime layer doing its job.

## Filter, sort, arrange, and search

A real board gets crowded. The toolbar above the columns gives you several ways to focus, and they stack:

- **Filters** — combine multiple priorities, assignees, labels, due-date ranges, blocked cards, and **My cards**. Choices within one section match any selected value; different sections must all match.
- **Sort** — order cards within each swimlane, e.g. by priority or due date.
- **Swimlanes** — choose the one vertical dimension: Status (the normal workflow), Priority, Assignee, or Custom.
- **Manage** — status swimlanes manage workflow states; custom swimlanes have stable IDs and editable names, colors, and order. Priority or Assignee can be converted to editable custom swimlanes.
- **Search** — type to narrow to cards whose title or text matches.

Active filters appear as removable chips, and the filter panel shows how many cards remain visible. Switch among **Board**, **Table**, **Calendar**, **Backlog**, and **Gantt** without creating a second copy of the work. Filters and search run instantly in your browser and are personal: they change *your* view only and never move cards. JType also persists your view, scope, grouping, sorting, filters, and collapsed groups for this board; those preferences do not rewrite the shared `.board` file.

## My Work and Inbox

Choose **My Work** to project the Cards assigned to you in the current project. Choose **Inbox** for actionable signals derived from the same Cards: an `@mention`, a due reminder, work due today or overdue, or an assigned Card whose dependencies still block it. Dismissing an Inbox item is a personal, same-device view action; changing the underlying mention, date, or dependency produces a new signal.

## Batch changes

Select multiple Cards to set the assignee, labels, due date, or archive state in one pass. The selection toolbar states the number of affected Cards and read-only members never see mutation actions. If an operation fails, JType shows the failure and keeps the selection so you can retry rather than pretending the whole batch succeeded.

## Field-level Activity

The **Activity** tab explains what changed instead of showing only opaque save versions. Each entry can include field-level before/after values plus the server-derived actor, client, and token label — for example, “Maya changed Status from To do to Doing · Web” or “Release agent added label `blocked` · MCP · nightly-triage”. Raw tokens, token hashes, and fingerprints are never displayed. Older Cards without structured events fall back to their version history.

## Where to go next

- The model behind it all: [Boards & cards](/help/c/kanban/boards-and-cards).
- Keep cards flowing without opening the app: [What AI can do](/help/c/ai-mcp/what-ai-can-do).
- Make sure teammates can edit: [Members & roles](/help/c/sync-workspaces/members-and-roles).
