// Reusable, deterministic Remotion primitives for the help explainers.
// No CSS transitions/animations and no Math.random/Date.now — all motion is
// driven by useCurrentFrame()/interpolate()/spring() so it renders identically.

import type { CSSProperties, ReactNode } from 'react'
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { brand, FONT, GRID_BG, MONO } from './theme'

const EASE = Easing.bezier(0.16, 1, 0.3, 1)

/** Full-bleed branded backdrop with a soft grid + glow. */
export function Backdrop({ children }: { children?: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: GRID_BG, fontFamily: FONT, color: brand.ink }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(13,13,12,0.035) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(13,13,12,0.035) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at 50% 42%, black, transparent 78%)',
        }}
      />
      {children}
    </AbsoluteFill>
  )
}

/** Fade + rise in. `delay`/`duration` are in frames. */
export function FadeInUp({
  children,
  delay = 0,
  duration = 18,
  y = 22,
  style,
}: {
  children: ReactNode
  delay?: number
  duration?: number
  y?: number
  style?: CSSProperties
}) {
  const frame = useCurrentFrame()
  const p = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE,
  })
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * y}px)`, ...style }}>
      {children}
    </div>
  )
}

/** Spring-scale pop-in (good for badges/cards). */
export function PopIn({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode
  delay?: number
  style?: CSSProperties
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } })
  return (
    <div style={{ transform: `scale(${interpolate(s, [0, 1], [0.86, 1])})`, opacity: interpolate(s, [0, 1], [0, 1]), ...style }}>
      {children}
    </div>
  )
}

/** Reveals `text` character-by-character between `delay` and `delay+duration`. */
export function Typewriter({
  text,
  delay = 0,
  duration = 40,
  style,
  caret = true,
}: {
  text: string
  delay?: number
  duration?: number
  style?: CSSProperties
  caret?: boolean
}) {
  const frame = useCurrentFrame()
  const shown = Math.round(
    interpolate(frame, [delay, delay + duration], [0, text.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  )
  const done = shown >= text.length
  return (
    <span style={style}>
      {text.slice(0, shown)}
      {caret && !done ? <Caret /> : null}
    </span>
  )
}

/** Blinking block caret (2/3-second cycle). */
export function Caret() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const on = Math.floor((frame / fps) * 3) % 2 === 0
  return (
    <span
      style={{
        display: 'inline-block',
        width: '0.55em',
        height: '1.05em',
        marginLeft: 2,
        transform: 'translateY(0.15em)',
        background: brand.teal,
        opacity: on ? 1 : 0,
      }}
    />
  )
}

/** The bracketed [JTYPE] wordmark. */
export function Wordmark({ size = 44 }: { size?: number }) {
  return (
    <div style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: size, letterSpacing: 0.5 }}>
      <span style={{ color: '#8d939d' }}>[</span>
      <span style={{ color: brand.teal }}>J</span>
      <span style={{ color: brand.ink }}>TYPE</span>
      <span style={{ color: '#8d939d' }}>]</span>
    </div>
  )
}

/** A floating white "surface" card with the product's soft shadow. */
export function Card({
  children,
  style,
}: {
  children?: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        background: brand.white,
        border: `1px solid ${brand.line}`,
        borderRadius: 18,
        boxShadow: '0 26px 60px -28px rgba(0,71,68,0.45)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** A small pill/badge. */
export function Chip({
  children,
  tone = 'teal',
  style,
}: {
  children: ReactNode
  tone?: 'teal' | 'amber' | 'gray'
  style?: CSSProperties
}) {
  const map = {
    teal: { bg: brand.soft, fg: brand.tealDark },
    amber: { bg: '#fef3c7', fg: brand.amberDeep },
    gray: { bg: '#eef2f0', fg: brand.gray },
  } as const
  const c = map[tone]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        fontSize: 22,
        fontWeight: 700,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/** A mock editor/app window chrome (three dots + optional title). */
export function WindowFrame({
  title,
  children,
  style,
}: {
  title?: string
  children?: ReactNode
  style?: CSSProperties
}) {
  return (
    <Card style={{ overflow: 'hidden', ...style }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 18px',
          borderBottom: `1px solid ${brand.line}`,
          background: 'rgba(255,255,255,0.7)',
        }}
      >
        <Dot color="#ff5f57" />
        <Dot color="#febc2e" />
        <Dot color="#28c840" />
        {title ? (
          <span style={{ marginLeft: 10, fontSize: 18, fontWeight: 600, color: brand.gray, fontFamily: MONO }}>
            {title}
          </span>
        ) : null}
      </div>
      <div>{children}</div>
    </Card>
  )
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 13, height: 13, borderRadius: 999, background: color, display: 'inline-block' }} />
}

/** Animated draw-on connector line; `progress` 0..1. */
export function Connector({ progress, style }: { progress: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        height: 3,
        borderRadius: 3,
        background: `linear-gradient(90deg, ${brand.teal}, ${brand.tealLight})`,
        transformOrigin: 'left center',
        transform: `scaleX(${Math.max(0, Math.min(1, progress))})`,
        ...style,
      }}
    />
  )
}

export { EASE }
