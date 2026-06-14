// Per-category explainer for AI — an assistant driving JType through its MCP
// server. We watch a user ask in plain English, then the model fires off
// search_notes / create_note / create_card tool calls that land back in the
// vault. ~13s, single concept, mirrors the JTypeIntro scene/cross-fade shape.

import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { brand, FONT, MONO, VIDEO } from '../theme'
import {
  Backdrop,
  Caret,
  Card,
  Chip,
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

// Scene 1 — title: AI + MCP
function SceneTitle() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn delay={4}>
          <Chip>✨ AI · MCP server</Chip>
        </PopIn>
        <FadeInUp delay={16}>
          <div style={{ marginTop: 26, fontSize: 52, fontWeight: 700, color: brand.ink }}>
            Let an assistant work your vault.
          </div>
        </FadeInUp>
        <FadeInUp delay={30}>
          <div style={{ marginTop: 14, fontSize: 28, color: brand.inkSoft }}>
            JType exposes tools over MCP — search, write notes, and add cards on your behalf.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// Scene 2 — the human asks, in plain language
function SceneAsk() {
  return (
    <Center>
      <div style={{ width: 900 }}>
        <FadeInUp>
          <Chip tone="gray">🧑 You → assistant</Chip>
        </FadeInUp>
        <Card style={{ marginTop: 22, padding: '34px 40px', background: brand.white }}>
          <div style={{ fontSize: 34, lineHeight: 1.5, color: brand.ink, fontWeight: 500 }}>
            <Typewriter
              text="Find my launch notes, draft a recap, and add a follow-up card."
              delay={10}
              duration={66}
            />
          </div>
        </Card>
        <FadeInUp delay={86}>
          <div style={{ marginTop: 18, fontSize: 24, color: brand.gray }}>
            No menus, no clicks — just the ask.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// A single streamed MCP tool call: an arrow, the call, then a checked result.
function ToolCall({
  call,
  result,
  delay,
}: {
  call: string
  result: string
  delay: number
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  // The "ok" badge springs in once the call has finished typing.
  const ok = spring({ frame: frame - (delay + 34), fps, config: { damping: 16, mass: 0.6 } })
  return (
    <div style={{ marginBottom: 22 }}>
      <FadeInUp delay={delay} y={14}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ color: brand.amberDeep, fontWeight: 700 }}>→</span>
          <span style={{ color: brand.tealDark }}>
            <Typewriter text={call} delay={delay + 4} duration={28} caret={false} />
          </span>
        </div>
      </FadeInUp>
      <div
        style={{
          marginTop: 8,
          marginLeft: 36,
          fontSize: 22,
          color: brand.gray,
          opacity: interpolate(ok, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(ok, [0, 1], [6, 0])}px)`,
        }}
      >
        <span style={{ color: brand.teal, fontWeight: 700 }}>✓</span> {result}
      </div>
    </div>
  )
}

// Scene 3 — the model fires MCP tool calls against JType
function SceneCalls() {
  const calls: { call: string; result: string }[] = [
    { call: 'search_notes("launch")', result: '3 notes matched' },
    { call: 'create_note("recaps/launch.md")', result: 'written to vault' },
    { call: 'create_card("Follow up on launch")', result: 'added to To do' },
  ]
  return (
    <Center>
      <div style={{ width: 920 }}>
        <FadeInUp>
          <Chip>⚙️ assistant → jtype</Chip>
        </FadeInUp>
        <WindowFrame title="mcp · tool calls" style={{ marginTop: 22 }}>
          <div
            style={{
              padding: '30px 34px',
              fontFamily: MONO,
              fontSize: 28,
              lineHeight: 1.4,
              minHeight: 300,
            }}
          >
            {calls.map((c, i) => (
              <ToolCall key={c.call} call={c.call} result={c.result} delay={10 + i * 36} />
            ))}
          </div>
        </WindowFrame>
      </div>
    </Center>
  )
}

// Scene 4 — what landed: a fresh note + a new card, side by side
function SceneResult() {
  return (
    <Center>
      <div style={{ width: 1000 }}>
        <FadeInUp>
          <Chip tone="amber">📥 Landed in your vault</Chip>
        </FadeInUp>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.3fr 1fr',
            gap: 24,
            marginTop: 22,
            alignItems: 'start',
          }}
        >
          <PopIn delay={10}>
            <WindowFrame title="recaps/launch.md">
              <div style={{ padding: '24px 28px', fontFamily: MONO, fontSize: 24, lineHeight: 1.6, minHeight: 220 }}>
                <div style={{ color: brand.ink, fontWeight: 700 }}># Launch recap</div>
                <div style={{ height: 14 }} />
                <div style={{ color: brand.tealDark }}>- shipped the public site</div>
                <div style={{ color: brand.tealDark }}>- sync stayed green</div>
                <div style={{ color: brand.tealDark }}>- next: follow-ups</div>
              </div>
            </WindowFrame>
          </PopIn>
          <PopIn delay={22}>
            <Card style={{ padding: 18, background: brand.paper }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: brand.gray, marginBottom: 12 }}>To do</div>
              <FadeInUp delay={34}>
                <div
                  style={{
                    background: brand.white,
                    border: `2px solid ${brand.teal}`,
                    borderRadius: 12,
                    padding: '16px 18px',
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  Follow up on launch
                </div>
              </FadeInUp>
              <FadeInUp delay={46}>
                <div style={{ marginTop: 12, fontSize: 20, color: brand.gray }}>added by the assistant</div>
              </FadeInUp>
            </Card>
          </PopIn>
        </div>
      </div>
    </Center>
  )
}

// Scene 5 — closing
function SceneOutro() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn>
          <Wordmark size={68} />
        </PopIn>
        <FadeInUp delay={16}>
          <div style={{ marginTop: 22, fontSize: 36, fontWeight: 600 }}>
            done — your vault updated
            <Caret />
          </div>
        </FadeInUp>
        <FadeInUp delay={30}>
          <div style={{ marginTop: 12, fontSize: 26, color: brand.inkSoft }}>
            AI that edits the same Markdown you own.
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

// Scene timings (frames). The calls scene runs longest since three tool
// calls stream in one after another.
const T_TITLE = sec(2.8)
const T_ASK = sec(3.0)
const T_CALLS = sec(3.6)
const T_RESULT = sec(2.4)
const T_OUTRO = sec(2.4)

export function AiExplainer() {
  let at = 0
  const title = at
  at += T_TITLE
  const ask = at
  at += T_ASK
  const calls = at
  at += T_CALLS
  const result = at
  at += T_RESULT
  const outro = at
  return (
    <Backdrop>
      <AbsoluteFill style={{ fontFamily: FONT }}>
        <CrossFade from={title} durationInFrames={T_TITLE}>
          <SceneTitle />
        </CrossFade>
        <CrossFade from={ask} durationInFrames={T_ASK}>
          <SceneAsk />
        </CrossFade>
        <CrossFade from={calls} durationInFrames={T_CALLS}>
          <SceneCalls />
        </CrossFade>
        <CrossFade from={result} durationInFrames={T_RESULT}>
          <SceneResult />
        </CrossFade>
        <CrossFade from={outro} durationInFrames={T_OUTRO}>
          <SceneOutro />
        </CrossFade>
      </AbsoluteFill>
    </Backdrop>
  )
}

export const composition: CompositionDescriptor = {
  id: 'ai',
  component: AiExplainer,
  durationInFrames: T_TITLE + T_ASK + T_CALLS + T_RESULT + T_OUTRO,
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  label: 'AI & MCP',
}
