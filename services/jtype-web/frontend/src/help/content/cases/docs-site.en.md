A three-person team behind a small developer tool, **Tideline**, kept their product docs in a wiki that nobody loved. Edits needed a browser, the export was locked in, and "is this page live yet?" was a question no one could answer without clicking around. They wanted the docs to be *files* — reviewable, greppable, theirs — and they wanted those same files on a real website, on their own domain. JType lets them do exactly that, with nothing between the words and the web except one line of frontmatter.

## The situation

The docs were short and changed often: an intro, a getting-started guide, an FAQ, and a changelog. Most pages were public, but a few drafts and internal runbooks had to stay private. The old wiki treated every page the same, so "private" meant "hope no one finds the URL."

What the team wanted:

- Write docs in plain Markdown, in their normal editor and review flow.
- Decide page-by-page what's public — explicitly, not by accident.
- Get a clean, read-only site without running a static-site generator or a build pipeline.
- Put it on `docs.tideline.dev`, their own domain.

## The vault layout

The docs live in one vault folder. The folder *is* the source of truth — open it in JType, in your terminal, or in any editor. JType ships this exact vault in the repo under `examples/team-docs-site-vault/`, so you can open it and follow along.

```text
team-docs-site-vault/
├── README.md            # how this vault is organized (not published)
├── index.md             # site home — publish: true
├── changelog.md         # release notes — publish: true
├── docs/
│   ├── getting-started.md   # publish: true
│   └── faq.md               # publish: true
└── drafts/
    └── internal-notes.md    # publish: false — stays private
```

Publishing is opt-in per file. A note becomes public **only** when its YAML frontmatter says so:

```md
---
title: Getting started
publish: true
---

# Getting started with Tideline

Install the CLI and run your first pipeline in under five minutes...
```

The draft does the opposite, and never leaves the team's machines or the workspace:

```md
---
title: Internal runbook
publish: false
---
```

## The JType workflow

**1. Author in the vault.** The team writes Markdown in the JType desktop app — write, split, or preview mode — exactly as they would for private notes. Nothing about authoring changes because the page is destined for the web.

**2. Bind the vault to a cloud workspace.** Publishing, like sync and membership, lives in a cloud workspace. They bind once, from the docs folder:

```bash
cd team-docs-site-vault
jtype bind --workspace tideline-docs
jtype vault status      # shows the vault root + the cloud binding
```

**3. Mark the public pages.** Each page that should go live gets `publish: true` in its frontmatter. The desktop app's publish checks flag pages that are ready, and the draft under `drafts/` keeps `publish: false`, so it's structurally impossible to leak it by sharing a link.

**4. Push, and the site is live.** Sync write-throughs to the workspace; the published pages render as a read-only site:

```bash
jtype sync          # pull + push with the bound workspace
```

The site appears at `/u/:username`, with each page at `/u/:username/:page_path` — so `index.md` is the home, and `docs/getting-started.md` becomes `/u/tideline/docs/getting-started`. The source stays Markdown in the vault the whole time; the site is just a clean rendering of the files you chose to publish.

**5. Put it on a custom domain.** From the web dashboard the team adds `docs.tideline.dev`, sets the DNS record it gives them, and the same site answers on their own domain. No redeploy, no rebuild.

## The outcome

Tideline's docs are now a folder of Markdown that two people can review in a normal pull-request flow, and the public site updates the moment they `jtype sync`. Publishing is a deliberate, visible choice — one line of frontmatter — so drafts and runbooks stay private by construction. When they wanted AI help keeping the changelog tidy, the same notes were already reachable over MCP, no new export needed.

The whole thing is reproducible: open `examples/team-docs-site-vault/` in JType, bind it to a workspace of your own, and you have a publishable docs site in minutes.

## Where to go next

- [Publish a site](/help/c/publishing/publish-a-site) — the full publish-check workflow.
- [Custom domains](/help/c/publishing/custom-domains) — point your own domain at the site.
- [Notes, bind & sync from the CLI](/help/c/cli/notes-bind-sync) — the commands used above.
- [Cloud workspaces & binding](/help/c/sync-workspaces/cloud-workspaces) — where publishing lives.
