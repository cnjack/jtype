import { Fragment, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
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
  LockClosedIcon,
  Squares2X2Icon,
  TagIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BarsArrowDownIcon,
  RectangleGroupIcon,
  XMarkIcon,
  TableCellsIcon,
  BookmarkIcon,
  Cog6ToothIcon,
  AdjustmentsHorizontalIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import {
  COLUMN_COLORS,
  DEFAULT_DONE_COLUMN,
  PRIORITY_ORDER,
  PRIORITY_STYLE,
  activeBoardLaneKey,
  boardLaneValueOf,
  blockedCounts,
  cardRelationKey,
  childCardsByParent,
  childProgress,
  effectiveColumns,
  effectiveSwimlanes,
  groupValueOf,
  hasBoardFilters,
  newSwimlaneKey,
  RESERVED_CARD_KEYS,
  slugify,
  sortCards as sortCardsFn,
  todayStr,
  visibleCards as visibleCardsFn,
  type BoardSortKey,
  type BoardSwimlane,
  type BoardSwimlaneGroupKey,
  type SwimlaneMigration,
  type BoardViewCard,
  type BoardViewColumn,
  type BoardViewConfig,
  type BoardFilters,
} from "../../lib/board";
import { BoardFilterPopover } from "./BoardFilterPopover";
import { BoardTable } from "./BoardTable";
import { BoardCalendar } from "./BoardCalendar";
import { CardCreateDialog, type CardCreateDraft } from "./CardCreateDialog";
import { StatusManagerDialog } from "./StatusManagerDialog";
import { SwimlaneManagerDialog } from "./SwimlaneManagerDialog";
import {
  SwimlaneConversionDialog,
  type DerivedSwimlanePreview,
} from "./SwimlaneConversionDialog";
import type { BoardSurfaceProps } from "./types";

type DropTarget = { col: string; index: number };

/**
 * The platform-agnostic kanban surface: toolbar (group/sort/filter/search +
 * Board/Table), columns with pointer drag, focused card creation/detail, and
 * column ops — all driven by a normalized model + an actions adapter. Desktop and
 * web each provide their own adapter. See internal-docs/web-board-alignment.
 */
export function BoardSurface({
  config,
  cards,
  actions,
  error,
  initialCardId,
  templates,
  createFromTemplate,
  assigneeOptions,
  tagOptions,
  loadNotes,
  onUploadAttachment,
  loadComments,
  addComment,
  updateComment,
  deleteComment,
  toggleReaction,
  resolveComment,
  currentUser,
  loadActivity,
  renderMarkdownToContainer,
  renderMarkdownToHtml,
  fullscreen,
  onToggleFullscreen,
  onOpenSettings,
  readOnly,
  onCardOpen,
  renderCardSupplement,
  peekComponent: PeekComponent,
  portalClassName,
}: BoardSurfaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [multiSel, setMultiSel] = useState<Set<string>>(new Set());
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [colDropTarget, setColDropTarget] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [colDraft, setColDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<BoardSortKey>("manual");
  const [filters, setFilters] = useState<BoardFilters>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingCol, setDraggingCol] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [swimlaneManagerOpen, setSwimlaneManagerOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [conversionOpen, setConversionOpen] = useState(false);
  const [conversionSource, setConversionSource] = useState<"priority" | "assignee">("priority");
  const [conversionRequested, setConversionRequested] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<{ completed: number; total: number } | null>(null);
  const [conversionError, setConversionError] = useState("");
  const [conversionPass, setConversionPass] = useState(0);
  const cardDrag = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);
  const colDrag = useRef<{ key: string; startX: number; startY: number; moved: boolean } | null>(null);
  const conversionStepBusy = useRef(false);
  const conversionAttemptRef = useRef<{ signature: string; writes: number } | null>(null);
  const cardUpdateQueues = useRef(new Map<string, Promise<void>>());
  const initialCardHandled = useRef(false);

  useEffect(() => {
    if (initialCardHandled.current || !initialCardId) return;
    if (!cards.some((card) => card.id === initialCardId)) return;
    initialCardHandled.current = true;
    if (onCardOpen) {
      onCardOpen(cards.find((card) => card.id === initialCardId)!);
      return;
    }
    setSelectedId(initialCardId);
  }, [cards, initialCardId, onCardOpen]);

  const groupKey = activeBoardLaneKey(config);
  const editableColumns = groupKey === "status";
  const customSwimlanes = groupKey === "custom";
  const viewType = config.viewType ?? "board";
  const doneKey = config.doneColumn ?? DEFAULT_DONE_COLUMN;
  const colorColumns = (config.colorColumns ?? false) && editableColumns && viewType === "board";
  const manualSort =
    sortBy === "manual" &&
    editableColumns &&
    viewType === "board" &&
    !search.trim() &&
    !hasBoardFilters(filters);
  const today = todayStr();

  const queueCardUpdate = (cardId: string, patch: Partial<BoardViewCard>): Promise<void> => {
    const previous = cardUpdateQueues.current.get(cardId) ?? Promise.resolve();
    const task = previous
      .catch(() => undefined)
      .then(() => actions.updateCard(cardId, patch))
      // Platform adapters surface their own error state. Keep the queue usable
      // after a rejected write and avoid an unhandled promise from field edits.
      .catch(() => undefined);
    cardUpdateQueues.current.set(cardId, task);
    void task.then(() => {
      if (cardUpdateQueues.current.get(cardId) === task) {
        cardUpdateQueues.current.delete(cardId);
      }
    });
    return task;
  };

  // Escape exits fullscreen — but only when no card peek is open (BoardPeek
  // handles its own Escape) and no multi-selection is active (cleared below).
  useEffect(() => {
    if (!fullscreen || !onToggleFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !selectedId && multiSel.size === 0) onToggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, selectedId, multiSel.size, onToggleFullscreen]);

  // Escape clears the multi-selection before anything else uses it.
  useEffect(() => {
    if (multiSel.size === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMultiSel(new Set());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [multiSel.size]);

  const columns = useMemo(
    () =>
      groupKey === "custom"
        ? effectiveSwimlanes(config, cards, groupKey, t`Unassigned`)
        : effectiveColumns(config, cards, groupKey, t`Unassigned`),
    [config, cards, groupKey],
  );
  // Blocker counts resolve against ALL cards (a blocker may be filtered out of view).
  const blockers = useMemo(() => blockedCounts(cards, config.doneColumn), [cards, config.doneColumn]);
  const blockedCardIds = useMemo(() => new Set(blockers.keys()), [blockers]);
  const vis = useMemo(
    () =>
      visibleCardsFn(cards, search, filters, config, {
        currentUser,
        today,
        blockedCardIds,
      }),
    [cards, search, filters, config, currentUser, today, blockedCardIds],
  );
  // Sub-cards resolve against ALL cards too (children may be filtered from view).
  const childrenMap = useMemo(() => childCardsByParent(cards), [cards]);
  const assignees = useMemo(() => [...new Set(cards.map((c) => c.assignee).filter(Boolean) as string[])], [cards]);
  const allTags = useMemo(() => [...new Set(cards.flatMap((c) => c.tags.map((tg) => tg.label)))], [cards]);
  const statusName = (key: string) => config.columns.find((c) => c.key === key)?.name || key || t`Unassigned`;
  const selected = selectedId ? cards.find((c) => c.id === selectedId) ?? null : null;

  const conversionRows: DerivedSwimlanePreview[] = useMemo(() => {
    const derived = effectiveColumns(config, cards, conversionSource, t`Unassigned`);
    return derived
      .filter((row) =>
        conversionSource === "priority" ? row.key !== "none" : row.key !== "",
      )
      .map((row, index) => ({
        value: row.key,
        name: row.name,
        color: row.color ?? COLUMN_COLORS[index % COLUMN_COLORS.length],
        cardCount: cards.filter((card) => groupValueOf(card, conversionSource) === row.key).length,
      }));
  }, [cards, config, conversionSource]);

  const updateManyCards = async (
    updates: Array<{ cardId: string; patch: Partial<BoardViewCard> }>,
    onProgress?: (completed: number, total: number) => void,
  ) => {
    if (actions.updateCards) {
      await actions.updateCards(updates, onProgress);
      return;
    }
    let completed = 0;
    for (const update of updates) {
      await actions.updateCard(update.cardId, update.patch);
      completed += 1;
      onProgress?.(completed, updates.length);
    }
  };

  const startConversion = async () => {
    if (conversionRequested) return;
    setConversionError("");
    conversionAttemptRef.current = null;
    const existingMarker =
      config.swimlaneMigration?.source === conversionSource
        ? config.swimlaneMigration
        : undefined;
    if (!existingMarker) {
      const existingKeys = new Set([
        ...(config.swimlanes ?? []).map((lane) => lane.key),
        ...cards.map((card) => card.swimlaneKey).filter((key): key is string => !!key),
      ]);
      const mapping = conversionRows.map((row) => {
        const swimlaneKey = newSwimlaneKey(row.name, existingKeys);
        existingKeys.add(swimlaneKey);
        return { value: row.value, swimlaneKey };
      });
      const definitions = [
        ...(config.swimlanes ?? []),
        ...mapping.map((item, index) => ({
          key: item.swimlaneKey,
          name: conversionRows[index]?.name ?? item.value,
          color: conversionRows[index]?.color,
        })),
      ];
      const marker: SwimlaneMigration = {
        version: 1,
        source: conversionSource,
        mapping,
      };
      try {
        await actions.setConfig({ swimlanes: definitions, swimlaneMigration: marker });
      } catch (error) {
        setConversionError(error instanceof Error ? error.message : String(error));
        return;
      }
    }
    setConversionProgress(null);
    setConversionRequested(true);
  };

  // Conversion is intentionally render-driven: every completed write triggers
  // the platform adapter's reload, then this effect re-scans the authoritative
  // cards. New source values extend the persisted marker before the final flip.
  useEffect(() => {
    if (!conversionRequested || conversionStepBusy.current) return;
    const marker = config.swimlaneMigration;
    if (!marker || marker.source !== conversionSource) return;
    conversionStepBusy.current = true;
    void (async () => {
      try {
        const mapping = [...marker.mapping];
        const definitions = [...(config.swimlanes ?? [])];
        const mappedValues = new Set(mapping.map((item) => item.value));
        const knownDefinitionKeys = new Set(definitions.map((lane) => lane.key));
        const existingKeys = new Set([
          ...knownDefinitionKeys,
          ...mapping.map((item) => item.swimlaneKey),
          ...cards.map((card) => card.swimlaneKey).filter((key): key is string => !!key),
        ]);
        const sourceValues = [
          ...new Set(
            cards
              .map((card) => groupValueOf(card, marker.source))
              .filter((value) =>
                marker.source === "priority" ? value !== "none" : value !== "",
              ),
          ),
        ];
        let markerChanged = false;
        for (const value of sourceValues) {
          if (!mappedValues.has(value)) {
            const key = newSwimlaneKey(value, existingKeys);
            existingKeys.add(key);
            mapping.push({ value, swimlaneKey: key });
            mappedValues.add(value);
            markerChanged = true;
          }
        }
        for (const item of mapping) {
          if (!knownDefinitionKeys.has(item.swimlaneKey)) {
            const preview = conversionRows.find((row) => row.value === item.value);
            const previewIndex = Math.max(0, sourceValues.indexOf(item.value));
            definitions.push({
              key: item.swimlaneKey,
              name: preview?.name ?? item.value,
              color: preview?.color ?? COLUMN_COLORS[previewIndex % COLUMN_COLORS.length],
            });
            knownDefinitionKeys.add(item.swimlaneKey);
            markerChanged = true;
          }
        }
        if (markerChanged) {
          conversionAttemptRef.current = null;
          await actions.setConfig({
            swimlanes: definitions,
            swimlaneMigration: { ...marker, mapping },
          });
          return;
        }

        const keyByValue = new Map(mapping.map((item) => [item.value, item.swimlaneKey]));
        const updates = cards.flatMap((card) => {
          const value = groupValueOf(card, marker.source);
          const expected = keyByValue.get(value);
          return expected && card.swimlaneKey !== expected
            ? [{ cardId: card.id, patch: { swimlaneKey: expected } }]
            : [];
        });
        if (updates.length > 0) {
          const signature = updates
            .map((update) => `${update.cardId}:${String(update.patch.swimlaneKey ?? "")}`)
            .sort()
            .join("\n");
          const previousAttempt = conversionAttemptRef.current;
          if (previousAttempt?.signature === signature && previousAttempt.writes >= 2) {
            throw new Error(t`Conversion stopped because card updates did not persist. Refresh and try again.`);
          }
          conversionAttemptRef.current = {
            signature,
            writes: previousAttempt?.signature === signature ? previousAttempt.writes + 1 : 1,
          };
          setConversionProgress({ completed: 0, total: updates.length });
          await updateManyCards(updates, (completed, total) =>
            setConversionProgress({ completed, total }),
          );
          return;
        }

        await actions.setConfig({
          groupBy: "status",
          swimlanes: definitions,
          swimlaneBy: "custom",
          swimlaneMigration: undefined,
        });
        conversionAttemptRef.current = null;
        setConversionRequested(false);
        setConversionProgress(null);
        setConversionOpen(false);
      } catch (error) {
        setConversionError(error instanceof Error ? error.message : String(error));
        setConversionProgress(null);
        setConversionRequested(false);
      } finally {
        conversionStepBusy.current = false;
        // Adapters can publish their authoritative reload before this pass
        // releases its guard. Queue another pass so the marker always advances.
        setConversionPass((pass) => pass + 1);
      }
    })();
  }, [
    actions,
    cards,
    config.swimlaneMigration,
    config.swimlanes,
    conversionPass,
    conversionRequested,
    conversionRows,
    conversionSource,
  ]);

  const ctrlCls =
    "h-7 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
  // Anchored menu panels mount in body-level portals, outside any wrapper —
  // append the platform's portal scope class there (empty for desktop/web).
  const portalCls = portalClassName ? ` ${portalClassName}` : "";
  const setConfigSafely = (patch: Partial<BoardViewConfig>) => {
    if (conversionRequested) return;
    void Promise.resolve(actions.setConfig(patch)).catch(() => {
      // Platform adapters expose the same failure through the board error banner.
    });
  };

  const saveCustomLanes = async (next: BoardSwimlane[]) => {
    await actions.setConfig({ swimlanes: next });
  };
  const showMissingSwimlanes = () => {
    setFilters((current) => ({ ...current, missingRow: true }));
    window.setTimeout(() => {
      document
        .querySelector<HTMLElement>('[data-col-key=""]')
        ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }, 80);
  };

  // Opening a card goes through the host when it intercepts (embeds render
  // their own detail); otherwise the built-in focused detail.
  const openCard = (card: BoardViewCard) => {
    if (onCardOpen) onCardOpen(card);
    else setSelectedId(card.id);
  };
  // Column ops menu only makes sense when at least one op is wired (embeds wire none).
  const hasColumnOps = !!(
    actions.renameColumn ||
    actions.toggleDoneColumn ||
    actions.setColumnLimit ||
    actions.setColumnColor ||
    actions.deleteColumn
  );

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
    if (readOnly) return; // tap-to-open only; drag never starts
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
      if (target) {
        const targetIndex =
          editableColumns && !manualSort
            ? cards.filter(
                (candidate) =>
                  candidate.id !== card.id &&
                  boardLaneValueOf(candidate, config) === target.col,
              ).length
            : target.index;
        void actions.moveCard(card.id, target.col, targetIndex);
      }
    } else if (d) {
      // Cmd/Ctrl-click toggles multi-selection instead of opening the peek.
      if ((e.metaKey || e.ctrlKey) && !readOnly) {
        setMultiSel((s) => {
          const next = new Set(s);
          if (next.has(card.id)) next.delete(card.id);
          else next.add(card.id);
          return next;
        });
        return;
      }
      openCard(card);
    }
  };

  /** Apply a patch to every multi-selected card that still exists. */
  const applyBulk = (patch: Partial<BoardViewCard>) => {
    for (const id of multiSel) {
      if (cards.some((c) => c.id === id)) void actions.updateCard(id, patch);
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

  const commitCreate = async (colKey: string, draft: CardCreateDraft) => {
    const trimmed = draft.title.trim();
    if (!trimmed) return false;
    const { title: _title, ...initial } = draft;
    const newId = await actions.createCard(colKey, trimmed, initial);
    // Only auto-open the built-in detail; a host intercepting opens (onCardOpen)
    // gets a card object per open, which doesn't exist in `cards` yet here.
    if (typeof newId === "string" && !onCardOpen) setSelectedId(newId);
    return true;
  };

  if (error && config.columns.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-stone-50 p-8 text-center">
        <ExclamationTriangleIcon className="h-9 w-9 text-amber-500" />
        <p className="max-w-md break-words text-sm text-stone-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 bg-stone-50">
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
              onClick={() => setConfigSafely({ viewType: "board" })}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                viewType === "board" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"
              }`}
            >
              <ViewColumnsIcon className="h-3.5 w-3.5" />
              <Trans>Board</Trans>
            </button>
            <button
              type="button"
              onClick={() => setConfigSafely({ viewType: "table" })}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                viewType === "table" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"
              }`}
            >
              <TableCellsIcon className="h-3.5 w-3.5" />
              <Trans>Table</Trans>
            </button>
            <button
              type="button"
              onClick={() => setConfigSafely({ viewType: "calendar" })}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                viewType === "calendar" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"
              }`}
            >
              <CalendarDaysIcon className="h-3.5 w-3.5" />
              <Trans>Calendar</Trans>
            </button>
          </div>
          {editableColumns && viewType === "board" && !readOnly && (
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                colorColumns ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40 hover:text-brand-dark"
              }`}
              onClick={() => setConfigSafely({ colorColumns: !config.colorColumns })}
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
          {onOpenSettings && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:border-brand/40 hover:text-brand-dark"
              onClick={onOpenSettings}
              title={t`Board settings`}
              aria-label={t`Board settings`}
            >
              <Cog6ToothIcon className="h-3.5 w-3.5" />
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
                aria-label={t`Swimlanes`}
                value={groupKey}
                disabled={conversionRequested}
                onChange={(e) => {
                  const next = e.target.value as BoardSwimlaneGroupKey;
                  const patch =
                    next === "custom"
                      ? { groupBy: "status" as const, swimlaneBy: "custom" as const }
                      : { groupBy: next, swimlaneBy: undefined };
                  void Promise.resolve(actions.setConfig(patch))
                    .then(() => {
                      if (
                        next === "custom" &&
                        (config.swimlanes?.length ?? 0) === 0 &&
                        !readOnly
                      ) {
                        setSwimlaneManagerOpen(true);
                      }
                    })
                    .catch(() => {
                      // Platform adapter already surfaced the failure.
                    });
                }}
              >
                <option value="status">{t`Swimlanes: Status`}</option>
                <option value="priority">{t`Swimlanes: Priority`}</option>
                <option value="assignee">{t`Swimlanes: Assignee`}</option>
                <option value="custom">{t`Swimlanes: Custom`}</option>
              </select>
            </label>
          )}
          {viewType === "board" && groupKey === "status" && !readOnly && (
            <button
              type="button"
              disabled={conversionRequested}
              onClick={() => setStatusManagerOpen(true)}
              title={t`Manage statuses`}
              aria-label={t`Manage statuses`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 transition hover:border-brand/40 hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/20 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PencilSquareIcon className="h-3.5 w-3.5" />
            </button>
          )}
          {viewType === "board" && groupKey !== "status" && !readOnly && (
            <button
              type="button"
              disabled={conversionRequested}
              onClick={() => {
                if (groupKey === "custom") {
                  setSwimlaneManagerOpen(true);
                } else {
                  setConversionSource(config.swimlaneMigration?.source ?? groupKey);
                  setConversionError("");
                  setConversionOpen(true);
                }
              }}
              title={
                groupKey === "custom"
                  ? t`Manage custom swimlanes`
                  : t`Make swimlanes editable`
              }
              aria-label={
                groupKey === "custom"
                  ? t`Manage custom swimlanes`
                  : t`Make swimlanes editable`
              }
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 transition hover:border-brand/40 hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/20 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
            </button>
          )}
          {viewType !== "calendar" && (
            <label className="inline-flex items-center gap-1 text-xs text-brand-gray">
              <BarsArrowDownIcon className="h-3.5 w-3.5" />
              <select className={ctrlCls} value={sortBy} onChange={(e) => setSortBy(e.target.value as BoardSortKey)}>
                <option value="manual">{t`Sort: Manual`}</option>
                <option value="due">{t`Sort: Due`}</option>
                <option value="priority">{t`Sort: Priority`}</option>
                <option value="title">{t`Sort: Title`}</option>
              </select>
            </label>
          )}

          <BoardFilterPopover
            filters={filters}
            onChange={setFilters}
            assignees={assignees}
            tags={allTags}
            currentUser={currentUser}
            visibleCount={vis.length}
            totalCount={cards.length}
            portalClassName={portalClassName}
          />

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

        {/* Body: table, calendar, or columns */}
        {viewType === "table" ? (
          <BoardTable
            cards={sortCardsFn(vis, sortBy)}
            statusName={statusName}
            today={today}
            doneKey={doneKey}
            selectedId={selected?.id}
            onSelect={openCard}
          />
        ) : viewType === "calendar" ? (
          <BoardCalendar
            cards={vis}
            today={today}
            doneKey={doneKey}
            mode={config.calendarMode ?? "month"}
            onModeChange={(m) => setConfigSafely({ calendarMode: m })}
            selectedId={selected?.id}
            onSelect={openCard}
          />
        ) : (
          <div className="flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto p-4">
            {columns.map((col, colIndex) => {
              const colCards = sortCardsFn(
                vis.filter((card) => boardLaneValueOf(card, config) === col.key),
                sortBy,
              );
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
                    className={`flex h-full w-10 shrink-0 flex-col items-center gap-2 rounded-xl border bg-stone-100/60 py-2 text-stone-500 hover:border-brand/40 ${
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
                  className={`flex max-h-full w-72 shrink-0 flex-col rounded-xl border bg-stone-100/60 transition-opacity ${
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
                    {editableColumns && !readOnly && hasColumnOps && (
                      <Menu as="div" className="relative shrink-0">
                        <MenuButton className="rounded p-0.5 text-stone-400 hover:bg-white hover:text-stone-600">
                          <EllipsisHorizontalIcon className="h-4 w-4" />
                        </MenuButton>
                        <MenuItems anchor="bottom end" className={`z-30 w-48 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${portalCls}`}>
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
                      const blockedCount = blockers.get(card.id) ?? 0;
                      const children = childrenMap.get(card.id);
                      const hasMeta =
                        (card.priority && card.priority !== "none") ||
                        card.assignee ||
                        card.due ||
                        (card.taskTotal ?? 0) > 0 ||
                        card.tags.length > 0 ||
                        blockedCount > 0 ||
                        (children?.length ?? 0) > 0;
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
                              if (e.key === "Enter") openCard(card);
                            }}
                            className={`group relative block w-full cursor-pointer touch-none select-none rounded-lg bg-white p-2.5 text-left shadow-sm transition hover:ring-brand/30 ${
                              draggingId === card.id ? "opacity-40" : ""
                            } ${
                              multiSel.has(card.id)
                                ? "ring-2 ring-brand/70"
                                : selected?.id === card.id
                                  ? "ring-1 ring-brand/60"
                                  : "ring-1 ring-black/[0.04]"
                            }`}
                          >
                            {!readOnly && (
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
                                <MenuItems anchor="bottom end" className={`z-30 w-44 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${portalCls}`}>
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
                            )}

                            {card.ticket && (
                              <span className="mb-0.5 inline-block rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] font-medium tracking-tight text-stone-500">
                                {card.ticket}
                              </span>
                            )}
                            <span className="block pr-5 text-sm text-stone-800">
                              {card.icon && <span className="mr-1">{card.icon}</span>}
                              {card.title}
                            </span>
                            {card.excerpt && card.excerpt !== card.title && (
                              <span className="mt-0.5 block truncate text-[11px] text-stone-400">{card.excerpt}</span>
                            )}
                            {hasMeta && (
                              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                {blockedCount > 0 && (
                                  <span
                                    className="inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600"
                                    title={t`Blocked by ${blockedCount} unfinished card(s)`}
                                  >
                                    <LockClosedIcon className="h-3 w-3" />
                                    {blockedCount}
                                  </span>
                                )}
                                {card.priority && card.priority !== "none" && (
                                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_STYLE[card.priority] ?? "bg-stone-100 text-stone-500"}`}>{card.priority}</span>
                                )}
                                {(card.taskTotal ?? 0) > 0 && (
                                  <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${card.taskDone === card.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`}>
                                    <CheckCircleIcon className="h-3 w-3" />
                                    {card.taskDone}/{card.taskTotal}
                                  </span>
                                )}
                                {children &&
                                  children.length > 0 &&
                                  (() => {
                                    const prog = childProgress(children, config.doneColumn);
                                    const circumference = 2 * Math.PI * 6;
                                    return (
                                      <span
                                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${prog.done === prog.total ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`}
                                        title={t`${prog.done} of ${prog.total} sub-cards done`}
                                      >
                                        <svg viewBox="0 0 16 16" className="h-3 w-3 -rotate-90">
                                          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                                          <circle
                                            cx="8"
                                            cy="8"
                                            r="6"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(prog.done / prog.total) * circumference} ${circumference}`}
                                          />
                                        </svg>
                                        {prog.done}/{prog.total}
                                      </span>
                                    );
                                  })()}
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

                    {readOnly ? null : templates && templates.length > 0 && createFromTemplate ? (
                      <Menu as="div" className="relative">
                        <MenuButton className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand-dark">
                          <PlusIcon className="h-4 w-4" />
                          <Trans>New card</Trans>
                        </MenuButton>
                        <MenuItems anchor="bottom start" className={`z-30 w-52 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${portalCls}`}>
                          <MenuItem>
                            <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100" onClick={() => setAddingIn(col.key)}>
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
                      <button type="button" className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand-dark" onClick={() => setAddingIn(col.key)}>
                        <PlusIcon className="h-4 w-4" />
                        <Trans>New card</Trans>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {editableColumns &&
              !readOnly &&
              actions.addColumn &&
              (addingColumn ? (
                <input
                  autoFocus
                  className="w-44 shrink-0 self-start rounded-xl border border-brand/40 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand/40"
                  placeholder={t`Status name`}
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
                  <Trans>Add status</Trans>
                </button>
              ))}
            {customSwimlanes && !readOnly && (
              <button
                type="button"
                className="flex w-72 shrink-0 self-start items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-400 transition hover:border-brand/40 hover:bg-brand-soft/20 hover:text-brand-dark active:translate-y-px"
                onClick={() => setSwimlaneManagerOpen(true)}
              >
                <PlusIcon className="h-4 w-4" />
                <Trans>Add swimlane</Trans>
              </button>
            )}
          </div>
        )}
      </div>

      {multiSel.size > 0 && !readOnly && (
        <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-black/[0.08] bg-white/95 px-3 py-2 shadow-xl backdrop-blur">
          <span className="text-xs font-medium text-stone-600">
            <Trans>{multiSel.size} selected</Trans>
          </span>
          <select
            className={ctrlCls}
            value=""
            aria-label={t`Set status`}
            onChange={(e) => {
              if (e.target.value) applyBulk({ columnKey: e.target.value });
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              {t`Status…`}
            </option>
            {config.columns.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={ctrlCls}
            value=""
            aria-label={t`Set priority`}
            onChange={(e) => {
              if (e.target.value) applyBulk({ priority: e.target.value });
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              {t`Priority…`}
            </option>
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {actions.deleteCards && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              onClick={() => {
                const targets = cards.filter((c) => multiSel.has(c.id));
                setMultiSel(new Set());
                void actions.deleteCards?.(targets);
              }}
            >
              <TrashIcon className="h-3.5 w-3.5" />
              <Trans>Delete</Trans>
            </button>
          )}
          <button
            type="button"
            className="rounded p-1 text-stone-400 hover:bg-stone-100"
            title={t`Clear selection`}
            aria-label={t`Clear selection`}
            onClick={() => setMultiSel(new Set())}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <CardCreateDialog
        open={addingIn != null}
        boardTitle={config.title}
        laneName={columns.find((column) => column.key === addingIn)?.name ?? t`Unassigned`}
        initialStatus={groupKey === "status" ? addingIn ?? config.columns[0]?.key ?? "" : config.columns[0]?.key ?? ""}
        initialPriority={groupKey === "priority" ? addingIn ?? "none" : "none"}
        initialAssignee={groupKey === "assignee" ? addingIn ?? "" : ""}
        statusOptions={config.columns.map((column) => ({
          value: column.key,
          label: column.name,
          color: column.color,
        }))}
        assigneeOptions={assigneeOptions}
        tagOptions={tagOptions}
        portalClassName={portalClassName}
        onClose={() => setAddingIn(null)}
        onCreate={(draft) => (addingIn == null ? undefined : commitCreate(addingIn, draft))}
      />

      {selected && PeekComponent && (
        <Dialog
          open
          onClose={() => setSelectedId(null)}
          className={`fixed inset-0 z-50${portalCls}`}
        >
          <DialogBackdrop className={`fixed inset-0 bg-stone-950/20 backdrop-blur-[2px]${portalCls}`} />
          <div className={`fixed inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-5${portalCls}`}>
            <DialogPanel
              className={`h-full max-h-[900px] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_100px_rgba(28,25,23,0.24)] ring-1 ring-black/[0.06]${portalCls}`}
            >
              <DialogTitle className="sr-only">
                <Trans>Card details</Trans>
              </DialogTitle>
              <PeekComponent
                card={selected}
                boardTitle={config.title}
                statusOptions={config.columns.map((c) => ({ value: c.key, label: c.name }))}
                swimlaneOptions={
                  config.swimlaneBy === "custom" || (config.swimlanes?.length ?? 0) > 0
                    ? [
                        { value: "", label: t`Unassigned` },
                        ...(config.swimlanes ?? []).map((lane) => ({
                          value: lane.key,
                          label: lane.name,
                          color: lane.color,
                        })),
                        ...(selected.swimlaneKey &&
                        !(config.swimlanes ?? []).some((lane) => lane.key === selected.swimlaneKey)
                          ? [
                              {
                                value: selected.swimlaneKey,
                                label: t`Previous swimlane missing`,
                                warning: true,
                              },
                            ]
                          : []),
                      ]
                    : undefined
                }
                swimlaneDisabled={conversionRequested}
                assigneeOptions={assigneeOptions}
                tagOptions={tagOptions}
                fields={config.fields}
                onAddField={(label) => {
                  // Seed with the reserved card keys so a custom field can never
                  // collide with (and clobber) a core frontmatter attribute.
                  const existing = new Set([...RESERVED_CARD_KEYS, ...(config.fields ?? []).map((f) => f.key)]);
                  let key = slugify(label);
                  if (existing.has(key)) {
                    let n = 2;
                    while (existing.has(`${key}-${n}`)) n += 1;
                    key = `${key}-${n}`;
                  }
                  setConfigSafely({ fields: [...(config.fields ?? []), { key, label }] });
                }}
                dependencyCards={cards
                  .filter((c) => c.id !== selected.id)
                  .map((c) => ({ slug: cardRelationKey(c), title: c.title }))}
                childCards={(childrenMap.get(selected.id) ?? []).map((c) => ({
                  id: c.id,
                  title: c.title,
                  icon: c.icon,
                  statusName: statusName(c.columnKey),
                  done: c.columnKey === doneKey,
                }))}
                onOpenCard={(cardId) => setSelectedId(cardId)}
                onAddChild={
                  readOnly
                    ? undefined
                    : async (title) => {
                        await cardUpdateQueues.current.get(selected.id);
                        // Status sub-cards enter the first workflow state; other
                        // dimensions keep the new card beside its parent.
                        const startLane =
                          groupKey === "status"
                            ? config.columns[0]?.key ?? selected.columnKey
                            : boardLaneValueOf(selected, config);
                        await actions.createCard(startLane, title, {
                          parent: cardRelationKey(selected),
                        });
                      }
                }
                loadNotes={loadNotes}
                onUploadAttachment={onUploadAttachment}
                loadComments={loadComments}
                addComment={addComment}
                updateComment={updateComment}
                deleteComment={deleteComment}
                toggleReaction={toggleReaction}
                resolveComment={resolveComment}
                currentUser={currentUser}
                loadActivity={loadActivity}
                renderMarkdownToContainer={renderMarkdownToContainer}
                renderMarkdownToHtml={renderMarkdownToHtml}
                portalClassName={portalClassName}
                supplement={renderCardSupplement?.(selected)}
                onChange={(patch) => void queueCardUpdate(selected.id, patch)}
                onClose={() => setSelectedId(null)}
                onDelete={() => void actions.deleteCard(selected)}
                onOpenFull={actions.openCardFull ? () => actions.openCardFull?.(selected) : undefined}
              />
            </DialogPanel>
          </div>
        </Dialog>
      )}

      <SwimlaneManagerDialog
        open={swimlaneManagerOpen}
        lanes={config.swimlanes ?? []}
        cards={cards}
        portalClassName={portalClassName}
        onClose={() => setSwimlaneManagerOpen(false)}
        onSaveLanes={saveCustomLanes}
        onUpdateCards={updateManyCards}
        onShowAffected={showMissingSwimlanes}
      />

      <StatusManagerDialog
        open={statusManagerOpen}
        config={config}
        actions={actions}
        portalClassName={portalClassName}
        onClose={() => setStatusManagerOpen(false)}
      />

      <SwimlaneConversionDialog
        source={conversionSource}
        rows={conversionRows}
        open={conversionOpen}
        busy={conversionRequested}
        resume={config.swimlaneMigration?.source === conversionSource}
        progress={conversionProgress}
        error={conversionError}
        portalClassName={portalClassName}
        onClose={() => {
          if (!conversionRequested) setConversionOpen(false);
        }}
        onConfirm={startConversion}
      />

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
