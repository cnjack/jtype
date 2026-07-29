import { useEffect, useRef, useState } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Radio,
  RadioGroup,
} from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { BoardOption } from "./types";
import type { BoardSwimlane } from "../../lib/board";
import { ListboxSelect } from "./controls";

export type SwimlaneDeleteChoice =
  | { mode: "keep" }
  | { mode: "move"; targetKey: string | null };

export function SwimlaneDeleteDialog({
  lane,
  cardCount,
  targets,
  busy,
  progress,
  error,
  portalClassName,
  onClose,
  onConfirm,
}: {
  lane: BoardSwimlane | null;
  cardCount: number;
  targets: BoardOption[];
  busy: boolean;
  progress?: { completed: number; total: number } | null;
  error?: string;
  portalClassName?: string;
  onClose: () => void;
  onConfirm: (choice: SwimlaneDeleteChoice) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"keep" | "move">("keep");
  const [targetKey, setTargetKey] = useState("");
  const previousLaneKey = useRef<string | null>(null);
  const hasTargets = targets.length > 0;

  useEffect(() => {
    const laneKey = lane?.key ?? null;
    const laneChanged = previousLaneKey.current !== laneKey;
    previousLaneKey.current = laneKey;
    if (laneChanged) setMode("keep");
    setTargetKey((current) =>
      laneChanged || !targets.some((target) => target.value === current)
        ? targets[0]?.value ?? ""
        : current,
    );
  }, [lane?.key, targets]);

  const portal = portalClassName ? ` ${portalClassName}` : "";
  const close = () => {
    if (!busy) onClose();
  };

  return (
    <Dialog open={!!lane} onClose={close} className={`relative z-50${portal}`}>
      <DialogBackdrop className={`fixed inset-0 bg-stone-950/30 backdrop-blur-sm${portal}`} />
      <div className={`fixed inset-0 flex items-center justify-center overflow-y-auto p-4${portal}`}>
        <DialogPanel
          aria-describedby="swimlane-delete-description"
          className={`w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06]${portal}`}
        >
          {lane && (
            <>
              <div className="px-5 pb-4 pt-5">
                <DialogTitle className="text-base font-semibold tracking-tight text-stone-900">
                  {t`Delete "${lane.name}"?`}
                </DialogTitle>
                <p id="swimlane-delete-description" className="mt-1 text-xs leading-5 text-brand-gray">
                  {cardCount > 0
                    ? t`${cardCount} card(s) currently use this swimlane.`
                    : t`This empty swimlane will be removed from the board.`}
                </p>

                {cardCount > 0 && (
                  <RadioGroup value={mode} onChange={setMode} className="mt-4 space-y-2">
                    <Radio
                      value="keep"
                      className="group flex cursor-pointer gap-3 rounded-xl border border-line px-3 py-3 outline-none transition data-[checked]:border-brand/40 data-[checked]:bg-brand-soft/40 data-[focus]:ring-2 data-[focus]:ring-brand/30"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-300 group-data-[checked]:border-brand">
                        <span className="h-2 w-2 rounded-full bg-brand opacity-0 group-data-[checked]:opacity-100" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2 text-xs font-semibold text-stone-800">
                          <Trans>Keep cards in Unassigned</Trans>
                          <span className="font-normal text-brand-dark">
                            <Trans>Recommended</Trans>
                          </span>
                        </span>
                        <span className="mt-1 block text-[11px] leading-4 text-brand-gray">
                          <Trans>Delete only the swimlane. Card references remain recoverable.</Trans>
                        </span>
                      </span>
                    </Radio>
                    <Radio
                      value="move"
                      className="group flex cursor-pointer gap-3 rounded-xl border border-line px-3 py-3 outline-none transition data-[checked]:border-brand/40 data-[checked]:bg-brand-soft/40 data-[focus]:ring-2 data-[focus]:ring-brand/30"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-300 group-data-[checked]:border-brand">
                        <span className="h-2 w-2 rounded-full bg-brand opacity-0 group-data-[checked]:opacity-100" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-stone-800">
                          <Trans>Move cards before deleting</Trans>
                        </span>
                        <span className="mt-1 block text-[11px] leading-4 text-brand-gray">
                          <Trans>Choose another swimlane, then update the cards first.</Trans>
                        </span>
                      </span>
                    </Radio>
                  </RadioGroup>
                )}
                {hasTargets && (
                  <div className="mt-2 pl-7">
                    <ListboxSelect
                      value={targetKey}
                      options={targets}
                      disabled={mode !== "move"}
                      onChange={setTargetKey}
                    />
                  </div>
                )}

                {progress && (
                  <div className="mt-4" aria-live="polite">
                    <div className="flex items-center justify-between text-[11px] text-brand-gray">
                      <Trans>Moving cards…</Trans>
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
                    <p className="mt-1.5 text-[11px] text-brand-gray">
                      <Trans>Do not close this dialog.</Trans>
                    </p>
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
                  onClick={() =>
                    !busy &&
                    !(cardCount > 0 && mode === "move" && targets.length === 0) &&
                    void onConfirm(
                      cardCount === 0 || mode === "keep"
                        ? { mode: "keep" }
                        : { mode: "move", targetKey: targetKey || null },
                    )
                  }
                  aria-disabled={busy || (cardCount > 0 && mode === "move" && targets.length === 0)}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                >
                  {busy
                    ? t`Working…`
                    : cardCount > 0 && mode === "move"
                      ? t`Move cards and delete`
                      : t`Delete swimlane`}
                </button>
              </div>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
