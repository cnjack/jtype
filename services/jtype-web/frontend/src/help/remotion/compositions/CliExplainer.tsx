// Per-category explainer for the JType CLI (videoId "cli").
// A single terminal session: prompts type out `jtype login`,
// `jtype note create`, `jtype bind --workspace`, and `jtype sync`,
// each followed by a brief success line. ~13.5s, monospace, calm brand look.
// Mirrors JTypeIntro's structure (Backdrop + crossfaded Sequences + primitives).

import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { brand, FONT, MONO, VIDEO } from '../theme'
import { Backdrop, Caret, Chip, FadeInUp, PopIn, Typewriter, WindowFrame, Wordmark } from '../primitives'
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

// A `$ jtype …` line that types the command, then reveals output below it.
function CommandLine({
  command,
  output,
  outputColor = brand.tealDark,
  delay,
  typeDuration = 30,
  showCaret = false,
}: {
  command: string
  output?: string
  outputColor?: string
  delay: number
  typeDuration?: number
  showCaret?: boolean
}) {
  const outDelay = delay + typeDuration + 8
  return (
    <FadeInUp delay={delay} duration={12} y={10}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ color: brand.teal, fontWeight: 700 }}>$</span>
        <span style={{ color: brand.ink }}>
          <Typewriter
            text={command}
            delay={delay + 4}
            duration={typeDuration}
            caret={showCaret}
            style={{ fontWeight: 600 }}
          />
        </span>
      </div>
      {output ? (
        <FadeInUp delay={outDelay} duration={10} y={6}>
          <div style={{ marginTop: 6, marginLeft: 30, color: outputColor }}>
            <span style={{ color: brand.amberDeep, marginRight: 10 }}>✓</span>
            {output}
          </div>
        </FadeInUp>
      ) : null}
    </FadeInUp>
  )
}

// Scene 1 — title card: the CLI, in one line.
function SceneTitle() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn delay={4}>
          <Wordmark size={84} />
        </PopIn>
        <FadeInUp delay={20}>
          <div style={{ marginTop: 24, fontSize: 40, fontWeight: 600, color: brand.ink }}>
            JType from the terminal
          </div>
        </FadeInUp>
        <FadeInUp delay={32}>
          <div
            style={{
              marginTop: 16,
              display: 'inline-block',
              fontFamily: MONO,
              fontSize: 30,
              color: brand.tealDark,
              background: brand.soft,
              borderRadius: 12,
              padding: '12px 22px',
            }}
          >
            <span style={{ color: brand.teal, fontWeight: 700, marginRight: 10 }}>$</span>
            <Typewriter text="jtype --help" delay={44} duration={26} style={{ fontWeight: 600 }} />
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// Scene 2 — the terminal session, four commands typed in sequence.
function SceneSession() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  // Subtle window lift as the scene opens.
  const lift = spring({ frame, fps, config: { damping: 16, mass: 0.8 } })
  return (
    <Center>
      <div style={{ width: 980, transform: `translateY(${interpolate(lift, [0, 1], [16, 0])}px)` }}>
        <FadeInUp>
          <Chip>⌘ Terminal · ~/notes</Chip>
        </FadeInUp>
        <WindowFrame title="jtype-cli" style={{ marginTop: 20 }}>
          <div
            style={{
              padding: '30px 36px',
              fontFamily: MONO,
              fontSize: 27,
              lineHeight: 1.55,
              minHeight: 380,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <CommandLine
              command="jtype login"
              output="Signed in as you@studio.dev"
              delay={8}
              typeDuration={22}
            />
            <CommandLine
              command={'jtype note create "ideas/today.md"'}
              output="Created ideas/today.md in this vault"
              delay={56}
              typeDuration={40}
            />
            <CommandLine
              command="jtype bind --workspace launch"
              output="Vault bound → wrote .jtype/cloud.json"
              delay={128}
              typeDuration={34}
            />
            <CommandLine
              command="jtype sync"
              output="Pulled 3 · pushed 1 · up to date"
              outputColor={brand.tealDark}
              delay={192}
              typeDuration={22}
              showCaret
            />
          </div>
        </WindowFrame>
      </div>
    </Center>
  )
}

// Scene 3 — closing line.
function SceneOutro() {
  const chips = ['login', 'note', 'bind', 'sync']
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn>
          <Wordmark size={68} />
        </PopIn>
        <FadeInUp delay={16}>
          <div style={{ marginTop: 22, fontSize: 34, fontWeight: 600 }}>
            Write, bind, and sync — without leaving the shell.
          </div>
        </FadeInUp>
        <FadeInUp delay={30}>
          <div
            style={{
              marginTop: 22,
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              fontFamily: MONO,
            }}
          >
            {chips.map((c, i) => (
              <PopIn key={c} delay={36 + i * 7}>
                <Chip tone="gray">jtype {c}</Chip>
              </PopIn>
            ))}
          </div>
        </FadeInUp>
        <FadeInUp delay={66}>
          <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 24, color: brand.gray }}>
            <span style={{ color: brand.teal, fontWeight: 700, marginRight: 10 }}>$</span>
            <Caret />
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
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

const TITLE = sec(3)
const SESSION = sec(7.5)
const OUTRO = sec(3)

export function CliExplainer() {
  return (
    <Backdrop>
      <AbsoluteFill style={{ fontFamily: FONT }}>
        <CrossFade from={0} durationInFrames={TITLE}>
          <SceneTitle />
        </CrossFade>
        <CrossFade from={TITLE} durationInFrames={SESSION}>
          <SceneSession />
        </CrossFade>
        <CrossFade from={TITLE + SESSION} durationInFrames={OUTRO}>
          <SceneOutro />
        </CrossFade>
      </AbsoluteFill>
    </Backdrop>
  )
}

export const composition: CompositionDescriptor = {
  id: 'cli',
  component: CliExplainer,
  durationInFrames: TITLE + SESSION + OUTRO,
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  label: 'JType CLI',
}
