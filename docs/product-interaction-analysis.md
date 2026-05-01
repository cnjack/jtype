# JType Product Interaction Analysis

## 1. Objective

This document reviews how JType can improve its core management, editing, and menu interactions by learning from Notion and Obsidian while keeping JType's own position: a local-first Markdown workspace that can sync to a per-user website and stay AI-ready.

The goal is not to copy either product. JType should combine:

- Obsidian's trust model: local files remain portable Markdown.
- Notion's management model: pages, metadata, publishing, and workspace navigation feel organized.
- JType's own advantage: desktop and web publishing are connected from day one.

## 2. Reference Summary

### 2.1 Notion Patterns

Notion's strongest interaction patterns are information architecture and management:

- Sidebar as the primary workspace map.
- Nested pages with drag-and-drop reorganization.
- Favorites, shared/private areas, templates, settings, and trash in predictable sidebar areas.
- Pages can be managed as database records with properties, filters, sorts, and views.
- Wikis add ownership, verification, and "all pages" views for knowledge reliability.
- Publishing and sharing are page-native instead of feeling like a separate export step.

Product lesson for JType:

JType should not only show a raw file tree. It needs a content management layer on top of files: favorites, status, ownership, publish readiness, missing metadata, broken links, and saved views.

### 2.2 Obsidian Patterns

Obsidian's strongest interaction patterns are speed, local control, and knowledge graph behavior:

- Vault/file explorer maps directly to the local file system.
- Quick switcher opens recent or searched notes by keyboard.
- Command palette exposes every operation through fuzzy search.
- Properties are stored in YAML frontmatter and shown as structured fields.
- Backlinks, outgoing links, graph view, and local graph expose relationships between notes.
- Canvas uses an open JSON format for visual organization.
- File operations support context menus, drag-and-drop, and link updates on rename.

Product lesson for JType:

JType should make the fastest path keyboard-first and relationship-aware: open by search, run commands, inspect backlinks, manage properties, and update links safely when files move.

## 3. Current JType Gap Analysis

### 3.1 Navigation And Workspace Management

Current state:

- JType has a local workspace tree.
- It supports creating, renaming, deleting, saving, syncing, and publishing.
- It does not yet have a full workspace shell model.

Gaps:

- The left sidebar is still mostly a file tree, not a knowledge workspace.
- No favorites, pinned files, recently edited, or saved views.
- No clear distinction between local-only documents, synced documents, published documents, and drafts.
- No trash/recovery model.
- No command palette or quick switcher.
- No current-document breadcrumb beyond file selection.

Opportunity:

Build a management shell with an activity rail and structured sidebar sections:

- Workspace switcher
- Search / quick open
- Files
- Favorites
- Recent
- Publish queue
- Issues
- Trash

### 3.2 Editing Experience

Current state:

- JType has a source Markdown editor and preview.
- It supports save and live preview.

Gaps:

- Editing is not yet optimized for long-form authoring.
- No slash commands or insert menu.
- No toolbar for common Markdown operations.
- No properties/frontmatter panel.
- No outline panel for headings.
- No backlinks/outgoing links panel.
- No split mode controls beyond the current layout.
- No conflict-aware external file modification workflow.

Opportunity:

Keep Markdown source visible and honest, but add structured affordances:

- Editor modes: Write, Split, Preview.
- Formatting toolbar for common Markdown syntax.
- Insert menu for table, callout, code block, image, link, task list.
- Properties panel backed by YAML frontmatter.
- Document outline from headings.
- Link suggestions for `[[` and Markdown links.
- Diff preview for AI or sync conflict changes.

### 3.3 Menu And Command System

Current state:

- Actions are distributed across buttons.
- Some flows are visible, but not scalable as the feature set grows.

Gaps:

- No global command model.
- No keyboard-first command palette.
- No context menu contract for files, folders, editor selection, preview links, or publish items.
- No consistent disabled/loading/error states per command.

Opportunity:

Introduce a command registry:

- Every UI action becomes a command with id, label, icon, shortcut, scope, enabled state, and handler.
- Top menus, context menus, toolbar buttons, command palette, and future AI tools all call the same command layer.
- This also creates a natural integration point for AI actions.

### 3.4 Metadata And Management Views

Current state:

- JType can extract frontmatter and status.
- Web service can sync Markdown documents.

Gaps:

- No visible database-like management view.
- No bulk editing of status/tags/publish fields.
- No saved filters like "Drafts", "Published", "Missing title", "Broken links".
- No global property dictionary.

Opportunity:

Add "Library" views:

- Table view: title, path, status, tags, updated time, publish URL.
- List view: grouped by folder/status/tag.
- Issues view: missing title, duplicate slug, broken link, missing asset.
- Publish view: ready/draft/published/outdated.

