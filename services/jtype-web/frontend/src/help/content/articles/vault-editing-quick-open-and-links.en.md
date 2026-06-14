A vault of a hundred notes is only useful if you can reach the right one in a second. JType gives you a few simple ways to move around — and to connect notes so related ideas stay one click apart.

## File navigation

In vault mode, the sidebar mirrors your folder on disk. It's the map of everything you've got:

- Click a folder to expand it; click a note to open it in the editor.
- The tree reflects the real subfolders in your vault — the same ones you'd see in Finder or Explorer.
- New notes and folders you create here land as real files on disk immediately.

This is the slow, deliberate way to browse. For speed, reach for quick open.

## Quick open

**Quick open** is the fastest way to jump to a note: start typing part of its name and pick it from the list, without taking your hands off the keyboard.

- Type a few letters of the title or path — matches narrow as you go.
- Press Enter to open the top result.
- It searches across every folder, so you don't need to remember where a note lives.

When you know roughly what a note is called, quick open beats clicking through the tree every time.

## Document info

Open **document info** for the note you're editing to see its details at a glance — its path in the vault, and the frontmatter values it carries, such as `title` and whether `publish` is set. It's the quickest way to confirm a note is set up the way you intend before you sync or publish it. For more on frontmatter, see [Writing Markdown](/help/c/vault-editing/writing-markdown).

## Linking notes together

The real power of a vault shows up when notes point at each other. JType supports **wikilinks** — wrap a note's name in double brackets:

```markdown
See [[Launch plan]] for the timeline.

You can relabel a link too: [[launch-plan|the full plan]].
```

- `[[Launch plan]]` links to the note named *Launch plan* and shows that text.
- `[[launch-plan|the full plan]]` links to `launch-plan` but displays "the full plan".

In the preview, a wikilink is clickable: select it and JType opens the target note in your vault. Because the link is stored as plain text in the file, it stays meaningful even when you open the note in another editor.

Standard Markdown links work too, for anything outside the vault:

```markdown
[JType on GitHub](https://github.com/cnjack/jtype)
```

## A practical loop

1. **Quick open** the note you want to work in.
2. Write, and **link** out to related notes with `[[...]]` as you mention them.
3. Check **document info** to confirm the title and publish flag.
4. Use **file navigation** when you want to browse a whole folder rather than jump to one note.

## Where to go next

- The basics of the editor: [Writing Markdown](/help/c/vault-editing/writing-markdown).
- What a vault actually is: [How vaults work](/help/c/vault-editing/how-vaults-work).
- Take a vault to other devices: [Push, pull, sync](/help/c/sync-workspaces/push-pull-sync).
