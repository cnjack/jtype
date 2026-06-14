// Flagship "What is JType" explainer — the product flow in ~28s:
// vault → sync → kanban → publish → AI. Mirrored (in a shorter, single-scene
// form) by the per-category explainers.

import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion'
import { brand, FONT, MONO, VIDEO } from '../theme'
import {
  Backdrop,
  Caret,
  Card,
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

// Scene 1 — wordmark + tagline
function SceneIntro() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn delay={4}>
          <Wordmark size={96} />
        </PopIn>
        <FadeInUp delay={20}>
          <div style={{ marginTop: 28, fontSize: 40, fontWeight: 600, color: brand.ink }}>
            Your notes. Local first.
          </div>
        </FadeInUp>
        <FadeInUp delay={34}>
          <div style={{ marginTop: 12, fontSize: 26, color: brand.inkSoft }}>
            A Markdown vault you own — with cloud sync, kanban, publishing, and AI.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// Scene 2 — Vault: type Markdown in a local editor
function SceneVault() {
  const lines = ['# Spring release', '', '- local-first writing', '- it stays on disk']
  return (
    <Center>
      <div style={{ width: 880 }}>
        <FadeInUp>
          <Chip>📁 Vault · ~/Documents/.jtype</Chip>
        </FadeInUp>
        <WindowFrame title="release-notes.md" style={{ marginTop: 22 }}>
          <div style={{ padding: '30px 36px', fontFamily: MONO, fontSize: 30, lineHeight: 1.7, minHeight: 280 }}>
            <div><Typewriter text={lines[0]!} delay={10} duration={26} style={{ color: brand.ink, fontWeight: 700 }} /></div>
            <div style={{ height: 18 }} />
            <div style={{ color: brand.tealDark }}><Typewriter text={lines[2]!} delay={42} duration={26} /></div>
            <div style={{ color: brand.tealDark }}><Typewriter text={lines[3]!} delay={72} duration={24} /></div>
          </div>
        </WindowFrame>
        <FadeInUp delay={96}>
          <div style={{ marginTop: 18, fontSize: 24, color: brand.gray }}>
            Plain <code style={{ fontFamily: MONO }}>.md</code> files in normal folders — no lock-in.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// Scene 3 — Sync: vault binds to a cloud workspace
function SceneSync() {
  const frame = useCurrentFrame()
  const prog = interpolate(frame, [16, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <Center>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: 1000 }}>
        <PopIn delay={2} style={{ flex: '0 0 300px' }}>
          <Card style={{ padding: '34px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 64 }}>💻</div>
            <div style={{ marginTop: 12, fontSize: 28, fontWeight: 700 }}>Local vault</div>
            <div style={{ fontSize: 22, color: brand.gray }}>Your device</div>
          </Card>
        </PopIn>
        <div style={{ flex: 1, padding: '0 20px' }}>
          <Connector progress={prog} />
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 22, color: brand.tealDark, fontWeight: 700, opacity: prog }}>
            push ⇄ pull
          </div>
        </div>
        <PopIn delay={26} style={{ flex: '0 0 300px' }}>
          <Card style={{ padding: '34px 28px', textAlign: 'center', borderColor: brand.teal }}>
            <div style={{ fontSize: 64 }}>☁️</div>
            <div style={{ marginTop: 12, fontSize: 28, fontWeight: 700 }}>Cloud workspace</div>
            <div style={{ fontSize: 22, color: brand.gray }}>Sync · share · publish</div>
          </Card>
        </PopIn>
      </div>
    </Center>
  )
}

// Scene 4 — Kanban board
function SceneKanban() {
  const cols = [
    { name: 'To do', cards: ['Draft launch plan', 'Write changelog'] },
    { name: 'Doing', cards: ['Spring release'] },
    { name: 'Done', cards: ['Cut RC build'] },
  ]
  return (
    <Center>
      <div style={{ width: 1000 }}>
        <FadeInUp><Chip tone="amber">📋 Kanban · Launch board</Chip></FadeInUp>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 22 }}>
          {cols.map((col, ci) => (
            <PopIn key={col.name} delay={10 + ci * 8}>
              <Card style={{ padding: 16, background: brand.paper }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: brand.gray, marginBottom: 12 }}>{col.name}</div>
                {col.cards.map((card, idx) => (
                  <FadeInUp key={card} delay={24 + ci * 8 + idx * 6}>
                    <div style={{ background: brand.white, border: `1px solid ${brand.line}`, borderRadius: 12, padding: '14px 16px', fontSize: 24, marginBottom: 10 }}>
                      {card}
                    </div>
                  </FadeInUp>
                ))}
              </Card>
            </PopIn>
          ))}
        </div>
      </div>
    </Center>
  )
}

