# JType Interaction Upgrade PRD

> Status note: this PRD informed the command palette, quick switcher, inspector, and editor workbench. Current product language is vault-first for local folders and cloud workspace for server-side collaboration. AI UI remains hidden until implemented.

## 1. Background

JType has completed a local-first Markdown workspace and a companion web sync/publish slice. The next product problem is interaction maturity: as JType grows from one document to many workspaces, publishing states, sync states, metadata, and AI commands, the current button-driven UI will become hard to scale.

This PRD defines the next interaction upgrade. It focuses on core management, editing, menus, and command flows inspired by Notion and Obsidian, adapted to JType's local Markdown and per-user website model.

## 2. Product Goal

Turn JType from "a Markdown workspace with sync" into "a command-driven Markdown knowledge workspace" where users can:

- Quickly find, open, and manage documents.
- Edit Markdown with structured metadata, outline, and preview.
- Understand document relationships.
- Track sync and publish states.
- Use one consistent command system across menus, shortcuts, context menus, toolbar buttons, and future AI actions.

## 3. Target Users

- Local-first knowledge workers who want Markdown files they can trust.
- Technical writers managing documentation sites.
- Solo creators publishing personal knowledge bases.
- Small teams that need ownership, status, and publish checks without adopting a heavy CMS.
- Future AI-assisted users who need safe patch review before file changes.

## 4. User Problems

### Problem 1: Too Many Documents Become Hard To Navigate

As a workspace grows, a raw folder tree is not enough. Users need favorites, recents, search, quick switcher, and saved views.

### Problem 2: File Operations Need More Context

Renaming, moving, or deleting Markdown files can break links and publishing routes. Users need impact previews and recovery.

### Problem 3: Markdown Metadata Is Hidden

Frontmatter is machine-readable but not always comfortable to edit. Users need a visible properties panel that still writes plain YAML.

### Problem 4: Publishing State Is Not Obvious

Users need to know whether a document is local-only, saved, synced, draft, published, or outdated.

### Problem 5: AI Needs A Safe Product Surface

Future AI features need a command layer, context scope, permissions, and diff review.

## 5. Scope

### In Scope

- App shell navigation redesign.
- Global command registry.
- Command palette.
- Quick switcher.
- Context menu model.
- File tree interaction upgrades.
- Favorites and recents.
- Breadcrumbs.
- Document status chips.
- Properties/frontmatter panel.
- Outline panel.
- Backlinks and outgoing links panel.
- Library and issue views.
- Publish queue view.
- AI-ready command hooks.

### Out Of Scope For This PRD

- Full Notion-style block editor.
- Real-time multiplayer collaboration.
- Full visual canvas implementation.
- Complete AI model integration.
- Mobile app.
- Enterprise permission model.

## 6. Core Requirements

### 6.1 App Shell

Priority: P0

Requirements:

- Add a left activity rail with primary areas: Files, Search, Library, Publish, AI, Settings.
- Add a collapsible sidebar that changes content based on active area.
- Add a top document bar with breadcrumbs, document title, status chips, and primary actions.
- Preserve the editor layout as the central work area.
- Add a right inspector that can switch between Preview, Properties, Outline, Links, Publish, and AI.

Acceptance criteria:

- Users can switch between Files, Library, Publish, and AI without losing current editor state.
- Current document remains visible while side panels change.
- Sidebar can be collapsed and restored.
- Top bar always shows current workspace and document identity.

### 6.2 Command Registry

Priority: P0

Requirements:

- Define a typed command model with id, title, icon, shortcut, scope, enabled state, and handler.
- All toolbar buttons and menu actions must call commands.
- Commands must support scopes: global, workspace, file, folder, editor, selection, publish, AI.
- Commands must expose loading, disabled, and error states.
- Commands must be available to the command palette.

Acceptance criteria:

- "Save current file" can be triggered from toolbar, shortcut, command palette, and menu through the same command id.
- Disabled commands explain why they are unavailable.
- Failed commands surface a visible error without crashing the app.

### 6.3 Command Palette

Priority: P0

Requirements:

- Open with `Ctrl+P` or `Ctrl+Shift+P` depending on conflict with quick switcher.
- Support fuzzy search.
- Show recently used commands.
- Show command shortcuts.
- Allow pinned commands later.
- Include AI commands when available.

Acceptance criteria:

- User can type "save" and run Save Current File.
- User can type "publish" and run Publish Preview or Sync Workspace.
- Palette results update within 100ms for the current command list.

### 6.4 Quick Switcher

Priority: P0

Requirements:

- Open with `Ctrl+O`.
- Search files by title, path, alias, and tags.
- Empty search shows recent files.
- Enter opens selected file.
- Shift+Enter creates a new Markdown file with the typed name.
- Results must support large workspaces through indexed search.

Acceptance criteria:

- User can open a note by typing part of its title.
- User can create a new note from the quick switcher.
- A workspace with 1,000 Markdown files remains usable.

### 6.5 File Tree Upgrades

Priority: P0

Requirements:

- Add file/folder context menus.
- Add drag-and-drop move.
- Add expand all/collapse all.
- Add reveal current file.
- Add favorites section.
- Add recent section.
- Add unsaved/synced/published visual indicators.
- Add safe delete with trash or confirmation.

