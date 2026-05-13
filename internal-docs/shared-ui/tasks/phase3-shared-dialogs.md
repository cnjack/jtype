# Phase 3: Shared Dialog Components

## Status: ✅ PASS

### QA Validation (2026-05-13)
All 24 checks passed. Verified by QA subagent.
- `PromptDialog`, `ConfirmDialog`, `PromptDialogContext`, `ConflictResolver` all exist with correct props — correct
- All use Headless UI `Dialog` — correct
- `PromptDialogProvider` wraps app tree in both Desktop `App.tsx` and Web `main.tsx` — correct
- `usePrompt` + `useConfirm` exported from context — correct
- Unified `confirm(message, { title?, destructive? })` signature consistent across shared + call sites — correct
- No Tauri/platform imports in any shared dialog — correct
- Both `tsc --noEmit` ✓

## Scope
Migrate PromptDialog, ConfirmDialog, ConflictResolver to `shared/components/`.

## Tasks

### PromptDialog
- [x] Create `shared/components/PromptDialog.tsx`
  - Props: `open`, `title`, `defaultValue`, `placeholder`, `confirmLabel`, `onConfirm`, `onClose`
  - Use Headless UI `Dialog` + `DialogPanel`
  - Use semantic Tailwind classes (no hex)
- [x] Create `shared/hooks/usePrompt.ts` — Context-based prompt hook
- [x] Create `shared/components/PromptDialogContext.tsx` — Provider
- [x] Update Desktop imports → `@shared/components/PromptDialog`
- [x] Update Web imports → `@shared/components/PromptDialog`
- [ ] Delete old: `src/components/modals/PromptDialog.tsx`, `src/components/modals/PromptDialogContext.tsx`
- [ ] Delete old: `services/jtype-web/frontend/src/components/PromptDialog.tsx`, `PromptDialogContext.tsx`

### ConfirmDialog
- [x] Create `shared/components/ConfirmDialog.tsx`
  - Props: `open`, `title`, `message`, `confirmLabel`, `danger`, `onConfirm`, `onClose`
- [x] Create `shared/hooks/useConfirm.ts` — Context-based confirm hook
- [x] Create `shared/components/ConfirmDialogContext.tsx` — Provider
- [x] Update Desktop imports → `@shared/components/ConfirmDialog`
- [ ] Delete old: `src/components/modals/ConfirmDialog.tsx`, `src/components/modals/ConfirmDialogContext.tsx`

### ConflictResolver
- [x] Create `shared/components/ConflictResolver.tsx`
  - Props: `localContent`, `cloudContent`, `fileName`, `onResolve`, `onClose`
  - Pure UI: 3-panel layout (local | cloud | merged)
  - No modal wrapping — platform layer decides container
- [x] Desktop wraps in Dialog modal
- [x] Web uses inline
- [ ] Delete old: `src/components/modals/ConflictDialog.tsx`
- [ ] Delete old: `services/jtype-web/frontend/src/components/ConflictResolver.tsx`

## Design Notes
- All colors must use design tokens (`text-brand`, `bg-brand-soft`, etc.)
- No platform imports (no `@tauri-apps/api`, no `api.ts`)
