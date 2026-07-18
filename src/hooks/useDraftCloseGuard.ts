import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask } from "@tauri-apps/plugin-dialog";
import { t } from "@lingui/core/macro";
import { useAppState, useAppDispatch } from "../app/AppState";
import { tauri } from "../lib/tauri";

/**
 * Intercept the main window's close button while an in-memory draft with real
 * content is open. Desktop drafts are memory-only, while mobile's private
 * recovery record is a crash fallback rather than an explicit save. The guard
 * still prevents an intentional close from silently discarding work.
 *
 * Uses Tauri's native `onCloseRequested` (synchronous close cycle) + the native
 * `ask()` dialog — the React `useConfirm` provider can't survive the close
 * event, so we rely on the OS dialog instead.
 */
export function useDraftCloseGuard() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!tauri.isAvailable) return;
    const win = getCurrentWindow();

    let cancelled = false;
    // Registration can fail in non-desktop (browser/E2E-mock) environments
    // where the window plugin isn't fully wired. The guard is best-effort:
    // if we can't hook the close event, we fall back to normal behaviour.
    const unlistenPromise: Promise<() => void> = win
      .onCloseRequested(async (event) => {
        const hasUnsavedDraft = state.isDraft && state.editorContent.trim() !== "";
        if (!hasUnsavedDraft) return; // let the window close normally

        event.preventDefault();
        const confirmed = await ask(
          t`You have an unsaved draft. Discard it and close?`,
          { title: t`Unsaved draft`, kind: "warning" },
        );
        if (cancelled) return;
        if (confirmed) {
          dispatch({ type: "DISCARD_DRAFT" });
          // Use destroy() rather than close(): close() re-emits CloseRequested,
          // which re-enters this same handler with stale (still-draft) state and
          // prevents the close again — an infinite loop the user can't escape.
          // destroy() forces the window shut without firing the event.
          await win.destroy();
        }
      })
      .then((unlisten) => unlisten)
      .catch(() => () => {}); // Window plugin unavailable — close guard disabled silently.

    return () => {
      cancelled = true;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [state.isDraft, state.editorContent, dispatch]);
}
