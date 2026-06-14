Sync keeps a bound vault and its cloud workspace in step without ever taking your files away from you. The local Markdown on your disk is always the source of truth — sync just carries changes up and brings changes down. If the cloud and the network both vanished tomorrow, you'd still have every note, intact, in a plain folder.

## Two-way: push and pull

Once a vault is [bound to a workspace](/help/c/sync-workspaces/cloud-workspaces), one command moves changes in both directions:

```bash
jtype sync
```

- **Push** sends notes you created or edited locally up to the workspace.
- **Pull** brings down notes that changed in the cloud (your other devices, teammates, the web editor, or an AI assistant) and writes them into your vault.

On the desktop app, sync runs in the background for a bound vault, so this mostly just happens. The CLI gives you the same round-trip on demand, which is handy on a headless server or in a script.

## Versions and why pull is safe

Each note carries a version as it changes. When you `jtype sync`, JType compares versions and writes a file **only when the incoming content actually differs** from what's on disk. This "diff before write" means a redundant sync is a no-op — no file churn, no surprise timestamps, no fight with an editor you have open. A pull never blindly clobbers a file that already matches.

## When the same note changed in two places

A **conflict** is simply: the same note was edited in two places since the last sync — say, on your laptop and on the web. JType detects this by version rather than guessing, so nothing is silently lost.

- In the **desktop app**, a conflict surfaces in the conflict UI. JType does a three-way merge where it safely can, and where it can't, it shows you both sides so you choose what to keep. This is your human safety net.
- From the **CLI**, `jtype sync` reports conflicting paths instead of overwriting them, so you can open the note and reconcile it.

Because every version of the file is plain Markdown on disk, the worst case is always recoverable: you can read both, copy the lines you want, and save.

## A simple flow

```bash
# on device A
jtype note update projects/roadmap.md --file ./roadmap.md
jtype sync          # push your edit up

# on device B
jtype sync          # pull it down into the local vault
jtype note get projects/roadmap.md
```

## Good habits

- **Sync before and after a work session** so you start and finish from the latest version.
- **Keep edits to one device at a time** when you can — it's the surest way to avoid conflicts at all.
- **Trust your disk.** If anything ever looks wrong after a sync, your vault folder is right there to inspect in any editor.

Next: see who else can be in a workspace and what they can do in [Members & roles](/help/c/sync-workspaces/members-and-roles).