This gives JType a lightweight Notion-like management layer without replacing Markdown files.

### 3.5 Relationship Navigation

Current state:

- AI index extracts some links/assets/headings.

Gaps:

- Users cannot see backlinks, outgoing links, or unlinked mentions.
- Rename/move does not yet provide a full relationship impact preview.
- No graph/local graph view.

Opportunity:

Use the existing AI/indexing direction to add human-facing relationship tools:

- Backlinks panel.
- Outgoing links panel.
- Link health checker.
- Rename/move impact dialog.
- Local graph for active document.
- Workspace graph as a later feature.

### 3.6 Publishing And Web Sync

Current state:

- JType can sync Markdown to a per-user website.
- Public site renders documents under `http://localhost:8080/@username`.

Gaps:

- Publish state is not yet deeply integrated into the desktop document lifecycle.
- No publish queue, publish diff, revision history, or preview URL per document.
- No clear "local saved", "synced", and "published" state ladder.
- Assets are still future work.

Opportunity:

Make publishing feel like a first-class document state:

- Document status chip: Local, Dirty, Synced, Published, Outdated, Failed.
- Publish panel with checklist and preview.
- One-click "sync and publish".
- Public URL copied from the desktop UI.
- Revision history and rollback in the web service later.

### 3.7 AI Readiness

Current state:

- AI context index and diff-before-write direction exist.

Gaps:

- No AI surface in the product shell yet.
- No AI permission/range selector.
- No AI-generated changes review UI.
- No user-facing explanation of what context will be used.

Opportunity:

AI should be designed as a workspace command layer, not as a chat box only:

- Selection commands: rewrite, summarize, expand, translate.
- Document commands: generate outline, improve title, add frontmatter, check consistency.
- Folder commands: generate README, build navigation, detect duplicate topics.
- Publish commands: SEO summary, broken link repair, style consistency.
- All write actions produce patches and require review.

## 4. Recommended Product Direction

JType should evolve into a "Markdown Workspace OS" with four primary surfaces:

1. Manage
   - File tree, library views, search, favorites, recent files, issues, trash.

2. Write
   - Markdown editor, preview, outline, properties, backlinks.

3. Publish
   - Sync, publish status, preview, public URL, site navigation, publish checks.

4. Assist
   - AI command palette, context selection, diff review, workspace index.

The most important near-term product move is to introduce a command-driven shell. It reduces UI complexity, improves keyboard speed, and gives AI a clean integration point.

## 5. Prioritized Improvements

### P0: Foundation For Better Interaction

- Global command registry.
- Command palette with fuzzy search.
- Quick switcher for files.
- Context menus for file tree items.
- Breadcrumb for current document.
- File tree sections for favorites and recent documents.
- Document state chips: Dirty, Saved, Synced, Published, Draft.
- Properties panel for YAML frontmatter.
- Basic outline panel.

### P1: Management Views

- Library table view.
- Saved filters: Drafts, Published, Needs review, Broken links.
- Publish queue view.
- Issue center for validation warnings.
- Trash/recovery model.
- Rename/move link impact preview.
- Backlinks/outgoing links panels.

### P2: Advanced Knowledge And Publishing

- Workspace graph and local graph.
- Bulk property editing.
- Templates.
- Revision history.
- Publish diff and rollback.
- Visual canvas using an open file format.
- AI command review center.

## 6. Interaction Principles

- Local files stay honest: every management action must map back to files or rebuildable metadata.
- Fast paths must be keyboard-accessible.
- Dangerous actions need preview and recovery.
- Metadata should be visible but not mandatory.
- Publishing should be a state, not a separate mental model.
- AI should suggest patches, not silently mutate files.
- The UI should keep the user's current writing context stable while management panels change around it.

## 7. Source References

- Notion sidebar navigation: https://www.notion.com/en-gb/help/navigate-with-the-sidebar
- Notion databases: https://www.notion.com/help/intro-to-databases
- Notion wikis and verified pages: https://www.notion.com/en-gb/help/wikis-and-verified-pages
- Obsidian file explorer: https://help.obsidian.md/Plugins/File%20explorer
- Obsidian command palette: https://help.obsidian.md/plugins/command-palette
- Obsidian quick switcher: https://help.obsidian.md/plugins/quick-switcher
- Obsidian properties: https://help.obsidian.md/properties
- Obsidian backlinks: https://help.obsidian.md/Plugins/Backlinks
- Obsidian graph view: https://help.obsidian.md/plugins/graph
- Obsidian canvas: https://help.obsidian.md/plugins/canvas
