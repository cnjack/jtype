export const meta = {
  name: 'jtype-help-content',
  description: 'Author the bilingual help articles, Remotion explainers, and case-study POCs for the JType help center',
  phases: [
    { title: 'Compositions', detail: '6 Remotion category explainers' },
    { title: 'Articles', detail: '17 bilingual help articles (en + zh) across 7 categories' },
    { title: 'Cases', detail: '3 case studies + real example vaults' },
  ],
}

const ROOT = '/Users/jack/workpath/jjj/jtype'
const FE = ROOT + '/services/jtype-web/frontend/src/help'
const ART = FE + '/content/articles'
const CASES = FE + '/content/cases'
const COMP = FE + '/remotion/compositions'

// ---------------------------------------------------------------------------
// Shared knowledge every agent gets: product facts, exact command/tool surface,
// the content map (for accurate cross-links), and the house style.
// ---------------------------------------------------------------------------
const FACTS = [
  'PRODUCT: JType is a local-first Markdown vault editor. Surfaces: a desktop app (Tauri), a web service + SPA (Axum + React), a CLI (jtype), an MCP server for AI, kanban boards, and publishing.',
  '',
  'CORE MODEL:',
  '- Vault = a local folder of plain Markdown (.md) files on the user device. Default vault path: ~/Documents/.jtype. The folder IS the source of truth; no proprietary DB; openable in any editor.',
  '- Cloud workspace = the optional server-side boundary for sync, sharing, kanban, publishing, storage budget, and membership.',
  '- Binding = per-device map from one cloud workspace to one local vault path, stored at .jtype/cloud.json next to the files.',
  '- Site = published read-only output. A note becomes public by adding "publish: true" to its YAML frontmatter; the public site lives at /u/:username and pages at /u/:username/:page_path. Custom domains are supported.',
  '- Desktop login is browser-based OAuth through the web service; the desktop never collects passwords. Single-file mode = a focused editor with no sync/account/publish. Vault mode = navigation, quick open, editor, split preview, document info, publish checks, account/cloud sync. Editor modes: write / split / preview.',
  '- Default local cloud service URL: http://localhost:13345. GitHub repo: https://github.com/cnjack/jtype . Installers: latest release page https://github.com/cnjack/jtype/releases/latest (macOS .dmg aarch64/x64, Windows x64-setup.exe).',
  '',
  'CLI (binary: jtype) — EXACT command surface, do not invent flags:',
  '  jtype login | logout | whoami',
  '  jtype workspace list',
  '  jtype note list [--workspace W] [--folder F]',
  '  jtype note get [--workspace W] <path>',
  '  jtype note search [--workspace W] [--limit N] <query>',
  '  jtype note create [--workspace W] <path> [--content TEXT | --file PATH | -(stdin)] [--title T]',
  '  jtype note update [--workspace W] <path> [--content TEXT | --file PATH]',
  '  jtype bind --workspace <id|name|slug>      (writes .jtype/cloud.json)',
  '  jtype vault status                          (shows vault root + cloud binding)',
  '  jtype sync                                  (pull + push with the bound workspace)',
  '  jtype board list [--workspace W] | board get [--workspace W] <board>',
  '  jtype card list --board B [--column C] | card create --board B --column C <title> [--description D --priority P --assignee A]',
  '  jtype card update <card> [--title --description --priority --assignee] | card move --board B <card> --to-column C [--position N]',
  '  jtype token create [--label L --ttl-days N] | token list | token revoke <id>',
  '  jtype mcp-stdio                             (local stdio MCP bridge to the HTTP /mcp endpoint)',
  '  Note commands are LOCAL-FIRST: they read/write the Markdown files in the current working directory vault. After bind, jtype sync write-through to the cloud workspace.',
  '  Install the CLI: desktop app Settings -> Tools -> Command line -> "Install jtype to your PATH"; OR macOS/Linux: curl -fsSL https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.sh | sh ; OR Windows PowerShell: irm https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.ps1 | iex ; OR from source: cargo install --path services/jtype-cli',
  '',
  'AI / MCP:',
  '- MCP server endpoint: https://<your-jtype-host>/mcp (locally http://localhost:13345/mcp). Transport: Streamable HTTP (JSON-RPC). Auth: OAuth 2.1 (browser, recommended; Authorization Code + PKCE/S256) OR a scoped access token (fallback).',
  '- 14 tools. Notes: list_workspaces, list_notes, get_note, search_notes, create_note, update_note, append_note. Kanban: list_boards, get_board, list_cards, create_card, update_card, move_card, list_members. Read tools return Markdown; writes respect the workspace role; admin actions are NEVER available to an AI token.',
  '- Tokens are mcp-scoped (notes + kanban only, never admin), expire (OAuth + minted tokens 90 days; device approval codes 10 min, single-use), and are revocable (jtype token list/revoke or the web dashboard AI Connections page).',
  '- Client setup: Claude Desktop / claude.ai -> Settings -> Connectors -> Add custom connector -> the /mcp URL (OAuth). Claude Code: claude mcp add --transport http jtype <url>/mcp . Cursor: Settings -> MCP -> Add HTTP server -> URL. Cline/jcode/generic: HTTP server with header Authorization: Bearer <token>. stdio-only clients: jtype mcp-stdio bridge.',
  '',
  'CONTENT MAP (use these exact routes for cross-links, format /help/c/<categoryId>/<articleId>):',
  '- getting-started: install-jtype, your-first-vault, the-jtype-flow',
  '- vault-editing: how-vaults-work, writing-markdown, quick-open-and-links',
  '- sync-workspaces: cloud-workspaces, push-pull-sync, members-and-roles',
  '- kanban: boards-and-cards, web-board-view',
  '- publishing: publish-a-site, custom-domains',
  '- ai-mcp: connect-your-ai, what-ai-can-do, oauth-vs-token',
  '- cli: install-and-login, notes-bind-sync',
  '- Case studies index: /help/cases ; cases: /help/cases/engineering-team, /help/cases/personal-kb, /help/cases/docs-site',
  '',
  'HOUSE STYLE:',
  '- Audience = end users (not contributors). Warm, concrete, second person. Short paragraphs. Lead with the outcome.',
  '- Every article body must be authored in BOTH English (.en.md) and natural, fluent Simplified Chinese (.zh.md) — translate meaning, not words; do not leave the zh file as English.',
  '- Use real, runnable commands from the surface above. Never invent flags, tools, routes, or settings. If unsure, read the repo files named in your task.',
  '- Markdown may use headings (## and ###), lists, tables, blockquotes, and fenced code blocks. Use ## for top sections (they drive the on-page table of contents). Do not include an H1 — the page renders the title separately.',
].join('\n')

