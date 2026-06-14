By default your published site lives under `/u/your-username`. A custom domain lets the same site answer at an address you own — `notes.example.com` or `example.com` — so readers (and search engines) see your brand instead of a shared path.

A custom domain only changes the *address*. It does not change *what* is published: the exact same set of notes appears either way.

## Connect a domain

Custom domains are configured against your cloud workspace from the web dashboard. The flow is the same one you already know from other services:

1. In your workspace's site settings, add the domain you want to use, e.g. `notes.example.com`.
2. At your DNS provider, point that hostname at JType with the records shown in the dashboard (a `CNAME` for a subdomain, or the records listed for an apex domain).
3. Add the verification record the dashboard gives you so JType can confirm you own the name.
4. Wait for DNS to propagate and for the certificate to be issued. After that, your domain serves the site directly.

Once it's live, your home page answers at your domain's root, and each published page keeps its readable path:

```text
https://notes.example.com/                  →  /u/your-username
https://notes.example.com/guides/intro      →  /u/your-username/guides/intro
```

The underlying `/u/your-username` URLs keep working too — the custom domain is an additional front door, not a replacement.

## What gets published vs what stays private

A custom domain does not widen what's visible. The rule is exactly the same as on the default address:

- **Public:** only notes whose frontmatter contains `publish: true`. Each becomes a page at your domain, rendered read-only from its Markdown.
- **Private:** everything else. Notes without `publish: true` (or with `publish: false`) never appear on the site — not at the root, not at any guessable path, not even with the right URL.

What also stays private, regardless of domain:

- Your raw vault folder and any files you haven't marked for publishing.
- Drafts, archived notes, and personal subfolders.
- Your kanban boards, members, account, and workspace settings.
- The contents of *other* workspaces — a domain is bound to one workspace's site, so it can only ever serve that workspace's published notes.

In other words: putting a domain in front of your site changes the wrapper, never the contents. If a note isn't `publish: true`, no custom domain can expose it.

## Double-check before you announce it

Before you share the link, open a few published pages on the domain and confirm only what you intended is reachable. To take a page down, remove `publish: true` from the note (or set it to `false`) and sync — it drops off your custom domain just like it would off the default URL.

## Where to go next

- Haven't published anything yet? Start with [Publish a site](/help/c/publishing/publish-a-site).
- Need the content on the server first? See [Push & pull sync](/help/c/sync-workspaces/push-pull-sync).
- Want to control who can edit the workspace? See [Members & roles](/help/c/sync-workspaces/members-and-roles).
