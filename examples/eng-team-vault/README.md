# Engineering team vault

This is the example vault from the JType "Engineering team" case study. It's a
real folder of Markdown you can open in JType (desktop or via the `jtype` CLI)
and edit like any vault.

Open it:

- Desktop: **Open vault** → pick this folder.
- CLI: `cd` into this folder, then `jtype vault status`.

## What's in here

```text
eng-team-vault/
├── README.md                    # this file
├── roadmap.md                   # the Q3 roadmap (kept private — publish: false)
├── meetings/                    # weekly standups + kickoffs
│   ├── 2026-06-10-standup.md
│   └── 2026-06-14-ai-kickoff.md
├── daily/                       # per-day working notes
│   └── 2026-06-14.md
└── projects/
    └── launch.md                # the launch plan, mirrors the Launch board
```

## The Launch board

The team's kanban board is named **Launch** and lives in the same cloud
workspace this vault binds to. It has three columns:

| Column | Meaning |
| ------ | ------- |
| To do  | Accepted work that hasn't started |
| Doing  | In progress right now |
| Done   | Shipped / closed |

`projects/launch.md` keeps a human-readable mirror of the board so the plan
reads top to bottom even offline. Drive the board from the terminal:

```bash
jtype board list
jtype card list --board Launch --column "To do"
jtype card create --board Launch --column "To do" "Draft launch plan" --priority high
```

## Sync

To take this vault online, bind it to a cloud workspace and sync:

```bash
jtype login
jtype workspace list
jtype bind --workspace "AI Demo"
jtype sync
```

After `bind`, note commands stay local-first and `jtype sync` write-throughs
your edits to the bound workspace.
