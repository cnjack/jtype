// Post-build CSS scoping (see src/styles.css header). Rewrites every selector
// in dist/style.css so no rule can style host-page elements:
//   :root / :host       -> .jtb-scope, [data-headlessui-portal]
//   any other selector  -> :where(.jtb-scope, [data-headlessui-portal]) <sel>
// `:where()` adds zero specificity, so the relative weight of reset vs utility
// rules is unchanged. Headless UI v2 renders anchored dropdowns into body-level
// portals tagged data-headlessui-portal, which is why they are a second root.
// @keyframes / @property / @font-face bodies are left untouched.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

const pkgRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const cssPath = path.join(pkgRoot, 'dist', 'style.css')

const SCOPE = ':where(.jtb-scope, [data-headlessui-portal])'
const ROOT_SELECTORS = ['.jtb-scope', '[data-headlessui-portal]']

if (!fs.existsSync(cssPath)) {
  console.error(`scope-css: ${cssPath} not found — did vite build emit the css?`)
  process.exit(1)
}

const root = postcss.parse(fs.readFileSync(cssPath, 'utf8'))
let rewritten = 0
root.walkRules((rule) => {
  let p = rule.parent
  while (p && p.type !== 'root') {
    if (p.type === 'atrule' && /^(keyframes|property|font-face|page|counter-style)/i.test(p.name)) return
    p = p.parent
  }
  rule.selectors = rule.selectors.flatMap((sel) => {
    const s = sel.trim()
    if (s === ':root' || s === ':host') return ROOT_SELECTORS
    if (s.includes('.jtb-scope') || s.includes('[data-headlessui-portal]')) return [s]
    if (/^(html|body)(?![-\w])/.test(s)) return ['.jtb-scope']
    return [`${SCOPE} ${s}`]
  })
  rewritten += 1
})
fs.writeFileSync(cssPath, root.toString())

// Guardrails: fail the build if anything slipped through that could leak.
const out = fs.readFileSync(cssPath, 'utf8')
if (/(^|[},])\s*:root\b/m.test(out)) {
  console.error('scope-css: a bare :root selector survived scoping')
  process.exit(1)
}
console.log(`scope-css: scoped ${rewritten} rules in dist/style.css`)
