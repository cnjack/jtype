import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "../app/AppState";
import { tauri } from "../lib/tauri";
import type { MobileDraftRecovery } from "../lib/types";
import { useAppLifecycle } from "./useAppLifecycle";

type MobileDraftRecoveryOptions = {
  enabled: boolean;
  ready: boolean;
  isDraft: boolean;
  isDirty: boolean;
  content: string;
  workspacePath: string | null;
};

/**
 * Persists only the single untitled mobile draft. Normal documents continue to
 * use the existing Save command and filesystem/provider transaction. The
 * native record is app-private and atomically replaced; no draft is copied into
 * localStorage or exposed to a platform-specific UI.
 */
export function useMobileDraftRecovery({
  enabled,
  ready,
  isDraft,
  isDirty,
  content,
  workspacePath,
}: MobileDraftRecoveryOptions) {
  const dispatch = useAppDispatch();
  const previousDraftRef = useRef(false);
  const latestRef = useRef({ isDraft, isDirty, content, workspacePath });
  latestRef.current = { isDraft, isDirty, content, workspacePath };

  const persistCurrentDraft = useCallback(async () => {
    const current = latestRef.current;
    if (!enabled || !ready || !tauri.isAvailable || !current.isDraft || !current.isDirty || current.content.length === 0) {
      return;
    }
    const draft: MobileDraftRecovery = {
      version: 1,
      content: current.content,
      workspacePath: current.workspacePath,
      updatedAt: Date.now(),
    };
    try {
      await tauri.saveMobileDraftRecovery(draft);
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: `Draft recovery unavailable: ${String(error)}` });
    }
  }, [dispatch, enabled, ready]);

  useEffect(() => {
    if (!enabled || !ready || !tauri.isAvailable) return;
    const wasDraft = previousDraftRef.current;
    previousDraftRef.current = isDraft;

    if (wasDraft && !isDraft) {
      void tauri.clearMobileDraftRecovery().catch((error) => {
        dispatch({ type: "SET_STATUS", message: `Unable to clear recovered draft: ${String(error)}` });
      });
      return;
    }
    if (isDraft && content.length === 0) {
      // Deleting the entire draft must also delete an older recovery snapshot;
      // otherwise a cold launch would resurrect text the user just removed.
      void tauri.clearMobileDraftRecovery().catch((error) => {
        dispatch({ type: "SET_STATUS", message: `Unable to clear recovered draft: ${String(error)}` });
      });
      return;
    }
    if (!isDraft || !isDirty || content.length === 0) return;

    const timer = window.setTimeout(() => void persistCurrentDraft(), 150);
    return () => window.clearTimeout(timer);
  }, [content, dispatch, enabled, isDirty, isDraft, persistCurrentDraft, ready]);

  useAppLifecycle({
    enabled: enabled && ready,
    onResume: () => undefined,
    onBackground: () => {
      void persistCurrentDraft();
    },
  });
}
