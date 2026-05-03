import { useEffect, useRef } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { tauri } from "../lib/tauri";
import { useAppState, useAppDispatch } from "../app/AppState";

export function useFileWatcher() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!tauri.isAvailable || !state.workspace) return;

    const rootPath = state.workspace.rootPath;

    tauri.startFileWatcher(rootPath).catch(() => {});

    let mounted = true;

    listen<string[]>("vault-file-changed", (event) => {
      if (!mounted) return;
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(async () => {
        debounceRef.current = null;
        const now = Date.now();
        if (now - lastSaveTimeRef.current < 1000) return;
        try {
          const { tauri: t } = await import("../lib/tauri");
          const currentRootPath = state.workspace?.rootPath;
          if (!currentRootPath) return;

          const workspace = await t.openWorkspace(currentRootPath);
          dispatch({ type: "UPDATE_WORKSPACE", workspace });

          const changedPaths = event.payload;
          const currentPath = state.currentPath;
          if (currentPath && changedPaths.some((p) => p === currentPath) && !state.isDirty) {
            try {
              const content = await t.readFile(currentPath);
              dispatch({ type: "OPEN_FILE", path: currentPath, relativePath: state.currentRelativePath, content, kind: "markdown" });
            } catch {
              // file may have been deleted
            }
          }
        } catch {
          // ignore refresh errors
        }
      }, 300);
    }).then((fn) => {
      if (mounted) {
        unlistenRef.current = fn;
      } else {
        fn();
      }
    });

    return () => {
      mounted = false;
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      tauri.stopFileWatcher().catch(() => {});
    };
  }, [state.workspace?.rootPath, dispatch, state.currentPath, state.currentRelativePath, state.isDirty]);

  useEffect(() => {
    if (!state.isDirty) {
      lastSaveTimeRef.current = Date.now();
    }
  }, [state.isDirty]);
}
