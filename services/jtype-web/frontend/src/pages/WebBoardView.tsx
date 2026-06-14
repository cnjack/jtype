import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useConfirm, usePrompt } from '@shared/components/PromptDialogContext'
import { parseFrontmatter, writeFrontmatter } from '@shared/lib/frontmatter'
import { BoardSurface, type BoardActions } from '@shared/components/board'
import { useWorkspaceSocket } from '../hooks/useWorkspaceSocket'
import {
  DEFAULT_DONE_COLUMN,
  bodyExcerpt,
  countTasks,
  parseTagList,
  slugify,
  type BoardViewCard,
  type BoardViewConfig,
} from '@shared/lib/board'
import { api, setSessionId } from '../api'

type CardMeta = { id: string; relativePath: string; content: string; contentHash: string }
type BoardConfigJSON = {
  id: string
  title: string
  groupBy?: string
  columns: { key: string; name: string; color?: string | null; limit?: number | null }[]
  doneColumn?: string
  colorColumns?: boolean
  viewType?: 'board' | 'table'
}

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
}: {
  workspaceId: string
  boardDocId: string
  boardRelativePath: string
}) {
  const prompt = usePrompt()
  const confirm = useConfirm()
  const boardDir = boardRelativePath.replace(/\.board$/i, '')

  const [config, setConfig] = useState<BoardConfigJSON | null>(null)
  const [boardDoc, setBoardDoc] = useState<{ content: string; contentHash: string } | null>(null)
  const [cards, setCards] = useState<BoardViewCard[]>([])
  const [metaByPath, setMetaByPath] = useState<Map<string, CardMeta>>(new Map())
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const boardDocFull = await api.getDocument(workspaceId, boardDocId)
      const cfg = JSON.parse(boardDocFull.content) as BoardConfigJSON
      setConfig(cfg)
      setBoardDoc({ content: boardDocFull.content, contentHash: boardDocFull.contentHash })

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
          due: fm.data.due || null,
          tags: (fm.data.tags ? parseTagList(fm.data.tags) : []).map((label) => ({ label })),
          notes: fm.body,
          taskDone: tasks.done,
          taskTotal: tasks.total,
          excerpt: bodyExcerpt(fm.body),
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
    async (next: BoardConfigJSON) => {
      if (!boardDoc) return
      setConfig(next)
      try {
        const content = JSON.stringify(next, null, 2)
        await api.saveDocument(workspaceId, {
          relativePath: boardRelativePath,
          content,
          baseContentHash: boardDoc.contentHash,
          baseContent: boardDoc.content,
        })
        await load()
      } catch (e) {
        setError(String(e))
      }
    },
    [workspaceId, boardRelativePath, boardDoc, load],
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
    async (title: string, data: Record<string, string>) => {
      let rel = `${boardDir}/${slugify(title)}.md`
      if (metaByPath.has(rel)) rel = `${boardDir}/${slugify(title)}-${rand()}.md`
      await api.saveDocument(workspaceId, { relativePath: rel, content: writeFrontmatter('', data) })
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
            groupBy: (config.groupBy as BoardViewConfig['groupBy']) || 'status',
          }
        : { title: boardDir, columns: [] },
    [config, boardDir],
  )

  const actions: BoardActions = useMemo(
    () => ({
      refresh: () => load(),
      setConfig: async (patch) => {
        if (!config) return
        await saveBoardConfig({ ...config, ...patch })
      },
      createCard: async (colKey, title) => {
        if (!config) return
        const groupKey = config.groupBy || 'status'
        const pos = cards.filter((c) => (groupKey === 'status' ? c.columnKey : groupKey === 'priority' ? c.priority || 'none' : c.assignee || '') === colKey).reduce((m, c) => Math.max(m, c.position), -1) + 1
        const data: Record<string, string> = {
          title,
          board: config.id,
          status: groupKey === 'status' ? colKey : config.columns[0]?.key ?? 'todo',
          position: String(pos),
        }
        if (groupKey !== 'status') data[groupKey] = colKey
        const rel = await createCardDoc(title, data)
        await load()
        return rel
      },
      updateCard: async (id, patch) => {
        const meta = metaByPath.get(id)
        if (!meta) return
        const { data, body } = parseFrontmatter(meta.content)
        const next = { ...data }
        if (patch.title !== undefined) next.title = patch.title
        if (patch.columnKey !== undefined) next.status = patch.columnKey
        if (patch.priority !== undefined) next.priority = patch.priority ?? ''
        if (patch.assignee !== undefined) next.assignee = patch.assignee ?? ''
        if (patch.due !== undefined) next.due = patch.due ?? ''
        if (patch.icon !== undefined) next.icon = patch.icon ?? ''
        if (patch.tags !== undefined) next.tags = patch.tags.map((t) => t.label).join(', ')
        const newBody = patch.notes !== undefined ? patch.notes : body
        try {
          await saveCard(id, next, newBody)
          await load()
        } catch (e) {
          setError(String(e))
        }
      },
      moveCard: async (id, toCol, index) => {
        if (!config) return
        const groupKey = config.groupBy || 'status'
        const movedMeta = metaByPath.get(id)
        if (!movedMeta) return
        try {
          if (groupKey !== 'status') {
            const moved = cards.find((c) => c.id === id)
            const cur = groupKey === 'priority' ? moved?.priority || 'none' : moved?.assignee || ''
            if (cur === toCol) return
            const { data, body } = parseFrontmatter(movedMeta.content)
            await saveCard(id, { ...data, [groupKey]: toCol }, body)
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
      duplicateCard: async (card) => {
        const meta = metaByPath.get(card.id)
        if (!meta || !config) return
        try {
          const { data } = parseFrontmatter(meta.content)
          const newTitle = `${card.title} copy`
          const pos = cards.filter((c) => c.columnKey === card.columnKey).reduce((m, c) => Math.max(m, c.position), -1) + 1
          await createCardDoc(newTitle, { ...data, title: newTitle, position: String(pos) })
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
    <div className="h-full min-h-0">
      <BoardSurface config={viewConfig} cards={cards} actions={actions} error={error} />
    </div>
  )
}
