import { useRef, useEffect, useCallback, useState } from "react";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { renderToContainer } from "@shared/lib/markdown";
import { parseFrontmatter, writeFrontmatter } from "@shared/lib/frontmatter";
import { basename, normalizePath } from "../../lib/utils";
import { useCommandsList } from "../../app/App";
import { addMarkdownTableColumn, addMarkdownTableRow, formatMarkdownTable, insertBlockAtSafeCursor, insertOrEditTable } from "../../hooks/useCommands";
import { useEagerSync } from "../../hooks/useEagerSync";
import { useConfirm } from "@shared/components/PromptDialogContext";
import { httpRequest } from "@shared/lib/http";
import type { EditorMode } from "@shared/lib/types";
import { useScrollSync, useFloatingTooltip } from "@shared/hooks";
import { ViewModeToggle, FloatingTooltip } from "@shared/components";
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  CodeBracketIcon,
  TableCellsIcon,
  VariableIcon,
  ShareIcon,
  ClipboardDocumentCheckIcon,
  InformationCircleIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  CheckCircleIcon,
  StarIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  LinkSlashIcon,
} from "@heroicons/react/24/outline";

type PublishStatusResponse = {
  documentId: string;
  isPublished: boolean;
  publishedAt: string | null;
  currentHash: string;
  publishedHash: string | null;
  hasUnpublishedChanges: boolean;
};

