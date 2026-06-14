import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronRightIcon, HandThumbDownIcon, HandThumbUpIcon } from '@heroicons/react/24/outline'
import { Trans } from '@lingui/react/macro'
import { getCategory, getArticlesByCategory, getArticle, articleHref } from '../content'
import { Markdown, type Heading } from '../components/Markdown'
import { useDocLocale } from '../i18n'

export function Article() {
  const { categoryId, articleId } = useParams()
  const dl = useDocLocale()
  const [headings, setHeadings] = useState<Heading[]>([])
  const [vote, setVote] = useState<'up' | 'down' | null>(null)

  const category = getCategory(categoryId)
  const article = categoryId && articleId ? getArticle(categoryId, articleId) : undefined

  const onHeadings = useCallback((h: Heading[]) => setHeadings(h), [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    setVote(null)
  }, [categoryId, articleId])

  if (!category || !article) return <Navigate to="/help" replace />

  const siblings = getArticlesByCategory(category.id)
  const index = siblings.findIndex((a) => a.id === article.id)
  const prev = index > 0 ? siblings[index - 1] : undefined
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1.5 pt-6 text-sm text-[#6b7773]">
        <Link to="/help" className="hover:text-brand-dark">
          <Trans>Help</Trans>
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <Link to={`/help/c/${category.id}`} className="hover:text-brand-dark">
          {dl.t(category.title)}
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-[#0d0d0c]">{dl.t(article.title)}</span>
      </nav>

      <div className="grid gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <article className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0d0d0c] sm:text-4xl">
            {dl.t(article.title)}
          </h1>
          <p className="mt-2 text-sm text-[#8a978f]">
            <Trans>Last updated {article.updated}</Trans>
          </p>

          <Markdown content={dl.t(article.body)} className="mt-8" onHeadings={onHeadings} />

          {/* Was this helpful */}
          <div className="mt-12 rounded-2xl border border-black/[0.06] bg-white/70 p-5">
            {vote ? (
              <p className="text-sm font-medium text-brand-dark">
                <Trans>Thanks for the feedback!</Trans>
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-[#0d0d0c]">
                  <Trans>Was this helpful?</Trans>
                </span>
                <button
                  type="button"
                  onClick={() => setVote('up')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-sm font-medium text-[#4b5753] transition hover:border-brand/30 hover:text-brand-dark"
                >
                  <HandThumbUpIcon className="h-4 w-4" />
                  <Trans>Yes</Trans>
                </button>
                <button
                  type="button"
                  onClick={() => setVote('down')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-sm font-medium text-[#4b5753] transition hover:border-brand/30 hover:text-brand-dark"
                >
                  <HandThumbDownIcon className="h-4 w-4" />
                  <Trans>No</Trans>
                </button>
              </div>
            )}
          </div>

          {/* Prev / next */}
          {(prev || next) && (
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {prev ? (
                <Link
                  to={articleHref(prev)}
                  className="rounded-xl border border-black/[0.06] bg-white/70 p-4 transition hover:border-brand/25 hover:bg-white"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#8a978f]">
                    <Trans>Previous</Trans>
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[#0d0d0c]">{dl.t(prev.title)}</span>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link
                  to={articleHref(next)}
                  className="rounded-xl border border-black/[0.06] bg-white/70 p-4 text-right transition hover:border-brand/25 hover:bg-white"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#8a978f]">
                    <Trans>Next</Trans>
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[#0d0d0c]">{dl.t(next.title)}</span>
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </article>

        {/* On this page */}
        <aside className="hidden lg:block">
          {headings.length > 0 ? (
            <div className="sticky top-32">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a978f]">
                <Trans>On this page</Trans>
              </p>
              <ul className="mt-3 space-y-1.5 border-l border-black/[0.08]">
                {headings.map((h) => (
                  <li key={h.id} style={{ paddingLeft: h.level === 3 ? 24 : 12 }}>
                    <a
                      href={`#${h.id}`}
                      className="-ml-px block border-l-2 border-transparent pl-3 text-sm text-[#6b7773] transition hover:border-brand hover:text-brand-dark"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  )
}
