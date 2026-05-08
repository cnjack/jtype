import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  BoltIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  GlobeAltIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

const markdownLines = [
  '---',
  'title: Spring release notes',
  'publish: true',
  '---',
  '',
  '# Spring release notes',
  '',
  'A quieter editor, faster preview, and a public site that',
  'stays in sync with the vault on your machine.',
  '',
  '- local-first writing',
  '- cloud workspace sync',
  '- published read-only site',
]

const flowSteps = [
  {
    icon: FolderOpenIcon,
    eyebrow: 'Vault',
    title: 'Write where your files live',
    body: 'Open a local Markdown vault, keep normal folders, and edit without turning notes into remote-only data.',
  },
  {
    icon: CloudArrowUpIcon,
    eyebrow: 'Sync',
    title: 'Bind to a cloud workspace',
    body: 'Push and pull versions, resolve conflicts, and keep collaboration scoped to the workspace you choose.',
  },
  {
    icon: GlobeAltIcon,
    eyebrow: 'Publish',
    title: 'Ship a readable site',
    body: 'Turn selected documents into a public `/u/:username` site while your source stays Markdown.',
  },
]

const surfaces = [
  {
    icon: ComputerDesktopIcon,
    name: 'Desktop app',
    detail: 'Tauri vault editing with write, split, and preview modes.',
  },
  {
    icon: CommandLineIcon,
    name: 'Web dashboard',
    detail: 'Cloud workspace admin, devices, sync, and publishing controls.',
  },
  {
    icon: DocumentTextIcon,
    name: 'Published pages',
    detail: 'Clean read-only output for notes, docs, releases, and guides.',
  },
]

