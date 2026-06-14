---
title: FAQ
publish: true
---

# Frequently asked questions

The questions we hear most, with short answers. If yours isn't here, the
[getting-started guide](getting-started.md) covers the basics end to end.

## Does Tideline send my data anywhere?

No. Tideline runs entirely on your machine. It reads your CSV files, writes a
local output file, and makes no network calls. There's no account and no telemetry.

## What CSV formats are supported?

Any comma- or tab-separated file with a header row. Tideline detects the
delimiter automatically. If your file uses something unusual, pass it explicitly:

```bash
tideline build ./exports --by timestamp --delimiter ';'
```

## How does it handle time zones?

Timestamps are parsed as-is and sorted lexically unless you tell Tideline they're
dates. Use `--parse-dates` so values are compared as instants rather than strings:

```bash
tideline build ./exports --by timestamp --parse-dates
```

Naive timestamps (no offset) are treated as UTC.

## Can it handle large files?

Yes. Tideline streams rows instead of loading everything into memory, so file
size is bounded by your disk, not your RAM. A few gigabytes of CSV is routine.

## What does the output look like?

One JSON object per line (JSON-lines), in sorted order:

```json
{"timestamp": "2026-01-04T09:12:00Z", "amount": 42, "source": "jan.csv"}
{"timestamp": "2026-01-04T09:18:00Z", "amount": 17, "source": "jan.csv"}
```

This pipes cleanly into `jq`, `grep`, or any line-oriented tool.

## How do I report a bug?

Open an issue on the project tracker with the command you ran and a small sample
CSV that reproduces the problem. A few rows is usually enough.
