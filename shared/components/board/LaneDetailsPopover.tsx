import { useEffect, useRef, useState } from "react";
import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@lingui/react/macro";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
  ClipboardDocumentIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import type { BoardSwimlane } from "../../lib/board";

/** Read-only lane identity details, kept separate from mutation menus. */
export function LaneDetailsPopover({
  lane,
  cardCount,
  portalClassName,
  buttonClassName = "flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600",
}: {
  lane: BoardSwimlane;
  cardCount: number;
  portalClassName?: string;
  buttonClassName?: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const clearTimer = useRef<number | null>(null);
  const portal = portalClassName ? ` ${portalClassName}` : "";

  useEffect(() => {
    setCopyState("idle");
  }, [lane.key]);

  useEffect(
    () => () => {
      if (clearTimer.current != null) window.clearTimeout(clearTimer.current);
    },
    [],
  );

  const copyLaneKey = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(lane.key);
      setCopyState("copied");
      if (clearTimer.current != null) window.clearTimeout(clearTimer.current);
      clearTimer.current = window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("error");
    }
  };

  return (
    <Popover className="relative shrink-0">
      <PopoverButton
        title={t`Swimlane details`}
        aria-label={t`Swimlane details for ${lane.name}`}
        className={buttonClassName}
      >
        <InformationCircleIcon className="h-4 w-4" />
      </PopoverButton>
      <PopoverPanel
        anchor="bottom end"
        className={`z-50 w-80 rounded-xl border border-line bg-white p-4 shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${portal}`}
      >
        <p className="flex items-center gap-2 text-xs font-semibold text-stone-800">
          <InformationCircleIcon className="h-4 w-4 text-brand-dark" />
          <Trans>Swimlane details</Trans>
        </p>
        <dl className="mt-3 grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-2 gap-y-2 text-[11px]">
          <dt className="text-brand-gray">
            <Trans>Name</Trans>
          </dt>
          <dd className="truncate font-medium text-stone-700">{lane.name}</dd>
          <dt className="text-brand-gray">
            <Trans>Swimlane ID</Trans>
          </dt>
          <dd className="flex min-w-0 items-center gap-1.5">
            <code className="min-w-0 flex-1 truncate rounded bg-stone-100 px-1.5 py-1 text-[10px] text-stone-600">
              {lane.key}
            </code>
            <button
              type="button"
              title={t`Copy swimlane ID`}
              aria-label={t`Copy swimlane ID`}
              onClick={() => void copyLaneKey()}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-stone-200 px-2 text-[10px] font-medium text-brand-dark hover:border-brand/30"
            >
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
              {copyState === "copied" ? t`Copied` : t`Copy`}
            </button>
          </dd>
          <dt className="text-brand-gray">
            <Trans>Used by</Trans>
          </dt>
          <dd className="tabular-nums text-stone-700">
            <Plural value={cardCount} one="# card" other="# cards" />
          </dd>
        </dl>
        {copyState === "error" && (
          <p className="mt-3 text-[11px] text-red-600" role="alert">
            <Trans>Copy failed.</Trans>
          </p>
        )}
      </PopoverPanel>
    </Popover>
  );
}
