import { useCallback, useEffect, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAppDispatch, useAppState } from "../app/AppState";
import { tauri } from "../lib/tauri";
import { httpRequest } from "@shared/lib/http";
import { syncsAsDocument } from "@shared/lib/fileTypes";
import { sha256Hex, sha256HexBytes } from "../lib/utils";
import { markCloudWrite, markCloudWriteBatch } from "../lib/cloudWriteHashes";
import type { AuthResponse, CloudProfile, VaultBinding, CloudDocument, CloudFolder, CloudWorkspace, DeletedFolder, DeletedPath, DeletedPathInput, EntryKind, MobilePendingOAuth, OAuthDeviceStartResponse, PendingTrashOp, SyncPushDocument, SyncPushResponse, TrashSyncPayload, VaultSettings, BlobManifestEntry } from "../lib/types";
import { parseSyncConflicts } from "../lib/types";
import { createSyncPushBatches, createSyncRunId, postSyncPush, requestWithSyncRetry } from "../lib/syncTransport";
import { useRuntimeCapabilities } from "../app/RuntimeCapabilities";
import { MOBILE_OAUTH_CALLBACK_URL } from "@shared/lib/mobileOAuth";
import { registerMobileOAuthReturnHandler } from "../lib/mobileOAuthReturn";
import { openWorkspaceForRuntime } from "../lib/workspaceRuntime";

type PullOnlyOptions = {
  full?: boolean;
  reason?: string;
  sinceClock?: number;
  sinceTrashEventClock?: number;
};

type SyncWorkspaceOptions = {
  silent?: boolean;
  skipRelativePath?: string;
  bindingOverride?: VaultBinding;
  propagateError?: boolean;
};

const cloudEnabledSettings: VaultSettings = {
  cloudSyncEnabled: true,
  syncPromptDismissedAt: null,
  syncDisabledPermanently: false,
};

const MOBILE_OAUTH_EXPIRY_MS = 10 * 60 * 1000;
// AccountDialog and App both consume this hook. Keep the native device flow a
// process-wide singleton so either surface can cancel the one active poller.
let activeDevicePollingStop: (() => void) | null = null;

