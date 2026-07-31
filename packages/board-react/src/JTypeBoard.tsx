import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import { I18nProvider } from '@lingui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { BoardPeek } from '@shared/components/board/BoardPeek'
import { BoardSurface } from '@shared/components/board/BoardSurface'
import type { BoardActions } from '@shared/components/board/types'
import {
  activeBoardLaneKey,
  boardLaneValueOf,
  cardPatchForLaneValue,
  newCardLaneValue,
  slugify,
  type BoardViewCard,
  type BoardViewConfig,
} from '@shared/lib/board'
import { parseFrontmatter, writeFrontmatter } from '@shared/lib/frontmatter'
import { createJTypeClient, JTypeApiError, type JTypeBoardDataClient } from './client'
import { JTypeBoardError } from './resolveBoard'
import {
  applyCardPatch,
  applyLocalViewPatch,
  loadBoardSnapshot,
  toViewConfig,
  type BoardConfigJSON,
  type BoardSnapshot,
  type DocCache,
  type LocalViewPatch,
} from './boardData'
import { CardDetail } from './CardDetail'
import { activateBoardLocale, i18n, type BoardLocale } from './i18n'
import { uiStrings, type UiStrings } from './strings'

export type JTypeBoardConnection = 'live' | 'polling' | 'error'

export type JTypeBoardProps = {
  /** Cloud workspace id (UUID). */
  workspaceId: string
  /** Board name or `.board` relative path; resolved via listDocuments. */
  boardRef: string
  /** jtype server origin. XOR with `client`. */
  baseUrl?: string
  /** Session token (typically mcp-scoped). XOR with `client`. */
  token?: string
  /**
   * Injected data client. When set, EVERY request (loads, polling, writes,
   * live subscription) goes through it — the browser never talks to jtype
   * directly, so a host proxy can keep the token server-side.
   * Memoize it: a new identity per render restarts the board.
   */
  client?: JTypeBoardDataClient
  /** Hide all mutation affordances (view-only board). Default false. */
  readOnly?: boolean
  /** Current user's display name; enables the personal "My cards" filter. */
  currentUser?: string
  /**
   * Try the live SSE feed (default true). Post PR #45 the feed requires a
   * full-scope session token — with an mcp-scoped token the server answers
   * 403 and the board VISIBLY falls back to polling (connection chip +
   * onConnectionChange('polling')). Never a silent fake-live.
   */
  live?: boolean
  /** Polling cadence in ms (default 30000, min 5000). */
  pollIntervalMs?: number
  /** Intercept card opens (replaces the built-in editable/read-only detail). */
  onCardOpen?: (card: BoardViewCard) => void
  /**
   * Add host-owned content after native Properties and Relations without
   * replacing jtype's editor. Not rendered for read-only or intercepted opens.
   */
  renderCardSupplement?: (card: BoardViewCard) => ReactNode
  /** Observe live/polling/error transitions. */
  onConnectionChange?: (state: JTypeBoardConnection) => void
  /** Board chrome locale (default 'en'). Shared across instances (see README). */
  locale?: BoardLocale
  className?: string
  style?: CSSProperties
}

function rand() {
  return Math.random().toString(36).slice(2, 6)
}

/**
 * Embeddable jtype kanban board: give it `baseUrl`+`token` (or an injected
 * `client`) plus `workspaceId`+`boardRef` and it renders the same shared
 * BoardSurface the jtype desktop + web apps use, backed by the document API.
 */
