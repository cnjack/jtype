import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@lingui/react/macro";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export type DerivedSwimlanePreview = {
  value: string;
  name: string;
  cardCount: number;
  color?: string | null;
};

export function SwimlaneConversionDialog({
  source,
  rows,
  open,
  busy,
  resume,
  progress,
  error,
  portalClassName,
  onClose,
  onConfirm,
}: {
  source: "priority" | "assignee";
  rows: DerivedSwimlanePreview[];
  open: boolean;
  busy: boolean;
  resume?: boolean;
  progress?: { completed: number; total: number } | null;
  error?: string;
  portalClassName?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const portal = portalClassName ? ` ${portalClassName}` : "";
  const close = () => {
    if (!busy) onClose();
  };
  return (
    <Dialog open={open} onClose={close} className={`relative z-50${portal}`}>
      <DialogBackdrop className={`fixed inset-0 bg-stone-950/30 backdrop-blur-sm${portal}`} />
      <div className={`fixed inset-0 flex items-center justify-center overflow-y-auto p-4${portal}`}>
        <DialogPanel
          aria-describedby="swimlane-conversion-description"
          className={`w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06]${portal}`}
        >
          <div className="px-5 pb-4 pt-5">
            <DialogTitle className="text-base font-semibold tracking-tight text-stone-900">
              {resume
                ? t`Resume swimlane conversion?`
                : source === "priority"
                  ? t`Make priority swimlanes editable?`
                  : t`Make assignee swimlanes editable?`}
            </DialogTitle>
            <p id="swimlane-conversion-description" className="mt-1 text-xs leading-5 text-brand-gray">
              {resume
                ? t`JType will reuse the existing lane IDs and continue unfinished card updates.`
                : source === "priority"
                  ? t`JType will create independent swimlanes from the current priority rows. Card priority values will stay unchanged.`
                  : t`JType will create independent swimlanes from the current assignee rows. Card assignee values will stay unchanged.`}
            </p>

            <ul className="mt-4 divide-y divide-line" aria-label={t`Swimlanes to create`}>
              {rows.map((row) => (
                <li key={row.value} className="flex min-h-10 items-center gap-2 py-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-stone-300"
                    style={row.color ? { backgroundColor: row.color } : undefined}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-700">
                    {row.name}
                  </span>
                  <span className="tabular-nums text-[11px] text-brand-gray">
                    <Plural value={row.cardCount} one="# card" other="# cards" />
                  </span>
                </li>
              ))}
              {rows.length === 0 && (
                <li className="py-4 text-center text-xs text-brand-gray">
                  <Trans>No assigned values to convert.</Trans>
                </li>
              )}
            </ul>

            {progress && (
              <div className="mt-4" aria-live="polite">
                <div className="flex items-center justify-between text-[11px] text-brand-gray">
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                    <Trans>Updating cards…</Trans>
                  </span>
                  <span className="tabular-nums">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-200"
                    style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800" role="alert">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-line bg-stone-50 px-5 py-3">
            <button
              type="button"
              onClick={close}
              aria-disabled={busy}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/30 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              <Trans>Cancel</Trans>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!busy && rows.length > 0) void onConfirm();
              }}
              disabled={busy || rows.length === 0}
              aria-disabled={busy || rows.length === 0}
              className="rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              {busy
                ? t`Working…`
                : resume
                  ? t`Resume conversion`
                  : t`Create editable swimlanes`}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
