import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoardSettingsDialog } from '../components/BoardSettingsDialog'
import { useConfirm, usePrompt } from '@shared/components/PromptDialogContext'
import { parseFrontmatter, writeFrontmatter } from '@shared/lib/frontmatter'
import { BoardSurface, BoardPeek, type BoardActions } from '@shared/components/board'
import { useWorkspaceSocket } from '../hooks/useWorkspaceSocket'
import {
  DEFAULT_DONE_COLUMN,
  activeBoardLaneKey,
  applyBoardCardPatch,
  boardLaneValueOf,
  bodyExcerpt,
  cardPatchForLaneValue,
  countTasks,
  parseAttachments,
  parseLinks,
  parseTagList,
  pickCustomFields,
  resolveTags,
  normalizeGroupBy,
  normalizeSwimlaneBy,
  slugify,
  type BoardActivityEvent,
  type BoardComment,
  type BoardViewCard,
  type BoardViewConfig,
  type BoardDocumentConfig,
} from '@shared/lib/board'
import { api, getStoredUsername, setSessionId, type MemberInfo } from '../api'

type CardMeta = { id: string; relativePath: string; content: string; contentHash: string }
type BoardConfigJSON = BoardDocumentConfig

function rand() {
  return Math.random().toString(36).slice(2, 6)
}

/**
 * Web board view backed by the SYNCED MARKDOWN documents — the exact same data
 * as the desktop board. Reads the `.board` JSON config + scans the board folder's
 * card `.md` notes (frontmatter `board:<id>`), and writes edits back through the
 * document API. Renders the shared {@link BoardSurface}, so web == desktop.
 */