const TS_RULES = [
  'STRICT TypeScript (noUnusedLocals, noUnusedParameters, noUncheckedIndexedAccess, no implicit any). No eslint-disable. Files must compile under tsc --noEmit.',
].join(' ')

const MANIFEST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['writtenFiles', 'summary'],
  properties: {
    writtenFiles: { type: 'array', items: { type: 'string' }, description: 'Absolute paths of every file written.' },
    summary: { type: 'string', description: 'One or two sentences on what was produced and any caveats.' },
  },
}

// ---------------------------------------------------------------------------
// ARTICLES — one agent per category, authors all that category's articles.
// ---------------------------------------------------------------------------
const ARTICLE_TS_SKELETON = [
  "import type { ArticleMeta } from '../types'",
  "import en from './FILEBASE.en.md?raw'",
  "import zh from './FILEBASE.zh.md?raw'",
  '',
  'const article: ArticleMeta = {',
  "  id: 'ARTICLE_ID',",
  "  categoryId: 'CATEGORY_ID',",
  '  order: ORDER,',
  "  updated: '2026-06-14',",
  '  title: { en: ENGLISH_TITLE, zh: CHINESE_TITLE },',
  '  summary: { en: ENGLISH_SUMMARY, zh: CHINESE_SUMMARY },',
  '  body: { en, zh },',
  '}',
  '',
  'export default article',
].join('\n')

