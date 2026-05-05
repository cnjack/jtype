import { useCallback, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAppDispatch, useAppState } from "../app/AppState";
import { tauri } from "../lib/tauri";
import { slugify, sha256Hex } from "../lib/utils";
import type { AuthResponse, CloudProfile, VaultBinding, CloudDocument, CloudWorkspace, DeletedPath, DeletedPathInput, EntryKind, SyncPushDocument, SyncPushResponse, TrashSyncPayload } from "../lib/types";
import { parseSyncConflicts } from "../lib/types";

export function useCloudSync() {
  const dispatch = useAppDispatch();
  const state = useAppState();
  const pollTimerRef = useRef<number | null>(null);

  const getServiceUrl = useCallback(() => {
    return (state.serviceUrl || state.cloudProfile?.serverUrl || "http://localhost:13345").trim().replace(/\/$/, "");
  }, [state.serviceUrl, state.cloudProfile?.serverUrl]);

  const stopDevicePolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startBrowserOAuth = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const response = await fetch(`${getServiceUrl()}/api/oauth/device/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: state.cloudProfile?.deviceId ?? "desktop" }),
      });
      if (!response.ok) throw new Error(await response.text());
      const start = (await response.json()) as { deviceCode: string; userCode: string; verificationUrl: string };
      dispatch({ type: "SET_OAUTH", deviceCode: start.deviceCode, userCode: start.userCode });
      dispatch({ type: "SET_STATUS", message: `Browser authorization opened. Use code ${start.userCode}.` });
      if (tauri.isAvailable) await openUrl(start.verificationUrl);

      stopDevicePolling();
      pollTimerRef.current = window.setInterval(async () => {
        try {
          const pollResponse = await fetch(`${getServiceUrl()}/api/oauth/device/poll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceCode: start.deviceCode }),
          });
          if (pollResponse.ok) {
            const auth = (await pollResponse.json()) as AuthResponse;
            stopDevicePolling();
            const profile: CloudProfile = {
              serverUrl: getServiceUrl(),
              username: auth.username,
              siteUrl: auth.siteUrl,
              token: auth.token,
              deviceId: state.cloudProfile?.deviceId ?? "",
            };
            dispatch({ type: "SET_SYNC_SESSION", token: auth.token, username: auth.username, siteUrl: auth.siteUrl, profile });
            if (tauri.isAvailable) await tauri.saveCloudProfile(profile);
            dispatch({ type: "SET_STATUS", message: `Connected as ${auth.username}.` });
            stopDevicePolling();
            try {
              const wsResp = await fetch(`${getServiceUrl()}/api/v1/workspaces`, {
                headers: { Authorization: `Bearer ${auth.token}` },
              });
              if (wsResp.ok) {
                const wsResult = (await wsResp.json()) as { workspaces: CloudWorkspace[] };
                dispatch({ type: "SET_CLOUD_WORKSPACES", workspaces: wsResult.workspaces });
              }
            } catch { /* non-critical */ }
            return;
          }
          const errText = await pollResponse.text();
          if (errText.includes("authorization pending")) return;
          stopDevicePolling();
          dispatch({ type: "CLEAR_OAUTH" });
          dispatch({ type: "SET_STATUS", message: `Authorization failed: ${errText}` });
        } catch (error) {
          stopDevicePolling();
          dispatch({ type: "CLEAR_OAUTH" });
          dispatch({ type: "SET_STATUS", message: String(error) });
        }
      }, 1000);
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, getServiceUrl, state.cloudProfile, stopDevicePolling]);

  const disconnectAccount = useCallback(async () => {
    stopDevicePolling();
    dispatch({ type: "DISCONNECT_ACCOUNT" });
    if (tauri.isAvailable) {
      try { await tauri.saveCloudProfile({ serverUrl: state.serviceUrl, username: "", siteUrl: "", token: "", deviceId: state.cloudProfile?.deviceId ?? "" }); } catch { /* ignore */ }
    }
    dispatch({ type: "SET_STATUS", message: "Disconnected from cloud account." });
  }, [dispatch, stopDevicePolling, state.serviceUrl, state.cloudProfile]);

  const refreshCloudWorkspaces = useCallback(async () => {
    try {
      const response = await fetch(`${getServiceUrl()}/api/v1/workspaces`, {
        headers: { Authorization: `Bearer ${state.syncToken}` },
      });
      if (!response.ok) throw new Error(await response.text());
      const result = (await response.json()) as { workspaces: CloudWorkspace[] };
      dispatch({ type: "SET_CLOUD_WORKSPACES", workspaces: result.workspaces });
    } catch {
      // silently ignore — cloud workspaces are non-critical
    }
  }, [dispatch, state.syncToken, getServiceUrl]);

  const syncWorkspaceToWeb = useCallback(async (options: { silent?: boolean; skipRelativePath?: string } = {}): Promise<SyncPushDocument | undefined> => {
    if (!state.workspace) {
      dispatch({ type: "SET_STATUS", message: "Open a vault before syncing." });
      return;
    }
    if (!state.syncToken) {
      dispatch({ type: "SET_STATUS", message: "Login or register before syncing." });
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_SYNC_STATUS", status: "syncing" });
      if (!options.silent) dispatch({ type: "SET_STATUS", message: "Syncing vault..." });

      const binding = currentVaultBinding(state.vaultBindings, state.workspace.rootPath);

      if (binding) {
        // 1. Collect local documents BEFORE pull overwrites them
        const documents = await tauri.collectSyncDocuments(state.workspace.rootPath);

        // 2. Load sync bases (last synced content per document) for three-way merge
        let syncBases: Record<string, string> = {};
        if (tauri.isAvailable) {
          try { syncBases = await tauri.loadSyncBases(state.workspace.rootPath); } catch { /* first sync */ }
        }

        const localPathsBeforePull = new Set(documents.map((d) => d.relativePath));
        const locallyDeletedPaths = new Set(
          Object.keys(syncBases)
            .filter((relativePath) => !localPathsBeforePull.has(relativePath))
            .filter((relativePath) => !options.skipRelativePath || relativePath !== options.skipRelativePath)
        );

        // 3. Pull cloud changes and apply to disk (only overwrites files not locally modified)
        const pullResult = await pullCloudWorkspace(binding, options.skipRelativePath, syncBases, locallyDeletedPaths);
        const remoteDeletedPaths = new Set(pullResult.deletedPaths);
        const documentsForPush = documents.filter((d) => !remoteDeletedPaths.has(d.relativePath));

        // 4. Push with base content info so server can three-way merge
        const pushDocs = await Promise.all(
          documentsForPush.map(async (d) => {
            const base = syncBases[d.relativePath];
            const baseHash = base != null ? await sha256Hex(base) : undefined;
            return {
              relativePath: d.relativePath,
              title: d.title,
              status: d.status,
              content: d.content,
              baseContentHash: baseHash,
              baseContent: base,
            };
          })
        );
        const localPaths = new Set(documentsForPush.map((d) => d.relativePath));
        const deletedPaths: DeletedPathInput[] = Object.keys(syncBases)
          .filter((relativePath) => !localPaths.has(relativePath))
          .filter((relativePath) => !remoteDeletedPaths.has(relativePath))
          .filter((relativePath) => !options.skipRelativePath || relativePath !== options.skipRelativePath)
          .map((relativePath) => ({ relativePath }));

        // Load pending local trash operations for push
        let trashOperations: Array<Record<string, unknown>> = [];
        if (tauri.isAvailable) {
          try {
            const trashMeta = await tauri.loadTrashMetadata(state.workspace.rootPath);
            trashOperations = (trashMeta.pendingTrashOps).map((op) => {
              if (op.type === "restore") return { type: "restore", trashId: op.trashId };
              if (op.type === "permanent_delete") return { type: "permanent_delete", trashId: op.trashId };
              return { type: "empty_trash" };
            });
          } catch { /* non-critical */ }
        }

        const push = await fetch(`${getServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/sync/push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.syncToken}` },
          body: JSON.stringify({
            deviceId: state.cloudProfile?.deviceId ?? "desktop",
            documents: pushDocs,
            deletedPaths,
            trashOperations,
          }),
        });
        if (!push.ok) throw new Error(await push.text());
        const pushData = (await push.json()) as SyncPushResponse;
        dispatch({ type: "SET_CONFLICTS", conflicts: parseSyncConflicts(pushData.conflicts ?? []) });
        const snapshot = `${Date.now()}:${documents.map((d) => `${d.relativePath}:${d.content.length}`).join("|")}`;
        dispatch({ type: "SET_SYNC_SNAPSHOT", snapshot });
        await applyCloudDocuments(pushData.documents, options.skipRelativePath);
        if (tauri.isAvailable && deletedPaths.length > 0) {
          try {
            await tauri.deleteSyncBases(state.workspace.rootPath, deletedPaths.map((d) => d.relativePath));
          } catch { /* non-critical */ }
        }

        // Clear pending trash ops after successful push
        if (tauri.isAvailable && trashOperations.length > 0) {
          try {
            const trashMeta = await tauri.loadTrashMetadata(state.workspace.rootPath);
            trashMeta.pendingTrashOps = [];
            await tauri.saveTrashMetadata(state.workspace.rootPath, trashMeta);
          } catch { /* non-critical */ }
        }

        // 5. Save sync bases for next sync (the server's merged content is the new base)
        if (tauri.isAvailable && pushData.documents.length > 0) {
          try {
            await tauri.saveSyncBases(
              state.workspace.rootPath,
              pushData.documents.map((d) => ({ relativePath: d.relativePath, content: d.content }))
            );
          } catch { /* non-critical */ }
        }

        const deleteCount = pushData.deletedPaths?.length ?? 0;
        const deletionText = deleteCount > 0 ? ` ${deleteCount} moved to cloud trash.` : "";
        dispatch({ type: "SET_STATUS", message: `Synced ${pushData.accepted} change(s) with cloud workspace ${binding.workspaceName}.${deletionText}` });
        dispatch({ type: "SET_SYNC_STATUS", status: "idle", success: true });

        if (options.skipRelativePath) {
          return pushData.documents.find((d) => d.relativePath === options.skipRelativePath);
        }
        return;
      }

      const documents = await tauri.collectSyncDocuments(state.workspace.rootPath);

      const response = await fetch(`${getServiceUrl()}/api/sync/workspace`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.syncToken}` },
        body: JSON.stringify({ workspaceName: state.workspace.name, documents }),
      });
      if (!response.ok) throw new Error(await response.text());
      const result = (await response.json()) as { workspaceId?: string; workspaceName: string; documentCount: number; siteUrl: string };
      const profile: CloudProfile = {
        serverUrl: getServiceUrl(),
        username: state.syncUsername,
        siteUrl: result.siteUrl,
        token: state.syncToken,
        deviceId: state.cloudProfile?.deviceId ?? "",
      };
      dispatch({ type: "SET_SYNC_SESSION", token: state.syncToken, username: state.syncUsername, siteUrl: result.siteUrl, profile });
      const snapshot = `${Date.now()}:${documents.map((d) => `${d.relativePath}:${d.content.length}`).join("|")}`;
      dispatch({ type: "SET_SYNC_SNAPSHOT", snapshot });
      if (result.workspaceId && state.workspace) {
        const newBinding: VaultBinding = {
          workspaceId: result.workspaceId,
          workspaceName: result.workspaceName,
          workspaceSlug: slugify(result.workspaceName),
          localVaultPath: state.workspace.rootPath,
          lastPulledClock: 0,
        };
        if (tauri.isAvailable) {
          const bindings = await tauri.bindCloudWorkspace(newBinding);
          dispatch({ type: "SET_VAULT_BINDINGS", bindings });
        }
        await refreshCloudWorkspaces();
      }
      // Save sync bases for initial sync
      if (tauri.isAvailable && documents.length > 0) {
        try {
          await tauri.saveSyncBases(
            state.workspace.rootPath,
            documents.map((d) => ({ relativePath: d.relativePath, content: d.content }))
          );
        } catch { /* non-critical */ }
      }
      dispatch({ type: "SET_STATUS", message: `Synced ${result.documentCount} document(s) to ${result.siteUrl}.` });
      dispatch({ type: "SET_SYNC_STATUS", status: "idle", success: true });
    } catch (error) {
      dispatch({ type: "SET_SYNC_STATUS", status: "offline" });
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace, state.syncToken, state.syncUsername, state.cloudProfile, state.vaultBindings, getServiceUrl, refreshCloudWorkspaces]);

  const pullCloudWorkspace = useCallback(async (
    binding: VaultBinding,
    skipRelativePath?: string,
    syncBases?: Record<string, string>,
    locallyDeletedPaths: Set<string> = new Set(),
  ): Promise<{ deletedPaths: string[] }> => {
    if (!state.workspace || !state.syncToken) return { deletedPaths: [] };

    // Load trash metadata to get the last synced cursor
    let trashClock = 0;
    if (tauri.isAvailable) {
      try {
        const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
        trashClock = meta.lastSyncedClock ?? 0;
      } catch { /* default to 0 */ }
    }

    const response = await fetch(`${getServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/sync/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.syncToken}` },
      body: JSON.stringify({
        sinceClock: binding.lastPulledClock,
        deviceId: state.cloudProfile?.deviceId ?? "desktop",
        sinceTrashEventClock: trashClock,
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    const pullData = (await response.json()) as { documents: CloudDocument[]; deletedPaths?: DeletedPath[]; conflicts: Array<Record<string, unknown>>; trash?: TrashSyncPayload };
    dispatch({ type: "SET_CONFLICTS", conflicts: parseSyncConflicts(pullData.conflicts ?? []) });

    // During pull, only apply cloud documents for files that haven't been locally modified.
    // A file is "locally modified" if its current content differs from the sync base.
    // Locally modified files are skipped here; the push step will handle merge via the server.
    let pullDocsToApply = pullData.documents.filter((cloudDoc) => !locallyDeletedPaths.has(cloudDoc.relativePath));
    if (syncBases && Object.keys(syncBases).length > 0 && tauri.isAvailable) {
      const localDocs = await tauri.collectSyncDocuments(state.workspace.rootPath);
      const localContentMap = new Map(localDocs.map((d) => [d.relativePath, d.content]));
      pullDocsToApply = pullDocsToApply.filter((cloudDoc) => {
        const localContent = localContentMap.get(cloudDoc.relativePath);
        const baseContent = syncBases[cloudDoc.relativePath];
        // If no base exists (new file from cloud), apply it
        if (baseContent == null) return true;
        // If local content matches the base, local hasn't changed → safe to overwrite with cloud
        if (localContent === baseContent) return true;
        // Local was modified since last sync → skip, let push handle merge
        return false;
      });
    }

    await applyCloudDocuments(pullDocsToApply, skipRelativePath);
    if (tauri.isAvailable && pullDocsToApply.length > 0) {
      try {
        await tauri.saveSyncBases(
          state.workspace.rootPath,
          pullDocsToApply.map((d) => ({ relativePath: d.relativePath, content: d.content }))
        );
      } catch { /* non-critical */ }
    }
    if (pullData.deletedPaths && pullData.deletedPaths.length > 0 && tauri.isAvailable) {
      for (const dp of pullData.deletedPaths) {
        try {
          await tauri.trashEntry(state.workspace.rootPath, dp.relativePath);
        } catch {
          // file may not exist locally — ignore
        }
      }
      try {
        await tauri.deleteSyncBases(state.workspace.rootPath, pullData.deletedPaths.map((d) => d.relativePath));
      } catch { /* non-critical */ }
      const workspace = await tauri.openWorkspace(state.workspace.rootPath);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
    }

    // Handle trash sync data from pull
    if (pullData.trash && tauri.isAvailable) {
      try {
        const trashMetadata = await tauri.loadTrashMetadata(state.workspace.rootPath);
        // Process trash events (empty_trash, permanent_delete_item)
        for (const event of pullData.trash.events) {
          if (event.eventType === "empty_trash") {
            await tauri.emptyTrash(state.workspace.rootPath);
            trashMetadata.items = [];
          } else if (event.eventType === "permanent_delete_item") {
            const trashId = (event.eventData as Record<string, string>).trashId;
            if (trashId) {
              const localItem = trashMetadata.items.find(
                (item) => item.cloudTrashId === trashId
              );
              if (localItem) {
                try { await tauri.permanentDeleteTrash(state.workspace.rootPath, localItem.trashId); } catch { /* ignore */ }
                trashMetadata.items = trashMetadata.items.filter((item) => item.cloudTrashId !== trashId);
              }
            }
          }
        }
        // Update metadata with cloud trash items
        for (const cloudItem of pullData.trash.items) {
          const existing = trashMetadata.items.find(
            (item) => item.cloudTrashId === cloudItem.id
          );
          if (!existing) {
            trashMetadata.items.push({
              trashId: `cloud_${cloudItem.id}`,
              relativePath: cloudItem.relativePath,
              name: cloudItem.title,
              trashedAt: Math.floor(new Date(cloudItem.deletedAt).getTime() / 1000),
              source: "cloud",
              cloudTrashId: cloudItem.id,
            });
          }
        }
        trashMetadata.lastSyncedClock = pullData.trash.trashCursor;
        await tauri.saveTrashMetadata(state.workspace.rootPath, trashMetadata);
      } catch { /* non-critical */ }
    }

    const nextClock = Math.max(
      binding.lastPulledClock,
      ...pullData.documents.map((d) => d.updatedClock),
      ...(pullData.deletedPaths ?? []).map((d) => d.deletedClock),
    );
    const updatedBinding: VaultBinding = { ...binding, lastPulledClock: Number.isFinite(nextClock) ? nextClock : binding.lastPulledClock };
    if (tauri.isAvailable) {
      const bindings = await tauri.bindCloudWorkspace(updatedBinding);
      dispatch({ type: "SET_VAULT_BINDINGS", bindings });
    }
    return { deletedPaths: (pullData.deletedPaths ?? []).map((d) => d.relativePath) };
  }, [dispatch, state.workspace, state.syncToken, state.cloudProfile, getServiceUrl]);

  const applyCloudDocuments = useCallback(async (documents: CloudDocument[], skipRelativePath?: string) => {
    if (!state.workspace || documents.length === 0) return;
    const filtered = (state.isDirty && state.currentRelativePath) || skipRelativePath
      ? documents.filter((d) => {
          if (state.isDirty && d.relativePath === state.currentRelativePath) return false;
          if (skipRelativePath && d.relativePath === skipRelativePath) return false;
          return true;
        })
      : documents;
    if (filtered.length === 0) return;
    const workspace = await tauri.applyCloudDocuments(
      state.workspace.rootPath,
      filtered.map((d) => ({ relativePath: d.relativePath, content: d.content }))
    );
    dispatch({ type: "UPDATE_WORKSPACE", workspace });
    const currentDoc = !state.isDirty && state.currentRelativePath
      ? filtered.find((d) => d.relativePath === state.currentRelativePath)
      : undefined;
    if (currentDoc && currentDoc.content !== state.editorContent) {
      dispatch({ type: "OPEN_FILE", path: state.currentPath, relativePath: state.currentRelativePath, content: currentDoc.content, kind: state.currentKind as EntryKind });
    }
  }, [dispatch, state.workspace, state.isDirty, state.currentRelativePath, state.currentPath, state.currentKind, state.editorContent]);

  const resolveConflict = useCallback(async (conflictId: string, resolution: "accept_local" | "accept_cloud") => {
    const binding = currentVaultBinding(state.vaultBindings, state.workspace?.rootPath ?? "");
    if (!binding || !state.syncToken) return;
    try {
      const response = await fetch(`${getServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/conflicts/${conflictId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.syncToken}` },
        body: JSON.stringify({ resolution }),
      });
      if (!response.ok) throw new Error(await response.text());
      const document = (await response.json()) as CloudDocument;
      dispatch({ type: "SET_CONFLICTS", conflicts: state.activeConflicts.filter((c) => c.conflictId !== conflictId) });
      await applyCloudDocuments([document]);
      dispatch({ type: "SET_STATUS", message: `Resolved conflict in ${document.relativePath}.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    }
  }, [dispatch, state.vaultBindings, state.workspace, state.syncToken, state.activeConflicts, getServiceUrl, applyCloudDocuments]);

  const loadCloudProfile = useCallback(async () => {
    if (!tauri.isAvailable) return;
    try {
      const profile = await tauri.loadCloudProfile();
      dispatch({ type: "SET_CLOUD_PROFILE", profile });
      if (profile.serverUrl) dispatch({ type: "SET_SERVICE_URL", url: profile.serverUrl });
      if (profile.token || profile.username || profile.siteUrl) {
        dispatch({ type: "SET_SYNC_SESSION", token: profile.token, username: profile.username, siteUrl: profile.siteUrl, profile });
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: `Cloud profile unavailable: ${String(error)}` });
    }
  }, [dispatch]);

  const loadVaultBindings = useCallback(async () => {
    if (!tauri.isAvailable) return;
    try {
      const bindings = await tauri.listVaultBindings();
      dispatch({ type: "SET_VAULT_BINDINGS", bindings });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: `Vault bindings unavailable: ${String(error)}` });
    }
  }, [dispatch]);

  const openOrBindCloudWorkspace = useCallback(async (workspaceId: string) => {
    const workspace = state.cloudWorkspaces.find((w) => w.id === workspaceId);
    if (!workspace) return;
    const existing = state.vaultBindings.find((b) => b.workspaceId === workspaceId);
    if (existing) {
      // Open the bound vault — handled by parent
      return existing.localVaultPath;
    }
    const selected = await (await import("@tauri-apps/plugin-dialog")).open({ multiple: false, directory: true });
    const selectedPath = Array.isArray(selected) ? selected[0] : selected;
    if (!selectedPath) return;
    const binding: VaultBinding = {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      localVaultPath: selectedPath,
      lastPulledClock: 0,
    };
    if (tauri.isAvailable) {
      const bindings = await tauri.bindCloudWorkspace(binding);
      dispatch({ type: "SET_VAULT_BINDINGS", bindings });
    }
    return selectedPath;
  }, [dispatch, state.cloudWorkspaces, state.vaultBindings]);

  const pullOnly = useCallback(async () => {
    if (!state.workspace || !state.syncToken) return;
    const binding = currentVaultBinding(state.vaultBindings, state.workspace.rootPath);
    if (!binding) return;
    await pullCloudWorkspace(binding);
  }, [state.workspace, state.syncToken, state.vaultBindings, pullCloudWorkspace]);

  return {
    getServiceUrl,
    startBrowserOAuth,
    disconnectAccount,
    refreshCloudWorkspaces,
    syncWorkspaceToWeb,
    pullOnly,
    resolveConflict,
    loadCloudProfile,
    loadVaultBindings,
    openOrBindCloudWorkspace,
  };
}

function currentVaultBinding(bindings: VaultBinding[], rootPath?: string): VaultBinding | null {
  if (!rootPath) return null;
  return bindings.find((b) => b.localVaultPath === rootPath) ?? null;
}
