---
title: Getting started
publish: true
---

# Getting started with Tideline

This guide takes you from nothing installed to your first timeline in about five
minutes. You'll need a terminal and a folder of CSV files to play with.

## Install

Tideline ships as a single static binary. Pick your platform:

```bash
# macOS / Linux
curl -fsSL https://get.tideline.dev/install.sh | sh

# Windows (PowerShell)
irm https://get.tideline.dev/install.ps1 | iex
```

Confirm it's on your `PATH`:

```bash
tideline --version
```

## Your first pipeline

Say you have a folder of CSV exports, each with a `timestamp` column:

```text
exports/
├── jan.csv
├── feb.csv
└── mar.csv
```

Build a single ordered timeline from all of them:

```bash
tideline build ./exports --by timestamp --out timeline.jsonl
```

Tideline reads every CSV in the folder, sorts the combined rows by the column you
named, and writes one JSON object per line to `timeline.jsonl`.

## View and filter

Page through the result, narrowing to a date range:

```bash
tideline view timeline.jsonl --from 2026-01-01 --to 2026-03-31
```

Because the output is plain JSON-lines, you can also reach for your usual tools:

```bash
cat timeline.jsonl | jq 'select(.amount > 100)'
```

## Next steps

- Skim the [FAQ](faq.md) for the common gotchas (encodings, time zones, big files).
- Watch the [Changelog](../changelog.md) for new flags and formats.

That's the whole loop: **build → view → pipe**. There's no server to babysit and
nothing to clean up — delete the `.jsonl` file and you're back to zero.
