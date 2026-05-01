# JType Project Plan

This file is the local project tracker for turning JType from a single Markdown viewer into a local-first Markdown workspace, publishing tool, and AI-ready content service.

## Current Sprint

Goal: complete a local-first vertical slice with Markdown workspace management, static publishing, AI-ready indexing, Rust backend tests, E2E coverage, and service infrastructure scaffolding.

### Phase 1: Local File Workflow

- [x] Create local project tracker at `docs/plans.md`.
- [x] Add Markdown file association in Tauri bundle config.
- [x] Support app launch with a Markdown file path.
- [x] Support drag and drop Markdown files into the window.
- [x] Turn source panel into an editable Markdown editor.
- [x] Save edited Markdown back to the current local file.
- [x] Keep the preview synchronized with editor content.
- [x] Show dirty/saved/loading/error states.
- [x] Verify production build.

### Phase 1 Notes

- The file association config is in place for packaged builds.
- Startup file handling reads Markdown paths from process arguments.
- Dragging a folder opens it as a workspace.
- Current save behavior writes directly to the selected Markdown file.

## Near-Term Backlog

### Phase 2: Workspace

- [x] Open a local folder as a workspace.
- [x] Render a file tree for folders, Markdown files, and assets.
- [x] Create, rename, move, and delete files and folders.
- [x] Maintain a `.jtype/workspace.json` metadata file.
- [x] Add recent files and recent workspaces.

### Phase 3: Publishing

- [x] Generate local static site output under `.jtype/dist`.
- [x] Render Markdown pages to HTML with the Rust backend.
- [x] Add an export action in the desktop UI.
- [x] Add publish configuration under `.jtype/publish.json`.
- [x] Add local publish preview browser command.
- [x] Validate links, images, slugs, and title warnings before publishing.
- [x] Validate draft status before publishing.

### Phase 4: AI-Ready Foundation

- [x] Extract headings and content chunks.
- [x] Write a rebuildable `.jtype/ai-context.jsonl` index.
- [x] Add an AI index action in the desktop UI.
- [x] Extract links, assets, and frontmatter into the AI index.
- [x] Add AI command abstraction with diff-before-write behavior.

### Phase 5: Service Infrastructure

- [x] Add Docker Compose for MySQL and RustFS.
- [x] Add MySQL schema for workspaces, documents, publish revisions, and AI chunks.
- [x] Add `.env.example` for database and storage configuration.
- [x] Document local service startup in `docs/services.md`.
- [x] Add web sync design document.
- [x] Add Rust companion web service.
- [x] Add user registration and password login.
- [x] Add authenticated Desktop workspace sync API.
- [x] Add per-user published website rendering.
- [x] Connect Desktop save/sync flow to web service.
- [x] Add hosted sync API tests.
- [x] Persist service metadata through MySQL from a Rust service process.

### Phase 6: Website Style

- [x] Use Protocol reference layout: fixed left navigation, content column, quiet zinc/emerald styling.
- [x] Render each user's synced Markdown as `http://localhost:8080/@username/...`.
- [x] Add generated navigation from synced document paths.
- [x] Add login/register page for web users.

### Phase 7: Future Asset Publishing

- [ ] Upload image and attachment assets to RustFS.
- [ ] Rewrite Markdown asset URLs to RustFS-backed public URLs.
- [ ] Add asset sync tests.

### Phase 8: Interaction Upgrade

- [x] Add PM analysis for Notion/Obsidian-inspired management, editing, and menu improvements.
- [x] Add detailed PRD for the interaction upgrade.
- [x] Add high-level interaction design for shell, command palette, quick switcher, inspector, library, publish queue, and AI patch review.
- [x] Add Chinese PM-facing combined analysis, PRD, and design document.
- [x] Implement global command registry.
- [x] Implement command palette.
- [x] Implement quick switcher.
- [x] Add activity rail and redesigned app shell.
- [x] Add file tree context menus, favorites, recents, breadcrumbs, and document state chips.
- [x] Add frontmatter properties panel.
- [x] Add outline and links inspector panels.
- [x] Add library view and publish queue.
- [x] Add rename/move link impact preview.
- [x] Add AI patch review surface.

### Phase 9: MWeb-Inspired Editor UX

- [x] Collapse preview into the primary editor workbench with Write, Split, and Preview modes.
- [x] Merge Properties, Outline, Links, and Publish into one document info panel.
- [x] Move login and web site sync into a right-top account entry.
- [x] Hide AI surfaces until real AI functionality is ready.
- [x] Add Markdown editor shortcuts for split preview, preview mode, and table editing.
- [x] Add editor context menu actions for links, tables, formulas, and Mermaid diagrams.
- [x] Add KaTeX formula preview support.
- [x] Add Mermaid diagram preview support.
- [x] Add E2E coverage for account sync, split preview, formula preview, Mermaid preview, and table context actions.

### Phase 10: Mode-Specific Shell Cleanup

- [x] Remove the left activity rail and keep navigation centered on workspace files plus top search.
- [x] Hide the top Open Workspace action once a workspace is open.
- [x] Add a dedicated welcome state for opening a workspace, opening a single Markdown file, and recent items.
- [x] Treat standalone Markdown files as a pure editor mode without workspace sidebar, sync, account, or publish surfaces.
- [x] Add a JType product icon to the app header.
- [x] Generate and wire Tauri desktop icon assets.
- [x] Add E2E coverage for welcome, workspace mode, and standalone file mode button states.

### Testing

- [x] Add Rust unit tests for workspace metadata, entry operations, publishing, and AI indexing.
- [x] Add Playwright E2E tests for workspace open, file edit/save, export, and AI indexing.
- [x] Verify `npm run build`.
- [x] Verify `cargo test`.
- [x] Verify `npm run test:e2e`.
- [x] Verify `docker compose config`.
- [x] Verify `cargo test --manifest-path services/jtype-web/Cargo.toml`.
- [x] Verify `docker compose build jtype-web`.
- [x] Add E2E coverage for command palette, quick switcher, properties, favorites, publish queue, and AI patch review.
- [x] Re-verify `npm run test:e2e` after the MWeb-inspired editor UX pass.
- [x] Re-verify `npm run build` and `npm run test:e2e` after mode-specific shell cleanup.

## Decisions

- Markdown files remain the source of truth.
- `.jtype/` stores rebuildable metadata, indexes, and publish config.
- AI features must not silently overwrite user files.
- Single-file mode remains supported even after workspace mode lands.