export function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f5f8f6] text-[#0d0d0c]">
      <section className="landing-hero relative isolate min-h-[88svh] overflow-hidden px-4 pb-0 pt-4 sm:px-6 sm:pb-4 lg:px-8">
        <div className="landing-page-grid absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_12%,rgba(0,136,132,0.16),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.14),transparent_24%),linear-gradient(180deg,rgba(251,253,251,0.78),rgba(245,248,246,0.96))]" />

        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between rounded-xl border border-white/80 bg-white/75 px-3 shadow-sm shadow-emerald-950/5 backdrop-blur-xl">
          <Link
            to="/"
            className="select-none rounded-lg px-2 py-1 transition hover:bg-[#e8f6f2]"
            style={{ fontFamily: "'Arial Black', 'Segoe UI', Arial, sans-serif", fontSize: 18, fontWeight: 900, letterSpacing: 0 }}
          >
            <span className="text-[#8d939d]">[</span>
            <span className="text-brand">J</span>
            <span className="text-[#0d0d0c]">TYPE</span>
            <span className="text-[#8d939d]">]</span>
          </Link>
          <div className="hidden items-center gap-1 text-sm font-medium text-[#5f6d68] md:flex">
            <a className="rounded-lg px-3 py-2 transition hover:bg-[#e8f6f2] hover:text-brand-dark" href="#flow">Flow</a>
            <a className="rounded-lg px-3 py-2 transition hover:bg-[#e8f6f2] hover:text-brand-dark" href="#surfaces">Surfaces</a>
            <a className="rounded-lg px-3 py-2 transition hover:bg-[#e8f6f2] hover:text-brand-dark" href="#publish">Publish</a>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/nicepkg/jtype"
              className="hidden h-9 items-center justify-center rounded-lg border border-black/[0.06] bg-white/80 px-3 text-sm font-semibold text-[#4b5753] shadow-sm shadow-emerald-950/5 transition hover:border-brand/30 hover:bg-white hover:text-brand-dark sm:inline-flex"
              title="Open GitHub"
            >
              GitHub
            </a>
            <Link
              to="/login"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand bg-brand px-3 text-sm font-semibold text-white shadow-sm shadow-brand/15 transition hover:border-brand-dark hover:bg-brand-dark"
              title="Sign in"
            >
              Sign in
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto flex max-w-7xl flex-col items-center pt-12 text-center sm:pt-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark shadow-sm shadow-emerald-950/5 backdrop-blur">
            <SparklesIcon className="h-4 w-4" />
            Local-first Markdown vault
          </div>
          <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-tight text-[#0d0d0c] sm:text-6xl lg:text-7xl">
            JType
          </h1>
          <p className="mt-5 max-w-3xl text-balance text-base leading-7 text-[#4b5753] sm:text-lg">
            Calm desktop writing, workspace-scoped sync, and public Markdown publishing in one product flow.
            Your notes stay local until a cloud workspace has a job to do.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-brand bg-brand px-5 text-sm font-semibold text-white shadow-lg shadow-brand/15 transition hover:border-brand-dark hover:bg-brand-dark"
              title="Start with JType Cloud"
            >
              Start writing
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <a
              href="#flow"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-black/[0.06] bg-white/80 px-5 text-sm font-semibold text-[#4b5753] shadow-sm shadow-emerald-950/5 transition hover:border-brand/30 hover:bg-white hover:text-brand-dark"
              title="See product flow"
            >
              Watch the flow
              <BoltIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="relative mx-auto mt-10 max-w-7xl">
          <ProductFilm />
        </div>
      </section>

      <main>
        <section id="flow" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">Product flow</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0d0d0c] sm:text-4xl">
                The landing story follows the real JType loop.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {flowSteps.map(step => (
                <article key={step.title} className="rounded-xl border border-white/80 bg-white/80 p-5 shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.03]">
                  <step.icon className="h-6 w-6 text-brand" />
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7773]">{step.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold text-[#0d0d0c]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5f6d68]">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="surfaces" className="border-y border-black/[0.04] bg-[#fbfdfb] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">Surfaces</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0d0d0c] sm:text-4xl">
                One Markdown source, three calm surfaces.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#5f6d68]">
                The page borrows getdesign.app's strongest move: show the actual system doing the explaining.
                For JType, that means local files, sync state, and published output all visible at once.
              </p>
            </div>
            <div className="grid gap-3">
              {surfaces.map(surface => (
                <article key={surface.name} className="flex items-start gap-4 rounded-xl border border-black/[0.06] bg-white/75 p-4 shadow-sm shadow-emerald-950/5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e8f6f2] text-brand-dark">
                    <surface.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#0d0d0c]">{surface.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#5f6d68]">{surface.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="publish" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 rounded-2xl border border-white/80 bg-white/75 p-6 shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.03] md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">Ready for the cloud layer</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0d0d0c]">
                Start with a private cloud workspace.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f6d68]">
                Create a workspace for sync, publishing, and account settings. Local vault copy stays precise:
                folders are vaults, server-side collaboration is a cloud workspace.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-brand bg-brand px-5 text-sm font-semibold text-white shadow-sm shadow-brand/15 transition hover:border-brand-dark hover:bg-brand-dark"
              title="Go to login"
            >
              Go to JType Cloud
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

function ProductFilm() {
  return (
    <div className="landing-film relative max-h-[390px] overflow-hidden rounded-2xl border border-white/80 bg-[#fbfdfb]/90 p-3 shadow-2xl shadow-emerald-950/12 ring-1 ring-black/[0.04] backdrop-blur-xl sm:max-h-none">
      <div className="flex h-9 items-center justify-between rounded-xl border border-black/[0.04] bg-white/75 px-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand/70" />
        </div>
        <p className="hidden text-xs font-semibold text-[#6b7773] sm:block">vault / field-guide / spring-release.md</p>
        <span className="rounded-full bg-[#d9f2ed] px-2 py-1 text-[11px] font-semibold uppercase text-brand-dark">Synced</span>
      </div>

      <div className="landing-packet landing-packet-one" />
      <div className="landing-packet landing-packet-two" />

      <div className="mt-3 grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)_290px]">
        <aside className="landing-panel min-h-[330px] rounded-xl border border-black/[0.05] bg-[#f7faf8] p-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark">Vault</p>
              <p className="text-[11px] text-[#8a9691]">~/notes/field-guide</p>
            </div>
            <FolderOpenIcon className="h-5 w-5 text-brand" />
          </div>
          <div className="space-y-2">
            {['index.md', 'research/', 'spring-release.md', 'product/roadmap.md', 'public/changelog.md'].map((file, index) => (
              <div
                key={file}
                className={`landing-file-row flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${index === 2 ? 'landing-file-row-active bg-[#e8f6f2] font-semibold text-brand-dark ring-1 ring-brand/15' : 'bg-white/60 text-[#4b5753]'}`}
              >
                <DocumentTextIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{file}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-black/[0.04] bg-white/70 p-3">
            <p className="text-xs font-semibold text-[#0d0d0c]">Local watcher</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf1ef]">
              <div className="landing-progress h-full rounded-full bg-brand" />
            </div>
            <p className="mt-2 text-[11px] text-[#6b7773]">Detected save, queued push.</p>
          </div>
        </aside>

        <section className="landing-panel min-h-[330px] rounded-xl border border-black/[0.05] bg-white/75">
          <div className="flex min-h-12 items-center justify-between border-b border-black/[0.04] px-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-brand-dark shadow-sm">Write</span>
              <span className="rounded-full px-3 py-1 text-[11px] font-semibold text-[#6b7773]">Split</span>
              <span className="rounded-full px-3 py-1 text-[11px] font-semibold text-[#6b7773]">Preview</span>
            </div>
            <span className="rounded-full bg-amber-200 px-2 py-1 text-[11px] font-semibold uppercase text-amber-950">Dirty</span>
          </div>
          <div className="grid min-h-[278px] md:grid-cols-[minmax(0,1fr)_42%]">
            <div className="relative p-4 font-mono text-[12px] leading-5 text-[#27312e]">
              {markdownLines.map((line, index) => (
                <p key={`${line}-${index}`} className="landing-md-line">
                  <span className="mr-4 select-none text-[#9aa6a1]">{String(index + 1).padStart(2, '0')}</span>
                  <span className={line.startsWith('#') ? 'font-semibold text-brand-dark' : ''}>{line || ' '}</span>
                </p>
              ))}
              <span className="landing-cursor absolute left-[118px] top-[146px] h-5 w-px bg-brand" />
            </div>
            <article className="hidden border-l border-black/[0.04] bg-[#f8fbf9] p-5 md:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7773]">Live preview</p>
              <h3 className="mt-5 text-2xl font-bold leading-tight text-[#0d0d0c]">Spring release notes</h3>
              <p className="mt-4 text-sm leading-6 text-[#4b5753]">
                A quieter editor, faster preview, and a public site that stays in sync with the vault on your machine.
              </p>
              <blockquote className="mt-5 border-l-4 border-brand pl-4 text-sm leading-6 text-[#5f6d68]">
                Local by default. Cloud when the team needs it.
              </blockquote>
            </article>
          </div>
        </section>

        <aside className="landing-panel min-h-[330px] rounded-xl border border-black/[0.05] bg-[#f6faf7] p-3">
          <div className="rounded-xl border border-black/[0.04] bg-white/75 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark">Cloud workspace</p>
              <CloudArrowUpIcon className="h-5 w-5 text-brand" />
            </div>
            <div className="mt-4 space-y-3">
              {['version saved', 'device cursor advanced', 'publish check passed'].map((item, index) => (
                <div key={item} className="flex items-center gap-3 text-sm text-[#4b5753]">
                  <CheckCircleIcon className={`h-5 w-5 ${index === 2 ? 'landing-check-pop text-brand' : 'text-brand/70'}`} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-black/[0.04] bg-white">
            <div className="border-b border-black/[0.04] bg-[#fbfdfb] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7773]">Public site</p>
              <p className="mt-1 truncate text-xs text-brand-dark">/u/jack/field-guide</p>
            </div>
            <div className="landing-publish-body p-4">
              <p className="text-lg font-semibold text-[#0d0d0c]">Field guide</p>
              <div className="mt-4 space-y-2">
                <div className="h-2 rounded-full bg-[#d9f2ed]" />
                <div className="h-2 w-10/12 rounded-full bg-[#edf1ef]" />
                <div className="h-2 w-8/12 rounded-full bg-[#edf1ef]" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="h-16 rounded-lg bg-[#e8f6f2]" />
                <div className="h-16 rounded-lg bg-[#fffbeb]" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
