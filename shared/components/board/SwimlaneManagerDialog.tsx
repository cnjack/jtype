import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Bars3Icon,
  ClipboardDocumentIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  COLUMN_COLORS,
  newSwimlaneKey,
  validateSwimlanes,
  validateSwimlaneName,
  type BoardSwimlane,
  type BoardViewCard,
} from "../../lib/board";
import type { BoardOption } from "./types";
import {
  SwimlaneDeleteDialog,
  type SwimlaneDeleteChoice,
} from "./SwimlaneDeleteDialog";

type CardUpdate = { cardId: string; patch: Partial<BoardViewCard> };

export function SwimlaneManagerDialog({
  open,
  lanes,
  cards,
  focusRequest,
  portalClassName,
  onClose,
  onSaveLanes,
  onUpdateCards,
  onShowAffected,
}: {
  open: boolean;
  lanes: BoardSwimlane[];
  cards: BoardViewCard[];
  focusRequest?: { id: number; laneKey: string; action: "rename" | "delete" };
  portalClassName?: string;
  onClose: () => void;
  onSaveLanes: (next: BoardSwimlane[]) => Promise<void> | void;
  onUpdateCards: (
    updates: CardUpdate[],
    onProgress?: (completed: number, total: number) => void,
  ) => Promise<void> | void;
  onShowAffected: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState("");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [rowError, setRowError] = useState<{ key: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteLane, setDeleteLane] = useState<BoardSwimlane | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteProgress, setDeleteProgress] = useState<{ completed: number; total: number } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const dragRef = useRef<{ key: string; x: number; y: number; moved: boolean } | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const savingRef = useRef(false);
  const consumedFocusRequest = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setAdding(false);
      setAddDraft("");
      setEditKey(null);
      setRowError(null);
      setDeleteLane(null);
      setDeleteError("");
      setDeleteProgress(null);
      setAnnouncement("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !focusRequest) return;
    if (consumedFocusRequest.current === focusRequest.id) return;
    const lane = lanes.find((item) => item.key === focusRequest.laneKey);
    if (!lane) return;
    consumedFocusRequest.current = focusRequest.id;
    if (focusRequest.action === "rename") {
      setEditKey(lane.key);
      setEditDraft(lane.name);
      setRowError(null);
    } else {
      setDeleteError("");
      setDeleteProgress(null);
      setDeleteLane(lane);
    }
  }, [focusRequest?.id, open, lanes]);

  const portal = portalClassName ? ` ${portalClassName}` : "";
  const counts = useMemo(() => {
    const next = new Map<string, number>();
    for (const card of cards) {
      if (card.swimlaneKey) next.set(card.swimlaneKey, (next.get(card.swimlaneKey) ?? 0) + 1);
    }
    return next;
  }, [cards]);
  const issues = useMemo(() => validateSwimlanes({ swimlanes: lanes }, cards), [lanes, cards]);
  const danglingCount = issues
    .filter((issue) => issue.kind === "dangling_swimlane")
    .reduce((total, issue) => total + issue.cardCount, 0);
  const definitionIssues = issues.filter((issue) => issue.kind !== "dangling_swimlane");

  const persist = async (next: BoardSwimlane[], key = "dialog") => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setRowError(null);
    try {
      await onSaveLanes(next);
    } catch (error) {
      setRowError({ key, message: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const moveLane = (key: string, delta: -1 | 1) => {
    const from = lanes.findIndex((lane) => lane.key === key);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= lanes.length || saving) return;
    const next = [...lanes];
    const [lane] = next.splice(from, 1);
    if (!lane) return;
    next.splice(to, 0, lane);
    void persist(next, key)
      .then(() => setAnnouncement(t`${lane.name} moved to position ${to + 1} of ${lanes.length}.`))
      .catch(() => undefined);
  };

  const reorderLane = (fromKey: string, toKey: string) => {
    if (fromKey === toKey || saving) return;
    const next = [...lanes];
    const from = next.findIndex((lane) => lane.key === fromKey);
    const to = next.findIndex((lane) => lane.key === toKey);
    if (from < 0 || to < 0) return;
    const [lane] = next.splice(from, 1);
    if (!lane) return;
    next.splice(to, 0, lane);
    void persist(next, fromKey)
      .then(() => setAnnouncement(t`${lane.name} moved to position ${to + 1} of ${lanes.length}.`))
      .catch(() => undefined);
  };

  const onHandleDown = (event: ReactPointerEvent<HTMLButtonElement>, key: string) => {
    if (event.button !== 0 || saving) return;
    dragRef.current = { key, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onHandleMove = (event: ReactPointerEvent<HTMLButtonElement>, key: string) => {
    const drag = dragRef.current;
    if (!drag || drag.key !== key) return;
    if (!drag.moved) {
      if (Math.abs(event.clientX - drag.x) < 4 && Math.abs(event.clientY - drag.y) < 4) return;
      drag.moved = true;
      setDraggingKey(key);
    }
  };
  const onHandleUp = (event: ReactPointerEvent<HTMLButtonElement>, key: string) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDraggingKey(null);
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is optional in embedded browsers.
    }
    if (!drag?.moved || drag.key !== key) return;
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-swimlane-row]")
      ?.dataset.swimlaneRow;
    if (target) reorderLane(key, target);
  };

  const startRename = (lane: BoardSwimlane) => {
    setRowError(null);
    setEditKey(lane.key);
    setEditDraft(lane.name);
  };
  const commitRename = async (lane: BoardSwimlane) => {
    const message = validateSwimlaneName(editDraft, lanes, lane.key);
    if (message) {
      setRowError({ key: lane.key, message });
      return;
    }
    const name = editDraft.trim();
    setEditKey(null);
    if (name === lane.name) return;
    await persist(lanes.map((item) => (item.key === lane.key ? { ...item, name } : item)), lane.key).catch(() => {
      setEditKey(lane.key);
    });
  };

  const commitAdd = async () => {
    const message = validateSwimlaneName(addDraft, lanes);
    if (message) {
      setRowError({ key: "new", message });
      return;
    }
    const name = addDraft.trim();
    const existing = [
      ...lanes.map((lane) => lane.key),
      ...cards.map((card) => card.swimlaneKey).filter((key): key is string => !!key),
    ];
    const lane: BoardSwimlane = { key: newSwimlaneKey(name, existing), name };
    setAdding(false);
    setAddDraft("");
    await persist([...lanes, lane], "new").catch(() => {
      setAdding(true);
      setAddDraft(name);
    });
  };

  const setColor = (lane: BoardSwimlane, color: string | null) => {
    if (saving) return;
    void persist(
      lanes.map((item) => (item.key === lane.key ? { ...item, color } : item)),
      lane.key,
    ).catch(() => undefined);
  };

  const confirmDelete = async (choice: SwimlaneDeleteChoice) => {
    if (!deleteLane || deleteBusy) return;
    const affected = cards.filter((card) => card.swimlaneKey === deleteLane.key);
    setDeleteBusy(true);
    setDeleteError("");
    setDeleteProgress(null);
    try {
      if (choice.mode === "move" && affected.length > 0) {
        const updates = affected.map((card) => ({
          cardId: card.id,
          patch: { swimlaneKey: choice.targetKey },
        }));
        setDeleteProgress({ completed: 0, total: updates.length });
        await onUpdateCards(updates, (completed, total) => setDeleteProgress({ completed, total }));
      }
      await onSaveLanes(lanes.filter((lane) => lane.key !== deleteLane.key));
      setDeleteLane(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : String(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  const deleteTargets: BoardOption[] = deleteLane
    ? [
        { value: "", label: t`Unassigned` },
        ...lanes
          .filter((lane) => lane.key !== deleteLane.key)
          .map((lane) => ({ value: lane.key, label: lane.name, color: lane.color })),
      ]
    : [];

  return (
    <>
      <Dialog
        open={open}
        onClose={() => {
          if (!saving && !deleteBusy) onClose();
        }}
        className={`relative z-40${portal}`}
      >
        <DialogBackdrop className={`fixed inset-0 bg-stone-950/30 backdrop-blur-sm${portal}`} />
        <div className={`fixed inset-0 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4${portal}`}>
          <DialogPanel
            aria-describedby="swimlane-manager-description"
            className={`flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06] sm:rounded-2xl${portal}`}
          >
            <div className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                <Bars3Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-semibold tracking-tight text-stone-900">
                  <Trans>Manage swimlanes</Trans>
                </DialogTitle>
                <p id="swimlane-manager-description" className="mt-1 text-xs leading-5 text-brand-gray">
                  <Trans>Horizontal groups for this board. Names can change; card mapping stays attached.</Trans>
                </p>
                <span className="sr-only" aria-live="polite">{announcement}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!saving) onClose();
                }}
                aria-disabled={saving}
                title={t`Close`}
                aria-label={t`Close`}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <ul aria-label={t`Swimlanes`} className="space-y-1">
                {lanes.map((lane, index) => {
                  const error = rowError?.key === lane.key ? rowError.message : null;
                  return (
                    <li
                      key={`${lane.key}-${index}`}
                      data-swimlane-row={lane.key}
                      className={`rounded-xl transition ${draggingKey === lane.key ? "opacity-50" : ""}`}
                    >
                      <div className="group flex min-h-12 items-center gap-2 px-2 hover:bg-stone-50 focus-within:bg-stone-50">
                        <button
                          type="button"
                          onPointerDown={(event) => onHandleDown(event, lane.key)}
                          onPointerMove={(event) => onHandleMove(event, lane.key)}
                          onPointerUp={(event) => onHandleUp(event, lane.key)}
                          title={t`Drag to reorder`}
                          aria-label={t`Reorder ${lane.name}`}
                          className="hidden h-9 w-7 shrink-0 touch-none items-center justify-center rounded-lg text-stone-300 hover:bg-white hover:text-stone-500 active:cursor-grabbing md:flex md:cursor-grab"
                        >
                          <Bars3Icon className="h-4 w-4" />
                        </button>

                        <Popover className="relative shrink-0">
                          <PopoverButton
                            title={t`Change color`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                          >
                            <span
                              className="h-4 w-4 rounded-full bg-stone-300 ring-1 ring-black/10"
                              style={lane.color ? { backgroundColor: lane.color } : undefined}
                              aria-hidden
                            />
                          </PopoverButton>
                          <PopoverPanel
                            anchor="bottom start"
                            className={`z-50 w-52 rounded-xl border border-line bg-white p-3 shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${portal}`}
                          >
                            <p className="text-[11px] font-medium text-brand-gray">
                              <Trans>Swimlane color</Trans>
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {COLUMN_COLORS.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setColor(lane, color)}
                                  title={color}
                                  className={`h-5 w-5 rounded-full ring-1 ring-black/10 ${
                                    lane.color === color ? "ring-2 ring-brand ring-offset-2" : ""
                                  }`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                              <button
                                type="button"
                                onClick={() => setColor(lane, null)}
                                title={t`No color`}
                                className={`flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/10 ${
                                  !lane.color ? "ring-2 ring-brand ring-offset-2" : ""
                                }`}
                              >
                                <XMarkIcon className="h-3 w-3 text-stone-400" />
                              </button>
                            </div>
                          </PopoverPanel>
                        </Popover>

                        {editKey === lane.key ? (
                          <form
                            className="min-w-0 flex-1"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void commitRename(lane);
                            }}
                          >
                            <input
                              autoFocus
                              value={editDraft}
                              maxLength={80}
                              onChange={(event) => setEditDraft(event.target.value)}
                              onBlur={() => void commitRename(lane)}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  setEditKey(null);
                                  setRowError(null);
                                }
                              }}
                              aria-label={t`Swimlane name`}
                              className="h-8 w-full rounded-lg border border-brand/40 bg-white px-2 text-xs font-medium text-stone-800 outline-none ring-2 ring-brand/10"
                            />
                          </form>
                        ) : (
                          <button
                            type="button"
                            onDoubleClick={() => startRename(lane)}
                            className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-stone-800"
                            title={lane.name}
                          >
                            {lane.name}
                          </button>
                        )}

                        <span className="shrink-0 tabular-nums text-[11px] text-brand-gray">
                          {counts.get(lane.key) ?? 0} <Trans>cards</Trans>
                        </span>

                        <Popover className="relative shrink-0">
                          <Menu>
                            <MenuButton
                              title={t`Swimlane actions`}
                              aria-label={t`Actions for ${lane.name}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 opacity-100 hover:bg-white hover:text-stone-600 md:opacity-0 md:group-hover:opacity-100 md:data-[open]:opacity-100"
                            >
                              <EllipsisHorizontalIcon className="h-4 w-4" />
                            </MenuButton>
                            <MenuItems
                              anchor="bottom end"
                              className={`z-50 w-48 rounded-xl border border-line bg-white py-1 text-xs shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${portal}`}
                            >
                              <MenuItem>
                                <button
                                  type="button"
                                  onClick={() => startRename(lane)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100"
                                >
                                  <PencilIcon className="h-3.5 w-3.5" />
                                  <Trans>Rename</Trans>
                                </button>
                              </MenuItem>
                              <MenuItem>
                                <button
                                  type="button"
                                  onClick={() => moveLane(lane.key, -1)}
                                  disabled={index === 0 || saving}
                                  aria-disabled={index === 0 || saving}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100"
                                >
                                  <ArrowUpIcon className="h-3.5 w-3.5" />
                                  <Trans>Move up</Trans>
                                </button>
                              </MenuItem>
                              <MenuItem>
                                <button
                                  type="button"
                                  onClick={() => moveLane(lane.key, 1)}
                                  disabled={index === lanes.length - 1 || saving}
                                  aria-disabled={index === lanes.length - 1 || saving}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100"
                                >
                                  <ArrowDownIcon className="h-3.5 w-3.5" />
                                  <Trans>Move down</Trans>
                                </button>
                              </MenuItem>
                              <MenuItem>
                                <PopoverButton className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100">
                                  <InformationCircleIcon className="h-3.5 w-3.5" />
                                  <Trans>Details</Trans>
                                </PopoverButton>
                              </MenuItem>
                              <div className="my-1 border-t border-line" />
                              <MenuItem>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteError("");
                                    setDeleteProgress(null);
                                    setDeleteLane(lane);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 data-[focus]:bg-red-50"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                  <Trans>Delete</Trans>
                                </button>
                              </MenuItem>
                            </MenuItems>
                          </Menu>
                          <PopoverPanel
                            anchor="bottom end"
                            className={`z-50 w-80 rounded-xl border border-line bg-white p-4 shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${portal}`}
                          >
                            <div className="flex items-center gap-2">
                              <InformationCircleIcon className="h-4 w-4 text-brand-dark" />
                              <p className="text-xs font-semibold text-stone-800">
                                <Trans>Lane details</Trans>
                              </p>
                            </div>
                            <dl className="mt-3 grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-2 gap-y-2 text-[11px]">
                              <dt className="text-brand-gray">
                                <Trans>Name</Trans>
                              </dt>
                              <dd className="truncate font-medium text-stone-700">{lane.name}</dd>
                              <dt className="text-brand-gray">
                                <Trans>Lane ID</Trans>
                              </dt>
                              <dd className="flex min-w-0 items-center gap-1.5">
                                <code className="min-w-0 flex-1 truncate rounded bg-stone-100 px-1.5 py-1 text-[10px] text-stone-600">
                                  {lane.key}
                                </code>
                                <button
                                  type="button"
                                  title={t`Copy lane ID`}
                                  aria-label={t`Copy lane ID`}
                                  onClick={() => {
                                    void navigator.clipboard?.writeText(lane.key).then(() => {
                                      setCopiedKey(lane.key);
                                      window.setTimeout(() => setCopiedKey(null), 1600);
                                    });
                                  }}
                                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-stone-200 px-2 text-[10px] font-medium text-brand-dark hover:border-brand/30"
                                >
                                  <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                                  {copiedKey === lane.key ? t`Copied` : t`Copy`}
                                </button>
                              </dd>
                              <dt className="text-brand-gray">
                                <Trans>Used by</Trans>
                              </dt>
                              <dd className="tabular-nums text-stone-700">
                                {counts.get(lane.key) ?? 0} <Trans>cards</Trans>
                              </dd>
                            </dl>
                          </PopoverPanel>
                        </Popover>
                      </div>
                      {error && (
                        <div className="mx-2 mb-1 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800" role="alert">
                          <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                          {error}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {adding ? (
                <form
                  className="mt-2 rounded-xl border border-dashed border-brand/30 bg-brand-soft/20 p-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void commitAdd();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-dark">
                      <PlusIcon className="h-4 w-4" />
                    </span>
                    <input
                      autoFocus
                      value={addDraft}
                      maxLength={80}
                      onChange={(event) => setAddDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setAdding(false);
                          setAddDraft("");
                          setRowError(null);
                        }
                      }}
                      placeholder={t`Swimlane name`}
                      aria-label={t`Swimlane name`}
                      className="h-8 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                    />
                    <button
                      type="submit"
                      aria-disabled={saving}
                      className="h-8 rounded-lg bg-brand-dark px-3 text-xs font-semibold text-white hover:bg-brand aria-disabled:opacity-50"
                    >
                      <Trans>Add</Trans>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdding(false);
                        setAddDraft("");
                        setRowError(null);
                      }}
                      className="h-8 rounded-lg px-2 text-xs font-medium text-brand-gray hover:bg-white"
                    >
                      <Trans>Cancel</Trans>
                    </button>
                  </div>
                  {rowError?.key === "new" && (
                    <p className="mt-1.5 pl-10 text-[11px] text-amber-700" role="alert">
                      {rowError.message}
                    </p>
                  )}
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAdding(true);
                    setAddDraft("");
                    setRowError(null);
                  }}
                  className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed border-brand/20 bg-brand-soft/20 px-3 text-left text-xs font-semibold text-brand-dark hover:border-brand/40 hover:bg-brand-soft/40"
                >
                  <PlusIcon className="h-4 w-4" />
                  <Trans>Add swimlane</Trans>
                </button>
              )}

              {(definitionIssues.length > 0 || danglingCount > 0) && (
                <section className="mt-4 border-t border-line pt-3" aria-labelledby="swimlane-issues-title">
                  <h3 id="swimlane-issues-title" className="text-[10px] font-semibold uppercase tracking-wider text-brand-gray">
                    <Trans>Issues</Trans>
                  </h3>
                  <div className="mt-2 space-y-2">
                    {definitionIssues.map((issue) => (
                      <div
                        key={`${issue.kind}-${issue.kind === "duplicate_swimlane_key" ? issue.key : issue.name}`}
                        className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-3 text-xs text-amber-800"
                        role="alert"
                      >
                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                        <span>
                          {issue.kind === "duplicate_swimlane_key"
                            ? t`Duplicate lane ID "${issue.key}". The first definition is used.`
                            : t`Duplicate swimlane name "${issue.name}". Names should be unique.`}
                        </span>
                      </div>
                    ))}
                    {danglingCount > 0 && (
                      <div className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-3 text-xs text-amber-800">
                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          {t`${danglingCount} card(s) refer to deleted swimlanes.`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onShowAffected();
                          }}
                          className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-semibold hover:bg-amber-100"
                        >
                          <Trans>Show affected cards</Trans>
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            <div className="flex min-h-12 items-center border-t border-line bg-stone-50 px-5 py-3">
              <span className="text-[11px] text-brand-gray" aria-live="polite">
                {saving ? t`Saving…` : t`Changes save automatically.`}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!saving) onClose();
                }}
                aria-disabled={saving}
                className="ml-auto rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              >
                <Trans>Done</Trans>
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <SwimlaneDeleteDialog
        lane={deleteLane}
        cardCount={deleteLane ? counts.get(deleteLane.key) ?? 0 : 0}
        targets={deleteTargets}
        busy={deleteBusy}
        progress={deleteProgress}
        error={deleteError}
        portalClassName={portalClassName}
        onClose={() => {
          if (!deleteBusy) setDeleteLane(null);
        }}
        onConfirm={confirmDelete}
      />
    </>
  );
}
