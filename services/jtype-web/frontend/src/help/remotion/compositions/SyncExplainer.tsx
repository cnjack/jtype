// "Sync" explainer — binding a local vault to a cloud workspace and the
// two-way push/pull sync between them (~13s). Mirrors the structure and
// calm brand look of JTypeIntro: cross-faded scenes built only from the
// shared theme + primitives, with all motion driven by useCurrentFrame().

import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { brand, FONT, MONO, VIDEO } from '../theme'
import {
  Backdrop,
  Card,
  Chip,
  Connector,
  FadeInUp,
  PopIn,
  Wordmark,
} from '../primitives'
import type { CompositionDescriptor } from '../index'

const FPS = VIDEO.fps
const sec = (s: number) => Math.round(s * FPS)

function Center({ children }: { children: React.ReactNode }) {
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      {children}
    </AbsoluteFill>
  )
}

// One end of the sync — a labelled card with a big glyph.
function Endpoint({
  glyph,
  title,
  subtitle,
  accent = false,
}: {
  glyph: string
  title: string
  subtitle: string
  accent?: boolean
}) {
  return (
    <Card
      style={{
        padding: '34px 28px',
        textAlign: 'center',
        ...(accent ? { borderColor: brand.teal } : {}),
      }}
    >
      <div style={{ fontSize: 64 }}>{glyph}</div>
      <div style={{ marginTop: 12, fontSize: 28, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 22, color: brand.gray }}>{subtitle}</div>
    </Card>
  )
}

// Scene 1 — intro: what this video is about.
function SceneIntro() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn delay={4}>
          <Wordmark size={80} />
        </PopIn>
        <FadeInUp delay={18}>
          <div style={{ marginTop: 26, fontSize: 40, fontWeight: 600, color: brand.ink }}>
            One vault, everywhere.
          </div>
        </FadeInUp>
        <FadeInUp delay={32}>
          <div style={{ marginTop: 12, fontSize: 26, color: brand.inkSoft }}>
            Bind a local folder to a cloud workspace — then push and pull both ways.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// Scene 2 — bind: a local vault links to a cloud workspace.
function SceneBind() {
  const frame = useCurrentFrame()
  const prog = interpolate(frame, [18, 52], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <Center>
      <div style={{ width: 1000 }}>
        <FadeInUp>
          <div style={{ textAlign: 'center' }}>
            <Chip>🔗 jtype sync bind</Chip>
          </div>
        </FadeInUp>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 30 }}>
          <PopIn delay={2} style={{ flex: '0 0 320px' }}>
            <Endpoint glyph="📁" title="Local vault" subtitle="./notes — on disk" />
          </PopIn>
          <div style={{ flex: 1, padding: '0 24px' }}>
            <Connector progress={prog} />
            <div
              style={{
                textAlign: 'center',
                marginTop: 14,
                fontSize: 22,
                color: brand.tealDark,
                fontWeight: 700,
                fontFamily: MONO,
                opacity: prog,
              }}
            >
              .jtype/cloud.json
            </div>
          </div>
          <PopIn delay={26} style={{ flex: '0 0 320px' }}>
            <Endpoint glyph="☁️" title="Cloud workspace" subtitle="Sync · share · publish" accent />
          </PopIn>
        </div>
        <FadeInUp delay={58}>
          <div style={{ marginTop: 26, textAlign: 'center', fontSize: 24, color: brand.gray }}>
            The binding lives beside your notes — bound once, synced from anywhere.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// A small packet that travels along the sync line; `dir` flips the direction.
function Packet({
  delay,
  dir,
  color,
  y,
}: {
  delay: number
  dir: 'push' | 'pull'
  color: string
  y: number
}) {
  const frame = useCurrentFrame()
  const t = interpolate(frame, [delay, delay + 26], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  // push = left→right, pull = right→left across the ~360px gap.
  const x = dir === 'push' ? interpolate(t, [0, 1], [0, 360]) : interpolate(t, [0, 1], [360, 0])
  // fade in at the start of the trip and out at the end.
  const opacity = interpolate(t, [0, 0.12, 0.88, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: y,
        width: 18,
        height: 18,
        borderRadius: 6,
        background: color,
        boxShadow: `0 0 0 4px ${brand.white}`,
        transform: `translateX(${x}px)`,
        opacity,
      }}
    />
  )
}

