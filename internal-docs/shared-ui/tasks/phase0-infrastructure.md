# Phase 0: Infrastructure Setup

## Status: ✅ PASS

### QA Validation (2026-05-13)
All 19 checks passed. Verified by QA subagent.
- Directory structure: `shared/{components,hooks,lib,styles}/` — correct
- Desktop + Web Vite `@shared` aliases — correct
- Desktop + Web tsconfig paths + include — correct
- `tokens.css` all 6 design tokens with exact values — correct
- Both CSS files import `@shared/styles/tokens.css` — correct
- Desktop `vite build` ✓ | Web `vite build` ✓ | Both `tsc --noEmit` ✓

## Scope
Set up `shared/` directory structure, design tokens, and CSS imports.

## Tasks

- [x] Create `shared/` directory tree: `components/`, `hooks/`, `lib/`, `styles/`
- [x] Configure Desktop `vite.config.ts`: add `@shared` alias (done in pre-phase)
- [x] Configure Web `vite.config.ts`: add `@shared` alias (done in pre-phase)
- [x] Configure Desktop `tsconfig.json`: add `paths` + include `shared` (done in pre-phase)
- [x] Configure Web `tsconfig.json`: add `paths` + include `shared` (done in pre-phase)
- [x] Create `shared/styles/tokens.css` with unified design tokens
- [x] Update Desktop `src/styles.css` to `@import '@shared/styles/tokens.css'`
- [x] Update Web `services/jtype-web/frontend/src/index.css` to `@import '@shared/styles/tokens.css'`
- [x] Verify both `npm run build` pass

## Design Tokens

```css
@theme {
  --color-brand: #008884;
  --color-brand-light: #22b8ad;
  --color-brand-dark: #006f6b;
  --color-brand-soft: #e8f6f2;
  --color-brand-gray: #6f817a;
  --color-line: rgb(13 13 12 / 0.06);
}
```

## Acceptance Criteria
- `shared/` directory exists with correct structure
- Both frontends build successfully with `@shared` alias
- Design tokens are importable from `@shared/styles/tokens.css`