// Scene 5 — Publish: a clean public site
function ScenePublish() {
  return (
    <Center>
      <div style={{ width: 920 }}>
        <FadeInUp><Chip>🌐 Publish · /u/yourname</Chip></FadeInUp>
        <WindowFrame title="yourname.jtype.site" style={{ marginTop: 22 }}>
          <div style={{ padding: '40px 48px', minHeight: 280 }}>
            <FadeInUp delay={14}><div style={{ fontSize: 44, fontWeight: 700 }}>Spring release notes</div></FadeInUp>
            <FadeInUp delay={26}><div style={{ marginTop: 16, fontSize: 26, color: brand.inkSoft, lineHeight: 1.5 }}>A quieter editor, faster preview, and a public site that stays in sync with your vault.</div></FadeInUp>
            <FadeInUp delay={40}>
              <div style={{ marginTop: 22, display: 'flex', gap: 12 }}>
                <Chip tone="gray">read-only</Chip>
                <Chip tone="gray">Markdown source</Chip>
              </div>
            </FadeInUp>
          </div>
        </WindowFrame>
      </div>
    </Center>
  )
}

// Scene 6 — AI: MCP tool calls
function SceneAi() {
  const calls = ['search_notes("launch")', 'create_note("meetings/…")', 'create_card("Draft plan")']
  return (
    <Center>
      <div style={{ width: 860 }}>
        <FadeInUp><Chip>✨ AI · MCP server</Chip></FadeInUp>
        <WindowFrame title="assistant → jtype" style={{ marginTop: 22 }}>
          <div style={{ padding: '28px 32px', fontFamily: MONO, fontSize: 26, lineHeight: 2, minHeight: 260 }}>
            {calls.map((c, i) => (
              <FadeInUp key={c} delay={12 + i * 18}>
                <div style={{ color: brand.tealDark }}>
                  <span style={{ color: brand.amberDeep }}>→</span> {c}
                </div>
              </FadeInUp>
            ))}
            <FadeInUp delay={12 + calls.length * 18}>
              <div style={{ marginTop: 6, color: brand.gray }}>done — your vault updated<Caret /></div>
            </FadeInUp>
          </div>
        </WindowFrame>
      </div>
    </Center>
  )
}

// Scene 7 — closing
function SceneOutro() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn><Wordmark size={72} /></PopIn>
        <FadeInUp delay={16}>
          <div style={{ marginTop: 22, fontSize: 34, fontWeight: 600 }}>Write locally. Sync, ship, and automate when you need to.</div>
        </FadeInUp>
      </div>
    </Center>
  )
}

function CrossFade({ from, durationInFrames, children }: { from: number; durationInFrames: number; children: React.ReactNode }) {
  return (
    <Sequence from={from} durationInFrames={durationInFrames}>
      <SceneOpacity durationInFrames={durationInFrames}>{children}</SceneOpacity>
    </Sequence>
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

export function JTypeIntro() {
  const D = sec(4.2)
  return (
    <Backdrop>
      <AbsoluteFill style={{ fontFamily: FONT }}>
        <CrossFade from={0} durationInFrames={sec(3.4)}><SceneIntro /></CrossFade>
        <CrossFade from={sec(3.4)} durationInFrames={D}><SceneVault /></CrossFade>
        <CrossFade from={sec(3.4) + D} durationInFrames={D}><SceneSync /></CrossFade>
        <CrossFade from={sec(3.4) + D * 2} durationInFrames={D}><SceneKanban /></CrossFade>
        <CrossFade from={sec(3.4) + D * 3} durationInFrames={D}><ScenePublish /></CrossFade>
        <CrossFade from={sec(3.4) + D * 4} durationInFrames={D}><SceneAi /></CrossFade>
        <CrossFade from={sec(3.4) + D * 5} durationInFrames={sec(3.2)}><SceneOutro /></CrossFade>
      </AbsoluteFill>
    </Backdrop>
  )
}

export const composition: CompositionDescriptor = {
  id: 'intro',
  component: JTypeIntro,
  durationInFrames: Math.round(3.4 * FPS) + Math.round(4.2 * FPS) * 5 + Math.round(3.2 * FPS),
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  label: 'What is JType',
}
