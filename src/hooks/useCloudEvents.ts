import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppDispatch, useAppState } from "../app/AppState";
import { tauri } from "../lib/tauri";

export function useCloudEvents(pullOnly: () => Promise<void>) {
  const dispatch = useAppDispatch();
  const state = useAppState();

  const pullOnlyRef = useRef(pullOnly);
  const stateRef = useRef(state);
  const dispatchRef = useRef(dispatch);

  useEffect(() => { pullOnlyRef.current = pullOnly; }, [pullOnly]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);

  useEffect(() => {
    if (!tauri.isAvailable) return;

    let mounted = true;

    const canUseCloudSync = () => {
      const s = stateRef.current;
      if (!s.workspace || !s.syncToken) return false;
      const vaultSettings = s.vaultSettings[s.workspace.rootPath];
      if (vaultSettings?.cloudSyncEnabled === false) return false;
      return s.vaultBindings.some((binding) => binding.localVaultPath === s.workspace?.rootPath);
    };

    const unlistenRemoteChange = listen<string>(
      "cloud:remote-change",
      async (event) => {
        if (!mounted || !canUseCloudSync()) return;
        const s = stateRef.current;
        const d = dispatchRef.current;

        try {
          const parsed = JSON.parse(event.payload) as {
            type: string;
            relativePath?: string;
            action?: string;
            deviceId?: string | null;
            source?: string;
          };

          const relativePath = parsed.relativePath;
          if (!relativePath) return;

          if (
            s.cloudProfile?.deviceId &&
            parsed.deviceId === s.cloudProfile.deviceId &&
            parsed.source === "desktop"
          ) {
            return;
          }

          if (
            (parsed.type === "document:deleted" || parsed.type === "document:trashed") &&
            s.currentRelativePath === relativePath
          ) {
            d({
              type: "SET_STATUS",
              message: `${relativePath} was ${parsed.action === "restored" ? "restored" : "deleted"} remotely. Syncing...`,
            });
          }

          await pullOnlyRef.current();
        } catch (error) {
          console.error("[useCloudEvents] error handling remote change:", error);
        }
      },
    );

    const unlistenSyncRequired = listen(
      "cloud:sync-required",
      async () => {
        if (!mounted || !canUseCloudSync()) return;
        try {
          await pullOnlyRef.current();
        } catch {
          /* silent */
        }
      },
    );

    return () => {
      mounted = false;
      unlistenRemoteChange.then((fn) => fn());
      unlistenSyncRequired.then((fn) => fn());
    };
  }, []);
}
