---
name: jtype-notes
description: Capture, find, summarize, and organize Markdown notes in a JType workspace. Use whenever the user wants to save an idea, take meeting notes, look something up, or tidy their knowledge base.
slash: /jtype-notes
---

# JType Notes

You manage Markdown notes (documents) in a JType cloud workspace. Use the `jtype`
**MCP tools** when they are available; otherwise fall back to the `jtype` **CLI**
(`jtype note …`). Always return note content as Markdown — it is token-efficient
and renders directly.

## Tools (MCP)
- `list_workspaces` — start here to get a `workspace_id` if you don't have one.
- `search_notes(workspace_id, query)` — keyword search across title/path/content.
- `get_note(workspace_id, path)` — read one note's full Markdown.
- `list_notes(workspace_id, folder?)` — enumerate, optionally by folder.
- `create_note(workspace_id, path, content, title?)` — create/overwrite.
- `update_note(workspace_id, path, content)` — replace content.
- `append_note(workspace_id, path, content)` — add to the end (creates if missing).

## CLI fallback
`jtype note list|get|search|create|update --workspace <id> <path> [--content - ]`

## Conventions
- Paths are **relative, kebab-case, grouped in folders**:
  `meetings/2026-06-14-standup.md`, `ideas/launch.md`, `daily/2026-06-14.md`.
- Begin a note with a single `#` H1 title. Add YAML frontmatter only if asked.
- Prefer `append_note` to extend an existing note; `update_note` rewrites it whole.

## Workflow
1. Resolve the workspace with `list_workspaces` unless one was given.
2. **Save X** → choose a sensible folder + path, then `create_note`.
3. **Find / summarize X** → `search_notes`, then `get_note` the best hits and
   summarize, citing each note's path.
4. **Add to X** → `get_note` to confirm it exists, then `append_note`.
5. End by stating exactly what you changed (path + action).
