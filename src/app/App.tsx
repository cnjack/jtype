import React, { useReducer, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { appReducer, initialState, AppStateContext, AppDispatchContext } from "./AppState";
import { useFileSystem, useCloudSync, useKeyboardShortcuts, useCommands } from "../hooks";
import { usePeriodicSync } from "../hooks/usePeriodicSync";
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
import { isTauriRuntime, relativePathFromWorkspace } from "../lib/utils";

const CommandsContext = createContext<CommandDef[]>([]);

export function useCommandsList() {
  return useContext(CommandsContext);
}

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        <AppContent />
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

function AppContent() {
  const { state, dispatch } = useApp();
  const sync = useCloudSync();
  const autoSync = useCallback(async () => {
    if (state.workspace && state.syncToken && state.vaultBindings.length > 0) {
      const merged = await sync.syncWorkspaceToWeb({ silent: true, skipRelativePath: state.currentRelativePath || undefined });
      if (merged && merged.mergeStatus === "merged" && merged.relativePath === state.currentRelativePath && !state.isDirty) {
        const { tauri } = await import("../lib/tauri");
        await tauri.writeFile(state.currentPath, merged.content);
        dispatch({ type: "OPEN_FILE", path: state.currentPath, relativePath: state.currentRelativePath, content: merged.content, kind: state.currentKind as import("../lib/types").EntryKind });
        dispatch({ type: "SET_STATUS", message: `Saved & merged with cloud changes.` });
      }
    }
  }, [state.workspace, state.syncToken, state.vaultBindings, state.currentRelativePath, state.currentPath, state.currentKind, state.isDirty, sync, dispatch]);
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
  const isSyncEnabled = !!(state.workspace && state.syncToken && currentBinding);
  const startupPullDoneRef = useRef<string | null>(null);

  useEffect(() => {
    const bindingId = currentBinding?.workspaceId ?? null;
    if (startupPullDoneRef.current === bindingId) return;
    if (!state.workspace || !state.syncToken || !currentBinding) return;
    startupPullDoneRef.current = bindingId;
    sync.pullOnly();
  }, [state.workspace, state.syncToken, currentBinding, sync]);

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
  );

  useEffect(() => {
    const syncAfterTrashChange = () => {
      if (state.workspace && state.syncToken && currentBinding) {
        void sync.syncWorkspaceToWeb({ silent: true });
      }
    };
    window.addEventListener("jtype:vault-deleted", syncAfterTrashChange);
    window.addEventListener("jtype:vault-restored", syncAfterTrashChange);
    return () => {
      window.removeEventListener("jtype:vault-deleted", syncAfterTrashChange);
      window.removeEventListener("jtype:vault-restored", syncAfterTrashChange);
    };
  }, [state.workspace, state.syncToken, currentBinding, sync]);

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
        <main className="grid h-screen grid-rows-[auto_1fr]">
          <Header />
          <section className={`grid min-h-0 ${sidebarVisible ? "grid-cols-[272px_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)]"}`}>
            {sidebarVisible && <Sidebar />}
            {showWelcome ? <WelcomeScreen /> : showVaultHome ? <VaultHome /> : state.currentPath ? <EditorShell /> : <WelcomeScreen />}
          </section>
        </main>
        <CommandPalette />
        <QuickSwitcher />
        <CreateNoteDialog />
        <AccountDialog />
      </div>
    </CommandsContext.Provider>
  );
}

function useApp() {
  const state = React.useContext(AppStateContext);
  const dispatch = React.useContext(AppDispatchContext);
  return { state, dispatch };
}
