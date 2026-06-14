Maya is a product researcher who reads constantly — papers, blog posts, half-formed thoughts in the shower. For years her notes were scattered across three apps, none of which she fully trusted. The ideas she wanted to keep got buried, and the tools she used could disappear (or change their pricing) at any time.

She wanted one place that was fast to write to, easy to connect ideas in, and *hers* — files she could read in any editor, back up however she liked, and never have to export. So she built a personal knowledge base in JType, entirely local-first.

## The situation

The job is not "store documents." It's **think out loud over time**: capture a rough idea the moment it appears, connect it to what she already knows, and come back later to find the connections still make sense. The friction that kills a personal KB is always the same — capture is too slow, so ideas never land; and once they land, nothing links them, so they rot.

Maya's two requirements were simple:

- **Capture has to be instant** — from the desktop app, but also straight from the terminal while she's working.
- **Notes have to outlive the tool.** Plain Markdown on her own disk, openable anywhere, with no lock-in.

## The vault layout

A JType vault is just a folder of Markdown files, so Maya's structure is whatever makes sense to her — no schema, no database. Hers looks like this:

```text
personal-kb-vault/
  README.md                  how this vault is organized
  inbox.md                   fast, unsorted captures
  daily/
    2026-06-14.md            today's log
  notes/
    second-brain.md          evergreen note  ─┐ linked to
    spaced-repetition.md     evergreen note  ─┘ each other
  moc/
    reading.md               map of content: the reading hub
  .jtype/
    cloud.json               optional cloud binding (created by `jtype bind`)
```

`inbox.md` is the catch-all. `daily/` holds a dated log per day. `notes/` holds **evergreen notes** — one idea each, refined over time. `moc/` holds **maps of content**: hub pages that link out to related notes so nothing gets lost.

## The workflow

**1. Capture — without breaking flow.** When an idea shows up mid-task, Maya doesn't switch apps. Note commands are local-first: they write straight to the Markdown files in her current folder.

```bash
# A one-liner straight into the inbox
jtype note create inbox.md --content "Spacing effect > cramming. Tie to review cadence."

# Pipe a longer thought from another command
pbpaste | jtype note create notes/reading-queue.md - --title "Reading queue"
```

These run with no server and no login — the files are the source of truth. The capture lands as real Markdown she can open instantly in the desktop app.

**2. Link — turn captures into a web of ideas.** During her daily review, Maya promotes the best captures into evergreen notes under `notes/` and connects them with ordinary Markdown links. `second-brain.md` links to `spaced-repetition.md` and back; both are linked from the `moc/reading.md` hub. The connections are just `[text](path)` links — portable, and clickable in quick-open.

**3. Review — weekly, in split mode.** Each Sunday she opens `moc/reading.md` in the desktop editor's split view (write on the left, preview on the right), walks the links, and clears the inbox. Document info shows her what's grown and what's gone stale.

**4. Publish (optional) — a weekly digest.** When a note is worth sharing, she adds `publish: true` to its YAML frontmatter. That note becomes a page on her public site at `/u/maya`, while the source stays plain Markdown in her vault. Everything without the flag stays completely private.

**5. Sync (optional) — read it on her phone.** Once, she ran `jtype bind --workspace personal-kb` to map the vault to a cloud workspace. Now `jtype sync` pushes her local edits up and pulls anything she captured elsewhere — last-write-wins, no fuss. Her laptop is still the source of truth; the cloud is just a mirror.

## The outcome

Capture went from "I'll write that down later" (i.e. never) to a single terminal line. Ideas that used to evaporate now land in `inbox.md` in seconds and get woven into evergreen notes during a 15-minute weekly review. The map of content means she can always find her way back to a thought.

And because it's all plain Markdown on her own disk, the KB isn't tied to JType's future — it's tied to hers.

> The example vault ships in the repo at `examples/personal-kb-vault`. Open that folder in JType and follow Maya's flow with real files.

## Where to go next

- [How vaults work](/help/c/vault-editing/how-vaults-work) and [Quick open & links](/help/c/vault-editing/quick-open-and-links)
- [Install & log in the CLI](/help/c/cli/install-and-login) and [Notes, bind & sync](/help/c/cli/notes-bind-sync)
- [Publish a site](/help/c/publishing/publish-a-site)
