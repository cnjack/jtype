import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoardSettingsDialog } from '../components/BoardSettingsDialog'
import { useConfirm, usePrompt } from '@shared/components/PromptDialogContext'
import { parseFrontmatter, writeFrontmatter } from '@shared/lib/frontmatter'
import { renderMarkdownToHtml, renderToContainer } from '@shared/lib/markdown'
import { BoardSurface, BoardPeek, guardBoardActions, type BoardActions } from '@shared/components/board'
import {
  DEFAULT_DONE_COLUMN,
  activeBoardLaneKey,
  applyBoardCardPatch,
  boardLaneValueOf,
  bodyExcerpt,
  cardPatchForLaneValue,
  newCardLaneValue,
  countTasks,
  parseAttachments,
  parseBoardDocumentConfig,
  parseLinks,
  parseTagList,
  pickCustomFields,
  resolveTags,
  normalizeGroupBy,
  normalizeSwimlaneBy,
  slugify,
  type BoardActivityEvent,
  type BoardComment,
  type BoardPersonalViewState,
  type BoardViewCard,
  type BoardViewConfig,
  type BoardDocumentConfig,
} from '@shared/lib/board'
import {
  boardPersonalViewDefaults,
  boardPersonalViewStorageKey,
  loadBoardPersonalViewState,
  mergeBoardPersonalViewState,
  saveBoardPersonalViewState,
} from '@shared/lib/boardViewState'
import { api, getStoredUsername, type MemberInfo } from '../api'
import {
  saveBoardCardPatch,
  type WebBoardCardMeta,
} from '../lib/boardCardWrites'

type BoardConfigJSON = BoardDocumentConfig

function rand() {
  return Math.random().toString(36).slice(2, 6)
}

function boardCardFromContent(
  relativePath: string,
  fallbackTitle: string,
  content: string,
  config: BoardConfigJSON,
): BoardViewCard {
  const fm = parseFrontmatter(content)
  const tasks = countTasks(fm.body)
  return {
    id: relativePath,
    relationKey: relativePath,
    columnKey: fm.data.status || '',
    position: Number(fm.data.position ?? 0),
    title: fm.data.title || fallbackTitle || relativePath,
    icon: fm.data.icon || null,
    priority: fm.data.priority || null,
    assignee: fm.data.assignee || null,
    swimlaneKey: fm.data.swimlane || null,
    start: fm.data.start || null,
    due: fm.data.due || null,
    reminder: fm.data.reminder || null,
    archived: ['true', '1', 'yes'].includes((fm.data.archived || '').toLowerCase()),
    tags: resolveTags(fm.data.tags ? parseTagList(fm.data.tags) : [], config.labels),
    notes: fm.body,
    taskDone: tasks.done,
    taskTotal: tasks.total,
    excerpt: bodyExcerpt(fm.body),
    attachments: fm.data.attachments ? parseAttachments(fm.data.attachments) : [],
    custom: pickCustomFields(fm.data, config.fields),
    blockedBy: fm.data.blocked_by ? parseLinks(fm.data.blocked_by) : [],
    blocks: fm.data.blocks ? parseLinks(fm.data.blocks) : [],
    relates: fm.data.relates ? parseLinks(fm.data.relates) : [],
    parent: fm.data.parent ? (parseLinks(fm.data.parent)[0] ?? null) : null,
  }
}

/**
 * Web board view backed by the SYNCED MARKDOWN documents — the exact same data
 * as the desktop board. Reads the `.board` JSON config + scans the cloud workspace's
 * `.md` notes for frontmatter `board:<id>`, and writes edits back through the
 * document API. Renders the shared {@link BoardSurface}, so web == desktop.
 */
