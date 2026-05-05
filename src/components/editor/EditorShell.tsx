import { useRef, useEffect, useCallback, useState } from "react";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { renderToContainer } from "../../lib/markdown";
import { parseFrontmatter, writeFrontmatter } from "../../lib/frontmatter";
import { basename, normalizePath } from "../../lib/utils";
import { useCommandsList } from "../../app/App";
import { addMarkdownTableColumn, addMarkdownTableRow, formatMarkdownTable, insertBlockAtSafeCursor, insertOrEditTable } from "../../hooks/useCommands";
import { useEagerSync } from "../../hooks/useEagerSync";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { Breadcrumb } from "../layout/Breadcrumb";
import type { EditorMode } from "../../lib/types";
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  CodeBracketIcon,
  TableCellsIcon,
  VariableIcon,
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  ViewColumnsIcon,
  EyeIcon,
  InformationCircleIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  StarIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export function EditorShell() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const commands = useCommandsList();
  const { pushSingleDocument } = useEagerSync();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const isSyncingScroll = useRef(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

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

  const handleInput = useCallback(() => {
    const content = editorRef.current?.value ?? "";
    dispatch({ type: "SET_EDITOR_CONTENT", content });
  }, [dispatch]);

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

  const fileStateLabel = state.isDirty ? "Unsaved changes" : state.currentPath ? "Saved" : "Ready";
  const parsed = isMarkdown ? parseFrontmatter(state.editorContent) : null;
  const publishStatus = state.currentPath && parsed ? parsed.data.status || (parsed.data.publish ? "published" : "draft") : "";

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
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  useEffect(() => {
    if (!state.currentPath || state.currentKind !== "markdown") return;
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      const sourceRange = Math.max(1, source.scrollHeight - source.clientHeight);
      const targetRange = Math.max(1, target.scrollHeight - target.clientHeight);
      const ratio = source.scrollTop / sourceRange;
      target.scrollTop = ratio * targetRange;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    };

    const onEditorScroll = () => syncScroll(editor, preview);
    const onPreviewScroll = () => syncScroll(preview, editor);

    editor.addEventListener("scroll", onEditorScroll);
    preview.addEventListener("scroll", onPreviewScroll);

    return () => {
      editor.removeEventListener("scroll", onEditorScroll);
      preview.removeEventListener("scroll", onPreviewScroll);
    };
  }, [state.currentPath, state.currentKind, state.editorMode, state.documentPanelOpen]);

  return (
    <section className="flex min-h-0 flex-col bg-[#fbfdfb]">
      <div className="flex min-h-[56px] items-center justify-between gap-3 border-b border-black/[0.04] bg-white/60 px-5 backdrop-blur-xl">
        <div className="min-w-0">
          {documentLocation && (
            <div className="flex items-center gap-2">
              <Breadcrumb />
            </div>
          )}
          <div className={`${documentLocation ? "mt-1 " : ""}flex items-center gap-2`}>
            <p className="truncate text-sm font-semibold text-stone-950">{fileName}</p>
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
                onClick={() => runCommand("file.delete")}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span id="file-state" className={`status-chip ${state.isDirty ? "status-chip-warning" : "status-chip-neutral"}`}>{fileStateLabel}</span>
          {isMarkdown && state.mode === "workspace" && <span className="status-chip status-chip-neutral">{publishStatus}</span>}
          {state.syncSiteUrl && isMarkdown && state.mode === "workspace" && <span className="status-chip status-chip-info">Synced</span>}
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
            <button
              className="sidebar-action bg-[#008884] px-3 text-white hover:bg-[#006f6b] hover:text-white disabled:opacity-50"
              type="button"
              title="Save"
              disabled={state.currentKind !== "markdown" || !state.isDirty}
              onClick={() => {
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
          )}
        </div>
      </div>

      <div className="flex min-h-12 items-center gap-1 border-b border-black/[0.04] bg-[#fbfdfb] px-5">
        <EditorToolbarButton command="editor.bold" title="Bold - Ctrl+B" disabled={!isMarkdown} runCommand={runCommand}>
          <BoldIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="editor.italic" title="Italic - Ctrl+I" disabled={!isMarkdown} runCommand={runCommand}>
          <ItalicIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="editor.link" title="Link - Ctrl+K" disabled={!isMarkdown} runCommand={runCommand}>
          <LinkIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="editor.code" title="Inline code" disabled={!isMarkdown} runCommand={runCommand}>
          <CodeBracketIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="insert.table" title="Insert or edit table - Ctrl+Shift+T" disabled={!isMarkdown} runCommand={runCommand}>
          <TableCellsIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="insert.math" title="Insert formula block" disabled={!isMarkdown} runCommand={runCommand}>
          <VariableIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="insert.mermaid" title="Insert Mermaid diagram" disabled={!isMarkdown} runCommand={runCommand}>
          <ArrowPathIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="insert.task" title="Task list" disabled={!isMarkdown} runCommand={runCommand}>
          <ClipboardDocumentCheckIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <div className="ml-auto flex items-center gap-1 rounded-full bg-[#eef5f1] p-1">
          <button
            type="button"
            className={`view-mode-button ${state.editorMode === "write" ? "view-mode-button-active" : ""}`}
            title="Write"
            onClick={() => dispatch({ type: "SET_EDITOR_MODE", mode: "write" })}
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={`view-mode-button ${state.editorMode === "split" ? "view-mode-button-active" : ""}`}
            title="Split"
            onClick={() => dispatch({ type: "SET_EDITOR_MODE", mode: "split" })}
          >
            <ViewColumnsIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={`view-mode-button ${state.editorMode === "preview" ? "view-mode-button-active" : ""}`}
            title="Preview"
            onClick={() => dispatch({ type: "SET_EDITOR_MODE", mode: "preview" })}
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        </div>
        <button className={`editor-tool ${state.documentPanelOpen ? "bg-[#e8f6f2] text-[#006f6b] ring-1 ring-[#008884]/15 hover:bg-[#e8f6f2] hover:text-[#006f6b]" : ""}`} type="button" title="Document info" onClick={() => dispatch({ type: "TOGGLE_DOCUMENT_PANEL" })}>
          <InformationCircleIcon className="h-4 w-4" />
        </button>
        <button className="editor-tool" type="button" title="Focus mode" onClick={() => dispatch({ type: "TOGGLE_FOCUS_MODE" })}>
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
            {state.currentKind === "markdown" && <PublishSection />}
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
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { runCommand("editor.bold"); setContextMenu(null); }}><BoldIcon className="mr-2 h-3.5 w-3.5" />Bold</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { runCommand("editor.link"); setContextMenu(null); }}><LinkIcon className="mr-2 h-3.5 w-3.5" />Insert link</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { insertOrEditTable(); setContextMenu(null); }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" />Insert or format table</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { addMarkdownTableRow(); setContextMenu(null); }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" />Add table row below</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { addMarkdownTableColumn(); setContextMenu(null); }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" />Add table column right</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { formatMarkdownTable(); setContextMenu(null); }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" />Format table</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { insertBlockAtSafeCursor("\n$$\nE = mc^2\n$$\n"); setContextMenu(null); }}><VariableIcon className="mr-2 h-3.5 w-3.5" />Insert formula</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { insertBlockAtSafeCursor("\n```mermaid\nflowchart TD\n  A --> B\n```\n"); setContextMenu(null); }}><ArrowPathIcon className="mr-2 h-3.5 w-3.5" />Insert Mermaid diagram</button>
        </div>
      )}
    </section>
  );
}

