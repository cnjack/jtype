// Publishing explainer — one flag turns a vault note into a public site.
// A note's frontmatter `publish: true` is the only switch; the same Markdown
// is served read-only at /u/yourname. Mirrors the single-flow shape of
// JTypeIntro (cross-faded scenes, theme + primitives, ~13s).

import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { brand, FONT, MONO, VIDEO } from '../theme'
import {
  Backdrop,
  Chip,
  Connector,
  FadeInUp,
  PopIn,
  Typewriter,
  WindowFrame,
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

// Scene 1 — the idea: one line ships a page.
function SceneTitle() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn delay={4}>
          <Chip>🌐 Publishing</Chip>
        </PopIn>
        <FadeInUp delay={16}>
          <div style={{ marginTop: 24, fontSize: 52, fontWeight: 700, color: brand.ink }}>
            One line ships a page.
          </div>
        </FadeInUp>
        <FadeInUp delay={30}>
          <div style={{ marginTop: 14, fontSize: 28, color: brand.inkSoft }}>
            Add{' '}
            <code style={{ fontFamily: MONO, color: brand.tealDark, fontWeight: 700 }}>publish: true</code>{' '}
            to any note — it becomes a clean public site.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// Scene 2 — the source note: frontmatter with the publish flag.
function SceneFrontmatter() {
  const frame = useCurrentFrame()
  // The flag "lights up" once it's been typed.
  const flagGlow = interpolate(frame, [70, 86], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <Center>
      <div style={{ width: 900 }}>
        <FadeInUp>
          <Chip>📄 Source · spring-release.md</Chip>
        </FadeInUp>
        <WindowFrame title="~/vault/spring-release.md" style={{ marginTop: 22 }}>
          <div style={{ padding: '30px 36px', fontFamily: MONO, fontSize: 28, lineHeight: 1.65, minHeight: 300 }}>
            <div style={{ color: brand.gray }}>
              <Typewriter text="---" delay={8} duration={8} caret={false} />
            </div>
            <div style={{ color: brand.ink }}>
              <Typewriter text="title: Spring release notes" delay={18} duration={26} caret={false} />
            </div>
            <div
              style={{
                color: brand.tealDark,
                fontWeight: 700,
                background: `rgba(34,184,173,${0.16 * flagGlow})`,
                borderRadius: 8,
                display: 'inline-block',
                padding: '0 6px',
                margin: '0 -6px',
              }}
            >
              <Typewriter text="publish: true" delay={48} duration={22} />
            </div>
            <div style={{ color: brand.gray }}>
              <Typewriter text="---" delay={72} duration={8} caret={false} />
            </div>
            <div style={{ height: 14 }} />
            <FadeInUp delay={84}>
              <div style={{ color: brand.inkSoft }}>A quieter editor, faster preview.</div>
            </FadeInUp>
          </div>
        </WindowFrame>
      </div>
    </Center>
  )
}

// Scene 3 — the switch: note → public site.
function SceneBind() {
  const frame = useCurrentFrame()
  const prog = interpolate(frame, [14, 46], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <Center>
      <div style={{ display: 'flex', alignItems: 'center', width: 1040 }}>
        <PopIn delay={2} style={{ flex: '0 0 320px' }}>
          <WindowFrame title="spring-release.md">
            <div style={{ padding: '22px 24px', fontFamily: MONO, fontSize: 18, lineHeight: 1.6 }}>
              <div style={{ color: brand.gray }}>---</div>
              <div style={{ color: brand.tealDark, fontWeight: 700 }}>publish: true</div>
              <div style={{ color: brand.gray }}>---</div>
              <div style={{ marginTop: 8, color: brand.inkSoft }}># Spring release</div>
            </div>
          </WindowFrame>
        </PopIn>
        <div style={{ flex: 1, padding: '0 22px' }}>
          <Connector progress={prog} />
          <div
            style={{
              textAlign: 'center',
              marginTop: 14,
              fontSize: 22,
              color: brand.tealDark,
              fontWeight: 700,
              opacity: prog,
            }}
          >
            render → publish
          </div>
        </div>
        <PopIn delay={26} style={{ flex: '0 0 360px' }}>
          <WindowFrame title="jtype.site/u/yourname">
            <div style={{ padding: '24px 26px', minHeight: 120 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: brand.ink }}>Spring release notes</div>
              <div style={{ marginTop: 8, fontSize: 18, color: brand.inkSoft, lineHeight: 1.45 }}>
                A quieter editor, faster preview.
              </div>
            </div>
          </WindowFrame>
        </PopIn>
      </div>
    </Center>
  )
}

// Scene 4 — the live public page in a browser frame.
function ScenePublicSite() {
  return (
    <Center>
      <div style={{ width: 940 }}>
        <FadeInUp>
          <Chip>🌐 Live · /u/yourname</Chip>
        </FadeInUp>
        <BrowserFrame url="jtype.site/u/yourname" style={{ marginTop: 22 }}>
          <div style={{ padding: '44px 52px', minHeight: 300 }}>
            <FadeInUp delay={16}>
              <div style={{ fontSize: 48, fontWeight: 700, color: brand.ink, lineHeight: 1.1 }}>
                Spring release notes
              </div>
            </FadeInUp>
            <FadeInUp delay={28}>
              <div style={{ marginTop: 18, fontSize: 26, color: brand.inkSoft, lineHeight: 1.5 }}>
                A quieter editor, faster preview, and a public site that stays in sync with your vault.
              </div>
            </FadeInUp>
            <FadeInUp delay={42}>
              <div style={{ marginTop: 26, display: 'flex', gap: 12 }}>
                <Chip tone="gray">read-only</Chip>
                <Chip tone="gray">Markdown source</Chip>
                <Chip tone="amber">in sync</Chip>
              </div>
            </FadeInUp>
          </div>
        </BrowserFrame>
      </div>
    </Center>
  )
}

// Scene 5 — closing.
function SceneOutro() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn>
          <Wordmark size={68} />
        </PopIn>
        <FadeInUp delay={16}>
          <div style={{ marginTop: 22, fontSize: 34, fontWeight: 600, color: brand.ink }}>
            Flip the flag. Your note is on the web.
          </div>
        </FadeInUp>
        <FadeInUp delay={28}>
          <div style={{ marginTop: 12, fontSize: 24, color: brand.gray }}>
            Edit the note, the page follows.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// A browser chrome (back/fwd + address bar) — like WindowFrame but with a URL
// pill, used for the rendered public page. Address-bar lock pops in on a spring.
function BrowserFrame({
  url,
  children,
  style,
}: {
  url: string
  children?: React.ReactNode
  style?: React.CSSProperties
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const lock = spring({ frame: frame - 6, fps, config: { damping: 14, mass: 0.6 } })
  return (
    <div
      style={{
        background: brand.white,
        border: `1px solid ${brand.line}`,
        borderRadius: 18,
        boxShadow: '0 26px 60px -28px rgba(0,71,68,0.45)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          borderBottom: `1px solid ${brand.line}`,
          background: 'rgba(255,255,255,0.7)',
        }}
      >
        <span style={{ display: 'inline-flex', gap: 6 }}>
          <Dot color="#ff5f57" />
          <Dot color="#febc2e" />
          <Dot color="#28c840" />
        </span>
        <div
          style={{
            marginLeft: 8,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 999,
            background: brand.paper,
            border: `1px solid ${brand.line}`,
            fontFamily: MONO,
            fontSize: 18,
            color: brand.gray,
          }}
        >
          <span style={{ color: brand.teal, opacity: interpolate(lock, [0, 1], [0, 1]) }}>🔒</span>
          <span style={{ color: brand.inkSoft }}>{url}</span>
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 13, height: 13, borderRadius: 999, background: color, display: 'inline-block' }} />
}

function CrossFade({
  from,
  durationInFrames,
  children,
}: {
  from: number
  durationInFrames: number
  children: React.ReactNode
}) {
  return (
    <Sequence from={from} durationInFrames={durationInFrames}>
      <SceneOpacity durationInFrames={durationInFrames}>{children}</SceneOpacity>
    </Sequence>
  )
}

function SceneOpacity({
  durationInFrames,
  children,
}: {
  durationInFrames: number
  children: React.ReactNode
}) {
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

// Scene plan (~13s): title 3.0 · frontmatter 3.4 · bind 2.4 · site 3.0 · outro 2.4
const T_TITLE = sec(3.0)
const T_FRONT = sec(3.4)
const T_BIND = sec(2.4)
const T_SITE = sec(3.0)
const T_OUTRO = sec(2.4)

export function PublishExplainer() {
  let at = 0
  const title = at
  at += T_TITLE
  const front = at
  at += T_FRONT
  const bind = at
  at += T_BIND
  const site = at
  at += T_SITE
  const outro = at
  return (
    <Backdrop>
      <AbsoluteFill style={{ fontFamily: FONT }}>
        <CrossFade from={title} durationInFrames={T_TITLE}>
          <SceneTitle />
        </CrossFade>
        <CrossFade from={front} durationInFrames={T_FRONT}>
          <SceneFrontmatter />
        </CrossFade>
        <CrossFade from={bind} durationInFrames={T_BIND}>
          <SceneBind />
        </CrossFade>
        <CrossFade from={site} durationInFrames={T_SITE}>
          <ScenePublicSite />
        </CrossFade>
        <CrossFade from={outro} durationInFrames={T_OUTRO}>
          <SceneOutro />
        </CrossFade>
      </AbsoluteFill>
    </Backdrop>
  )
}

export const composition: CompositionDescriptor = {
  id: 'publish',
  component: PublishExplainer,
  durationInFrames: T_TITLE + T_FRONT + T_BIND + T_SITE + T_OUTRO,
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  label: 'Publishing',
}
