Once you've [connected an assistant](/help/c/ai-mcp/connect-your-ai), the tools it sees depend on the endpoint you connect. The notes endpoint exposes note tools; a board-scoped endpoint generated from Board settings exposes exactly **nine tools for that board**. Every write respects your role in the cloud workspace.

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
| `list_members` | reads | Lists cloud workspace members. |

Read tools return plain Markdown, so the assistant sees your notes exactly as they are on disk.

## Board-scoped kanban tools

| Tool | Reads or writes | What it does |
|---|---|---|
| `get_board` | reads | Returns the pinned board and its cards. |
| `list_cards` | reads | Lists cards on a board, optionally in one column. |
| `get_card` | reads | Gets one card by its `documentId`. |
| `create_card` | writes | Creates a card and returns its `documentId` (stable while the card exists). |
| `update_card` | writes | Edits title, Markdown body, status, priority, assignee, due date, or parent by `documentId`. |
| `move_card` | writes | Moves a card to another column or position. |
| `list_card_comments` | reads | Lists the comment threads on a card. |
| `comment_card` | writes | Adds a comment or reply to a card. |
| `resolve_card_comment` | writes | Resolves or reopens a comment thread. |

The endpoint URL and token are both pinned to one board. These schemas contain no workspace, board, or path override. A card created by `create_card` returns `documentId` immediately, and all later card-content operations use that ID.

## What AI can never do

Board-settings tokens are scoped to **one board only** and are accepted only by its pinned MCP endpoint. They cannot be used against another board or the ordinary REST API. **Admin actions are never available to an AI token.** That means an assistant cannot:

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