function EditorToolbarButton({ title, disabled, runCommand, command, children }: { title: string; disabled: boolean; runCommand: (id: string) => void; command: string; children: React.ReactNode }) {
  return (
    <button className="editor-tool" type="button" title={title} disabled={disabled} onClick={() => runCommand(command)}>
      {children}
    </button>
  );
}

function PropertiesSection() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  if (state.currentKind !== "markdown") {
    return (
      <section id="properties-panel" className="document-info-section">
        <p className="text-sm text-stone-500">Open a Markdown file to edit frontmatter properties.</p>
      </section>
    );
  }
  const parsed = parseFrontmatter(state.editorContent);
  const basicFields = ["title", "description", "tags", "slug", "status"];
  const advancedFields = ["publish", "createdAt", "updatedAt"];

  const updateField = (field: string, value: string) => {
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
        {basicFields.map((field) => <PropertyField key={field} field={field} value={parsed.data[field] ?? ""} onUpdate={updateField} />)}
        <details className="rounded-md border border-stone-200 bg-stone-50 p-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase text-stone-500">Advanced</summary>
          <div className="mt-3 space-y-3">
            {advancedFields.map((field) => <PropertyField key={field} field={field} value={parsed.data[field] ?? ""} onUpdate={updateField} />)}
          </div>
        </details>
      </div>
    </section>
  );
}

