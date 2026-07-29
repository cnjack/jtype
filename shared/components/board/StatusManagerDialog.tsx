import { useState } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  CheckCircleIcon,
  PlusIcon,
  RectangleGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  DEFAULT_DONE_COLUMN,
  type BoardViewConfig,
} from "../../lib/board";
import { StatusActionsMenu } from "./StatusActionsMenu";
import type { BoardActions } from "./types";

export function StatusManagerDialog({
  open,
  config,
  actions,
  portalClassName,
  onClose,
}: {
  open: boolean;
  config: BoardViewConfig;
  actions: BoardActions;
  portalClassName?: string;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const portal = portalClassName ? ` ${portalClassName}` : "";
  const doneKey = config.doneColumn ?? DEFAULT_DONE_COLUMN;

  return (
    <Dialog open={open} onClose={onClose} className={`relative z-40${portal}`}>
      <DialogBackdrop className={`fixed inset-0 bg-stone-950/30 backdrop-blur-sm${portal}`} />
      <div className={`fixed inset-0 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4${portal}`}>
        <DialogPanel className={`flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06] sm:rounded-2xl${portal}`}>
          <div className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
              <RectangleGroupIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold tracking-tight text-stone-900">
                <Trans>Manage statuses</Trans>
              </DialogTitle>
              <p className="mt-1 text-xs leading-5 text-brand-gray">
                <Trans>Status columns stay available when they are used as columns or swimlanes.</Trans>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              title={t`Close`}
              aria-label={t`Close`}
              className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <ul className="space-y-1" aria-label={t`Statuses`}>
              {config.columns.map((column) => {
                const isDone = doneKey === column.key;
                return (
                  <li key={column.key} className="group flex min-h-12 items-center gap-2 rounded-xl px-2 hover:bg-stone-50">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full bg-stone-300 ring-1 ring-black/10"
                      style={column.color ? { backgroundColor: column.color } : undefined}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-800">
                      {column.name}
                    </span>
                    {column.limit != null && (
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] tabular-nums text-brand-gray">
                        {t`WIP ${column.limit}`}
                      </span>
                    )}
                    {isDone && <CheckCircleIcon className="h-4 w-4 text-emerald-500" title={t`Done column`} />}
                    <StatusActionsMenu
                      column={column}
                      siblings={config.columns}
                      actions={actions}
                      doneKey={doneKey}
                      orientation="vertical"
                      portalClassName={portalClassName}
                      buttonClassName="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600"
                    />
                  </li>
                );
              })}
            </ul>

            {actions.addColumn &&
              (adding ? (
                <form
                  className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-brand/30 bg-brand-soft/20 px-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const name = draft.trim();
                    if (!name) return;
                    setAdding(false);
                    setDraft("");
                    void actions.addColumn?.(name);
                  }}
                >
                  <PlusIcon className="h-4 w-4 text-brand-dark" />
                  <input
                    autoFocus
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setAdding(false);
                        setDraft("");
                      }
                    }}
                    placeholder={t`Status name`}
                    aria-label={t`Status name`}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />
                  <button type="submit" className="h-8 rounded-lg bg-brand-dark px-3 text-xs font-semibold text-white">
                    <Trans>Add</Trans>
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed border-brand/20 bg-brand-soft/20 px-3 text-xs font-semibold text-brand-dark hover:border-brand/40 hover:bg-brand-soft/40"
                >
                  <PlusIcon className="h-4 w-4" />
                  <Trans>Add status</Trans>
                </button>
              ))}
          </div>

          <div className="flex justify-end border-t border-line bg-stone-50 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand"
            >
              <Trans>Done</Trans>
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
