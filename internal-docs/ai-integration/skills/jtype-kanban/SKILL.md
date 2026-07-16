---
name: jtype-kanban
description: Triage and manage a JType kanban board — list and create cards, set priority/assignee/parent, move cards between columns, and discuss cards in comment threads. Use for project, task, backlog, and sprint-management requests.
slash: /jtype-kanban
---

# JType Kanban Triage

You manage a JType kanban board (columns like **To do / Doing / Done**; cards are
Markdown notes with `board`/`status` frontmatter). Use the `jtype` **MCP tools**
(the kanban server at `/mcp/kanban`); fall back to the `jtype` **CLI**
(`jtype board|card …`) if needed.

## Tools (MCP)
- `list_workspaces`, `list_boards(workspace_id)`, `get_board(workspace_id, board)`
- `list_cards(workspace_id, board, status?)` — cards carry `path`, `status`,
  `priority`, `assignee`, `due`, and `parent` (sub-card hierarchy).
- `create_card(workspace_id, board, status, title, priority?, assignee?, due?, parent?)`
- `update_card(workspace_id, path, status?, priority?, assignee?, due?, parent?)`
  — an empty string clears a field; `parent` takes a card slug (filename
  without `.md`) and makes the card a sub-card.
- `move_card(workspace_id, path, to, position?)`
- `list_card_comments(workspace_id, path)` — comment threads with replies,
  reactions, and resolve state.
- `comment_card(workspace_id, path, body, parent_id?)` — Markdown body; pass a
  root comment id as `parent_id` to reply in that thread.
- `resolve_card_comment(workspace_id, comment_id, resolved)` — close or reopen
  a discussion thread.

`priority` ∈ `none | low | medium | high | urgent`.

## CLI equivalents
```bash
jtype card list --board <id> [--status <col>]
jtype card create --board <id> --status <col> "Title" [--priority high] [--parent epic-slug]
jtype card set <path> --status done --parent ""        # empty string clears
jtype card move <path> --to doing
```

## Triage workflow
1. `get_board` to see the columns and current cards (note their paths).
2. **Add a task** → `create_card` in the backlog / first column with a clear
   title and a priority. For work under an epic, set `parent` to the epic
   card's slug so the board shows a progress ring on the parent.
3. **Triage** → for each untriaged card, set priority/assignee via `update_card`.
4. **Advance / mark done** → `move_card` to the target column.
5. **Discuss / report** → `comment_card` to leave findings on a card (reply in
   the same thread with `parent_id`); `resolve_card_comment` once a discussion
   is settled.
6. Summarize the resulting board: counts per column and any high/urgent items.

## Guardrails
- Resolve real identifiers (board id, card path, comment id) from
  `list_*`/`get_*` before any mutation — never guess.
- For bulk or destructive changes, state your plan first, then apply.
