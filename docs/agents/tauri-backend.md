# Tauri Backend Agent Guide

## Tech Stack

- Rust 2021 edition
- Tauri 2
- `pulldown-cmark` for static Markdown publishing
- `serde` / `serde_json` for command payloads and local metadata
- Plugins: `tauri-plugin-dialog`, `tauri-plugin-fs`, `tauri-plugin-opener`

## File Structure

- `src-tauri/src/lib.rs`: Tauri command registration, cloud profile management, vault bindings, app `run()` entry point.
- `src-tauri/src/workspace.rs`: Local file I/O, vault traversal, publishing, validation, AI indexing, sync document collection.
- `src-tauri/src/main.rs`: Binary entry point.

## User-Facing Model

Rust command names still use `workspace` for compatibility, but UI copy should say **vault** for local folders.

- Local vault path: user-selected folder or default `~/Documents/.jtype`.
- `.jtype/`: local metadata, publish config, generated outputs, AI index.
- Cloud workspace: server-side concept handled over HTTP by the web service.
- Vault binding: local JSON mapping from cloud workspace ID to local vault path.

## Tauri Commands

| Command | Purpose |
|---------|---------|
| `initial_open_paths` | Read initial OS-opened paths and filter Markdown files |
| `default_vault_path` | Return `~/Documents/.jtype` |
| `open_default_vault` | Create/open default vault |
| `read_markdown_file` | Read Markdown file content |
| `write_markdown_file` | Write Markdown file content |
| `open_workspace` | Traverse local folder into `WorkspaceSnapshot` |
| `create_workspace_entry` | Create file/folder and refresh tree |
| `rename_workspace_entry` | Rename file/folder and refresh tree |
| `delete_workspace_entry` | Delete file/folder and refresh tree |
| `export_static_site` | Export Markdown to static HTML |
| `validate_workspace` | Check titles, slugs, links, and assets |
| `build_ai_index` | Generate `.jtype/ai-context.jsonl` |
| `collect_sync_documents` | Gather local Markdown documents for sync |
| `apply_cloud_documents` | Write pulled cloud docs into the local vault |
| `load_cloud_profile` | Read desktop global cloud profile |
| `save_cloud_profile` | Write desktop global cloud profile |
| `list_vault_bindings` | List local cloud-workspace-to-vault mappings |
| `bind_cloud_workspace` | Add/update a local vault binding |

## Security Patterns

- Use `safe_join()` for path construction from user/cloud input.
- Use `ensure_markdown()` before reading or writing Markdown content.
- Normalize display paths with `path_to_string()` so Windows backslashes do not leak into UI inconsistently.
- Never let cloud sync write outside the selected vault.

## Config Storage

- Cloud profile: `%APPDATA%/JType/cloud-profile.json` on Windows or `~/.config/JType/cloud-profile.json` on Linux/Mac.
- Vault bindings: `%APPDATA%/JType/vault-bindings.json`.
- Vault metadata: `<vault>/.jtype/workspace.json`.
- Publish config: `<vault>/.jtype/publish.json`.

## Key Types

```rust
WorkspaceSnapshot { root_path, name, entries, metadata_created }
FileTreeNode { name, path, relative_path, kind, children }
EntryKind { Folder, Markdown, Asset }
PublishResult { output_dir, pages }
ValidationResult { errors, warnings }
AiIndexResult { output_file, documents, chunks, links, assets }
SyncDocument { relative_path, title, status, content }
```

## Directory Exclusions

`read_children()` skips:

- `.git`
- `node_modules`
- `target`

`.jtype` is created and tracked as metadata but should be excluded from publishing, sync document collection, and AI indexing.

## Tests

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

When changing Tauri command payloads, also update:

- `src/lib/tauri.ts`
- `src/hooks/useFileSystem.ts`
- `src/hooks/useCloudSync.ts`
- `tests/e2e/app.spec.ts` mocks
