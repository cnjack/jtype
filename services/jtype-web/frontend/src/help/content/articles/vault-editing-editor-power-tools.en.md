The JType editor is a plain-Markdown editor on purpose — what you type is what lands in the `.md` file. Around that core, a set of power tools removes the friction of everyday writing. This page covers the slash menu, find & replace, image pasting, the clickable outline, and what the preview can render.

## The slash menu

Type `/` at the **start of a line** and a small insert menu opens at the caret. Keep typing to filter (`/tab` finds *Table*), navigate with ↑/↓, and press Enter to insert. Escape closes it.

Available blocks: headings 1–3, bullet / numbered / task lists, quote, code block, table, math block, Mermaid diagram, board embed, and divider. The slash trigger is line-start-only, so URLs and file paths mid-line never pop the menu.

## Find & replace

- **Cmd/Ctrl+F** opens find. Matches are counted and stepped with Enter / Shift+Enter (or Cmd+G / Cmd+Shift+G).
- **Cmd/Ctrl+Alt+F** opens the replace row directly, or click the chevron next to the search field.
- **Aa** toggles case-sensitive matching.
- **Replace** rewrites the current match; **All** rewrites every match in one step. Both go through the normal editing pipeline, so undo (Cmd+Z) works as usual.

Replace is available in write mode. In preview or split mode, find highlights the rendered text instead — matches there don't map 1:1 onto Markdown source, so replacing from those surfaces is disabled by design.

## Paste images from the clipboard

Copy a screenshot or an image and paste it straight into the editor (desktop app). JType saves the file under an `assets/` folder next to your document and inserts the link at the caret:

```markdown
![pasted-20260716-101530-x4f2.png](assets/pasted-20260716-101530-x4f2.png)
```

The preview resolves vault-relative image paths automatically, and if the vault is bound to a cloud workspace, the image syncs like any other asset. On the web editor, pasting an image uploads it to the workspace asset store and inserts the link the same way.

## Clickable outline

The Document Info panel's **Outline** lists every heading. Clicking one jumps the editor to that heading — in write and split mode the cursor lands on the heading line; in preview mode the rendered section scrolls into view.

## Richer preview

The preview (and split view) now renders more than plain HTML:

- **Syntax highlighting** — fenced code blocks with a language tag (` ```ts `, ` ```python `, …) are highlighted. Every code block gets a hover **Copy** button.
- **Image lightbox** — click any image in the preview to view it full-size; click again or press Escape to close.
- **Live HTML preview** — a ` ```html ` fence renders its content inside a fully sandboxed frame (no scripts run). Use the **Preview / HTML** tabs on the block to flip between the rendered result and the highlighted source.

These also apply to exported PDFs where it makes sense: code keeps its highlighting, while interactive chrome (copy buttons, tabs) is left out.
