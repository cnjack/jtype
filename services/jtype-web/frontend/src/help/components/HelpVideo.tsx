// Inline Remotion explainer player.
//
// The heavy `@remotion/player` runtime is only fetched when the viewer presses
// play — until then we show a branded poster. The composition itself is small
// and already part of the (lazy) help chunk.

import { lazy, Suspense, useState } from 'react'
import { PlayIcon } from '@heroicons/react/24/solid'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { getComposition } from '../remotion'

const Player = lazy(() => import('@remotion/player').then((m) => ({ default: m.Player })))

interface HelpVideoProps {
  videoId: string
  /** Poster heading shown before play. */
  title?: string
  /** Poster subline. */
  caption?: string
  className?: string
}

export function HelpVideo({ videoId, title, caption, className = '' }: HelpVideoProps) {
  const [playing, setPlaying] = useState(false)
  const composition = getComposition(videoId)

  if (!composition) return null

  const aspect = `${composition.width} / ${composition.height}`

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm shadow-emerald-950/5 ${className}`}
      style={{ aspectRatio: aspect }}
    >
      {playing ? (
        <Suspense fallback={<PosterShell loading />}>
          <Player
            component={composition.component}
            durationInFrames={composition.durationInFrames}
            fps={composition.fps}
            compositionWidth={composition.width}
            compositionHeight={composition.height}
            style={{ width: '100%', height: '100%' }}
            controls
            autoPlay
            loop
            clickToPlay
            acknowledgeRemotionLicense
          />
        </Suspense>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={t`Play the explainer video`}
          className="group absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_30%_20%,rgba(0,136,132,0.16),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(251,191,36,0.14),transparent_36%),linear-gradient(180deg,#fbfdfb,#eef5f1)] text-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition group-hover:scale-105 group-hover:bg-brand-dark">
            <PlayIcon className="h-7 w-7 translate-x-0.5" />
          </span>
          <span className="px-6">
            <span className="block text-lg font-semibold text-[#0d0d0c]">{title ?? composition.label ?? t`Watch the explainer`}</span>
            {caption ? <span className="mt-1 block text-sm text-[#5f6d68]">{caption}</span> : null}
          </span>
          <span className="absolute bottom-3 right-4 text-xs font-medium uppercase tracking-wide text-[#8a978f]">
            <Trans>Remotion</Trans>
          </span>
        </button>
      )}
    </div>
  )
}

function PosterShell({ loading }: { loading?: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#eef5f1] text-sm text-[#5f6d68]">
      {loading ? <Trans>Loading player…</Trans> : null}
    </div>
  )
}
