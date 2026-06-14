Your vault is yours alone until you decide otherwise. A **cloud workspace** is the optional online home that lets a vault sync across devices, be shared with teammates, hold kanban boards, and back a published site. Your Markdown files stay exactly where they are — the workspace is a boundary you opt into, not a place your notes move to.

## What a cloud workspace is

A cloud workspace is the server-side boundary for everything collaborative:

- **Sync** — push your local edits up and pull others' edits down.
- **Sharing & members** — invite people and give them roles (see [Members & roles](/help/c/sync-workspaces/members-and-roles)).
- **Kanban** — boards and cards that live in the workspace, not in your files.
- **Publishing** — the source for your public [site](/help/c/publishing/publish-a-site).
- **Storage budget** — a per-workspace allowance for the notes it holds.

You never *have* to use one. A vault works fully offline. You bind to a workspace the moment you want a note on a second device, a teammate in the loop, or a page on the web.

## Create a workspace on the web

1. Open your JType web service (locally that's `http://localhost:13345`) and sign in.
2. Create a new workspace and give it a name. JType assigns it an id and a slug.
3. That's it — the workspace is ready to receive a vault.

## Sign in on desktop with browser OAuth

The desktop app never asks for a password. When you connect your account, JType opens your browser, you sign in to the web service there, and approval flows back to the app. This is the same browser-based OAuth the CLI and AI connectors use, so your credentials only ever live in one trusted place.

## Bind a vault to a workspace

A **binding** is a per-device link: **one cloud workspace ↔ one local vault path**. It's written to `.jtype/cloud.json`, sitting right next to your files, so each machine knows which folder maps to which workspace. No secret token is stored there — the file is safe to keep in the vault.

From the CLI, bind the vault in your current directory. You can name the workspace by id, name, or slug:

```bash
jtype login
jtype workspace list          # find the workspace id / name / slug
jtype bind --workspace "Team Docs"
jtype vault status            # confirm the vault root + binding
```

`jtype vault status` shows the vault root JType detected (it walks up from your current folder for a `.jtype/` directory) and the workspace it's bound to.

## After you bind

Once a vault is bound, your note commands stay **local-first** — they still read and write the Markdown files in your working directory. Binding simply tells `jtype sync` which workspace to talk to. To learn the two-way flow and how conflicts are handled, see [Push & pull sync](/help/c/sync-workspaces/push-pull-sync).

> One workspace per vault path, per device. Bind a different folder to a different workspace freely — each `.jtype/cloud.json` is independent.
