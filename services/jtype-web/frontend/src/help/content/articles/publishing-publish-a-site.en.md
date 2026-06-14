Publishing in JType is deliberately small: you choose which notes go public, one at a time, by editing the note itself. There's no separate "export" pipeline and no copy of your content to keep in sync — the Markdown file in your vault stays the single source of truth.

## Mark a note for publishing

A note becomes public the moment its YAML frontmatter contains `publish: true`. Frontmatter is the small block fenced by `---` at the very top of the file. If your note doesn't have one yet, add it above the first line of content.

```markdown
---
title: Getting Started with JType
publish: true
---

# Getting Started

This page is now part of your public site. Everything below the
frontmatter renders as a normal Markdown page.
```

Notes **without** `publish: true` (or with `publish: false`) stay completely private — they live in your vault and sync to your workspace, but they never appear on the public web. Publishing is opt-in per file, so nothing leaks by accident.

You can add the line in the desktop editor, on the web, or straight from the [CLI](/help/c/cli/notes-bind-sync) — it's just text in a file.

## What your public site looks like

Your published notes are collected into a read-only **site**. The home page lives at:

```text
/u/your-username
```

Each published note gets its own page, keyed by its path inside the vault:

```text
/u/your-username/:page_path
```

So a vault file like `guides/getting-started.md` becomes a clean, shareable page on your site. Readers see a rendered, navigable version of your Markdown — headings, links, code blocks, tables, math, and diagrams all carry over. They never see your editor, your account, or your unpublished drafts.

## The source stays Markdown

Publishing never converts your note into some other format. The `.md` file in your vault is still exactly that — plain Markdown you can open in any editor, move between folders, or back up however you like. Unpublishing is just as simple: remove the `publish: true` line (or set it to `false`) and the page drops off your site on the next sync.

Because the file is the source of truth, your published page and your working note never drift apart in a way you can't see — what's in the file is what's on the site.

## Get it online

Publishing lives inside a cloud workspace, which is what serves the public site. If you haven't connected one yet, start with [Cloud workspaces & binding](/help/c/sync-workspaces/cloud-workspaces), then [push your changes up](/help/c/sync-workspaces/push-pull-sync) so the published note reaches the server.

## Where to go next

- Want your site on your own domain? See [Custom domains](/help/c/publishing/custom-domains).
- New to the model? Read [How JType works](/help/c/getting-started/the-jtype-flow).
- Prefer the terminal? [Bind & sync from the CLI](/help/c/cli/notes-bind-sync).
