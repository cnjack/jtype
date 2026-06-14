---
title: Changelog
publish: true
---

# Changelog

All notable changes to Tideline, newest first. Dates are in UTC.

## 0.4.0 — 2026-06-10

**Added**

- `--parse-dates` flag so timestamp columns are sorted as instants, not strings.
- Automatic delimiter detection for comma- and tab-separated files.

**Changed**

- `tideline view` now pages output by default; pass `--no-pager` for raw output.

**Fixed**

- Rows with trailing whitespace in the sort column are no longer mis-ordered.

## 0.3.0 — 2026-04-22

**Added**

- `--delimiter` flag for non-standard separators.
- Streaming reader: file size is now bounded by disk, not memory.

**Fixed**

- Empty CSV files in the input folder are skipped instead of erroring.

## 0.2.0 — 2026-03-01

**Added**

- `tideline view --from / --to` date-range filtering.
- JSON-lines output format (`timeline.jsonl`).

## 0.1.0 — 2026-02-02

- First public release. `tideline build` and `tideline view`.
