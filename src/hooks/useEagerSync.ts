import { useCallback } from "react";
import { useAppState } from "../app/AppState";
import { tauri } from "../lib/tauri";
import { sha256Hex } from "../lib/utils";

export function useEagerSync() {
  const state = useAppState();

  const pushSingleDocument = useCallback(
    async (relativePath: string, content: string) => {
      if (!state.workspace || !state.syncToken) return;
      const vaultSettings = state.vaultSettings[state.workspace.rootPath];
      if (vaultSettings?.cloudSyncEnabled === false) return;
      const binding = state.vaultBindings.find(
        (b) => b.localVaultPath === state.workspace?.rootPath,
      );
      if (!binding || !state.cloudProfile?.token) return;

      const serviceUrl = (
        state.serviceUrl ||
        state.cloudProfile?.serverUrl ||
        "http://localhost:13345"
      )
        .trim()
        .replace(/\/$/, "");

      let syncBases: Record<string, string> = {};
      if (tauri.isAvailable) {
        try {
          syncBases = await tauri.loadSyncBases(state.workspace.rootPath);
        } catch {
          /* first sync */
        }
      }

      const base = syncBases[relativePath];
      const baseHash = base != null ? await sha256Hex(base) : undefined;

      try {
        const response = await fetch(
          `${serviceUrl}/api/v1/workspaces/${binding.workspaceId}/sync/push`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${state.syncToken}`,
            },
            body: JSON.stringify({
              deviceId: state.cloudProfile?.deviceId ?? "desktop",
              documents: [
                {
                  relativePath,
                  title: "",
                  status: "",
                  content,
                  baseContentHash: baseHash,
                  baseContent: base,
                },
              ],
              deletedPaths: [] as Array<{ relativePath: string }>,
              trashOperations: [] as Array<Record<string, unknown>>,
            }),
          },
        );
        if (!response.ok) return;
        const pushData = (await response.json()) as {
          documents: Array<{
            relativePath: string;
            content: string;
            mergeStatus: string;
          }>;
        };

        if (
          tauri.isAvailable &&
          pushData.documents &&
          pushData.documents.length > 0
        ) {
          const doc = pushData.documents.find(
            (d) => d.relativePath === relativePath,
          );
          if (doc && doc.mergeStatus === "accepted") {
            try {
              await tauri.saveSyncBases(state.workspace.rootPath, [
                { relativePath, content },
              ]);
            } catch {
              /* non-critical */
            }
          }
        }
      } catch {
        /* non-blocking — periodic sync will handle it */
      }
    },
    [
      state.workspace,
      state.syncToken,
      state.vaultBindings,
      state.vaultSettings,
      state.cloudProfile,
      state.serviceUrl,
    ],
  );

  return { pushSingleDocument };
}