export function WebBoardView({
  workspaceId,
  boardDocId,
  boardRelativePath,
  fullscreen,
  onToggleFullscreen,
}: {
  workspaceId: string
  boardDocId: string
  boardRelativePath: string
  fullscreen?: boolean
  onToggleFullscreen?: () => void
}) {
  const prompt = usePrompt()
  const confirm = useConfirm()
  const boardDir = boardRelativePath.replace(/\.board$/i, '')

  const [config, setConfig] = useState<BoardConfigJSON | null>(null)
  const [cards, setCards] = useState<BoardViewCard[]>([])
  const [metaByPath, setMetaByPath] = useState<Map<string, CardMeta>>(new Map())
  const [error, setError] = useState('')
  const [showBoardSettings, setShowBoardSettings] = useState(false)
  const [ticketByDoc, setTicketByDoc] = useState<Map<string, string>>(new Map())
  const configRef = useRef<BoardConfigJSON | null>(null)
  const boardDocRef = useRef<{ content: string; contentHash: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const boardDocFull = await api.getDocument(workspaceId, boardDocId)
      const cfg = JSON.parse(boardDocFull.content) as BoardConfigJSON
      configRef.current = cfg
      setConfig(cfg)
      const nextBoardDoc = { content: boardDocFull.content, contentHash: boardDocFull.contentHash }
      boardDocRef.current = nextBoardDoc

      const list = await api.listDocuments(workspaceId)
      const cardItems = list.filter(
        (d) => d.relativePath.startsWith(`${boardDir}/`) && d.relativePath.toLowerCase().endsWith('.md'),
      )
      const loaded = await Promise.all(cardItems.map((d) => api.getDocument(workspaceId, d.id).then((doc) => ({ item: d, doc }))))

      const nextMeta = new Map<string, CardMeta>()
      const nextCards: BoardViewCard[] = []
      for (const { item, doc } of loaded) {
        const fm = parseFrontmatter(doc.content)
        if (fm.data.board !== cfg.id) continue
        nextMeta.set(doc.relativePath, { id: item.id, relativePath: doc.relativePath, content: doc.content, contentHash: doc.contentHash })
        const tasks = countTasks(fm.body)
        nextCards.push({
          id: doc.relativePath,
          columnKey: fm.data.status || '',
          position: Number(fm.data.position ?? 0),
          title: fm.data.title || doc.title || doc.relativePath,
          icon: fm.data.icon || null,
          priority: fm.data.priority || null,
          assignee: fm.data.assignee || null,
          swimlaneKey: fm.data.swimlane || null,
          due: fm.data.due || null,
          tags: resolveTags(fm.data.tags ? parseTagList(fm.data.tags) : [], cfg.labels),
          notes: fm.body,
          taskDone: tasks.done,
          taskTotal: tasks.total,
          excerpt: bodyExcerpt(fm.body),
          attachments: fm.data.attachments ? parseAttachments(fm.data.attachments) : [],
          custom: pickCustomFields(fm.data, cfg.fields),
          blockedBy: fm.data.blocked_by ? parseLinks(fm.data.blocked_by) : [],
          blocks: fm.data.blocks ? parseLinks(fm.data.blocks) : [],
          relates: fm.data.relates ? parseLinks(fm.data.relates) : [],
          parent: fm.data.parent ? (parseLinks(fm.data.parent)[0] ?? null) : null,
        })
      }
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
  const { sessionId, subscribe } = useWorkspaceSocket(workspaceId)
  useEffect(() => { setSessionId(sessionId) }, [sessionId])
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
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
    [workspaceId, boardRelativePath, load],
  )

  const saveCard = useCallback(
    async (relativePath: string, data: Record<string, string>, body: string) => {
      const meta = metaByPath.get(relativePath)
      const content = writeFrontmatter(body, data)
      await api.saveDocument(workspaceId, {
        relativePath,
        content,
        baseContentHash: meta?.contentHash,
        baseContent: meta?.content,
      })
    },
    [workspaceId, metaByPath],
  )

  const createCardDoc = useCallback(
    async (title: string, data: Record<string, string>, body = '') => {
      let rel = `${boardDir}/${slugify(title)}.md`
      if (metaByPath.has(rel)) rel = `${boardDir}/${slugify(title)}-${rand()}.md`
      await api.saveDocument(workspaceId, { relativePath: rel, content: writeFrontmatter(body, data) })
      return rel
    },
    [workspaceId, boardDir, metaByPath],
  )

  const viewConfig: BoardViewConfig = useMemo(
    () =>
      config
        ? {
            title: config.title || boardDir,
            columns: config.columns,
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
      { value: '', label: '—' },
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
        const versions = await api.listVersions(workspaceId, meta.id)
        // Newest-first; the version with no parent is the card's creation.
        return versions.map((v) => ({
          kind: v.parentVersionId ? 'updated' : 'created',
          // Real author username; omit `by` (rather than show the write-channel
          // token like 'web') when the author user no longer exists.
          by: v.authorUsername ?? undefined,
          at: v.createdAt,
        }))
      } catch {
        return []
      }
    },
    [workspaceId, metaByPath],
  )

  // Card comments — kept cloud-side, keyed by the card's document id.
  const loadComments = useCallback(
    async (cardId: string): Promise<BoardComment[]> => {
      const meta = metaByPath.get(cardId)
      if (!meta) return []
      try {
        return await api.listComments(workspaceId, meta.id)
      } catch {
        return []
      }
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
        for (const meta of metaByPath.values()) {
          if (!map.has(meta.id)) {
            try {
              const t = await api.allocateTicket(workspaceId, { relativePath: meta.relativePath, ticketKey: key })
              map.set(meta.id, t.ticket)
            } catch { /* best-effort */ }
          }
        }
        if (!cancelled) setTicketByDoc(map)
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [workspaceId, config?.ticketKey, metaByPath])

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
      createCard: async (colKey, title) => {
        if (!config) return
        const laneKey = activeBoardLaneKey(config)
        const pos = cards
          .filter((card) => boardLaneValueOf(card, config) === colKey)
          .reduce((max, card) => Math.max(max, card.position), -1) + 1
        const data: Record<string, string> = {
          title,
          board: config.id,
          status: laneKey === 'status' ? colKey : config.columns[0]?.key ?? 'todo',
          position: String(pos),
        }
        const content = applyBoardCardPatch(
          writeFrontmatter('', data),
          cardPatchForLaneValue(laneKey, colKey),
        )
        const rel = await createCardDoc(title, parseFrontmatter(content).data)
        await load()
        return rel
      },
      updateCard: async (id, patch) => {
        const meta = metaByPath.get(id)
        if (!meta) return
        try {
          await api.saveDocument(workspaceId, {
            relativePath: id,
            content: applyBoardCardPatch(meta.content, patch),
            baseContentHash: meta.contentHash,
            baseContent: meta.content,
          })
          await load()
        } catch (e) {
          setError(String(e))
        }
      },
      updateCards: async (updates, onProgress) => {
        try {
          const workingMeta = new Map(metaByPath)
          const missing = updates.find((update) => !workingMeta.has(update.cardId))
          if (missing) {
            throw new Error(`Card metadata is missing for ${missing.cardId}. Refresh and try again.`)
          }
          let completed = 0
          for (const update of updates) {
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
              content,
              contentHash: saved.contentHash,
            })
            completed += 1
            onProgress?.(completed, updates.length)
          }
          if (completed > 0) setMetaByPath(workingMeta)
          await load()
        } catch (e) {
          await load()
          setError(String(e))
          throw e
        }
      },
      moveCard: async (id, toCol, index) => {
        if (!config) return
        const laneKey = activeBoardLaneKey(config)
        const movedMeta = metaByPath.get(id)
        if (!movedMeta) return
        try {
          if (laneKey !== 'status') {
            const moved = cards.find((c) => c.id === id)
            if (!moved || boardLaneValueOf(moved, config) === toCol) return
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
            const c = target[i]
            if (!c) continue
            const meta = metaByPath.get(c.id)
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
        const meta = metaByPath.get(card.id)
        if (!meta) return
        if (!(await confirm(`Delete card "${card.title}"? It moves to the trash.`, { title: 'Delete card', destructive: true }))) return
        try {
          await api.deleteDocument(workspaceId, meta.id)
          await load()
        } catch (e) {
          setError(String(e))
        }
      },
      deleteCards: async (cardsToDelete) => {
        if (cardsToDelete.length === 0) return
        if (!(await confirm(`Delete ${cardsToDelete.length} cards? They move to the trash.`, { title: 'Delete cards', destructive: true }))) return
        try {
          for (const card of cardsToDelete) {
            const meta = metaByPath.get(card.id)
            if (meta) await api.deleteDocument(workspaceId, meta.id)
          }
          await load()
        } catch (e) {
          setError(String(e))
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
        if (!config || fromKey === toKey) return
        const cols = [...config.columns]
        const from = cols.findIndex((c) => c.key === fromKey)
        const to = cols.findIndex((c) => c.key === toKey)
        if (from < 0 || to < 0) return
        const [m] = cols.splice(from, 1)
        if (!m) return
        cols.splice(to, 0, m)
        await saveBoardConfig({ ...config, columns: cols })
      },
      addColumn: async (name) => {
        if (!config) return
        let key = slugify(name)
        const taken = new Set(config.columns.map((c) => c.key))
        while (taken.has(key)) key = `${key}-${rand().slice(0, 2)}`
        await saveBoardConfig({ ...config, columns: [...config.columns, { key, name }] })
      },
      renameColumn: async (key) => {
        if (!config) return
        const col = config.columns.find((c) => c.key === key)
        const name = (await prompt('Rename column', col?.name))?.trim()
        if (!name) return
        await saveBoardConfig({ ...config, columns: config.columns.map((c) => (c.key === key ? { ...c, name } : c)) })
      },
      deleteColumn: async (key) => {
        if (!config || config.columns.length <= 1) return
        const col = config.columns.find((c) => c.key === key)
        const fallback = config.columns.find((c) => c.key !== key)!
        const inCol = cards.filter((c) => c.columnKey === key)
        const msg = inCol.length > 0 ? `Delete column "${col?.name}"? Its ${inCol.length} card(s) move to "${fallback.name}".` : `Delete column "${col?.name}"?`
        if (!(await confirm(msg, { title: 'Delete column', destructive: true }))) return
        try {
          for (const c of inCol) {
            const meta = metaByPath.get(c.id)
            if (!meta) continue
            const { data, body } = parseFrontmatter(meta.content)
            await saveCard(c.id, { ...data, status: fallback.key }, body)
          }
          await saveBoardConfig({ ...config, columns: config.columns.filter((c) => c.key !== key) })
        } catch (e) {
          setError(String(e))
        }
      },
      setColumnColor: async (key, color) => {
        if (!config) return
        await saveBoardConfig({ ...config, columns: config.columns.map((c) => (c.key === key ? { ...c, color } : c)) })
      },
      setColumnLimit: async (key) => {
        if (!config) return
        const col = config.columns.find((c) => c.key === key)
        const raw = await prompt('WIP limit (blank to clear)', col?.limit != null ? String(col.limit) : '')
        if (raw === null) return
        const n = parseInt(raw.trim(), 10)
        const limit = raw.trim() === '' || Number.isNaN(n) || n <= 0 ? null : n
        await saveBoardConfig({ ...config, columns: config.columns.map((c) => (c.key === key ? { ...c, limit } : c)) })
      },
      toggleDoneColumn: async (key) => {
        if (!config) return
        const doneColumn = (config.doneColumn ?? DEFAULT_DONE_COLUMN) === key ? undefined : key
        await saveBoardConfig({ ...config, doneColumn })
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, cards, metaByPath, boardDir, load, saveBoardConfig, saveCard, createCardDoc, prompt, confirm, workspaceId],
  )

  return (
    <div className="relative h-full min-h-0">
      <BoardSurface
        config={viewConfig}
        cards={displayCards}
        actions={actions}
        error={error}
        assigneeOptions={assigneeOptions}
        loadActivity={loadActivity}
        loadComments={loadComments}
        addComment={addComment}
        updateComment={updateComment}
        deleteComment={deleteComment}
        toggleReaction={toggleReaction}
        resolveComment={resolveComment}
        currentUser={getStoredUsername() ?? undefined}
        onUploadAttachment={(file) => api.uploadAsset(workspaceId, file).then((a) => a.url)}
        fullscreen={fullscreen}
        onToggleFullscreen={onToggleFullscreen}
        onOpenSettings={() => setShowBoardSettings(true)}
        peekComponent={BoardPeek}
      />
      {showBoardSettings && (
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
