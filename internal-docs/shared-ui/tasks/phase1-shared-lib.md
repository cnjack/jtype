# Phase 1: Shared Lib Layer

## Status: ✅ PASS

### QA Validation (2026-05-13)
All 22 checks passed. Verified by QA subagent.
- All 3 lib files (markdown, frontmatter, http) exist in `shared/lib/` — correct
- All required exports present (`renderMarkdownToHtml`, `parseFrontmatter`, `writeFrontmatter`, `titleFromMarkdown`, `fuzzyMatch`) — correct
- `types.ts` exports `EditorMode` + `FrontmatterParse` — correct
- No Tauri/platform imports in any shared lib file — correct
- All Desktop `src/` imports migrated to `@shared/lib/*` — correct
- All Web frontend imports migrated to `@shared/lib/*` — correct
- Both `tsc --noEmit` ✓

> **Note:** `FrontmatterParse` lives in `types.ts` (not re-exported from `frontmatter.ts` directly). Barrel `index.ts` surfaces it correctly — no remediation needed.

## Scope
Migrate identical/near-identical lib files to `shared/lib/`.

## Tasks

- [x] Move `src/lib/markdown.ts` → `shared/lib/markdown.ts`
- [x] Update Desktop imports: `@shared/lib/markdown`
- [x] Delete `services/jtype-web/frontend/src/lib/markdown.ts`
- [x] Update Web imports: `@shared/lib/markdown`
- [x] Move `src/lib/frontmatter.ts` → `shared/lib/frontmatter.ts`
  - Include `FrontmatterParse` type (was inline in Web)
  - Include `titleFromMarkdown()` (was Desktop-only)
- [x] Update Desktop imports: `@shared/lib/frontmatter`
- [x] Delete `services/jtype-web/frontend/src/lib/frontmatter.ts`
- [x] Update Web imports: `@shared/lib/frontmatter`
- [x] Move `src/lib/http.ts` → `shared/lib/http.ts`
- [x] Update Desktop imports: `@shared/lib/http`
- [x] Delete `services/jtype-web/frontend/src/lib/http.ts`
- [x] Update Web imports: `@shared/lib/http`
- [x] Create `shared/lib/types.ts` with shared types (`EditorMode`, `FrontmatterParse`)
- [x] Create `shared/lib/utils.ts` with pure shared functions (`fuzzyMatch`, `escapeHtml`)
- [x] Create `shared/lib/index.ts` barrel export
- [x] Verify both builds pass

## Rules
- Only pure functions go in `shared/lib/`
- Platform-specific utilities (`isTauriRuntime`, `sha256Hex`) stay in `src/lib/utils.ts`
- Web-only utilities (`offlineDb.ts`) stay in Web frontend
