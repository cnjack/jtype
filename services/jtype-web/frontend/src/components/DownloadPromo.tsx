import { useState } from 'react'
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { Trans } from '@lingui/react/macro'
import { useAuth } from './AuthContext'

const DISMISS_KEY = 'jtype.promo.desktop.dismissed'
const RELEASES_URL = 'https://github.com/cnjack/jtype/releases/latest'

type OS = 'mac' | 'windows' | 'linux' | 'other'

function detectOS(): OS {
  const ua = navigator.userAgent
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac'
  if (/Windows/i.test(ua)) return 'windows'
  if (/Linux|X11/i.test(ua)) return 'linux'
  return 'other'
}

/** Synology-style dismissible promo: nudges logged-in web users to the desktop
 *  app + CLI, with the download labelled for their OS. */
export function DownloadPromo() {
  const { user, loading } = useAuth()
  const [closed, setClosed] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  // Only for signed-in web users; the desktop app obviously doesn't need it.
  if (loading || !user || closed || dismissed) return null

  const os = detectOS()
  const osLabel = os === 'mac' ? 'macOS' : os === 'windows' ? 'Windows' : os === 'linux' ? 'Linux' : ''

  function dontShowAgain(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      try {
        localStorage.setItem(DISMISS_KEY, '1')
      } catch {
        /* ignore */
      }
      setDismissed(true)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] w-[360px] max-w-[92vw] rounded-2xl border border-black/[0.08] bg-white p-4 shadow-2xl shadow-stone-900/20">
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label="Close"
        className="absolute -right-2.5 -top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-stone-700 text-white shadow-md hover:bg-stone-800"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f6f2] text-[#008884]">
          <ArrowDownTrayIcon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[#0d0d0c]">
            <Trans>Use JType beyond the browser</Trans>
          </p>
          <p className="mt-0.5 text-sm text-zinc-500">
            <Trans>Get the desktop app — and a jtype CLI for your terminal &amp; AI agents.</Trans>
          </p>
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#008884] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#006f6b]"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {osLabel ? <Trans>Download for {osLabel}</Trans> : <Trans>Download the desktop app</Trans>}
          </a>
        </div>
      </div>
      <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-black/[0.06] pt-2.5 text-xs text-zinc-500">
        <input type="checkbox" onChange={dontShowAgain} className="rounded border-zinc-300" />
        <Trans>Don't show this again</Trans>
      </label>
    </div>
  )
}