export function EditorShell() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const commands = useCommandsList();
  const confirm = useConfirm();
  const { pushSingleDocument } = useEagerSync();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [publishState, setPublishState] = useState<PublishStatusResponse | null>(null);
  const { tooltip: floatingTooltip, tooltipProps } = useFloatingTooltip();

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.value = state.editorContent;
    }
  }, [state.currentPath, state.editorContentVersion]);

  useEffect(() => {
    if (!previewRef.current || state.currentKind !== "markdown") return;
    // Skip rendering when preview is not visible (write mode)
    if (state.editorMode === "write") return;
    // Debounce preview rendering to avoid rapid DOM thrashing
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    const container = previewRef.current;
    const content = state.editorContent;
    previewTimerRef.current = setTimeout(() => {
      void renderToContainer(content, container);
    }, 120);
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [state.editorContent, state.currentKind, state.editorMode]);

  const fileName = state.currentPath ? basename(state.currentPath) : "No file selected";
  const isMarkdown = state.currentKind === "markdown";
  const documentLocation = (() => {
    const sourcePath = state.currentRelativePath || state.currentPath;
    if (!sourcePath) return "";
    const parts = normalizePath(sourcePath).split("/").filter(Boolean);
    return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
  })();

  const getGridClass = (mode: EditorMode) => {
    if (mode === "write") return "editor-preview-grid view-mode-write";
    if (mode === "preview") return "editor-preview-grid view-mode-preview";
    return "editor-preview-grid view-mode-split";
  };

  const fileStateLabel = state.isDirty ? "Unsaved changes" : "";
  const currentVaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const currentVaultBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const isCloudViewer = Boolean(currentVaultBinding?.workspaceRole === "viewer" && currentVaultSettings?.cloudSyncEnabled !== false);
  const canEditMarkdown = isMarkdown && !isCloudViewer;
  const canPublishToCloud = Boolean(isMarkdown && state.mode === "workspace" && currentVaultBinding && state.syncToken && state.cloudProfile?.token && currentVaultSettings?.cloudSyncEnabled !== false);
  const isPublished = Boolean(publishState?.isPublished);
  const hasUnpublishedChanges = Boolean(isPublished && (state.isDirty || publishState?.hasUnpublishedChanges));
  const cloudWs = currentVaultBinding ? state.cloudWorkspaces.find((w) => w.id === currentVaultBinding.workspaceId) : undefined;
  const wsSlug = cloudWs?.slug || currentVaultBinding?.workspaceSlug || "";
  const publishedUrl = (state.syncSiteUrl || state.cloudProfile?.siteUrl) && wsSlug && state.currentRelativePath
    ? `${(state.syncSiteUrl || state.cloudProfile?.siteUrl || "").replace(/\/$/, "")}/${wsSlug}/${normalizePath(state.currentRelativePath).replace(/\.(md|markdown|mdown|mkd)$/i, "")}`
    : "";

  const handleInput = useCallback(() => {
    if (isCloudViewer) return;
    const content = editorRef.current?.value ?? "";
    dispatch({ type: "SET_EDITOR_CONTENT", content });
  }, [dispatch, isCloudViewer]);

  const isFavorite = (() => {
    if (!state.currentPath) return false;
    const key = `jtype.favorites:${state.workspace?.rootPath ?? "global"}`;
    const favorites: string[] = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return favorites.includes(state.currentPath);
  })();

  const toggleFavorite = useCallback(() => {
    if (!state.currentPath) return;
    const key = `jtype.favorites:${state.workspace?.rootPath ?? "global"}`;
    const favorites: string[] = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    const next = favorites.includes(state.currentPath)
      ? favorites.filter((p) => p !== state.currentPath)
      : [state.currentPath, ...favorites];
    window.localStorage.setItem(key, JSON.stringify(next));
    dispatch({ type: "TOGGLE_FAVORITE" });
    dispatch({ type: "SET_STATUS", message: next.includes(state.currentPath) ? "Added to favorites." : "Removed from favorites." });
  }, [state.currentPath, state.workspace, state.editorContent, dispatch]);

  const runCommand = useCallback((id: string) => {
    const cmd = commands.find((c) => c.id === id);
    if (cmd && cmd.isEnabled()) cmd.run();
  }, [commands]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isCloudViewer) return;
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [isCloudViewer]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const cloudPublishRequest = useCallback(async <T,>(path: string, init: RequestInit = {}) => {
    if (!currentVaultBinding || !state.syncToken || !state.cloudProfile?.token) return null;
    const serviceUrl = (state.serviceUrl || state.cloudProfile?.serverUrl || "http://localhost:13345").trim().replace(/\/$/, "");
    const response = await httpRequest(`${serviceUrl}/api/v1/workspaces/${currentVaultBinding.workspaceId}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.syncToken}`,
        "x-device-id": state.cloudProfile?.deviceId ?? "desktop",
        "x-client-type": "desktop",
        ...(state.wsSessionId ? { "x-session-id": state.wsSessionId } : {}),
        ...(init.headers || {}),
      },
    });
    if (!response.ok) throw new Error(await response.text());
    if (response.status === 204) return null;
    return (await response.json()) as T;
  }, [currentVaultBinding, state.cloudProfile, state.serviceUrl, state.syncToken, state.wsSessionId]);

  const findCloudDocumentId = useCallback(async () => {
    if (!state.currentRelativePath) return "";
    const docs = await cloudPublishRequest<Array<{ id: string; relativePath: string }>>("/documents");
    const relativePath = normalizePath(state.currentRelativePath);
    return docs?.find((doc) => normalizePath(doc.relativePath) === relativePath)?.id ?? "";
  }, [cloudPublishRequest, state.currentRelativePath]);

  const refreshPublishState = useCallback(async () => {
    if (!canPublishToCloud || !state.currentRelativePath) {
      setPublishState(null);
      return;
    }
    try {
      const documentId = await findCloudDocumentId();
      if (!documentId) {
        setPublishState(null);
        return;
      }
      const next = await cloudPublishRequest<PublishStatusResponse>(`/documents/${documentId}/publish`);
      setPublishState(next);
    } catch {
      setPublishState(null);
    }
  }, [canPublishToCloud, cloudPublishRequest, findCloudDocumentId, state.currentRelativePath]);

  useEffect(() => {
    void refreshPublishState();
  }, [refreshPublishState]);

  const publishCurrentDocument = useCallback(async () => {
    if (!canPublishToCloud || !state.currentRelativePath) {
      dispatch({ type: "SET_STATUS", message: "Connect this vault to a cloud workspace before publishing." });
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const relativePath = state.currentRelativePath;
      const content = state.editorContent;
      if (state.isDirty) await fs.saveCurrentFile();
      await pushSingleDocument(relativePath, content);
      const documentId = await findCloudDocumentId();
      if (!documentId) throw new Error("Sync this document before publishing.");
      const result = await cloudPublishRequest<{ isPublished: boolean; publishedAt: string; contentHash: string }>(`/documents/${documentId}/publish`, { method: "POST", body: "{}" });
      const next = await cloudPublishRequest<PublishStatusResponse>(`/documents/${documentId}/publish`);
      setPublishState(next ?? (result ? {
        documentId,
        isPublished: result.isPublished,
        publishedAt: result.publishedAt,
        currentHash: result.contentHash,
        publishedHash: result.contentHash,
        hasUnpublishedChanges: false,
      } : null));
      dispatch({ type: "SET_STATUS", message: "Document published." });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [canPublishToCloud, cloudPublishRequest, dispatch, findCloudDocumentId, fs, pushSingleDocument, state.currentRelativePath, state.editorContent, state.isDirty]);

  const unpublishCurrentDocument = useCallback(async () => {
    if (!canPublishToCloud || !state.currentRelativePath) return;
    const ok = await confirm("Remove this document from the public site?", { destructive: true, confirmLabel: "Unpublish" });
    if (!ok) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const documentId = await findCloudDocumentId();
      if (!documentId) throw new Error("Cloud document not found.");
      await cloudPublishRequest(`/documents/${documentId}/publish`, { method: "DELETE" });
      await refreshPublishState();
      dispatch({ type: "SET_STATUS", message: "Document unpublished." });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [canPublishToCloud, cloudPublishRequest, confirm, dispatch, findCloudDocumentId, refreshPublishState, state.currentRelativePath]);

  useScrollSync(editorRef, previewRef, !!state.currentPath && state.currentKind === "markdown");

  return (
    <section className="flex min-h-0 flex-col bg-[#fbfdfb]">
      <div className="flex min-h-[56px] items-center justify-between gap-3 border-b border-black/[0.04] bg-white/60 px-5 backdrop-blur-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 items-baseline gap-1">
              {state.workspace && state.currentRelativePath && (
                <span className="shrink-0 truncate text-xs text-[#9aa6a1]">
                  {state.workspace.name}
                  {documentLocation ? ` / ${documentLocation.replace(/\//g, " / ")}` : ""}
                  {" / "}
                </span>
              )}
              <p className="truncate text-sm font-semibold text-stone-950">{fileName}</p>
            </div>
            {state.currentPath && (
              <button
                type="button"
                className={`editor-tool h-8 w-8 px-0 ${isFavorite ? "text-amber-500 hover:text-amber-600" : ""}`}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={isFavorite}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                onClick={toggleFavorite}
              >
                <StarIcon className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
              </button>
            )}
            {state.workspace && state.currentRelativePath && (
              <button
                type="button"
                className="editor-tool h-8 w-8 px-0 hover:text-red-700"
                aria-label="Move to trash"
                title="Move to trash"
                disabled={isCloudViewer}
                onClick={() => runCommand("file.delete")}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="header-action-group">
          {!state.isDirty || <span id="file-state" className="status-chip status-chip-warning">{fileStateLabel}</span>}
          {canPublishToCloud && canEditMarkdown && (!isPublished || hasUnpublishedChanges) && (
            <span className="header-tooltip header-tooltip-end group">
              <button
                className={`header-icon-button ${
                  hasUnpublishedChanges
                    ? "header-icon-button-warning"
                    : "header-icon-button-primary"
                }`}
                type="button"
                aria-label={hasUnpublishedChanges ? "Republish" : "Publish"}
                aria-disabled={state.isLoading}
                {...tooltipProps(hasUnpublishedChanges ? "Republish" : "Publish")}
                onClick={() => {
                  if (state.isLoading) return;
                  void publishCurrentDocument();
                }}
              >
                {hasUnpublishedChanges ? <ArrowPathIcon className="h-4 w-4" /> : <ArrowUpTrayIcon className="h-4 w-4" />}
              </button>
            </span>
          )}
          {isPublished && canEditMarkdown && (
            <button
              className="header-icon-button header-icon-button-danger"
              type="button"
              aria-label="Unpublish"
              aria-disabled={state.isLoading}
              {...tooltipProps("Unpublish")}
              onClick={() => {
                if (state.isLoading) return;
                void unpublishCurrentDocument();
              }}
            >
              <LinkSlashIcon className="h-4 w-4" />
            </button>
          )}
          {isCloudViewer && <span className="status-chip status-chip-neutral">Read-only</span>}
          {state.activeConflicts.length > 0 && (
            <button
              type="button"
              className="status-chip status-chip-warning cursor-pointer"
              onClick={() => dispatch({ type: "SET_CONFLICT_DIALOG", open: true })}
              title={`${state.activeConflicts.length} conflict${state.activeConflicts.length > 1 ? "s" : ""} to resolve`}
            >
              {state.activeConflicts.length} conflict{state.activeConflicts.length > 1 ? "s" : ""}
            </button>
          )}
          {state.currentPath && (
            <span className="header-tooltip header-tooltip-end group">
              <button
                className={`header-icon-button ${state.isDirty ? "header-icon-button-primary" : ""}`}
                type="button"
                aria-label={state.isDirty ? "Save" : "No unsaved changes"}
                aria-disabled={!canEditMarkdown || !state.isDirty}
                {...tooltipProps(state.isDirty ? "Save" : "No unsaved changes")}
                onClick={() => {
                  if (!canEditMarkdown || !state.isDirty) return;
                  const relPath = state.currentRelativePath;
                  const content = state.editorContent;
                  fs.saveCurrentFile().then(() => {
                    if (relPath && state.mode === "workspace") {
                      pushSingleDocument(relPath, content);
                    }
                  });
                }}
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
            </span>
          )}
        </div>
      </div>

      <div className="flex min-h-12 items-center gap-1 border-b border-black/[0.04] bg-[#fbfdfb] px-5">
        <EditorToolbarButton command="editor.bold" title="Bold - Ctrl+B" disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps("Bold - Ctrl+B")}>
          <BoldIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="editor.italic" title="Italic - Ctrl+I" disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps("Italic - Ctrl+I")}>
          <ItalicIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="editor.link" title="Link - Ctrl+K" disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps("Link - Ctrl+K")}>
          <LinkIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="editor.code" title="Inline code" disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps("Inline code")}>
          <CodeBracketIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="insert.table" title="Insert or edit table - Ctrl+Shift+T" disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps("Insert or edit table - Ctrl+Shift+T")}>
          <TableCellsIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="insert.math" title="Insert formula block" disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps("Insert formula block")}>
          <VariableIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="insert.mermaid" title="Insert Mermaid diagram" disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps("Insert Mermaid diagram")}>
          <ShareIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="insert.task" title="Task list" disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps("Task list")}>
          <ClipboardDocumentCheckIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <div className="ml-auto">
          <ViewModeToggle
            mode={state.editorMode}
            onModeChange={(mode) => dispatch({ type: "SET_EDITOR_MODE", mode })}
            tooltipProps={tooltipProps}
          />
        </div>
        <button className={`editor-tool ${state.documentPanelOpen ? "bg-[#e8f6f2] text-[#006f6b] ring-1 ring-[#008884]/15 hover:bg-[#e8f6f2] hover:text-[#006f6b]" : ""}`} type="button" aria-label="Document info" {...tooltipProps("Document info")} onClick={() => dispatch({ type: "TOGGLE_DOCUMENT_PANEL" })}>
          <InformationCircleIcon className="h-4 w-4" />
        </button>
        <button className="editor-tool" type="button" aria-label="Focus mode" {...tooltipProps("Focus mode")} onClick={() => dispatch({ type: "TOGGLE_FOCUS_MODE" })}>
          <ArrowsPointingOutIcon className="h-4 w-4" />
        </button>
      </div>

      <div id="workbench-body" className={`workbench-body grid min-h-0 flex-1 bg-[#fbfdfb] ${state.documentPanelOpen ? "grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-[minmax(0,1fr)]"}`}>
        <div className={getGridClass(state.editorMode)} style={{ position: "relative" }}>
          <textarea
            id="editor"
            ref={editorRef}
            className="h-full min-h-0 w-full resize-none bg-white/40 p-8 font-mono text-[13px] leading-7 text-stone-800 outline-none placeholder:text-[#9aa6a1]"
            style={{ position: "relative", zIndex: 2 }}
            spellCheck={false}
            aria-label="Markdown editor"
            placeholder="Open or drop a Markdown file to start editing."
            disabled={!isMarkdown}
            readOnly={isCloudViewer}
            onInput={handleInput}
            onContextMenu={handleContextMenu}
          />
          <article
            id="preview"
            ref={previewRef}
            className="preview empty min-h-0 overflow-y-auto overflow-x-hidden border-l border-black/[0.04] bg-[#f8fbf9] p-10"
            style={{ position: "relative", zIndex: 1 }}
          >
            <h2>Select a Markdown file</h2>
            <p>Your rendered document will appear here.</p>
          </article>
        </div>

        {state.documentPanelOpen && (
          <aside id="document-panel" className="min-h-0 overflow-y-auto border-l border-black/[0.04] bg-[#f6faf7] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-950">Document Info</p>
                <p className="text-xs text-[#6b7773]">Properties, outline, links, and publish.</p>
              </div>
              <button className="subtle-button aspect-square px-0" type="button" title="Hide" onClick={() => dispatch({ type: "TOGGLE_DOCUMENT_PANEL" })}>
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <PropertiesSection />
            <OutlineSection />
            {state.currentKind === "markdown" && (
              <PublishSection
                publishState={publishState}
                isPublished={isPublished}
                hasUnpublishedChanges={hasUnpublishedChanges}
                publishedUrl={publishedUrl}
                canPublish={canPublishToCloud && canEditMarkdown}
                isLoading={state.isLoading}
                onPublish={publishCurrentDocument}
                onUnpublish={unpublishCurrentDocument}
              />
            )}
            <LinksSection />
          </aside>
        )}
      </div>

      {contextMenu && (
        <div
          role="menu"
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { runCommand("editor.bold"); setContextMenu(null); }}><BoldIcon className="mr-2 h-3.5 w-3.5" />Bold</button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { runCommand("editor.link"); setContextMenu(null); }}><LinkIcon className="mr-2 h-3.5 w-3.5" />Insert link</button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { insertOrEditTable(); setContextMenu(null); }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" />Insert or format table</button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { addMarkdownTableRow(); setContextMenu(null); }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" />Add table row below</button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { addMarkdownTableColumn(); setContextMenu(null); }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" />Add table column right</button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { formatMarkdownTable(); setContextMenu(null); }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" />Format table</button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { insertBlockAtSafeCursor("\n$$\nE = mc^2\n$$\n"); setContextMenu(null); }}><VariableIcon className="mr-2 h-3.5 w-3.5" />Insert formula</button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { insertBlockAtSafeCursor("\n```mermaid\nflowchart TD\n  A --> B\n```\n"); setContextMenu(null); }}><ShareIcon className="mr-2 h-3.5 w-3.5" />Insert Mermaid diagram</button>
        </div>
      )}
      {floatingTooltip && (
        <FloatingTooltip label={floatingTooltip.label} x={floatingTooltip.x} y={floatingTooltip.y} />
      )}
    </section>
  );
}