// Scene 3 — two-way push/pull sync with packets flowing both directions.
function SceneSync() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const line = interpolate(frame, [4, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const labels = interpolate(frame, [22, 38], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  // Conflict-resolved badge springs in near the end.
  const okIn = spring({ frame: frame - sec(2.3), fps, config: { damping: 13, mass: 0.7 } })
  return (
    <Center>
      <div style={{ width: 1040 }}>
        <FadeInUp>
          <div style={{ textAlign: 'center' }}>
            <Chip tone="amber">🔄 jtype sync push · pull</Chip>
          </div>
        </FadeInUp>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 34 }}>
          <PopIn delay={2} style={{ flex: '0 0 300px' }}>
            <Endpoint glyph="💻" title="Local vault" subtitle="Your device" />
          </PopIn>

          {/* sync channel: two stacked lines + travelling packets */}
          <div style={{ flex: 1, padding: '0 20px', position: 'relative', height: 120 }}>
            <div style={{ position: 'absolute', top: 30, left: 20, right: 20 }}>
              <Connector progress={line} />
            </div>
            <div style={{ position: 'absolute', top: 86, left: 20, right: 20 }}>
              <Connector
                progress={line}
                style={{ background: `linear-gradient(90deg, ${brand.amberDeep}, ${brand.amber})` }}
              />
            </div>

            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 20,
                fontSize: 20,
                fontWeight: 700,
                color: brand.tealDark,
                fontFamily: MONO,
                opacity: labels,
              }}
            >
              push →
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 20,
                fontSize: 20,
                fontWeight: 700,
                color: brand.amberDeep,
                fontFamily: MONO,
                opacity: labels,
              }}
            >
              ← pull
            </div>

            {/* travelling packets within the 360px channel (offset by the 20px pad) */}
            <div style={{ position: 'absolute', top: 0, left: 20, width: 360, height: 120 }}>
              <Packet delay={sec(1.0)} dir="push" color={brand.teal} y={21} />
              <Packet delay={sec(1.6)} dir="push" color={brand.teal} y={21} />
              <Packet delay={sec(1.2)} dir="pull" color={brand.amberDeep} y={77} />
              <Packet delay={sec(1.9)} dir="pull" color={brand.amberDeep} y={77} />
            </div>
          </div>

          <PopIn delay={26} style={{ flex: '0 0 300px' }}>
            <Endpoint glyph="☁️" title="Cloud workspace" subtitle="Always in sync" accent />
          </PopIn>
        </div>

        {/* conflict-resolved confirmation */}
        <div
          style={{
            marginTop: 30,
            display: 'flex',
            justifyContent: 'center',
            transform: `scale(${interpolate(okIn, [0, 1], [0.8, 1])})`,
            opacity: interpolate(okIn, [0, 1], [0, 1]),
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 22px',
              borderRadius: 999,
              background: brand.soft,
              color: brand.tealDark,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            <Checkmark progress={okIn} /> Conflicts merged — newest wins
          </span>
        </div>
      </div>
    </Center>
  )
}

// A circular checkmark whose tick draws on with `progress` (0..1).
function Checkmark({ progress }: { progress: number }) {
  const dash = 26
  const offset = interpolate(progress, [0, 1], [dash, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <svg width={30} height={30} viewBox="0 0 30 30" style={{ display: 'block' }}>
      <circle cx={15} cy={15} r={13} fill="none" stroke={brand.teal} strokeWidth={2.5} />
      <path
        d="M9 15.5 L13.5 20 L21.5 10.5"
        fill="none"
        stroke={brand.teal}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash}
        strokeDashoffset={offset}
      />
    </svg>
  )
}

// Scene 4 — closing.
function SceneOutro() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn>
          <Wordmark size={68} />
        </PopIn>
        <FadeInUp delay={16}>
          <div style={{ marginTop: 22, fontSize: 34, fontWeight: 600 }}>
            Edit on disk. Sync to the cloud. Never lose a note.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

function SceneOpacity({ durationInFrames, children }: { durationInFrames: number; children: React.ReactNode }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const fade = Math.round(0.4 * fps)
  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
}

function CrossFade({ from, durationInFrames, children }: { from: number; durationInFrames: number; children: React.ReactNode }) {
  return (
    <Sequence from={from} durationInFrames={durationInFrames}>
      <SceneOpacity durationInFrames={durationInFrames}>{children}</SceneOpacity>
    </Sequence>
  )
}

const INTRO = sec(3.0)
const BIND = sec(3.6)
const SYNC = sec(4.2)
const OUTRO = sec(2.2)

export function SyncExplainer() {
  return (
    <Backdrop>
      <AbsoluteFill style={{ fontFamily: FONT }}>
        <CrossFade from={0} durationInFrames={INTRO}>
          <SceneIntro />
        </CrossFade>
        <CrossFade from={INTRO} durationInFrames={BIND}>
          <SceneBind />
        </CrossFade>
        <CrossFade from={INTRO + BIND} durationInFrames={SYNC}>
          <SceneSync />
        </CrossFade>
        <CrossFade from={INTRO + BIND + SYNC} durationInFrames={OUTRO}>
          <SceneOutro />
        </CrossFade>
      </AbsoluteFill>
    </Backdrop>
  )
}

export const composition: CompositionDescriptor = {
  id: 'sync',
  component: SyncExplainer,
  durationInFrames: INTRO + BIND + SYNC + OUTRO,
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  label: 'Local ⇄ Cloud sync',
}
