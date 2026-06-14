// Shell for the whole /help section: brand bar, the category "landing" tabs
// across the top, global search, a language popover, and a footer. Pages render
// into <Outlet/>.

import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import {
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  GlobeAltIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher'
import { useAuth } from '../components/AuthContext'
import { categoriesByOrder } from './content'
import { CategoryIcon } from './components/icons'
import { SearchBox } from './components/SearchBox'
import { useDocLocale } from './i18n'

function Wordmark() {
  return (
    <Link
      to="/help"
      className="select-none rounded-lg px-1.5 py-1 transition hover:bg-[#e8f6f2]"
      style={{ fontFamily: "'Arial Black', 'Segoe UI', Arial, sans-serif", fontSize: 17, fontWeight: 900 }}
      aria-label="JType Help"
    >
      <span className="text-[#8d939d]">[</span>
      <span className="text-brand">J</span>
      <span className="text-[#0d0d0c]">TYPE</span>
      <span className="text-[#8d939d]">]</span>
      <span className="ml-1.5 align-middle text-xs font-semibold uppercase tracking-wide text-[#9aa6a0]">
        <Trans>Help</Trans>
      </span>
    </Link>
  )
}

export function HelpLayout() {
  const dl = useDocLocale()
  const { user } = useAuth()
  const [mobileNav, setMobileNav] = useState(false)

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-soft text-brand-dark' : 'text-[#5f6d68] hover:bg-[#e8f6f2] hover:text-brand-dark'
    }`

  return (
    <div className="min-h-screen bg-[#f5f8f6] text-[#0d0d0c]">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Wordmark />
          <div className="ml-auto hidden flex-1 justify-center px-4 md:flex">
            <SearchBox variant="bar" />
          </div>
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Popover className="relative">
              <PopoverButton
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.06] bg-white/80 text-[#4b5753] transition hover:border-brand/30 hover:text-brand-dark"
                title={t`Language`}
                aria-label={t`Language`}
              >
                <GlobeAltIcon className="h-4 w-4" />
              </PopoverButton>
              <PopoverPanel className="absolute right-0 z-40 mt-2 w-44 rounded-xl border border-black/[0.08] bg-white p-1.5 shadow-xl shadow-emerald-950/10">
                <LanguageSwitcher variant="inline" />
              </PopoverPanel>
            </Popover>
            <Link
              to={user ? '/workspaces' : '/'}
              className="hidden h-9 items-center gap-1.5 rounded-lg border border-brand/20 bg-[#e8f6f2] px-3 text-sm font-semibold text-brand-dark transition hover:bg-white sm:inline-flex"
            >
              {user ? <Trans>Open app</Trans> : <Trans>Open JType</Trans>}
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </Link>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.06] bg-white/80 text-[#4b5753] md:hidden"
              onClick={() => setMobileNav((v) => !v)}
              aria-label={t`Menu`}
            >
              {mobileNav ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <nav className="mx-auto hidden max-w-7xl items-center gap-1 overflow-x-auto px-4 pb-2 sm:px-6 md:flex">
          {categoriesByOrder.map((c) => (
            <NavLink key={c.id} to={`/help/c/${c.id}`} className={tabClass}>
              <CategoryIcon name={c.icon} className="h-4 w-4" />
              {dl.t(c.title)}
            </NavLink>
          ))}
          <NavLink to="/help/cases" className={tabClass}>
            <Trans>Case studies</Trans>
          </NavLink>
        </nav>

        {/* Mobile sheet */}
        {mobileNav ? (
          <div className="border-t border-black/[0.06] bg-white px-4 py-3 md:hidden">
            <Link
              to={user ? '/workspaces' : '/'}
              onClick={() => setMobileNav(false)}
              className="mb-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-brand/20 bg-[#e8f6f2] px-3 text-sm font-semibold text-brand-dark transition hover:bg-white"
            >
              {user ? <Trans>Open app</Trans> : <Trans>Open JType</Trans>}
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </Link>
            <div className="mb-3">
              <SearchBox variant="bar" />
            </div>
            <div className="grid gap-1">
              {categoriesByOrder.map((c) => (
                <NavLink
                  key={c.id}
                  to={`/help/c/${c.id}`}
                  className={tabClass}
                  onClick={() => setMobileNav(false)}
                >
                  <CategoryIcon name={c.icon} className="h-4 w-4" />
                  {dl.t(c.title)}
                </NavLink>
              ))}
              <NavLink to="/help/cases" className={tabClass} onClick={() => setMobileNav(false)}>
                <Trans>Case studies</Trans>
              </NavLink>
            </div>
          </div>
        ) : null}
      </header>

      <Outlet />

      <footer className="mt-20 border-t border-black/[0.06] bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-sm text-[#5f6d68]">
              <Trans>Local-first Markdown vault editing with cloud sync, kanban, publishing, and AI.</Trans>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            {categoriesByOrder.slice(0, 6).map((c) => (
              <Link key={c.id} to={`/help/c/${c.id}`} className="text-[#5f6d68] transition hover:text-brand-dark">
                {dl.t(c.title)}
              </Link>
            ))}
            <a
              href="https://github.com/cnjack/jtype"
              target="_blank"
              rel="noreferrer"
              className="text-[#5f6d68] transition hover:text-brand-dark"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
