// Kanban explainer — a three-column board (To do / Doing / Done) builds in,
// then one card animates from "To do" to "Doing". ~13s. Mirrors the structure
// and brand language of JTypeIntro: scene Sequences with cross-fades, theme +
// primitives, and all motion driven by useCurrentFrame()/interpolate()/spring().

import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { brand, FONT, VIDEO } from '../theme'
import { Backdrop, Card, Chip, FadeInUp, PopIn, Wordmark } from '../primitives'
import type { CompositionDescriptor } from '../index'

const FPS = VIDEO.fps
const sec = (s: number) => Math.round(s * FPS)

// Board geometry (in the 1000px-wide board coordinate space).
const BOARD_W = 1000
const COL_GAP = 20
const COL_W = (BOARD_W - COL_GAP * 2) / 3
const COL_PAD = 16
const HEADER_H = 46 // column title row height (font + margin)
const CARD_H = 56 // card box height incl. its bottom margin

type ColumnKey = 'todo' | 'doing' | 'done'

interface BoardCard {
  id: string
  title: string
}

const STATIC: Record<ColumnKey, BoardCard[]> = {
  todo: [
    { id: 'changelog', title: 'Write changelog' },
    { id: 'assets', title: 'Export assets' },
  ],
  doing: [{ id: 'preview', title: 'Wire up preview' }],
  done: [{ id: 'rc', title: 'Cut RC build' }],
}

const COLUMNS: { key: ColumnKey; name: string; tone: 'gray' | 'teal' }[] = [
  { key: 'todo', name: 'To do', tone: 'gray' },
  { key: 'doing', name: 'Doing', tone: 'teal' },
  { key: 'done', name: 'Done', tone: 'gray' },
]

function Center({ children }: { children: React.ReactNode }) {
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      {children}
    </AbsoluteFill>
  )
}

/** Left edge x of a column within the board coordinate space. */
function columnX(index: number): number {
  return index * (COL_W + COL_GAP)
}

/** A single card surface used for both static and the moving card. */
function CardBox({
  title,
  highlighted = false,
  style,
}: {
  title: string
  highlighted?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        background: highlighted ? brand.soft : brand.white,
        border: `1px solid ${highlighted ? brand.teal : brand.line}`,
        borderRadius: 12,
        padding: '14px 16px',
        fontSize: 24,
        fontWeight: highlighted ? 700 : 500,
        color: brand.ink,
        boxShadow: highlighted ? '0 14px 30px -16px rgba(0,71,68,0.5)' : 'none',
        ...style,
      }}
    >
      {title}
    </div>
  )
}

/** One column shell with header + count; children are absolutely positioned. */
function Column({
  name,
  tone,
  count,
  popDelay,
  children,
}: {
  name: string
  tone: 'gray' | 'teal'
  count: number
  popDelay: number
  children: React.ReactNode
}) {
  const headColor = tone === 'teal' ? brand.tealDark : brand.gray
  return (
    <PopIn delay={popDelay} style={{ flex: `0 0 ${COL_W}px` }}>
      <Card style={{ padding: COL_PAD, background: brand.paper, minHeight: 300 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            height: HEADER_H - 12,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: headColor }}>{name}</span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: brand.gray,
              background: brand.white,
              border: `1px solid ${brand.line}`,
              borderRadius: 999,
              minWidth: 26,
              height: 26,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 6px',
            }}
          >
            {count}
          </span>
        </div>
        <div style={{ position: 'relative', minHeight: CARD_H * 3 }}>{children}</div>
      </Card>
    </PopIn>
  )
}

// Scene 1 — title
function SceneIntro() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn delay={3}>
          <Chip tone="amber" style={{ fontSize: 26, padding: '8px 18px' }}>
            📋 Kanban
          </Chip>
        </PopIn>
        <FadeInUp delay={16}>
          <div style={{ marginTop: 26, fontSize: 52, fontWeight: 700, color: brand.ink }}>
            Move work across the board
          </div>
        </FadeInUp>
        <FadeInUp delay={30}>
          <div style={{ marginTop: 14, fontSize: 28, color: brand.inkSoft }}>
            Columns for <strong style={{ color: brand.tealDark }}>To do</strong>,{' '}
            <strong style={{ color: brand.tealDark }}>Doing</strong>, and{' '}
            <strong style={{ color: brand.tealDark }}>Done</strong> — drag a card to update its status.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// Scene 2 — the board, with one card animating from "To do" to "Doing".
