Kanban in JType is local-first. A board is a `.board` document in your **vault**, next to the Markdown notes that act as its cards. The Desktop app edits that board offline; bind the vault to a **cloud workspace** to open and collaborate on the same board in the Web app. A board is made of **status columns**, and each column holds **cards**.

If you want Web or team access and haven't connected a workspace yet, start with [Cloud workspaces & binding](/help/c/sync-workspaces/cloud-workspaces). Local Desktop boards do not require a cloud connection.

## Boards and columns

A **board** belongs to one workspace and groups related work — a roadmap, a sprint, a content calendar. Every new board starts with three statuses: **To do**, **Doing**, and **Done**, displayed as vertical swimlanes. You can rename, recolor, and reorder statuses, and give each one an optional WIP (work-in-progress) limit as a gentle hint. The limit is advisory only — JType never blocks you from adding one more card.

Each status has a stable ID stored in the card's `status` frontmatter field, so renaming a status does not disconnect its cards. Status is the default swimlane choice, but you can switch the same vertical columns to **Priority**, **Assignee**, or **Custom**. Dragging a card between swimlanes updates the field that owns the current view: `status`, `priority`, `assignee`, or the stable custom `swimlane` ID.

To see the boards in a workspace from the terminal:

```bash
jtype board list
jtype board get roadmap   # columns + cards for one board
```

## Cards: priority and assignee

A **card** is one unit of work. Beyond its title, a card can carry:

- a **description** (Markdown),
- a **priority** — one of `none`, `low`, `medium`, `high`, or `urgent`,
- an **assignee**, who must be a member of the workspace,
- a **due date**, and colored **labels**.

In the Desktop and Web apps, choose **New card** at the bottom of a swimlane to open the focused quick-create window. Add the title and Markdown description, then set status, priority, assignee, labels, and due date without leaving the board. Press **Command/Ctrl + Enter** to create it. Opening an existing card uses a larger detail view: the Markdown description and conversation stay in the main area, while workflow properties remain grouped in the inspector on the right (or below the content on a narrow screen).

Create and move cards from the CLI:

```bash
# Add a high-priority card to the "Doing" column
jtype card create --board roadmap --column Doing "Ship the export dialog" \
  --priority high --assignee jack --description "Wire the modal to the API"

# List what's in one column
jtype card list --board roadmap --column Doing

# Move it to Done, dropping it at the top of the column
jtype card move --board roadmap card_8f3a --to-column Done --position 0
```

Update a card in place without moving it:

```bash
jtype card update card_8f3a --priority urgent --assignee maya
```

A couple of rules worth knowing: an assignee has to be an active member of the workspace (otherwise the command is rejected), and `priority` only accepts the five values above. Moving a card to a column always compacts the order, so positions stay clean.

## How cards relate to notes

This is the part people miss: **a card is not a separate database row you can never reach again.** In JType's unified model, a card *is* a Markdown note in your vault. Its kanban fields — which board, which swimlane, priority, assignee — live in the note's frontmatter, and its body is the card's description:

```markdown
---
board: roadmap
status: doing
priority: high
assignee: jack
---
# Ship the export dialog

Wire the modal to the API and add a progress bar.
```

So a card shows up in the file tree, in search, and in the trash — because it's just a note. Drag it on a board and you're rewriting that note's frontmatter; edit the note in the editor and the card updates. The board is a **view** over the notes that name it.

## Where to go next

- See your boards in the browser: [The web board view](/help/c/kanban/web-board-view).
- Drive boards from an assistant: [What AI can do](/help/c/ai-mcp/what-ai-can-do).
- New to the CLI? Start with [Install & log in](/help/c/cli/install-and-login).
