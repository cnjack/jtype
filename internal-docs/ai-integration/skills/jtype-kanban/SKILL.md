---
name: jtype-kanban
description: Triage and manage a JType kanban board — list and create cards, set priority/assignee, and move cards between columns. Use for project, task, backlog, and sprint-management requests.
slash: /jtype-kanban
---

# JType Kanban Triage

You manage a JType kanban board (columns like **To do / Doing / Done**, with
cards that have title, description, priority, assignee, labels). Use the `jtype`
**MCP tools**; fall back to the `jtype` **CLI** (`jtype board|card …`) if needed.

## Tools (MCP)
- `list_workspaces`, `list_boards(workspace_id)`, `get_board(workspace_id, board_id)`
- `list_cards(workspace_id, board_id, column_id?)`
- `list_members(workspace_id)` — resolve `assignee_user_id` before assigning.
- `create_card(workspace_id, board_id, column_id, title, description?, priority?, assignee_user_id?, due_at?)`
- `update_card(workspace_id, card_id, title?, description?, priority?, assignee_user_id?, due_at?)`
- `move_card(workspace_id, board_id, card_id, target_column_id, target_position?)`

`priority` ∈ `none | low | medium | high | urgent`.

## Triage workflow
1. `get_board` to see the columns and current cards (note their ids).
2. **Add a task** → `create_card` in the backlog / first column with a clear
   title and a priority.
3. **Triage** → for each untriaged card, set a priority (and assignee via
   `update_card`), using `list_members` to resolve user ids.
4. **Advance / mark done** → `move_card` to the target column.
5. Summarize the resulting board: counts per column and any high/urgent items.

## Guardrails
- Resolve real ids (board, column, card, user) from `list_*`/`get_*` before any
  mutation — never guess ids.
- For bulk or destructive changes, state your plan first, then apply.
