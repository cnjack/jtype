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
- [x] Render each user's synced Markdown as `http://localhost:13345/u/:username/...`.
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
- [x] Hide the top Open Vault action once a vault is open.
- [x] Add a dedicated welcome state for opening a workspace, opening a single Markdown file, and recent items.
- [x] Treat standalone Markdown files as a pure editor mode without workspace sidebar, sync, account, or publish surfaces.
- [x] Add a JType product icon to the app header.
- [x] Generate and wire Tauri desktop icon assets.
- [x] Add E2E coverage for welcome, workspace mode, and standalone file mode button states.

### Phase 11: Vault + Cloud Product Reset

- [x] Add competitive analysis for Obsidian, MWeb, Notion, GitBook, Outline, and Docusaurus.
- [x] Add PRD for vault-first desktop, self-hostable Web cloud, OAuth login, admin, budget, and custom domains.
- [x] Add architecture design for vault metadata, OAuth, sync protocol, Web admin, custom domain, and SSL certificate handling.
- [x] Add cloud workspace model for isolation, invites, member roles, publishing, and workspace budget.
- [x] Add local vault binding model so each cloud workspace maps to a chosen local vault per device.
- [x] Add bidirectional desktop/web sync and conflict resolution product rules.
- [x] Replace workspace product language with vault product language.
- [x] Add first-run vault setup using `~/Documents/.jtype` as the default location.
- [x] Add desktop default vault opener using `~/Documents/.jtype`.
- [x] Remove desktop login/register forms and replace them with browser-based Web OAuth.
- [x] Change default cloud service URL to `http://localhost:13345`.
- [x] Add Web landing page at `/`.
- [x] Add Web device OAuth start, approve, and poll endpoints.
- [x] Add first-user-admin bootstrap rule.
- [x] Add Web admin console shell and admin users API.
- [x] Add user dashboard and personal settings shells.
- [x] Add custom domain ownership verification.
- [x] Add certificate upload, validation, encrypted storage, and SSL status.
- [x] Add remote vault manifest sync API.
- [x] Add remote document version history.
- [x] Enforce workspace cloud volume budget during document saves and sync.
- [x] Rename server remote vault model to cloud workspace model.
- [x] Add workspace list/create APIs with membership-aware access.
- [x] Add workspace invite and accept APIs with owner/admin role checks.
- [x] Add workspace invite revoke API.
- [x] Add desktop global profile storage for server URL, user, site URL, token, and device id.
- [x] Add desktop cloud workspace list with local vault binding.
- [x] Add desktop local vault binding persistence after cloud sync.
- [x] Add workspace-scoped sync cursors per device.
- [x] Add web cloud editor save API as normal workspace document versions.
- [x] Add backend bidirectional sync pull/push with base hashes and three-way Markdown auto-merge.
- [x] Add backend conflict records for failed auto-merge.
- [x] Add conflict UI actions for accept local and accept cloud.
- [x] Update E2E coverage for default vault entry and browser OAuth login.
- [x] Add E2E coverage for default vault entry and persisted local vault binding.
- [x] Update E2E coverage for workspace invite, local vault binding, cloud edit pull, desktop edit push, and conflict resolution.

### Phase 12: Screenshot-Driven App UX Cleanup

- [x] Add screenshot and frontend-code UX analysis to `suggestion.md`.
- [x] Add a vault home state for an opened vault with no selected document.
- [x] Hide no-document editor, preview, document info, and publish surfaces behind the vault home.
- [x] Make header actions mode-aware for empty, vault, document, and single-file states.
- [x] Replace user-facing `MD` and `WS` prefixes with readable file/vault labels.
- [x] Reduce persistent sidebar actions to a focused New note entry.
- [x] Rename sidebar Settings entry to Account when it opens account/cloud state.
- [x] Convert cloud workspace rows from centered buttons to explicit bindable workspace rows.
- [x] Show current local vault binding state in the Account and Cloud dialog.
- [x] Keep Document Info as a right-side inspector and add drawer behavior for narrow widths.
- [x] Group advanced frontmatter fields behind an Advanced disclosure.
- [x] Fix command palette and quick switcher selectors/behavior after introducing vault home.
- [x] Make Markdown block insertions safe around fenced code and Mermaid blocks.
- [x] Make table row/column context actions operate on the nearest table instead of inserting duplicate tables.
- [x] Update README, AGENTS, runtime, service, and agent docs to match the React/vault/cloud workspace implementation.
- [x] Add status notes to older workspace-era PRD/design docs so future readers use the current vault/cloud docs.

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
- [x] Verify backend workspace unit tests with `cargo test --manifest-path services/jtype-web/Cargo.toml --lib`.
- [x] Verify backend binary compilation with `cargo check --manifest-path services/jtype-web/Cargo.toml`.
- [x] Re-verify `npm run build` and `npm run test:e2e` after backend workspace API and default cloud URL changes.
- [x] Re-verify `cargo test --manifest-path src-tauri/Cargo.toml` after desktop global profile and default vault commands.
- [x] Re-verify `npm run test:e2e` after default vault and local binding coverage.
- [x] Re-verify `npm run build` after browser OAuth and cloud workspace UI changes.
- [x] Re-verify `cargo test --manifest-path services/jtype-web/Cargo.toml` after Web OAuth/admin changes.
- [x] Re-verify `cargo test --manifest-path src-tauri/Cargo.toml` after desktop OAuth/binding changes.
- [x] Re-verify `npm run test:e2e` after browser OAuth and vault binding changes.
- [x] Re-verify `docker compose config` after service port and schema updates.
- [x] Verify `npm run build` after screenshot-driven app UX cleanup.
- [x] Verify `npx playwright test tests/e2e/app.spec.ts` after screenshot-driven app UX cleanup.

## Decisions

- Markdown files remain the source of truth.
- `.jtype/` stores rebuildable metadata, indexes, and publish config.
- AI features must not silently overwrite user files.
- Single-file mode remains supported even after workspace mode lands.
