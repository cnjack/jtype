import { Fragment, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  PlusIcon,
  ViewColumnsIcon,
  UserIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  LinkIcon,
  DocumentDuplicateIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  Squares2X2Icon,
  TagIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BarsArrowDownIcon,
  Bars3Icon,
  RectangleGroupIcon,
  XMarkIcon,
  TableCellsIcon,
  BookmarkIcon,
} from "@heroicons/react/24/outline";
import {
  COLUMN_COLORS,
  DEFAULT_DONE_COLUMN,
  PRIORITY_ORDER,
  PRIORITY_STYLE,
  effectiveColumns,
  groupValueOf,
  sortCards as sortCardsFn,
  todayStr,
  visibleCards as visibleCardsFn,
  type BoardGroupKey,
  type BoardSortKey,
  type BoardViewCard,
  type BoardViewColumn,
  type CardFilter,
} from "../../lib/board";
import { BoardPeek } from "./BoardPeek";
import { BoardTable } from "./BoardTable";
import { BoardSwimlanes } from "./BoardSwimlanes";
import type { BoardSurfaceProps } from "./types";

type DropTarget = { col: string; index: number };

/**
 * The platform-agnostic kanban surface: toolbar (group/sort/filter/search +
 * Board/Table), columns with pointer drag, inline composer, column ops, and the
 * side peek — all driven by a normalized model + an actions adapter. Desktop and
 * web each provide their own adapter. See internal-docs/web-board-alignment.
 */