const ARTICLE_PLAN = [
  {
    categoryId: 'getting-started',
    sources: ['README.md', 'docs/connect-your-ai.md'],
    note: 'the-jtype-flow (order 3) ALREADY EXISTS — do not touch it. Only write the two below.',
    articles: [
      { id: 'install-jtype', order: 1, brief: 'Install the desktop app (macOS dmg aarch64/x64, Windows x64-setup.exe from the latest release) and, optionally, the CLI. First launch: welcome screen offers default vault, open vault, open Markdown file, recent items. Browser-based OAuth sign-in is optional and only needed for cloud features.' },
      { id: 'your-first-vault', order: 2, brief: 'Open or create your first vault (default ~/Documents/.jtype or any folder). Vault home vs single-file mode. Create your first note, see write/split/preview. Emphasize files stay on disk as .md.' },
    ],
  },
  {
    categoryId: 'vault-editing',
    sources: ['README.md', 'shared/lib/markdown.ts'],
    articles: [
      { id: 'how-vaults-work', order: 1, brief: 'What a vault is (a normal Markdown folder), subfolders, that JType never locks files, the .jtype folder for local state, single-file vs vault mode.' },
      { id: 'writing-markdown', order: 2, brief: 'Writing Markdown in JType: GFM, YAML frontmatter (title, publish), the write/split/preview modes, and that the preview supports math (KaTeX $...$ and $$...$$), Mermaid diagrams, and PlantUML. Give small examples.' },
      { id: 'quick-open-and-links', order: 3, brief: 'Moving around a vault: file navigation, quick open, document info, and linking between notes. Keep it practical.' },
    ],
  },
  {
    categoryId: 'sync-workspaces',
    sources: ['README.md', 'docs/vault-cloud-prd.md', 'internal-docs/ai-integration/03-cli-local-first.md'],
    articles: [
      { id: 'cloud-workspaces', order: 1, brief: 'What a cloud workspace is and why bind a vault to one. Creating a workspace on the web, signing in on desktop via browser OAuth, and the .jtype/cloud.json binding (one workspace <-> one local vault path per device). CLI: jtype bind --workspace <id|name|slug>, jtype vault status.' },
      { id: 'push-pull-sync', order: 2, brief: 'How sync works: two-way push/pull, versions, and resolving conflicts when the same note changed in two places. CLI: jtype sync. Keep reassuring — local stays the source of truth.' },
      { id: 'members-and-roles', order: 3, brief: 'Inviting members, roles (owner/admin/member style), what each can do, and that sharing is scoped to the workspace. Mention storage budget at a high level.' },
    ],
  },
  {
    categoryId: 'kanban',
    sources: ['README.md', 'internal-docs/kanban', 'internal-docs/doc-kanban-unification'],
    articles: [
      { id: 'boards-and-cards', order: 1, brief: 'Turning a workspace into kanban: boards, columns, cards, priority and assignee. How cards relate to notes. CLI examples: jtype board list, jtype card create --board B --column C "Title" --priority high, jtype card move.' },
      { id: 'web-board-view', order: 2, brief: 'Using the board in the web app: drag cards across columns, realtime updates, filtering. Practical walkthrough.' },
    ],
  },
  {
    categoryId: 'publishing',
    sources: ['README.md', 'internal-docs/site-publish'],
    articles: [
      { id: 'publish-a-site', order: 1, brief: 'Publish selected notes: add publish: true to frontmatter, what the public site looks like, the /u/:username and /u/:username/:page_path routes, and that the source stays Markdown. Include a frontmatter example.' },
      { id: 'custom-domains', order: 2, brief: 'Custom domains for a published site and exactly what gets published vs stays private (only publish:true notes). Keep it concrete.' },
    ],
  },
  {
    categoryId: 'ai-mcp',
    sources: ['docs/connect-your-ai.md', 'internal-docs/ai-integration/README.md', 'internal-docs/ai-integration/02-design.md'],
    articles: [
      { id: 'connect-your-ai', order: 1, brief: 'Port and polish docs/connect-your-ai.md for end users: the /mcp endpoint, OAuth (recommended) vs token, and per-client setup (Claude Desktop/claude.ai, Claude Code, Cursor, Cline, jcode, stdio bridge). Include a "try it" prompt.' },
      { id: 'what-ai-can-do', order: 2, brief: 'The 14 MCP tools grouped Notes vs Kanban, what reads vs writes, that admin is never exposed to AI, and a couple of example asks a user could give their assistant.' },
      { id: 'oauth-vs-token', order: 3, brief: 'Choosing OAuth vs a scoped token, how to mint one (jtype token create --label "jcode" --ttl-days 90 or the dashboard), scope/expiry/revocation, and security notes (PKCE, single-use device codes).' },
    ],
  },
  {
    categoryId: 'cli',
    sources: ['internal-docs/ai-integration/03-cli-local-first.md', 'docs/connect-your-ai.md', 'services/jtype-cli/src/main.rs'],
    articles: [
      { id: 'install-and-login', order: 1, brief: 'Install the jtype CLI (three ways) and sign in with jtype login (OAuth device flow), jtype whoami. What the CLI is for.' },
      { id: 'notes-bind-sync', order: 2, brief: 'Daily CLI use: local-first note commands over the current folder (note list/get/search/create/update with --content/--file/stdin), then jtype bind and jtype sync for cloud write-through. A realistic capture-from-terminal example.' },
    ],
  },
]

