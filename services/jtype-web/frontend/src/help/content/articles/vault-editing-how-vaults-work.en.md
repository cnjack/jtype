A **vault** is the home for your writing in JType — and it's refreshingly ordinary. It's just a folder of plain Markdown (`.md`) files on your own device. There's no proprietary database and no hidden format: the folder *is* your notes.

## A vault is a normal folder

Open your vault in Finder, Explorer, or any other editor and you'll see exactly what you'd expect — `.md` files you can read with your own eyes.

- The default vault lives at `~/Documents/.jtype`, but you can open any folder as a vault.
- Each note is a single `.md` file. Rename it, move it, or copy it like any other file.
- Because it's just text, a vault works with backups, Git, Dropbox, and search tools you already use.

> The folder is the source of truth. If you walk away from JType tomorrow, you keep a clean, portable folder of Markdown.

## Subfolders are yours to shape

JType reads whatever structure you put on disk. Group notes however you think:

```text
my-vault/
  daily/
    2026-06-14.md
  projects/
    launch-plan.md
  meetings/
    standup.md
```

Create folders in the app or in your file manager — both show up the same way. There's no enforced hierarchy and no tag database to maintain; the folders you make are the navigation you get.

## JType never locks your files

JType opens, reads, and saves your `.md` files, but it never takes an exclusive lock on them. You can edit the same note in another app, and JType picks up the change. This is what makes a vault safe to keep in iCloud, Dropbox, or a Git repo alongside everything else.

## The .jtype folder holds local state

Next to your notes, JType keeps a small `.jtype/` folder for its own bookkeeping. The important one is the **cloud binding**:

```text
.jtype/
  cloud.json   # which cloud workspace this vault is bound to
```

`cloud.json` is written when you connect a vault to a cloud workspace for sync. It's per-device, so the same folder on a different machine can bind to the same workspace independently. Your notes themselves never go inside `.jtype/` — they stay as ordinary `.md` files in the folder. To see your current vault root and binding from the terminal, run `jtype vault status`.

## Single-file vs vault mode

JType has two ways to open Markdown:

- **Single-file mode** is a focused editor for one `.md` file. There's no navigation, sync, account, or publishing — just you and the document. It's perfect for a quick edit to a file that lives outside any vault.
- **Vault mode** opens a whole folder and unlocks the rest of JType: file navigation, quick open, split preview, document info, publishing checks, and account/cloud sync.

You can always start single-file and open a vault later. Nothing about your files changes either way.

## Where to go next

- Ready to write? See [Writing Markdown](/help/c/vault-editing/writing-markdown).
- Getting around a big vault: [Quick open and links](/help/c/vault-editing/quick-open-and-links).
- Want notes on another device? See [Cloud workspaces](/help/c/sync-workspaces/cloud-workspaces).
