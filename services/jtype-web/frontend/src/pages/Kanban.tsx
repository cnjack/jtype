import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Dialog, DialogPanel, Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import {
  PlusIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  TagIcon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import {
  api,
  setSessionId,
  isKanbanConflict,
  type KanbanBoardSummary,
  type KanbanBoardFull,
  type KanbanColumn,
  type KanbanCard,
  type KanbanLabel,
  type KanbanTrashItem,
  type KanbanPriority,
  type MemberInfo,
} from '../api'
import { useConfirm, usePrompt } from '@shared/components/PromptDialogContext'
import { useWorkspaceSocket } from '../hooks/useWorkspaceSocket'

// ── priority presentation ──
const PRIORITIES: { value: KanbanPriority; label: string; dot: string; chip: string }[] = [
  { value: 'none', label: 'None', dot: 'bg-zinc-300', chip: 'bg-zinc-100 text-zinc-500' },
  { value: 'low', label: 'Low', dot: 'bg-sky-400', chip: 'bg-sky-50 text-sky-600' },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-700' },
  { value: 'high', label: 'High', dot: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700' },
  { value: 'urgent', label: 'Urgent', dot: 'bg-red-500', chip: 'bg-red-50 text-red-700' },
]
function priorityMeta(p: KanbanPriority) {
  return PRIORITIES.find(x => x.value === p) ?? PRIORITIES[0]!
}

function dueLabel(dueAt: string | null): { text: string; overdue: boolean } | null {
  if (!dueAt) return null
  const d = new Date(dueAt.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return { text: dueAt, overdue: false }
  const overdue = d.getTime() < Date.now()
  const text = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return { text, overdue }
}

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
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(false)
  const [showTrash, setShowTrash] = useState(false)

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
    const full = await api.kanban.getBoard(workspaceId, id)
    setBoard(full)
  }, [workspaceId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([loadBoards(), workspaceId ? api.listMembers(workspaceId).catch(() => []) : []])
      .then(([, mem]) => { if (!cancelled) setMembers(mem as MemberInfo[]) })
      .catch(err => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loadBoards, workspaceId])

  useEffect(() => {
    if (boardId) loadBoard(boardId).catch(err => setError(String(err)))
    else setBoard(null)
  }, [boardId, loadBoard])

  // ── realtime: refetch the open board on any kanban:* event ──
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const unsub = wsSubscribe((ev: { type?: string; boardId?: string }) => {
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

  // ── board actions ──
  async function createBoard() {
    if (!workspaceId) return
    const name = (await prompt('New board name'))?.trim()
    if (!name) return
    try {
      const created = await api.kanban.createBoard(workspaceId, { name })
      await loadBoards()
      setBoardId(created.id)
    } catch (err) { setError(String(err)) }
  }

  async function deleteBoard() {
    if (!workspaceId || !board) return
    const ok = await confirm(`Delete board "${board.name}" and all its cards? This cannot be undone.`, { title: 'Delete board', destructive: true })
    if (!ok) return
    try {
      await api.kanban.deleteBoard(workspaceId, board.id)
      setBoardId(null)
      setBoard(null)
      await loadBoards()
    } catch (err) { setError(String(err)) }
  }

  async function renameBoard() {
    if (!workspaceId || !board) return
    const name = (await prompt('Rename board'))?.trim()
    if (!name) return
    try { await api.kanban.patchBoard(workspaceId, board.id, { name }); reload() } catch (err) { setError(String(err)) }
  }

  async function addColumn() {
    if (!workspaceId || !board) return
    const name = (await prompt('New column name'))?.trim()
    if (!name) return
    try { await api.kanban.createColumn(workspaceId, board.id, { name }); reload() } catch (err) { setError(String(err)) }
  }

  // ── card move (HTML5 drag-drop) ──
  const dragCardId = useRef<string | null>(null)
  const moveCard = useCallback(async (cardId: string, targetColumnId: string, targetPosition: number) => {
    if (!workspaceId || !board) return
    const card = board.cards.find(c => c.id === cardId)
    if (!card) return
    if (card.columnId === targetColumnId && card.position === targetPosition) return
    try {
      const res = await api.kanban.moveCard(workspaceId, board.id, {
        cardId,
        targetColumnId,
        targetPosition,
        baseUpdatedClock: card.updatedClock,
      })
      if (isKanbanConflict(res)) {
        setError('Card changed elsewhere — reloaded latest.')
      }
      reload()
    } catch (err) { setError(String(err)) }
  }, [workspaceId, board, reload])

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, KanbanCard[]>()
    if (board) {
      for (const col of board.columns) map.set(col.id, [])
      for (const c of board.cards) {
        if (c.archivedAt) continue
        if (!map.has(c.columnId)) map.set(c.columnId, [])
        map.get(c.columnId)!.push(c)
      }
      for (const list of map.values()) list.sort((a, b) => a.position - b.position)
    }
    return map
  }, [board])

  const openCard = board?.cards.find(c => c.id === openCardId) ?? null

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#fbfdfb]">
      {/* toolbar */}
      <div className="flex min-h-[56px] flex-wrap items-center justify-between gap-3 border-b border-black/[0.04] bg-white/60 px-5 py-2 backdrop-blur-xl">
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
                  <button
                    onClick={() => setBoardId(b.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm data-[focus]:bg-brand-soft ${b.id === boardId ? 'font-semibold text-brand-dark' : 'text-zinc-700'}`}
                  >
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

          <span
            className={`inline-block h-2 w-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400' : wsStatus === 'connecting' ? 'bg-amber-400' : 'bg-zinc-300'}`}
            title={`Realtime: ${wsStatus}`}
          />
        </div>

        {board && (
          <div className="flex items-center gap-1.5">
            <button onClick={addColumn} className="sidebar-action" title="Add column">
              <PlusIcon className="h-4 w-4" /><span className="ml-1.5">Column</span>
            </button>
            <button onClick={() => setShowLabels(true)} className="sidebar-action" title="Manage labels">
              <TagIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setShowTrash(true)} className="sidebar-action" title="Archived cards">
              <ArchiveBoxIcon className="h-4 w-4" />
            </button>
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

      {error && (
        <div className="flex items-center justify-between gap-3 bg-red-50 px-5 py-2 text-xs font-medium text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      {/* board body */}
      {!board ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-zinc-500">No board selected.</p>
          <button onClick={createBoard} className="sidebar-action"><PlusIcon className="h-4 w-4" /><span className="ml-1.5">Create a board</span></button>
        </div>
      ) : (
        <div className="flex flex-1 items-start gap-4 overflow-x-auto p-5">
          {board.columns.slice().sort((a, b) => a.position - b.position).map(col => (
            <BoardColumn
              key={col.id}
              workspaceId={workspaceId!}
              column={col}
              cards={cardsByColumn.get(col.id) ?? []}
              labels={board.labels}
              members={members}
              onOpenCard={setOpenCardId}
              onCreated={reload}
              onDropCard={(pos) => { if (dragCardId.current) moveCard(dragCardId.current, col.id, pos) }}
              dragRef={dragCardId}
            />
          ))}
        </div>
      )}

      {openCard && workspaceId && (
        <CardDialog
          workspaceId={workspaceId}
          card={openCard}
          labels={board?.labels ?? []}
          members={members}
          onClose={() => setOpenCardId(null)}
          onChanged={reload}
        />
      )}
      {showLabels && board && workspaceId && (
        <LabelManagerDialog workspaceId={workspaceId} boardId={board.id} labels={board.labels} onClose={() => setShowLabels(false)} onChanged={reload} />
      )}
      {showTrash && board && workspaceId && (
        <TrashDialog workspaceId={workspaceId} boardId={board.id} onClose={() => setShowTrash(false)} onChanged={reload} />
      )}

      {/* back to workspace */}
      <button
        onClick={() => navigate(`/workspaces/${workspaceId}`)}
        className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 shadow ring-1 ring-black/[0.05] hover:text-brand"
      >
        ← Workspace
      </button>
    </div>
  )
}

// ── Column ──
function BoardColumn(props: {
  workspaceId: string
  column: KanbanColumn
  cards: KanbanCard[]
  labels: KanbanLabel[]
  members: MemberInfo[]
  onOpenCard: (id: string) => void
  onCreated: () => void
  onDropCard: (position: number) => void
  dragRef: React.MutableRefObject<string | null>
}) {
  const { workspaceId, column, cards, labels, onOpenCard, onCreated, onDropCard, dragRef } = props
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const overLimit = column.wipLimit != null && cards.length > column.wipLimit

  async function create() {
    const t = title.trim()
    if (!t) { setAdding(false); return }
    try {
      await api.kanban.createCard(workspaceId, column.boardId, { columnId: column.id, title: t })
      setTitle('')
      onCreated()
    } catch { /* surfaced via reload */ }
  }

  return (
    <div className="flex max-h-full w-72 shrink-0 flex-col rounded-xl bg-[#f2f6f3] ring-1 ring-black/[0.03]">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {column.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: column.color }} />}
          <span className="truncate text-sm font-semibold text-zinc-700">{column.name}</span>
        </div>
        <span className={`shrink-0 rounded-full px-1.5 text-xs ${overLimit ? 'bg-red-100 text-red-600' : 'text-zinc-400'}`}>
          {cards.length}{column.wipLimit != null ? `/${column.wipLimit}` : ''}
        </span>
      </div>

      <div
        className={`flex min-h-[2rem] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 ${dragOver ? 'bg-brand-soft/40' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); onDropCard(cards.length) }}
      >
        {cards.map((card, idx) => (
          <CardTile
            key={card.id}
            card={card}
            labels={labels}
            members={props.members}
            onOpen={() => onOpenCard(card.id)}
            onDragStart={() => { dragRef.current = card.id }}
            onDropBefore={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); onDropCard(idx) }}
          />
        ))}

        {adding ? (
          <div className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-black/[0.04]">
            <textarea
              autoFocus
              className="w-full resize-none border-0 p-0 text-sm text-zinc-800 focus:outline-none focus:ring-0"
              rows={2}
              value={title}
              placeholder="Card title…"
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); create() } if (e.key === 'Escape') setAdding(false) }}
              onBlur={create}
            />
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-zinc-400 hover:bg-white hover:text-brand">
            <PlusIcon className="h-4 w-4" /> Add card
          </button>
        )}
      </div>
    </div>
  )
}

// ── Card tile ──
function CardTile(props: {
  card: KanbanCard
  labels: KanbanLabel[]
  members: MemberInfo[]
  onOpen: () => void
  onDragStart: () => void
  onDropBefore: (e: React.DragEvent) => void
}) {
  const { card, labels, members, onOpen, onDragStart, onDropBefore } = props
  const cardLabels = labels.filter(l => card.labelIds.includes(l.id))
  const due = dueLabel(card.dueAt)
  const pri = priorityMeta(card.priority)
  const assignee = members.find(m => m.userId === card.assigneeUserId)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => e.preventDefault()}
      onDrop={onDropBefore}
      onClick={onOpen}
      className="cursor-pointer rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-black/[0.04] transition hover:ring-brand/30"
    >
      {cardLabels.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {cardLabels.map(l => (
            <span key={l.id} className="h-1.5 w-7 rounded-full" style={{ background: l.color }} title={l.name} />
          ))}
        </div>
      )}
      <p className="text-sm text-zinc-800">{card.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {card.priority !== 'none' && (
          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${pri.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${pri.dot}`} />{pri.label}
          </span>
        )}
        {due && (
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${due.overdue ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-500'}`}>
            {due.text}
          </span>
        )}
        {assignee && (
          <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold uppercase text-brand-dark" title={assignee.username}>
            {assignee.username.slice(0, 2)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Card detail dialog ──
function CardDialog(props: {
  workspaceId: string
  card: KanbanCard
  labels: KanbanLabel[]
  members: MemberInfo[]
  onClose: () => void
  onChanged: () => void
}) {
  const { workspaceId, card, labels, members, onClose, onChanged } = props
  const confirm = useConfirm()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [priority, setPriority] = useState<KanbanPriority>(card.priority)
  const [dueAt, setDueAt] = useState(card.dueAt ? card.dueAt.slice(0, 10) : '')
  const [assignee, setAssignee] = useState(card.assigneeUserId ?? '')
  const [labelIds, setLabelIds] = useState<string[]>(card.labelIds)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    setSaving(true)
    setErr('')
    try {
      const res = await api.kanban.patchCard(workspaceId, card.id, {
        title: title.trim() || card.title,
        description: description.trim() ? description : null,
        priority,
        dueAt: dueAt ? `${dueAt} 00:00:00` : null,
        assigneeUserId: assignee || null,
        labelIds,
        baseUpdatedClock: card.updatedClock,
      })
      if (isKanbanConflict(res)) {
        setErr('This card was changed elsewhere. Close and reopen to see the latest.')
        setSaving(false)
        return
      }
      onChanged()
      onClose()
    } catch (e) { setErr(String(e)); setSaving(false) }
  }

  async function archive() {
    try { await api.kanban.archiveCard(workspaceId, card.id); onChanged(); onClose() } catch (e) { setErr(String(e)) }
  }
  async function remove() {
    const ok = await confirm('Permanently delete this card?', { title: 'Delete card', destructive: true })
    if (!ok) return
    try { await api.kanban.deleteCard(workspaceId, card.id); onChanged(); onClose() } catch (e) { setErr(String(e)) }
  }

  function toggleLabel(id: string) {
    setLabelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <Dialog open onClose={onClose} className="relative z-30">
      <div className="fixed inset-0 bg-black/20" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Card</span>
            <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-zinc-400 hover:text-zinc-700" /></button>
          </div>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
            <input
              className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-sm font-medium text-zinc-900 focus:border-brand focus:outline-none"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title"
            />
            <textarea
              className="w-full resize-y rounded-lg border border-black/[0.08] px-3 py-2 text-sm text-zinc-700 focus:border-brand focus:outline-none"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description…"
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-zinc-500">Priority</span>
                <select className="w-full rounded-lg border border-black/[0.08] px-2 py-1.5 text-sm focus:border-brand focus:outline-none" value={priority} onChange={e => setPriority(e.target.value as KanbanPriority)}>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-zinc-500">Due date</span>
                <input type="date" className="w-full rounded-lg border border-black/[0.08] px-2 py-1.5 text-sm focus:border-brand focus:outline-none" value={dueAt} onChange={e => setDueAt(e.target.value)} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">Assignee</span>
              <select className="w-full rounded-lg border border-black/[0.08] px-2 py-1.5 text-sm focus:border-brand focus:outline-none" value={assignee} onChange={e => setAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.userId} value={m.userId}>{m.username}</option>)}
              </select>
            </label>
            <div>
              <span className="mb-1 block text-xs font-medium text-zinc-500">Labels</span>
              <div className="flex flex-wrap gap-1.5">
                {labels.length === 0 && <span className="text-xs text-zinc-400">No labels on this board yet.</span>}
                {labels.map(l => {
                  const on = labelIds.includes(l.id)
                  return (
                    <button
                      key={l.id}
                      onClick={() => toggleLabel(l.id)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${on ? 'text-white' : 'text-zinc-600'}`}
                      style={on ? { background: l.color, borderColor: l.color } : { background: '#fff', borderColor: '#e4e4e7' }}
                    >
                      {l.name}
                    </button>
                  )
                })}
              </div>
            </div>
            {err && <p className="text-xs font-medium text-red-600">{err}</p>}
          </div>
          <div className="flex items-center justify-between border-t border-black/[0.05] px-5 py-3">
            <div className="flex gap-2">
              <button onClick={archive} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100"><ArchiveBoxIcon className="h-4 w-4" />Archive</button>
              <button onClick={remove} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50"><TrashIcon className="h-4 w-4" />Delete</button>
            </div>
            <button onClick={save} disabled={saving} className="sidebar-action bg-brand text-white hover:bg-brand-dark disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

// ── Label manager ──
function LabelManagerDialog(props: {
  workspaceId: string
  boardId: string
  labels: KanbanLabel[]
  onClose: () => void
  onChanged: () => void
}) {
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
    const ok = await confirm('Delete this label? It will be removed from all cards.', { title: 'Delete label', destructive: true })
    if (!ok) return
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
function TrashDialog(props: {
  workspaceId: string
  boardId: string
  onClose: () => void
  onChanged: () => void
}) {
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
