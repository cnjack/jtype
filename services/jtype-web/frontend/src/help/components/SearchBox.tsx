// Client-side help search. Fuzzy-matches the flat content index across both
// locales and shows a results dropdown linking to articles + cases.

import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { fuzzyMatch } from '@shared/lib'
import { searchIndex } from '../content'
import { useDocLocale } from '../i18n'
import type { SearchRecord } from '../content/types'

export function SearchBox({
  variant = 'bar',
  autoFocus = false,
}: {
  variant?: 'bar' | 'hero'
  autoFocus?: boolean
}) {
  const dl = useDocLocale()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const blurTimer = useRef<number | null>(null)

  const results = useMemo<SearchRecord[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return searchIndex
      .filter((r) => {
        const hay = [r.title.en, r.title.zh, r.summary.en, r.summary.zh, r.context.en, r.context.zh]
          .join(' ')
          .toLowerCase()
        return fuzzyMatch(hay, q)
      })
      .slice(0, 8)
  }, [query])

  function go(href: string) {
    setOpen(false)
    setQuery('')
    navigate(href)
  }

  const hero = variant === 'hero'

  return (
    <div className={`relative ${hero ? 'mx-auto w-full max-w-xl' : 'w-full max-w-sm'}`}>
      <div
        className={`flex items-center gap-2 rounded-xl border bg-white/90 px-3 backdrop-blur transition ${
          hero
            ? 'h-12 border-black/[0.08] shadow-sm shadow-emerald-950/5'
            : 'h-9 border-black/[0.06]'
        } focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10`}
      >
        <MagnifyingGlassIcon className={`${hero ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 text-[#8a978f]`} />
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 120)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) go(results[0].href)
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder={t`Search the help center…`}
          className={`w-full bg-transparent text-[#0d0d0c] placeholder:text-[#9aa6a0] focus:outline-none ${hero ? 'text-base' : 'text-sm'}`}
        />
      </div>

      {open && query.trim() ? (
        <div
          className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-xl shadow-emerald-950/10"
          onMouseDown={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current)
          }}
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[#6b7773]">
              <Trans>No results. Try another term.</Trans>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r) => (
                <li key={r.href}>
                  <button
                    type="button"
                    onClick={() => go(r.href)}
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition hover:bg-brand-soft"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#0d0d0c]">{dl.t(r.title)}</span>
                      <span className="rounded-full bg-[#eef2f0] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6f817a]">
                        {dl.t(r.context)}
                      </span>
                    </span>
                    <span className="line-clamp-1 text-xs text-[#6b7773]">{dl.t(r.summary)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