function PropertyField({ field, value, onUpdate }: { field: string; value: string; onUpdate: (field: string, value: string) => void }) {
  return (
    <label className="block">
      <span className="field-label">{field}</span>
      {field === "status" ? (
        <StatusDropdown value={value} onChange={(v) => onUpdate(field, v)} />
      ) : field === "description" ? (
        <textarea
          className="field-textarea"
          defaultValue={value}
          aria-label={field}
          onChange={(e) => onUpdate(field, e.target.value)}
          onBlur={(e) => onUpdate(field, e.target.value)}
        />
      ) : (
        <input
          className="field-input"
          defaultValue={value}
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

function PublishSection() {
  const state = useAppState();
  const commands = useCommandsList();
  const parsed = state.currentKind === "markdown" ? parseFrontmatter(state.editorContent) : null;
  const status = parsed?.data.status || "draft";
  const slug = parsed?.data.slug || "";
  const binding = state.vaultBindings.find((b) => b.localVaultPath === state.workspace?.rootPath);
  const cloudWs = binding ? state.cloudWorkspaces.find((w) => w.id === binding.workspaceId) : undefined;
  const wsSlug = cloudWs?.slug || binding?.workspaceSlug || "";
  const publishedUrl = state.syncSiteUrl && wsSlug && state.currentRelativePath
    ? `${state.syncSiteUrl.replace(/\/$/, "")}/${wsSlug}/${normalizePath(state.currentRelativePath).replace(/\.(md|markdown|mdown|mkd)$/i, "")}`
    : "";
  return (
    <section id="publish-panel" className="document-info-section">
      <p className="text-sm font-semibold text-stone-950">Publish flow</p>
      <p className="mt-1 text-xs text-stone-500">Status: {status}</p>
      {slug && <p className="text-xs text-stone-500">Slug: {slug}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="sidebar-action" type="button" title="Run checks" onClick={() => {
          const cmd = commands.find((c) => c.id === "publish.check");
          if (cmd) cmd.run();
        }}>
          <ShieldCheckIcon className="h-4 w-4" />
        </button>
        <button className="sidebar-action" type="button" title="Export preview" onClick={() => {
          const cmd = commands.find((c) => c.id === "publish.export");
          if (cmd) cmd.run();
        }}>
          <EyeIcon className="h-4 w-4" />
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
    </section>
  );
}

function StatusDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = [
    { label: "—", value: "" },
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
    { label: "Archived", value: "archived" },
  ];
  const active = options.find((o) => o.value === value) || options[0];

  return (
    <Menu as="div" className="relative mt-1 w-full">
      <MenuButton className="compact-select flex w-full items-center justify-between text-left">
        <span>{active.label}</span>
        <svg className="h-3 w-3 text-stone-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </MenuButton>
      <MenuItems
        transition
        className="absolute left-0 z-50 mt-1 w-full origin-top rounded-lg border border-black/[0.06] bg-white p-1 shadow-lg shadow-stone-900/10 outline-none transition focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        {options.map((option) => (
          <MenuItem key={option.value}>
            {({ focus }) => (
              <button
                className={`flex w-full items-center rounded-md px-3 py-2 text-sm transition ${
                  focus ? "bg-[#e8f6f2] text-[#006f6b]" : "text-stone-700"
                } ${active.value === option.value ? "font-semibold" : ""}`}
                onClick={() => onChange(option.value)}
              >
                {option.label}
              </button>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
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
