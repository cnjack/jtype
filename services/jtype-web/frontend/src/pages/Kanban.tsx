import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Dialog, DialogPanel, Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import { PlusIcon, EllipsisHorizontalIcon, TrashIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, TagIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import {
  api,
  setSessionId,
  getStoredUsername,
  isKanbanConflict,
  type KanbanBoardSummary,
  type KanbanBoardFull,
  type KanbanLabel,
  type KanbanTrashItem,
  type KanbanPriority,
  type UpdateKanbanCardRequest,
  type MemberInfo,
} from '../api'
import { useConfirm, usePrompt } from '@shared/components/PromptDialogContext'
import { BoardSurface, type BoardActions } from '@shared/components/board'
import { countTasks, bodyExcerpt, type BoardViewCard, type BoardViewConfig } from '@shared/lib/board'
import { useWorkspaceSocket } from '../hooks/useWorkspaceSocket'

const VIEW_KEY = (boardId: string) => `kanban-view:${boardId}`

/**
 * Web adapter for the shared {@link BoardSurface}: the same board experience as
 * the desktop, backed by the REST kanban API + realtime websocket. View settings
 * (group-by/sort/view-type/colors) live in localStorage; data lives on the server.
 */
export function Kanban() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const prompt = usePrompt()

  const [boards, setBoards] = useState<KanbanBoardSummary[]>([])
  const [boardId, setBoardId] = useState<string | null>(null)
  const [board, setBoard] = useState<KanbanBoardFull | null>(null)
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showLabels, setShowLabels] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [view, setView] = useState<Partial<BoardViewConfig>>({})

  const { sessionId: wsSessionId, subscribe: wsSubscribe, status: wsStatus } = useWorkspaceSocket(workspaceId)
  useEffect(() => { setSessionId(wsSessionId) }, [wsSessionId])

  // ── data loading ──
  const loadBoards = useCallback(async () => {
    if (!workspaceId) return
    const list = await api.kanban.listBoards(workspaceId)
    setBoards(list)
    setBoardId(prev => prev ?? list[0]?.id ?? null)
    return list
  }, [workspaceId])

  const loadBoard = useCallback(async (id: string) => {
    if (!workspaceId) return
    setBoard(await api.kanban.getBoard(workspaceId, id))
  }, [workspaceId])

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    Promise.all([loadBoards(), workspaceId ? api.listMembers(workspaceId).catch(() => []) : []])
      .then(([, mem]) => { if (!cancelled) setMembers(mem as MemberInfo[]) })
      .catch(err => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loadBoards, workspaceId])

  useEffect(() => {
    if (!boardId) { setBoard(null); return }
    loadBoard(boardId).catch(err => setError(String(err)))
    try { setView(JSON.parse(localStorage.getItem(VIEW_KEY(boardId)) || '{}')) } catch { setView({}) }
  }, [boardId, loadBoard])

  // ── realtime: refetch the open board on any kanban:* event ──
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const unsub = wsSubscribe((ev: { type?: string }) => {
      if (!ev.type || !ev.type.startsWith('kanban:')) return
      if (refetchTimer.current) clearTimeout(refetchTimer.current)
      refetchTimer.current = setTimeout(() => {
        loadBoards().catch(() => {})
        if (boardId) loadBoard(boardId).catch(() => {})
      }, 150)
    })
    return () => { unsub(); if (refetchTimer.current) clearTimeout(refetchTimer.current) }
  }, [wsSubscribe, boardId, loadBoard, loadBoards])

  const reload = useCallback(() => {
    loadBoards().catch(() => {})
    if (boardId) loadBoard(boardId).catch(err => setError(String(err)))
  }, [loadBoards, loadBoard, boardId])

  async function createBoard() {
    if (!workspaceId) return
    const name = (await prompt('New board name'))?.trim(); if (!name) return
    try { const created = await api.kanban.createBoard(workspaceId, { name }); await loadBoards(); setBoardId(created.id) } catch (err) { setError(String(err)) }
  }
  async function renameBoard() {
    if (!workspaceId || !board) return
    const name = (await prompt('Rename board'))?.trim(); if (!name) return
    try { await api.kanban.patchBoard(workspaceId, board.id, { name }); reload() } catch (err) { setError(String(err)) }
  }
  async function deleteBoard() {
    if (!workspaceId || !board) return
    if (!(await confirm(`Delete board "${board.name}" and all its cards? This cannot be undone.`, { title: 'Delete board', destructive: true }))) return
    try { await api.kanban.deleteBoard(workspaceId, board.id); setBoardId(null); setBoard(null); await loadBoards() } catch (err) { setError(String(err)) }
  }

  // ── normalization (REST → shared model) ──
  const memberName = useCallback((uid: string | null) => (uid ? members.find(m => m.userId === uid)?.username ?? uid : null), [members])
  const memberIdByName = useMemo(() => new Map(members.map(m => [m.username, m.userId])), [members])
  const rawCardById = useMemo(() => new Map((board?.cards ?? []).map(c => [c.id, c])), [board])

  const cards: BoardViewCard[] = useMemo(() => {
    if (!board) return []
    const labelById = new Map(board.labels.map(l => [l.id, l]))
    return board.cards
      .filter(c => !c.archivedAt)
      .map(c => {
        const tasks = countTasks(c.description ?? '')
        return {
          id: c.id,
          columnKey: c.columnId,
          position: c.position,
          title: c.title,
          icon: (c.propertiesExtra && typeof c.propertiesExtra === 'object' ? (c.propertiesExtra as Record<string, unknown>).icon : null) as string | null,
          priority: c.priority,
          assignee: memberName(c.assigneeUserId),
          due: c.dueAt ? c.dueAt.slice(0, 10) : null,
          tags: c.labelIds.map(id => { const l = labelById.get(id); return { id, label: l?.name ?? id, color: l?.color } }),
          notes: c.description ?? '',
          taskDone: tasks.done,
          taskTotal: tasks.total,
          excerpt: bodyExcerpt(c.description ?? ''),
        }
      })
  }, [board, memberName])

  const viewConfig: BoardViewConfig = useMemo(
    () =>
      board
        ? {
            title: board.name,
            columns: board.columns.slice().sort((a, b) => a.position - b.position).map(c => ({ key: c.id, name: c.name, color: c.color, limit: c.wipLimit })),
            groupBy: (view.groupBy as BoardViewConfig['groupBy']) ?? 'status',
            viewType: view.viewType ?? 'board',
            colorColumns: view.colorColumns,
            doneColumn: view.doneColumn,
          }
        : { title: '', columns: [] },
    [board, view],
  )

  const assigneeOptions = useMemo(
    () => [{ value: '', label: '—' }, ...members.map(m => ({ value: m.username, label: m.username }))],
    [members],
  )
  const tagOptions = useMemo(() => (board?.labels ?? []).map(l => ({ id: l.id, label: l.name, color: l.color })), [board])

  const setConfig = useCallback(
    (patch: Partial<BoardViewConfig>) => {
      setView(prev => {
        const next = { ...prev, ...patch }
        if (boardId) localStorage.setItem(VIEW_KEY(boardId), JSON.stringify(next))
        return next
      })
    },
    [boardId],
  )

  const doMove = useCallback(
    async (id: string, toCol: string, index: number) => {
      if (!workspaceId || !board) return
      const raw = rawCardById.get(id)
      if (!raw) return
      const groupKey = view.groupBy ?? 'status'
      try {
        if (groupKey === 'priority') {
          if (raw.priority === (toCol || 'none')) return
          const res = await api.kanban.patchCard(workspaceId, id, { priority: (toCol || 'none') as KanbanPriority, baseUpdatedClock: raw.updatedClock })
          if (isKanbanConflict(res)) setError('Card changed elsewhere — reloaded latest.')
        } else if (groupKey === 'assignee') {
          const uid = toCol ? memberIdByName.get(toCol) ?? null : null
          if (raw.assigneeUserId === uid) return
          const res = await api.kanban.patchCard(workspaceId, id, { assigneeUserId: uid, baseUpdatedClock: raw.updatedClock })
          if (isKanbanConflict(res)) setError('Card changed elsewhere — reloaded latest.')
        } else {
          const count = board.cards.filter(c => c.columnId === toCol && !c.archivedAt && c.id !== id).length
          const res = await api.kanban.moveCard(workspaceId, board.id, {
            cardId: id,
            targetColumnId: toCol,
            targetPosition: Math.max(0, Math.min(index, count)),
            baseUpdatedClock: raw.updatedClock,
          })
          if (isKanbanConflict(res)) setError('Card changed elsewhere — reloaded latest.')
        }
        reload()
      } catch (e) { setError(String(e)) }
    },
    [workspaceId, board, rawCardById, view.groupBy, memberIdByName, reload],
  )

  const columnIds = useMemo(() => board?.columns.slice().sort((a, b) => a.position - b.position).map(c => c.id) ?? [], [board])

  const actions: BoardActions = useMemo(
    () => ({
      refresh: () => reload(),
      setConfig,
      moveCard: doMove,
      createCard: async (colKey, title) => {
        if (!workspaceId || !board) return
        const groupKey = view.groupBy ?? 'status'
        const columnId = groupKey === 'status' ? colKey : columnIds[0]
        if (!columnId) return
        try {
          const created = await api.kanban.createCard(workspaceId, board.id, {
            columnId,
            title,
            priority: groupKey === 'priority' ? ((colKey || 'none') as KanbanPriority) : undefined,
            assigneeUserId: groupKey === 'assignee' && colKey ? memberIdByName.get(colKey) ?? undefined : undefined,
          })
          reload()
          return created.id
        } catch (e) { setError(String(e)) }
      },
      updateCard: async (id, patch) => {
        if (!workspaceId || !board) return
        const raw = rawCardById.get(id)
        if (!raw) return
        if (patch.columnKey !== undefined && patch.columnKey !== raw.columnId) {
          await doMove(id, patch.columnKey, Number.MAX_SAFE_INTEGER)
          return
        }
        const body: UpdateKanbanCardRequest = { baseUpdatedClock: raw.updatedClock }
        if (patch.title !== undefined) body.title = patch.title
        if (patch.priority !== undefined) body.priority = (patch.priority || 'none') as KanbanPriority
        if (patch.assignee !== undefined) body.assigneeUserId = patch.assignee ? memberIdByName.get(patch.assignee) ?? null : null
        if (patch.due !== undefined) body.dueAt = patch.due ? `${patch.due} 00:00:00` : null
        if (patch.tags !== undefined) body.labelIds = patch.tags.map(t => t.id).filter(Boolean) as string[]
        if (patch.notes !== undefined) body.description = patch.notes
        if (patch.icon !== undefined) {
          const cur = raw.propertiesExtra && typeof raw.propertiesExtra === 'object' ? { ...(raw.propertiesExtra as Record<string, unknown>) } : {}
          if (patch.icon) cur.icon = patch.icon
          else delete cur.icon
          body.propertiesExtra = cur
        }
        try {
          const res = await api.kanban.patchCard(workspaceId, id, body)
          if (isKanbanConflict(res)) setError('Card changed elsewhere — reloaded latest.')
          reload()
        } catch (e) { setError(String(e)) }
      },
      deleteCard: async (card) => {
        if (!workspaceId) return
        if (!(await confirm(`Archive card "${card.title}"? You can restore it from Archived cards.`, { title: 'Archive card' }))) return
        try { await api.kanban.archiveCard(workspaceId, card.id); reload() } catch (e) { setError(String(e)) }
      },
      duplicateCard: async (card) => {
        if (!workspaceId || !board) return
        const raw = rawCardById.get(card.id)
        if (!raw) return
        try {
          await api.kanban.createCard(workspaceId, board.id, {
            columnId: raw.columnId,
            title: `${raw.title} copy`,
            description: raw.description ?? undefined,
            priority: raw.priority,
            dueAt: raw.dueAt ?? undefined,
            assigneeUserId: raw.assigneeUserId ?? undefined,
            labelIds: raw.labelIds,
            propertiesExtra: (raw.propertiesExtra as Record<string, unknown> | null) ?? undefined,
          })
          reload()
        } catch (e) { setError(String(e)) }
      },
      reorderColumns: async (fromKey, toKey) => {
        if (!workspaceId || !board || fromKey === toKey) return
        const ids = [...columnIds]
        const from = ids.indexOf(fromKey)
        const to = ids.indexOf(toKey)
        if (from < 0 || to < 0) return
        const [m] = ids.splice(from, 1)
        if (m === undefined) return
        ids.splice(to, 0, m)
        try { await api.kanban.reorderColumns(workspaceId, board.id, ids); reload() } catch (e) { setError(String(e)) }
      },
      addColumn: async (name) => {
        if (!workspaceId || !board) return
        try { await api.kanban.createColumn(workspaceId, board.id, { name }); reload() } catch (e) { setError(String(e)) }
      },
      renameColumn: async (key) => {
        if (!workspaceId || !board) return
        const col = board.columns.find(c => c.id === key)
        const name = (await prompt('Rename column', col?.name))?.trim(); if (!name) return
        try { await api.kanban.patchColumn(workspaceId, key, { name }); reload() } catch (e) { setError(String(e)) }
      },
      setColumnColor: async (key, color) => {
        if (!workspaceId) return
        try { await api.kanban.patchColumn(workspaceId, key, { color }); reload() } catch (e) { setError(String(e)) }
      },
      setColumnLimit: async (key) => {
        if (!workspaceId || !board) return
        const col = board.columns.find(c => c.id === key)
        const raw = await prompt('WIP limit (blank to clear)', col?.wipLimit != null ? String(col.wipLimit) : '')
        if (raw === null) return
        const n = parseInt(raw.trim(), 10)
        const wipLimit = raw.trim() === '' || Number.isNaN(n) || n <= 0 ? null : n
        try { await api.kanban.patchColumn(workspaceId, key, { wipLimit }); reload() } catch (e) { setError(String(e)) }
      },
      toggleDoneColumn: (key) => {
        setConfig({ doneColumn: (view.doneColumn ?? 'done') === key ? undefined : key })
      },
    }),
    [workspaceId, board, view.groupBy, view.doneColumn, columnIds, rawCardById, memberIdByName, doMove, reload, setConfig, prompt, confirm],
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#fbfdfb]">
      {/* board chrome */}
      <div className="flex min-h-[48px] flex-wrap items-center justify-between gap-3 border-b border-black/[0.04] bg-white/60 px-5 py-1.5 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Menu as="div" className="relative">
            <MenuButton className="sidebar-action max-w-[16rem]">
              <span className="truncate">{board ? board.name : 'Select board'}</span>
              <ChevronDownIcon className="ml-1 h-4 w-4 shrink-0" />
            </MenuButton>
            <MenuItems className="absolute z-20 mt-1 max-h-80 w-64 overflow-auto rounded-xl border border-black/[0.06] bg-white p-1 shadow-lg focus:outline-none">
              {boards.length === 0 && <div className="px-3 py-2 text-sm text-zinc-400">No boards yet</div>}
              {boards.map(b => (
                <MenuItem key={b.id}>
                  <button onClick={() => setBoardId(b.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm data-[focus]:bg-brand-soft ${b.id === boardId ? 'font-semibold text-brand-dark' : 'text-zinc-700'}`}>
                    <span className="truncate">{b.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-zinc-400">{b.cardCount}</span>
                  </button>
                </MenuItem>
              ))}
              <div className="my-1 border-t border-black/[0.05]" />
              <MenuItem>
                <button onClick={createBoard} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-brand data-[focus]:bg-brand-soft">
                  <PlusIcon className="h-4 w-4" /> New board
                </button>
              </MenuItem>
            </MenuItems>
          </Menu>
          <span className={`inline-block h-2 w-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400' : wsStatus === 'connecting' ? 'bg-amber-400' : 'bg-zinc-300'}`} title={`Realtime: ${wsStatus}`} />
        </div>
        {board && (
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowLabels(true)} className="sidebar-action" title="Manage labels"><TagIcon className="h-4 w-4" /></button>
            <button onClick={() => setShowTrash(true)} className="sidebar-action" title="Archived cards"><ArchiveBoxIcon className="h-4 w-4" /></button>
            <Menu as="div" className="relative">
              <MenuButton className="sidebar-action px-2"><EllipsisHorizontalIcon className="h-4 w-4" /></MenuButton>
              <MenuItems className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-black/[0.06] bg-white p-1 shadow-lg focus:outline-none">
                <MenuItem><button onClick={renameBoard} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 data-[focus]:bg-brand-soft">Rename board</button></MenuItem>
                <MenuItem><button onClick={deleteBoard} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 data-[focus]:bg-red-50">Delete board</button></MenuItem>
              </MenuItems>
            </Menu>
          </div>
        )}
      </div>

      {!board ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-zinc-500">No board selected.</p>
          <button onClick={createBoard} className="sidebar-action"><PlusIcon className="h-4 w-4" /><span className="ml-1.5">Create a board</span></button>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <BoardSurface
            config={viewConfig}
            cards={cards}
            actions={actions}
            error={error}
            assigneeOptions={assigneeOptions}
            tagOptions={tagOptions}
            currentUser={getStoredUsername() ?? undefined}
            loadComments={workspaceId ? (cardId) => api.kanban.listComments(workspaceId, cardId) : undefined}
            addComment={workspaceId ? (cardId, body) => api.kanban.createComment(workspaceId, cardId, body) : undefined}
            deleteComment={workspaceId ? (commentId) => api.kanban.deleteComment(workspaceId, commentId) : undefined}
          />
        </div>
      )}

      {showLabels && board && workspaceId && (
        <LabelManagerDialog workspaceId={workspaceId} boardId={board.id} labels={board.labels} onClose={() => setShowLabels(false)} onChanged={reload} />
      )}
      {showTrash && board && workspaceId && (
        <TrashDialog workspaceId={workspaceId} boardId={board.id} onClose={() => setShowTrash(false)} onChanged={reload} />
      )}

      <button onClick={() => navigate(`/workspaces/${workspaceId}`)} className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 shadow ring-1 ring-black/[0.05] hover:text-brand">
        ← Workspace
      </button>
    </div>
  )
}

// ── Labels manager ──
function LabelManagerDialog(props: { workspaceId: string; boardId: string; labels: KanbanLabel[]; onClose: () => void; onChanged: () => void }) {
  const { workspaceId, boardId, labels, onClose, onChanged } = props
  const confirm = useConfirm()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#10b981')
  const [err, setErr] = useState('')

  async function add() {
    if (!name.trim()) return
    try { await api.kanban.createLabel(workspaceId, boardId, { name: name.trim(), color }); setName(''); onChanged() } catch (e) { setErr(String(e)) }
  }
  async function remove(id: string) {
    if (!(await confirm('Delete this label? It will be removed from all cards.', { title: 'Delete label', destructive: true }))) return
    try { await api.kanban.deleteLabel(workspaceId, id); onChanged() } catch (e) { setErr(String(e)) }
  }

  return (
    <Dialog open onClose={onClose} className="relative z-30">
      <div className="fixed inset-0 bg-black/20" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-800">Labels</h2>
            <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-zinc-400 hover:text-zinc-700" /></button>
          </div>
          <div className="space-y-1.5">
            {labels.map(l => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50">
                <span className="h-3 w-3 rounded-full" style={{ background: l.color }} />
                <span className="flex-1 text-sm text-zinc-700">{l.name}</span>
                <button onClick={() => remove(l.id)} className="text-zinc-300 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
              </div>
            ))}
            {labels.length === 0 && <p className="px-2 py-1 text-xs text-zinc-400">No labels yet.</p>}
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-black/[0.05] pt-3">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded border border-black/[0.08]" />
            <input className="flex-1 rounded-lg border border-black/[0.08] px-2 py-1.5 text-sm focus:border-brand focus:outline-none" value={name} placeholder="Label name" onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
            <button onClick={add} className="sidebar-action shrink-0"><PlusIcon className="h-4 w-4" /></button>
          </div>
          {err && <p className="mt-2 text-xs font-medium text-red-600">{err}</p>}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

// ── Archived cards (trash) ──
function TrashDialog(props: { workspaceId: string; boardId: string; onClose: () => void; onChanged: () => void }) {
  const { workspaceId, boardId, onClose, onChanged } = props
  const [items, setItems] = useState<KanbanTrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.kanban.listTrash(workspaceId, boardId).then(setItems).catch(e => setErr(String(e))).finally(() => setLoading(false))
  }, [workspaceId, boardId])
  useEffect(() => { load() }, [load])

  async function restore(cardId: string) {
    try { await api.kanban.restoreCard(workspaceId, cardId); load(); onChanged() } catch (e) { setErr(String(e)) }
  }

  return (
    <Dialog open onClose={onClose} className="relative z-30">
      <div className="fixed inset-0 bg-black/20" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-800">Archived cards</h2>
            <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-zinc-400 hover:text-zinc-700" /></button>
          </div>
          {loading ? (
            <p className="py-6 text-center text-xs text-zinc-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-400">No archived cards.</p>
          ) : (
            <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
              {items.map(it => (
                <div key={it.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-700">{it.title}</p>
                    <p className="text-[11px] text-zinc-400">archived {it.archivedAt.slice(0, 10)} · expires {it.expiresAt.slice(0, 10)}</p>
                  </div>
                  <button onClick={() => restore(it.cardId)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand hover:bg-brand-soft">
                    <ArrowUturnLeftIcon className="h-3.5 w-3.5" />Restore
                  </button>
                </div>
              ))}
            </div>
          )}
          {err && <p className="mt-2 text-xs font-medium text-red-600">{err}</p>}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
