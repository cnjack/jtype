Every card has a **Comments** section in its peek panel — the place to discuss the work without editing the card's description. Comments are a cloud feature: they live in your workspace (not in the `.md` file), so the card's Markdown stays clean while the discussion history stays attached.

## Writing comments

The comment box takes **Markdown** — bold, lists, task items, code, even images. Press **Cmd/Ctrl+Enter** to post. Your own comments show ✎ **edit** and ✕ **delete** buttons on hover; edited comments carry a small *edited* badge. Workspace admins can delete any comment, but nobody can edit someone else's words.

## Threads and replies

Use the ↩ **reply** button on a comment to answer in its thread. Threads are one level deep on purpose — replying to a reply lands in the same thread, so a discussion never turns into a pyramid. Deleting a thread's root removes the whole thread.

## Reactions

The 😊 button opens a small emoji row (👍 ❤️ 🎉 😄 👀 ✅). Click to react; click the same emoji again to take it back. Reaction chips show the count, and chips you've reacted with are tinted.

## Resolving discussions

When a thread has served its purpose, hit the ✓ **resolve** button on the root comment. The whole thread folds into a single quiet line — *Resolved · first line of the comment* — keeping long-lived cards readable. Click the folded bar to expand it again, and unresolve if the topic reopens.

## Where comments work

- **Web board**: full comments, always.
- **Desktop board**: when your vault is bound to a cloud workspace and sync is on, the desktop card peek shows the same threads and can post, react, and resolve. An unbound (purely local) vault has no comments — there is no cloud to keep them in.
- **AI tools**: agents connected over MCP can read and post card comments too (`list_card_comments`, `comment_card`, `resolve_card_comment`) — useful for leaving review findings directly on the card being reviewed.
