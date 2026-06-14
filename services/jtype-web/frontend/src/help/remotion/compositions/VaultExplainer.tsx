// Per-category explainer — "The Vault": a local Markdown vault on disk.
// A finder/file-tree of .md files, then an editor window where a couple of
// Markdown lines type in. Mirrors JTypeIntro's scene/cross-fade structure.
// Tagline: "Plain files. Your folder. No lock-in." (~13s)

import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion'
import { brand, FONT, MONO, VIDEO } from '../theme'
import {
  Backdrop,
  Caret,
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

// One row in the file tree: an indented icon + name that fades/slides in.
function TreeRow({
  depth,
  icon,
  name,
  delay,
  active = false,
  muted = false,
}: {
  depth: number
  icon: string
  name: string
  delay: number
  active?: boolean
  muted?: boolean
}) {
  return (
    <FadeInUp delay={delay} duration={14} y={10}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '9px 14px',
          marginLeft: depth * 30,
          borderRadius: 10,
          background: active ? brand.soft : 'transparent',
          fontSize: 26,
          fontFamily: MONO,
          color: muted ? brand.gray : active ? brand.tealDark : brand.ink,
          fontWeight: active ? 700 : 500,
        }}
      >
        <span style={{ fontSize: 24 }}>{icon}</span>
        <span>{name}</span>
      </div>
    </FadeInUp>
  )
}

// Scene 1 — wordmark + tagline for the vault category.
function SceneIntro() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn delay={4}>
          <Wordmark size={84} />
        </PopIn>
        <FadeInUp delay={18}>
          <div style={{ marginTop: 26, fontSize: 40, fontWeight: 600, color: brand.ink }}>
            The Vault
          </div>
        </FadeInUp>
        <FadeInUp delay={30}>
          <div style={{ marginTop: 12, fontSize: 26, color: brand.inkSoft }}>
            A folder of plain Markdown files on your own disk.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// Scene 2 — Finder / file-tree of .md files inside the vault folder.
function SceneTree() {
  return (
    <Center>
      <div style={{ width: 760 }}>
        <FadeInUp>
          <Chip>📁 ~/Documents/notes</Chip>
        </FadeInUp>
        <WindowFrame title="Finder — notes" style={{ marginTop: 22 }}>
          <div style={{ padding: '24px 26px', minHeight: 320 }}>
            <TreeRow depth={0} icon="📂" name="notes/" delay={10} muted />
            <TreeRow depth={1} icon="📄" name="release-notes.md" delay={20} active />
            <TreeRow depth={1} icon="📄" name="ideas.md" delay={30} />
            <TreeRow depth={1} icon="📂" name="meetings/" delay={40} muted />
            <TreeRow depth={2} icon="📄" name="2026-06-14.md" delay={50} />
            <TreeRow depth={2} icon="📄" name="standup.md" delay={60} />
          </div>
        </WindowFrame>
        <FadeInUp delay={74}>
          <div style={{ marginTop: 18, fontSize: 24, color: brand.gray }}>
            Real <code style={{ fontFamily: MONO }}>.md</code> files in real folders — open them in
            any editor.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// Scene 3 — Editor: a couple of Markdown lines type in.
function SceneEditor() {
  const lines = ['# Spring release', '- local-first writing', '- it stays on disk']
  return (
    <Center>
      <div style={{ width: 880 }}>
        <FadeInUp>
          <Chip tone="gray">✎ Editing · release-notes.md</Chip>
        </FadeInUp>
        <WindowFrame title="release-notes.md" style={{ marginTop: 22 }}>
          <div
            style={{
              padding: '30px 36px',
              fontFamily: MONO,
              fontSize: 30,
              lineHeight: 1.7,
              minHeight: 280,
            }}
          >
            <div>
              <Typewriter
                text={lines[0]!}
                delay={10}
                duration={26}
                style={{ color: brand.ink, fontWeight: 700 }}
              />
            </div>
            <div style={{ height: 18 }} />
            <div style={{ color: brand.tealDark }}>
              <Typewriter text={lines[1]!} delay={42} duration={26} />
            </div>
            <div style={{ color: brand.tealDark }}>
              <Typewriter text={lines[2]!} delay={72} duration={24} caret={false} />
              <Caret />
            </div>
          </div>
        </WindowFrame>
        <FadeInUp delay={100}>
          <div style={{ marginTop: 18, display: 'flex', gap: 12 }}>
            <Chip tone="gray">no database</Chip>
            <Chip tone="gray">no lock-in</Chip>
            <Chip>yours to keep</Chip>
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// Scene 4 — closing tagline.
function SceneOutro() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn>
          <Wordmark size={64} />
        </PopIn>
        <FadeInUp delay={16}>
          <div style={{ marginTop: 22, fontSize: 38, fontWeight: 600, color: brand.ink }}>
            Plain files. Your folder. No lock-in.
          </div>
        </FadeInUp>
      </div>
    </Center>
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

const INTRO = sec(2.8)
const TREE = sec(4.0)
const EDITOR = sec(3.6)
const OUTRO = sec(2.6)

export function VaultExplainer() {
  return (
    <Backdrop>
      <AbsoluteFill style={{ fontFamily: FONT }}>
        <CrossFade from={0} durationInFrames={INTRO}>
          <SceneIntro />
        </CrossFade>
        <CrossFade from={INTRO} durationInFrames={TREE}>
          <SceneTree />
        </CrossFade>
        <CrossFade from={INTRO + TREE} durationInFrames={EDITOR}>
          <SceneEditor />
        </CrossFade>
        <CrossFade from={INTRO + TREE + EDITOR} durationInFrames={OUTRO}>
          <SceneOutro />
        </CrossFade>
      </AbsoluteFill>
    </Backdrop>
  )
}

export const composition: CompositionDescriptor = {
  id: 'vault',
  component: VaultExplainer,
  durationInFrames: INTRO + TREE + EDITOR + OUTRO,
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  label: 'The Vault',
}
