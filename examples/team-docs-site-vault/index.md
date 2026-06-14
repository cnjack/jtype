---
title: Tideline
publish: true
---

# Tideline

**Tideline** is a tiny command-line tool that turns a folder of CSV exports into
a clean, queryable timeline. It runs locally, has no daemon, and finishes before
your coffee does.

## Start here

- **[Getting started](docs/getting-started.md)** — install the CLI and run your
  first pipeline in under five minutes.
- **[FAQ](docs/faq.md)** — the questions people ask us most.
- **[Changelog](changelog.md)** — what changed in each release.

## What Tideline does

You point Tideline at a directory of CSV files, give it a column to sort by, and
it stitches them into a single ordered stream you can filter, page through, and
export. No database to stand up, no schema to declare.

```bash
tideline build ./exports --by timestamp --out timeline.jsonl
tideline view timeline.jsonl --from 2026-01-01 --to 2026-03-31
```

## Why people use it

- **Local-first.** Your data never leaves your machine.
- **Zero setup.** A single static binary; nothing to install but the binary.
- **Composable.** Plain JSON-lines out, so it pipes into `jq`, `grep`, anything.

Ready to try it? Head to [Getting started](docs/getting-started.md).
