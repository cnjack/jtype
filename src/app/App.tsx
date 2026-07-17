import React, { useReducer, useCallback, useEffect, useRef, useState, createContext, useContext } from "react";
import { appReducer, initialState, AppStateContext, AppDispatchContext } from "./AppState";
import { useFileSystem, useCloudSync, useKeyboardShortcuts, useCommands, useDraftCloseGuard, useAppLifecycle } from "../hooks";
import { usePeriodicSync } from "../hooks/usePeriodicSync";
import { useCloudEvents } from "../hooks/useCloudEvents";
import { useFileWatcher } from "../hooks/useFileWatcher";
import type { CommandDef } from "../hooks/useCommands";
import { Header } from "../components/layout/Header";
import { UpdateBanner } from "../components/layout/UpdateBanner";
import { WelcomeScreen } from "../components/layout/WelcomeScreen";
import { VaultHome } from "../components/layout/VaultHome";
import { Sidebar } from "../components/sidebar/Sidebar";
import { MobileSidebarDialog } from "../components/sidebar/MobileSidebarDialog";
import { EditorShell } from "../components/editor/EditorShell";
import { CommandPalette } from "../components/modals/CommandPalette";
import { QuickSwitcher } from "../components/modals/QuickSwitcher";
import { NewResourceDialog } from "../components/modals/NewResourceDialog";
import { AccountDialog } from "../components/modals/AccountDialog";
import { ConflictDialog } from "../components/modals/ConflictDialog";
import { ExclamationTriangleIcon, SignalSlashIcon } from "@heroicons/react/24/outline";
import { PromptDialogProvider } from "@shared/components/PromptDialogContext";
import { AppVersion } from "@shared/components";
import { isTauriRuntime, relativePathFromWorkspace } from "../lib/utils";
import { isDiagramTextPath } from "@shared/lib/fileTypes";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { RuntimeCapabilitiesProvider, useRuntimeCapabilities } from "./RuntimeCapabilities";

const CommandsContext = createContext<CommandDef[]>([]);

export function useCommandsList() {
  return useContext(CommandsContext);
}

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <RuntimeCapabilitiesProvider>
      <AppStateContext.Provider value={state}>
        <AppDispatchContext.Provider value={dispatch}>
          <PromptDialogProvider>
            <AppContent />
          </PromptDialogProvider>
        </AppDispatchContext.Provider>
      </AppStateContext.Provider>
    </RuntimeCapabilitiesProvider>
  );
}

/** Thin drag strip on the sidebar's right edge — drag to resize its width.
 * Invisible until hovered; updates the width live and clamps to 200–480px. */
function SidebarResizeHandle({ width, onResize }: { width: number; onResize: (w: number) => void }) {
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const move = (ev: MouseEvent) => onResize(Math.min(480, Math.max(200, ev.clientX)));
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };
  return (
    <div
      className="group absolute bottom-0 top-0 z-20 w-2.5 -translate-x-1/2 cursor-col-resize"
      style={{ left: `${width}px` }}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
    >
      <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-black/10" />
    </div>
  );
}

