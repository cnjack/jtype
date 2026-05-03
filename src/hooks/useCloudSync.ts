import { useCallback, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAppDispatch, useAppState } from "../app/AppState";
import { tauri } from "../lib/tauri";
import { slugify } from "../lib/utils";
import type { AuthResponse, CloudProfile, VaultBinding, CloudDocument, CloudWorkspace, DeletedPath } from "../lib/types";
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

  const syncWorkspaceToWeb = useCallback(async (options: { silent?: boolean } = {}) => {
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

      const documents = await tauri.collectSyncDocuments(state.workspace.rootPath);
      const binding = currentVaultBinding(state.vaultBindings, state.workspace.rootPath);

      if (binding) {
        await pullCloudWorkspace(binding);
        const push = await fetch(`${getServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/sync/push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.syncToken}` },
          body: JSON.stringify({
            deviceId: state.cloudProfile?.deviceId ?? "desktop",
            documents: documents.map((d) => ({ relativePath: d.relativePath, title: d.title, status: d.status, content: d.content })),
          }),
        });
        if (!push.ok) throw new Error(await push.text());
        const pushData = (await push.json()) as { accepted: number; documents: CloudDocument[]; conflicts: Array<Record<string, unknown>> };
        dispatch({ type: "SET_CONFLICTS", conflicts: parseSyncConflicts(pushData.conflicts ?? []) });
        const snapshot = `${Date.now()}:${documents.map((d) => `${d.relativePath}:${d.content.length}`).join("|")}`;
        dispatch({ type: "SET_SYNC_SNAPSHOT", snapshot });
        await applyCloudDocuments(pushData.documents);
        dispatch({ type: "SET_STATUS", message: `Synced ${pushData.accepted} document(s) with cloud workspace ${binding.workspaceName}.` });
        return;
      }

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
      dispatch({ type: "SET_STATUS", message: `Synced ${result.documentCount} document(s) to ${result.siteUrl}.` });
    } catch (error) {
      dispatch({ type: "SET_SYNC_STATUS", status: "offline" });
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_SYNC_STATUS", status: state.activeConflicts.length > 0 ? "conflict" : "idle" });
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace, state.syncToken, state.syncUsername, state.cloudProfile, state.vaultBindings, getServiceUrl, refreshCloudWorkspaces]);

  const pullCloudWorkspace = useCallback(async (binding: VaultBinding) => {
    if (!state.workspace || !state.syncToken) return;
    const response = await fetch(`${getServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/sync/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.syncToken}` },
      body: JSON.stringify({ sinceClock: binding.lastPulledClock, deviceId: state.cloudProfile?.deviceId ?? "desktop" }),
    });
    if (!response.ok) throw new Error(await response.text());
    const pullData = (await response.json()) as { documents: CloudDocument[]; deletedPaths?: DeletedPath[]; conflicts: Array<Record<string, unknown>> };
    dispatch({ type: "SET_CONFLICTS", conflicts: parseSyncConflicts(pullData.conflicts ?? []) });
    await applyCloudDocuments(pullData.documents);
    if (pullData.deletedPaths && pullData.deletedPaths.length > 0 && tauri.isAvailable) {
      for (const dp of pullData.deletedPaths) {
        try {
          await tauri.trashEntry(state.workspace.rootPath, dp.relativePath);
        } catch {
          // file may not exist locally — ignore
        }
      }
      const workspace = await tauri.openWorkspace(state.workspace.rootPath);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
    }
    const nextClock = Math.max(binding.lastPulledClock, ...pullData.documents.map((d) => d.updatedClock));
    const updatedBinding: VaultBinding = { ...binding, lastPulledClock: Number.isFinite(nextClock) ? nextClock : binding.lastPulledClock };
    if (tauri.isAvailable) {
      const bindings = await tauri.bindCloudWorkspace(updatedBinding);
      dispatch({ type: "SET_VAULT_BINDINGS", bindings });
    }
  }, [dispatch, state.workspace, state.syncToken, state.cloudProfile, getServiceUrl]);

  const applyCloudDocuments = useCallback(async (documents: CloudDocument[]) => {
    if (!state.workspace || documents.length === 0) return;
    const filtered = state.isDirty && state.currentRelativePath
      ? documents.filter((d) => d.relativePath !== state.currentRelativePath)
      : documents;
    if (filtered.length === 0) return;
    const workspace = await tauri.applyCloudDocuments(
      state.workspace.rootPath,
      filtered.map((d) => ({ relativePath: d.relativePath, content: d.content }))
    );
    dispatch({ type: "UPDATE_WORKSPACE", workspace });
  }, [dispatch, state.workspace, state.isDirty, state.currentRelativePath]);

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
