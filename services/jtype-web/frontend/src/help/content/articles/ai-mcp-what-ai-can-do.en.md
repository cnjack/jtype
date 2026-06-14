Once you've [connected an assistant](/help/c/ai-mcp/connect-your-ai), it can reach exactly **14 tools** — seven for notes and seven for kanban. Nothing else. The tools map onto the same actions you can take yourself in the app, and every write respects your role in the workspace.

## Notes tools

| Tool | Reads or writes | What it does |
|---|---|---|
| `list_workspaces` | reads | Lists the cloud workspaces you can reach. |
| `list_notes` | reads | Lists notes in a workspace, optionally under a folder. |
| `get_note` | reads | Returns one note's Markdown by path. |
| `search_notes` | reads | Searches titles, paths, and content for a query. |
| `create_note` | writes | Creates a new note at a path. |
| `update_note` | writes | Replaces a note's content. |
| `append_note` | writes | Adds content to the end of a note. |

Read tools return plain Markdown, so the assistant sees your notes exactly as they are on disk.

## Kanban tools

| Tool | Reads or writes | What it does |
|---|---|---|
| `list_boards` | reads | Lists boards in a workspace. |
| `get_board` | reads | Returns a board with its columns, cards, and labels. |
| `list_cards` | reads | Lists cards on a board, optionally in one column. |
| `list_members` | reads | Lists workspace members (to resolve assignees). |
| `create_card` | writes | Creates a card with title, description, priority, assignee. |
| `update_card` | writes | Edits a card's title, description, priority, or assignee. |
| `move_card` | writes | Moves a card to another column or position. |

## What AI can never do

The tokens an assistant uses are **mcp-scoped** — notes and kanban only. **Admin actions are never available to an AI token.** That means an assistant cannot:

- add or remove workspace members, or change anyone's role;
- delete a workspace or change its settings;
- mint or revoke tokens, or touch billing.

Writes also honour your own role. If you only have read access to a workspace, the assistant only reads it too — connecting AI never grants more than you already have. See [Members and roles](/help/c/sync-workspaces/members-and-roles).

## Example asks

You drive everything in plain language. A couple of asks to try:

> "Search my notes for anything about onboarding, then create a note `meetings/2026-06-14-standup.md` summarising the open questions."

> "Look at my Launch board, move every Done card out of In Progress, and create a high-priority card 'Write release notes' in To Do."

The assistant decides which tools to call; you stay in control of what gets written. Because notes are plain Markdown in your vault, anything it creates syncs and publishes like any other note — see [How vaults work](/help/c/vault-editing/how-vaults-work) and [Boards and cards](/help/c/kanban/boards-and-cards).

## Where to go next

- [Connect your AI](/help/c/ai-mcp/connect-your-ai) — per-client setup.
- [OAuth vs scoped token](/help/c/ai-mcp/oauth-vs-token) — how access is granted and revoked.
