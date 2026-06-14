A **vault** is the home for your notes — just a normal folder of Markdown (`.md`) files on your device. In this article you'll open one, write your first note, and try the three editor modes. Nothing here touches the cloud; every keystroke lands in a plain text file you fully own.

## Open or create a vault

From the welcome screen, choose one of:

- **Use the default vault** — JType creates and opens `~/Documents/.jtype`. Best if you just want to start writing.
- **Open vault** — pick any existing folder. If it already has `.md` files, JType reads them as-is. Your folders like `meetings/` or `projects/` stay exactly where they are.

Already inside the app? Use **File → Open Vault** to switch to a different folder at any time.

> The folder *is* the source of truth. There's no import or export step — open the same folder in any other editor and your notes are right there.

## Vault home vs. single-file mode

JType has two ways of working, and they look different on purpose:

- **Vault mode** is the full experience: a file tree to navigate, **quick open** to jump by name, the editor, **split preview**, document info, publishing checks, and (once you sign in) account and cloud sync.
- **Single-file mode** is a focused editor for one `.md` file, with no sync, account, or publish surfaces. Reach it from the welcome screen's **Open Markdown file**. It's ideal for a quick edit to a file that isn't part of a vault.

When you open a vault but haven't picked a document yet, you see the **vault home** — a calm landing spot, not a greyed-out editor.

## Write your first note

In vault mode, create a new note and give it a name like `welcome.md`. Type some Markdown:

```markdown
---
title: Welcome
---

# Welcome to my vault

This is my first **JType** note. It's a plain Markdown file
on disk — I can open it in any editor.

- [ ] Try split preview
- [ ] Publish something later
```

The `---` block at the top is **YAML frontmatter** — optional metadata about the note. You'll use it later to publish (`publish: true`) and set page details. Learn the syntax in [Writing Markdown](/help/c/vault-editing/writing-markdown).

## Write, split, and preview

The editor has three modes, switchable from the toolbar:

| Mode | What you see |
|---|---|
| **Write** | Just the Markdown source — distraction-free typing. |
| **Split** | Source on the left, live rendered preview on the right. |
| **Preview** | The fully rendered note, as a reader would see it. |

Start in **Write**, flip to **Split** to watch your formatting render as you type, then use **Preview** for a final read-through. Use **quick open** to jump between notes by name without leaving the keyboard.

## Your files stay on disk

Everything you just did wrote to real `.md` files in your folder. You can:

- back the folder up however you already back up files,
- edit the same notes in another app,
- and keep working entirely offline.

When you're ready to bring notes to another device or share with a teammate, bind the vault to a cloud workspace — see [Cloud workspaces & binding](/help/c/sync-workspaces/cloud-workspaces). To understand the whole model, read [How JType works](/help/c/getting-started/the-jtype-flow).
