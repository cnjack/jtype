import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { tauri } from "../lib/tauri";
import type { LocalKanbanStore, LocalKanbanBoard, LocalKanbanCard } from "../lib/types";
import { syncKanbanBoard, type KanbanSyncContext } from "../lib/kanbanSync";

const PRIORITY_DOT: Record<string, string> = {
  none: "bg-stone-300",
  low: "bg-sky-400",
  medium: "bg-amber-400",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

function uuid(): string {
  return crypto.randomUUID();
}

interface KanbanBoardProps {
  rootPath: string;
  /** Optional cloud sync context; when present, a "Sync" action is enabled. */
  sync?: KanbanSyncContext;
  onClose: () => void;
}

/**
 * Local-first Kanban panel for the desktop app. Reads/writes the on-disk store
 * via the `kanban_*` Tauri commands, so it works fully offline. When a cloud
 * sync context is provided, the toolbar exposes a manual sync that drains the
 * pending-ops queue to the cloud and merges remote board snapshots back.
 */
export function KanbanBoard({ rootPath, sync, onClose }: KanbanBoardProps) {
  const [store, setStore] = useState<LocalKanbanStore | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dragCardId = useRef<string | null>(null);

  const apply = useCallback((s: LocalKanbanStore) => {
    setStore(s);
    setBoardId(prev => prev ?? s.boards[0]?.id ?? null);
  }, []);

  useEffect(() => {
    tauri.kanbanLoad(rootPath).then(apply).catch(e => setError(String(e)));
  }, [rootPath, apply]);

  const board: LocalKanbanBoard | null = useMemo(
    () => store?.boards.find(b => b.id === boardId) ?? null,
    [store, boardId],
  );

  const run = useCallback(async (fn: () => Promise<LocalKanbanStore>) => {
    setError("");
    try { apply(await fn()); } catch (e) { setError(String(e)); }
  }, [apply]);

  async function createBoard() {
    const name = window.prompt("New board name")?.trim();
    if (!name) return;
    const id = uuid();
    const columnIds = [uuid(), uuid(), uuid()];
    await run(() => tauri.kanbanCreateBoard(rootPath, id, name, null, columnIds));
    setBoardId(id);
  }

  async function deleteBoard() {
    if (!board) return;
    if (!window.confirm(`Delete board "${board.name}"?`)) return;
    await run(() => tauri.kanbanDeleteBoard(rootPath, board.id));
    setBoardId(null);
  }

  async function addCard(columnId: string, title: string) {
    if (!board || !title.trim()) return;
    await run(() => tauri.kanbanCreateCard(rootPath, board.id, columnId, uuid(), title.trim(), null, "none", []));
  }

  async function moveCard(cardId: string, targetColumnId: string, targetPosition: number) {
    if (!board) return;
    await run(() => tauri.kanbanMoveCard(rootPath, board.id, cardId, targetColumnId, targetPosition));
  }

  async function archiveCard(cardId: string) {
    if (!board) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    await run(() => tauri.kanbanArchiveCard(rootPath, board.id, cardId, now));
  }

  async function restoreCard(cardId: string) {
    if (!board) return;
    await run(() => tauri.kanbanRestoreCard(rootPath, board.id, cardId));
  }

  async function doSync() {
    if (!sync || !board) return;
    setBusy(true);
    setError("");
    try {
      const next = await syncKanbanBoard(rootPath, board.id, sync);
      apply(next);
    } catch (e) {
      setError(`Sync failed: ${e}`);
    } finally {
      setBusy(false);
    }
  }

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, LocalKanbanCard[]>();
    if (board) {
      for (const col of board.columns) map.set(col.id, []);
      for (const c of board.cards) {
        if (c.archivedAt) continue;
        (map.get(c.columnId) ?? map.set(c.columnId, []).get(c.columnId)!).push(c);
      }
      for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [board]);

  const archived = board?.cards.filter(c => c.archivedAt) ?? [];
  const pendingCount = store?.pendingOps.length ?? 0;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#fbfdfb]">
      {/* toolbar */}
      <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-2 border-b border-black/[0.05] bg-white/70 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              className="appearance-none rounded-lg border border-black/[0.08] bg-white py-1.5 pl-3 pr-8 text-sm font-semibold text-stone-700 focus:outline-none"
              value={boardId ?? ""}
              onChange={e => setBoardId(e.target.value || null)}
            >
              {(store?.boards ?? []).length === 0 && <option value="">No boards</option>}
              {store?.boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-stone-400" />
          </div>
          <button onClick={createBoard} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100" title="New board">
            <PlusIcon className="h-4 w-4" />
          </button>
          <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500" title="Unsynced local changes">
            {pendingCount} pending
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {sync && (
            <button onClick={doSync} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50">
              <ArrowPathIcon className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Sync
            </button>
          )}
          {board && (
            <button onClick={deleteBoard} className="rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50" title="Delete board">
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="rounded-lg px-2 py-1.5 text-stone-500 hover:bg-stone-100" title="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 px-4 py-1.5 text-xs font-medium text-red-700">
          <span>{error}</span>
          <button onClick={() => setError("")}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      {!board ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-stone-500">No board yet.</p>
          <button onClick={createBoard} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white">
            <PlusIcon className="h-4 w-4" /> Create a board
          </button>
        </div>
      ) : (
        <div className="flex flex-1 items-start gap-3 overflow-x-auto p-4">
          {board.columns.slice().sort((a, b) => a.position - b.position).map(col => (
            <Column
              key={col.id}
              name={col.name}
              wipLimit={col.wipLimit ?? null}
              cards={cardsByColumn.get(col.id) ?? []}
              onAdd={title => addCard(col.id, title)}
              onArchive={archiveCard}
              onDragStart={id => { dragCardId.current = id; }}
              onDrop={pos => { if (dragCardId.current) moveCard(dragCardId.current, col.id, pos); }}
            />
          ))}

          {archived.length > 0 && (
            <div className="flex w-64 shrink-0 flex-col rounded-xl bg-[#f4f1ee] ring-1 ring-black/[0.03]">
              <div className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-stone-500">
                <ArchiveBoxIcon className="h-4 w-4" /> Archived ({archived.length})
              </div>
              <div className="flex flex-col gap-1.5 overflow-y-auto px-2 pb-2">
                {archived.map(c => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg bg-white/70 px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-sm text-stone-500 line-through">{c.title}</span>
                    <button onClick={() => restoreCard(c.id)} className="text-stone-400 hover:text-brand" title="Restore">
                      <ArrowUturnLeftIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Column ──
function Column(props: {
  name: string;
  wipLimit: number | null;
  cards: LocalKanbanCard[];
  onAdd: (title: string) => void;
  onArchive: (cardId: string) => void;
  onDragStart: (cardId: string) => void;
  onDrop: (position: number) => void;
}) {
  const { name, wipLimit, cards, onAdd, onArchive, onDragStart, onDrop } = props;
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [over, setOver] = useState(false);
  const overLimit = wipLimit != null && cards.length > wipLimit;

  function commit() {
    if (title.trim()) onAdd(title);
    setTitle("");
    setAdding(false);
  }

  return (
    <div className="flex max-h-full w-64 shrink-0 flex-col rounded-xl bg-[#f2f6f3] ring-1 ring-black/[0.03]">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="truncate text-sm font-semibold text-stone-700">{name}</span>
        <span className={`rounded-full px-1.5 text-xs ${overLimit ? "bg-red-100 text-red-600" : "text-stone-400"}`}>
          {cards.length}{wipLimit != null ? `/${wipLimit}` : ""}
        </span>
      </div>
      <div
        className={`flex min-h-[2rem] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 ${over ? "bg-brand-soft/40" : ""}`}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); onDrop(cards.length); }}
      >
        {cards.map((card, idx) => (
          <div
            key={card.id}
            draggable
            onDragStart={() => onDragStart(card.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); onDrop(idx); }}
            className="group rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-black/[0.04]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-stone-800">{card.title}</p>
              <button
                onClick={() => onArchive(card.id)}
                className="shrink-0 text-stone-300 opacity-0 transition group-hover:opacity-100 hover:text-stone-600"
                title="Archive"
              >
                <ArchiveBoxIcon className="h-4 w-4" />
              </button>
            </div>
            {card.priority !== "none" && (
              <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-stone-500">
                <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[card.priority] ?? "bg-stone-300"}`} />
                {card.priority}
              </span>
            )}
          </div>
        ))}
        {adding ? (
          <textarea
            autoFocus
            rows={2}
            className="resize-none rounded-lg bg-white p-2 text-sm shadow-sm ring-1 ring-black/[0.04] focus:outline-none"
            value={title}
            placeholder="Card title…"
            onChange={e => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
              if (e.key === "Escape") { setTitle(""); setAdding(false); }
            }}
          />
        ) : (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand">
            <PlusIcon className="h-4 w-4" /> Add card
          </button>
        )}
      </div>
    </div>
  );
}
