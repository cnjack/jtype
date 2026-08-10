Three board tools for when a project grows past a handful of cards: sub-cards for breaking down big work, multi-select for editing in bulk, and a search box that looks inside cards — not just at their titles.

## Sub-cards

Any card can become a **sub-card** of another by pointing its `parent` frontmatter at the parent's relative path without `.md`:

```markdown
---
title: Design login form
board: roadmap
status: todo
parent: [[roadmap/login-epic]]
---
```

You rarely type this by hand:

- In a card's peek panel, pick a **Parent** from the dropdown.
- Or use the **Sub-cards** section on the parent: type a title in *"+ Add sub-card"* and JType creates the card in the first column with the parent already set.
- From the CLI: `jtype card create --board roadmap --status todo "Design form" --parent roadmap/login-epic`, or re-parent later with `jtype card set <path> --parent roadmap/login-epic` (an empty string detaches).

Older basename-only references such as `[[login-epic]]` remain compatible when
that filename is unique. New path-based references avoid attaching a sub-card
to the wrong parent when different folders contain cards with the same name.

Once a card has children, its face shows a **progress ring** — done/total, where a child counts as done when it sits in the board's done column. The parent's peek lists every sub-card with its status; click one to jump to it.

Sub-cards are ordinary cards: they appear in their own columns, move and filter like everything else, and the hierarchy is one honest frontmatter field — visible in the Markdown, synced everywhere, readable by AI tools.

## Batch edits

**Cmd/Ctrl-click** cards to select several (selected cards get a highlighted ring). A floating toolbar appears at the bottom:

- **Status…** moves every selected card to a column.
- **Priority…** sets the priority on all of them.
- **Assignee…** assigns or unassigns the selection.
- **Add labels** adds a chosen label to every selected Card without removing their other labels.
- **Due…** sets or clears one due date across the selection.
- **Archive** removes the selection from active views while keeping every Markdown Card recoverable through the Archived filter.
- **Delete** trashes the whole selection after a single confirmation.
- **Escape** or the ✕ clears the selection.

Cmd-clicking a selected card removes it from the selection. Batch edits use the same per-card save path as single edits, so cloud sync, field-level Activity, and board webhooks see each change. A failure stays visible with the selection intact, so you can retry rather than losing track of the affected Cards.

## Full-text card search

The board's search box now matches more than titles. A query hits a card when it appears in the card's **title, ticket id, assignee, tags, or Markdown body**. Search combines with the filter and grouping controls, so "everything mentioning `payments` that's still assigned to Maya" is one search plus one filter.