function EditorToolbarButton({ title, disabled, runCommand, command, tooltipProps, children }: { title: string; disabled: boolean; runCommand: (id: string) => void; command: string; tooltipProps?: React.HTMLAttributes<HTMLButtonElement>; children: React.ReactNode }) {
  return (
    <button className="editor-tool" type="button" aria-label={title} aria-disabled={disabled} {...tooltipProps} onClick={() => { if (!disabled) runCommand(command); }}>
      {children}
    </button>
  );
}

function PropertiesSection() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const currentVaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const currentVaultBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const readOnly = Boolean(currentVaultBinding?.workspaceRole === "viewer" && currentVaultSettings?.cloudSyncEnabled !== false);
  if (state.currentKind !== "markdown") {
    return (
      <section id="properties-panel" className="document-info-section">
        <p className="text-sm text-stone-500">Open a Markdown file to edit frontmatter properties.</p>
      </section>
    );
  }
  const parsed = parseFrontmatter(state.editorContent);
  const basicFields = ["title", "description", "tags", "slug"];
  const advancedFields = ["createdAt", "updatedAt"];

  const updateField = (field: string, value: string) => {
    if (readOnly) return;
    const editor = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Markdown editor"]');
    if (!editor) return;
    const newContent = writeFrontmatter(editor.value, { [field]: value.trim() });
    editor.value = newContent;
    dispatch({ type: "SET_EDITOR_CONTENT", content: newContent });
  };

  return (
    <section id="properties-panel" className="document-info-section">
      <p className="text-sm font-semibold text-stone-950">Properties</p>
      <p className="mt-1 text-xs text-stone-500">Edits are written back to YAML frontmatter.</p>
      <div className="mt-3 space-y-3">
        {basicFields.map((field) => <PropertyField key={field} field={field} value={parsed.data[field] ?? ""} disabled={readOnly} onUpdate={updateField} />)}
        <details className="rounded-md border border-stone-200 bg-stone-50 p-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase text-stone-500">Advanced</summary>
          <div className="mt-3 space-y-3">
            {advancedFields.map((field) => <PropertyField key={field} field={field} value={parsed.data[field] ?? ""} disabled={readOnly} onUpdate={updateField} />)}
          </div>
        </details>
      </div>
    </section>
  );
}