export function useCloudSync({ recoverMobileOAuth = false }: { recoverMobileOAuth?: boolean } = {}) {
  const dispatch = useAppDispatch();
  const state = useAppState();
  const capabilities = useRuntimeCapabilities();
  const pollTimerRef = useRef<number | null>(null);
  const oauthReturnCleanupRef = useRef<(() => void) | null>(null);
  const pendingOAuthRef = useRef<MobilePendingOAuth | null>(null);
  const oauthRecoveryAttemptedRef = useRef(false);

  const getServiceUrl = useCallback(() => {
    return (state.serviceUrl || state.cloudProfile?.serverUrl || "http://localhost:13345").trim().replace(/\/$/, "");
  }, [state.serviceUrl, state.cloudProfile?.serverUrl]);

  const stopDevicePolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    oauthReturnCleanupRef.current?.();
    oauthReturnCleanupRef.current = null;
  }, []);

  const clearPendingOAuth = useCallback(async () => {
    pendingOAuthRef.current = null;
    if (capabilities.isMobile && tauri.isAvailable) {
      await tauri.clearMobilePendingOAuth();
    }
  }, [capabilities.isMobile]);

  const startDevicePolling = useCallback((pending: MobilePendingOAuth, recovered = false) => {
    activeDevicePollingStop?.();
    stopDevicePolling();
    pendingOAuthRef.current = pending;
    dispatch({
      type: "SET_OAUTH",
      deviceCode: pending.deviceCode,
      userCode: pending.userCode,
      startedAt: pending.startedAt,
    });
    dispatch({
      type: "SET_STATUS",
      message: recovered
        ? `Resumed browser authorization. Use code ${pending.userCode}.`
        : `Browser authorization opened. Use code ${pending.userCode}.`,
    });

    let pollInFlight = false;
    let finished = false;
    const finishPolling = () => {
      finished = true;
      stopDevicePolling();
      if (activeDevicePollingStop === finishPolling) activeDevicePollingStop = null;
    };
    activeDevicePollingStop = finishPolling;
    const pollDeviceCode = async () => {
      if (pollInFlight || finished) return;
      if (Date.now() - pending.startedAt >= MOBILE_OAUTH_EXPIRY_MS) {
        finishPolling();
        await clearPendingOAuth().catch(() => undefined);
        dispatch({ type: "CLEAR_OAUTH" });
        dispatch({ type: "SET_STATUS", message: "Browser authorization expired. Start again to connect." });
        return;
      }

      pollInFlight = true;
      try {
        const pollResponse = await httpRequest(`${pending.serviceUrl}/api/oauth/device/poll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceCode: pending.deviceCode }),
        });
        // Cancel/start-again may have won while the request was in flight.
        // Never let that stale response reconnect the account.
        if (finished) return;
        if (pollResponse.ok) {
          let auth: AuthResponse;
          let profile: CloudProfile;
          try {
            auth = (await pollResponse.json()) as AuthResponse;
            profile = {
              serverUrl: pending.serviceUrl,
              username: auth.username,
              siteUrl: auth.siteUrl,
              token: auth.token,
              deviceId: pending.deviceId,
            };
            // Persist the credential before exposing a connected session. A
            // Keychain/Keystore failure must not leave an in-memory login that
            // silently disappears on the next cold launch.
            if (tauri.isAvailable) await tauri.saveCloudProfile(profile);
          } catch (error) {
            finishPolling();
            await clearPendingOAuth().catch(() => undefined);
            dispatch({ type: "CLEAR_OAUTH" });
            dispatch({
              type: "SET_STATUS",
              message: `Authorization completed, but the session could not be stored: ${String(error)}`,
            });
            return;
          }
          if (finished) return;
          finishPolling();
          dispatch({ type: "SET_SYNC_SESSION", token: auth.token, username: auth.username, siteUrl: auth.siteUrl, profile });
          await clearPendingOAuth().catch(() => undefined);
          dispatch({ type: "SET_STATUS", message: `Connected as ${auth.username}.` });
          try {
            const wsResp = await httpRequest(`${pending.serviceUrl}/api/v1/workspaces`, {
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
        if (pollResponse.status >= 500) {
          dispatch({ type: "SET_STATUS", message: "Authorization check will retry when the service is available." });
          return;
        }
        finishPolling();
        await clearPendingOAuth().catch(() => undefined);
        dispatch({ type: "CLEAR_OAUTH" });
        dispatch({ type: "SET_STATUS", message: `Authorization failed: ${errText}` });
      } catch {
        // Network loss is recoverable while the device code remains valid. The
        // encrypted pending record lets a process restart continue the flow.
        dispatch({ type: "SET_STATUS", message: "Authorization check is offline and will retry." });
      } finally {
        pollInFlight = false;
      }
    };

    if (capabilities.isMobile) {
      oauthReturnCleanupRef.current = registerMobileOAuthReturnHandler(() => {
        void pollDeviceCode();
      });
    }
    pollTimerRef.current = window.setInterval(() => void pollDeviceCode(), 1000);
    void pollDeviceCode();
  }, [capabilities.isMobile, clearPendingOAuth, dispatch, stopDevicePolling]);

  const startBrowserOAuth = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const serviceUrl = getServiceUrl();
      const deviceId = state.cloudProfile?.deviceId ?? capabilities.clientType;
      const response = await httpRequest(`${serviceUrl}/api/oauth/device/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          ...(capabilities.isMobile ? { returnUrl: MOBILE_OAUTH_CALLBACK_URL } : {}),
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const start = (await response.json()) as OAuthDeviceStartResponse;
      const pending: MobilePendingOAuth = {
        ...start,
        serviceUrl,
        deviceId,
        startedAt: Date.now(),
      };
      if (capabilities.isMobile && tauri.isAvailable) {
        // Persist before leaving JType for the browser. A killed process can
        // then restore the code and resume polling after the deep-link return.
        await tauri.saveMobilePendingOAuth(pending);
      }
      startDevicePolling(pending);
      if (tauri.isAvailable) await openUrl(start.verificationUrl);
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [capabilities.clientType, capabilities.isMobile, dispatch, getServiceUrl, startDevicePolling, state.cloudProfile?.deviceId]);

  useEffect(() => {
    // Wait for the native cloud profile load so a recovered authorization can
    // not be overwritten by the startup profile dispatch racing it.
    if (!recoverMobileOAuth || !capabilities.isMobile || !tauri.isAvailable || !state.cloudProfile || oauthRecoveryAttemptedRef.current) return;
    oauthRecoveryAttemptedRef.current = true;
    void tauri.loadMobilePendingOAuth()
      .then(async (pending) => {
        if (!pending) return;
        if (Date.now() - pending.startedAt >= MOBILE_OAUTH_EXPIRY_MS) {
          await clearPendingOAuth().catch(() => undefined);
          dispatch({ type: "CLEAR_OAUTH" });
          dispatch({ type: "SET_STATUS", message: "Previous browser authorization expired." });
          return;
        }
        startDevicePolling(pending, true);
      })
      .catch((error) => {
        dispatch({ type: "SET_STATUS", message: `Unable to restore browser authorization: ${String(error)}` });
      });
  }, [capabilities.isMobile, clearPendingOAuth, dispatch, recoverMobileOAuth, startDevicePolling, state.cloudProfile]);

  // Cancel an in-progress browser authorization: stop polling and clear OAuth state.
  const cancelBrowserOAuth = useCallback(async () => {
    activeDevicePollingStop?.();
    activeDevicePollingStop = null;
    stopDevicePolling();
    dispatch({ type: "CLEAR_OAUTH" });
    dispatch({ type: "SET_STATUS", message: "Browser authorization canceled." });
    // Update the dialog immediately; secure-store deletion can finish without
    // making the user wait on native Keychain/Keystore I/O.
    await clearPendingOAuth().catch(() => undefined);
  }, [clearPendingOAuth, dispatch, stopDevicePolling]);

  // Reopen the browser at the device authorization page using the current user code.
  // The code is unchanged; this just re-opens the same verification URL.
  const reopenBrowser = useCallback(async () => {
    if (!state.oauthUserCode) return;
    let pendingUrl = pendingOAuthRef.current?.verificationUrl;
    if (!pendingUrl && capabilities.isMobile && tauri.isAvailable) {
      try {
        pendingUrl = (await tauri.loadMobilePendingOAuth())?.verificationUrl;
      } catch { /* fall back to the current service URL */ }
    }
    const url = new URL(pendingUrl ?? `${getServiceUrl()}/oauth/device`);
    if (!pendingUrl) {
      url.searchParams.set("code", state.oauthUserCode);
      if (capabilities.isMobile) url.searchParams.set("return_to", MOBILE_OAUTH_CALLBACK_URL);
    }
    if (tauri.isAvailable) {
      try { await openUrl(url.toString()); } catch { /* ignore opener errors */ }
    }
  }, [capabilities.isMobile, getServiceUrl, state.oauthUserCode]);

  const disconnectAccount = useCallback(async () => {
    activeDevicePollingStop?.();
    activeDevicePollingStop = null;
    stopDevicePolling();
    await clearPendingOAuth().catch(() => undefined);
    dispatch({ type: "DISCONNECT_ACCOUNT" });
    if (tauri.isAvailable) {
      try { await tauri.saveCloudProfile({ serverUrl: state.serviceUrl, username: "", siteUrl: "", token: "", deviceId: state.cloudProfile?.deviceId ?? "" }); } catch { /* ignore */ }
    }
    dispatch({ type: "SET_STATUS", message: "Disconnected from cloud account." });
  }, [clearPendingOAuth, dispatch, stopDevicePolling, state.serviceUrl, state.cloudProfile]);

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

  // Path-keyed binary blob sync (images, PDFs). Runs alongside document sync:
  // pulls the server manifest, downloads new/changed blobs, uploads locally
  // new/changed ones, and propagates deletions both ways. Best-effort — a
  // failure here never breaks document sync. Keyed by vault relative_path so it
  // round-trips across native devices regardless of the web's UUID asset store.
  const syncAssets = useCallback(async (binding: VaultBinding, readOnly = false) => {
    if (!state.workspace || !state.syncToken || !tauri.isAvailable) return;
    const rootPath = state.workspace.rootPath;
    const serviceUrl = getServiceUrl();
    const wsId = binding.workspaceId;
    const authHeaders: Record<string, string> = {
      Authorization: `Bearer ${state.syncToken}`,
      "x-client-type": capabilities.clientType,
    };
    const encodePath = (rel: string) => rel.split("/").map(encodeURIComponent).join("/");
    let changedLocally = false;
    try {
      // 1. Local assets + content hashes.
      const localPaths = await tauri.collectAssetPaths(rootPath);
      const localSha = new Map<string, string>();
      const localBytes = new Map<string, Uint8Array>();
      for (const rel of localPaths) {
        try {
          const bytes = Uint8Array.from(await tauri.readBinaryFile(`${rootPath}/${rel}`));
          localBytes.set(rel, bytes);
          localSha.set(rel, await sha256HexBytes(bytes));
        } catch { /* unreadable — skip */ }
      }

      // 2. Saved sync state (last-synced sha per path + clock).
      const saved = await tauri.loadAssetSyncState(rootPath);
      const bases: Record<string, string> = { ...saved.bases };
      let maxClock = saved.clock;

      // 3. Server manifest since last clock.
      const manifestRes = await httpRequest(`${serviceUrl}/api/v1/workspaces/${wsId}/blobs?sinceClock=${saved.clock}`, { headers: authHeaders });
      if (!manifestRes.ok) return; // older server without blob support — skip silently
      const manifest = (await manifestRes.json()) as BlobManifestEntry[];

      // 4. Server → local: downloads + remote deletions.
      for (const entry of manifest) {
        maxClock = Math.max(maxClock, entry.updatedClock);
        const rel = entry.relativePath;
        if (entry.deletedClock != null) {
          if (localSha.has(rel)) {
            markCloudWrite(`${rootPath}/${rel}`, "DELETED_BY_CLOUD_PULL");
            try { await tauri.trashEntry(rootPath, rel); changedLocally = true; } catch { /* gone already */ }
            localSha.delete(rel);
            localBytes.delete(rel);
          }
          delete bases[rel];
          continue;
        }
        if (localSha.get(rel) === entry.sha256) { bases[rel] = entry.sha256; continue; }
        const localChanged = localSha.has(rel) && localSha.get(rel) !== bases[rel];
        // Download when we lack it or hold an unmodified older copy. If the local
        // copy diverged from base AND differs from the server, leave it for the
        // upload step (last-writer-wins) rather than clobber local edits.
        if (!localSha.has(rel) || !localChanged) {
          try {
            const res = await httpRequest(`${serviceUrl}/api/v1/workspaces/${wsId}/blobs/${encodePath(rel)}`, { headers: authHeaders });
            if (res.ok) {
              const buf = new Uint8Array(await res.arrayBuffer());
              const full = `${rootPath}/${rel}`;
              await tauri.createEntry(rootPath, rel, "asset").catch(() => { /* exists — keep, just ensure dirs */ });
              markCloudWrite(full, entry.sha256);
              await tauri.writeBinaryFile(full, Array.from(buf));
              bases[rel] = entry.sha256;
              localSha.set(rel, entry.sha256);
              changedLocally = true;
            }
          } catch { /* skip this asset */ }
        }
      }

      if (!readOnly) {
        // 5. Local → server: uploads of new/changed.
        for (const rel of localPaths) {
          const sha = localSha.get(rel);
          if (!sha || bases[rel] === sha) continue;
          try {
            const res = await httpRequest(`${serviceUrl}/api/v1/workspaces/${wsId}/blobs/${encodePath(rel)}`, {
              method: "POST",
              headers: authHeaders,
              body: localBytes.get(rel)!,
            });
            if (res.ok) {
              const data = (await res.json()) as { updatedClock?: number };
              if (typeof data.updatedClock === "number") maxClock = Math.max(maxClock, data.updatedClock);
              bases[rel] = sha;
            }
          } catch { /* skip this asset */ }
        }
        // 6. Local deletions: paths we previously synced that are now gone.
        for (const rel of Object.keys(bases)) {
          if (localSha.has(rel)) continue;
          try {
            const res = await httpRequest(`${serviceUrl}/api/v1/workspaces/${wsId}/blobs/${encodePath(rel)}`, { method: "DELETE", headers: authHeaders });
            if (res.ok || res.status === 404) delete bases[rel];
          } catch { /* retry next sync */ }
        }
      }

      await tauri.saveAssetSyncState(rootPath, { clock: maxClock, bases });
      if (changedLocally) {
        try {
          const workspace = await openWorkspaceForRuntime(
            rootPath,
            capabilities.usesPartialWorkspace === true,
          );
          dispatch({ type: "UPDATE_WORKSPACE", workspace });
        } catch { /* non-critical */ }
      }
    } catch { /* asset sync is best-effort; never break document sync */ }
  }, [capabilities.clientType, capabilities.usesPartialWorkspace, dispatch, state.workspace, state.syncToken, getServiceUrl]);

  const runSyncWorkspaceToWeb = useCallback(async (options: SyncWorkspaceOptions = {}): Promise<SyncPushDocument | undefined> => {
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
          await syncAssets(binding, true);
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
        let trashOperations: PendingTrashOp[] = [];
        if (tauri.isAvailable) {
          try { syncBases = await tauri.loadSyncBases(state.workspace.rootPath); } catch { /* first sync */ }
          try { syncFolderBases = await tauri.loadSyncFolderBases(state.workspace.rootPath); } catch { /* first sync */ }
          try {
            const trashMetadata = await tauri.loadTrashMetadata(state.workspace.rootPath);
            trashOperations = [...trashMetadata.pendingTrashOps];
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

        const syncId = Math.random().toString(36).slice(2, 7);
        console.log(`[sync:${syncId}] ▶ START`, {
          skip: options.skipRelativePath,
          localDocs: documents.map((d) => d.relativePath),
          syncBaseKeys: Object.keys(syncBases),
          locallyDeletedPaths: [...locallyDeletedPaths],
        });

        // 3. Pull cloud changes and apply to disk (only overwrites files not locally modified)
        const pullResult = await pullCloudWorkspace(binding, options.skipRelativePath, syncBases, locallyDeletedPaths, { syncId });
        const remoteDeletedPaths = new Set(pullResult.deletedPaths);
        const remoteDeletedFolders = new Set(pullResult.deletedFolders);
        // Use receivedDocumentPaths (all docs the server returned) to protect against
        // incorrectly sending a deletion for a file the server actively has.
        // This prevents the bug where a locally-deleted file that was re-created on
        // the server gets re-deleted by the push.
        const serverActiveDocumentPaths = new Set(pullResult.receivedDocumentPaths);
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
          .filter((relativePath) => !serverActiveDocumentPaths.has(relativePath))
          .filter((relativePath) => !options.skipRelativePath || relativePath !== options.skipRelativePath)
          .map((relativePath) => ({ relativePath }));

        console.log(`[sync:${syncId}] ▶ PUSH INPUT`, {
          documentsForPush: documentsForPush.map((d) => d.relativePath),
          deletedPathsToSend: deletedPaths.map((d) => d.relativePath),
          serverActiveDocs: [...serverActiveDocumentPaths],
          remoteDeletedPaths: [...remoteDeletedPaths],
        });

        const deviceId = state.cloudProfile?.deviceId ?? capabilities.clientType;
        const pushUrl = `${getServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/sync/push`;
        const pushHeaders = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.syncToken}`,
          "x-client-type": capabilities.clientType,
          ...(state.wsSessionId ? { "x-session-id": state.wsSessionId } : {}),
          ...(state.cloudProfile?.deviceId ? { "x-device-id": state.cloudProfile.deviceId } : {}),
        };
        const pushBatches = createSyncPushBatches({
          deviceId,
          folders: foldersForPush,
          documents: pushDocs,
          deletedPaths,
          deletedFolders: locallyDeletedFolders.map((relativePath) => ({ relativePath })),
          trashOperations,
        }, createSyncRunId());
        const pushData: SyncPushResponse = {
          workspaceId: binding.workspaceId,
          accepted: 0,
          folders: [],
          documents: [],
          deletedPaths: [],
          conflicts: [],
        };
        for (const [batchIndex, batch] of pushBatches.entries()) {
          const batchLabel = `${batchIndex + 1}/${pushBatches.length}`;
          if (pushBatches.length > 1) {
            dispatch({ type: "SET_STATUS", message: `Syncing batch ${batchLabel}…` });
          }
          let push: Response;
          try {
            push = await requestWithSyncRetry(
              () => postSyncPush(pushUrl, pushHeaders, batch),
              {
                onRetry: ({ attempt, maxAttempts, status }) => {
                  const cause = status ? `HTTP ${status}` : "network unavailable";
                  dispatch({
                    type: "SET_STATUS",
                    message: `Sync interrupted (${cause}). Retrying batch ${batchLabel}, attempt ${attempt}/${maxAttempts}…`,
                  });
                },
              },
            );
          } catch (error) {
            throw new Error(`Sync batch ${batchLabel} failed after 3 attempts: ${String(error)}`);
          }
          if (push.status === 403 || push.status === 404) {
            await handleWorkspaceAccessLoss(binding, push.status);
            dispatch({ type: "SET_SYNC_STATUS", status: "idle" });
            if (options.propagateError) {
              throw new Error(`Cloud workspace sync failed (${push.status}).`);
            }
            return;
          }
          if (!push.ok) {
            throw new Error(`Sync batch ${batchLabel} failed after 3 attempts (HTTP ${push.status}): ${await push.text()}`);
          }
          const batchData = (await push.json()) as SyncPushResponse;
          pushData.accepted += batchData.accepted;
          pushData.folders = batchData.folders ?? pushData.folders;
          pushData.documents.push(...batchData.documents);
          pushData.deletedPaths?.push(...(batchData.deletedPaths ?? []));
          const knownConflictIds = new Set(pushData.conflicts.map((conflict) => conflict.conflictId));
          pushData.conflicts.push(...batchData.conflicts.filter((conflict) => !knownConflictIds.has(conflict.conflictId)));
        }
        console.log(`[sync:${syncId}] ▶ PUSH RESPONSE`, {
          batches: pushBatches.length,
          accepted: pushData.accepted,
          documents: pushData.documents.map((d) => `${d.relativePath}:${d.mergeStatus}`),
          serverDeletedPaths: pushData.deletedPaths?.map((d) => d.relativePath) ?? [],
        });
        dispatch({ type: "SET_CONFLICTS", conflicts: parseSyncConflicts(pushData.conflicts ?? []) });
        const snapshot = `${Date.now()}:${documents.map((d) => `${d.relativePath}:${d.content.length}`).join("|")}`;
        dispatch({ type: "SET_SYNC_SNAPSHOT", snapshot });
        // Only apply documents that were merged by the server (not unchanged echoes)
        // to avoid unnecessary disk writes and file watcher churn.
        const mergedPushDocs = pushData.documents.filter((d) => d.mergeStatus !== "unchanged");
        const appliedDocs = await applyCloudDocumentsRef.current(mergedPushDocs, pushData.folders ?? [], options.skipRelativePath);
        if (tauri.isAvailable && deletedPaths.length > 0) {
          try {
            await tauri.deleteSyncBases(state.workspace.rootPath, deletedPaths.map((d) => d.relativePath));
          } catch { /* non-critical */ }
        }

        // 5. Save sync bases for next sync (the server's merged content is the new base).
        // Skip any *changed* doc we didn't actually write to disk (the dirty
        // open file): advancing its base would silently drop the remote edit.
        // Unchanged docs (disk already matches server) and the skipRelativePath
        // doc (caller updates the editor) keep their base.
        const appliedPaths = new Set(appliedDocs.map((d) => d.relativePath));
        const basesToSave = pushData.documents.filter((d) =>
          d.mergeStatus === "unchanged" ||
          appliedPaths.has(d.relativePath) ||
          d.relativePath === options.skipRelativePath
        );
        if (tauri.isAvailable && basesToSave.length > 0) {
          try {
            await tauri.saveSyncBases(
              state.workspace.rootPath,
              basesToSave.map((d) => ({ relativePath: d.relativePath, content: d.content }))
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

        // Binary assets (images/PDFs) sync on their own path-keyed channel.
        await syncAssets(binding);

        const deleteCount = pushData.deletedPaths?.length ?? 0;
        const deletionText = deleteCount > 0 ? ` ${deleteCount} moved to cloud trash.` : "";
        const batchingText = pushBatches.length > 1 ? ` in ${pushBatches.length} batches` : "";
        dispatch({ type: "SET_STATUS", message: `Synced ${pushData.accepted} change(s)${batchingText} with cloud workspace ${binding.workspaceName}.${deletionText}` });
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
      if (options.propagateError) throw error;
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [capabilities.clientType, dispatch, state.workspace, state.syncToken, state.syncUsername, state.cloudProfile, state.vaultBindings, state.vaultSettings, getServiceUrl, refreshCloudWorkspaces, handleWorkspaceAccessLoss, syncAssets]);

  // Serialize every sync run through one promise chain. Without this, the
  // periodic timer, file-watcher events, websocket pulls, and manual syncs can
  // overlap — collecting stale local docs and clobbering each other's
  // sync-base/conflict writes. Each caller still gets its own return value;
  // bursty callers are additionally debounced upstream (App.tsx).
  const syncChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const syncWorkspaceToWeb = useCallback((options: SyncWorkspaceOptions = {}): Promise<SyncPushDocument | undefined> => {
    const run = syncChainRef.current.catch(() => {}).then(() => runSyncWorkspaceToWeb(options));
    syncChainRef.current = run;
    return run;
  }, [runSyncWorkspaceToWeb]);

  // Ref ensures pullCloudWorkspace/syncWorkspaceToWeb always call the latest
  // applyCloudDocuments without needing it as a dependency (which would cause
  // cascading recreation of every callback that touches it).
  // Returns the documents actually written to disk (after the dirty/skip
  // filter) so callers only advance the sync-base for files they truly applied.
  const applyCloudDocumentsRef = useRef<(documents: CloudDocument[], folders?: CloudFolder[], skipRelativePath?: string) => Promise<CloudDocument[]>>(async () => []);

  const pullCloudWorkspace = useCallback(async (
    binding: VaultBinding,
    skipRelativePath?: string,
    syncBases?: Record<string, string>,
    locallyDeletedPaths: Set<string> = new Set(),
    options: { sinceClock?: number; sinceTrashEventClock?: number; reason?: string; syncId?: string } = {},
  ): Promise<{ deletedPaths: string[]; deletedFolders: string[]; documentPaths: string[]; receivedDocumentPaths: string[] }> => {
    if (!state.workspace || !state.syncToken) {
      return { deletedPaths: [], deletedFolders: [], documentPaths: [], receivedDocumentPaths: [] };
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
      syncId: options.syncId,
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
    let response: Response;
    try {
      response = await requestWithSyncRetry(
        () => httpRequest(`${getServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/sync/pull`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${state.syncToken}`,
            "x-client-type": capabilities.clientType,
          },
          body: JSON.stringify({
            sinceClock,
            deviceId: state.cloudProfile?.deviceId ?? capabilities.clientType,
            sinceTrashEventClock: trashClock,
          }),
        }),
        {
          onRetry: ({ attempt, maxAttempts, status }) => {
            const cause = status ? `HTTP ${status}` : "network unavailable";
            dispatch({
              type: "SET_STATUS",
              message: `Cloud update interrupted (${cause}). Retrying attempt ${attempt}/${maxAttempts}…`,
            });
          },
        },
      );
    } catch (error) {
      throw new Error(`Cloud update failed after 3 attempts: ${String(error)}`);
    }
    if (response.status === 403 || response.status === 404) {
      await handleWorkspaceAccessLoss(binding, response.status);
      return { deletedPaths: [], deletedFolders: [], documentPaths: [], receivedDocumentPaths: [] };
    }
    if (!response.ok) {
      throw new Error(`Cloud update failed after 3 attempts (HTTP ${response.status}): ${await response.text()}`);
    }
    const pullData = (await response.json()) as {
      folders?: CloudFolder[];
      deletedFolders?: DeletedFolder[];
      documents: CloudDocument[];
      deletedPaths?: DeletedPath[];
      conflicts: Array<Record<string, unknown>>;
      trash?: TrashSyncPayload;
    };
    const pulledDocPaths = new Set(pullData.documents.map((d) => d.relativePath));
    const deletedInPull = (pullData.deletedPaths ?? []).map((d) => d.relativePath);
    // Hypothesis A detector: same path in BOTH documents and deletedPaths (zombie conflict)
    const zombiePaths = deletedInPull.filter((p) => pulledDocPaths.has(p));
    console.log("[cloud:pull] response", {
      syncId: options.syncId,
      documentsCount: pullData.documents.length,
      documents: pullData.documents.map((d) => `${d.relativePath}@clock=${d.updatedClock ?? "?"}`),
      deletedPathsCount: deletedInPull.length,
      deletedPaths: deletedInPull,
      zombiePaths,  // HYPOTHESIS A: non-empty = path is both alive on server AND in trash
      foldersCount: pullData.folders?.length ?? 0,
      deletedFoldersCount: pullData.deletedFolders?.length ?? 0,
    });
    dispatch({ type: "SET_CONFLICTS", conflicts: parseSyncConflicts(pullData.conflicts ?? []) });

    // During pull, only apply cloud documents for files that haven't been locally modified.
    // A file is "locally modified" if its current content differs from the sync base.
    // Locally modified files are skipped here; the push step will handle merge via the server.
    // Note: we do NOT filter by locallyDeletedPaths here. If the server returns a document
    // in the pull, it means its clock advanced since our last sync (someone modified or
    // re-created it). We should apply it to respect the newer server state.
    let pullDocsToApply = [...pullData.documents];
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
      syncId: options.syncId,
      receivedDocumentPaths: pullData.documents.map((d) => d.relativePath),
      applyDocumentPaths: pullDocsToApply.map((d) => d.relativePath),
      folderPaths: (pullData.folders ?? []).map((f) => f.relativePath),
      skipRelativePath,
    });
    // Only the docs actually written to disk (dirty/skip files are filtered out
    // inside applyCloudDocuments). Advancing the sync-base for a file we did NOT
    // write would poison the 3-way merge and silently drop the remote edit on
    // the user's next save.
    const appliedDocs = await applyCloudDocumentsRef.current(pullDocsToApply, pullData.folders ?? [], skipRelativePath);
    if (tauri.isAvailable && appliedDocs.length > 0) {
      try {
        await tauri.saveSyncBases(
          state.workspace.rootPath,
          appliedDocs.map((d) => ({ relativePath: d.relativePath, content: d.content }))
        );
      } catch { /* non-critical */ }
      // Remove restored documents from local trash so they don't re-appear in the trash list
      try {
        const localTrashItems = await tauri.listTrash(state.workspace.rootPath);
        for (const doc of appliedDocs) {
          const localItem = localTrashItems.find((item) => item.relativePath === doc.relativePath);
          if (localItem) {
            await tauri.permanentDeleteTrash(state.workspace.rootPath, localItem.trashId);
          }
        }
      } catch { /* non-critical */ }
    }
    if (pullData.deletedPaths && pullData.deletedPaths.length > 0 && tauri.isAvailable) {
      // Collect local file list to check which paths actually exist before trashing
      const localDocsNow = await tauri.collectSyncDocuments(state.workspace.rootPath);
      const localPathsNow = new Set(localDocsNow.map((d) => d.relativePath));
      console.log("[cloud:pull] processing deletedPaths:", pullData.deletedPaths.map((d) => ({
        relativePath: d.relativePath,
        deletedClock: d.deletedClock,
        existsLocally: localPathsNow.has(d.relativePath),
        inSyncBases: syncBases ? (d.relativePath in syncBases) : "n/a",
      })));
      for (const dp of pullData.deletedPaths) {
        try {
          const fullPath = `${state.workspace.rootPath}/${dp.relativePath}`;
          markCloudWrite(fullPath, "DELETED_BY_CLOUD_PULL");
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
      const workspace = await openWorkspaceForRuntime(
        state.workspace.rootPath,
        capabilities.usesPartialWorkspace === true,
      );
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      console.log("[cloud:pull] workspace updated after deletions");
    }
    if (pullData.deletedFolders && pullData.deletedFolders.length > 0 && tauri.isAvailable) {
      await tauri.applyDeletedCloudFolders(
        state.workspace.rootPath,
        pullData.deletedFolders.map((f) => ({ relativePath: f.relativePath }))
      );
      const workspace = await openWorkspaceForRuntime(
        state.workspace.rootPath,
        capabilities.usesPartialWorkspace === true,
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
            .filter((op): op is Extract<PendingTrashOp, { trashId: string }> => op.type !== "empty_trash")
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
            const workspace = await openWorkspaceForRuntime(
              state.workspace.rootPath,
              capabilities.usesPartialWorkspace === true,
            );
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
      // All documents the server returned in this pull response.
      // Used to prevent push from re-deleting files that the server actively has.
      receivedDocumentPaths: pullData.documents.map((d) => d.relativePath),
    };
  }, [capabilities.clientType, capabilities.usesPartialWorkspace, dispatch, state.workspace, state.syncToken, state.cloudProfile, getServiceUrl, handleWorkspaceAccessLoss]);

  const applyCloudDocuments = useCallback(async (documents: CloudDocument[], folders: CloudFolder[] = [], skipRelativePath?: string): Promise<CloudDocument[]> => {
    if (!state.workspace || (documents.length === 0 && folders.length === 0)) {
      return [];
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
      return [];
    }
    console.log("[cloud:apply] writing", {
      vaultPath: state.workspace.rootPath,
      documentPaths: filtered.map((d) => d.relativePath),
      folderPaths: folders.map((f) => f.relativePath),
      skipRelativePath,
      isDirty: state.isDirty,
      currentRelativePath: state.currentRelativePath,
    });
    const hashEntries = await Promise.all(
      filtered.map(async (d) => ({
        fullPath: `${state.workspace!.rootPath}/${d.relativePath}`,
        contentHash: await sha256Hex(d.content),
      }))
    );
    markCloudWriteBatch(hashEntries);
    const { writtenPaths } = await tauri.applyCloudDocuments(
      state.workspace.rootPath,
      filtered.map((d) => ({ relativePath: d.relativePath, content: d.content })),
      folders.map((f) => ({ relativePath: f.relativePath }))
    );
    const workspace = await openWorkspaceForRuntime(
      state.workspace.rootPath,
      capabilities.usesPartialWorkspace === true,
    );
    dispatch({ type: "UPDATE_WORKSPACE", workspace });
    // Only the docs the Rust side actually wrote to disk. Returning `filtered`
    // here would let the caller record a sync-base for a file the apply gate
    // skipped — poisoning the 3-way merge so that file is treated as "locally
    // modified" and dropped on every future pull (the .board download bug).
    const writtenSet = new Set(writtenPaths);
    const applied = filtered.filter((d) => writtenSet.has(d.relativePath));
    if (applied.length !== filtered.length) {
      console.warn("[cloud:apply] some pulled docs were not written to disk", {
        requested: filtered.map((d) => d.relativePath),
        written: writtenPaths,
      });
    }
    console.log("[cloud:apply] workspace updated", {
      documentPaths: applied.map((d) => d.relativePath),
    });
    const currentDoc = !state.isDirty && state.currentRelativePath
      ? applied.find((d) => d.relativePath === state.currentRelativePath)
      : undefined;
    if (currentDoc && currentDoc.content !== state.editorContent) {
      dispatch({ type: "OPEN_FILE", path: state.currentPath, relativePath: state.currentRelativePath, content: currentDoc.content, kind: state.currentKind as EntryKind });
    }
    return applied;
  }, [capabilities.usesPartialWorkspace, dispatch, state.workspace, state.isDirty, state.currentRelativePath, state.currentPath, state.currentKind, state.editorContent]);

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.syncToken}`,
          "x-client-type": capabilities.clientType,
          ...(state.wsSessionId ? { "x-session-id": state.wsSessionId } : {}),
          ...(state.cloudProfile?.deviceId ? { "x-device-id": state.cloudProfile.deviceId } : {}),
        },
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
  }, [capabilities.clientType, dispatch, state.vaultBindings, state.workspace, state.syncToken, getServiceUrl]);

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
      await syncWorkspaceToWeb({ silent: true, bindingOverride: binding, propagateError: true });
      dispatch({ type: "SET_STATUS", message: `Synced "${state.workspace.name}" to cloud workspace ${workspace.name}.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
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

  // Anti-entropy for documents. Incremental pull + best-effort WS can silently
  // miss a server document (a dropped apply, a lost event, a clock skip), and
  // nothing else ever notices. This diffs the server's full document manifest
  // (path + contentHash, metadata only) against local files and repairs drift,
  // mirroring syncAssets' proven loop for blobs. Pull-only and best-effort — a
  // failure never breaks normal sync. Returns a summary for the manual command.
  const reconcileDocuments = useCallback(async (
    binding: VaultBinding,
  ): Promise<{ inSync: number; repaired: number; localEdits: number; orphans: number } | undefined> => {
    if (!state.workspace || !state.syncToken || !tauri.isAvailable) return;
    const rootPath = state.workspace.rootPath;
    const wsId = binding.workspaceId;
    const authHeaders: Record<string, string> = {
      Authorization: `Bearer ${state.syncToken}`,
      "x-client-type": capabilities.clientType,
    };
    try {
      // 1. Server manifest (metadata only — no content transfer).
      const res = await httpRequest(`${getServiceUrl()}/api/v1/workspaces/${wsId}/manifest`, { headers: authHeaders });
      if (!res.ok) return; // older server without manifest / no access — skip silently
      const manifest = (await res.json()) as {
        documents: Array<{ relativePath: string; contentHash: string; updatedClock: number }>;
      };

      // Only documents the native app can actually materialize (md/board/diagram).
      // Non-syncable rows — e.g. a stray binary `.pdf` that an old bug stored as a
      // document instead of a blob — are server-side garbage: the apply gate
      // correctly refuses to write them, so "repairing" them would loop forever.
      // Skip them here and report the count so they can be cleaned up.
      const manifestDocs = manifest.documents.filter((m) => syncsAsDocument(m.relativePath));
      const orphans = manifest.documents.length - manifestDocs.length;

      // 2. Local document hashes + sync-bases.
      const localDocs = await tauri.collectSyncDocuments(rootPath);
      const localHash = new Map<string, string>();
      for (const d of localDocs) localHash.set(d.relativePath, await sha256Hex(d.content));
      const bases = await tauri.loadSyncBases(rootPath).catch(() => ({} as Record<string, string>));

      // 3. Classify each server doc. Repair = missing locally OR present-but-stale
      // (local matches its last-synced base, server moved on). A genuine local
      // edit (local diverged from base) is left for the push/merge path.
      const repair: Array<{ relativePath: string; updatedClock: number }> = [];
      let inSync = 0;
      let localEdits = 0;
      for (const m of manifestDocs) {
        const lh = localHash.get(m.relativePath);
        if (lh === m.contentHash) { inSync++; continue; }
        if (lh != null) {
          const base = bases[m.relativePath];
          const baseHash = base != null ? await sha256Hex(base) : undefined;
          if (lh !== baseHash) { localEdits++; continue; } // local edit → push owns it
        }
        repair.push({ relativePath: m.relativePath, updatedClock: m.updatedClock });
      }
      if (repair.length === 0) return { inSync, repaired: 0, localEdits, orphans };

      // 4. Repair: clear the stale/poisoned bases for the drifted paths so the
      // dirty-filter treats them as fresh-from-cloud, then re-pull from just below
      // the lowest drifted clock. Bases for OTHER (locally-edited) docs are kept,
      // so the same pull cannot clobber genuine local edits. applyCloudDocuments
      // (gate-fixed) writes the files and records correct bases off writtenPaths.
      const repairPaths = repair.map((r) => r.relativePath);
      await tauri.deleteSyncBases(rootPath, repairPaths).catch(() => undefined);
      const basesForPull: Record<string, string> = { ...bases };
      for (const p of repairPaths) delete basesForPull[p];
      const minClock = Math.min(...repair.map((r) => r.updatedClock));
      await pullCloudWorkspace(binding, undefined, basesForPull, new Set(), {
        sinceClock: Math.max(0, minClock - 1),
        sinceTrashEventClock: Math.max(0, minClock - 1),
        reason: "reconcile-repair",
      });
      console.warn("[reconcile] repaired drifted documents", { count: repair.length, paths: repairPaths });
      return { inSync, repaired: repair.length, localEdits, orphans };
    } catch (error) {
      console.error("[reconcile] failed (non-critical):", error);
      return undefined;
    }
  }, [capabilities.clientType, state.workspace, state.syncToken, getServiceUrl, pullCloudWorkspace]);

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
    // Every pull path must protect local edits, including the incremental pull
    // fired when a WebSocket reconnects before mobile lifecycle recovery. If
    // bases are only loaded for a manually requested full pull, an old cloud
    // echo can overwrite a document that was saved locally while offline.
    let syncBases: Record<string, string> | undefined;
    if (tauri.isAvailable) {
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
    // Download any new/changed binary assets referenced by the pulled docs.
    await syncAssets(binding, true);
    console.log("[pullOnly] pull completed");
  }, [state.workspace, state.syncToken, state.vaultBindings, state.vaultSettings, pullCloudWorkspace, syncAssets]);

  return {
    getServiceUrl,
    startBrowserOAuth,
    cancelBrowserOAuth,
    reopenBrowser,
    disconnectAccount,
    refreshCloudWorkspaces,
    syncWorkspaceToWeb,
    pullOnly,
    reconcileDocuments,
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
