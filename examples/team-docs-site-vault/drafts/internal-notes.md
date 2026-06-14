---
title: Internal runbook
publish: false
---

# Internal runbook (private)

This page has `publish: false`, so it is **never** part of the public site. It
lives in the vault and the cloud workspace, visible to members, but it is not
served at `/u/:username`. This is how we keep drafts and operational notes private
without moving them out of the docs vault.

## Release checklist

1. Bump the version in `Cargo.toml` and update `changelog.md`.
2. Run the full test suite on macOS, Linux, and Windows.
3. Tag the release and let CI build the static binaries.
4. Verify the install scripts pull the new version.
5. Announce in the community channel.

## Things to write up later

- A page on custom delimiters with real-world examples (Excel exports are messy).
- A troubleshooting guide for the "rows out of order" reports — usually it's a
  missing `--parse-dates`.
- Decide whether to document the experimental `--watch` flag before it's stable.

## Notes

Keep this file as a draft. When a section here is ready for users, move it into a
page under `docs/` and set `publish: true`. Until then it stays here, private.
