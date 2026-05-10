import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppDispatch, useAppState } from "../app/AppState";
import { tauri } from "../lib/tauri";

type PullOnly = (options?: { full?: boolean; reason?: string; sinceClock?: number; sinceTrashEventClock?: number }) => Promise<void>;

export function useCloudEvents(pullOnly: PullOnly) {
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
        console.log("[useCloudEvents] received event:", event.payload);
        const canSync = canUseCloudSync();
        console.log("[useCloudEvents] mounted:", mounted, "canUseCloudSync:", canSync);
        if (!mounted || !canSync) {
          console.log("[useCloudEvents] skipping: mounted =", mounted, "canUseCloudSync =", canSync);
          return;
        }
        const s = stateRef.current;
        const d = dispatchRef.current;

        try {
          const parsed = JSON.parse(event.payload) as {
            type: string;
            relativePath?: string;
            action?: string;
            deviceId?: string | null;
            source?: string;
            updatedClock?: number;
            deletedClock?: number;
            eventClock?: number;
          };

          const relativePath = parsed.relativePath;
          console.log("[useCloudEvents] parsed:", { type: parsed.type, relativePath, deviceId: parsed.deviceId, source: parsed.source });
          if (!relativePath) {
            console.log("[useCloudEvents] no relativePath, skipping");
            return;
          }

          if (
            s.cloudProfile?.deviceId &&
            parsed.deviceId === s.cloudProfile.deviceId &&
            parsed.source === "desktop"
          ) {
            console.log("[useCloudEvents] self-change detected, skipping");
            return;
          }

          // Handle delete/trash events immediately without relying on pull
          if (parsed.type === "document:deleted" && s.workspace) {
            // document:deleted means permanent delete from trash, not from document list
            console.log("[useCloudEvents] handling document:deleted (permanent delete from trash)");
            try {
              const trashMetadata = await tauri.loadTrashMetadata(s.workspace.rootPath);
              const itemToRemove = trashMetadata.items.find(
                (item) => item.relativePath === relativePath
              );
              if (itemToRemove) {
                let deletedLocalTrashCount = 0;
                try {
                  await tauri.permanentDeleteTrash(s.workspace.rootPath, itemToRemove.trashId);
                  deletedLocalTrashCount += 1;
                } catch { /* may already be gone */ }
                try {
                  const localTrashItems = await tauri.listTrash(s.workspace.rootPath);
                  for (const localItem of localTrashItems.filter((item) => item.relativePath === relativePath)) {
                    try {
                      await tauri.permanentDeleteTrash(s.workspace.rootPath, localItem.trashId);
                      deletedLocalTrashCount += 1;
                    } catch { /* may already be gone */ }
                  }
                } catch { /* non-critical */ }
                trashMetadata.items = trashMetadata.items.filter(
                  (item) => item.relativePath !== relativePath
                );
                await tauri.saveTrashMetadata(s.workspace.rootPath, trashMetadata);
                const workspace = await tauri.openWorkspace(s.workspace.rootPath);
                d({ type: "UPDATE_WORKSPACE", workspace });
                console.log("[useCloudEvents] permanent delete processed", { deletedLocalTrashCount });
                return;
              } else {
                console.log("[useCloudEvents] trash item not found locally, removing visible document if present");
                try {
                  await tauri.trashEntry(s.workspace.rootPath, relativePath);
                  const workspace = await tauri.openWorkspace(s.workspace.rootPath);
                  d({ type: "UPDATE_WORKSPACE", workspace });
                  if (s.currentRelativePath === relativePath) {
                    d({ type: "CLEAR_DOCUMENT" });
                    d({ type: "SET_STATUS", message: `${relativePath} was deleted remotely.` });
                  }
                  console.log("[useCloudEvents] visible document removed for document:deleted");
                  return;
                } catch (error) {
                  console.log("[useCloudEvents] visible document not found, falling through to pull:", error);
                }
              }
            } catch (error) {
              console.error("[useCloudEvents] failed to handle permanent delete:", error);
            }
            // If local cleanup could not resolve it, pull from the event clock below.
          }

          if (parsed.type === "document:trashed") {
            const action = parsed.action || "trashed";
            console.log("[useCloudEvents] handling document:trashed, action:", action);

            if (action === "trashed" && s.workspace) {
              // Move to trash
              try {
                await tauri.trashEntry(s.workspace.rootPath, relativePath);
                const workspace = await tauri.openWorkspace(s.workspace.rootPath);
                d({ type: "UPDATE_WORKSPACE", workspace });
                if (s.currentRelativePath === relativePath) {
                  d({ type: "SET_STATUS", message: `${relativePath} was moved to trash remotely.` });
                }
                console.log("[useCloudEvents] document moved to trash");
                return; // Don't pull, we already handled it
              } catch (error) {
                console.error("[useCloudEvents] failed to trash document:", error);
              }
            }

            // For restored, fall through to pull
            if (s.currentRelativePath === relativePath) {
              d({
                type: "SET_STATUS",
                message: `${relativePath} was ${action === "restored" ? "restored" : "trashed"} remotely. Syncing...`,
              });
            }
          }

          const eventClock = parsed.updatedClock ?? parsed.deletedClock ?? parsed.eventClock;
          console.log("[useCloudEvents] calling pullOnly...", {
            eventClock,
            sinceClock: eventClock != null ? Math.max(0, eventClock - 1) : undefined,
          });
          await pullOnlyRef.current({
            reason: "websocket-event",
            ...(eventClock != null ? {
              sinceClock: Math.max(0, eventClock - 1),
              sinceTrashEventClock: Math.max(0, eventClock - 1),
            } : {}),
          });
          console.log("[useCloudEvents] pullOnly completed");
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