export function BoardSurface({
  config,
  cards,
  actions,
  error,
  templates,
  createFromTemplate,
  assigneeOptions,
  tagOptions,
  loadNotes,
  fullscreen,
  onToggleFullscreen,
}: BoardSurfaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [colDropTarget, setColDropTarget] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [colDraft, setColDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<BoardSortKey>("manual");
  const [filter, setFilter] = useState<CardFilter | null>(null);
  const [peekWidth, setPeekWidth] = useState(360);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingCol, setDraggingCol] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const cardDrag = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);
  const colDrag = useRef<{ key: string; startX: number; startY: number; moved: boolean } | null>(null);

  const groupKey: BoardGroupKey = config.groupBy ?? "status";
  const editableColumns = groupKey === "status";
  const viewType = config.viewType ?? "board";
  const doneKey = config.doneColumn ?? DEFAULT_DONE_COLUMN;
  const colorColumns = (config.colorColumns ?? false) && editableColumns && viewType === "board";
  const manualSort = sortBy === "manual" && editableColumns && viewType === "board";
  const today = todayStr();

  // Escape exits fullscreen — but only when no card peek is open, so Escape
  // closes the peek first (handled in BoardPeek).
  useEffect(() => {
    if (!fullscreen || !onToggleFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !selectedId) onToggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, selectedId, onToggleFullscreen]);

  const columns = useMemo(
    () => effectiveColumns(config, cards, groupKey, t`Unassigned`),
    [config, cards, groupKey],
  );
  // Swimlanes: a second grouping dimension rendered as rows (must differ from
  // the column dimension). Only meaningful in the board view.
  const swimlaneKey: BoardGroupKey | null =
    config.swimlaneBy && config.swimlaneBy !== groupKey ? config.swimlaneBy : null;
  const swimlaneActive = viewType === "board" && !!swimlaneKey;
  const lanes = useMemo(
    () => (swimlaneKey ? effectiveColumns(config, cards, swimlaneKey, t`Unassigned`) : []),
    [config, cards, swimlaneKey],
  );
  const vis = useMemo(() => visibleCardsFn(cards, search, filter), [cards, search, filter]);
  const assignees = useMemo(() => [...new Set(cards.map((c) => c.assignee).filter(Boolean) as string[])], [cards]);
  const allTags = useMemo(() => [...new Set(cards.flatMap((c) => c.tags.map((tg) => tg.label)))], [cards]);
  const statusName = (key: string) => config.columns.find((c) => c.key === key)?.name || key || t`Unassigned`;
  const selected = selectedId ? cards.find((c) => c.id === selectedId) ?? null : null;

  const ctrlCls =
    "h-7 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

  // --- pointer drag (cards + columns) -------------------------------------
  const hitTestCard = (x: number, y: number): DropTarget | null => {
    const el = document.elementFromPoint(x, y);
    const colEl = el?.closest("[data-col-key]") as HTMLElement | null;
    if (!colEl) return null;
    const colKey = colEl.dataset.colKey!;
    const cardEl = el?.closest("[data-card-id]") as HTMLElement | null;
    if (cardEl && colEl.contains(cardEl)) {
      const idx = Number(cardEl.dataset.cardIndex);
      const rect = cardEl.getBoundingClientRect();
      return { col: colKey, index: idx + (y > rect.top + rect.height / 2 ? 1 : 0) };
    }
    return { col: colKey, index: colEl.querySelectorAll("[data-card-id]").length };
  };
  const hitTestColumn = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    return (el?.closest("[data-col-key]") as HTMLElement | null)?.dataset.colKey ?? null;
  };

  const onCardPointerDown = (e: ReactPointerEvent, card: BoardViewCard) => {
    if (e.button !== 0) return;
    cardDrag.current = { id: card.id, startX: e.clientX, startY: e.clientY, moved: false };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* capture unsupported */
    }
  };
  const onCardPointerMove = (e: ReactPointerEvent, card: BoardViewCard) => {
    const d = cardDrag.current;
    if (!d || d.id !== card.id) return;
    if (!d.moved) {
      if (Math.abs(e.clientX - d.startX) < 4 && Math.abs(e.clientY - d.startY) < 4) return;
      d.moved = true;
      setDraggingId(card.id);
    }
    setDragPos({ x: e.clientX, y: e.clientY });
    setDropTarget(hitTestCard(e.clientX, e.clientY));
  };
  const onCardPointerUp = (e: ReactPointerEvent, card: BoardViewCard) => {
    const d = cardDrag.current;
    cardDrag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* not captured */
    }
    setDraggingId(null);
    setDragPos(null);
    setDropTarget(null);
    if (d?.moved) {
      const target = hitTestCard(e.clientX, e.clientY);
      if (target) void actions.moveCard(card.id, target.col, target.index);
    } else if (d) {
      setSelectedId(card.id);
    }
  };

  const onColPointerDown = (e: ReactPointerEvent, col: BoardViewColumn) => {
    if (!editableColumns || !actions.reorderColumns || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    colDrag.current = { key: col.key, startX: e.clientX, startY: e.clientY, moved: false };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* capture unsupported */
    }
  };
  const onColPointerMove = (e: ReactPointerEvent, col: BoardViewColumn) => {
    const d = colDrag.current;
    if (!d || d.key !== col.key) return;
    if (!d.moved) {
      if (Math.abs(e.clientX - d.startX) < 4 && Math.abs(e.clientY - d.startY) < 4) return;
      d.moved = true;
      setDraggingCol(col.key);
    }
    setColDropTarget(hitTestColumn(e.clientX, e.clientY));
  };
  const onColPointerUp = (e: ReactPointerEvent, col: BoardViewColumn) => {
    const d = colDrag.current;
    colDrag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* not captured */
    }
    setDraggingCol(null);
    setColDropTarget(null);
    if (d?.moved) {
      const target = hitTestColumn(e.clientX, e.clientY);
      if (target && target !== col.key) void actions.reorderColumns?.(col.key, target);
    }
  };

  const toggleCollapse = (key: string) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const commitCreate = async (colKey: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const newId = await actions.createCard(colKey, trimmed);
    if (typeof newId === "string") setSelectedId(newId);
  };

  if (error && config.columns.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#fbfdfb] p-8 text-center">
        <ExclamationTriangleIcon className="h-9 w-9 text-amber-500" />
        <p className="max-w-md break-words text-sm text-stone-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 bg-[#fbfdfb]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-black/[0.05] bg-white/70 px-5 py-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
            <ViewColumnsIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-stone-900">{config.title}</p>
            <p className="truncate text-xs text-brand-gray">
              <Trans>Board</Trans>
              <span aria-hidden> · </span>
              {vis.length}
              {vis.length !== cards.length ? `/${cards.length}` : ""} <Trans>cards</Trans>
            </p>
          </div>
          <div className="flex items-center gap-2.5 max-md:w-full">
          <div className="inline-flex items-center rounded-lg border border-stone-200 p-0.5">
            <button
              type="button"
              onClick={() => void actions.setConfig({ viewType: "board" })}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                viewType === "board" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"
              }`}
            >
              <ViewColumnsIcon className="h-3.5 w-3.5" />
              <Trans>Board</Trans>
            </button>
            <button
              type="button"
              onClick={() => void actions.setConfig({ viewType: "table" })}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                viewType === "table" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"
              }`}
            >
              <TableCellsIcon className="h-3.5 w-3.5" />
              <Trans>Table</Trans>
            </button>
          </div>
          {editableColumns && viewType === "board" && (
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                colorColumns ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40 hover:text-brand-dark"
              }`}
              onClick={() => void actions.setConfig({ colorColumns: !config.colorColumns })}
              title={t`Color columns`}
            >
              <Squares2X2Icon className="h-3.5 w-3.5" />
              <Trans>Color</Trans>
            </button>
          )}
          {actions.refresh && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/40 hover:text-brand-dark"
              onClick={() => void actions.refresh?.()}
              title={t`Refresh`}
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              <Trans>Refresh</Trans>
            </button>
          )}
          {onToggleFullscreen && (
            <button
              type="button"
              className={`inline-flex items-center justify-center rounded-lg border p-1.5 ${
                fullscreen ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40 hover:text-brand-dark"
              }`}
              onClick={onToggleFullscreen}
              title={fullscreen ? t`Exit fullscreen` : t`Fullscreen`}
              aria-label={fullscreen ? t`Exit fullscreen` : t`Fullscreen`}
              aria-pressed={fullscreen}
            >
              {fullscreen ? <ArrowsPointingInIcon className="h-3.5 w-3.5" /> : <ArrowsPointingOutIcon className="h-3.5 w-3.5" />}
            </button>
          )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.04] bg-white/40 px-5 py-1.5">
          {viewType === "board" && (
            <label className="inline-flex items-center gap-1 text-xs text-brand-gray">
              <RectangleGroupIcon className="h-3.5 w-3.5" />
              <select
                className={ctrlCls}
                value={groupKey}
                onChange={(e) => void actions.setConfig({ groupBy: e.target.value as BoardGroupKey })}
              >
                <option value="status">{t`Group: Status`}</option>
                <option value="priority">{t`Group: Priority`}</option>
                <option value="assignee">{t`Group: Assignee`}</option>
              </select>
            </label>
          )}
          {viewType === "board" && (
            <label className="inline-flex items-center gap-1 text-xs text-brand-gray">
              <Bars3Icon className="h-3.5 w-3.5" />
              <select
                className={ctrlCls}
                value={swimlaneKey ?? ""}
                onChange={(e) => void actions.setConfig({ swimlaneBy: (e.target.value || undefined) as BoardGroupKey | undefined })}
              >
                <option value="">{t`Swimlane: None`}</option>
                {(["status", "priority", "assignee"] as BoardGroupKey[])
                  .filter((k) => k !== groupKey)
                  .map((k) => (
                    <option key={k} value={k}>
                      {k === "status" ? t`Swimlane: Status` : k === "priority" ? t`Swimlane: Priority` : t`Swimlane: Assignee`}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label className="inline-flex items-center gap-1 text-xs text-brand-gray">
            <BarsArrowDownIcon className="h-3.5 w-3.5" />
            <select className={ctrlCls} value={sortBy} onChange={(e) => setSortBy(e.target.value as BoardSortKey)}>
              <option value="manual">{t`Sort: Manual`}</option>
              <option value="due">{t`Sort: Due`}</option>
              <option value="priority">{t`Sort: Priority`}</option>
              <option value="title">{t`Sort: Title`}</option>
            </select>
          </label>

          <Menu as="div" className="relative">
            <MenuButton
              className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs ${
                filter ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40"
              }`}
            >
              <FunnelIcon className="h-3.5 w-3.5" />
              {filter ? `${filter.prop}: ${filter.value || t`Unassigned`}` : <Trans>Filter</Trans>}
            </MenuButton>
            <MenuItems anchor="bottom start" className="z-30 w-52 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none">
              {filter && (
                <>
                  <MenuItem>
                    <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => setFilter(null)}>
                      <XMarkIcon className="h-3.5 w-3.5" />
                      <Trans>Clear filter</Trans>
                    </button>
                  </MenuItem>
                  <div className="my-1 border-t border-black/[0.05]" />
                </>
              )}
              <div className="px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400">
                <Trans>Priority</Trans>
              </div>
              {PRIORITY_ORDER.map((p) => (
                <MenuItem key={p}>
                  <button type="button" className="flex w-full items-center px-3 py-1 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => setFilter({ prop: "priority", value: p })}>
                    {p}
                  </button>
                </MenuItem>
              ))}
              {assignees.length > 0 && (
                <>
                  <div className="px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400">
                    <Trans>Assignee</Trans>
                  </div>
                  {assignees.map((a) => (
                    <MenuItem key={a}>
                      <button type="button" className="flex w-full items-center px-3 py-1 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => setFilter({ prop: "assignee", value: a })}>
                        {a}
                      </button>
                    </MenuItem>
                  ))}
                </>
              )}
              {allTags.length > 0 && (
                <>
                  <div className="px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400">
                    <Trans>Tags</Trans>
                  </div>
                  {allTags.map((tag) => (
                    <MenuItem key={tag}>
                      <button type="button" className="flex w-full items-center gap-1 px-3 py-1 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => setFilter({ prop: "tag", value: tag })}>
                        <TagIcon className="h-3 w-3" />
                        {tag}
                      </button>
                    </MenuItem>
                  ))}
                </>
              )}
            </MenuItems>
          </Menu>

          <div className="relative ml-auto">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input className={`${ctrlCls} w-44 pl-7`} placeholder={t`Search cards`} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 px-5 py-1.5 text-xs text-amber-700">
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* Body: table or columns */}
        {viewType === "table" ? (
          <BoardTable
            cards={sortCardsFn(vis, sortBy)}
            statusName={statusName}
            today={today}
            doneKey={doneKey}
            selectedId={selected?.id}
            onSelect={(c) => setSelectedId(c.id)}
          />
        ) : swimlaneActive && swimlaneKey ? (
          <BoardSwimlanes
            cards={vis}
            columns={columns}
            lanes={lanes}
            groupKey={groupKey}
            swimlaneKey={swimlaneKey}
            today={today}
            doneKey={doneKey}
            selectedId={selected?.id}
            onSelect={(c) => setSelectedId(c.id)}
          />
        ) : (
          <div className="flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto p-4">
            {columns.map((col, colIndex) => {
              const colCards = sortCardsFn(vis.filter((c) => groupValueOf(c, groupKey) === col.key), sortBy);
              const showLine = (idx: number) => !!draggingId && manualSort && dropTarget?.col === col.key && dropTarget.index === idx;
              const isDoneCol = editableColumns && doneKey === col.key;
              const isColDrop = colDropTarget === col.key;
              const overLimit = editableColumns && col.limit != null && colCards.length > col.limit;
              const tintColor = col.color ?? COLUMN_COLORS[colIndex % COLUMN_COLORS.length];

              if (collapsed.has(col.key)) {
                return (
                  <button
                    key={col.key}
                    type="button"
                    data-col-key={col.key}
                    onClick={() => toggleCollapse(col.key)}
                    title={t`Expand column`}
                    className={`flex h-full w-10 shrink-0 flex-col items-center gap-2 rounded-xl border bg-[#f6faf7] py-2 text-stone-500 hover:border-brand/40 ${
                      isColDrop ? "border-brand/60" : "border-black/[0.05]"
                    }`}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                    {(colorColumns || col.color) && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tintColor }} aria-hidden />}
                    <span className="rounded-full bg-white px-1.5 text-[11px] text-stone-400">{colCards.length}</span>
                    <span className="mt-1 whitespace-nowrap text-xs font-medium text-stone-600 [writing-mode:vertical-rl]">{col.name}</span>
                  </button>
                );
              }

              return (
                <div
                  key={col.key}
                  data-col-key={col.key}
                  className={`flex max-h-full w-72 shrink-0 flex-col rounded-xl border bg-[#f6faf7] transition-opacity ${
                    draggingCol === col.key ? "opacity-50" : ""
                  } ${isColDrop ? "border-brand/60" : dropTarget?.col === col.key ? "border-brand/40" : "border-black/[0.05]"}`}
                >
                  {/* Column header — left part is the drag handle */}
                  <div
                    className="flex items-center justify-between gap-1 rounded-t-xl px-3 py-2"
                    style={colorColumns ? { backgroundColor: `${tintColor}1f` } : undefined}
                  >
                    <div
                      onPointerDown={(e) => onColPointerDown(e, col)}
                      onPointerMove={(e) => onColPointerMove(e, col)}
                      onPointerUp={(e) => onColPointerUp(e, col)}
                      className={`flex min-w-0 flex-1 select-none items-center gap-1.5 text-sm font-medium text-stone-700 ${editableColumns && actions.reorderColumns ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
                    >
                      <button type="button" onClick={() => toggleCollapse(col.key)} title={t`Collapse column`} className="-ml-1 rotate-90 rounded p-0.5 text-stone-400 hover:bg-white hover:text-stone-600">
                        <ChevronRightIcon className="h-3.5 w-3.5" />
                      </button>
                      {(colorColumns || col.color) && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tintColor }} aria-hidden />}
                      <span className="truncate">{col.name || t`Unassigned`}</span>
                      {isDoneCol && <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" title={t`Done column`} />}
                      <span
                        className={`rounded-full px-1.5 text-xs ${overLimit ? "bg-red-100 font-medium text-red-600" : "bg-white text-stone-400"}`}
                        title={col.limit != null ? t`WIP limit ${col.limit}` : undefined}
                      >
                        {colCards.length}
                        {col.limit != null ? `/${col.limit}` : ""}
                      </span>
                    </div>
                    {editableColumns && (
                      <Menu as="div" className="relative shrink-0">
                        <MenuButton className="rounded p-0.5 text-stone-400 hover:bg-white hover:text-stone-600">
                          <EllipsisHorizontalIcon className="h-4 w-4" />
                        </MenuButton>
                        <MenuItems anchor="bottom end" className="z-30 w-48 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none">
                          {actions.renameColumn && (
                            <MenuItem>
                              <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => void actions.renameColumn?.(col.key)}>
                                <PencilIcon className="h-3.5 w-3.5" />
                                <Trans>Rename</Trans>
                              </button>
                            </MenuItem>
                          )}
                          {actions.toggleDoneColumn && (
                            <MenuItem>
                              <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => void actions.toggleDoneColumn?.(col.key)}>
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                {isDoneCol ? <Trans>Unset done column</Trans> : <Trans>Set as done column</Trans>}
                              </button>
                            </MenuItem>
                          )}
                          {actions.setColumnLimit && (
                            <MenuItem>
                              <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => void actions.setColumnLimit?.(col.key)}>
                                <FunnelIcon className="h-3.5 w-3.5" />
                                <Trans>Set WIP limit</Trans>
                              </button>
                            </MenuItem>
                          )}
                          {actions.setColumnColor && (
                            <>
                              <div className="my-1 border-t border-black/[0.05]" />
                              <div className="px-3 py-1">
                                <span className="text-[11px] text-brand-gray">
                                  <Trans>Color</Trans>
                                </span>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  {COLUMN_COLORS.map((c) => (
                                    <button key={c} type="button" title={c} onClick={() => void actions.setColumnColor?.(col.key, c)} className={`h-4 w-4 rounded-full ring-1 ring-black/10 ${col.color === c ? "ring-2 ring-offset-1 ring-stone-500" : ""}`} style={{ backgroundColor: c }} />
                                  ))}
                                  <button type="button" title={t`No color`} onClick={() => void actions.setColumnColor?.(col.key, null)} className={`flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-black/10 ${!col.color ? "ring-2 ring-offset-1 ring-stone-500" : ""}`}>
                                    <span className="h-2 w-2 rounded-full bg-stone-300" />
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                          {actions.deleteColumn && (
                            <>
                              <div className="my-1 border-t border-black/[0.05]" />
                              <MenuItem>
                                <button type="button" disabled={columns.length <= 1} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 disabled:opacity-40 data-[focus]:bg-red-50" onClick={() => void actions.deleteColumn?.(col.key)}>
                                  <TrashIcon className="h-3.5 w-3.5" />
                                  <Trans>Delete</Trans>
                                </button>
                              </MenuItem>
                            </>
                          )}
                        </MenuItems>
                      </Menu>
                    )}
                  </div>

                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                    {colCards.map((card, idx) => {
                      const overdue = card.due && card.due < today && card.columnKey !== doneKey;
                      const hasMeta =
                        (card.priority && card.priority !== "none") ||
                        card.assignee ||
                        card.due ||
                        (card.taskTotal ?? 0) > 0 ||
                        card.tags.length > 0;
                      return (
                        <Fragment key={card.id}>
                          {showLine(idx) && <div className="mx-1 h-0.5 rounded bg-brand" />}
                          <div
                            role="button"
                            tabIndex={0}
                            data-card-id={card.id}
                            data-card-index={idx}
                            onPointerDown={(e) => onCardPointerDown(e, card)}
                            onPointerMove={(e) => onCardPointerMove(e, card)}
                            onPointerUp={(e) => onCardPointerUp(e, card)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setSelectedId(card.id);
                            }}
                            className={`group relative block w-full cursor-pointer touch-none select-none rounded-lg bg-white p-2.5 text-left shadow-sm ring-1 transition hover:ring-brand/30 ${
                              draggingId === card.id ? "opacity-40" : ""
                            } ${selected?.id === card.id ? "ring-brand/60" : "ring-black/[0.04]"}`}
                          >
                            <div
                              className="absolute right-1 top-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <Menu as="div">
                                <MenuButton className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                                  <EllipsisHorizontalIcon className="h-4 w-4" />
                                </MenuButton>
                                <MenuItems anchor="bottom end" className="z-30 w-44 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none">
                                  {actions.openCardFull && (
                                    <MenuItem>
                                      <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => actions.openCardFull?.(card)}>
                                        <ArrowsPointingOutIcon className="h-3.5 w-3.5" />
                                        <Trans>Open in editor</Trans>
                                      </button>
                                    </MenuItem>
                                  )}
                                  {actions.copyCardLink && (
                                    <MenuItem>
                                      <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => void actions.copyCardLink?.(card)}>
                                        <LinkIcon className="h-3.5 w-3.5" />
                                        <Trans>Copy link</Trans>
                                      </button>
                                    </MenuItem>
                                  )}
                                  {actions.duplicateCard && (
                                    <MenuItem>
                                      <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => void actions.duplicateCard?.(card)}>
                                        <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                                        <Trans>Duplicate</Trans>
                                      </button>
                                    </MenuItem>
                                  )}
                                  {actions.saveAsTemplate && (
                                    <MenuItem>
                                      <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => void actions.saveAsTemplate?.(card)}>
                                        <BookmarkIcon className="h-3.5 w-3.5" />
                                        <Trans>Save as template</Trans>
                                      </button>
                                    </MenuItem>
                                  )}
                                  <div className="my-1 border-t border-black/[0.05]" />
                                  <MenuItem>
                                    <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 data-[focus]:bg-red-50" onClick={() => void actions.deleteCard(card)}>
                                      <TrashIcon className="h-3.5 w-3.5" />
                                      <Trans>Delete</Trans>
                                    </button>
                                  </MenuItem>
                                </MenuItems>
                              </Menu>
                            </div>

                            <span className="block pr-5 text-sm text-stone-800">
                              {card.icon && <span className="mr-1">{card.icon}</span>}
                              {card.title}
                            </span>
                            {card.excerpt && card.excerpt !== card.title && (
                              <span className="mt-0.5 block truncate text-[11px] text-stone-400">{card.excerpt}</span>
                            )}
                            {hasMeta && (
                              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                {card.priority && card.priority !== "none" && (
                                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_STYLE[card.priority] ?? "bg-stone-100 text-stone-500"}`}>{card.priority}</span>
                                )}
                                {(card.taskTotal ?? 0) > 0 && (
                                  <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${card.taskDone === card.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`}>
                                    <CheckCircleIcon className="h-3 w-3" />
                                    {card.taskDone}/{card.taskTotal}
                                  </span>
                                )}
                                {card.tags.map((tag) => (
                                  <span key={tag.label} className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-brand-dark" style={{ backgroundColor: tag.color ? `${tag.color}22` : "rgba(0,136,132,0.10)" }}>
                                    <TagIcon className="h-3 w-3" />
                                    {tag.label}
                                  </span>
                                ))}
                                {card.assignee && (
                                  <span className="inline-flex items-center gap-0.5 text-[11px] text-brand-gray">
                                    <UserIcon className="h-3 w-3" />
                                    {card.assignee}
                                  </span>
                                )}
                                {card.due && (
                                  <span className={`inline-flex items-center gap-0.5 text-[11px] ${overdue ? "font-medium text-red-600" : "text-brand-gray"}`}>
                                    <CalendarDaysIcon className="h-3 w-3" />
                                    {card.due}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </Fragment>
                      );
                    })}
                    {colCards.length === 0
                      ? draggingId && dropTarget?.col === col.key && (
                          <div className="mx-1 h-14 rounded-lg border-2 border-dashed border-brand/50 bg-brand-soft/30" />
                        )
                      : showLine(colCards.length) && <div className="mx-1 h-0.5 rounded bg-brand" />}

                    {addingIn === col.key ? (
                      <textarea
                        autoFocus
                        rows={2}
                        className="w-full resize-none rounded-lg bg-white p-2 text-sm text-stone-800 shadow-sm ring-1 ring-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/40"
                        placeholder={t`Card title (Enter to add, Esc to cancel)`}
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            const title = draftTitle;
                            setDraftTitle("");
                            setAddingIn(null);
                            void commitCreate(col.key, title);
                          }
                          if (e.key === "Escape") {
                            setDraftTitle("");
                            setAddingIn(null);
                          }
                        }}
                        onBlur={() => {
                          if (draftTitle.trim()) void commitCreate(col.key, draftTitle);
                          setDraftTitle("");
                          setAddingIn(null);
                        }}
                      />
                    ) : templates && templates.length > 0 && createFromTemplate ? (
                      <Menu as="div" className="relative">
                        <MenuButton className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand-dark">
                          <PlusIcon className="h-4 w-4" />
                          <Trans>New card</Trans>
                        </MenuButton>
                        <MenuItems anchor="bottom start" className="z-30 w-52 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none">
                          <MenuItem>
                            <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => { setDraftTitle(""); setAddingIn(col.key); }}>
                              <PencilIcon className="h-3.5 w-3.5" />
                              <Trans>Blank card</Trans>
                            </button>
                          </MenuItem>
                          <div className="my-1 border-t border-black/[0.05]" />
                          <div className="px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400">
                            <Trans>Templates</Trans>
                          </div>
                          {templates.map((tpl) => (
                            <MenuItem key={tpl.id}>
                              <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => void createFromTemplate(col.key, tpl.id)}>
                                <BookmarkIcon className="h-3.5 w-3.5" />
                                <span className="truncate">{tpl.name}</span>
                              </button>
                            </MenuItem>
                          ))}
                        </MenuItems>
                      </Menu>
                    ) : (
                      <button type="button" className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand-dark" onClick={() => { setDraftTitle(""); setAddingIn(col.key); }}>
                        <PlusIcon className="h-4 w-4" />
                        <Trans>New card</Trans>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {editableColumns &&
              actions.addColumn &&
              (addingColumn ? (
                <input
                  autoFocus
                  className="w-44 shrink-0 self-start rounded-xl border border-brand/40 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand/40"
                  placeholder={t`Column name`}
                  value={colDraft}
                  onChange={(e) => setColDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const n = colDraft.trim();
                      setColDraft("");
                      setAddingColumn(false);
                      if (n) void actions.addColumn?.(n);
                    }
                    if (e.key === "Escape") {
                      setColDraft("");
                      setAddingColumn(false);
                    }
                  }}
                  onBlur={() => {
                    const n = colDraft.trim();
                    if (n) void actions.addColumn?.(n);
                    setColDraft("");
                    setAddingColumn(false);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="flex w-44 shrink-0 self-start items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-400 hover:border-brand/40 hover:text-brand-dark"
                  onClick={() => {
                    setColDraft("");
                    setAddingColumn(true);
                  }}
                >
                  <PlusIcon className="h-4 w-4" />
                  <Trans>Add column</Trans>
                </button>
              ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="absolute right-0 top-0 z-30 h-full shadow-[-10px_0_30px_rgba(0,0,0,0.07)]" style={{ width: peekWidth }}>
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startW = peekWidth;
              const onMove = (ev: MouseEvent) => setPeekWidth(Math.min(640, Math.max(300, startW + (startX - ev.clientX))));
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
            title={t`Drag to resize`}
            className="absolute left-0 top-0 z-10 h-full w-1.5 -translate-x-1/2 cursor-col-resize transition-colors hover:bg-brand/40"
          />
          <BoardPeek
            card={selected}
            statusOptions={config.columns.map((c) => ({ value: c.key, label: c.name }))}
            assigneeOptions={assigneeOptions}
            tagOptions={tagOptions}
            loadNotes={loadNotes}
            onChange={(patch) => void actions.updateCard(selected.id, patch)}
            onClose={() => setSelectedId(null)}
            onDelete={() => void actions.deleteCard(selected)}
            onOpenFull={actions.openCardFull ? () => actions.openCardFull?.(selected) : undefined}
          />
        </div>
      )}

      {draggingId &&
        dragPos &&
        (() => {
          const dc = cards.find((c) => c.id === draggingId);
          return (
            <div
              className="pointer-events-none fixed z-[60] max-w-[260px] -translate-x-1/2 -translate-y-1/2 truncate rounded-lg bg-white px-3 py-2 text-sm text-stone-800 shadow-xl ring-1 ring-brand/40"
              style={{ left: dragPos.x, top: dragPos.y }}
            >
              {dc?.icon && <span className="mr-1">{dc.icon}</span>}
              {dc?.title}
            </div>
          );
        })()}
    </div>
  );
}
