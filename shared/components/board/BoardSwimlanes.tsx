import { Fragment, useState } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
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
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  InformationCircleIcon,
  PencilIcon,
  PlusIcon,
  RectangleGroupIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  COLUMN_COLORS,
  PRIORITY_STYLE,
  partitionSwimlanes,
  sortCards,
  type BoardGroupKey,
  type BoardSortKey,
  type BoardSwimlaneGroupKey,
  type BoardViewCard,
  type BoardViewColumn,
  type BoardViewConfig,
} from "../../lib/board";
import type { BoardActions } from "./types";

type LaneManagerRequest = {
  laneKey: string;
  action: "rename" | "delete";
};

/**
 * Two-dimensional board view rendered as one scrollport + one CSS grid. The
 * top headers, left lane rails, and corner share the same grid so they stay
 * aligned while both axes scroll.
 */
export function BoardSwimlanes({
  cards,
  columns,
  lanes,
  config,
  groupKey,
  swimlaneKey,
  sortBy,
  today,
  doneKey,
  selectedId,
  actions,
  readOnly,
  portalClassName,
  onSelect,
  onOpenManager,
  onManageLane,
  onMoveCustomLane,
  onSetCustomLaneColor,
  onShowMissing,
}: {
  cards: BoardViewCard[];
  columns: BoardViewColumn[];
  lanes: BoardViewColumn[];
  config: BoardViewConfig;
  groupKey: BoardGroupKey;
  swimlaneKey: BoardSwimlaneGroupKey;
  sortBy: BoardSortKey;
  today: string;
  doneKey: string;
  selectedId?: string;
  actions: BoardActions;
  readOnly?: boolean;
  portalClassName?: string;
  onSelect: (card: BoardViewCard) => void;
  onOpenManager: () => void;
  onManageLane: (request: LaneManagerRequest) => void;
  onMoveCustomLane: (laneKey: string, delta: -1 | 1) => void;
  onSetCustomLaneColor: (laneKey: string, color: string | null) => void;
  onShowMissing: () => void;
}) {
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnDraft, setColumnDraft] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const portal = portalClassName ? ` ${portalClassName}` : "";
  const grid = partitionSwimlanes(cards, groupKey, swimlaneKey, config.swimlanes);
  const gridStyle = {
    gridTemplateColumns: `9rem repeat(${Math.max(columns.length, 1)}, minmax(15rem, 1fr))`,
  };
  const customLanes = (config.swimlanes ?? []).filter(
    (lane, index, all) => all.findIndex((candidate) => candidate.key === lane.key) === index,
  );
  const customByKey = new Map(customLanes.map((lane) => [lane.key, lane]));
  const missingCount =
    swimlaneKey === "custom"
      ? cards.filter(
          (card) =>
            !!card.swimlaneKey && !customByKey.has(card.swimlaneKey),
        ).length
      : 0;

  const laneTotal = (laneKey: string) => {
    const row = grid.get(laneKey);
    return row ? [...row.values()].reduce((total, cell) => total + cell.length, 0) : 0;
  };
  const visibleLanes = lanes.filter((lane) => lane.key !== "" || laneTotal(lane.key) > 0);

  const cardChip = (card: BoardViewCard) => {
    const overdue = card.due && card.due < today && card.columnKey !== doneKey;
    return (
      <button
        key={card.id}
        type="button"
        onClick={() => onSelect(card)}
        title={card.title}
        data-card-id={card.id}
        className={`block w-full rounded-lg bg-white p-2 text-left text-sm shadow-sm ring-1 transition hover:ring-brand/30 focus:outline-none focus:ring-2 focus:ring-brand/40 ${
          selectedId === card.id ? "ring-brand/60" : "ring-black/[0.04]"
        }`}
      >
        {card.ticket && (
          <span className="mb-0.5 inline-block rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] font-medium tracking-tight text-stone-500">
            {card.ticket}
          </span>
        )}
        <span className="block truncate text-stone-800">
          {card.icon && <span className="mr-1">{card.icon}</span>}
          {card.title}
        </span>
        {((card.priority && card.priority !== "none") || card.due || (card.taskTotal ?? 0) > 0) && (
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {card.priority && card.priority !== "none" && (
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_STYLE[card.priority] ?? "bg-stone-100 text-stone-500"}`}>
                {card.priority}
              </span>
            )}
            {(card.taskTotal ?? 0) > 0 && (
              <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                card.taskDone === card.taskTotal
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-stone-100 text-stone-500"
              }`}>
                <CheckCircleIcon className="h-3 w-3" />
                {card.taskDone}/{card.taskTotal}
              </span>
            )}
            {card.due && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] ${
                overdue ? "font-medium text-red-600" : "text-brand-gray"
              }`}>
                <CalendarDaysIcon className="h-3 w-3" />
                {card.due}
              </span>
            )}
          </span>
        )}
      </button>
    );
  };

  const statusMenu = (col: BoardViewColumn, index: number) => {
    const isDone = doneKey === col.key;
    const hasActions =
      actions.renameColumn ||
      actions.toggleDoneColumn ||
      actions.setColumnLimit ||
      actions.setColumnColor ||
      actions.deleteColumn;
    if (readOnly || !hasActions) return null;
    return (
      <Menu as="div" className="relative shrink-0">
        <MenuButton
          title={t`Status actions`}
          aria-label={t`Actions for ${col.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600"
        >
          <EllipsisHorizontalIcon className="h-4 w-4" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          className={`z-50 w-48 rounded-xl border border-line bg-white py-1 text-xs shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${portal}`}
        >
          {actions.renameColumn && (
            <MenuItem>
              <button
                type="button"
                onClick={() => void actions.renameColumn?.(col.key)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100"
              >
                <PencilIcon className="h-3.5 w-3.5" />
                <Trans>Rename</Trans>
              </button>
            </MenuItem>
          )}
          {actions.reorderColumns && (
            <>
              <MenuItem>
                <button
                  type="button"
                  disabled={index === 0}
                  aria-disabled={index === 0}
                  onClick={() => {
                    const previous = columns[index - 1];
                    if (previous) void actions.reorderColumns?.(col.key, previous.key);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100"
                >
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                  <Trans>Move left</Trans>
                </button>
              </MenuItem>
              <MenuItem>
                <button
                  type="button"
                  disabled={index === columns.length - 1}
                  aria-disabled={index === columns.length - 1}
                  onClick={() => {
                    const next = columns[index + 1];
                    if (next) void actions.reorderColumns?.(col.key, next.key);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100"
                >
                  <ArrowDownIcon className="h-3.5 w-3.5 -rotate-90" />
                  <Trans>Move right</Trans>
                </button>
              </MenuItem>
            </>
          )}
          {actions.toggleDoneColumn && (
            <MenuItem>
              <button
                type="button"
                onClick={() => void actions.toggleDoneColumn?.(col.key)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100"
              >
                <CheckCircleIcon className="h-3.5 w-3.5" />
                {isDone ? <Trans>Unset done column</Trans> : <Trans>Set as done column</Trans>}
              </button>
            </MenuItem>
          )}
          {actions.setColumnLimit && (
            <MenuItem>
              <button
                type="button"
                onClick={() => void actions.setColumnLimit?.(col.key)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100"
              >
                <FunnelIcon className="h-3.5 w-3.5" />
                <Trans>Set WIP limit</Trans>
              </button>
            </MenuItem>
          )}
          {actions.setColumnColor && (
            <>
              <div className="my-1 border-t border-line" />
              <div className="px-3 py-2">
                <span className="text-[11px] text-brand-gray">
                  <Trans>Color</Trans>
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLUMN_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => void actions.setColumnColor?.(col.key, color)}
                      title={color}
                      className={`h-5 w-5 rounded-full ring-1 ring-black/10 ${
                        col.color === color ? "ring-2 ring-brand ring-offset-2" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <button
                    type="button"
                    title={t`No color`}
                    onClick={() => void actions.setColumnColor?.(col.key, null)}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/10"
                  >
                    <XMarkIcon className="h-3 w-3 text-stone-400" />
                  </button>
                </div>
              </div>
            </>
          )}
          {actions.deleteColumn && (
            <>
              <div className="my-1 border-t border-line" />
              <MenuItem>
                <button
                  type="button"
                  disabled={columns.length <= 1}
                  aria-disabled={columns.length <= 1}
                  onClick={() => {
                    if (columns.length > 1) void actions.deleteColumn?.(col.key);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 aria-disabled:opacity-40 data-[focus]:bg-red-50"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  <Trans>Delete</Trans>
                </button>
              </MenuItem>
            </>
          )}
        </MenuItems>
      </Menu>
    );
  };

  const customLaneMenu = (lane: BoardViewColumn, index: number) => {
    const definition = customByKey.get(lane.key);
    if (!definition || readOnly) return null;
    return (
      <Popover className="relative shrink-0">
        <Menu>
          <MenuButton
            title={t`Swimlane actions`}
            aria-label={t`Actions for ${lane.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600"
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
                onClick={() => onManageLane({ laneKey: lane.key, action: "rename" })}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100"
              >
                <PencilIcon className="h-3.5 w-3.5" />
                <Trans>Rename</Trans>
              </button>
            </MenuItem>
            <MenuItem>
              <button
                type="button"
                disabled={index === 0}
                aria-disabled={index === 0}
                onClick={() => onMoveCustomLane(lane.key, -1)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100"
              >
                <ArrowUpIcon className="h-3.5 w-3.5" />
                <Trans>Move up</Trans>
              </button>
            </MenuItem>
            <MenuItem>
              <button
                type="button"
                disabled={index === customLanes.length - 1}
                aria-disabled={index === customLanes.length - 1}
                onClick={() => onMoveCustomLane(lane.key, 1)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100"
              >
                <ArrowDownIcon className="h-3.5 w-3.5" />
                <Trans>Move down</Trans>
              </button>
            </MenuItem>
            <div className="my-1 border-t border-line" />
            <div className="px-3 py-2">
              <span className="text-[11px] text-brand-gray">
                <Trans>Color</Trans>
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {COLUMN_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onSetCustomLaneColor(lane.key, color)}
                    title={color}
                    className={`h-5 w-5 rounded-full ring-1 ring-black/10 ${
                      definition.color === color ? "ring-2 ring-brand ring-offset-2" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <button
                  type="button"
                  title={t`No color`}
                  onClick={() => onSetCustomLaneColor(lane.key, null)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/10"
                >
                  <XMarkIcon className="h-3 w-3 text-stone-400" />
                </button>
              </div>
            </div>
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
                onClick={() => onManageLane({ laneKey: lane.key, action: "delete" })}
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
          <p className="flex items-center gap-2 text-xs font-semibold text-stone-800">
            <InformationCircleIcon className="h-4 w-4 text-brand-dark" />
            <Trans>Lane details</Trans>
          </p>
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
              {laneTotal(lane.key)} <Trans>cards</Trans>
            </dd>
          </dl>
        </PopoverPanel>
      </Popover>
    );
  };

  if (swimlaneKey === "custom" && customLanes.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-stone-50 p-6">
        <section className="w-full max-w-md rounded-2xl bg-white px-8 py-10 text-center shadow-lg shadow-emerald-950/10 ring-1 ring-black/[0.05]">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
            <RectangleGroupIcon className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold tracking-tight text-stone-900">
            <Trans>Create your first swimlane</Trans>
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-brand-gray">
            <Trans>Add stable horizontal groups that stay visible even when they have no cards.</Trans>
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={onOpenManager}
              className="mt-5 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand-dark px-3 text-xs font-semibold text-white hover:bg-brand"
            >
              <PlusIcon className="h-4 w-4" />
              <Trans>Add swimlane</Trans>
            </button>
          )}
        </section>
      </div>
    );
  }

  return (
    <div
      className="min-h-0 flex-1 overflow-auto bg-stone-50 p-3"
      data-swimlane-scrollport
    >
      <div className="grid min-w-max items-stretch gap-2" style={gridStyle}>
        <div className="sticky left-0 top-0 z-30 flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 shadow-sm">
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold text-stone-600">
              <Trans>Swimlane</Trans>
            </span>
            <span className="block truncate text-[9px] text-brand-gray">
              {swimlaneKey === "custom"
                ? t`Custom`
                : swimlaneKey === "status"
                  ? t`Status`
                  : swimlaneKey === "priority"
                    ? t`Priority`
                    : t`Assignee`}
            </span>
          </span>
          {groupKey === "status" && actions.addColumn && !readOnly && (
            <button
              type="button"
              onClick={() => setAddingColumn(true)}
              title={t`Add status`}
              aria-label={t`Add status`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-brand-dark hover:bg-brand-soft"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {columns.map((col, index) => {
          const count = cards.filter((card) => {
            if (groupKey === "status") return card.columnKey === col.key;
            if (groupKey === "priority") return (card.priority || "none") === col.key;
            return (card.assignee || "") === col.key;
          }).length;
          const overLimit = col.limit != null && count > col.limit;
          return (
            <div
              key={`head-${col.key}`}
              className="sticky top-0 z-20 flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 shadow-sm"
              style={col.color ? { boxShadow: `inset 0 2px 0 ${col.color}` } : undefined}
            >
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-700">{col.name}</span>
              {doneKey === col.key && groupKey === "status" && (
                <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" title={t`Done column`} />
              )}
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  overLimit ? "bg-red-100 font-semibold text-red-600" : "bg-stone-100 text-brand-gray"
                }`}
              >
                {count}
                {col.limit != null ? `/${col.limit}` : ""}
              </span>
              {groupKey === "status" && statusMenu(col, index)}
            </div>
          );
        })}

        {addingColumn && (
          <form
            className="sticky left-0 z-10 col-span-full flex min-h-11 items-center gap-2 rounded-xl border border-brand/20 bg-brand-soft/30 px-3"
            onSubmit={(event) => {
              event.preventDefault();
              const name = columnDraft.trim();
              if (!name) return;
              setAddingColumn(false);
              setColumnDraft("");
              void actions.addColumn?.(name);
            }}
          >
            <PlusIcon className="h-4 w-4 text-brand-dark" />
            <input
              autoFocus
              value={columnDraft}
              onChange={(event) => setColumnDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setAddingColumn(false);
                  setColumnDraft("");
                }
              }}
              placeholder={t`Status name`}
              aria-label={t`Status name`}
              className="h-8 w-56 rounded-lg border border-stone-200 bg-white px-2 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
            <button type="submit" className="h-8 rounded-lg bg-brand-dark px-3 text-xs font-semibold text-white">
              <Trans>Add</Trans>
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingColumn(false);
                setColumnDraft("");
              }}
              className="h-8 rounded-lg px-2 text-xs text-brand-gray hover:bg-white"
            >
              <Trans>Cancel</Trans>
            </button>
          </form>
        )}

        {visibleLanes.map((lane, laneIndex) => {
          const row = grid.get(lane.key);
          const total = laneTotal(lane.key);
          const isUnassigned = lane.key === "";
          const customDefinitionIndex = customLanes.findIndex((item) => item.key === lane.key);
          return (
            <Fragment key={`row-${lane.key || "unassigned"}`}>
              <section
                aria-labelledby={`swimlane-${lane.key || "unassigned"}`}
                data-swimlane-unassigned={isUnassigned ? "true" : undefined}
                className="sticky left-0 z-10 flex min-h-24 items-start gap-2 rounded-xl border border-line bg-stone-100 p-3"
              >
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isUnassigned ? "bg-transparent" : "bg-stone-300"}`}
                  style={lane.color ? { backgroundColor: lane.color } : undefined}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <h2
                    id={`swimlane-${lane.key || "unassigned"}`}
                    className={`truncate text-xs font-semibold ${isUnassigned ? "text-brand-gray" : "text-stone-800"}`}
                    title={lane.name}
                  >
                    {isUnassigned && missingCount > 0 && (
                      <button
                        type="button"
                        onClick={onShowMissing}
                        title={t`${missingCount} card(s) refer to deleted swimlanes.`}
                        aria-label={t`Show cards with missing swimlanes`}
                        className="mr-1 inline-flex align-[-2px] text-amber-600 hover:text-amber-700"
                      >
                        <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {lane.name}
                  </h2>
                  <span className="mt-1 block text-[10px] tabular-nums text-brand-gray">
                    {total} <Trans>cards</Trans>
                  </span>
                </span>
                {swimlaneKey === "custom" &&
                  !isUnassigned &&
                  customLaneMenu(lane, customDefinitionIndex)}
                {swimlaneKey === "status" && statusMenu(lane, laneIndex)}
              </section>

              {columns.map((col) => {
                const cell = sortCards(row?.get(col.key) ?? [], sortBy);
                return (
                  <div
                    key={`${lane.key || "unassigned"}-${col.key}`}
                    className="min-h-24 space-y-2 rounded-xl border border-line bg-stone-100/60 p-2"
                  >
                    {cell.map(cardChip)}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
