import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronRightIcon, FolderOpenIcon } from '@heroicons/react/24/outline'
import { Trans } from '@lingui/react/macro'
import { cases, getCase, caseHref } from '../content'
import { Markdown } from '../components/Markdown'
import { HelpVideo } from '../components/HelpVideo'
import { useDocLocale } from '../i18n'

export function CaseStudy() {
  const { slug } = useParams()
  const dl = useDocLocale()
  const item = slug ? getCase(slug) : undefined

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [slug])

  if (!item) return <Navigate to="/help/cases" replace />

  const others = cases.filter((c) => c.slug !== item.slug).slice(0, 2)

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1.5 pt-6 text-sm text-[#6b7773]">
        <Link to="/help" className="hover:text-brand-dark">
          <Trans>Help</Trans>
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <Link to="/help/cases" className="hover:text-brand-dark">
          <Trans>Case studies</Trans>
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-[#0d0d0c]">{dl.t(item.title)}</span>
      </nav>

      <header className="pt-6">
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
          style={{ background: item.accent }}
        >
          {dl.t(item.persona)}
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0d0d0c] sm:text-4xl">
          {dl.t(item.title)}
        </h1>
        <p className="mt-3 text-lg leading-8 text-[#4b5753]">{dl.t(item.tagline)}</p>
      </header>

      {item.videoId ? (
        <div className="pt-8">
          <HelpVideo videoId={item.videoId} />
        </div>
      ) : null}

      <Markdown content={dl.t(item.body)} className="mt-10" />

      {/* Try it yourself */}
      <div className="mt-12 flex items-start gap-4 rounded-2xl border border-brand/20 bg-brand-soft/50 p-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
          <FolderOpenIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#0d0d0c]">
            <Trans>Try it yourself</Trans>
          </p>
          <p className="mt-1 text-sm text-[#4b5753]">
            <Trans>
              Open the example vault in JType and follow along. It lives in the repo at:
            </Trans>
          </p>
          <code className="mt-2 inline-block rounded-md bg-white px-2 py-1 text-xs font-semibold text-brand-dark">
            {item.vaultPath}
          </code>
        </div>
      </div>

      {others.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-lg font-semibold text-[#0d0d0c]">
            <Trans>More case studies</Trans>
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {others.map((c) => (
              <Link
                key={c.slug}
                to={caseHref(c)}
                className="rounded-xl border border-black/[0.06] bg-white/70 p-4 transition hover:border-brand/25 hover:bg-white"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-[#8a978f]">{dl.t(c.persona)}</span>
                <span className="mt-1 block text-sm font-semibold text-[#0d0d0c]">{dl.t(c.title)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
