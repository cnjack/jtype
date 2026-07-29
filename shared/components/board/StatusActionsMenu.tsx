import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  EllipsisHorizontalIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { COLUMN_COLORS, type BoardViewColumn } from "../../lib/board";
import type { BoardActions } from "./types";

/**
 * Canonical status action menu shared by column headers, status swimlanes, and
 * the status manager. An explicit sibling list keeps reorder operations in the
 * same index space as the rendered status.
 */
export function StatusActionsMenu({
  column,
  siblings,
  actions,
  doneKey,
  orientation,
  portalClassName,
  buttonClassName = "flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600",
}: {
  column: BoardViewColumn;
  siblings: BoardViewColumn[];
  actions: BoardActions;
  doneKey: string;
  orientation: "horizontal" | "vertical";
  portalClassName?: string;
  buttonClassName?: string;
}) {
  const index = siblings.findIndex((candidate) => candidate.key === column.key);
  const isDone = doneKey === column.key;
  const hasActions =
    actions.renameColumn ||
    actions.reorderColumns ||
    actions.toggleDoneColumn ||
    actions.setColumnLimit ||
    actions.setColumnColor ||
    actions.deleteColumn;
  if (!hasActions) return null;

  const portal = portalClassName ? ` ${portalClassName}` : "";
  const previous = index > 0 ? siblings[index - 1] : undefined;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined;

  return (
    <Menu as="div" className="relative shrink-0">
      <MenuButton
        title={t`Status actions`}
        aria-label={t`Actions for ${column.name}`}
        className={buttonClassName}
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
              onClick={() => void actions.renameColumn?.(column.key)}
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
                disabled={!previous}
                aria-disabled={!previous}
                onClick={() => {
                  if (previous) void actions.reorderColumns?.(column.key, previous.key);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100"
              >
                {orientation === "horizontal" ? (
                  <ArrowLeftIcon className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                )}
                {orientation === "horizontal" ? <Trans>Move left</Trans> : <Trans>Move up</Trans>}
              </button>
            </MenuItem>
            <MenuItem>
              <button
                type="button"
                disabled={!next}
                aria-disabled={!next}
                onClick={() => {
                  if (next) void actions.reorderColumns?.(column.key, next.key);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100"
              >
                {orientation === "horizontal" ? (
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownIcon className="h-3.5 w-3.5" />
                )}
                {orientation === "horizontal" ? <Trans>Move right</Trans> : <Trans>Move down</Trans>}
              </button>
            </MenuItem>
          </>
        )}
        {actions.toggleDoneColumn && (
          <MenuItem>
            <button
              type="button"
              onClick={() => void actions.toggleDoneColumn?.(column.key)}
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
              onClick={() => void actions.setColumnLimit?.(column.key)}
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
                    onClick={() => void actions.setColumnColor?.(column.key, color)}
                    title={color}
                    className={`h-5 w-5 rounded-full ring-1 ring-black/10 ${
                      column.color === color ? "ring-2 ring-brand ring-offset-2" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <button
                  type="button"
                  title={t`No color`}
                  onClick={() => void actions.setColumnColor?.(column.key, null)}
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
                disabled={siblings.length <= 1}
                aria-disabled={siblings.length <= 1}
                onClick={() => {
                  if (siblings.length > 1) void actions.deleteColumn?.(column.key);
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
}
