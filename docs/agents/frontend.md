# Frontend Agent Guide

## Tech Stack

- **Language**: TypeScript strict mode
- **Framework**: React
- **Build**: Vite on port 1420
- **Styling**: Tailwind CSS plus component classes in `src/styles.css`
- **Rendering**: `marked` for GFM, `dompurify` for sanitization, KaTeX for math, Mermaid for diagrams
- **Tauri**: `@tauri-apps/api` v2 plus dialog, fs, and opener plugins

## File Structure

- `src/main.tsx`: React entry point.
- `src/app/App.tsx`: App composition, command context, mode routing.
- `src/app/AppState.tsx`: Reducer, global app state, actions.
- `src/components/layout/`: Header, welcome screen, vault home.
- `src/components/sidebar/`: Vault sidebar, files/search/library/publish/account entry.
- `src/components/editor/EditorShell.tsx`: Markdown editor, preview, document info inspector, editor context menu.
- `src/components/modals/`: Command palette, quick switcher, account/cloud dialog.
- `src/hooks/`: Filesystem, cloud sync, commands, keyboard shortcuts.
- `src/lib/`: Markdown rendering, frontmatter, Tauri wrapper, storage, types, utilities.
- `src/main.ts`: legacy pre-React implementation. Do not extend it for new UI work unless intentionally migrating/removing old code.

## App Modes

The primary modes live in `AppState.mode`:

- `empty`: no vault or file is open. Show `WelcomeScreen`.
- `workspace`: a local vault is open.
- `single-file`: one Markdown file is open without a vault.

Important UX routing:

- `workspace` + no `currentPath` renders `VaultHome`.
- `workspace` + `currentPath` renders `EditorShell`.
- `single-file` renders `EditorShell` without sidebar/account/sync/publish surfaces.
- `focusMode` hides sidebar and document inspector.

## User-Facing Vocabulary

- Say **vault** for local folders.
- Say **cloud workspace** for server-side collaboration/sync/publishing boundaries.
- Avoid `MD`, `WS`, and other implementation abbreviations in visible UI.
- Internal names like `workspace`, `WorkspaceSnapshot`, `workspace-sidebar`, and API paths are acceptable where compatibility requires them.

## Header And Shell Rules

- Empty mode should not show document actions like Save.
- Vault home should emphasize New note, Quick open, and Connect cloud.
- Document mode may show Save only when there is a current Markdown document.
- Single-file mode should stay clean: open file and save only.
- Do not add redundant "Open vault" actions after a vault is already open.

## Command System

Commands are defined in `src/hooks/useCommands.ts`.

Each command has:

- `id`
- `title`
- `aliases`
- `scope`
- `shortcut`
- `isEnabled()`
- `disabledReason()`
- `run()`

Command palette:

- Opened with `Ctrl+Shift+P`.
- Rendered by `CommandPalette`.
- Results container id: `#command-results`.

Quick switcher:

- Opened with `Ctrl+O`.
- Rendered by `QuickSwitcher`.
- Should open files through `useFileSystem().openMarkdownFile()`, not by directly mutating state.

## Editor Modes

`EditorShell` supports:

- `write`: editor only
- `split`: editor + preview
- `preview`: preview only

The editor and preview are the primary workbench. `Info` is a right-side inspector on desktop-sized windows and a drawer on narrow widths. Do not reflow document info below the editor in normal desktop layouts.

## Markdown Editing Rules

- Insert actions must be cursor-context aware.
- Tables, formulas, Mermaid, and tasks should not be inserted inside fenced code blocks.
- Table row/column actions should operate on the current table or the nearest table, rather than inserting duplicate tables.
- Right-click editor actions live in `EditorShell` and should call helpers from `useCommands.ts`.

## Document Info

The document info inspector includes:

- Properties
- Outline
- Publish flow
- Links

Keep high-value frontmatter fields visible by default:

- title
- description
- tags
- slug
- status

Advanced fields such as `publish`, `createdAt`, and `updatedAt` should remain collapsed unless needed.

## Markdown Pipeline

1. Raw text is edited in `<textarea aria-label="Markdown editor">`.
2. Math is rendered through KaTeX.
3. Markdown is parsed through `marked`.
4. Output is sanitized with `DOMPurify`.
5. Mermaid code blocks render through lazy Mermaid integration.

## Cloud/Sync UI

- Account and cloud state is in `AccountDialog`.
- Desktop uses browser-based OAuth. Use "Connect in browser" style copy.
- Desktop never asks for passwords.
- Cloud workspace rows should show:
  - workspace name
  - role
  - document count
  - budget
  - current vault binding state
- Binding a workspace should be explicit and should update vault binding state.

## AI Features

AI UI is intentionally hidden until real AI functionality is ready.

Allowed infrastructure:

- `build_ai_index` can generate `.jtype/ai-context.jsonl`.
- AI command proposal/diff structures may remain in code.

Do not expose new AI panels or buttons in the primary UI unless the feature is actually implemented.
