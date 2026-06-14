import { Link } from 'react-router-dom'
import { ArrowRightIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Trans } from '@lingui/react/macro'
import { cases, caseHref } from '../content'
import { useDocLocale } from '../i18n'

export function CasesIndex() {
  const dl = useDocLocale()

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6">
      <nav className="flex items-center gap-1.5 pt-6 text-sm text-[#6b7773]">
        <Link to="/help" className="hover:text-brand-dark">
          <Trans>Help</Trans>
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-[#0d0d0c]">
          <Trans>Case studies</Trans>
        </span>
      </nav>

      <header className="pt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[#0d0d0c] sm:text-4xl">
          <Trans>Case studies</Trans>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#4b5753]">
          <Trans>
            Real, end-to-end scenarios you can reproduce. Each one ships with an example vault you
            can open in JType.
          </Trans>
        </p>
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {cases.map((c) => (
          <Link
            key={c.slug}
            to={caseHref(c)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white/80 shadow-sm shadow-emerald-950/5 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="h-1.5" style={{ background: c.accent }} />
            <div className="flex flex-1 flex-col p-5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8a978f]">{dl.t(c.persona)}</span>
              <h2 className="mt-1.5 text-lg font-semibold text-[#0d0d0c]">{dl.t(c.title)}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-[#5f6d68]">{dl.t(c.tagline)}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-dark">
                <Trans>Read case study</Trans>
                <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {cases.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-black/[0.1] bg-white/50 p-6 text-sm text-[#6b7773]">
          <Trans>Case studies are coming soon.</Trans>
        </p>
      ) : null}
    </main>
  )
}