export function JTypeBoard({
  workspaceId,
  boardRef,
  baseUrl,
  token,
  client: injectedClient,
  readOnly = false,
  currentUser,
  live = true,
  pollIntervalMs = 30000,
  onCardOpen,
  renderCardSupplement,
  onConnectionChange,
  locale,
  className,
  style,
}: JTypeBoardProps): ReactElement {
  const resolvedLocale: BoardLocale = locale ?? 'en'
  const S = uiStrings(resolvedLocale)

  // Activate synchronously before the first paint so <Trans> never renders an
  // empty catalog; guarded by a ref so external i18n changes (another instance
  // with a different locale) can't ping-pong re-activations.
  const lastLocaleRef = useRef<BoardLocale | null>(null)
  if (lastLocaleRef.current !== resolvedLocale) {
    lastLocaleRef.current = resolvedLocale
    activateBoardLocale(resolvedLocale)
  }

  // --- credentials: injected client XOR baseUrl+token (fail-visible) --------
  const propsError = injectedClient && (baseUrl || token)
    ? S.errPropsBoth
    : !injectedClient && (!baseUrl || !token)
      ? S.errPropsNone
      : null
  const client = useMemo<JTypeBoardDataClient | null>(() => {
    if (propsError) return null
    if (injectedClient) return injectedClient
    return createJTypeClient({ baseUrl: baseUrl!, token: token! })
  }, [injectedClient, baseUrl, token, propsError])

  const pollMs = Math.max(5000, pollIntervalMs)

  // --- state -----------------------------------------------------------------
  const [snapshot, setSnapshot] = useState<BoardSnapshot | null>(null)
  const [fatal, setFatal] = useState('')
  const [banner, setBanner] = useState('')
  const [conn, setConn] = useState<JTypeBoardConnection>('polling')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  // readOnly view preference (Board/Table/Calendar, grouping…), kept locally
  // and merged over every fresh server snapshot so it survives the poll cycle.
  const [localView, setLocalView] = useState<LocalViewPatch>({})

  const snapRef = useRef<BoardSnapshot | null>(null)
  const cacheRef = useRef<DocCache>(new Map())
  const loadRef = useRef<(() => Promise<BoardSnapshot | null>) | null>(null)
  const lastConnRef = useRef<JTypeBoardConnection | null>(null)
  const onConnectionChangeRef = useRef(onConnectionChange)
  onConnectionChangeRef.current = onConnectionChange
  const stringsRef = useRef(S)
  stringsRef.current = S

  const describeError = (e: unknown): string => {
    const str = stringsRef.current
    if (e instanceof JTypeBoardError) {
      if (e.code === 'board_not_found') return str.errBoardNotFound(boardRef)
      if (e.code === 'board_ref_ambiguous') return str.errBoardAmbiguous(boardRef, e.candidates)
      if (e.code === 'board_config_invalid') return str.errBoardConfigInvalid
      return str.errGeneric(e.message)
    }
    if (e instanceof JTypeApiError) {
      if (e.status === 401 || e.status === 403) return str.errUnauthorized
      if (e.status === 0 && e.code === 'network_error') return str.errNetwork
      return str.errGeneric(e.code)
    }
    return str.errGeneric(e instanceof Error ? e.message : String(e))
  }
  const describeErrorRef = useRef(describeError)
  describeErrorRef.current = describeError

  // --- load / poll / live loop ----------------------------------------------
  useEffect(() => {
    if (!client) return
    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let sseRetryTimer: ReturnType<typeof setTimeout> | null = null
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let sseUnsub: (() => void) | null = null
    let sseUp = false
    let sseDeniedForToken = false

    // New identity (client/workspace/board changed): start from a clean slate.
    snapRef.current = null
    setSnapshot(null)
    setFatal('')
    setBanner('')
    setSelectedCardId(null)
    setLocalView({})

    const announce = (c: JTypeBoardConnection) => {
      if (cancelled) return
      setConn(c)
      if (lastConnRef.current !== c) {
        lastConnRef.current = c
        onConnectionChangeRef.current?.(c)
      }
    }

    const load = async (): Promise<BoardSnapshot | null> => {
      try {
        const snap = await loadBoardSnapshot(client, workspaceId, boardRef, cacheRef.current)
        if (cancelled) return null
        snapRef.current = snap
        setSnapshot(snap)
        setFatal('')
        setBanner('')
        announce(sseUp ? 'live' : 'polling')
        return snap
      } catch (e) {
        if (cancelled) return null
        const msg = describeErrorRef.current(e)
        if (snapRef.current) setBanner(msg)
        else setFatal(msg)
        announce('error')
        return null
      }
    }
    loadRef.current = load

    const schedule = () => {
      pollTimer = setTimeout(async () => {
        if (cancelled) return
        // While the SSE stream is up it drives refreshes; the timer just idles
        // so it can take over the moment the stream drops.
        if (!sseUp) await load()
        if (!cancelled) schedule()
      }, pollMs)
    }

    const startSse = (logicalBoardId: string) => {
      if (cancelled || !live || sseDeniedForToken || !client.subscribeBoardEvents) return
      sseUnsub = client.subscribeBoardEvents(workspaceId, logicalBoardId, {
        onEvent: () => {
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => void load(), 300)
        },
        onUp: () => {
          sseUp = true
          announce('live')
        },
        onDown: ({ permanent }) => {
          sseUp = false
          if (cancelled) return
          if (snapRef.current) announce('polling')
          if (permanent) {
            // e.g. mcp-scoped token rejected on the live feed (PR #45):
            // settle on polling for this mount, visibly.
            sseDeniedForToken = true
          } else {
            sseRetryTimer = setTimeout(() => startSse(logicalBoardId), 30000)
          }
        },
      })
    }

    void load().then((snap) => {
      if (cancelled) return
      // The SSE feed is keyed by the board's logical id (same ref webhooks
      // use), which we only know after reading the .board config.
      if (snap) startSse(snap.config.id)
      schedule() // also retries a failed initial load every poll interval
    })

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
      if (sseRetryTimer) clearTimeout(sseRetryTimer)
      if (debounceTimer) clearTimeout(debounceTimer)
      sseUnsub?.()
      loadRef.current = null
    }
  }, [client, workspaceId, boardRef, live, pollMs])

  // --- actions adapter (same document-writeback semantics as WebBoardView) ---
  const actions: BoardActions = useMemo(() => {
    const reload = () => loadRef.current?.() ?? Promise.resolve(null)
    const withErr = async (fn: () => Promise<void>) => {
      try {
        await fn()
      } catch (e) {
        setBanner(describeErrorRef.current(e))
      }
    }
    const saveDocContent = async (relativePath: string, content: string) => {
      const snap = snapRef.current
      if (!snap || !client) return
      const meta = snap.metaByPath.get(relativePath)
      const saved = await client.saveDocument(workspaceId, {
        relativePath,
        content,
        baseContentHash: meta?.contentHash,
        baseContent: meta?.content,
      })
      if (meta) {
        const current = snapRef.current
        if (!current) return
        const nextMetaByPath = new Map(current.metaByPath)
        nextMetaByPath.set(relativePath, {
          ...(nextMetaByPath.get(relativePath) ?? meta),
          content,
          contentHash: saved.contentHash,
        })
        const nextSnapshot = { ...current, metaByPath: nextMetaByPath }
        snapRef.current = nextSnapshot
        setSnapshot((rendered) => (rendered === current ? nextSnapshot : rendered))
      }
    }
    return {
      refresh: () => void reload(),
      setConfig: async (patch: Partial<BoardViewConfig>) => {
        try {
          const snap = snapRef.current
          if (!snap || !client) return
          if (readOnly) {
            // View preference (Board/Table/Calendar, grouping…): keep it in
            // the poll-surviving local override — a read-only embed never
            // writes the shared .board doc.
            setLocalView((cur) => applyLocalViewPatch(cur, patch as Record<string, unknown>))
            return
          }
          const next = { ...snap.config, ...patch } as BoardConfigJSON
          await client.saveDocument(workspaceId, {
            relativePath: snap.boardRelativePath,
            content: JSON.stringify(next, null, 2),
            baseContentHash: snap.boardDoc.contentHash,
            baseContent: snap.boardDoc.content,
          })
          await reload()
        } catch (e) {
          setBanner(describeErrorRef.current(e))
          throw e
        }
      },
      createCard: async (colKey, title, initial) => {
        const snap = snapRef.current
        if (!snap || !client) return
        try {
          const laneKey = activeBoardLaneKey(snap.config)
          const targetLane = newCardLaneValue(laneKey, colKey, initial)
          const pos =
            snap.cards
              .filter((card) => boardLaneValueOf(card, snap.config) === targetLane)
              .reduce((m, c) => Math.max(m, c.position), -1) + 1
          const data: Record<string, string> = {
            title,
            board: snap.config.id,
            status: laneKey === 'status' ? targetLane : snap.config.columns[0]?.key ?? 'todo',
            position: String(pos),
          }
          const content = applyCardPatch(
            applyCardPatch(
              writeFrontmatter('', data),
              cardPatchForLaneValue(laneKey, targetLane),
            ),
            initial ?? {},
          )
          let rel = `${snap.boardDir}/${slugify(title)}.md`
          if (snap.metaByPath.has(rel)) rel = `${snap.boardDir}/${slugify(title)}-${rand()}.md`
          await client.saveDocument(workspaceId, { relativePath: rel, content })
          await reload()
          return rel
        } catch (e) {
          setBanner(describeErrorRef.current(e))
          throw e
        }
      },
      updateCard: (id, patch) =>
        withErr(async () => {
          const snap = snapRef.current
          const meta = snap?.metaByPath.get(id)
          if (!snap || !meta) return
          await saveDocContent(id, applyCardPatch(meta.content, patch))
          await reload()
        }),
      updateCards: async (updates, onProgress) => {
        try {
          if (readOnly) return
          const snap = snapRef.current
          if (!snap) return
          const missing = updates.find((update) => !snap.metaByPath.has(update.cardId))
          if (missing) throw new Error(`Card metadata is missing for ${missing.cardId}.`)
          let completed = 0
          for (const update of updates) {
            const meta = snap.metaByPath.get(update.cardId)!
            await saveDocContent(update.cardId, applyCardPatch(meta.content, update.patch))
            completed += 1
            onProgress?.(completed, updates.length)
          }
          await reload()
        } catch (e) {
          await reload()
          setBanner(describeErrorRef.current(e))
          throw e
        }
      },
      moveCard: (id, toCol, index) =>
        withErr(async () => {
          const snap = snapRef.current
          if (!snap || !client) return
          const laneKey = activeBoardLaneKey(snap.config)
          const movedMeta = snap.metaByPath.get(id)
          if (!movedMeta) return
          if (laneKey !== 'status') {
            const moved = snap.cards.find((c) => c.id === id)
            if (!moved || boardLaneValueOf(moved, snap.config) === toCol) return
            await saveDocContent(
              id,
              applyCardPatch(movedMeta.content, cardPatchForLaneValue(laneKey, toCol)),
            )
            await reload()
            return
          }
          const target = snap.cards
            .filter((c) => c.columnKey === toCol && c.id !== id)
            .sort((a, b) => a.position - b.position)
          const moved = snap.cards.find((c) => c.id === id)
          if (moved) target.splice(Math.max(0, Math.min(index, target.length)), 0, moved)
          for (let i = 0; i < target.length; i++) {
            const c = target[i]
            if (!c) continue
            const meta = snap.metaByPath.get(c.id)
            if (!meta) continue
            if (c.id !== id && c.position === i && c.columnKey === toCol) continue
            const { data, body } = parseFrontmatter(meta.content)
            await saveDocContent(c.id, writeFrontmatter(body, { ...data, status: toCol, position: String(i) }))
          }
          await reload()
        }),
      deleteCard: async (card) => {
        const snap = snapRef.current
        const meta = snap?.metaByPath.get(card.id)
        if (!snap || !meta || !client) return
        if (!client.deleteDocument) {
          // Fail-visible: an injected client without delete support must not
          // silently swallow the action.
          setBanner(stringsRef.current.deleteUnsupported)
          return
        }
        if (!window.confirm(stringsRef.current.confirmDeleteCard(card.title))) return
        await withErr(async () => {
          await client.deleteDocument!(workspaceId, meta.id)
          await reload()
        })
      },
    }
  }, [client, workspaceId, readOnly])

  // --- render ------------------------------------------------------------------
  // In readOnly the locally-kept view preference wins over the server config
  // (a fresh poll snapshot must not snap the view back).
  const effectiveConfig = useMemo(
    () =>
      snapshot ? (readOnly ? ({ ...snapshot.config, ...localView } as BoardConfigJSON) : snapshot.config) : null,
    [snapshot, readOnly, localView],
  )
  const viewConfig = useMemo(
    () => (snapshot && effectiveConfig ? toViewConfig(effectiveConfig, snapshot.boardDir) : null),
    [snapshot, effectiveConfig],
  )
  const selectedCard = selectedCardId
    ? snapshot?.cards.find((c) => c.id === selectedCardId) ?? null
    : null
  // Editable embeds use the same focused editor as the desktop and web apps.
  // Only an explicitly read-only embed needs the lightweight, non-mutating
  // package detail. A host-supplied handler always wins over both defaults.
  const handleCardOpen =
    onCardOpen ??
    (readOnly ? (card: BoardViewCard) => setSelectedCardId(card.id) : undefined)

  let content: ReactElement
  if (propsError) {
    content = <ErrorPanel message={propsError} />
  } else if (!snapshot && fatal) {
    content = <ErrorPanel message={fatal} retryLabel={S.retry} onRetry={() => void loadRef.current?.()} />
  } else if (!snapshot || !viewConfig) {
    content = (
      <div className="flex h-full items-center justify-center bg-[#fbfdfb] p-8 text-sm text-stone-500">
        {S.loading}
      </div>
    )
  } else {
    content = (
      <>
        <I18nProvider i18n={i18n}>
          <BoardSurface
            config={viewConfig}
            cards={snapshot.cards}
            actions={actions}
            error={banner || undefined}
            readOnly={readOnly}
            currentUser={currentUser}
            onCardOpen={handleCardOpen}
            peekComponent={!readOnly && !onCardOpen ? BoardPeek : undefined}
            renderCardSupplement={renderCardSupplement}
            // Dropdown panels mount in body-level portals; carry the scope
            // class so ONLY our portals pick up the package styles (never the
            // host's own Headless UI portals).
            portalClassName="jtb-scope"
          />
        </I18nProvider>
        {selectedCard && readOnly && !onCardOpen && effectiveConfig && (
          <CardDetail
            card={selectedCard}
            config={effectiveConfig}
            strings={S}
            onClose={() => setSelectedCardId(null)}
          />
        )}
        <ConnectionChip state={conn} strings={S} pollSecs={Math.round(pollMs / 1000)} liveWanted={live} />
      </>
    )
  }

  // jtb-scope = style-scope marker (also on portal panels); jtb-root = the
  // wrapper's layout (position/height/overflow), defined in styles.css.
  return (
    <div className={`jtb-scope jtb-root ${className ?? ''}`} style={style} data-jtype-board={boardRef}>
      {content}
    </div>
  )
}

function ErrorPanel({
  message,
  retryLabel,
  onRetry,
}: {
  message: string
  retryLabel?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#fbfdfb] p-8 text-center">
      <ExclamationTriangleIcon className="h-9 w-9 text-amber-500" aria-hidden />
      <p className="max-w-md break-words text-sm text-stone-600">{message}</p>
      {onRetry && retryLabel && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/40 hover:text-brand-dark"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}

/** Always-visible connection status — polling must never masquerade as live. */
function ConnectionChip({
  state,
  strings,
  pollSecs,
  liveWanted,
}: {
  state: JTypeBoardConnection
  strings: UiStrings
  pollSecs: number
  liveWanted: boolean
}) {
  const label =
    state === 'live' ? strings.live : state === 'polling' ? strings.polling(pollSecs) : strings.connectionError
  const dot = state === 'live' ? 'bg-emerald-500' : state === 'polling' ? 'bg-stone-400' : 'bg-red-500'
  return (
    <div
      className="pointer-events-none absolute bottom-2 right-2 z-40 inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/90 px-2 py-0.5 text-[11px] text-stone-500 shadow-sm"
      title={state === 'polling' && liveWanted ? strings.liveUnavailableHint : undefined}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </div>
  )
}
