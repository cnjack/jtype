import { useCallback, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAppDispatch, useAppState } from "../app/AppState";
import { tauri } from "../lib/tauri";
import { httpRequest } from "../lib/http";
import { sha256Hex } from "../lib/utils";
import type { AuthResponse, CloudProfile, VaultBinding, CloudDocument, CloudFolder, CloudWorkspace, DeletedFolder, DeletedPath, DeletedPathInput, EntryKind, SyncPushDocument, SyncPushResponse, TrashSyncPayload, VaultSettings } from "../lib/types";
import { parseSyncConflicts } from "../lib/types";

type TrashOperationPayload =
  | { type: "restore"; trashId: string }
  | { type: "permanent_delete"; trashId: string }
  | { type: "empty_trash" };

type PullOnlyOptions = {
  full?: boolean;
  reason?: string;
  sinceClock?: number;
  sinceTrashEventClock?: number;
};

const cloudEnabledSettings: VaultSettings = {
  cloudSyncEnabled: true,
  syncPromptDismissedAt: null,
  syncDisabledPermanently: false,
};

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
      const response = await httpRequest(`${getServiceUrl()}/api/oauth/device/start`, {
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
          const pollResponse = await httpRequest(`${getServiceUrl()}/api/oauth/device/poll`, {
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
              const wsResp = await httpRequest(`${getServiceUrl()}/api/v1/workspaces`, {
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
      const response = await httpRequest(`${getServiceUrl()}/api/v1/workspaces`, {
        headers: { Authorization: `Bearer ${state.syncToken}` },
      });
      if (!response.ok) throw new Error(await response.text());
      const result = (await response.json()) as { workspaces: CloudWorkspace[] };
      dispatch({ type: "SET_CLOUD_WORKSPACES", workspaces: result.workspaces });
      const roleByWorkspaceId = new Map(result.workspaces.map((workspace) => [workspace.id, workspace.role]));
      const nextBindings = state.vaultBindings.map((binding) => {
        const workspaceRole = roleByWorkspaceId.get(binding.workspaceId);
        return workspaceRole && binding.workspaceRole !== workspaceRole ? { ...binding, workspaceRole } : binding;
      });
      if (nextBindings.some((binding, index) => binding !== state.vaultBindings[index])) {
        dispatch({ type: "SET_VAULT_BINDINGS", bindings: nextBindings });
        if (tauri.isAvailable) {
          for (const binding of nextBindings) {
            await tauri.bindCloudWorkspace(binding);
          }
        }
      }
    } catch {
      // silently ignore — cloud workspaces are non-critical
    }
  }, [dispatch, state.syncToken, state.vaultBindings, getServiceUrl]);

  const handleWorkspaceAccessLoss = useCallback(async (binding: VaultBinding, statusCode: number) => {
    if (!state.workspace) return;
    const settings: VaultSettings = {
      cloudSyncEnabled: false,
      syncPromptDismissedAt: null,
      syncDisabledPermanently: false,
    };
    if (tauri.isAvailable) {
      await tauri.unbindCloudWorkspace(binding.workspaceId, state.workspace.rootPath).catch(() => undefined);
      await tauri.saveVaultSettings(state.workspace.rootPath, settings).catch(() => undefined);
    }
    dispatch({ type: "DISCONNECT_WORKSPACE", workspaceId: binding.workspaceId, vaultPath: state.workspace.rootPath, settings });
    dispatch({
      type: "SET_STATUS",
      message: statusCode === 404
        ? "Cloud workspace was deleted. Local files were kept and this vault is now local-only."
        : "You no longer have access to this cloud workspace. Local files were kept.",
    });
  }, [dispatch, state.workspace]);

  const syncWorkspaceToWeb = useCallback(async (options: { silent?: boolean; skipRelativePath?: string; bindingOverride?: VaultBinding } = {}): Promise<SyncPushDocument | undefined> => {
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

      const vaultSettings = state.vaultSettings[state.workspace.rootPath];
      if (vaultSettings?.cloudSyncEnabled === false && !options.bindingOverride) {
        dispatch({ type: "SET_STATUS", message: "This vault is in local mode. Enable cloud sync from Settings to sync." });
        dispatch({ type: "SET_SYNC_STATUS", status: "idle" });
        return;
      }

      const binding = options.bindingOverride ?? currentVaultBinding(state.vaultBindings, state.workspace.rootPath);

      if (binding) {
        if (binding.workspaceRole === "viewer") {
          await pullCloudWorkspace(binding, options.skipRelativePath, undefined, new Set(), { reason: "viewer-read-only-sync" });
          dispatch({ type: "SET_STATUS", message: `Pulled cloud workspace ${binding.workspaceName}. Viewer access is read-only.` });
          dispatch({ type: "SET_SYNC_STATUS", status: "idle", success: true });
          return;
        }
        // 1. Collect local documents BEFORE pull overwrites them
        const documents = await tauri.collectSyncDocuments(state.workspace.rootPath);
        const folders = await tauri.collectSyncFolders(state.workspace.rootPath);

        // 2. Load sync bases (last synced content per document) for three-way merge
        let syncBases: Record<string, string> = {};
        let syncFolderBases: string[] = [];
        let trashOperations: Array<{ type: string; trashId?: string }> = [];
        if (tauri.isAvailable) {
          try { syncBases = await tauri.loadSyncBases(state.workspace.rootPath); } catch { /* first sync */ }
          try { syncFolderBases = await tauri.loadSyncFolderBases(state.workspace.rootPath); } catch { /* first sync */ }
          try {
            const trashMetadata = await tauri.loadTrashMetadata(state.workspace.rootPath);
            trashOperations = trashMetadata.pendingTrashOps.map((op) => ({
              type: op.type,
              ...(op.type !== "empty_trash" ? { trashId: (op as { trashId: string }).trashId } : {}),
            }));
          } catch { /* no pending trash ops */ }
        }

        const localPathsBeforePull = new Set(documents.map((d) => d.relativePath));
        const locallyDeletedPaths = new Set(
          Object.keys(syncBases)
            .filter((relativePath) => !localPathsBeforePull.has(relativePath))
            .filter((relativePath) => !options.skipRelativePath || relativePath !== options.skipRelativePath)
        );
        const localFolderPaths = new Set(folders.map((f) => f.relativePath));
        const locallyDeletedFolders = syncFolderBases
          .filter((relativePath) => !localFolderPaths.has(relativePath));

        // 3. Pull cloud changes and apply to disk (only overwrites files not locally modified)
        const pullResult = await pullCloudWorkspace(binding, options.skipRelativePath, syncBases, locallyDeletedPaths);
        const remoteDeletedPaths = new Set(pullResult.deletedPaths);
        const remoteDeletedFolders = new Set(pullResult.deletedFolders);
        const pulledDocumentPaths = new Set(pullResult.documentPaths);
        const documentsForPush = documents.filter((d) => !remoteDeletedPaths.has(d.relativePath));
        const foldersForPush = folders.filter((f) => !remoteDeletedFolders.has(f.relativePath));

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
          .filter((relativePath) => !pulledDocumentPaths.has(relativePath))
          .filter((relativePath) => !options.skipRelativePath || relativePath !== options.skipRelativePath)
          .map((relativePath) => ({ relativePath }));

        const push = await httpRequest(`${getServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/sync/push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.syncToken}` },
          body: JSON.stringify({
            deviceId: state.cloudProfile?.deviceId ?? "desktop",
            folders: foldersForPush,
            documents: pushDocs,
            deletedPaths,
            deletedFolders: locallyDeletedFolders.map((relativePath) => ({ relativePath })),
            trashOperations,
          }),
        });
        if (push.status === 403 || push.status === 404) {
          await handleWorkspaceAccessLoss(binding, push.status);
          dispatch({ type: "SET_SYNC_STATUS", status: "idle" });
          return;
        }
        if (!push.ok) throw new Error(await push.text());
        const pushData = (await push.json()) as SyncPushResponse;
        dispatch({ type: "SET_CONFLICTS", conflicts: parseSyncConflicts(pushData.conflicts ?? []) });
        const snapshot = `${Date.now()}:${documents.map((d) => `${d.relativePath}:${d.content.length}`).join("|")}`;
        dispatch({ type: "SET_SYNC_SNAPSHOT", snapshot });
        await applyCloudDocumentsRef.current(pushData.documents, pushData.folders ?? [], options.skipRelativePath);
        if (tauri.isAvailable && deletedPaths.length > 0) {
          try {
            await tauri.deleteSyncBases(state.workspace.rootPath, deletedPaths.map((d) => d.relativePath));
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
        if (tauri.isAvailable) {
          try {
            await tauri.saveSyncFolderBases(
              state.workspace.rootPath,
              pushData.folders?.map((f) => f.relativePath) ?? []
            );
          } catch { /* non-critical */ }
        }
        // Clear pending trash operations after successful push
        if (tauri.isAvailable && trashOperations.length > 0) {
          try {
            const trashMetadata = await tauri.loadTrashMetadata(state.workspace.rootPath);
            trashMetadata.pendingTrashOps = [];
            await tauri.saveTrashMetadata(state.workspace.rootPath, trashMetadata);
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

      // No cloud workspace binding — cannot sync.
      dispatch({ type: "SET_STATUS", message: "No cloud workspace bound. Open Account to connect a workspace first." });
      dispatch({ type: "SET_SYNC_STATUS", status: "offline" });
    } catch (error) {
      dispatch({ type: "SET_SYNC_STATUS", status: "offline" });
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace, state.syncToken, state.syncUsername, state.cloudProfile, state.vaultBindings, state.vaultSettings, getServiceUrl, refreshCloudWorkspaces, handleWorkspaceAccessLoss]);

  // Ref ensures pullCloudWorkspace/syncWorkspaceToWeb always call the latest
  // applyCloudDocuments without needing it as a dependency (which would cause
  // cascading recreation of every callback that touches it).
  const applyCloudDocumentsRef = useRef<(documents: CloudDocument[], folders?: CloudFolder[], skipRelativePath?: string) => Promise<void>>(async () => {});

  const pullCloudWorkspace = useCallback(async (
    binding: VaultBinding,
    skipRelativePath?: string,
    syncBases?: Record<string, string>,
    locallyDeletedPaths: Set<string> = new Set(),
    options: { sinceClock?: number; sinceTrashEventClock?: number; reason?: string } = {},
  ): Promise<{ deletedPaths: string[]; deletedFolders: string[]; documentPaths: string[] }> => {
    if (!state.workspace || !state.syncToken) {
      return { deletedPaths: [], deletedFolders: [], documentPaths: [] };
    }

    // Load trash metadata to get the last synced cursor
    let trashClock = 0;
    if (tauri.isAvailable) {
      try {
        const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
        trashClock = meta.lastSyncedClock ?? 0;
      } catch { /* default to 0 */ }
    }

    const sinceClock = options.sinceClock ?? binding.lastPulledClock;
    if (options.sinceTrashEventClock != null) {
      trashClock = options.sinceTrashEventClock;
    }
    console.log("[cloud:pull] request", {
      vaultPath: state.workspace.rootPath,
      workspaceId: binding.workspaceId,
      sinceClock,
      bindingLastPulledClock: binding.lastPulledClock,
      sinceTrashEventClock: trashClock,
      skipRelativePath,
      syncBaseCount: syncBases ? Object.keys(syncBases).length : null,
      locallyDeletedCount: locallyDeletedPaths.size,
      reason: options.reason,
    });
    const response = await httpRequest(`${getServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/sync/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.syncToken}` },
      body: JSON.stringify({
        sinceClock,
        deviceId: state.cloudProfile?.deviceId ?? "desktop",
        sinceTrashEventClock: trashClock,
      }),
    });
    if (response.status === 403 || response.status === 404) {
      await handleWorkspaceAccessLoss(binding, response.status);
      return { deletedPaths: [], deletedFolders: [], documentPaths: [] };
    }
    if (!response.ok) throw new Error(await response.text());
    const pullData = (await response.json()) as {
      folders?: CloudFolder[];
      deletedFolders?: DeletedFolder[];
      documents: CloudDocument[];
      deletedPaths?: DeletedPath[];
      conflicts: Array<Record<string, unknown>>;
      trash?: TrashSyncPayload;
    };
    console.log("[cloud:pull] response", {
      documentsCount: pullData.documents.length,
      deletedPathsCount: pullData.deletedPaths?.length ?? 0,
      deletedPaths: pullData.deletedPaths?.map(d => d.relativePath) ?? [],
      foldersCount: pullData.folders?.length ?? 0,
      deletedFoldersCount: pullData.deletedFolders?.length ?? 0,
    });
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

    console.log("[cloud:apply] candidates", {
      receivedDocumentPaths: pullData.documents.map((d) => d.relativePath),
      applyDocumentPaths: pullDocsToApply.map((d) => d.relativePath),
      folderPaths: (pullData.folders ?? []).map((f) => f.relativePath),
      skippedLocallyDeletedPaths: pullData.documents
        .filter((d) => locallyDeletedPaths.has(d.relativePath))
        .map((d) => d.relativePath),
      skipRelativePath,
    });
    await applyCloudDocumentsRef.current(pullDocsToApply, pullData.folders ?? [], skipRelativePath);
    if (tauri.isAvailable && pullDocsToApply.length > 0) {
      try {
        await tauri.saveSyncBases(
          state.workspace.rootPath,
          pullDocsToApply.map((d) => ({ relativePath: d.relativePath, content: d.content }))
        );
      } catch { /* non-critical */ }
      // Remove restored documents from local trash so they don't re-appear in the trash list
      try {
        const localTrashItems = await tauri.listTrash(state.workspace.rootPath);
        for (const doc of pullDocsToApply) {
          const localItem = localTrashItems.find((item) => item.relativePath === doc.relativePath);
          if (localItem) {
            await tauri.permanentDeleteTrash(state.workspace.rootPath, localItem.trashId);
          }
        }
      } catch { /* non-critical */ }
    }
    if (pullData.deletedPaths && pullData.deletedPaths.length > 0 && tauri.isAvailable) {
      console.log("[cloud:pull] processing deletedPaths:", pullData.deletedPaths.map(d => d.relativePath));
      for (const dp of pullData.deletedPaths) {
        try {
          console.log("[cloud:pull] trashing entry:", dp.relativePath);
          await tauri.trashEntry(state.workspace.rootPath, dp.relativePath);
        } catch (error) {
          console.log("[cloud:pull] failed to trash entry:", dp.relativePath, error);
          // file may not exist locally — ignore
        }
      }
      try {
        await tauri.deleteSyncBases(state.workspace.rootPath, pullData.deletedPaths.map((d) => d.relativePath));
      } catch { /* non-critical */ }
      const workspace = await tauri.openWorkspace(state.workspace.rootPath);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      console.log("[cloud:pull] workspace updated after deletions");
    }
    if (pullData.deletedFolders && pullData.deletedFolders.length > 0 && tauri.isAvailable) {
      const workspace = await tauri.applyDeletedCloudFolders(
        state.workspace.rootPath,
        pullData.deletedFolders.map((f) => ({ relativePath: f.relativePath }))
      );
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
    }
    if (tauri.isAvailable) {
      try {
        const cloudFolders = pullData.folders ?? [];
        const mergedFolders = cloudFolders.map((f) => f.relativePath);
        await tauri.saveSyncFolderBases(state.workspace.rootPath, mergedFolders);
      } catch { /* non-critical */ }
    }

    let trashChanged = false;
    // Handle trash sync data from pull
    if (pullData.trash && tauri.isAvailable) {
      try {
        const trashMetadata = await tauri.loadTrashMetadata(state.workspace.rootPath);
        const pendingTrashIds = new Set(
          trashMetadata.pendingTrashOps
            .filter((op): op is Extract<TrashOperationPayload, { trashId: string }> => op.type !== "empty_trash")
            .map((op) => op.trashId)
        );
        const hasPendingEmptyTrash = trashMetadata.pendingTrashOps.some((op) => op.type === "empty_trash");
        // Process trash events (empty_trash, permanent_delete_item)
        for (const event of pullData.trash.events) {
          if (event.eventType === "empty_trash") {
            await tauri.emptyTrash(state.workspace.rootPath);
            trashMetadata.items = [];
            trashChanged = true;
          } else if (event.eventType === "permanent_delete_item") {
            const trashId = (event.eventData as Record<string, string>).trashId;
            if (trashId) {
              const localItem = trashMetadata.items.find(
                (item) => item.cloudTrashId === trashId
              );
              if (localItem) {
                try { await tauri.permanentDeleteTrash(state.workspace.rootPath, localItem.trashId); } catch { /* ignore */ }
                try {
                  const localTrashItems = await tauri.listTrash(state.workspace.rootPath);
                  for (const item of localTrashItems.filter((item) => item.relativePath === localItem.relativePath)) {
                    try { await tauri.permanentDeleteTrash(state.workspace.rootPath, item.trashId); } catch { /* ignore */ }
                  }
                } catch { /* ignore */ }
                trashMetadata.items = trashMetadata.items.filter((item) => item.cloudTrashId !== trashId);
                trashChanged = true;
              }
            }
          }
        }
        // Build set of active cloud trash IDs from the server
        const activeCloudTrashIds = new Set(
          hasPendingEmptyTrash
            ? []
            : pullData.trash.items
                .filter((item) => !pendingTrashIds.has(item.id))
                .map((item) => item.id)
        );
        // Remove cloud trash items that are no longer active (e.g. restored)
        const beforeFilter = trashMetadata.items.length;
        trashMetadata.items = trashMetadata.items.filter(
          (item) => item.source !== "cloud" || activeCloudTrashIds.has(item.cloudTrashId!)
        );
        if (trashMetadata.items.length !== beforeFilter) trashChanged = true;
        // Update metadata with cloud trash items
        for (const cloudItem of pullData.trash.items.filter((item) => activeCloudTrashIds.has(item.id))) {
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
            trashChanged = true;
          }
        }
        trashMetadata.lastSyncedClock = pullData.trash.trashCursor;
        await tauri.saveTrashMetadata(state.workspace.rootPath, trashMetadata);
        // Refresh workspace so Sidebar trash list re-renders
        if (trashChanged) {
          try {
            const workspace = await tauri.openWorkspace(state.workspace.rootPath);
            dispatch({ type: "UPDATE_WORKSPACE", workspace });
          } catch { /* ignore */ }
        }
      } catch { /* non-critical */ }
    }

    const nextClock = Math.max(
      binding.lastPulledClock,
      ...(pullData.folders ?? []).map((f) => f.updatedClock ?? 0),
      ...(pullData.deletedFolders ?? []).map((f) => f.deletedClock),
      ...pullData.documents.map((d) => d.updatedClock),
      ...(pullData.deletedPaths ?? []).map((d) => d.deletedClock),
    );
    const updatedBinding: VaultBinding = { ...binding, lastPulledClock: Number.isFinite(nextClock) ? nextClock : binding.lastPulledClock };
    if (tauri.isAvailable) {
      const bindings = await tauri.bindCloudWorkspace(updatedBinding);
      dispatch({ type: "SET_VAULT_BINDINGS", bindings });
    }
    return {
      deletedPaths: (pullData.deletedPaths ?? []).map((d) => d.relativePath),
      deletedFolders: (pullData.deletedFolders ?? []).map((d) => d.relativePath),
      documentPaths: pullDocsToApply.map((d) => d.relativePath),
    };
  }, [dispatch, state.workspace, state.syncToken, state.cloudProfile, getServiceUrl, handleWorkspaceAccessLoss]);

  const applyCloudDocuments = useCallback(async (documents: CloudDocument[], folders: CloudFolder[] = [], skipRelativePath?: string) => {
    if (!state.workspace || (documents.length === 0 && folders.length === 0)) {
      return;
    }
    const filtered = (state.isDirty && state.currentRelativePath) || skipRelativePath
      ? documents.filter((d) => {
          if (state.isDirty && d.relativePath === state.currentRelativePath) return false;
          if (skipRelativePath && d.relativePath === skipRelativePath) return false;
          return true;
        })
      : documents;
    if (filtered.length === 0 && folders.length === 0) {
      console.log("[cloud:apply] skipped", {
        reason: "nothing to apply after filters",
        receivedDocumentPaths: documents.map((d) => d.relativePath),
        folderPaths: folders.map((f) => f.relativePath),
        skipRelativePath,
        isDirty: state.isDirty,
        currentRelativePath: state.currentRelativePath,
      });
      return;
    }
    console.log("[cloud:apply] writing", {
      vaultPath: state.workspace.rootPath,
      documentPaths: filtered.map((d) => d.relativePath),
      folderPaths: folders.map((f) => f.relativePath),
      skipRelativePath,
      isDirty: state.isDirty,
      currentRelativePath: state.currentRelativePath,
    });
    const workspace = await tauri.applyCloudDocuments(
      state.workspace.rootPath,
      filtered.map((d) => ({ relativePath: d.relativePath, content: d.content })),
      folders.map((f) => ({ relativePath: f.relativePath }))
    );
    dispatch({ type: "UPDATE_WORKSPACE", workspace });
    console.log("[cloud:apply] workspace updated", {
      documentPaths: filtered.map((d) => d.relativePath),
    });
    const currentDoc = !state.isDirty && state.currentRelativePath
      ? filtered.find((d) => d.relativePath === state.currentRelativePath)
      : undefined;
    if (currentDoc && currentDoc.content !== state.editorContent) {
      dispatch({ type: "OPEN_FILE", path: state.currentPath, relativePath: state.currentRelativePath, content: currentDoc.content, kind: state.currentKind as EntryKind });
    }
  }, [dispatch, state.workspace, state.isDirty, state.currentRelativePath, state.currentPath, state.currentKind, state.editorContent]);

  // Keep ref in sync so pullCloudWorkspace always uses the latest version.
  applyCloudDocumentsRef.current = applyCloudDocuments;

  const resolveConflict = useCallback(async (conflictId: string, resolution: "accept_local" | "accept_cloud" | "manual_merge", content?: string) => {
    const binding = currentVaultBinding(state.vaultBindings, state.workspace?.rootPath ?? "");
    if (!binding || !state.syncToken) return;
    try {
      const body: Record<string, string> = { resolution };
      if (resolution === "manual_merge" && content != null) {
        body.content = content;
      }
      const response = await httpRequest(`${getServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/conflicts/${conflictId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.syncToken}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await response.text());
      const document = (await response.json()) as CloudDocument;
      dispatch({ type: "REMOVE_CONFLICT", conflictId });
      await applyCloudDocumentsRef.current([document]);
      // Update sync base so subsequent syncs don't re-conflict.
      if (tauri.isAvailable && state.workspace) {
        try {
          await tauri.saveSyncBases(state.workspace.rootPath, [
            { relativePath: document.relativePath, content: document.content },
          ]);
        } catch { /* non-critical */ }
      }
      dispatch({ type: "SET_STATUS", message: `Resolved conflict in ${document.relativePath}.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
      throw error;
    }
  }, [dispatch, state.vaultBindings, state.workspace, state.syncToken, getServiceUrl]);

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

  const saveCurrentVaultSettings = useCallback(async (settings: VaultSettings) => {
    if (!state.workspace) return;
    if (tauri.isAvailable) {
      await tauri.saveVaultSettings(state.workspace.rootPath, settings);
    }
    dispatch({ type: "SET_VAULT_SETTINGS", vaultPath: state.workspace.rootPath, settings });
  }, [dispatch, state.workspace]);

  const hasUnpushedLocalChanges = useCallback(async () => {
    if (!state.workspace || !tauri.isAvailable) return false;
    const [syncBases, documents] = await Promise.all([
      tauri.loadSyncBases(state.workspace.rootPath).catch(() => ({} as Record<string, string>)),
      tauri.collectSyncDocuments(state.workspace.rootPath),
    ]);
    return documents.some((doc) => syncBases[doc.relativePath] == null || syncBases[doc.relativePath] !== doc.content);
  }, [state.workspace]);

  const bindCurrentVaultToWorkspace = useCallback(async (workspace: CloudWorkspace) => {
    if (!state.workspace) {
      dispatch({ type: "SET_STATUS", message: "Open a vault before binding a cloud workspace." });
      return;
    }
    const workspaceName = (workspace.name || workspace.slug || "Untitled workspace").replace(/^:/, "");
    const currentBinding = currentVaultBinding(state.vaultBindings, state.workspace.rootPath);
    const isSwitch = Boolean(currentBinding && currentBinding.workspaceId !== workspace.id);
    if (isSwitch && await hasUnpushedLocalChanges()) {
      dispatch({ type: "SET_STATUS", message: "Sync this vault before switching cloud workspaces." });
      throw new Error("UNPUSHED_CHANGES");
    }

    const binding: VaultBinding = {
      workspaceId: workspace.id,
      workspaceName,
      workspaceSlug: workspace.slug,
      workspaceRole: workspace.role,
      localVaultPath: state.workspace.rootPath,
      lastPulledClock: 0,
    };

    let nextBindings = state.vaultBindings
      .filter((item) => item.workspaceId !== workspace.id)
      .filter((item) => item.localVaultPath !== state.workspace?.rootPath);
    nextBindings = [...nextBindings, binding];

    if (tauri.isAvailable) {
      if (isSwitch) await tauri.clearSyncBases(state.workspace.rootPath);
      nextBindings = await tauri.bindCloudWorkspace(binding);
    }
    dispatch({ type: "SET_VAULT_BINDINGS", bindings: nextBindings });
    await saveCurrentVaultSettings(cloudEnabledSettings);
    dispatch({ type: "SET_STATUS", message: `Bound "${workspaceName}" to current vault.` });
  }, [dispatch, hasUnpushedLocalChanges, saveCurrentVaultSettings, state.vaultBindings, state.workspace]);

  const disconnectWorkspace = useCallback(async () => {
    if (!state.workspace) return;
    const binding = currentVaultBinding(state.vaultBindings, state.workspace.rootPath);
    const settings: VaultSettings = {
      cloudSyncEnabled: false,
      syncPromptDismissedAt: null,
      syncDisabledPermanently: false,
    };
    if (!binding) {
      await saveCurrentVaultSettings(settings);
      dispatch({ type: "SET_STATUS", message: "This vault is now in local mode." });
      return;
    }
    let persistenceWarning = "";
    if (tauri.isAvailable) {
      await tauri.stopCloudListener().catch(() => undefined);
      try {
        await tauri.unbindCloudWorkspace(binding.workspaceId, state.workspace.rootPath);
      } catch (error) {
        persistenceWarning = ` Local binding persistence failed: ${String(error)}`;
      }
      try {
        await tauri.saveVaultSettings(state.workspace.rootPath, settings);
      } catch (error) {
        persistenceWarning = ` Local sync settings persistence failed: ${String(error)}`;
      }
    }
    dispatch({ type: "DISCONNECT_WORKSPACE", workspaceId: binding.workspaceId, vaultPath: state.workspace.rootPath, settings });
    dispatch({ type: "SET_STATUS", message: `Disconnected cloud sync. Local files were kept.${persistenceWarning}` });
  }, [dispatch, saveCurrentVaultSettings, state.vaultBindings, state.workspace]);

  const autoCreateAndBindWorkspace = useCallback(async () => {
    if (!state.workspace) return;
    if (!state.syncToken) {
      await startBrowserOAuth();
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_STATUS", message: "Creating cloud workspace..." });
      const response = await httpRequest(`${getServiceUrl()}/api/v1/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.syncToken}` },
        body: JSON.stringify({ name: state.workspace.name }),
      });
      if (!response.ok) throw new Error(await response.text());
      const workspace = (await response.json()) as CloudWorkspace;
      const binding: VaultBinding = {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        workspaceRole: workspace.role,
        localVaultPath: state.workspace.rootPath,
        lastPulledClock: 0,
      };
      const nextBindings = tauri.isAvailable
        ? await tauri.bindCloudWorkspace(binding)
        : [
            ...state.vaultBindings.filter((item) => item.localVaultPath !== state.workspace?.rootPath && item.workspaceId !== workspace.id),
            binding,
          ];
      dispatch({ type: "SET_VAULT_BINDINGS", bindings: nextBindings });
      await saveCurrentVaultSettings(cloudEnabledSettings);
      await refreshCloudWorkspaces();
      await syncWorkspaceToWeb({ silent: true, bindingOverride: binding });
      dispatch({ type: "SET_STATUS", message: `Synced "${state.workspace.name}" to cloud workspace ${workspace.name}.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, getServiceUrl, refreshCloudWorkspaces, saveCurrentVaultSettings, startBrowserOAuth, state.syncToken, state.vaultBindings, state.workspace, syncWorkspaceToWeb]);

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
      workspaceRole: workspace.role,
      localVaultPath: selectedPath,
      lastPulledClock: 0,
    };
    if (tauri.isAvailable) {
      const bindings = await tauri.bindCloudWorkspace(binding);
      dispatch({ type: "SET_VAULT_BINDINGS", bindings });
      await tauri.saveVaultSettings(selectedPath, cloudEnabledSettings).catch(() => undefined);
    }
    return selectedPath;
  }, [dispatch, state.cloudWorkspaces, state.vaultBindings]);

  const pullOnly = useCallback(async (options: PullOnlyOptions = {}) => {
    console.log("[pullOnly] called with options:", options);
    if (!state.workspace || !state.syncToken) {
      console.log("[pullOnly] early exit: workspace =", !!state.workspace, "syncToken =", !!state.syncToken);
      return;
    }
    const vaultSettings = state.vaultSettings[state.workspace.rootPath];
    if (vaultSettings?.cloudSyncEnabled === false) {
      console.log("[pullOnly] cloud sync disabled for vault");
      return;
    }
    const binding = currentVaultBinding(state.vaultBindings, state.workspace.rootPath);
    if (!binding) {
      console.log("[pullOnly] no binding found for vault");
      return;
    }
    console.log("[pullOnly] proceeding with pull, binding:", binding.workspaceId);
    let syncBases: Record<string, string> | undefined;
    if (options.full && tauri.isAvailable) {
      try {
        syncBases = await tauri.loadSyncBases(state.workspace.rootPath);
      } catch {
        syncBases = {};
      }
    }
    const pullOptions = options.full
      ? { sinceClock: 0, sinceTrashEventClock: 0, reason: options.reason ?? "full-pull" }
      : options.sinceClock != null
        ? { sinceClock: options.sinceClock, sinceTrashEventClock: options.sinceTrashEventClock, reason: options.reason }
        : { reason: options.reason };
    await pullCloudWorkspace(
      binding,
      undefined,
      syncBases,
      new Set(),
      pullOptions,
    );
    console.log("[pullOnly] pull completed");
  }, [state.workspace, state.syncToken, state.vaultBindings, state.vaultSettings, pullCloudWorkspace]);

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
    saveCurrentVaultSettings,
    bindCurrentVaultToWorkspace,
    disconnectWorkspace,
    autoCreateAndBindWorkspace,
    openOrBindCloudWorkspace,
  };
}

function currentVaultBinding(bindings: VaultBinding[], rootPath?: string): VaultBinding | null {
  if (!rootPath) return null;
  return bindings.find((b) => b.localVaultPath === rootPath) ?? null;
}
