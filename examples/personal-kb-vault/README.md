---
title: Personal KB — read me first
publish: false
---

# My personal knowledge base

This is a small, real JType vault you can open and poke at. It's a folder of
plain Markdown files — nothing proprietary, nothing hidden. Open it in JType
(**Open vault**), or read the files in any editor you like.

## How it's organized

| Folder / file | What lives here |
| --- | --- |
| `inbox.md` | Fast, unsorted captures. The catch-all. |
| `daily/` | One dated log per day, e.g. `daily/2026-06-14.md`. |
| `notes/` | **Evergreen notes** — one idea each, refined over time. |
| `moc/` | **Maps of content** — hub pages that link out to related notes. |
| `.jtype/` | Vault config. `cloud.json` appears here after `jtype bind`. |

## The loop

1. **Capture** anything into `inbox.md` — from the editor or the terminal:

   ```bash
   jtype note create inbox.md --content "Idea I don't want to lose"
   ```

2. **Link** the keepers into `notes/` and connect them with normal Markdown
   links. Start from the [reading map of content](moc/reading.md).
3. **Review** weekly in split mode; clear the inbox.
4. **Publish** a note by setting `publish: true` in its frontmatter (see
   [Spaced repetition](notes/spaced-repetition.md), which is published here).

## Start reading

- [Reading — map of content](moc/reading.md)
- [Building a second brain](notes/second-brain.md)
- [Spaced repetition](notes/spaced-repetition.md)
- [Today's daily note](daily/2026-06-14.md)