function PropertyField({ field, value, disabled, onUpdate }: { field: string; value: string; disabled: boolean; onUpdate: (field: string, value: string) => void }) {
  return (
    <label className="block">
      <span className="field-label">{field}</span>
      {field === "description" ? (
        <textarea
          className="field-textarea"
          defaultValue={value}
          disabled={disabled}
          aria-label={field}
          onChange={(e) => onUpdate(field, e.target.value)}
          onBlur={(e) => onUpdate(field, e.target.value)}
        />
      ) : (
        <input
          className="field-input"
          defaultValue={value}
          disabled={disabled}
          aria-label={field}
          onChange={(e) => onUpdate(field, e.target.value)}
          onBlur={(e) => onUpdate(field, e.target.value)}
        />
      )}
    </label>
  );
}

function OutlineSection() {
  const state = useAppState();
  if (state.currentKind !== "markdown") {
    return (
      <section id="outline-panel" className="document-info-section">
        <p className="text-sm text-stone-500">Open a Markdown file to see its outline.</p>
      </section>
    );
  }
  const headings = state.editorContent.split("\n").flatMap((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    return match ? [{ level: match[1].length, title: match[2].trim(), line: index }] : [];
  });
  if (headings.length === 0) {
    return (
      <section id="outline-panel" className="document-info-section">
        <p className="text-sm text-stone-500">No headings found.</p>
      </section>
    );
  }
  return (
    <section id="outline-panel" className="document-info-section">
      <div className="space-y-1">
        {headings.map((h, i) => (
          <button key={i} type="button" className="tree-button" style={{ paddingLeft: `${h.level * 0.5}rem` }}>
            {h.title}
          </button>
        ))}
      </div>
    </section>
  );
}