export function WebBoardView({
  workspaceId,
  boardDocId,
  boardRelativePath,
  fullscreen,
  onToggleFullscreen,
  readOnly = false,
  sessionId = null,
  subscribe,
}: {
  workspaceId: string
  boardDocId: string
  boardRelativePath: string
  fullscreen?: boolean
  onToggleFullscreen?: () => void
  readOnly?: boolean
  sessionId?: string | null
  subscribe?: (listener: (event: { type?: string; sourceSessionId?: string }) => void) => () => void
}) {
  const prompt = usePrompt()
  const confirm = useConfirm()
  const boardDir = boardRelativePath.replace(/\.board$/i, '')

  const [config, setConfig] = useState<BoardConfigJSON | null>(null)
  const [cards, setCards] = useState<BoardViewCard[]>([])
  const [metaByPath, setMetaByPath] = useState<Map<string, WebBoardCardMeta>>(new Map())
  const [error, setError] = useState('')
  const [showBoardSettings, setShowBoardSettings] = useState(false)
  const [ticketByDoc, setTicketByDoc] = useState<Map<string, string>>(new Map())
  const [viewState, setViewState] = useState<BoardPersonalViewState>({ version: 1 })
  const configRef = useRef<BoardConfigJSON | null>(null)
  const cardsRef = useRef(cards)
  cardsRef.current = cards
  const boardDocRef = useRef<{ content: string; contentHash: string } | null>(null)
  const metaByPathRef = useRef<Map<string, WebBoardCardMeta>>(new Map())
  const loadedViewKey = useRef('')
  const readOnlyRef = useRef(readOnly)
  readOnlyRef.current = readOnly
  const assertWritable = useCallback(() => {
    if (readOnlyRef.current) throw new Error('This board is read-only.')
  }, [])

  const load = useCallback(async () => {
    try {
      const boardDocFull = await api.getDocument(workspaceId, boardDocId)
      const cfg = parseBoardDocumentConfig(boardDocFull.content, boardDir) as BoardConfigJSON
      configRef.current = cfg
      const nextBoardDoc = { content: boardDocFull.content, contentHash: boardDocFull.contentHash }
      boardDocRef.current = nextBoardDoc

      const loaded = await api.listBoardCards(workspaceId, cfg.id)

      const nextMeta = new Map<string, WebBoardCardMeta>()
      const nextCards: BoardViewCard[] = []
      for (const doc of loaded) {
        const fm = parseFrontmatter(doc.content)
        if (fm.data.board !== cfg.id) continue
        nextMeta.set(doc.relativePath, { id: doc.documentId, relativePath: doc.relativePath, content: doc.content, contentHash: doc.contentHash })
        nextCards.push(boardCardFromContent(doc.relativePath, doc.title, doc.content, cfg))
      }
      metaByPathRef.current = nextMeta
      // Publish one coherent snapshot. In particular, do not mount the board
      // with config + an empty transient Card list: personal Inbox dismissals
      // are reconciled against the authoritative snapshot.
      setConfig(cfg)
      setMetaByPath(nextMeta)
      setCards(nextCards)
      setError('')
    } catch (e) {
      setError(String(e))
    }
  }, [workspaceId, boardDocId, boardDir])

  useEffect(() => {
    void load()
  }, [load])

  // Realtime: when another client (e.g. the desktop) syncs a card/board document,
  // the cloud broadcasts a document event — refetch so web stays in sync.
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!subscribe) return
    const unsub = subscribe((event: { type?: string; sourceSessionId?: string }) => {
      if (event.sourceSessionId && event.sourceSessionId === sessionId) return
      if (event.type && (event.type.startsWith('document') || event.type.startsWith('sync'))) {
        if (refetchTimer.current) clearTimeout(refetchTimer.current)
        refetchTimer.current = setTimeout(() => load().catch(() => {}), 200)
      }
    })
    return () => { unsub(); if (refetchTimer.current) clearTimeout(refetchTimer.current) }
  }, [subscribe, sessionId, load])

  const saveBoardConfig = useCallback(
    async (next: BoardConfigJSON, throwOnError = false) => {
      const latestBoardDoc = boardDocRef.current
      if (!latestBoardDoc) return
      assertWritable()
      try {
        const content = JSON.stringify(next, null, 2)
        const saved = await api.saveDocument(workspaceId, {
          relativePath: boardRelativePath,
          content,
          baseContentHash: latestBoardDoc.contentHash,
          baseContent: latestBoardDoc.content,
        })
        configRef.current = next
        setConfig(next)
        const nextBoardDoc = { content, contentHash: saved.contentHash }
        boardDocRef.current = nextBoardDoc
        await load()
      } catch (e) {
        await load().catch(() => undefined)
        setError(String(e))
        if (throwOnError) throw e
      }
    },
    [assertWritable, workspaceId, boardRelativePath, load],
  )

  const saveCard = useCallback(
    async (relativePath: string, data: Record<string, string>, body: string) => {
      const meta = metaByPathRef.current.get(relativePath)
      const content = writeFrontmatter(body, data)
      assertWritable()
      const saved = await api.saveDocument(workspaceId, {
        relativePath,
        content,
        baseContentHash: meta?.contentHash,
        baseContent: meta?.content,
      })
      if (meta) {
        const nextMeta = new Map(metaByPathRef.current)
        nextMeta.set(relativePath, {
          ...(nextMeta.get(relativePath) ?? meta),
          content: saved.content,
          contentHash: saved.contentHash,
        })
        metaByPathRef.current = nextMeta
        setMetaByPath(nextMeta)
      }
    },
    [assertWritable, workspaceId],
  )

  const createCardDoc = useCallback(
    async (title: string, data: Record<string, string>, body = '') => {
      const base = `${boardDir}/${slugify(title)}`
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const rel = `${base}${attempt === 0 ? '' : `-${rand()}`}.md`
        try {
          assertWritable()
          await api.saveDocument(workspaceId, {
            relativePath: rel,
            content: writeFrontmatter(body, data),
            createOnly: true,
          })
          return rel
        } catch (error) {
          const collision = error instanceof Error && error.message.includes('document path already exists')
          if (!collision || attempt === 4) throw error
        }
      }
      throw new Error('Could not allocate a unique Card path.')
    },
    [assertWritable, workspaceId, boardDir],
  )

  const viewConfig: BoardViewConfig = useMemo(
    () =>
      config
        ? {
            title: config.title || boardDir,
            columns: config.columns,
            project: config.project,
            doneColumn: config.doneColumn,
            colorColumns: config.colorColumns,
            viewType: config.viewType,
            calendarMode: config.calendarMode,
            fields: config.fields,
            labels: config.labels,
            ticketKey: config.ticketKey,
            swimlaneBy: normalizeSwimlaneBy(config.swimlaneBy),
            swimlanes: config.swimlanes,
            swimlaneMigration: config.swimlaneMigration,
            groupBy: normalizeGroupBy(config.groupBy),
          }
        : { title: boardDir, columns: [] },
    [config, boardDir],
  )

  const viewStorageKey = useMemo(
    () =>
      config
        ? boardPersonalViewStorageKey({
            identity: getStoredUsername(),
            workspace: workspaceId,
            board: config.id,
          })
        : '',
    [config, workspaceId],
  )

  useEffect(() => {
    if (!config || !viewStorageKey || loadedViewKey.current === viewStorageKey) return
    loadedViewKey.current = viewStorageKey
    setViewState(
      loadBoardPersonalViewState(
        window.localStorage,
        viewStorageKey,
        boardPersonalViewDefaults(viewConfig),
      ),
    )
  }, [config, viewConfig, viewStorageKey])

  const updateViewState = useCallback(
    (patch: Partial<BoardPersonalViewState>) => {
      setViewState((current) => {
        const next = mergeBoardPersonalViewState(current, patch)
        if (viewStorageKey) saveBoardPersonalViewState(window.localStorage, viewStorageKey, next)
        return next
      })
    },
    [viewStorageKey],
  )

  const actionViewConfig = useMemo<BoardViewConfig>(
    () => ({
      ...viewConfig,
      groupBy: viewState.groupBy ?? viewConfig.groupBy,
      swimlaneBy:
        viewState.swimlaneBy ?? (viewState.groupBy ? undefined : viewConfig.swimlaneBy),
    }),
    [viewConfig, viewState.groupBy, viewState.swimlaneBy],
  )

  // Members → assignee dropdown (web has a member system; desktop stays free text).
  const [members, setMembers] = useState<MemberInfo[]>([])
  useEffect(() => {
    let cancelled = false
    api.listMembers(workspaceId).then((m) => { if (!cancelled) setMembers(m) }).catch(() => {})
    return () => { cancelled = true }
  }, [workspaceId])
  const assigneeOptions = useMemo(() => {
    const memberNames = new Set(members.map((m) => m.username))
    // Keep off-roster assignees (legacy values, removed members, or names typed on
    // desktop's free-text field) both visible and selectable, never silently '—'.
    const extra = [...new Set(cards.map((c) => c.assignee).filter((a): a is string => !!a && !memberNames.has(a)))]
    return [
      ...members.map((m) => ({ value: m.username, label: m.username })),
      ...extra.map((a) => ({ value: a, label: a })),
    ]
  }, [members, cards])
  // Activity timeline derived from the card document's version history. Tag colors
  // ride on each card's tags (resolveTags), so no tag-vocabulary prop is needed —
  // the peek keeps its free-text tag input for adding arbitrary new tags.
  const loadActivity = useCallback(
    async (cardId: string): Promise<BoardActivityEvent[]> => {
      const meta = metaByPath.get(cardId)
      if (!meta) return []
      try {
        return (await api.listCardActivity(workspaceId, meta.id)).events
      } catch (activityError) {
        try {
          const versions = await api.listVersions(workspaceId, meta.id)
          return versions.map((v) => ({
            id: v.id,
            kind: v.parentVersionId ? 'updated' : 'created',
            by: v.authorUsername ?? undefined,
            client: { kind: v.source },
            at: v.createdAt,
          }))
        } catch (versionError) {
          const first = activityError instanceof Error ? activityError.message : String(activityError)
          const fallback = versionError instanceof Error ? versionError.message : String(versionError)
          throw new Error(`Could not load Activity (${first}; fallback: ${fallback})`)
        }
      }
    },
    [workspaceId, metaByPath],
  )

  // Card comments — kept cloud-side, keyed by the card's document id.
  const loadComments = useCallback(
    async (cardId: string): Promise<BoardComment[]> => {
      const meta = metaByPath.get(cardId)
      if (!meta) return []
      return api.listComments(workspaceId, meta.id)
    },
    [workspaceId, metaByPath],
  )
  const addComment = useCallback(
    (cardId: string, body: string, parentId?: string): Promise<BoardComment> => {
      const meta = metaByPath.get(cardId)
      if (!meta) return Promise.reject(new Error('card not found'))
      return api.createComment(workspaceId, meta.id, body, parentId)
    },
    [workspaceId, metaByPath],
  )
  const updateComment = useCallback(
    (commentId: string, body: string): Promise<BoardComment> => api.updateComment(workspaceId, commentId, body),
    [workspaceId],
  )
  const deleteComment = useCallback(
    (commentId: string) => api.deleteComment(workspaceId, commentId),
    [workspaceId],
  )
  const toggleReaction = useCallback(
    (commentId: string, emoji: string): Promise<BoardComment> => api.toggleCommentReaction(workspaceId, commentId, emoji),
    [workspaceId],
  )
  const resolveComment = useCallback(
    (commentId: string, resolved: boolean): Promise<BoardComment> => api.resolveComment(workspaceId, commentId, resolved),
    [workspaceId],
  )

  // Ticket links: fetch the workspace's ticket index, lazily allocating a number
  // for any card that lacks one (allocation is idempotent server-side), then map
  // documents.id → ticket so each card can show an OCCSV-3371 badge.
  useEffect(() => {
    const key = config?.ticketKey
    if (!key) { setTicketByDoc(new Map()); return }
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listTickets(workspaceId)
        const map = new Map(list.map((t) => [t.documentId, t.ticket]))
        if (!readOnlyRef.current) {
          for (const meta of metaByPath.values()) {
            if (cancelled || readOnlyRef.current) break
            if (!map.has(meta.id)) {
              try {
                const t = await api.allocateTicket(workspaceId, { relativePath: meta.relativePath, ticketKey: key })
                if (cancelled || readOnlyRef.current) break
                map.set(meta.id, t.ticket)
              } catch { /* best-effort */ }
            }
          }
        }
        if (!cancelled) setTicketByDoc(map)
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [workspaceId, config?.ticketKey, metaByPath, readOnly])

  const displayCards = useMemo(
    () =>
      cards.map((c) => {
        const docId = metaByPath.get(c.id)?.id
        const ticket = docId ? ticketByDoc.get(docId) : undefined
        return ticket ? { ...c, ticket } : c
      }),
    [cards, metaByPath, ticketByDoc],
  )

  const actions: BoardActions = useMemo(
    () => ({
      refresh: () => load(),
      setConfig: async (patch) => {
        const latest = configRef.current
        if (!latest) return
        await saveBoardConfig({ ...latest, ...patch }, true)
      },
      createCard: async (colKey, title, initial) => {
        if (!config) return
        const laneKey = activeBoardLaneKey(actionViewConfig)
        const targetLane = newCardLaneValue(laneKey, colKey, initial)
        const pos = cards
          .filter((card) => boardLaneValueOf(card, actionViewConfig) === targetLane)
          .reduce((max, card) => Math.max(max, card.position), -1) + 1
        const data: Record<string, string> = {
          title,
          board: config.id,
          status: laneKey === 'status' ? targetLane : config.columns[0]?.key ?? 'todo',
          position: String(pos),
        }
        const content = applyBoardCardPatch(
          applyBoardCardPatch(
            writeFrontmatter('', data),
            cardPatchForLaneValue(laneKey, targetLane),
          ),
          initial ?? {},
        )
        const parsed = parseFrontmatter(content)
        const rel = await createCardDoc(title, parsed.data, parsed.body)
        await load()
        return rel
      },
      updateCard: async (id, patch) => {
        try {
          assertWritable()
          const nextMeta = await saveBoardCardPatch(
            metaByPathRef,
            id,
            patch,
            (request) => api.saveDocument(workspaceId, request),
          )
          if (nextMeta) {
            setMetaByPath(nextMeta)
            const saved = nextMeta.get(id)
            if (saved && config) {
              setCards((current) => current.map((card) =>
                card.id === id
                  ? boardCardFromContent(id, card.title, saved.content, config)
                  : card,
              ))
            }
          }
          setError('')
        } catch (e) {
          await load()
          setError(String(e))
          throw e
        }
      },
      updateCards: async (updates, onProgress) => {
        try {
          const workingMeta = new Map(metaByPathRef.current)
          const missing = updates.find((update) => !workingMeta.has(update.cardId))
          if (missing) {
            throw new Error(`Card metadata is missing for ${missing.cardId}. Refresh and try again.`)
          }
          let completed = 0
          for (const update of updates) {
            assertWritable()
            const meta = workingMeta.get(update.cardId)!
            const content = applyBoardCardPatch(meta.content, update.patch)
            const saved = await api.saveDocument(workspaceId, {
              relativePath: update.cardId,
              content,
              baseContentHash: meta.contentHash,
              baseContent: meta.content,
            })
            workingMeta.set(update.cardId, {
              ...meta,
              content: saved.content,
              contentHash: saved.contentHash,
            })
            metaByPathRef.current = new Map(workingMeta)
            completed += 1
            onProgress?.(completed, updates.length)
          }
          if (completed > 0) {
            metaByPathRef.current = workingMeta
            setMetaByPath(workingMeta)
          }
          await load()
        } catch (e) {
          await load()
          setError(String(e))
          throw e
        }
      },
      moveCard: async (id, toCol, index) => {
        if (!config) return
        const laneKey = activeBoardLaneKey(actionViewConfig)
        const movedMeta = metaByPathRef.current.get(id)
        if (!movedMeta) return
        try {
          if (laneKey !== 'status') {
            const moved = cards.find((c) => c.id === id)
            if (!moved || boardLaneValueOf(moved, actionViewConfig) === toCol) return
            const patched = applyBoardCardPatch(
              movedMeta.content,
              cardPatchForLaneValue(laneKey, toCol),
            )
            const { data, body } = parseFrontmatter(patched)
            await saveCard(id, data, body)
            await load()
            return
          }
          const target = cards.filter((c) => c.columnKey === toCol && c.id !== id).sort((a, b) => a.position - b.position)
          const moved = cards.find((c) => c.id === id)
          if (moved) target.splice(Math.max(0, Math.min(index, target.length)), 0, moved)
          for (let i = 0; i < target.length; i++) {
            assertWritable()
            const c = target[i]
            if (!c) continue
            const meta = metaByPathRef.current.get(c.id)
            if (!meta) continue
            if (c.id !== id && c.position === i && c.columnKey === toCol) continue
            const { data, body } = parseFrontmatter(meta.content)
            await saveCard(c.id, { ...data, status: toCol, position: String(i) }, body)
          }
          await load()
        } catch (e) {
          setError(String(e))
        }
      },
      deleteCard: async (card) => {
        const meta = metaByPathRef.current.get(card.id)
        if (!meta) return
        if (!(await confirm(`Delete card "${card.title}"? It moves to the trash.`, { title: 'Delete card', destructive: true }))) return
        try {
          assertWritable()
          await api.deleteDocument(workspaceId, meta.id)
          await load()
        } catch (e) {
          setError(String(e))
          throw e
        }
      },
      deleteCards: async (cardsToDelete) => {
        if (cardsToDelete.length === 0) return false
        if (!(await confirm(`Delete ${cardsToDelete.length} cards? They move to the trash.`, { title: 'Delete cards', destructive: true }))) return false
        try {
          for (const card of cardsToDelete) {
            assertWritable()
            const meta = metaByPath.get(card.id)
            if (meta) await api.deleteDocument(workspaceId, meta.id)
          }
          await load()
          return true
        } catch (e) {
          await load()
          setError(String(e))
          throw e
        }
      },
      duplicateCard: async (card) => {
        const meta = metaByPath.get(card.id)
        if (!meta || !config) return
        try {
          const { data, body } = parseFrontmatter(meta.content)
          const newTitle = `${card.title} copy`
          const pos = cards.filter((c) => c.columnKey === card.columnKey).reduce((m, c) => Math.max(m, c.position), -1) + 1
          await createCardDoc(newTitle, { ...data, title: newTitle, position: String(pos) }, body)
          await load()
        } catch (e) {
          setError(String(e))
        }
      },
      reorderColumns: async (fromKey, toKey) => {
        const latest = configRef.current
        if (!latest || fromKey === toKey) return
        const cols = [...latest.columns]
        const from = cols.findIndex((c) => c.key === fromKey)
        const to = cols.findIndex((c) => c.key === toKey)
        if (from < 0 || to < 0) return
        const [m] = cols.splice(from, 1)
        if (!m) return
        cols.splice(to, 0, m)
        await saveBoardConfig({ ...latest, columns: cols })
      },
      addColumn: async (name) => {
        const latest = configRef.current
        if (!latest) return
        let key = slugify(name)
        const taken = new Set(latest.columns.map((c) => c.key))
        while (taken.has(key)) key = `${key}-${rand().slice(0, 2)}`
        await saveBoardConfig({ ...latest, columns: [...latest.columns, { key, name }] })
      },
      renameColumn: async (key) => {
        const initial = configRef.current
        if (!initial) return
        const col = initial.columns.find((c) => c.key === key)
        const name = (await prompt('Rename column', col?.name))?.trim()
        if (!name) return
        const latest = configRef.current
        if (!latest?.columns.some((column) => column.key === key)) return
        await saveBoardConfig({ ...latest, columns: latest.columns.map((c) => (c.key === key ? { ...c, name } : c)) })
      },
      deleteColumn: async (key) => {
        const initial = configRef.current
        if (!initial || initial.columns.length <= 1) return
        const col = initial.columns.find((c) => c.key === key)
        const initialFallback = initial.columns.find((c) => c.key !== key)!
        const initialCards = cardsRef.current.filter((c) => c.columnKey === key)
        const msg = initialCards.length > 0 ? `Delete column "${col?.name}"? Its ${initialCards.length} card(s) move to "${initialFallback.name}".` : `Delete column "${col?.name}"?`
        if (!(await confirm(msg, { title: 'Delete column', destructive: true }))) return
        try {
          const latest = configRef.current
          const fallback = latest?.columns.find((c) => c.key !== key)
          if (!latest?.columns.some((c) => c.key === key) || !fallback || fallback.key !== initialFallback.key) {
            throw new Error('Board statuses changed while the confirmation was open. Try again.')
          }
          const inCol = cardsRef.current.filter((c) => c.columnKey === key)
          for (const c of inCol) {
            assertWritable()
            const meta = metaByPathRef.current.get(c.id)
            if (!meta) continue
            const { data, body } = parseFrontmatter(meta.content)
            await saveCard(c.id, { ...data, status: fallback.key }, body)
          }
          assertWritable()
          await saveBoardConfig({ ...latest, columns: latest.columns.filter((c) => c.key !== key) })
        } catch (e) {
          setError(String(e))
        }
      },
      setColumnColor: async (key, color) => {
        const latest = configRef.current
        if (!latest) return
        await saveBoardConfig({ ...latest, columns: latest.columns.map((c) => (c.key === key ? { ...c, color } : c)) })
      },
      setColumnLimit: async (key) => {
        const initial = configRef.current
        if (!initial) return
        const col = initial.columns.find((c) => c.key === key)
        const raw = await prompt('WIP limit (blank to clear)', col?.limit != null ? String(col.limit) : '')
        if (raw === null) return
        const n = parseInt(raw.trim(), 10)
        const limit = raw.trim() === '' || Number.isNaN(n) || n <= 0 ? null : n
        const latest = configRef.current
        if (!latest?.columns.some((column) => column.key === key)) return
        await saveBoardConfig({ ...latest, columns: latest.columns.map((c) => (c.key === key ? { ...c, limit } : c)) })
      },
      toggleDoneColumn: async (key) => {
        const latest = configRef.current
        if (!latest) return
        const doneColumn = (latest.doneColumn ?? DEFAULT_DONE_COLUMN) === key ? undefined : key
        await saveBoardConfig({ ...latest, doneColumn })
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assertWritable, config, actionViewConfig, cards, metaByPath, boardDir, load, saveBoardConfig, saveCard, createCardDoc, prompt, confirm, workspaceId],
  )

  const surfaceActions = useMemo<BoardActions>(() => {
    return guardBoardActions(actions, () => readOnlyRef.current)
  }, [actions])

  return (
    <div className="relative h-full min-h-0">
      <BoardSurface
        config={viewConfig}
        cards={displayCards}
        actions={surfaceActions}
        viewState={viewState}
        onViewStateChange={updateViewState}
        error={error}
        assigneeOptions={assigneeOptions}
        loadActivity={loadActivity}
        loadComments={loadComments}
        addComment={readOnly ? undefined : addComment}
        updateComment={readOnly ? undefined : updateComment}
        deleteComment={readOnly ? undefined : deleteComment}
        toggleReaction={readOnly ? undefined : toggleReaction}
        resolveComment={readOnly ? undefined : resolveComment}
        currentUser={getStoredUsername() ?? undefined}
        onUploadAttachment={readOnly ? undefined : (file) => api.uploadAsset(workspaceId, file).then((a) => a.url)}
        fullscreen={fullscreen}
        onToggleFullscreen={onToggleFullscreen}
        onOpenSettings={readOnly ? undefined : () => setShowBoardSettings(true)}
        renderMarkdownToContainer={renderToContainer}
        renderMarkdownToHtml={renderMarkdownToHtml}
        peekComponent={BoardPeek}
        readOnly={readOnly}
      />
      {showBoardSettings && !readOnly && (
        <BoardSettingsDialog
          workspaceId={workspaceId}
          board={config?.id ?? null}
          boardTitle={config?.title}
          onClose={() => setShowBoardSettings(false)}
        />
      )}
    </div>
  )
}
