import { useEffect, useRef } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { tauri } from "../lib/tauri";
import { useAppState, useAppDispatch } from "../app/AppState";
import { sha256Hex } from "../lib/utils";
import { consumeCloudWrite } from "../lib/cloudWriteHashes";

export function useFileWatcher(onExternalChange?: (changedPaths: string[]) => void) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const onExternalChangeRef = useRef(onExternalChange);
  onExternalChangeRef.current = onExternalChange;
  const latestStateRef = useRef({
    currentPath: "",
    currentRelativePath: "",
    isDirty: false,
    rootPath: "",
    editorContent: "",
  });

  useEffect(() => {
    latestStateRef.current = {
      currentPath: state.currentPath,
      currentRelativePath: state.currentRelativePath,
      isDirty: state.isDirty,
      rootPath: state.workspace?.rootPath ?? "",
      editorContent: state.editorContent,
    };
  }, [state.currentPath, state.currentRelativePath, state.isDirty, state.workspace?.rootPath, state.editorContent]);

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
          const { currentPath, currentRelativePath, isDirty, rootPath: currentRootPath } = latestStateRef.current;
          if (!currentRootPath) return;

          const workspace = await t.openWorkspace(currentRootPath);
          dispatch({ type: "UPDATE_WORKSPACE", workspace });

          const changedPaths = event.payload;

          // Content hash gate: filter out cloud-originated changes
          const externalChanges: string[] = [];
          for (const p of changedPaths) {
            const expectedHash = consumeCloudWrite(p);
            if (expectedHash) {
              if (expectedHash === "DELETED_BY_CLOUD_PULL") {
                continue;
              }
              try {
                const content = await t.readFile(p);
                const actualHash = await sha256Hex(content);
                if (actualHash === expectedHash) {
                  continue;
                }
              } catch {
                continue;
              }
            }
            externalChanges.push(p);
          }

          if (externalChanges.length > 0 && onExternalChangeRef.current) {
            onExternalChangeRef.current(externalChanges);
          }

          if (currentPath && changedPaths.some((p) => p === currentPath) && !isDirty) {
            try {
              const content = await t.readFile(currentPath);
              // Only re-open if content actually changed to avoid unnecessary refresh/scroll reset
              if (content !== latestStateRef.current.editorContent) {
                dispatch({ type: "OPEN_FILE", path: currentPath, relativePath: currentRelativePath, content, kind: "markdown" });
              }
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
  }, [state.workspace?.rootPath, dispatch]);

  useEffect(() => {
    if (!state.isDirty) {
      lastSaveTimeRef.current = Date.now();
    }
  }, [state.isDirty]);
}