function SceneBoard() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // The travelling card ("Spring release") starts as the first card in To do
  // (column 0, slot 0) and moves to the bottom of Doing (column 1, slot 1).
  const fromCol = 0
  const fromSlot = 0
  const toCol = 1
  const toSlot = 1

  const moveStart = 30 // frames into this scene before the card lifts
  const move = spring({
    frame: frame - moveStart,
    fps,
    config: { damping: 18, mass: 0.9, stiffness: 110 },
  })

  // A small "lift" arc: the card rises a touch and casts a deeper shadow mid-flight.
  const lift = Math.sin(Math.min(Math.max(move, 0), 1) * Math.PI)
  const hasLanded = move > 0.999

  const startX = columnX(fromCol) + COL_PAD
  const startY = HEADER_H + fromSlot * CARD_H
  const endX = columnX(toCol) + COL_PAD
  const endY = HEADER_H + toSlot * CARD_H

  const x = interpolate(move, [0, 1], [startX, endX])
  const y = interpolate(move, [0, 1], [startY, endY]) - lift * 26
  const scale = 1 + lift * 0.05
  const rotate = interpolate(move, [0, 0.5, 1], [0, -2.5, 0])
  const flightShadow = `0 ${18 + lift * 26}px ${36 + lift * 26}px -18px rgba(0,71,68,${0.4 + lift * 0.25})`

  // Live counts: To do loses the card the instant it lifts; Doing gains it on land.
  const lifted = move > 0.02
  const counts: Record<ColumnKey, number> = {
    todo: STATIC.todo.length + 1 - (lifted ? 1 : 0),
    doing: STATIC.doing.length + (hasLanded ? 1 : 0),
    done: STATIC.done.length,
  }

  // The destination slot in Doing reserves space once the card is on its way.
  const reserveOpacity = interpolate(move, [0.1, 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const cardWidth = COL_W - COL_PAD * 2

  return (
    <Center>
      <div style={{ width: BOARD_W }}>
        <FadeInUp>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Chip tone="amber">📋 Launch board</Chip>
            <span style={{ fontSize: 22, color: brand.gray }}>release/spring</span>
          </div>
        </FadeInUp>

        <div style={{ position: 'relative', marginTop: 22 }}>
          <div style={{ display: 'flex', gap: COL_GAP }}>
            {COLUMNS.map((col, ci) => {
              const cards = STATIC[col.key]
              const isDoing = col.key === 'doing'
              return (
                <Column
                  key={col.key}
                  name={col.name}
                  tone={col.tone}
                  count={counts[col.key]}
                  popDelay={6 + ci * 7}
                >
                  {cards.map((card, idx) => {
                    // In Doing, push the static card down to make room for the
                    // incoming card at the top once it has landed.
                    const slot = isDoing && hasLanded ? idx + 1 : idx
                    return (
                      <FadeInUp
                        key={card.id}
                        delay={22 + ci * 7 + idx * 6}
                        style={{ position: 'absolute', top: slot * CARD_H, left: 0, width: cardWidth }}
                      >
                        <CardBox title={card.title} />
                      </FadeInUp>
                    )
                  })}

                  {/* Ghost placeholder showing where the card is heading. */}
                  {isDoing ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: toSlot * CARD_H,
                        left: 0,
                        width: cardWidth,
                        height: CARD_H - 10,
                        borderRadius: 12,
                        border: `2px dashed ${brand.teal}`,
                        opacity: hasLanded ? 0 : reserveOpacity * 0.6,
                      }}
                    />
                  ) : null}
                </Column>
              )
            })}
          </div>

          {/* The travelling card — absolutely positioned over the whole board. */}
          <div
            style={{
              position: 'absolute',
              top: COL_PAD,
              left: 0,
              width: cardWidth,
              transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`,
              zIndex: 5,
            }}
          >
            <CardBox title="Spring release" highlighted style={{ boxShadow: flightShadow, width: cardWidth }} />
          </div>
        </div>

        <FadeInUp delay={moveStart + 30}>
          <div style={{ marginTop: 20, fontSize: 24, color: brand.gray }}>
            Now <strong style={{ color: brand.tealDark }}>Doing</strong> — status syncs everywhere it appears.
          </div>
        </FadeInUp>
      </div>
    </Center>
  )
}

// Scene 3 — closing
function SceneOutro() {
  return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <PopIn>
          <Wordmark size={72} />
        </PopIn>
        <FadeInUp delay={16}>
          <div style={{ marginTop: 22, fontSize: 34, fontWeight: 600 }}>
            Plan, track, and ship — one board per project.
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

const INTRO = sec(3.2)
const BOARD = sec(7.4)
const OUTRO = sec(2.4)

export function KanbanExplainer() {
  return (
    <Backdrop>
      <AbsoluteFill style={{ fontFamily: FONT }}>
        <CrossFade from={0} durationInFrames={INTRO}>
          <SceneIntro />
        </CrossFade>
        <CrossFade from={INTRO} durationInFrames={BOARD}>
          <SceneBoard />
        </CrossFade>
        <CrossFade from={INTRO + BOARD} durationInFrames={OUTRO}>
          <SceneOutro />
        </CrossFade>
      </AbsoluteFill>
    </Backdrop>
  )
}

export const composition: CompositionDescriptor = {
  id: 'kanban',
  component: KanbanExplainer,
  durationInFrames: INTRO + BOARD + OUTRO,
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  label: 'Kanban board',
}
