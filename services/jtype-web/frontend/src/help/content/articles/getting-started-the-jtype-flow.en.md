JType is built around one idea: **your notes are plain Markdown files that live on your machine first.** Everything else — cloud sync, kanban, publishing, AI — is something you opt into, file by file and workspace by workspace, when there's an actual job to do.

There are four concepts to know. Once they click, the rest of JType is obvious.

## The vault

A **vault** is just a normal folder of Markdown (`.md`) files on your device. No proprietary database, no "export" step — the folder *is* the source of truth.

- You can keep your usual subfolders (`meetings/`, `projects/`, `daily/`).
- You can open the same folder in any other editor; JType never locks your files.
- The default vault lives at `~/Documents/.jtype`, but you can open any folder.

> If you stop using JType tomorrow, you still have a clean folder of Markdown. That's the point of *local-first*.

## The cloud workspace

A **cloud workspace** is the optional online boundary for everything collaborative: sync, sharing, kanban, publishing, storage budget, and membership.

You don't have to use one to write. When you *do* want a note on another device, a teammate in the loop, or a page on the web, you bind your vault to a workspace.

## The binding

A **binding** is a per-device link from one cloud workspace to one local vault path. It's stored next to your files in `.jtype/cloud.json`, so each machine knows which folder maps to which workspace.

Once bound, **sync** is a two-way push/pull: your local edits go up, others' edits come down, and JType helps you resolve conflicts when the same note changed in two places.

## The site

A **site** is the published, read-only output of selected notes. Add `publish: true` to a note's frontmatter and it becomes part of your public site at `/u/:username`, while the source stays Markdown in your vault.

## Putting it together

```text
  Local vault  ──bind──▶  Cloud workspace  ──publish──▶  Public site
  (your files)            (sync · kanban · members)      (/u/you)
       ▲                          ▲
       └────── jtype CLI ─────────┘
       └────── AI via MCP ────────┘
```

A typical week looks like this:

1. **Write** in your vault on the desktop app — local, fast, private.
2. **Sync** to your cloud workspace when you want it on another device or shared with a teammate.
3. **Triage** work on a kanban board in the same workspace.
4. **Publish** the notes that should be public.
5. **Automate** the boring parts by letting an AI assistant read and update notes and cards over MCP.

You can stop at step 1 forever and JType is still a great local Markdown editor. Each later step is there when you need it — never before.

## Where to go next

- New here? Start with [Install JType](/help/c/getting-started/install-jtype) and [Open your first vault](/help/c/getting-started/your-first-vault).
- Ready to collaborate? See [Cloud workspaces & binding](/help/c/sync-workspaces/cloud-workspaces).
- Want a public page? See [Publish a site](/help/c/publishing/publish-a-site).
