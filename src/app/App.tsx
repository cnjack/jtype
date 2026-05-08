import React, { useReducer, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { appReducer, initialState, AppStateContext, AppDispatchContext } from "./AppState";
import { useFileSystem, useCloudSync, useKeyboardShortcuts, useCommands } from "../hooks";
import { usePeriodicSync } from "../hooks/usePeriodicSync";
import { useCloudEvents } from "../hooks/useCloudEvents";
import { useFileWatcher } from "../hooks/useFileWatcher";
import type { CommandDef } from "../hooks/useCommands";
import { Header } from "../components/layout/Header";
import { WelcomeScreen } from "../components/layout/WelcomeScreen";
import { VaultHome } from "../components/layout/VaultHome";
import { Sidebar } from "../components/sidebar/Sidebar";
import { EditorShell } from "../components/editor/EditorShell";
import { CommandPalette } from "../components/modals/CommandPalette";
import { QuickSwitcher } from "../components/modals/QuickSwitcher";
import { CreateNoteDialog } from "../components/modals/CreateNoteDialog";
import { AccountDialog } from "../components/modals/AccountDialog";
import { ConflictDialog } from "../components/modals/ConflictDialog";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { PromptDialogProvider } from "../components/modals/PromptDialogContext";
import { isTauriRuntime, relativePathFromWorkspace } from "../lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const CommandsContext = createContext<CommandDef[]>([]);

export function useCommandsList() {
  return useContext(CommandsContext);
}

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        <PromptDialogProvider>
          <AppContent />
        </PromptDialogProvider>
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

function AppContent() {
  const { state, dispatch } = useApp();
  const sync = useCloudSync();
  const autoSync = useCallback(async () => {
    const vaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
    if (state.workspace && state.syncToken && state.vaultBindings.length > 0 && vaultSettings?.cloudSyncEnabled !== false) {
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
  const { commands, findCommand } = useCommands(fs, sync);
  useFileWatcher();

  const handleAction = useCallback((action: string) => {
    if (action === "quickSwitcher.create") {
      const input = document.querySelector<HTMLInputElement>('input[aria-label="Open or create Document"]');
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
  const startupPullDoneRef = useRef<string | null>(null);

  useCloudEvents(sync.pullOnly);

  useEffect(() => {
    const bindingId = currentBinding?.workspaceId ?? null;
    if (startupPullDoneRef.current === bindingId) return;
    if (!state.workspace || !state.syncToken || !currentBinding || currentVaultSettings?.cloudSyncEnabled === false) return;
    startupPullDoneRef.current = bindingId;
    sync.pullOnly();
  }, [state.workspace, state.syncToken, currentBinding, currentVaultSettings?.cloudSyncEnabled, sync]);

  usePeriodicSync(
    useCallback(async () => {
      if (state.workspace && state.syncToken && currentBinding) {
        await sync.syncWorkspaceToWeb({ silent: true });
      }
    }, [state.workspace, state.syncToken, currentBinding, sync]),
    useCallback(async () => {
      if (state.workspace && state.syncToken && currentBinding) {
        await sync.pullOnly();
      }
    }, [state.workspace, state.syncToken, currentBinding, sync]),
    30_000,
    isSyncEnabled,
    state.wsConnected,
  );

  useEffect(() => {
    const syncAfterTrashChange = () => {
      if (state.workspace && state.syncToken && currentBinding && currentVaultSettings?.cloudSyncEnabled !== false) {
        void sync.syncWorkspaceToWeb({ silent: true });
      }
    };
    window.addEventListener("jtype:vault-deleted", syncAfterTrashChange);
    window.addEventListener("jtype:vault-restored", syncAfterTrashChange);
    return () => {
      window.removeEventListener("jtype:vault-deleted", syncAfterTrashChange);
      window.removeEventListener("jtype:vault-restored", syncAfterTrashChange);
    };
  }, [state.workspace, state.syncToken, currentBinding, currentVaultSettings?.cloudSyncEnabled, sync]);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    if (!state.cloudProfile?.token || !currentBinding?.workspaceId || !state.cloudProfile?.deviceId || currentVaultSettings?.cloudSyncEnabled === false) return;

    invoke("start_cloud_listener", {
      serverUrl: state.cloudProfile.serverUrl,
      token: state.cloudProfile.token,
      workspaceId: currentBinding.workspaceId,
      deviceId: state.cloudProfile.deviceId,
    }).catch(() => {});
    return () => {
      invoke("stop_cloud_listener").catch(() => {});
    };
  }, [state.cloudProfile?.token, currentBinding?.workspaceId, state.cloudProfile?.deviceId, state.cloudProfile?.serverUrl, currentVaultSettings?.cloudSyncEnabled]);

  const workspaceRef = useRef(state.workspace);
  workspaceRef.current = state.workspace;
  const syncRef = useRef(sync);
  syncRef.current = sync;

  useEffect(() => {
    if (!isTauriRuntime()) return;
    const unlistenConnected = listen("cloud:ws-connected", () => dispatch({ type: "SET_WS_CONNECTED", connected: true }));
    const unlistenDisconnected = listen("cloud:ws-disconnected", () => dispatch({ type: "SET_WS_CONNECTED", connected: false }));
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
          dispatch({ type: "SET_VAULT_SETTINGS", vaultPath: workspaceRef.current.rootPath, settings });
        }
        await syncRef.current.loadVaultBindings();
      } catch (err) {
        console.error("[cloud] failed to unbind gone workspace:", err);
      }
    });
    return () => {
      unlistenConnected.then((fn) => fn());
      unlistenDisconnected.then((fn) => fn());
      unlistenActivity.then((fn) => fn());
      unlistenWorkspaceGone.then((fn) => fn());
    };
  }, []);

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
        fs.registerDragDrop();

        let targetFile: string | null = null;
        try {
          const paths = await tauri.initialOpenPaths();
          targetFile = paths.find((p: string) => /\.(md|markdown|mdown|mkd)$/i.test(p)) ?? null;
        } catch { /* no initial paths */ }

        if (targetFile) {
          fs.openMarkdownFile(targetFile);
        } else if (state.lastWorkspacePath) {
          await fs.openWorkspace(state.lastWorkspacePath);
          if (state.lastFilePath) {
            const relPath = relativePathFromWorkspace(state.lastFilePath, state.lastWorkspacePath);
            fs.openMarkdownFile(state.lastFilePath, relPath);
          }
        } else if (state.lastFilePath) {
          // Restore previous single-file session
          fs.openMarkdownFile(state.lastFilePath);
        }
      })();
    } else {
      dispatch({ type: "SET_STATUS", message: "Browser preview mode. Run `npm run tauri dev` for desktop file access." });
    }
  }, []);

  const showWelcome = state.mode === "empty";
  const showVaultHome = state.mode === "workspace" && !state.currentPath;
  const sidebarVisible = state.mode === "workspace" && !state.focusMode;

  return (
    <CommandsContext.Provider value={commands}>
      <div className={`${state.mode === "empty" ? "app-empty" : state.mode === "workspace" ? "workspace-mode" : "single-file-mode"} ${state.focusMode ? "focus-mode" : ""} h-screen overflow-hidden bg-[#f5f8f6] text-stone-950 antialiased`}>
        <main className="grid h-screen grid-rows-[auto_1fr_auto]">
          <Header />
          <section className={`grid min-h-0 ${sidebarVisible ? "grid-cols-[272px_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)]"}`}>
            {sidebarVisible && <Sidebar />}
            {showWelcome ? <WelcomeScreen /> : showVaultHome ? <VaultHome /> : state.currentPath ? <EditorShell /> : <WelcomeScreen />}
          </section>
          <div id="operation-log" className="flex items-center justify-between border-t border-black/[0.04] bg-white/70 px-5 py-3 text-xs text-[#6b7773]">
            <span>{state.statusMessage}</span>
            <span className="flex shrink-0 items-center gap-3">
              {state.syncToken && (
                state.wsConnected ? (
                  <span className="flex items-center gap-1.5 font-medium text-green-600" title={state.lastWsEventType ? `Last event: ${state.lastWsEventType}` : "Connected"}>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Connected
                    {state.lastWsEventType && (
                      <span className="font-normal text-green-700 opacity-70">{state.lastWsEventType.replace("document:", "")}</span>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-medium text-red-500"><span className="w-2 h-2 rounded-full bg-red-500" />Offline</span>
                )
              )}
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
        <CreateNoteDialog />
        <AccountDialog />
        <ConflictDialog />
      </div>
    </CommandsContext.Provider>
  );
}

function useApp() {
  const state = React.useContext(AppStateContext);
  const dispatch = React.useContext(AppDispatchContext);
  return { state, dispatch };
}
