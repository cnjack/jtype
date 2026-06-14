import { Link } from 'react-router-dom'
import { ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { Trans } from '@lingui/react/macro'
import { categoriesByOrder, cases, articleHref, caseHref, getArticlesByCategory } from '../content'
import { CategoryIcon } from '../components/icons'
import { HelpVideo } from '../components/HelpVideo'
import { SearchBox } from '../components/SearchBox'
import { useDocLocale } from '../i18n'

export function HelpHome() {
  const dl = useDocLocale()
  // Featured = the first article of each category, capped.
  const featured = categoriesByOrder
    .map((c) => getArticlesByCategory(c.id)[0])
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .slice(0, 6)

  return (
    <main>
      {/* Hero */}
      {/* No overflow-hidden here: it would clip the SearchBox results dropdown,
          which is absolutely positioned and extends below the section. The
          gradient below is inset-0 so it stays within bounds without clipping. */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(0,136,132,0.12),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(251,191,36,0.12),transparent_28%)]" />
        <div className="mx-auto max-w-3xl px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark shadow-sm backdrop-blur">
            <SparklesIcon className="h-4 w-4" />
            <Trans>Help center</Trans>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[#0d0d0c] sm:text-5xl">
            <Trans>How can we help?</Trans>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#4b5753]">
            <Trans>
              Everything you need to write in a local-first vault, sync to the cloud, run a kanban
              board, publish a site, and connect AI.
            </Trans>
          </p>
          <div className="mt-7">
            <SearchBox variant="hero" />
          </div>
        </div>
      </section>

      {/* Intro video */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <HelpVideo
          videoId="intro"
          caption={dl.locale === 'zh' ? '90 秒了解 JType 的工作方式' : 'See how JType works in 90 seconds'}
        />
      </section>

      {/* Category grid */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 className="text-xl font-semibold text-[#0d0d0c]">
          <Trans>Browse by topic</Trans>
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoriesByOrder.map((c) => {
            const count = getArticlesByCategory(c.id).length
            return (
              <Link
                key={c.id}
                to={`/help/c/${c.id}`}
                className="group flex flex-col rounded-2xl border border-black/[0.06] bg-white/80 p-5 shadow-sm shadow-emerald-950/5 transition hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-md"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${c.accent}, ${c.accent}cc)` }}
                >
                  <CategoryIcon name={c.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-[#0d0d0c]">{dl.t(c.title)}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-6 text-[#5f6d68]">{dl.t(c.summary)}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-dark">
                  {count > 0 ? (
                    <Trans>{count} articles</Trans>
                  ) : (
                    <Trans>Explore</Trans>
                  )}
                  <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Featured articles */}
      {featured.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
          <h2 className="text-xl font-semibold text-[#0d0d0c]">
            <Trans>Popular articles</Trans>
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {featured.map((a) => (
              <Link
                key={`${a.categoryId}/${a.id}`}
                to={articleHref(a)}
                className="group flex items-start gap-3 rounded-xl border border-black/[0.06] bg-white/70 p-4 transition hover:border-brand/25 hover:bg-white"
              >
                <span className="mt-0.5 text-brand">
                  <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#0d0d0c]">{dl.t(a.title)}</span>
                  <span className="mt-0.5 block text-sm text-[#5f6d68]">{dl.t(a.summary)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Case studies */}
      {cases.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold text-[#0d0d0c]">
              <Trans>See it in action</Trans>
            </h2>
            <Link to="/help/cases" className="text-sm font-semibold text-brand-dark hover:underline">
              <Trans>All case studies</Trans>
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {cases.map((c) => (
              <Link
                key={c.slug}
                to={caseHref(c)}
                className="group overflow-hidden rounded-2xl border border-black/[0.06] bg-white/80 shadow-sm shadow-emerald-950/5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="h-1.5" style={{ background: c.accent }} />
                <div className="p-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#8a978f]">
                    {dl.t(c.persona)}
                  </span>
                  <h3 className="mt-1.5 text-base font-semibold text-[#0d0d0c]">{dl.t(c.title)}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#5f6d68]">{dl.t(c.tagline)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="h-10" />
    </main>
  )
}
