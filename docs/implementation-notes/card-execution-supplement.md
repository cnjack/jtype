# Card execution supplement

Date: 2026-07-31

## Intent

`jtype-board-react` hosts such as jcode Cloud need to show execution receipts
next to a Card without replacing the native Card editor. The package now exposes
an additive `renderCardSupplement(card)` slot for that purpose.

The host owns the supplement content and data. jtype continues to own Card
title, description, status, properties, relations, comments, save behavior, and
optimistic concurrency.

## Public contract

- `JTypeBoardProps.renderCardSupplement?: (card: BoardViewCard) => ReactNode`
- The slot renders after native Properties and Relations in the built-in
  editable Card detail.
- It does not render for the explicit `readOnly` detail.
- It does not render when `onCardOpen` intercepts the built-in detail.
- Omission is a no-op.

The slot flows through the shared component contract:

`JTypeBoard → BoardSurface.renderCardSupplement → BoardPeek.supplement`.

There are no Desktop/Web/Cloud platform conditionals.

## Feature impact matrix

| Surface | Behavior | Verification |
| --- | --- | --- |
| Desktop board | No change when the slot is omitted | Desktop build + shared board tests |
| Web board | No change when the slot is omitted | Web build + shared board tests |
| Editable `jtype-board-react` embed | Native editor plus optional host supplement | Package Playwright fixture |
| Read-only package embed | Existing non-mutating detail; no supplement | Package Playwright fixture |
| `onCardOpen` host | Host callback remains the only detail owner | Package Playwright fixture |
| Package API/artifact | New prop exported in `.d.ts`; bundle and README updated | Package build/typecheck |

## Test cases

1. The editable package detail retains Description and Properties and adds the
   host supplement.
2. The read-only package detail does not render the editable supplement.
3. `onCardOpen` interception does not render the supplement.
4. Existing package editor tests continue to cover Card mutations and bounded
   host layout.

## Release

Package version: `0.1.2`.
