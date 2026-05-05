import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppDispatch, useAppState } from "../app/AppState";
import { tauri } from "../lib/tauri";
import type { EntryKind } from "../lib/types";

export function useCloudEvents(pullOnly: () => Promise<void>) {
  const dispatch = useAppDispatch();
  const state = useAppState();

  // Use refs so the listener closure always sees latest state without re-subscribing.
  // This mirrors the pattern in useFileWatcher and eliminates the listener gap that
  // caused missed events when the effect re-ran due to dependency changes.
  const pullOnlyRef = useRef(pullOnly);
  const stateRef = useRef(state);
  const dispatchRef = useRef(dispatch);

  useEffect(() => { pullOnlyRef.current = pullOnly; }, [pullOnly]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);

  useEffect(() => {
    if (!tauri.isAvailable) return;

    let mounted = true;

    const unlistenRemoteChange = listen<string>(
      "cloud:remote-change",
      async (event) => {
        if (!mounted) return;
        const s = stateRef.current;
        const d = dispatchRef.current;
        if (!s.workspace || !s.syncToken) return;
        try {
          const parsed = JSON.parse(event.payload) as {
            type: string;
            relativePath?: string;
            action?: string;
            sourceSessionId?: string;
            deviceId?: string | null;
            source?: string;
          };
          const relativePath = parsed.relativePath;
          if (!relativePath) return;

          // Skip self-originated changes (matches web frontend's sourceSessionId filter).
          // Also skip changes from our own deviceId to handle multi-session dedup.
          if (
            s.cloudProfile?.deviceId &&
            parsed.deviceId === s.cloudProfile.deviceId &&
            parsed.source === "desktop"
          ) {
            return;
          }

          if (
            parsed.type === "document:deleted" ||
            parsed.type === "document:trashed"
          ) {
            if (s.currentRelativePath === relativePath) {
              d({ type: "SET_STATUS", message: `${relativePath} was ${parsed.action === "restored" ? "restored" : "deleted"} remotely. Syncing…` });
            }
            await pullOnlyRef.current();
            return;
          }

          const fullPath = s.workspace.rootPath + "/" + relativePath;

          let localContent: string | null = null;
          try {
            localContent = await tauri.readFile(fullPath);
          } catch {
            // file does not exist locally
          }

          let syncBases: Record<string, string> = {};
          try {
            syncBases = await tauri.loadSyncBases(s.workspace.rootPath);
          } catch {
            /* no bases */
          }

          const baseContent = syncBases[relativePath];

          if (baseContent == null || localContent == null) {
            // File is new from cloud or doesn't exist locally — pull changes.
            await pullOnlyRef.current();

            // Fallback: if the file still doesn't exist locally after pullOnly
            // (e.g. lastPulledClock was already past this file's clock), do a
            // full-range fetch with sinceClock=0 to catch everything.
            if (localContent == null) {
              try {
                const afterPull = await tauri.readFile(fullPath);
                if (afterPull != null) {
                  // File appeared — pullOnly worked, refresh workspace view.
                  const workspace = await tauri.openWorkspace(s.workspace!.rootPath);
                  d({ type: "UPDATE_WORKSPACE", workspace });
                  return;
                }
              } catch {
                // Still missing — fall through to full-range fetch.
              }

              const binding = stateRef.current.vaultBindings.find(
                (b) => b.localVaultPath === stateRef.current.workspace?.rootPath
              );
              if (binding) {
                const serverUrl = (
                  stateRef.current.serviceUrl ||
                  stateRef.current.cloudProfile?.serverUrl ||
                  "http://localhost:13345"
                ).trim().replace(/\/$/, "");
                try {
                  const resp = await fetch(
                    `${serverUrl}/api/v1/workspaces/${binding.workspaceId}/sync/pull`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${stateRef.current.syncToken}`,
                      },
                      body: JSON.stringify({
                        sinceClock: 0,
                        deviceId: stateRef.current.cloudProfile?.deviceId ?? "desktop",
                      }),
                    }
                  );
                  if (resp.ok) {
                    const fullPull = (await resp.json()) as {
                      documents: Array<{ relativePath: string; content: string; updatedClock: number }>;
                    };
                    const target = fullPull.documents.find((dd) => dd.relativePath === relativePath);
                    if (target) {
                      await tauri.writeFile(fullPath, target.content);
                      await tauri.saveSyncBases(s.workspace!.rootPath, [
                        { relativePath, content: target.content },
                      ]);
                      const workspace = await tauri.openWorkspace(s.workspace!.rootPath);
                      d({ type: "UPDATE_WORKSPACE", workspace });
                      d({ type: "SET_STATUS", message: `Synced new file: ${relativePath}` });
                    }
                  }
                } catch {
                  // Full-range fetch failed — periodic sync will eventually catch it.
                }
              }
            }
            return;
          }

          if (localContent === baseContent) {
            const binding = s.vaultBindings.find(
              (b) => b.localVaultPath === s.workspace?.rootPath
            );
            if (!binding) {
              await pullOnlyRef.current();
              return;
            }

            const serverUrl = (
              s.serviceUrl ||
              s.cloudProfile?.serverUrl ||
              "http://localhost:13345"
            )
              .trim()
              .replace(/\/$/, "");

            try {
              const response = await fetch(
                `${serverUrl}/api/v1/workspaces/${binding.workspaceId}/sync/pull`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${s.syncToken}`,
                  },
                  body: JSON.stringify({
                    sinceClock: binding.lastPulledClock,
                    deviceId: s.cloudProfile?.deviceId ?? "desktop",
                  }),
                }
              );
              if (!response.ok) throw new Error(await response.text());
              const pullData = (await response.json()) as {
                documents: Array<{
                  relativePath: string;
                  content: string;
                  updatedClock: number;
                }>;
                deletedPaths?: Array<{
                  relativePath: string;
                  deletedClock: number;
                }>;
              };

              const cloudDoc = pullData.documents.find(
                (d) => d.relativePath === relativePath
              );

              if (cloudDoc) {
                await tauri.writeFile(fullPath, cloudDoc.content);
                await tauri.saveSyncBases(s.workspace.rootPath, [
                  { relativePath, content: cloudDoc.content },
                ]);
                const workspace = await tauri.openWorkspace(
                  s.workspace.rootPath
                );
                d({ type: "UPDATE_WORKSPACE", workspace });

                if (
                  stateRef.current.currentRelativePath === relativePath &&
                  !stateRef.current.isDirty
                ) {
                  const latest = stateRef.current;
                  d({
                    type: "OPEN_FILE",
                    path: latest.currentPath,
                    relativePath,
                    content: cloudDoc.content,
                    kind: latest.currentKind as EntryKind,
                  });
                }
              }
            } catch {
              await pullOnlyRef.current();
            }
          } else {
            d({
              type: "SET_STATUS",
              message: `Remote change detected in ${relativePath}. Full sync pending.`,
            });
          }
        } catch (e) {
          console.error("[useCloudEvents] error handling remote change:", e);
        }
      },
    );

    const unlistenSyncRequired = listen(
      "cloud:sync-required",
      async () => {
        if (!mounted) return;
        const s = stateRef.current;
        if (!s.workspace || !s.syncToken) return;
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