Acceptance criteria:

- User can right-click a file to rename, move, delete, favorite, reveal in OS, copy path, copy public URL.
- Renaming a file offers to update internal links.
- Deleting a file does not silently bypass recovery.

### 6.6 Properties Panel

Priority: P0

Requirements:

- Display YAML frontmatter as editable fields.
- Support default fields: title, description, tags, slug, status, publish, createdAt, updatedAt.
- Validate status and slug.
- Write changes back to Markdown frontmatter.
- Allow source mode fallback for unsupported nested data.

Acceptance criteria:

- Editing `title` in the panel updates the Markdown file.
- Invalid slug shows inline validation.
- Existing custom frontmatter fields are preserved.

### 6.7 Outline And Links Panel

Priority: P1

Requirements:

- Outline panel lists headings from the current document.
- Clicking a heading jumps to the editor location.
- Links panel shows outgoing links, backlinks, missing links, and assets.
- Broken links are actionable.

Acceptance criteria:

- Current document headings appear after opening a file.
- Backlinks update when switching documents.
- Broken links show target path and suggested repair action.

### 6.8 Library View

Priority: P1

Requirements:

- Add a table/list view of documents.
- Columns: title, path, status, tags, updatedAt, syncedAt, publishedAt, public URL.
- Filter by status, tag, folder, issue type.
- Sort by title, updatedAt, status.
- Provide saved views: All, Drafts, Published, Needs Review, Broken Links.

Acceptance criteria:

- User can find all draft documents without manually scanning folders.
- User can sort by last edited.
- User can open a document from the library view.

### 6.9 Publish Queue

Priority: P1

Requirements:

- Show all documents that are ready, draft, published, outdated, or failed.
- Provide pre-publish checks: missing title, duplicate slug, draft status, broken links, missing assets.
- Provide sync/publish action.
- Show public URL after sync.

Acceptance criteria:

- User can see which local documents differ from web.
- User can run checks before publishing.
- User can copy the public URL for a published page.

### 6.10 AI-Ready Interaction Hooks

Priority: P1 design, P2 implementation

Requirements:

- Commands can declare whether they are AI commands.
- AI commands must declare context scope: selection, document, folder, workspace.
- AI commands must return proposed patches.
- Proposed patches must open in a review panel before write.
- User can accept, reject, or partially apply patches.

Acceptance criteria:

- AI command contract exists before integrating a model.
- No AI command writes directly to disk without review.
- AI context summary is visible before submission.

## 7. Menu Model

### 7.1 Top App Menus

File:

- New Note
- New Folder
- Open File
- Open Workspace
- Save
- Save As
- Export Static Site
- Sync Workspace
- Settings

Edit:

- Undo
- Redo
- Cut
- Copy
- Paste
- Find In Document
- Find In Workspace

View:

- Toggle Sidebar
- Toggle Inspector
- Write Mode
- Split Mode
- Preview Mode
- Focus Mode

Navigate:

- Quick Switcher
- Back
- Forward
- Reveal Current File
- Open Backlinks

Publish:

- Run Checks
- Preview Site
- Sync To Web
- Copy Public URL

AI:

- Explain Selection
- Rewrite Selection
- Summarize Document
- Generate Frontmatter
- Build AI Index
- Review Pending AI Changes

### 7.2 Context Menus

File tree item:

- Open
- Open in New Tab
- Rename
- Move To
- Duplicate
- Delete
- Add to Favorites
- Copy Markdown Link
- Copy Public URL
- Reveal in Explorer

Folder item:

- New Note
- New Folder
- Move To
- Rename
- Delete
- Collapse/Expand
- Generate README later

Editor selection:

- Bold
- Italic
- Link
- Code
- Quote
- AI Rewrite
- AI Explain

Preview link:

- Open
- Copy Link
- Reveal Source
- Check Link

## 8. Success Metrics

- User can open any document in a 1,000-file workspace in under 5 seconds using quick switcher.
- 80% of core actions are reachable from command palette.
- Users can identify publish state without opening the web site.
- Users can rename a document with internal link update prompt.
- Users can edit common frontmatter without touching raw YAML.
- AI command patches always require review before write.

## 9. Risks

- Adding too many panels can make the interface feel heavy.
- Command registry can become abstract if not implemented with real commands first.
- Properties panel must not corrupt custom YAML.
- Link update logic needs careful path normalization on Windows.
- Publish state can become confusing if save, sync, and publish are not clearly separated.

## 10. Rollout Plan

### Milestone 1: Command Shell

- Command registry.
- Command palette.
- Quick switcher.
- Top document bar.
- Context menus for file tree.

### Milestone 2: Management Surfaces

- Favorites and recent files.
- Properties panel.
- Outline panel.
- Library view.
- Issue view.

### Milestone 3: Relationship And Publish

- Backlinks/outgoing links.
- Rename/move impact preview.
- Publish queue.
- Public URL copy.
- Sync status history.

### Milestone 4: AI-Ready UX

- AI command scope selector.
- Patch review panel.
- AI context preview.
- Safe apply/reject flow.
