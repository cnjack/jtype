import { useCallback, useRef } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { t } from "@lingui/core/macro";
import { isCurrentVaultReadOnly, useAppDispatch, useAppState } from "../app/AppState";
import { usePrompt, useConfirm } from "@shared/components/PromptDialogContext";
import { tauri } from "../lib/tauri";
import { httpRequest } from "@shared/lib/http";
import { basename, isMarkdownPath, relativePathFromWorkspace, normalizePath } from "../lib/utils";
import { isEditableResourcePath, isDiagramTextPath, isViewableAssetPath } from "@shared/lib/fileTypes";
import { writeFrontmatter, titleFromMarkdown } from "@shared/lib/frontmatter";
import type { RecentItem, FileTreeNode, BoardConfig, ExternalVaultConflictResolution } from "../lib/types";
import { markdownNodes, extractMarkdownLinks } from "../lib/utils";
import { appStorage } from "../lib/storage";
import type { AICommandProposal } from "../lib/aiCommands";
import { useRuntimeCapabilities } from "../app/RuntimeCapabilities";

export function useFileSystem(onAfterSave?: () => Promise<void> | void) {
  const dispatch = useAppDispatch();
  const state = useAppState();
  const capabilities = useRuntimeCapabilities();
  const prompt = usePrompt();
  const confirm = useConfirm();
  const onAfterSaveRef = useRef(onAfterSave);
  onAfterSaveRef.current = onAfterSave;
  const currentVaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const currentVaultBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const isVaultReadOnly = Boolean(
    (currentVaultBinding?.workspaceRole === "viewer" && currentVaultSettings?.cloudSyncEnabled !== false)
      || isCurrentVaultReadOnly(state),
  );

  /** Returns cloud REST context for the current vault, or null if sync is not active. */
  const getCloudContext = useCallback(() => {
    if (!state.workspace || !state.syncToken) return null;
    const vaultSettings = state.vaultSettings[state.workspace.rootPath];
    if (vaultSettings?.cloudSyncEnabled === false) return null;
    const binding = state.vaultBindings.find((item) => item.localVaultPath === state.workspace?.rootPath);
    if (!binding || !state.cloudProfile?.token) return null;
    const serviceUrl = (state.serviceUrl || state.cloudProfile?.serverUrl || "http://localhost:13345").trim().replace(/\/$/, "");
    return {
      serviceUrl,
      token: state.syncToken,
      workspaceId: binding.workspaceId,
      deviceId: state.cloudProfile?.deviceId ?? capabilities.clientType,
    };
  }, [capabilities.clientType, state.workspace, state.syncToken, state.vaultBindings, state.vaultSettings, state.cloudProfile, state.serviceUrl]);

  /** Fire-and-forget REST call to the cloud service. Non-critical — errors are silently ignored. */
  const cloudRest = useCallback(async (path: string, method: string, body?: Record<string, unknown>) => {
    const ctx = getCloudContext();
    if (!ctx) return;
    try {
      await httpRequest(`${ctx.serviceUrl}/api/v1/workspaces/${ctx.workspaceId}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.token}`,
          "x-device-id": ctx.deviceId,
          "x-client-type": capabilities.clientType,
          ...(state.wsSessionId ? { "x-session-id": state.wsSessionId } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { /* non-critical */ }
  }, [capabilities.clientType, getCloudContext, state.wsSessionId]);

  const openMarkdownFile = useCallback(async (path: string, relativePath = "") => {
    if (!isMarkdownPath(path)) return;
    // Opening another file discards the current draft. Confirm first when the
    // draft has real content, mirroring the close/discard guards elsewhere.
    if (state.isDraft && state.editorContent.trim() !== "") {
      const ok = await confirm(t`Discard this untitled document and open another file?`, {
        title: t`Discard draft`,
        destructive: true,
      });
      if (!ok) return;
    }
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
  }, [dispatch, confirm, state.workspace, state.isDraft, state.editorContent]);

  const openDiagramFile = useCallback(async (path: string, relativePath = "") => {
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_STATUS", message: "Opening..." });
      const content = await tauri.readDiagramFile(path);
      const derivedRelativePath = relativePath || (state.workspace ? relativePathFromWorkspace(path, state.workspace.rootPath) : "");
      if (!relativePath && state.workspace && !derivedRelativePath) {
        // File is outside the current vault — switch to single-file mode
        dispatch({ type: "CLOSE_WORKSPACE" });
      }
      dispatch({ type: "OPEN_FILE", path, relativePath: derivedRelativePath, content, kind: "diagram" });
      dispatch({ type: "SET_STATUS", message: `Opened ${derivedRelativePath || basename(path)}.` });
      addRecent({ kind: "file", name: basename(path), path });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace]);

  /**
   * Copy external file references into the active app-private vault, then reveal
   * the first imported resource. Desktop drops pass regular paths; mobile
   * pickers/open-with pass content or file URLs that the Rust/native adapter
   * materializes before the existing vault import runs.
   */
  const importExternalSources = useCallback(async (
    sourcePaths: string[],
    targetFolderOverride?: string,
  ): Promise<string[]> => {
    if (!tauri.isAvailable || sourcePaths.length === 0) return [];
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return [];
    }

    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      let workspace = state.workspace;
      if (!workspace && capabilities.usesAppPrivateVault) {
        if (state.lastWorkspacePath) {
          try {
            workspace = await tauri.openWorkspace(state.lastWorkspacePath);
          } catch {
            // A stale app-private path should not make an OS open-with request
            // fail. Fall back to the canonical default vault.
          }
        }
        if (!workspace) workspace = await tauri.openDefaultVault();
        const providerStatus = await tauri.inspectVaultProvider(workspace.rootPath);
        if (providerStatus.provider.kind === "externalMirror") {
          workspace = { ...workspace, name: providerStatus.provider.displayName };
        }
        dispatch({ type: "OPEN_WORKSPACE", workspace, providerStatus });
        addRecent({ kind: "workspace", name: workspace.name, path: workspace.rootPath });
      }
      if (!workspace) {
        dispatch({ type: "SET_STATUS", message: "Open a vault before importing files." });
        return [];
      }

      const targetFolder = targetFolderOverride ?? (
        state.currentKind === "folder"
          ? state.currentRelativePath
          : state.currentRelativePath.split("/").slice(0, -1).join("/")
      );
      const [nextWorkspace, imported] = await tauri.importExternalPaths(
        workspace.rootPath,
        sourcePaths,
        targetFolder,
      );
      dispatch({ type: "UPDATE_WORKSPACE", workspace: nextWorkspace });

      const firstFile = imported.find(
        (rel) => isMarkdownPath(rel) || isDiagramTextPath(rel) || isViewableAssetPath(rel),
      );
      if (firstFile) {
        const fullPath = `${nextWorkspace.rootPath}/${firstFile}`;
        if (isMarkdownPath(firstFile)) {
          await openMarkdownFile(fullPath, firstFile);
        } else if (isDiagramTextPath(firstFile)) {
          await openDiagramFile(fullPath, firstFile);
        } else {
          const node: FileTreeNode = {
            name: basename(firstFile),
            path: fullPath,
            relativePath: firstFile,
            kind: "asset",
            children: [],
          };
          dispatch({ type: "SELECT_TREE_NODE", node });
        }
      }
      dispatch({
        type: "SET_STATUS",
        message: imported.length === 1 ? `Imported ${imported[0]}.` : `Imported ${imported.length} items.`,
      });
      window.dispatchEvent(new CustomEvent("jtype:vault-folder-changed"));
      return imported;
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
      return [];
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [
    capabilities.usesAppPrivateVault,
    dispatch,
    isVaultReadOnly,
    openDiagramFile,
    openMarkdownFile,
    state.currentKind,
    state.currentRelativePath,
    state.lastWorkspacePath,
    state.workspace,
  ]);

  const chooseMarkdownFile = useCallback(async () => {
    if (!tauri.isAvailable) return;
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{
          name: "Markdown",
          extensions: capabilities.isMobile
            ? ["md", "markdown", "mdown", "mkd", "text/markdown", "text/plain"]
            : ["md", "markdown", "mdown", "mkd"],
        }],
        ...(capabilities.isMobile ? { pickerMode: "document" as const, fileAccessMode: "copy" as const } : {}),
      });
      if (!selected) return;
      const selectedPath = Array.isArray(selected) ? selected[0] : selected;
      if (selectedPath) {
        if (capabilities.isMobile) await importExternalSources([selectedPath]);
        else await openMarkdownFile(selectedPath);
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    }
  }, [capabilities.isMobile, dispatch, importExternalSources, openMarkdownFile]);

  const chooseWorkspaceFolder = useCallback(async () => {
    if (!tauri.isAvailable) return;
    if (capabilities.isMobile && capabilities.supportsExternalVault) {
      try {
        dispatch({ type: "SET_LOADING", isLoading: true });
        dispatch({ type: "SET_STATUS", message: "Choose a folder for this vault..." });
        const result = await tauri.initializeExternalVault();
        const workspace = { ...result.workspace, name: result.provider.displayName };
        const providerStatus = { provider: result.provider, pendingWriteBack: false };
        dispatch({ type: "OPEN_WORKSPACE", workspace, providerStatus });
        dispatch({
          type: "SET_STATUS",
          message: result.importedFiles > 0
            ? `External vault opened. Imported ${result.importedFiles} files.`
            : "External vault opened.",
        });
        addRecent({ kind: "workspace", name: result.provider.displayName, path: workspace.rootPath });
      } catch (error) {
        dispatch({ type: "SET_STATUS", message: String(error) });
      } finally {
        dispatch({ type: "SET_LOADING", isLoading: false });
      }
      return;
    }
    try {
      const selected = await open({ multiple: false, directory: true });
      if (!selected) return;
      const selectedPath = Array.isArray(selected) ? selected[0] : selected;
      if (selectedPath) await openWorkspace(selectedPath);
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    }
  }, [capabilities.isMobile, capabilities.supportsExternalVault, dispatch]);

  const openWorkspace = useCallback(async (path: string) => {
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_STATUS", message: "Opening..." });
      let workspace = await tauri.openWorkspace(path);
      const providerStatus = await tauri.inspectVaultProvider(workspace.rootPath);
      if (providerStatus.provider.kind === "externalMirror") {
        workspace = { ...workspace, name: providerStatus.provider.displayName };
      }
      dispatch({ type: "OPEN_WORKSPACE", workspace, providerStatus });
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
      let workspace = await tauri.openDefaultVault();
      const providerStatus = await tauri.inspectVaultProvider(workspace.rootPath);
      if (providerStatus.provider.kind === "externalMirror") {
        workspace = { ...workspace, name: providerStatus.provider.displayName };
      }
      dispatch({ type: "OPEN_WORKSPACE", workspace, providerStatus });
      dispatch({ type: "SET_STATUS", message: workspace.metadataCreated ? "Default vault created." : "Default vault opened." });
      addRecent({ kind: "workspace", name: workspace.name, path: workspace.rootPath });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch]);

  const refreshVaultProvider = useCallback(async () => {
    if (!tauri.isAvailable || !state.workspace) return null;
    try {
      const status = await tauri.inspectVaultProvider(state.workspace.rootPath);
      dispatch({ type: "SET_VAULT_PROVIDER_STATUS", status });
      return status;
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
      return null;
    }
  }, [dispatch, state.workspace]);

  const reconcileExternalVault = useCallback(async () => {
    const status = state.vaultProviderStatus;
    if (!state.workspace || status?.provider.kind !== "externalMirror") return;
    if (state.isDirty) {
      dispatch({ type: "SET_STATUS", message: "Save or discard the current edit before checking external changes." });
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_STATUS", message: status.pendingWriteBack ? "Finishing interrupted changes..." : "Checking external changes..." });
      if (status.pendingWriteBack) {
        const result = await tauri.writeBackExternalVault(status.provider.providerId);
        const workspace = { ...result.workspace, name: result.provider.displayName };
        dispatch({ type: "UPDATE_WORKSPACE", workspace });
        dispatch({
          type: "SET_VAULT_PROVIDER_STATUS",
          status: { provider: result.provider, pendingWriteBack: result.pendingJournal },
        });
        dispatch({ type: "SET_EXTERNAL_VAULT_CONFLICTS", conflicts: result.conflicts });
        if (result.conflicts.length > 0) {
          dispatch({ type: "SET_EXTERNAL_VAULT_CONFLICT_DIALOG", open: true });
        }
        dispatch({
          type: "SET_STATUS",
          message: result.status === "conflict"
            ? "External vault has changes that need your choice."
            : "Interrupted external changes were completed.",
        });
      } else {
        const result = await tauri.reconcileExternalVault(status.provider.providerId);
        const workspace = { ...result.workspace, name: result.provider.displayName };
        dispatch({ type: "UPDATE_WORKSPACE", workspace });
        dispatch({
          type: "SET_VAULT_PROVIDER_STATUS",
          status: { provider: result.provider, pendingWriteBack: false },
        });
        dispatch({ type: "SET_EXTERNAL_VAULT_CONFLICTS", conflicts: result.conflicts });
        if (result.conflicts.length > 0) {
          dispatch({ type: "SET_EXTERNAL_VAULT_CONFLICT_DIALOG", open: true });
        }
        dispatch({
          type: "SET_STATUS",
          message: result.status === "conflict"
            ? "External vault has changes that need your choice."
            : result.status === "pulled"
              ? `External vault updated: ${result.pulledFiles} files pulled.`
              : "External vault is up to date.",
        });
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
      try {
        const nextStatus = await tauri.inspectVaultProvider(state.workspace.rootPath);
        dispatch({ type: "SET_VAULT_PROVIDER_STATUS", status: nextStatus });
      } catch { /* keep the actionable operation error */ }
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.isDirty, state.vaultProviderStatus, state.workspace]);

  const resolveExternalVaultConflict = useCallback(async (
    relativePath: string,
    resolution: ExternalVaultConflictResolution,
  ) => {
    const status = state.vaultProviderStatus;
    if (!state.workspace || status?.provider.kind !== "externalMirror") return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_STATUS", message: `Resolving external conflict for ${relativePath}...` });
      const result = await tauri.resolveExternalVaultConflict(
        status.provider.providerId,
        relativePath,
        resolution,
      );
      dispatch({
        type: "UPDATE_WORKSPACE",
        workspace: { ...result.workspace, name: result.provider.displayName },
      });
      dispatch({
        type: "SET_VAULT_PROVIDER_STATUS",
        status: { provider: result.provider, pendingWriteBack: result.pendingWriteBack },
      });
      dispatch({ type: "SET_EXTERNAL_VAULT_CONFLICTS", conflicts: result.conflicts });
      if (result.conflicts.length === 0) {
        dispatch({ type: "SET_EXTERNAL_VAULT_CONFLICT_DIALOG", open: false });
        dispatch({ type: "SET_STATUS", message: "External vault conflicts resolved." });
      } else {
        dispatch({
          type: "SET_STATUS",
          message: `${result.conflicts.length} external vault conflict${result.conflicts.length === 1 ? " remains" : "s remain"}.`,
        });
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.vaultProviderStatus, state.workspace]);

  const reauthorizeExternalVault = useCallback(async () => {
    const status = state.vaultProviderStatus;
    if (!state.workspace || status?.provider.kind !== "externalMirror") return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_STATUS", message: "Choose this external vault again..." });
      const provider = await tauri.reauthorizeExternalVault(status.provider.providerId);
      const nextStatus = await tauri.inspectVaultProvider(state.workspace.rootPath);
      dispatch({
        type: "SET_VAULT_PROVIDER_STATUS",
        status: { ...nextStatus, provider },
      });
      dispatch({ type: "SET_STATUS", message: nextStatus.pendingWriteBack ? "Access restored. Finish the interrupted changes." : "External vault access restored." });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.vaultProviderStatus, state.workspace]);

  // Promote a draft into a file inside the current workspace. Mirrors
  // createDocument() but writes the draft's existing content and dispatches
  // COMMIT_DRAFT (not OPEN_FILE) so we don't re-read the file from disk.
  const commitDraftToWorkspace = useCallback(async (relativePath: string, baseDir = "") => {
    if (!state.workspace) return;
    if (!state.isDraft) return;
    let trimmed = relativePath.trim();
    if (!trimmed) return;
    if (!isMarkdownPath(trimmed)) {
      trimmed = `${trimmed}.md`;
    }
    // Bare names are created in the active folder (where the user is), not the root.
    if (baseDir && !trimmed.includes("/")) {
      trimmed = `${baseDir.replace(/\/+$/, "")}/${trimmed}`;
    }
    const content = state.editorContent;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_STATUS", message: t`Saving...` });
      // createEntry writes an empty placeholder + guards against name collisions.
      const workspace = await tauri.createEntry(state.workspace.rootPath, trimmed, "markdown");
      await tauri.writeFile(`${workspace.rootPath}/${trimmed}`, content);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      dispatch({ type: "COMMIT_DRAFT", path: `${workspace.rootPath}/${trimmed}`, relativePath: trimmed });
      addRecent({ kind: "file", name: basename(`${workspace.rootPath}/${trimmed}`), path: `${workspace.rootPath}/${trimmed}` });
      dispatch({ type: "SET_STATUS", message: t`Saved ${trimmed}.` });
      // Notify cloud so web clients see the new document immediately.
      if (tauri.isAvailable && getCloudContext()) {
        try {
          await cloudRest("/documents/save", "POST", { relativePath: trimmed, title: "", content });
        } catch (e) {
          console.log("[commitDraft] /documents/save failed for:", trimmed, e);
        }
      }
      await onAfterSaveRef.current?.();
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.workspace, state.isDraft, state.editorContent, getCloudContext, cloudRest]);

  // "Save as" for a draft. Inside a workspace, open the NewResourceDialog so
  // the user picks a name/folder with the familiar vault UX. Outside any
  // workspace (empty/single-file origin), fall back to the OS save() dialog.
  const saveDraftAs = useCallback(async () => {
    if (!state.isDraft) return;
    if (state.workspace) {
      dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: true, fromDraft: true });
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_STATUS", message: t`Saving...` });
      const selected = await save({
        defaultPath: "Untitled.md",
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd"] }],
      });
      if (!selected) {
        dispatch({ type: "SET_LOADING", isLoading: false });
        return;
      }
      await tauri.writeFile(selected, state.editorContent);
      // No workspace is open in this branch (the workspace branch returns early
      // above), so the saved file is a standalone single file with no relative path.
      dispatch({ type: "COMMIT_DRAFT", path: selected, relativePath: "" });
      addRecent({ kind: "file", name: basename(selected), path: selected });
      dispatch({ type: "SET_STATUS", message: t`Saved ${basename(selected)}.` });
      await onAfterSaveRef.current?.();
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, state.isDraft, state.workspace, state.editorContent]);

  // `contentOverride` lets a canvas editor (Excalidraw) hand us the latest
  // serialized scene synchronously on Ctrl+S, bypassing its onChange debounce so
  // we never persist a stale snapshot.
  const saveCurrentFile = useCallback(async (contentOverride?: string) => {
    // A draft has no disk path yet — route to the "save as" flow instead of
    // silently no-op'ing (which the old `if (!state.currentPath) return` did).
    if (state.isDraft) return saveDraftAs();
    if (!state.currentPath) return;
    const isMarkdownDoc = state.currentKind === "markdown";
    // Editable diagram resources (Mermaid `.mmd`, Excalidraw) save as text too.
    const isEditableDiagram = state.currentKind === "diagram" && isEditableResourcePath(state.currentPath);
    if (!isMarkdownDoc && !isEditableDiagram) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    const content = contentOverride ?? state.editorContent;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      dispatch({ type: "SET_STATUS", message: "Saving..." });
      // Sync the override into state first so SAVE_FILE clears the dirty flag
      // against the content we're actually writing to disk.
      if (contentOverride !== undefined && contentOverride !== state.editorContent) {
        dispatch({ type: "SET_EDITOR_CONTENT", content });
      }
      if (isMarkdownDoc) {
        await tauri.writeFile(state.currentPath, content);
      } else {
        await tauri.writeDiagramFile(state.currentPath, content);
      }
      dispatch({ type: "SAVE_FILE" });
      dispatch({ type: "SET_STATUS", message: `Saved ${state.currentRelativePath || basename(state.currentPath)}.` });
      await onAfterSaveRef.current?.();
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, isVaultReadOnly, saveDraftAs, state.isDraft, state.currentPath, state.currentKind, state.editorContent, state.currentRelativePath]);

  const exportCurrentMarkdown = useCallback(async () => {
    if (!state.currentPath || state.currentKind !== "markdown") return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const defaultName = basename(state.currentPath).replace(/\.(md|markdown|mdown|mkd)$/i, ".md");
      if (capabilities.isMobile) {
        await tauri.shareMarkdown(defaultName, state.editorContent);
        dispatch({ type: "SET_STATUS", message: `Opened system sharing for ${defaultName}.` });
        return;
      }
      const selected = await save({
        defaultPath: defaultName,
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd"] }],
      });
      if (!selected) return;
      await tauri.writeFile(selected, state.editorContent);
      dispatch({ type: "SET_STATUS", message: `Exported Markdown to ${selected}.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [capabilities.isMobile, dispatch, state.currentPath, state.currentKind, state.editorContent]);

  const createDocument = useCallback(async (relativePath: string, baseDir = "") => {
    if (!state.workspace) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    let trimmed = relativePath.trim();
    if (!trimmed) return;
    if (!isMarkdownPath(trimmed)) {
      trimmed = `${trimmed}.md`;
    }
    // Bare names are created in the active folder (where the user is), not the root.
    if (baseDir && !trimmed.includes("/")) {
      trimmed = `${baseDir.replace(/\/+$/, "")}/${trimmed}`;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const workspace = await tauri.createEntry(state.workspace.rootPath, trimmed, "markdown");
      console.log("[createDoc] file created locally:", trimmed);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      await openMarkdownFile(`${workspace.rootPath}/${trimmed}`, trimmed);
      // Notify cloud via REST so web clients see the new document immediately.
      if (tauri.isAvailable && getCloudContext()) {
        try {
          const content = await tauri.readFile(`${workspace.rootPath}/${trimmed}`);
          console.log("[createDoc] calling /documents/save for:", trimmed);
          await cloudRest("/documents/save", "POST", { relativePath: trimmed, title: "", content });
          console.log("[createDoc] /documents/save completed for:", trimmed);
        } catch (e) {
          console.log("[createDoc] /documents/save failed for:", trimmed, e);
        }
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, isVaultReadOnly, state.workspace, openMarkdownFile, getCloudContext, cloudRest]);

  /**
   * Create a new diagram resource (Mermaid `.mmd`, Excalidraw `.excalidraw`, …)
   * with starter content and open it in-pane. `relativePath` must already carry
   * the correct extension.
   */
  const createDiagram = useCallback(async (relativePath: string, starter = "", baseDir = "") => {
    if (!state.workspace) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    let trimmed = relativePath.trim();
    if (!trimmed) return;
    if (baseDir && !trimmed.includes("/")) {
      trimmed = `${baseDir.replace(/\/+$/, "")}/${trimmed}`;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const workspace = await tauri.createEntry(state.workspace.rootPath, trimmed, "diagram");
      const fullPath = `${workspace.rootPath}/${trimmed}`;
      if (starter) await tauri.writeDiagramFile(fullPath, starter);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      await openDiagramFile(fullPath, trimmed);
      // Notify cloud so web clients see the new file immediately.
      if (tauri.isAvailable && getCloudContext()) {
        try {
          const content = await tauri.readDiagramFile(fullPath);
          await cloudRest("/documents/save", "POST", { relativePath: trimmed, title: "", content });
        } catch { /* non-critical */ }
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, isVaultReadOnly, state.workspace, openDiagramFile, getCloudContext, cloudRest]);

  /**
   * Create a new `.board` view file (kanban over card-notes) and open it in-pane.
   * The board's cards are ordinary `.md` notes with `board: <id>` frontmatter.
   */
  const createBoard = useCallback(async (name: string, baseDir = "") => {
    if (!state.workspace) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return;
    const dir = baseDir ? `${baseDir.replace(/\/+$/, "")}/` : "";
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const id = `b_${Math.random().toString(36).slice(2, 10)}`;
      const config: BoardConfig = {
        id,
        title: trimmed,
        groupBy: "status",
        columns: [
          { key: "todo", name: "To do" },
          { key: "doing", name: "Doing" },
          { key: "done", name: "Done" },
        ],
      };
      const relativePath = `${dir}${trimmed}.board`;
      const workspace = await tauri.createBoard(
        state.workspace.rootPath,
        relativePath,
        JSON.stringify(config, null, 2),
      );
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      const node: FileTreeNode = {
        name: `${trimmed}.board`,
        path: `${workspace.rootPath}/${relativePath}`,
        relativePath,
        kind: "board",
        children: [],
      };
      dispatch({ type: "SELECT_TREE_NODE", node });
      dispatch({ type: "SET_STATUS", message: `Created board ${trimmed}.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, isVaultReadOnly, state.workspace]);

  /**
   * Import a binary asset (image, PDF) from disk into the current vault and open
   * it in the read-only resource viewer. Local-only for now (no cloud upload).
   */
  const importAsset = useCallback(async (targetFolder = "") => {
    if (!tauri.isAvailable || !state.workspace) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Files",
            extensions: capabilities.isMobile
              ? [
                  "md", "markdown", "mdown", "mkd",
                  "png", "jpg", "jpeg", "gif", "webp", "svg", "pdf",
                  "drawio", "excalidraw", "mmd", "mermaid", "json", "yaml", "yml",
                  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
                  "application/pdf", "application/json", "application/yaml", "text/markdown", "text/yaml", "text/plain",
                ]
              : [
                  "png", "jpg", "jpeg", "gif", "webp", "svg", "pdf",
                  "drawio", "excalidraw", "mmd", "mermaid", "json", "yaml", "yml",
                ],
          },
        ],
        ...(capabilities.isMobile ? { pickerMode: "document" as const, fileAccessMode: "copy" as const } : {}),
      });
      if (!selected) return;
      const sourcePath = Array.isArray(selected) ? selected[0] : selected;
      if (!sourcePath) return;
      if (!capabilities.isMobile) {
        const fileName = basename(sourcePath);
        if (!isDiagramTextPath(fileName) && !isViewableAssetPath(fileName)) {
          dispatch({ type: "SET_STATUS", message: `Can not import ${fileName}: unsupported file type.` });
          return;
        }
      }
      await importExternalSources([sourcePath], targetFolder);
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [capabilities.isMobile, dispatch, importExternalSources, isVaultReadOnly, state.workspace]);

  const renameEntry = useCallback(async (fromRelativePath: string, toRelativePath: string, updateLinks: boolean) => {
    if (!state.workspace) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const impacted = updateLinks ? await findLinkImpacts(fromRelativePath) : [];
      const workspace = await tauri.renameEntry(state.workspace.rootPath, fromRelativePath, toRelativePath);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      if (updateLinks) await updateLinksAfterRename(impacted, fromRelativePath, toRelativePath);
      if (isMarkdownPath(toRelativePath)) {
        await openMarkdownFile(`${workspace.rootPath}/${toRelativePath}`, toRelativePath);
      } else if (isDiagramTextPath(toRelativePath)) {
        // Re-point the editor at the renamed diagram so saves don't target the old path.
        await openDiagramFile(`${workspace.rootPath}/${toRelativePath}`, toRelativePath);
      } else {
        dispatch({ type: "SET_STATUS", message: `Renamed entry to ${toRelativePath}.` });
      }
      window.dispatchEvent(new CustomEvent("jtype:vault-folder-changed"));
      // Cloud hook: notify rename so web clients see the move immediately
      cloudRest("/documents/rename", "POST", { fromRelativePath, toRelativePath });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, isVaultReadOnly, state.workspace, openMarkdownFile, openDiagramFile, getCloudContext, cloudRest]);

  const renameCurrentEntry = useCallback(async () => {
    if (!state.workspace || !state.currentRelativePath) return;
    const fromRelativePath = state.currentRelativePath;
    const nextPath = (await prompt("Move or rename path", fromRelativePath))?.trim();
    if (!nextPath || nextPath === fromRelativePath) return;
    const impacted = await findLinkImpacts(fromRelativePath);
    let updateLinks = false;
    if (impacted.length > 0) {
      updateLinks = await confirm(
        `Rename impact:\n\n${impacted.length} Markdown file(s) link to ${fromRelativePath}.\n\nChoose OK to rename and update links, or Cancel to rename only.`,
        { title: "Rename impact" }
      );
    }
    await renameEntry(fromRelativePath, nextPath, updateLinks);
  }, [dispatch, state.workspace, state.currentRelativePath, renameEntry, prompt]);

  const deleteEntry = useCallback(async (relativePath: string) => {
    if (!state.workspace || !relativePath) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    const confirmed = await confirm(`Move ${relativePath} to trash?`, { title: "Move to trash" });
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
  }, [dispatch, isVaultReadOnly, state.workspace, state.currentRelativePath]);

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
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      // Find the cloud trash ID and relativePath before restoring.
      // Metadata stores cloud items with trashId = `cloud_${id}`, so we must
      // look up via relativePath from the local trash list first.
      let cloudTrashId: string | undefined;
      let relPath: string | undefined;
      if (tauri.isAvailable) {
        try {
          const localItems = await tauri.listTrash(state.workspace.rootPath);
          const localItem = localItems.find((i) => i.trashId === trashId);
          relPath = localItem?.relativePath;
          if (relPath) {
            const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
            const cloudItem = meta.items.find(
              (i) => i.relativePath === relPath && i.source === "cloud"
            );
            cloudTrashId = cloudItem?.cloudTrashId;
          }
        } catch { /* ignore */ }
      }
      const workspace = await tauri.restoreFromTrash(state.workspace.rootPath, trashId);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      dispatch({ type: "SET_STATUS", message: "Restored from trash." });
      // Notify cloud via REST for real-time sync across clients
      if (tauri.isAvailable && cloudTrashId) {
        try {
          await cloudRest(`/trash/${cloudTrashId}/restore`, "POST", {});
        } catch { /* non-critical */ }
      }
      // Clean up local trash metadata (match by relativePath so cloud entries are removed too)
      if (tauri.isAvailable) {
        try {
          const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
          if (relPath) {
            meta.items = meta.items.filter(
              (i) => !(i.relativePath === relPath && (i.trashId === trashId || i.source === "cloud")),
            );
          } else {
            meta.items = meta.items.filter((i) => i.trashId !== trashId);
          }
          await tauri.saveTrashMetadata(state.workspace.rootPath, meta);
        } catch { /* non-critical */ }
      }
      window.dispatchEvent(new CustomEvent("jtype:vault-restored"));
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, isVaultReadOnly, state.workspace]);

  const emptyTrash = useCallback(async () => {
    if (!state.workspace) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    const confirmed = await confirm("Empty trash permanently?", { title: "Empty trash", destructive: true });
    if (!confirmed) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      await tauri.emptyTrash(state.workspace.rootPath);
      dispatch({ type: "SET_STATUS", message: "Trash emptied." });
      // Notify cloud via REST for real-time sync across clients
      if (tauri.isAvailable) {
        try {
          await cloudRest("/trash", "DELETE");
        } catch { /* non-critical */ }
      }
      // Clean up local trash metadata and refresh workspace
      if (tauri.isAvailable) {
        try {
          const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
          meta.pendingTrashOps = [];
          meta.items = [];
          await tauri.saveTrashMetadata(state.workspace.rootPath, meta);
          const workspace = await tauri.openWorkspace(state.workspace.rootPath);
          dispatch({ type: "UPDATE_WORKSPACE", workspace });
        } catch { /* non-critical */ }
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, isVaultReadOnly, state.workspace]);

  const permanentDeleteTrash = useCallback(async (trashId: string) => {
    if (!state.workspace) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    try {
      // Find the cloud trash ID and relativePath before deleting.
      // Metadata stores cloud items with trashId = `cloud_${id}`, so we must
      // look up via relativePath from the local trash list first.
      let cloudTrashId: string | undefined;
      let relPath: string | undefined;
      if (tauri.isAvailable) {
        try {
          const localItems = await tauri.listTrash(state.workspace.rootPath);
          const localItem = localItems.find((i) => i.trashId === trashId);
          relPath = localItem?.relativePath;
          if (relPath) {
            const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
            const cloudItem = meta.items.find(
              (i) => i.relativePath === relPath && i.source === "cloud"
            );
            cloudTrashId = cloudItem?.cloudTrashId;
          }
        } catch { /* ignore */ }
      }
      await tauri.permanentDeleteTrash(state.workspace.rootPath, trashId);
      dispatch({ type: "SET_STATUS", message: "Item permanently deleted." });
      // Notify cloud via REST for real-time sync across clients
      if (tauri.isAvailable && cloudTrashId) {
        try {
          await cloudRest(`/trash/${cloudTrashId}`, "DELETE");
        } catch { /* non-critical */ }
      }
      // Clean up local trash metadata (match by relativePath so cloud entries are removed too)
      if (tauri.isAvailable) {
        try {
          const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
          if (relPath) {
            meta.items = meta.items.filter(
              (i) => !(i.relativePath === relPath && (i.trashId === trashId || i.source === "cloud")),
            );
          } else {
            meta.items = meta.items.filter((i) => i.trashId !== trashId);
          }
          await tauri.saveTrashMetadata(state.workspace.rootPath, meta);
          const workspace = await tauri.openWorkspace(state.workspace.rootPath);
          dispatch({ type: "UPDATE_WORKSPACE", workspace });
        } catch { /* non-critical */ }
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    }
  }, [dispatch, isVaultReadOnly, state.workspace]);

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
    const next = writeFrontmatter(current, { title });
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

  // Latest-value ref so the once-registered OS drop listener (below) always uses
  // current state instead of the values captured at mount time.
  const dropHandlerRef = useRef<(paths: string[]) => void>(() => {});
  dropHandlerRef.current = (paths: string[]) => {
    if (paths.length === 0) return;
    if (state.workspace) {
      // A vault is open: copy the dropped files/folders into it.
      void importExternalSources(paths);
    } else {
      // No vault yet (onboarding): open a dropped markdown file, or treat a
      // dropped folder as a vault to open.
      const firstMarkdownPath = paths.find(isMarkdownPath);
      if (firstMarkdownPath) void openMarkdownFile(firstMarkdownPath);
      else if (paths[0]) void openWorkspace(paths[0]);
    }
  };

  const registerDragDrop = useCallback(async () => {
    if (!tauri.isAvailable) return;
    const webview = getCurrentWebview();
    await webview.onDragDropEvent((event) => {
      if (event.payload.type !== "drop") return;
      dropHandlerRef.current(event.payload.paths);
    });
  }, []);

  const createFolder = useCallback(async (folderRelativePath: string) => {
    if (!state.workspace) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const workspace = await tauri.createFolder(state.workspace.rootPath, folderRelativePath);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      dispatch({ type: "SET_STATUS", message: `Created folder ${folderRelativePath}.` });
      // Notify cloud via REST so other clients refresh their folder list.
      if (tauri.isAvailable && getCloudContext()) {
        try {
          await cloudRest("/folders", "POST", { relativePath: folderRelativePath });
        } catch { /* non-critical */ }
      }
      // Trigger full sync push so the folder reliably reaches the server.
      window.dispatchEvent(new CustomEvent("jtype:vault-folder-changed"));
      return workspace;
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, isVaultReadOnly, state.workspace, getCloudContext, cloudRest]);

  const renameFolder = useCallback(async (fromRelativePath: string, toRelativePath: string) => {
    if (!state.workspace) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const [workspace] = await tauri.renameFolder(state.workspace.rootPath, fromRelativePath, toRelativePath);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      dispatch({ type: "SET_STATUS", message: `Renamed folder to ${toRelativePath}.` });
      window.dispatchEvent(new CustomEvent("jtype:vault-folder-changed"));
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, isVaultReadOnly, state.workspace]);

  const moveFolder = useCallback(async (fromRelativePath: string, toRelativePath: string) => {
    if (!state.workspace) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const [workspace] = await tauri.moveFolder(state.workspace.rootPath, fromRelativePath, toRelativePath);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      dispatch({ type: "SET_STATUS", message: `Moved folder to ${toRelativePath}.` });
      window.dispatchEvent(new CustomEvent("jtype:vault-folder-changed"));
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, isVaultReadOnly, state.workspace]);

  const deleteFolder = useCallback(async (folderRelativePath: string, softDelete = true, skipConfirm = false) => {
    if (!state.workspace) return;
    if (isVaultReadOnly) {
      dispatch({ type: "SET_STATUS", message: "This vault is read-only." });
      return;
    }
    if (!skipConfirm) {
      const confirmed = await confirm(`Delete folder "${folderRelativePath}" and move all documents to trash?`, { title: "Delete folder", destructive: true });
      if (!confirmed) return;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const [workspace, impacted] = await tauri.deleteFolder(state.workspace.rootPath, folderRelativePath, softDelete);
      dispatch({ type: "UPDATE_WORKSPACE", workspace });
      if (state.currentRelativePath.startsWith(`${folderRelativePath}/`)) {
        dispatch({ type: "CLEAR_DOCUMENT" });
      }
      dispatch({ type: "SET_STATUS", message: `Deleted folder ${folderRelativePath}. ${impacted.length} document(s) moved to trash.` });
      // Trigger full sync push so the folder deletion reliably reaches the server.
      // The sync push includes deletedFolders which handles the folder deletion on the cloud.
      window.dispatchEvent(new CustomEvent("jtype:vault-folder-changed"));
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [dispatch, isVaultReadOnly, state.workspace, state.currentRelativePath]);

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

  // Remove a recent item (vault or Markdown file) from the list. If it had a
  // cloud binding, unbind locally (delete binding entry + .jtype/sync-base);
  // the reducer only resets sync state when this is the *current* vault, so
  // removing other entries is safe. Never touches cloud data or local files.
  const removeRecentItem = useCallback(async (path: string) => {
    const items = readRecentItems();
    const item = items.find((it) => normalizePath(it.path) === normalizePath(path));
    const name = item?.name ?? path.split("/").pop() ?? path;
    const binding = state.vaultBindings.find((it) => it.localVaultPath === path);
    let warning = "";
    if (binding && tauri.isAvailable) {
      try {
        await tauri.unbindCloudWorkspace(binding.workspaceId, path);
      } catch (error) {
        warning = t` (cloud unbind failed: ${String(error)})`;
      }
      dispatch({
        type: "DISCONNECT_WORKSPACE",
        workspaceId: binding.workspaceId,
        vaultPath: path,
      });
    }
    removeRecentItemEntry(path);
    dispatch({
      type: "SET_STATUS",
      message: binding
        ? t`Removed "${name}" from the list and unbound cloud sync (local files kept).${warning}`
        : t`Removed "${name}" from the list.`,
    });
  }, [dispatch, state.vaultBindings]);
  /** @deprecated use {@link removeRecentItem} — kept for clarity of intent. */
  const removeVaultFromList = removeRecentItem;

  return {
    openMarkdownFile,
    openDiagramFile,
    chooseMarkdownFile,
    chooseWorkspaceFolder,
    openWorkspace,
    openDefaultVault,
    refreshVaultProvider,
    reconcileExternalVault,
    resolveExternalVaultConflict,
    reauthorizeExternalVault,
    saveCurrentFile,
    saveDraftAs,
    commitDraftToWorkspace,
    exportCurrentMarkdown,
    createDocument,
    createDiagram,
    createBoard,
    importAsset,
    importExternalSources,
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
    renameEntry,
    removeRecentItem,
    removeVaultFromList,
  };
}

function addRecent(item: RecentItem) {
  const nextItems = [item, ...readRecentItems().filter((recent) => recent.path !== item.path)].slice(0, 12);
  appStorage.set("recent", nextItems);
}

export function readRecentItems(): RecentItem[] {
  return appStorage.get("recent", []);
}

function removeRecentEntry(rootPath: string, relativePath: string) {
  const targetPath = normalizePath(`${rootPath}/${relativePath}`);
  const nextItems = readRecentItems().filter((item) => normalizePath(item.path) !== targetPath);
  appStorage.set("recent", nextItems);
}

function removeRecentItemEntry(path: string) {
  const targetPath = normalizePath(path);
  const nextItems = readRecentItems().filter((item) => normalizePath(item.path) !== targetPath);
  appStorage.set("recent", nextItems);
}
