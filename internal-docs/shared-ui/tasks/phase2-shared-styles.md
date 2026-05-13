# Phase 2: Shared Styles Layer

## Status: ✅ PASS

### QA Validation (2026-05-13)
All checklist items passed. Verified by QA subagent.
- `shared/styles/components.css` — all 20+ required classes present — correct
- `shared/styles/preview.css` — markdown preview styles present — correct
- No hardcoded hex (`#008884`, `#006f6b`, etc.) in `components.css` — correct
- Semantic tokens (`text-brand`, `bg-brand-soft`, etc.) pervasively used — correct
- Desktop `styles.css` imports both shared CSS files, no duplicated classes — correct
- Web `index.css` imports both shared CSS files, no duplicated classes — correct
- Both builds pass ✓

> **Minor (non-blocking):** `.status-chip-neutral` uses `bg-[#edf1ef]` and `.soft-scrollbar::-webkit-scrollbar-thumb:hover` uses an inline brand RGB. Could be tokenized in a future cleanup pass.

## Scope
Extract duplicate CSS component classes to `shared/styles/`, replace hardcoded hex with semantic tokens.

## Tasks

- [x] Create `shared/styles/components.css` with all shared component classes
- [x] Create `shared/styles/preview.css` with Markdown preview styles
- [x] Update Desktop `src/styles.css`:
  - `@import '@shared/styles/components.css'`
  - Remove duplicated classes
  - Keep Desktop-only classes (command-modal, command-input, user-avatar, modal-backdrop, etc.)
- [x] Update Web `index.css`:
  - `@import '@shared/styles/components.css'`
  - Remove duplicated classes
  - Keep Web-only classes (workspace-card-link, menu-row, etc.)
- [x] Replace all hardcoded hex in `shared/styles/components.css`:
  - `text-[#008884]` → `text-brand`
  - `bg-[#006f6b]` → `bg-brand-dark`
  - `bg-[#e8f6f2]` → `bg-brand-soft`
  - `text-[#6f817a]` → `text-brand-gray`
  - `border-[#008884]` → `border-brand`
  - etc.
- [x] Verify both builds pass and visual consistency

## Shared Classes (30+)
toolbar-button, toolbar-button-primary, sidebar-action, sync-input, workspace-row,
workspace-row-bound, editor-tool, view-mode-button, view-mode-button-active,
subtle-button, compact-select, status-chip, status-chip-neutral, status-chip-warning,
status-chip-success, header-action-group, header-icon-button, header-icon-button-primary,
header-icon-button-warning, header-icon-button-danger, header-tooltip, header-tooltip-label,
floating-tooltip, field-label, field-input, field-textarea, tree-button, tree-button-active,
document-info-section, context-menu, context-menu-button, panel-card, command-row, soft-scrollbar
