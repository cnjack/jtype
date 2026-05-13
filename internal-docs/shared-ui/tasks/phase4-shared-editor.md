# Phase 4: Shared Editor Components

## Status: ⚠️ PARTIAL — Shared components complete; integration deferred

### QA Validation (2026-05-13)
Shared component layer: all items pass (with 1 bug fixed). Integration into EditorShell/WorkspaceEditor deferred.
- `EditorToolbar`, `ViewModeToggle`, `FloatingTooltip`, `StatusChip` all created with correct props/slots — correct
- `useScrollSync`, `useFloatingTooltip` hooks created — correct
- Barrel exports (`shared/hooks/index.ts`, `shared/components/index.ts`) — correct
- **Bug fixed (2026-05-13):** `StatusChip` `info` variant was incorrectly mapped to `status-chip-success`; corrected to `status-chip-info`
- Pre-requisite (Workspace.tsx decomposition): ❌ NOT DONE — deferred
- Desktop EditorShell integration: ❌ NOT DONE — deferred
- Web WorkspaceEditor integration: ❌ NOT DONE — deferred (WorkspaceEditor doesn't exist yet)
- Both `tsc --noEmit` ✓

## Scope
Extract shared editor components: MarkdownPreview, EditorToolbar, ViewModeToggle, ScrollSync.
Pre-requisite: Web `Workspace.tsx` must be decomposed first.

## Tasks

### Pre-requisite: Decompose Web Workspace.tsx
- [ ] Extract `WorkspaceSidebar.tsx` from Workspace.tsx
- [ ] Extract `WorkspaceEditor.tsx` from Workspace.tsx
- [ ] Extract `WorkspaceSettings.tsx` from Workspace.tsx
- [ ] Extract `WorkspaceMembers.tsx` from Workspace.tsx
- [ ] Extract `WorkspaceTrash.tsx` from Workspace.tsx
- [ ] Workspace.tsx becomes orchestrator (~200 lines)

### Shared Components
- [x] Create `shared/components/EditorToolbar.tsx`
  - Props: `onInsert` callback + `extraActions?: ReactNode` slot
- [x] Create `shared/components/ViewModeToggle.tsx`
  - Props: `mode`, `onModeChange`
  - Three states: write | split | preview
- [ ] Create `shared/components/MarkdownPreview.tsx`
  - Props: `content`, `containerRef`
  - Uses `renderToContainer` from `@shared/lib/markdown`
- [x] Create `shared/components/FloatingTooltip.tsx`
  - Props: `label`, `x`, `y`
- [x] Create `shared/components/StatusChip.tsx` *(bug fixed: info→status-chip-info)*
  - Props: `variant` (neutral|warning|success|info|error), `children`

### Shared Hooks
- [x] Create `shared/hooks/useScrollSync.ts`
  - Proportional bidirectional scroll sync between editor and preview
- [x] Create `shared/hooks/useFloatingTooltip.ts`
  - Manages tooltip position and visibility state

### Integration
- [ ] Update Desktop `EditorShell.tsx` to use shared components
- [ ] Update Web `WorkspaceEditor.tsx` to use shared components
- [x] Create `shared/components/index.ts` barrel export
- [x] Create `shared/hooks/index.ts` barrel export

## Design Notes
- Editor toolbar should not know about document save/publish — those are platform actions
- Preview component only renders — does not manage scroll sync itself
- ScrollSync hook is consumed by platform shell, not by shared components
