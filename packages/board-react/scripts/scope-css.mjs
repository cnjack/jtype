// Post-build CSS scoping (see src/styles.css header). Rewrites every selector
// in dist/style.css so no rule can style host-page elements:
//   :root / :host       -> .jtb-scope
//   any other selector  -> :where(.jtb-scope) <sel>  (descendants of a scope root)
//                          + a self-match arm         (the scope root itself)
// The self-match arm appends :where(.jtb-scope) to the selector's FIRST
// compound (before any pseudo-element), so panels that ARE scope roots — the
// dropdown panels BoardSurface renders into Headless UI portals, marked via
// portalClassName — style themselves and their subtrees. We deliberately do
// NOT scope by [data-headlessui-portal]: that attribute is library-global, so
// matching it would restyle a host app's own Headless UI portals.
// `:where()` adds zero specificity, so reset-vs-utility weight is unchanged.
// @keyframes / @property / @font-face bodies are left untouched.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

const pkgRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const cssPath = path.join(pkgRoot, 'dist', 'style.css')

const SCOPE = ':where(.jtb-scope)'

if (!fs.existsSync(cssPath)) {
  console.error(`scope-css: ${cssPath} not found — did vite build emit the css?`)
  process.exit(1)
}

/**
 * Append `:where(.jtb-scope)` to the first compound of a selector — before
 * any pseudo-element and before the first top-level combinator. Handles the
 * escaped characters tailwind emits (`\[`, `\.`, `\(`, …) and bracket/paren
 * nesting; tailwind class names never contain literal whitespace.
 */
function selfArm(sel) {
  let depth = 0
  let insert = sel.length
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i]
    if (c === '\\') {
      i += 1 // skip the escaped character
      continue
    }
    if (c === '[' || c === '(') depth += 1
    else if (c === ']' || c === ')') depth -= 1
    else if (depth === 0) {
      if (c === ':') {
        // Pseudo-element: :where() must precede it. The minifier downgrades
        // ::before/::after/::first-line/::first-letter to their legacy
        // single-colon forms, which are pseudo-ELEMENTS too — appending a
        // pseudo-class after any of them is invalid and would void the whole
        // selector list (killing e.g. the entire box-sizing/border reset).
        if (sel[i + 1] === ':' || /^:(before|after|first-line|first-letter)(?![-\w])/i.test(sel.slice(i))) {
          insert = i
          break
        }
      }
      if (c === ' ' || c === '\t' || c === '>' || c === '+' || c === '~') {
        insert = i // first top-level combinator ends the first compound
        break
      }
    }
  }
  return `${sel.slice(0, insert)}${SCOPE}${sel.slice(insert)}`
}

const root = postcss.parse(fs.readFileSync(cssPath, 'utf8'))
let rewritten = 0
root.walkRules((rule) => {
  let p = rule.parent
  while (p && p.type !== 'root') {
    if (p.type === 'atrule' && /^(keyframes|property|font-face|page|counter-style)/i.test(p.name)) return
    p = p.parent
  }
  const next = []
  for (const raw of rule.selectors) {
    const s = raw.trim()
    if (s === ':root' || s === ':host') {
      if (!next.includes('.jtb-scope')) next.push('.jtb-scope')
    } else if (s.includes('.jtb-scope') || s.includes('.jtb-root')) {
      next.push(s) // already in our namespace
    } else if (/^(html|body)(?![-\w])/.test(s)) {
      if (!next.includes('.jtb-scope')) next.push('.jtb-scope')
    } else {
      next.push(`${SCOPE} ${s}`)
      next.push(selfArm(s))
    }
  }
  rule.selectors = next
  rewritten += 1
})
fs.writeFileSync(cssPath, root.toString())

// Guardrails: fail the build if anything slipped through that could leak.
const out = fs.readFileSync(cssPath, 'utf8')
if (/(^|[},])\s*:root\b/m.test(out)) {
  console.error('scope-css: a bare :root selector survived scoping')
  process.exit(1)
}
if (out.includes('data-headlessui-portal')) {
  console.error('scope-css: [data-headlessui-portal] must never be a scope root (host portal leakage)')
  process.exit(1)
}
if (/::?(before|after|first-line|first-letter):where/i.test(out)) {
  console.error('scope-css: pseudo-class appended after a pseudo-element (invalid selector, voids the rule)')
  process.exit(1)
}
console.log(`scope-css: scoped ${rewritten} rules in dist/style.css`)