function PublishSection({
  publishState,
  isPublished,
  hasUnpublishedChanges,
  publishedUrl,
  canPublish,
  isLoading,
  onPublish,
  onUnpublish,
}: {
  publishState: PublishStatusResponse | null;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedUrl: string;
  canPublish: boolean;
  isLoading: boolean;
  onPublish: () => Promise<void>;
  onUnpublish: () => Promise<void>;
}) {
  return (
    <section id="publish-panel" className="document-info-section">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-950">Publish</p>
        <span className={`status-chip ${isPublished ? (hasUnpublishedChanges ? "status-chip-warning" : "status-chip-success") : "status-chip-neutral"}`}>
          {isPublished ? (hasUnpublishedChanges ? "Changed" : "Published") : "Not published"}
        </span>
      </div>
      {publishState?.publishedAt && (
        <p className="mt-2 text-xs text-stone-500">Published {new Date(publishState.publishedAt).toLocaleString()}</p>
      )}
      {hasUnpublishedChanges && (
        <p className="mt-2 text-xs text-amber-700">The public snapshot is behind the current document.</p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className={`sidebar-action ${hasUnpublishedChanges ? "bg-amber-500 text-white hover:bg-amber-600 hover:text-white" : ""}`}
          type="button"
          title={hasUnpublishedChanges ? "Republish" : "Publish"}
          disabled={!canPublish || isLoading}
          onClick={() => { void onPublish(); }}
        >
          {hasUnpublishedChanges ? <ArrowPathIcon className="h-4 w-4" /> : <ArrowUpTrayIcon className="h-4 w-4" />}
        </button>
        <button
          className="sidebar-action hover:text-red-700"
          type="button"
          title="Unpublish"
          disabled={!canPublish || isLoading || !isPublished}
          onClick={() => { void onUnpublish(); }}
        >
          <LinkSlashIcon className="h-4 w-4" />
        </button>
      </div>
      {publishedUrl && (
        <a
          className="mt-2 block truncate text-xs font-semibold text-teal-700"
          href={publishedUrl}
          target="_blank"
          rel="noreferrer"
        >
          View published page
        </a>
      )}
      <p className="mt-3 text-xs text-stone-500">Publishing uses a cloud snapshot; frontmatter status is treated as user metadata.</p>
    </section>
  );
}

function LinksSection() {
  const state = useAppState();
  if (state.currentKind !== "markdown") {
    return (
      <section className="document-info-section">
        <p className="text-sm text-stone-500">Open a Markdown file to inspect links.</p>
      </section>
    );
  }
  const links: Array<{ target: string; line: number }> = [];
  state.editorContent.split("\n").forEach((line, index) => {
    for (const match of line.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      links.push({ target: match[1], line: index });
    }
    for (const match of line.matchAll(/\[\[([^\]]+)\]\]/g)) {
      links.push({ target: match[1], line: index });
    }
  });

  const binding = state.vaultBindings.find((b) => b.localVaultPath === state.workspace?.rootPath);
  const cloudWs = binding ? state.cloudWorkspaces.find((w) => w.id === binding.workspaceId) : undefined;
  const wsSlug = cloudWs?.slug || binding?.workspaceSlug || "";
  const publicUrl = state.syncSiteUrl && wsSlug && state.currentRelativePath
    ? `${state.syncSiteUrl.replace(/\/$/, "")}/${wsSlug}/${normalizePath(state.currentRelativePath).replace(/\.(md|markdown|mdown|mkd)$/i, "")}`
    : "";

  return (
    <section className="document-info-section">
      <p className="text-sm font-semibold text-stone-950">Outgoing links</p>
      <div className="mt-2 space-y-1">
        {links.length === 0 ? (
          <p className="text-xs text-stone-500">No outgoing links.</p>
        ) : (
          links.map((l, i) => (
            <div key={i} className="rounded-md border border-stone-200 px-2 py-1.5 text-xs">
              <span className="font-semibold text-stone-800">{l.target}</span>
              <span className="ml-2 text-stone-500">line {l.line + 1}</span>
            </div>
          ))
        )}
      </div>
      {publicUrl && (
        <>
          <p className="mt-4 text-sm font-semibold text-stone-950">Public URL</p>
          <p className="mt-2 break-all text-xs text-stone-600">{publicUrl}</p>
        </>
      )}
    </section>
  );
}