function articlePrompt(plan) {
  const list = plan.articles
    .map((a) => `  - id "${a.id}", order ${a.order}, fileBase "${plan.categoryId}-${a.id}": ${a.brief}`)
    .join('\n')
  return [
    `You are authoring the END-USER help articles for the JType help center category "${plan.categoryId}".`,
    '',
    FACTS,
    '',
    `READ THESE REPO FILES FIRST for accuracy (absolute base ${ROOT}/): ${plan.sources.join(', ')}.`,
    plan.note ? 'IMPORTANT: ' + plan.note : '',
    '',
    `Write these articles (each = THREE files in ${ART}/):`,
    list,
    '',
    'For EACH article write exactly three files:',
    `  1) ${ART}/<fileBase>.ts      — metadata module, using this exact skeleton (replace ALL_CAPS placeholders; keep the ?raw imports and "export default article"):`,
    '',
    ARTICLE_TS_SKELETON.split('\n').map((l) => '       ' + l).join('\n'),
    '',
    `  2) ${ART}/<fileBase>.en.md   — the English body (Markdown, no H1, use ## sections).`,
    `  3) ${ART}/<fileBase>.zh.md   — the Simplified Chinese body (fluent, native; same structure).`,
    '',
    'Each body should be a genuinely useful article: ~250-500 words, concrete steps, at least one fenced code block or example where relevant, and cross-links to related articles using the CONTENT MAP routes. ' + TS_RULES,
    '',
    'Use the Write tool to create every file at its absolute path. Then return the manifest (every absolute path you wrote).',
  ].filter(Boolean).join('\n')
}

// ---------------------------------------------------------------------------
// COMPOSITIONS — one agent per category explainer.
// ---------------------------------------------------------------------------
const COMPOSITION_PLAN = [
  { id: 'vault', file: 'VaultExplainer.tsx', comp: 'VaultExplainer', concept: 'A local Markdown vault: a finder/file-tree of .md files on disk, then an editor window where a couple of Markdown lines type in. Tagline idea: "Plain files. Your folder. No lock-in." ~13s.' },
  { id: 'sync', file: 'SyncExplainer.tsx', comp: 'SyncExplainer', concept: 'Binding a local vault to a cloud workspace and two-way push/pull sync. Two cards (Local vault / Cloud workspace) with an animated connector and push/pull labels; maybe a small conflict-resolved checkmark. ~13s.' },
  { id: 'kanban', file: 'KanbanExplainer.tsx', comp: 'KanbanExplainer', concept: 'A kanban board with three columns (To do / Doing / Done) and cards; one card animates moving from To do to Doing. ~14s.' },
  { id: 'publish', file: 'PublishExplainer.tsx', comp: 'PublishExplainer', concept: 'A note with frontmatter "publish: true" becomes a clean public site in a browser frame at /u/yourname. Show the frontmatter then the rendered page. ~13s.' },
  { id: 'ai', file: 'AiExplainer.tsx', comp: 'AiExplainer', concept: 'An AI assistant calling MCP tools against JType: a terminal/chat panel with lines like search_notes(...), create_note(...), create_card(...) appearing, then "done — your vault updated". ~14s.' },
  { id: 'cli', file: 'CliExplainer.tsx', comp: 'CliExplainer', concept: 'The jtype CLI in a terminal: prompt lines typing jtype login, jtype note create "ideas/today.md", jtype bind --workspace launch, jtype sync — with brief success output. Monospace. ~14s.' },
]