function AppContent() {
  const { state, dispatch } = useApp();
  const capabilities = useRuntimeCapabilities();
  const sync = useCloudSync();
  const autoSync = useCallback(async () => {
    const vaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
    const binding = state.vaultBindings.find((b) => b.localVaultPath === state.workspace?.rootPath);
    if (state.workspace && state.syncToken && binding && vaultSettings?.cloudSyncEnabled !== false) {
      const merged = await sync.syncWorkspaceToWeb({ silent: true, skipRelativePath: state.currentRelativePath || undefined });
      if (merged && merged.mergeStatus === "merged" && merged.relativePath === state.currentRelativePath && !state.isDirty) {
        const { tauri } = await import("../lib/tauri");
        await tauri.writeFile(state.currentPath, merged.content);
        dispatch({ type: "OPEN_FILE", path: state.currentPath, relativePath: state.currentRelativePath, content: merged.content, kind: state.currentKind as import("../lib/types").EntryKind });
        dispatch({ type: "SET_STATUS", message: `Saved & merged with cloud changes.` });
      }
    }
  }, [state.workspace, state.syncToken, state.vaultBindings, state.vaultSettings, state.currentRelativePath, state.currentPath, state.currentKind, state.isDirty, sync, dispatch]);
  const fs = useFileSystem(autoSync);
  const openMarkdownFileRef = useRef(fs.openMarkdownFile);
  openMarkdownFileRef.current = fs.openMarkdownFile;
  const importExternalSourcesRef = useRef(fs.importExternalSources);
  importExternalSourcesRef.current = fs.importExternalSources;
  const { commands, findCommand } = useCommands(fs, sync);

  const isSyncEnabledRef = useRef(false);
  const syncWorkspaceToWebRef = useRef(sync.syncWorkspaceToWeb);
  syncWorkspaceToWebRef.current = sync.syncWorkspaceToWeb;
  const onExternalFileChange = useCallback(async (_changedPaths: string[]) => {
    if (!isSyncEnabledRef.current) return;
    sync.syncWorkspaceToWeb({ silent: true }).catch(() => {});
  }, [sync]);

  useFileWatcher(onExternalFileChange);

  // The chrome-vs-content `user-select` split (styles.css) lets a click on a
  // non-selectable control (e.g. a dropdown over the preview) bleed a stray text
  // selection into the nearest selectable region. Only allow a selection that
  // actually *starts* inside a selectable region; cancel ones that begin on
  // chrome. Keyboard selection in fields is unaffected (handled by the field).
  useEffect(() => {
    const SELECTABLE =
      "#editor, #preview, .preview, .textLayer, input, textarea, [contenteditable], [data-selectable]";
    let pressInSelectable = true;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Element | null;
      pressInSelectable = !!(target && target.closest(SELECTABLE));
    };
    const onSelectStart = (e: Event) => {
      if (pressInSelectable) return;
      const target = e.target as Element | null;
      // Always allow editable fields (covers keyboard/focus-driven selection).
      if (target && target.closest("input, textarea, [contenteditable]")) return;
      e.preventDefault();
    };
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("selectstart", onSelectStart, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("selectstart", onSelectStart, true);
    };
  }, []);

  const handleAction = useCallback((action: string) => {
    if (action === "quickSwitcher.create") {
      const input = document.querySelector<HTMLInputElement>("#quick-switcher-input");
      if (input) fs.createDocument(`${input.value || "untitled"}.md`);
      dispatch({ type: "SET_QUICK_SWITCHER", open: false });
      return;
    }
    const cmd = findCommand(action);
    if (cmd && cmd.isEnabled()) {
      cmd.run();
    }
  }, [findCommand, fs, dispatch]);

  useKeyboardShortcuts(handleAction);
  useDraftCloseGuard();

  const currentBinding = state.vaultBindings.find(
    (b) => b.localVaultPath === state.workspace?.rootPath
  );
  const currentVaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const isSyncEnabled = !!(
    state.workspace &&
    state.syncToken &&
    currentBinding &&
    currentVaultSettings?.cloudSyncEnabled !== false
  );
  isSyncEnabledRef.current = isSyncEnabled;
  const openedVaultPullKeyRef = useRef<string | null>(null);
  const currentVaultSettingsLoaded = state.workspace
    ? Object.prototype.hasOwnProperty.call(state.vaultSettings, state.workspace.rootPath)
    : false;

  useCloudEvents(sync.pullOnly);

  // Anti-entropy: after a normal pull, diff the server document manifest against
  // local files and repair any drift (also recovers files stranded by a poisoned
  // sync-base). Throttled so frequent ws reconnects don't spam the manifest.
  const lastReconcileAtRef = useRef(0);
  const maybeReconcile = useCallback(async () => {
    if (!state.workspace || !state.syncToken || !currentBinding) return;
    if (currentVaultSettings?.cloudSyncEnabled === false) return;
    const now = Date.now();
    if (now - lastReconcileAtRef.current < 60_000) return;
    lastReconcileAtRef.current = now;
    try { await sync.reconcileDocuments(currentBinding); } catch { /* best-effort */ }
  }, [state.workspace, state.syncToken, currentBinding, currentVaultSettings?.cloudSyncEnabled, sync]);
  const maybeReconcileRef = useRef(maybeReconcile);
  maybeReconcileRef.current = maybeReconcile;

  useEffect(() => {
    const rootPath = state.workspace?.rootPath;
    if (!rootPath || !state.syncToken || !currentBinding) {
      openedVaultPullKeyRef.current = null;
      return;
    }
    if (!currentVaultSettingsLoaded) return;
    if (currentVaultSettings?.cloudSyncEnabled === false) {
      openedVaultPullKeyRef.current = null;
      return;
    }

    const pullKey = `${rootPath}:${currentBinding.workspaceId}`;
    if (openedVaultPullKeyRef.current === pullKey) return;
    openedVaultPullKeyRef.current = pullKey;
    sync.pullOnly({ full: true, reason: "open-vault" })
      .then(() => maybeReconcileRef.current())
      .catch((error) => {
        dispatch({ type: "SET_STATUS", message: `Cloud update failed: ${String(error)}` });
      });
  }, [
    state.workspace?.rootPath,
    state.syncToken,
    currentBinding?.workspaceId,
    currentVaultSettingsLoaded,
    currentVaultSettings?.cloudSyncEnabled,
    sync,
    dispatch,
  ]);

  usePeriodicSync(
    useCallback(async () => {
      if (state.workspace && state.syncToken && currentBinding && currentVaultSettings?.cloudSyncEnabled !== false) {
        await sync.syncWorkspaceToWeb({ silent: true });
      }
    }, [state.workspace, state.syncToken, currentBinding, currentVaultSettings?.cloudSyncEnabled, sync]),
    useCallback(async () => {
      if (state.workspace && state.syncToken && currentBinding && currentVaultSettings?.cloudSyncEnabled !== false) {
        await sync.pullOnly();
      }
    }, [state.workspace, state.syncToken, currentBinding, currentVaultSettings?.cloudSyncEnabled, sync]),
    30_000,
    isSyncEnabled,
    state.wsConnected,
  );

  useAppLifecycle({
    enabled: capabilities.isMobile,
    onResume: useCallback(() => {
      if (state.workspace && state.syncToken && currentBinding && currentVaultSettings?.cloudSyncEnabled !== false) {
        void sync.pullOnly({ reason: "app-resume" }).catch(() => {});
      }
    }, [state.workspace, state.syncToken, currentBinding, currentVaultSettings?.cloudSyncEnabled, sync]),
  });

  useEffect(() => {
    // Coalesce bursty vault mutations (e.g. dragging several files, rapid
    // folder ops) into a single trailing sync instead of one per operation.
    let debounceTimer: number | undefined;
    const syncAfterTrashChange = () => {
      if (!isSyncEnabledRef.current) return;
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = undefined;
        void syncWorkspaceToWebRef.current({ silent: true });
      }, 600);
    };
    window.addEventListener("jtype:vault-deleted", syncAfterTrashChange);
    window.addEventListener("jtype:vault-restored", syncAfterTrashChange);
    window.addEventListener("jtype:vault-folder-changed", syncAfterTrashChange);
    return () => {
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      window.removeEventListener("jtype:vault-deleted", syncAfterTrashChange);
      window.removeEventListener("jtype:vault-restored", syncAfterTrashChange);
      window.removeEventListener("jtype:vault-folder-changed", syncAfterTrashChange);
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    if (!state.cloudProfile?.token || !currentBinding?.workspaceId || !state.cloudProfile?.deviceId || currentVaultSettings?.cloudSyncEnabled === false) return;

    invoke("start_cloud_listener", {
      serverUrl: state.cloudProfile.serverUrl,
      token: state.cloudProfile.token,
      workspaceId: currentBinding.workspaceId,
      deviceId: state.cloudProfile.deviceId,
      clientType: capabilities.clientType,
    }).catch(() => {});
    return () => {
      invoke("stop_cloud_listener").catch(() => {});
    };
  }, [capabilities.clientType, state.cloudProfile?.token, currentBinding?.workspaceId, state.cloudProfile?.deviceId, state.cloudProfile?.serverUrl, currentVaultSettings?.cloudSyncEnabled]);

  const workspaceRef = useRef(state.workspace);
  workspaceRef.current = state.workspace;
  const syncRef = useRef(sync);
  syncRef.current = sync;
  // Tracks whether the websocket has connected at least once, so a *reconnect*
  // (vs. the very first connect) can reconcile changes missed while offline.
  const hasConnectedOnceRef = useRef(false);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    const unlistenConnected = listen("cloud:ws-connected", () => {
      dispatch({ type: "SET_WS_CONNECTED", connected: true });
      // The server has no replay queue, so document:changed messages broadcast
      // while we were disconnected are gone. Pull once on reconnect to catch up.
      // (The first connect is skipped — the open-vault full pull covers it.)
      if (hasConnectedOnceRef.current) {
        syncRef.current.pullOnly({ reason: "ws-reconnect" })
          .then(() => maybeReconcileRef.current())
          .catch(() => {});
      }
      hasConnectedOnceRef.current = true;
    });
    const unlistenDisconnected = listen("cloud:ws-disconnected", () => dispatch({ type: "SET_WS_CONNECTED", connected: false }));
    const unlistenSession = listen<string>("cloud:ws-session", (e) => dispatch({ type: "SET_WS_SESSION", sessionId: e.payload }));
    const unlistenActivity = listen<{ msgType: string }>("cloud:ws-activity", (e) =>
      dispatch({ type: "SET_WS_ACTIVITY", msgType: e.payload.msgType })
    );
    const unlistenWorkspaceGone = listen<string>("cloud:workspace-gone", async (e) => {
      const goneWorkspaceId = e.payload;
      console.warn(`[cloud] workspace ${goneWorkspaceId} no longer exists on server`);
      dispatch({ type: "SET_WS_CONNECTED", connected: false });
      try {
        await invoke("unbind_cloud_workspace", {
          workspaceId: goneWorkspaceId,
          vaultPath: workspaceRef.current?.rootPath ?? "",
        });
        if (workspaceRef.current?.rootPath) {
          const settings = {
            cloudSyncEnabled: false,
            syncPromptDismissedAt: null,
            syncDisabledPermanently: false,
          };
          await invoke("save_vault_settings", {
            vaultPath: workspaceRef.current.rootPath,
            settings,
          });
          dispatch({ type: "DISCONNECT_WORKSPACE", workspaceId: goneWorkspaceId, vaultPath: workspaceRef.current.rootPath, settings });
        }
        await syncRef.current.loadVaultBindings();
        dispatch({ type: "SET_STATUS", message: "Cloud workspace was deleted. Local files were kept and this vault is now local-only." });
      } catch (err) {
        console.error("[cloud] failed to unbind gone workspace:", err);
      }
    });
    const unlistenMemberKicked = listen<string>("cloud:member-kicked", async (e) => {
      const kickedWorkspaceId = e.payload;
      console.warn(`[cloud] removed from workspace ${kickedWorkspaceId}`);
      dispatch({ type: "SET_WS_CONNECTED", connected: false });
      try {
        await invoke("unbind_cloud_workspace", {
          workspaceId: kickedWorkspaceId,
          vaultPath: workspaceRef.current?.rootPath ?? "",
        });
        if (workspaceRef.current?.rootPath) {
          const settings = {
            cloudSyncEnabled: false,
            syncPromptDismissedAt: null,
            syncDisabledPermanently: false,
          };
          await invoke("save_vault_settings", {
            vaultPath: workspaceRef.current.rootPath,
            settings,
          });
          dispatch({ type: "DISCONNECT_WORKSPACE", workspaceId: kickedWorkspaceId, vaultPath: workspaceRef.current.rootPath, settings });
        }
        await syncRef.current.loadVaultBindings();
        dispatch({ type: "SET_STATUS", message: "You have been removed from this cloud workspace. Local files were kept." });
      } catch (err) {
        console.error("[cloud] failed to unbind after member removal:", err);
      }
    });
    return () => {
      unlistenConnected.then((fn) => fn());
      unlistenDisconnected.then((fn) => fn());
      unlistenSession.then((fn) => fn());
      unlistenActivity.then((fn) => fn());
      unlistenWorkspaceGone.then((fn) => fn());
      unlistenMemberKicked.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    const unlistenOpenMarkdown = listen<string[]>("open-markdown-files", (event) => {
      const targetFile = event.payload.find((path) => /\.(md|markdown|mdown|mkd)$/i.test(path));
      if (targetFile) void openMarkdownFileRef.current(targetFile);
    });
    const unlistenExternalUris = listen<string[]>("open-external-file-uris", () => {
      // The backend queues before emitting. Draining that queue here prevents a
      // warm open-with event from being imported again on the next cold start.
      void import("../lib/tauri")
        .then(({ tauri }) => tauri.initialExternalFileSources())
        .then((sources) => {
          if (sources.length > 0) void importExternalSourcesRef.current(sources);
        })
        .catch(() => undefined);
    });
    return () => {
      unlistenOpenMarkdown.then((fn) => fn());
      unlistenExternalUris.then((fn) => fn());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!isTauriRuntime() || !state.workspace) return;
    const rootPath = state.workspace.rootPath;
    let cancelled = false;
    (async () => {
      try {
        const { tauri } = await import("../lib/tauri");
        const settings = await tauri.loadVaultSettings(rootPath);
        if (!cancelled) dispatch({ type: "SET_VAULT_SETTINGS", vaultPath: rootPath, settings });
      } catch {
        if (!cancelled) dispatch({ type: "SET_VAULT_SETTINGS", vaultPath: rootPath, settings: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.workspace?.rootPath, dispatch]);

  useEffect(() => {
    if (isTauriRuntime()) {
      (async () => {
        const { tauri } = await import("../lib/tauri");
        sync.loadCloudProfile();
        sync.loadVaultBindings();
        if (capabilities.supportsFileDrop) fs.registerDragDrop();

        let targetFile: string | null = null;
        let externalSources: string[] = [];
        try {
          const paths = await tauri.initialOpenPaths();
          targetFile = paths.find((p: string) => /\.(md|markdown|mdown|mkd)$/i.test(p)) ?? null;
        } catch { /* no initial paths */ }
        try {
          externalSources = await tauri.initialExternalFileSources();
        } catch { /* older backend or no external sources */ }

        if (externalSources.length > 0) {
          await fs.importExternalSources(externalSources);
        } else if (targetFile) {
          fs.openMarkdownFile(targetFile);
        } else if (state.lastWorkspacePath) {
          await fs.openWorkspace(state.lastWorkspacePath);
          if (state.lastFilePath) {
            const relPath = relativePathFromWorkspace(state.lastFilePath, state.lastWorkspacePath);
            if (isDiagramTextPath(state.lastFilePath)) fs.openDiagramFile(state.lastFilePath, relPath);
            else fs.openMarkdownFile(state.lastFilePath, relPath);
          }
        } else if (state.lastFilePath) {
          // Restore previous single-file session
          if (isDiagramTextPath(state.lastFilePath)) fs.openDiagramFile(state.lastFilePath);
          else fs.openMarkdownFile(state.lastFilePath);
        }
      })();
    } else {
      dispatch({ type: "SET_STATUS", message: "Browser preview mode. Run `npm run tauri dev` for desktop file access." });
    }
  }, []);

  const showWelcome = state.mode === "empty";
  const showVaultHome = state.mode === "workspace" && !state.currentPath;
  // Sidebar shows whenever a vault is open — including draft mode, so the user
  // can browse/reference notes while writing an untitled draft.
  const sidebarVisible = Boolean(state.workspace) && state.mode !== "empty" && !state.focusMode;
  // Draft mode renders the editor for an in-memory untitled document (no
  // currentPath yet). Must be checked before the currentPath fallback.
  const showEditor = state.mode === "draft" || Boolean(state.currentPath);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const desktopSidebarVisible = sidebarVisible && !capabilities.isMobile;

  useEffect(() => {
    if (!sidebarVisible || !capabilities.isMobile) setMobileNavigationOpen(false);
  }, [capabilities.isMobile, sidebarVisible]);

  // Resizable sidebar width (drag the right edge), persisted across launches.
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem("jtype.sidebarWidth"));
    return saved >= 200 && saved <= 480 ? saved : 272;
  });
  useEffect(() => {
    localStorage.setItem("jtype.sidebarWidth", String(sidebarWidth));
  }, [sidebarWidth]);

  return (
    <CommandsContext.Provider value={commands}>
      <div className={`${state.mode === "empty" && !state.workspace ? "app-empty" : state.workspace ? "workspace-mode" : "single-file-mode"} ${state.focusMode ? "focus-mode" : ""} ${capabilities.isMobile ? "runtime-mobile" : "runtime-desktop"} h-screen overflow-hidden bg-[#f5f8f6] text-stone-950 antialiased`}>
        <main className="grid h-screen grid-rows-[auto_1fr_auto]">
          <Header onOpenMobileNavigation={sidebarVisible && capabilities.isMobile ? () => setMobileNavigationOpen(true) : undefined} />
          <section
            className="relative grid min-h-0"
            style={{ gridTemplateColumns: desktopSidebarVisible ? `${sidebarWidth}px minmax(0,1fr)` : "minmax(0,1fr)" }}
          >
            {desktopSidebarVisible && <Sidebar />}
            {desktopSidebarVisible && <SidebarResizeHandle width={sidebarWidth} onResize={setSidebarWidth} />}
            {/* The content floats as a single rounded panel that the shell (header,
                sidebar, status bar) wraps around — no divider lines, just a soft
                tinted lift. */}
            <div id="app-content-panel" className={`${capabilities.isMobile ? "mx-3 mb-2 mt-1" : "m-2.5"} grid min-h-0 grid-cols-1 overflow-hidden rounded-2xl bg-[#fbfdfb] shadow-[0_1px_2px_rgba(20,45,38,0.04),0_16px_38px_-24px_rgba(20,45,38,0.22)] ring-1 ring-black/[0.035]`}>
              {showWelcome ? <WelcomeScreen /> : showVaultHome ? <VaultHome /> : showEditor ? <EditorShell /> : <WelcomeScreen />}
            </div>
          </section>
          <div
            id="operation-log"
            className={`${capabilities.isMobile ? "min-h-10 px-4 pt-1 text-[11px]" : "px-5 pb-1.5 pt-1 text-xs"} flex items-center justify-between gap-3 bg-transparent text-[#6b7773]`}
            style={capabilities.isMobile ? { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" } : undefined}
          >
            <span className="min-w-0 truncate">{state.statusMessage}</span>
            <span className="flex shrink-0 items-center gap-3">
              {isSyncEnabled && (
                state.wsConnected ? (
                  <span className="flex items-center gap-1.5 font-medium text-green-600" title="Connected">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-medium text-stone-500" title="Cloud workspace connection is offline">
                    <SignalSlashIcon className="h-3.5 w-3.5" />
                    Offline
                  </span>
                )
              )}
              <AppVersion />
              {state.activeConflicts.length > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-200"
                  onClick={() => dispatch({ type: "SET_CONFLICT_DIALOG", open: true })}
                >
                  <ExclamationTriangleIcon className="h-3 w-3" />
                  {state.activeConflicts.length} conflict{state.activeConflicts.length > 1 ? "s" : ""}
                </button>
              )}
            </span>
          </div>
        </main>
        <CommandPalette />
        <QuickSwitcher />
        <NewResourceDialog />
        <AccountDialog />
        <ConflictDialog />
        {capabilities.isMobile && (
          <MobileSidebarDialog open={mobileNavigationOpen} onClose={() => setMobileNavigationOpen(false)} />
        )}
        {capabilities.supportsUpdater && <UpdateBanner />}
      </div>
    </CommandsContext.Provider>
  );
}

function useApp() {
  const state = React.useContext(AppStateContext);
  const dispatch = React.useContext(AppDispatchContext);
  return { state, dispatch };
}
