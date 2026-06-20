import { useCallback, useEffect, useRef, useState } from "react";
import type { Update, DownloadEvent } from "@tauri-apps/plugin-updater";
import { isTauriRuntime } from "../lib/utils";

export type AppUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installed"
  | "error";

export interface AppUpdate {
  status: AppUpdateStatus;
  /** The new version offered by the release manifest, when one is available. */
  version: string | null;
  /** Release notes (markdown/plain) from the manifest. */
  notes: string | null;
  /** Download progress in 0..1 while `status === "downloading"`. */
  progress: number;
  error: string | null;
  /** Whether the update banner should be shown. */
  visible: boolean;
  checkForUpdate: (opts?: { manual?: boolean }) => Promise<void>;
  installUpdate: () => Promise<void>;
  dismiss: () => void;
}

interface InternalState {
  status: AppUpdateStatus;
  version: string | null;
  notes: string | null;
  progress: number;
  error: string | null;
}

const INITIAL: InternalState = {
  status: "idle",
  version: null,
  notes: null,
  progress: 0,
  error: null,
};

/**
 * Drives the in-app auto-updater. On desktop it passively checks GitHub Releases
 * (via the configured `latest.json` endpoint) shortly after launch and, when a
 * newer signed release exists, surfaces a banner to download + install it.
 *
 * In the browser build (`isTauriRuntime() === false`) every operation is a
 * no-op, so the hook is safe to mount unconditionally.
 */
export function useAppUpdate(): AppUpdate {
  const [state, setState] = useState<InternalState>(INITIAL);
  const [dismissed, setDismissed] = useState(false);
  // The pending Update handle from the last successful check; held outside React
  // state because it is a non-serialisable plugin resource.
  const pendingRef = useRef<Update | null>(null);

  const checkForUpdate = useCallback(async (opts?: { manual?: boolean }) => {
    if (!isTauriRuntime()) return;
    setState((s) => ({ ...s, status: "checking", error: null }));
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        pendingRef.current = update;
        setDismissed(false);
        setState({
          status: "available",
          version: update.version,
          notes: update.body ?? null,
          progress: 0,
          error: null,
        });
      } else {
        pendingRef.current = null;
        setState({ ...INITIAL });
      }
    } catch (err) {
      // A missing/garbled updater endpoint (dev builds, or the first release
      // before any `latest.json` exists) must never block the app. Stay quiet on
      // the passive launch check; only surface the error on an explicit check.
      console.warn("[update] check failed:", err);
      setState((s) => ({
        ...s,
        status: opts?.manual ? "error" : "idle",
        error: String(err),
      }));
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const update = pendingRef.current;
    if (!update) return;
    setState((s) => ({ ...s, status: "downloading", progress: 0, error: null }));
    try {
      let total = 0;
      let downloaded = 0;
      await update.downloadAndInstall((event: DownloadEvent) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            setState((s) => ({
              ...s,
              progress: total > 0 ? Math.min(1, downloaded / total) : s.progress,
            }));
            break;
          case "Finished":
            setState((s) => ({ ...s, progress: 1 }));
            break;
        }
      });
      setState((s) => ({ ...s, status: "installed", progress: 1 }));
      // The new bundle is staged; relaunch swaps it in.
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      console.error("[update] install failed:", err);
      setState((s) => ({ ...s, status: "error", error: String(err) }));
    }
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  // Passive check a few seconds after launch so it never competes with the
  // initial vault load / first paint.
  useEffect(() => {
    if (!isTauriRuntime()) return;
    const timer = window.setTimeout(() => {
      void checkForUpdate();
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [checkForUpdate]);

  const visible =
    !dismissed &&
    (state.status === "available" ||
      state.status === "downloading" ||
      state.status === "installed" ||
      (state.status === "error" && state.version !== null));

  return { ...state, visible, checkForUpdate, installUpdate, dismiss };
}