function compositionPrompt(c) {
  return [
    `You are authoring ONE Remotion explainer composition for the JType help center: ${c.comp} (videoId "${c.id}").`,
    '',
    'This is rendered in-browser via @remotion/player (no MP4 render). Remotion 4.0.x, React 19.',
    '',
    `MUST READ FIRST and MIRROR the structure/quality of the reference composition: ${COMP}/JTypeIntro.tsx`,
    `Also available to import: theme at ${FE}/remotion/theme.ts (exports: brand {teal,tealLight,tealDark,soft,ink,inkSoft,paper,amber,amberDeep,gray,line,white}, FONT, MONO, VIDEO {width:1280,height:720,fps:30}, GRID_BG) and primitives at ${FE}/remotion/primitives.tsx (Backdrop, FadeInUp, PopIn, Typewriter, Caret, Wordmark, Card, Chip, WindowFrame, Connector).`,
    '',
    `Concept: ${c.concept}`,
    '',
    'HARD RULES (Remotion):',
    '- Drive ALL motion with useCurrentFrame()/interpolate()/spring()/Sequence. NO CSS transitions or animations, NO Tailwind animation classes.',
    '- Deterministic only: never call Math.random() or Date.now() or new Date() in render.',
    '- Use fps-relative timing (read useVideoConfig().fps or the VIDEO.fps constant). Canvas 1280x720 at 30fps.',
    '- Reuse the theme + primitives; match the calm brand look (teal #008884 on soft paper). Keep text large (>= 22px) since it scales down in the player.',
    '',
    `Write ONE file: ${COMP}/${c.file}. It must export a React component ${c.comp} AND a named const "composition" of this exact shape:`,
    '',
    "    import type { CompositionDescriptor } from '../index'",
    '    export const composition: CompositionDescriptor = {',
    `      id: '${c.id}',`,
    `      component: ${c.comp},`,
    '      durationInFrames: <total frames, e.g. Math.round(13 * 30)>,',
    '      fps: 30,',
    '      width: 1280,',
    '      height: 720,',
    `      label: '<short label>',`,
    '    }',
    '',
    TS_RULES,
    ' The component takes no props. Use the Write tool to create the file, then return the manifest.',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// CASES — one agent per case: writes the case module (.ts + .en.md + .zh.md)
// AND a real, openable example vault folder under examples/.
// ---------------------------------------------------------------------------
const CASE_TS_SKELETON = [
  "import type { CaseMeta } from '../types'",
  "import en from './SLUG.en.md?raw'",
  "import zh from './SLUG.zh.md?raw'",
  '',
  'const study: CaseMeta = {',
  "  slug: 'SLUG',",
  '  order: ORDER,',
  "  accent: 'ACCENT_HEX',",
  "  videoId: 'VIDEO_ID',",
  "  vaultPath: 'VAULT_PATH',",
  '  title: { en: ENGLISH_TITLE, zh: CHINESE_TITLE },',
  '  tagline: { en: ENGLISH_TAGLINE, zh: CHINESE_TAGLINE },',
  '  persona: { en: ENGLISH_PERSONA, zh: CHINESE_PERSONA },',
  '  body: { en, zh },',
  '}',
  '',
  'export default study',
].join('\n')

const CASE_PLAN = [
  {
    slug: 'engineering-team',
    order: 1,
    accent: '#6366f1',
    videoId: 'kanban',
    persona: { en: 'Engineering team', zh: '工程团队' },
    vault: 'examples/eng-team-vault',
    sources: ['internal-docs/ai-integration/demo/transcript.md', 'README.md'],
    concept: 'A 6-person engineering team runs its weekly notes + a Launch kanban board in one JType workspace, and lets an AI assistant triage the board over MCP. The case should walk: the problem (scattered docs + tickets), the vault layout, the Launch board, an AI/MCP triage flow that mirrors the REAL transcript (list_workspaces -> search_notes -> create_note for a meeting summary -> create_card "Draft launch plan" on the Launch board), and the outcome. Quote a couple of real tool calls.',
    vaultFiles: 'Create a believable vault: README.md (explains the vault + the Launch board columns To do/Doing/Done), roadmap.md (Q3 roadmap with a few items and publish:false frontmatter), meetings/2026-06-10-standup.md, meetings/2026-06-14-ai-kickoff.md, daily/2026-06-14.md, projects/launch.md. Real Markdown an engineer would write.',
  },
  {
    slug: 'personal-kb',
    order: 2,
    accent: '#0ea5a2',
    videoId: 'vault',
    persona: { en: 'Knowledge worker', zh: '知识工作者' },
    vault: 'examples/personal-kb-vault',
    sources: ['README.md', 'internal-docs/ai-integration/03-cli-local-first.md'],
    concept: 'One person builds a personal knowledge base entirely local-first: fast capture (including from the terminal with jtype note create), daily notes, linking notes together, a map-of-content, and optionally publishing a weekly digest. Walk capture -> link -> review -> (optional) publish. Show a couple of jtype CLI capture commands.',
    vaultFiles: 'Create: README.md, inbox.md (quick captures), daily/2026-06-14.md, notes/spaced-repetition.md and notes/second-brain.md (link to each other with normal Markdown links), moc/reading.md (a map of content linking the notes). Natural personal notes.',
  },
  {
    slug: 'docs-site',
    order: 3,
    accent: '#10b981',
    videoId: 'publish',
    persona: { en: 'Small team', zh: '小团队' },
    vault: 'examples/team-docs-site-vault',
    sources: ['README.md', 'internal-docs/site-publish'],
    concept: 'A small team ships its product docs as a public site straight from a vault: author Markdown, mark pages publish:true, get a /u/:username site, and put it on a custom domain. Walk author -> publish:true -> site -> custom domain. Emphasize the source stays Markdown in the vault.',
    vaultFiles: 'Create: README.md, index.md (frontmatter publish:true, title), docs/getting-started.md (publish:true), docs/faq.md (publish:true), changelog.md (publish:true), drafts/internal-notes.md (publish:false to show what stays private). Real product-docs content.',
  },
]

function casePrompt(c) {
  return [
    `You are authoring ONE case-study POC for the JType help center: "${c.slug}".`,
    '',
    FACTS,
    '',
    `READ THESE REPO FILES FIRST for accuracy (base ${ROOT}/): ${c.sources.join(', ')}.`,
    '',
    'PART A — the case module (three files):',
    `  1) ${CASES}/${c.slug}.ts  using this EXACT skeleton (replace ALL_CAPS placeholders):`,
    '',
    CASE_TS_SKELETON.split('\n').map((l) => '       ' + l).join('\n'),
    '',
    `     Fill: slug "${c.slug}", order ${c.order}, accent '${c.accent}', videoId '${c.videoId}', vaultPath '${c.vault}', persona en="${c.persona.en}" zh="${c.persona.zh}". Write a strong title + tagline in both locales.`,
    `  2) ${CASES}/${c.slug}.en.md  — the English case body (Markdown, no H1, ## sections). ~450-750 words.`,
    `  3) ${CASES}/${c.slug}.zh.md  — the Simplified Chinese case body (fluent native; same structure).`,
    `     Case concept: ${c.concept}`,
    '     Structure the body as: the situation/problem, the vault layout (show the file tree in a code block), the JType workflow used (with real commands / tool calls), and the outcome. Reference that the example vault ships in the repo.',
    '',
    'PART B — the real example vault (so users can open it in JType):',
    `  Create real Markdown files under ${ROOT}/${c.vault}/ . ${c.vaultFiles}`,
    '  Use realistic content and correct JType conventions (YAML frontmatter with publish: true/false where relevant). These are real files, author them well.',
    '',
    TS_RULES,
    ' Use the Write tool for every file (absolute paths). Then return the manifest with every path you wrote.',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Fan out. No hard dependencies between groups, so run them all concurrently
// with explicit phase tags for a readable progress tree.
// ---------------------------------------------------------------------------
log(`Authoring ${ARTICLE_PLAN.reduce((n, p) => n + p.articles.length, 0)} articles, ${COMPOSITION_PLAN.length} compositions, ${CASE_PLAN.length} cases`)

const thunks = [
  ...COMPOSITION_PLAN.map((c) => () =>
    agent(compositionPrompt(c), { label: `comp:${c.id}`, phase: 'Compositions', schema: MANIFEST_SCHEMA }),
  ),
  ...ARTICLE_PLAN.map((p) => () =>
    agent(articlePrompt(p), { label: `articles:${p.categoryId}`, phase: 'Articles', schema: MANIFEST_SCHEMA }),
  ),
  ...CASE_PLAN.map((c) => () =>
    agent(casePrompt(c), { label: `case:${c.slug}`, phase: 'Cases', schema: MANIFEST_SCHEMA }),
  ),
]

const results = await parallel(thunks)
const ok = results.filter(Boolean)
const files = ok.flatMap((r) => r.writtenFiles || [])

log(`Done: ${ok.length}/${thunks.length} agents succeeded, ${files.length} files written`)

return {
  agents: { total: thunks.length, succeeded: ok.length },
  fileCount: files.length,
  files,
  summaries: ok.map((r) => r.summary),
}
