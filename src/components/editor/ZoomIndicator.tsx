import { useEffect, useRef, useState } from "react";
import { t } from "@lingui/core/macro";
import { MinusIcon, PlusIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppState } from "../../app/AppState";

const AUTO_HIDE_MS = 2400;

/**
 * Transient zoom indicator (like the FindBar): appears briefly whenever the
 * zoom level changes (Cmd+/-, scroll, or the buttons here), then fades out.
 * Lives in EditorShell so it covers every document surface — Markdown editor,
 * preview, and the PDF canvas (which receives zoomLevel as its scale prop).
 */
export function ZoomIndicator() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  // `visible` drives the fade; `pinned` keeps it shown while the pointer is
  // over it so the buttons stay clickable.
  const [visible, setVisible] = useState(false);
  const [pinned, setPinned] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const armHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
  };

  // Any change to zoomLevel (incl. the initial mount when a doc opens) reveals
  // the indicator, then arms the auto-hide.
  useEffect(() => {
    setVisible(true);
    armHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.zoomLevel]);

  // Don't render before there's a document/draft to zoom.
  if (!state.currentPath && !state.isDraft) return null;

  const shown = visible || pinned;
  const percent = Math.round(state.zoomLevel * 100);
  const zoom = (delta: number) => dispatch({ type: "SET_ZOOM", level: state.zoomLevel + delta });

  return (
    <div
      id="zoom-indicator"
      className={`absolute bottom-4 right-4 z-40 flex items-center gap-1 rounded-lg border border-black/[0.06] bg-white/95 px-1.5 py-1 shadow-lg backdrop-blur transition-opacity duration-200 ${
        shown ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      onMouseEnter={() => {
        setPinned(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
      }}
      onMouseLeave={() => {
        setPinned(false);
        armHide();
      }}
    >
      <button
        type="button"
        className="rounded p-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30"
        title={t`Zoom out`}
        aria-label={t`Zoom out`}
        disabled={state.zoomLevel <= 0.5}
        onClick={() => zoom(-0.1)}
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="min-w-[3rem] rounded px-1 py-0.5 text-center text-xs font-medium tabular-nums text-stone-700 hover:bg-stone-100"
        title={t`Reset zoom`}
        aria-label={t`Reset zoom`}
        onClick={() => dispatch({ type: "SET_ZOOM", level: 1 })}
      >
        {percent}%
      </button>
      <button
        type="button"
        className="rounded p-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30"
        title={t`Zoom in`}
        aria-label={t`Zoom in`}
        disabled={state.zoomLevel >= 2.5}
        onClick={() => zoom(0.1)}
      >
        <PlusIcon className="h-4 w-4" />
      </button>
      {state.zoomLevel !== 1 && (
        <button
          type="button"
          className="rounded p-1 text-stone-500 hover:bg-stone-100"
          title={t`Reset zoom`}
          aria-label={t`Reset zoom`}
          onClick={() => dispatch({ type: "SET_ZOOM", level: 1 })}
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
