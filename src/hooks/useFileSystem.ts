import { useCallback, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useAppDispatch, useAppState } from "../app/AppState";
import { usePrompt } from "../components/modals/PromptDialogContext";
import { tauri } from "../lib/tauri";
import { basename, isMarkdownPath, relativePathFromWorkspace, normalizePath } from "../lib/utils";
import { parseFrontmatter, writeFrontmatter, titleFromMarkdown } from "../lib/frontmatter";
import { markdownNodes, extractMarkdownLinks } from "../lib/utils";
import { appStorage } from "../lib/storage";
import type { EntryKind } from "../lib/types";
import type { AICommandProposal } from "../lib/aiCommands";

export function useFileSystem(onAfterSave?: () => Promise<void> | void) {
  const dispatch = useAppDispatch();
  const state = useAppState();
  const prompt = usePrompt();
  const onAfterSaveRef = useRef(onAfterSave);
  onAfterSaveRef.current = onAfterSave;

  const openMarkdownFile = useCallback(async (path: string, relativePath = "") => {
    if (!isMarkdownPath(path)) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_STATUS", message: "Opening..." });
      const content = await tauri.readFile(path);
      const derivedRelativePath = relativePath || (state.workspace ? relativePathFromWorkspace(path, state.workspace.rootPath) : "");
      if (!relativePath && state.workspace && !derivedRelativePath) {
        // File is outside the current vault — switch to single-file mode
        dispatch({ type: "CLOSE_WORKSPACE" });
      }
      dispatch({ type: "OPEN_FILE", path, relativePath: derivedRelativePath, content, kind: "markdown" });
      dispatch({ type: "SET_STATUS", message: `Opened ${derivedRelativePath || basename(path)}.` });
      addRecent({ kind: "file", name: basename(path), path });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace]);

  const chooseMarkdownFile = useCallback(async () => {
    if (!tauri.isAvailable) return;
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd"] }],
      });
      if (!selected) return;
      const selectedPath = Array.isArray(selected) ? selected[0] : selected;
      if (selectedPath) await openMarkdownFile(selectedPath);
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    }
  }, [dispatch, openMarkdownFile]);

  const chooseWorkspaceFolder = useCallback(async () => {
    if (!tauri.isAvailable) return;
    try {
      const selected = await open({ multiple: false, directory: true });
      if (!selected) return;
      const selectedPath = Array.isArray(selected) ? selected[0] : selected;
      if (selectedPath) await openWorkspace(selectedPath);
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    }
  }, [dispatch]);

  const openWorkspace = useCallback(async (path: string) => {
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_STATUS", message: "Opening..." });
      const workspace = await tauri.openWorkspace(path);
      dispatch({ type: "OPEN_WORKSPACE", workspace });
      dispatch({ type: "SET_STATUS", message: workspace.metadataCreated ? "Vault opened and .jtype metadata created." : "Vault opened." });
      addRecent({ kind: "workspace", name: workspace.name, path: workspace.rootPath });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch]);

  const openDefaultVault = useCallback(async () => {
    if (!tauri.isAvailable) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const workspace = await tauri.openDefaultVault();
      dispatch({ type: "OPEN_WORKSPACE", workspace });
      dispatch({ type: "SET_STATUS", message: workspace.metadataCreated ? "Default vault created." : "Default vault opened." });
      addRecent({ kind: "workspace", name: workspace.name, path: workspace.rootPath });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch]);

  const saveCurrentFile = useCallback(async () => {
    if (!state.currentPath || state.currentKind !== "markdown") return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_STATUS", message: "Saving..." });
      await tauri.writeFile(state.currentPath, state.editorContent);
      dispatch({ type: "SAVE_FILE" });
      dispatch({ type: "SET_STATUS", message: `Saved ${state.currentRelativePath || basename(state.currentPath)}.` });
      await onAfterSaveRef.current?.();
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.currentPath, state.currentKind, state.editorContent, state.currentRelativePath]);

  const createDocument = useCallback(async (relativePath: string) => {
    if (!state.workspace) return;
    const trimmed = relativePath.trim();
    if (!trimmed) return;
    const kind: EntryKind = isMarkdownPath(trimmed) ? "markdown" : "folder";
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const workspace = await tauri.createEntry(state.workspace.rootPath, trimmed, kind);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      if (kind === "markdown") {
        await openMarkdownFile(`${workspace.rootPath}/${trimmed}`, trimmed);
        // Send document:save via WS so web clients see the new document immediately.
        if (tauri.isAvailable) {
          try {
            const content = await tauri.readFile(`${workspace.rootPath}/${trimmed}`);
            const wsMsg = JSON.stringify({ type: "document:save", relativePath: trimmed, title: "", status: "", content });
            await tauri.cloudWsSend(wsMsg);
          } catch { /* non-critical — WS may be disconnected */ }
        }
        // Trigger an immediate HTTP sync push as well (conflict resolution, sync bases, etc.).
        try {
          await onAfterSaveRef.current?.();
        } catch (syncError) {
          dispatch({ type: "SET_STATUS", message: `Created ${trimmed} (sync failed: ${String(syncError)})` });
        }
      } else {
        dispatch({ type: "SET_STATUS", message: `Created folder ${trimmed}.` });
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace, openMarkdownFile]);

  const renameEntry = useCallback(async (fromRelativePath: string, toRelativePath: string, updateLinks: boolean) => {
    if (!state.workspace) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const impacted = updateLinks ? await findLinkImpacts(fromRelativePath) : [];
      const workspace = await tauri.renameEntry(state.workspace.rootPath, fromRelativePath, toRelativePath);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      if (updateLinks) await updateLinksAfterRename(impacted, fromRelativePath, toRelativePath);
      if (isMarkdownPath(toRelativePath)) {
        await openMarkdownFile(`${workspace.rootPath}/${toRelativePath}`, toRelativePath);
      } else {
        dispatch({ type: "SET_STATUS", message: `Renamed entry to ${toRelativePath}.` });
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace, openMarkdownFile]);

  const renameCurrentEntry = useCallback(async () => {
    if (!state.workspace || !state.currentRelativePath) return;
    const fromRelativePath = state.currentRelativePath;
    const nextPath = (await prompt("Move or rename path", fromRelativePath))?.trim();
    if (!nextPath || nextPath === fromRelativePath) return;
    const impacted = await findLinkImpacts(fromRelativePath);
    let updateLinks = false;
    if (impacted.length > 0) {
      updateLinks = window.confirm(
        `Rename impact:\n\n${impacted.length} Markdown file(s) link to ${fromRelativePath}.\n\nChoose OK to rename and update links, or Cancel to rename only.`
      );
    }
    await renameEntry(fromRelativePath, nextPath, updateLinks);
  }, [dispatch, state.workspace, state.currentRelativePath, renameEntry, prompt]);

  const deleteEntry = useCallback(async (relativePath: string) => {
    if (!state.workspace || !relativePath) return;
    const confirmed = window.confirm(`Move ${relativePath} to trash?`);
    if (!confirmed) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const workspace = await tauri.trashEntry(state.workspace.rootPath, relativePath);
      removeRecentEntry(state.workspace.rootPath, relativePath);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      if (state.currentRelativePath === relativePath || state.currentRelativePath.startsWith(`${relativePath}/`)) {
        dispatch({ type: "CLEAR_DOCUMENT" });
      }
      dispatch({ type: "SET_STATUS", message: "Moved to trash." });
      window.dispatchEvent(new CustomEvent("jtype:vault-deleted", { detail: { relativePath } }));
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace, state.currentRelativePath]);

  const deleteCurrentEntry = useCallback(async () => {
    if (!state.currentRelativePath) return;
    await deleteEntry(state.currentRelativePath);
  }, [state.currentRelativePath, deleteEntry]);

  const listTrash = useCallback(async () => {
    if (!state.workspace) return [];
    try {
      return await tauri.listTrash(state.workspace.rootPath);
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
      return [];
    }
  }, [dispatch, state.workspace]);

  const restoreTrashItem = useCallback(async (trashId: string) => {
    if (!state.workspace) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      // Find the cloud trash ID and relativePath before restoring
      let cloudTrashId: string | undefined;
      let relPath: string | undefined;
      if (tauri.isAvailable) {
        try {
          const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
          const item = meta.items.find((i) => i.trashId === trashId);
          cloudTrashId = item?.cloudTrashId;
          relPath = item?.relativePath;
        } catch { /* ignore */ }
        // Fallback: get relativePath from the local trash list
        if (!relPath) {
          try {
            const localItems = await tauri.listTrash(state.workspace.rootPath);
            relPath = localItems.find((i) => i.trashId === trashId)?.relativePath;
          } catch { /* ignore */ }
        }
      }
      const workspace = await tauri.restoreFromTrash(state.workspace.rootPath, trashId);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      dispatch({ type: "SET_STATUS", message: "Restored from trash." });
      window.dispatchEvent(new CustomEvent("jtype:vault-restored"));
      // Record pending op for cloud sync and clean up any cloud metadata item for the same path
      if (tauri.isAvailable) {
        try {
          const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
          const ops = meta.pendingTrashOps;
          if (cloudTrashId) {
            ops.push({ type: "restore", trashId: cloudTrashId });
          }
          // Also queue restore + remove any cloud metadata item for the same relativePath
          if (relPath) {
            for (const cloudItem of meta.items) {
              if (cloudItem.source === "cloud" && cloudItem.relativePath === relPath && cloudItem.cloudTrashId && cloudItem.cloudTrashId !== cloudTrashId) {
                ops.push({ type: "restore", trashId: cloudItem.cloudTrashId });
              }
            }
            meta.items = meta.items.filter(
              (i) => i.trashId !== trashId && !(i.source === "cloud" && i.relativePath === relPath),
            );
          } else {
            meta.items = meta.items.filter((i) => i.trashId !== trashId);
          }
          meta.pendingTrashOps = ops;
          await tauri.saveTrashMetadata(state.workspace.rootPath, meta);
        } catch { /* non-critical */ }
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace]);

  const emptyTrash = useCallback(async () => {
    if (!state.workspace) return;
    const confirmed = window.confirm("Empty trash permanently?");
    if (!confirmed) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      await tauri.emptyTrash(state.workspace.rootPath);
      dispatch({ type: "SET_STATUS", message: "Trash emptied." });
      // Record pending op for cloud sync
      if (tauri.isAvailable) {
        try {
          const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
          const ops = meta.pendingTrashOps;
          ops.push({ type: "empty_trash" });
          meta.pendingTrashOps = ops;
          meta.items = [];
          await tauri.saveTrashMetadata(state.workspace.rootPath, meta);
        } catch { /* non-critical */ }
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace]);

  const permanentDeleteTrash = useCallback(async (trashId: string) => {
    if (!state.workspace) return;
    try {
      let cloudTrashId: string | undefined;
      let relPath: string | undefined;
      if (tauri.isAvailable) {
        try {
          const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
          const item = meta.items.find((i) => i.trashId === trashId);
          cloudTrashId = item?.cloudTrashId;
          relPath = item?.relativePath;
        } catch { /* ignore */ }
        if (!relPath) {
          try {
            const localItems = await tauri.listTrash(state.workspace.rootPath);
            relPath = localItems.find((i) => i.trashId === trashId)?.relativePath;
          } catch { /* ignore */ }
        }
      }
      await tauri.permanentDeleteTrash(state.workspace.rootPath, trashId);
      dispatch({ type: "SET_STATUS", message: "Item permanently deleted." });
      if (tauri.isAvailable) {
        try {
          const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
          const ops = meta.pendingTrashOps;
          if (cloudTrashId) {
            ops.push({ type: "permanent_delete", trashId: cloudTrashId });
          }
          if (relPath) {
            for (const cloudItem of meta.items) {
              if (cloudItem.source === "cloud" && cloudItem.relativePath === relPath && cloudItem.cloudTrashId && cloudItem.cloudTrashId !== cloudTrashId) {
                ops.push({ type: "permanent_delete", trashId: cloudItem.cloudTrashId });
              }
            }
            meta.items = meta.items.filter(
              (i) => i.trashId !== trashId && !(i.source === "cloud" && i.relativePath === relPath),
            );
          } else {
            meta.items = meta.items.filter((i) => i.trashId !== trashId);
          }
          meta.pendingTrashOps = ops;
          await tauri.saveTrashMetadata(state.workspace.rootPath, meta);
        } catch { /* non-critical */ }
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    }
  }, [dispatch, state.workspace]);

  const exportSite = useCallback(async () => {
    if (!state.workspace) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const validation = await tauri.validateWorkspace(state.workspace.rootPath);
      if (validation.errors.length > 0) {
        dispatch({ type: "SET_STATUS", message: `Export blocked: ${validation.errors[0]}` });
        return;
      }
      const result = await tauri.exportStaticSite(state.workspace.rootPath, ".jtype/dist");
      const warningText = validation.warnings.length > 0 ? ` ${validation.warnings.length} warning(s).` : "";
      dispatch({ type: "SET_STATUS", message: `Exported ${result.pages.length} page(s) to ${result.outputDir}.${warningText}` });
      if (result.pages.length > 0) {
        try {
          await openPath(`${result.outputDir}/${result.pages[0]}`);
        } catch {
          dispatch({ type: "SET_STATUS", message: `Exported to ${result.outputDir}. Could not auto-open preview.` });
        }
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace]);

  const runPublishChecks = useCallback(async () => {
    if (!state.workspace) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const validation = await tauri.validateWorkspace(state.workspace.rootPath);
      const issueCount = validation.errors.length + validation.warnings.length;
      dispatch({ type: "SET_STATUS", message: issueCount > 0 ? `Publish checks found ${issueCount} issue(s).` : "Publish checks passed." });
      dispatch({ type: "SET_ACTIVITY", activity: "explorer" });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace]);

  const buildAiIndex = useCallback(async () => {
    if (!state.workspace) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const result = await tauri.buildAiIndex(state.workspace.rootPath);
      dispatch({ type: "SET_STATUS", message: `AI index: ${result.documents} docs, ${result.chunks} chunks, ${result.links} links.` });
      dispatch({ type: "SET_ACTIVITY", activity: "explorer" });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace]);

  const proposeTitleFrontmatter = useCallback(() => {
    if (!state.currentPath || state.currentKind !== "markdown") return;
    const current = state.editorContent;
    const title = titleFromMarkdown(current, basename(state.currentPath).replace(/\.(md|markdown|mdown|mkd)$/i, ""));
    const next = writeFrontmatter(current, { title, status: parseFrontmatter(current).data.status || "draft" });
    const proposal: AICommandProposal = {
      id: "proposal.titleFrontmatter",
      name: "Propose title frontmatter",
      scope: "document",
      explanation: `Use the document heading or filename to stage title metadata for ${state.currentRelativePath || basename(state.currentPath)}.`,
      proposedChanges: [{ path: state.currentPath, before: current, after: next }],
    };
    dispatch({ type: "SET_AI_PROPOSAL", proposal });
    dispatch({ type: "SET_INSPECTOR", tab: "ai" });
  }, [dispatch, state.currentPath, state.currentKind, state.editorContent, state.currentRelativePath]);

  const findLinkImpacts = useCallback(async (targetRelativePath: string) => {
    if (!state.workspace) return [];
    const targetName = basename(targetRelativePath);
    const impacts: Array<{ relativePath: string; path: string; line: number; content: string }> = [];
    for (const node of markdownNodes(state.workspace.entries)) {
      try {
        const content = node.path === state.currentPath ? state.editorContent : await tauri.readFile(node.path);
        const links = extractMarkdownLinks(content);
        for (const link of links) {
          if (normalizePath(link.target) === normalizePath(targetRelativePath) || basename(link.target) === targetName) {
            impacts.push({ relativePath: node.relativePath, path: node.path, line: link.line, content });
          }
        }
      } catch { /* ignore unreadable files */ }
    }
    return impacts;
  }, [state.workspace, state.currentPath, state.editorContent]);

  const updateLinksAfterRename = useCallback(async (
    impacts: Array<{ relativePath: string; path: string; content: string }>,
    fromRelativePath: string,
    toRelativePath: string
  ) => {
    const fromName = basename(fromRelativePath);
    const toName = basename(toRelativePath);
    const seen = new Set<string>();
    for (const impact of impacts) {
      if (seen.has(impact.path)) continue;
      seen.add(impact.path);
      const before = impact.content;
      const after = before
        .split(`](${fromRelativePath})`).join(`](${toRelativePath})`)
        .split(`](${fromName})`).join(`](${toName})`)
        .split(`[[${fromRelativePath}]]`).join(`[[${toRelativePath}]]`)
        .split(`[[${fromName}]]`).join(`[[${toName}]]`);
      if (after !== before) {
        await tauri.writeFile(impact.path, after);
      }
    }
  }, []);

  const registerDragDrop = useCallback(async () => {
    if (!tauri.isAvailable) return;
    const webview = getCurrentWebview();
    await webview.onDragDropEvent((event) => {
      if (event.payload.type !== "drop") return;
      const firstPath = event.payload.paths[0];
      const firstMarkdownPath = event.payload.paths.find(isMarkdownPath);
      if (firstMarkdownPath) void openMarkdownFile(firstMarkdownPath);
      else if (firstPath) void openWorkspace(firstPath);
    });
  }, [openMarkdownFile, openWorkspace]);

  const createFolder = useCallback(async (folderRelativePath: string) => {
    if (!state.workspace) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const workspace = await tauri.createFolder(state.workspace.rootPath, folderRelativePath);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      dispatch({ type: "SET_STATUS", message: `Created folder ${folderRelativePath}.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace]);

  const renameFolder = useCallback(async (fromRelativePath: string, toRelativePath: string) => {
    if (!state.workspace) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const [workspace] = await tauri.renameFolder(state.workspace.rootPath, fromRelativePath, toRelativePath);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      dispatch({ type: "SET_STATUS", message: `Renamed folder to ${toRelativePath}.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace]);

  const moveFolder = useCallback(async (fromRelativePath: string, toRelativePath: string) => {
    if (!state.workspace) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const [workspace] = await tauri.moveFolder(state.workspace.rootPath, fromRelativePath, toRelativePath);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      dispatch({ type: "SET_STATUS", message: `Moved folder to ${toRelativePath}.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace]);

  const deleteFolder = useCallback(async (folderRelativePath: string, softDelete = true) => {
    if (!state.workspace) return;
    const confirmed = window.confirm(`Delete folder "${folderRelativePath}" and move all documents to trash?`);
    if (!confirmed) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const [workspace, impacted] = await tauri.deleteFolder(state.workspace.rootPath, folderRelativePath, softDelete);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      if (state.currentRelativePath.startsWith(`${folderRelativePath}/`)) {
        dispatch({ type: "CLEAR_DOCUMENT" });
      }
      dispatch({ type: "SET_STATUS", message: `Deleted folder ${folderRelativePath}. ${impacted.length} document(s) moved to trash.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace, state.currentRelativePath]);

  const openInitialPath = useCallback(async () => {
    if (!tauri.isAvailable) return;
    try {
      const paths = await tauri.initialOpenPaths();
      const firstMarkdownPath = paths.find(isMarkdownPath);
      if (firstMarkdownPath) await openMarkdownFile(firstMarkdownPath);
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    }
  }, [dispatch, openMarkdownFile]);

  return {
    openMarkdownFile,
    chooseMarkdownFile,
    chooseWorkspaceFolder,
    openWorkspace,
    openDefaultVault,
    saveCurrentFile,
    createDocument,
    renameCurrentEntry,
    deleteEntry,
    deleteCurrentEntry,
    listTrash,
    restoreTrashItem,
    emptyTrash,
    permanentDeleteTrash,
    exportSite,
    runPublishChecks,
    buildAiIndex,
    proposeTitleFrontmatter,
    registerDragDrop,
    openInitialPath,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
  };
}

type RecentItem = { kind: "file" | "workspace"; name: string; path: string };

function addRecent(item: RecentItem) {
  const nextItems = [item, ...readRecentItems().filter((recent) => recent.path !== item.path)].slice(0, 12);
  appStorage.set("recent", nextItems);
}

function readRecentItems(): RecentItem[] {
  return appStorage.get("recent", []);
}

function removeRecentEntry(rootPath: string, relativePath: string) {
  const targetPath = normalizePath(`${rootPath}/${relativePath}`);
  const nextItems = readRecentItems().filter((item) => normalizePath(item.path) !== targetPath);
  appStorage.set("recent", nextItems);
}
