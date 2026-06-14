Kanban in JType lives in a **cloud workspace**. Once your vault is bound to a workspace, that same workspace can hold **boards** — visual lanes for tracking work — right next to your notes. A board is made of **columns**, and each column holds **cards**. That's the whole model.

If you haven't connected a workspace yet, start with [Cloud workspaces & binding](/help/c/sync-workspaces/cloud-workspaces). Everything below assumes you have a workspace.

## Boards and columns

A **board** belongs to one workspace and groups related work — a roadmap, a sprint, a content calendar. Every new board starts with three columns: **To do**, **Doing**, and **Done**. Columns are simply named lanes; you can rename them, recolor them, reorder them, and give them an optional WIP (work-in-progress) limit as a gentle hint. The limit is advisory only — JType never blocks you from adding one more card.

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

This is the part people miss: **a card is not a separate database row you can never reach again.** In JType's unified model, a card *is* a Markdown note in your vault. Its kanban fields — which board, which column, priority, assignee — live in the note's frontmatter, and its body is the card's description:

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
