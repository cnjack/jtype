# Tideline docs — example JType vault

This folder is a real, openable JType vault. It's the docs site for a fictional
developer tool called **Tideline**, used as the worked example in the help-center
case study [Ship product docs as a public site](/help/cases/docs-site).

The folder *is* the source of truth — plain Markdown, no database, no build step.
Open it in the JType desktop app, in your terminal, or in any editor.

## What's in here

| File | Published? | What it is |
| --- | --- | --- |
| `index.md` | `publish: true` | The site home page. |
| `docs/getting-started.md` | `publish: true` | Install + first pipeline. |
| `docs/faq.md` | `publish: true` | Frequently asked questions. |
| `changelog.md` | `publish: true` | Release notes. |
| `drafts/internal-notes.md` | `publish: false` | Stays private — never published. |
| `README.md` | _(none)_ | This file. Not part of the site. |

A page goes public **only** when its YAML frontmatter contains `publish: true`.
Everything else stays in the vault and the workspace.

## Try it yourself

```bash
# From this folder:
jtype bind --workspace tideline-docs   # bind the vault to a cloud workspace
jtype vault status                     # show the vault root + cloud binding
jtype sync                             # pull + push; published pages go live
```

Once synced, the site is served at `/u/:username`, with each page at
`/u/:username/:page_path`. Add a custom domain from the web dashboard to serve
the same site at your own address.

See the related help articles:

- [Publish a site](/help/c/publishing/publish-a-site)
- [Custom domains](/help/c/publishing/custom-domains)
- [Notes, bind & sync from the CLI](/help/c/cli/notes-bind-sync)
