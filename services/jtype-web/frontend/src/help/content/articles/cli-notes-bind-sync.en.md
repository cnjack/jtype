The CLI's note commands are **local-first**: they read and write the Markdown files in your current folder's vault — no server, no login required. The cloud is something you add later, with `jtype bind` and `jtype sync`, when you want those files on another device or shared with a team.

## Work where your files are

`cd` into your vault (any folder marked by a `.jtype/` directory) and the note commands operate on the files right there:

```sh
cd ~/Documents/notes

jtype note list                       # every .md file, by path
jtype note list --folder meetings     # just one folder
jtype note get projects/launch.md     # print a note's Markdown
jtype note search "retro" --limit 5   # keyword search across the vault
```

Paths are relative to the vault root, and `.md` is added for you if you leave it off. Not inside a vault? The CLI tells you to `cd` into one or pass a path with the global `--vault` flag.

## Capture and edit

Create or overwrite a note three ways — inline text, a file, or stdin. This is what makes the terminal a fast capture surface:

```sh
# Inline
jtype note create ideas/quick.md --content "Ship the CLI docs" --title "Quick idea"

# From a file
jtype note create specs/api.md --file ./draft.md

# From stdin — pipe anything in
git log --oneline -20 | jtype note create logs/recent.md -
```

`jtype note update <path>` replaces a note's body the same way, with `--content` or `--file`:

```sh
jtype note update ideas/quick.md --content "Ship the CLI docs — and the AI guide"
```

A real terminal capture: grab the current branch's commits into a daily note in one line.

```sh
git log --since=yesterday --pretty="- %s" | jtype note create daily/2026-06-14.md -
```

The file is written to disk immediately — that's authoritative. If you're signed in **and** the vault is bound, the same write also pushes through to the cloud; if not, it just saves locally and tells you so.

## Bind to a cloud workspace

To sync, link this vault to one cloud workspace. First find its id or name, then bind:

```sh
jtype workspace list                       # needs jtype login first
jtype bind --workspace "Team Notes"        # id, name, or slug all work
```

Binding writes `.jtype/cloud.json` next to your files, recording the workspace and server. Check it any time:

```sh
jtype vault status
```

```text
vault:  /Users/ada/Documents/notes
bound:  Team Notes (4f3c…-…-…)
server: http://localhost:13345
clock:  0
```

## Sync

Once bound, pull others' changes and push yours in one round-trip:

```sh
jtype sync
```

Sync uses last-write-wins for CLI edits and only touches files that actually changed, so re-running it is a no-op. For the bigger picture on conflict handling and roles, see [Push, pull & sync](/help/c/sync-workspaces/push-pull-sync) and [Members & roles](/help/c/sync-workspaces/members-and-roles).

## Where to go next

- Haven't installed the CLI yet? Start with [Install the jtype CLI and sign in](/help/c/cli/install-and-login).
- Want an AI to read and write these same notes? See [Connect your AI](/help/c/ai-mcp/connect-your-ai).
- Curious how vaults work in the editor? Read [How vaults work](/help/c/vault-editing/how-vaults-work).
