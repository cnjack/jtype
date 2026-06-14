import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRightIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Trans } from '@lingui/react/macro'
import { getCategory, getArticlesByCategory, articleHref } from '../content'
import { CategoryIcon } from '../components/icons'
import { HelpVideo } from '../components/HelpVideo'
import { useDocLocale } from '../i18n'

export function CategoryLanding() {
  const { categoryId } = useParams()
  const dl = useDocLocale()
  const category = getCategory(categoryId)

  if (!category) return <Navigate to="/help" replace />

  const items = getArticlesByCategory(category.id)

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 pt-6 text-sm text-[#6b7773]">
        <Link to="/help" className="hover:text-brand-dark">
          <Trans>Help</Trans>
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-[#0d0d0c]">{dl.t(category.title)}</span>
      </nav>

      {/* Hero */}
      <header className="grid items-center gap-8 pt-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${category.accent}, ${category.accent}cc)` }}
          >
            <CategoryIcon name={category.icon} className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#0d0d0c] sm:text-4xl">
            {dl.t(category.title)}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-[#4b5753]">{dl.t(category.summary)}</p>
        </div>
        {category.videoId ? (
          <HelpVideo videoId={category.videoId} className="w-full" />
        ) : null}
      </header>

      {/* Article list */}
      <section className="pt-12">
        <h2 className="text-lg font-semibold text-[#0d0d0c]">
          <Trans>Articles</Trans>
        </h2>
        {items.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-black/[0.1] bg-white/50 p-6 text-sm text-[#6b7773]">
            <Trans>Articles for this topic are on the way.</Trans>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white/80">
            {items.map((a) => (
              <li key={a.id}>
                <Link
                  to={articleHref(a)}
                  className="group flex items-center gap-4 px-5 py-4 transition hover:bg-brand-soft/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#0d0d0c]">{dl.t(a.title)}</span>
                    <span className="mt-0.5 block truncate text-sm text-[#5f6d68]">{dl.t(a.summary)}</span>
                  </span>
                  <ArrowRightIcon className="h-4 w-4 shrink-0 text-brand transition group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
