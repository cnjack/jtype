import { useRef, useEffect, useCallback, useState } from "react";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { renderToContainer } from "../../lib/markdown";
import { parseFrontmatter, writeFrontmatter } from "../../lib/frontmatter";
import { basename, normalizePath } from "../../lib/utils";
import { useCommandsList } from "../../app/App";
import { addMarkdownTableColumn, addMarkdownTableRow, formatMarkdownTable, insertBlockAtSafeCursor, insertOrEditTable } from "../../hooks/useCommands";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import type { EditorMode } from "../../lib/types";

export function EditorShell() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const commands = useCommandsList();
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
              <p id="document-breadcrumbs" className="truncate text-xs font-medium text-[#6b7773]">
                {documentLocation}
              </p>
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
                <StarIcon filled={isFavorite} />
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
                <TrashIcon />
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
              onClick={() => dispatch({ type: "SET_STATUS", message: `${state.activeConflicts.length} conflict${state.activeConflicts.length > 1 ? "s" : ""} need resolution` })}
              title={`${state.activeConflicts.length} conflict${state.activeConflicts.length > 1 ? "s" : ""} to resolve`}
            >
              {state.activeConflicts.length} conflict{state.activeConflicts.length > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-12 items-center gap-1 border-b border-black/[0.04] bg-[#fbfdfb] px-5">
        <EditorToolbarButton command="editor.bold" title="Bold - Ctrl+B" disabled={!isMarkdown} runCommand={runCommand}>B</EditorToolbarButton>
        <EditorToolbarButton command="editor.italic" title="Italic - Ctrl+I" disabled={!isMarkdown} runCommand={runCommand}>I</EditorToolbarButton>
        <EditorToolbarButton command="editor.link" title="Link - Ctrl+K" disabled={!isMarkdown} runCommand={runCommand}>Link</EditorToolbarButton>
        <EditorToolbarButton command="editor.code" title="Inline code" disabled={!isMarkdown} runCommand={runCommand}>Code</EditorToolbarButton>
        <EditorToolbarButton command="insert.table" title="Insert or edit table - Ctrl+Shift+T" disabled={!isMarkdown} runCommand={runCommand}>Table</EditorToolbarButton>
        <EditorToolbarButton command="insert.math" title="Insert formula block" disabled={!isMarkdown} runCommand={runCommand}>Math</EditorToolbarButton>
        <EditorToolbarButton command="insert.mermaid" title="Insert Mermaid diagram" disabled={!isMarkdown} runCommand={runCommand}>Mermaid</EditorToolbarButton>
        <EditorToolbarButton command="insert.task" title="Task list" disabled={!isMarkdown} runCommand={runCommand}>Task</EditorToolbarButton>
        <div className="ml-auto flex items-center gap-1 rounded-full bg-[#eef5f1] p-1">
          {(["write", "split", "preview"] as EditorMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`view-mode-button ${state.editorMode === mode ? "view-mode-button-active" : ""}`}
              onClick={() => dispatch({ type: "SET_EDITOR_MODE", mode })}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <button className={`editor-tool ${state.documentPanelOpen ? "bg-[#e8f6f2] text-[#006f6b] ring-1 ring-[#008884]/15 hover:bg-[#e8f6f2] hover:text-[#006f6b]" : ""}`} type="button" title="Document info" onClick={() => dispatch({ type: "TOGGLE_DOCUMENT_PANEL" })}>Info</button>
        <button className="editor-tool" type="button" title="Focus mode" onClick={() => dispatch({ type: "TOGGLE_FOCUS_MODE" })}>Focus</button>
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
              <button className="subtle-button" type="button" onClick={() => dispatch({ type: "TOGGLE_DOCUMENT_PANEL" })}>Hide</button>
            </div>
            <PropertiesSection />
            <OutlineSection />
            {state.currentKind === "markdown" && <PublishSection />}
            <LinksSection />
          </aside>
        )}
      </div>

      <div id="operation-log" className="flex items-center justify-between border-t border-black/[0.04] bg-white/70 px-5 py-3 text-xs text-[#6b7773]">
        <span>{state.statusMessage}</span>
        {state.activeConflicts.length > 0 && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-200"
            onClick={() => dispatch({ type: "SET_STATUS", message: `${state.activeConflicts.length} conflict${state.activeConflicts.length > 1 ? "s" : ""} need resolution` })}
          >
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {state.activeConflicts.length} conflict{state.activeConflicts.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {contextMenu && (
        <div
          role="menu"
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { runCommand("editor.bold"); setContextMenu(null); }}>Bold</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { runCommand("editor.link"); setContextMenu(null); }}>Insert link</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { insertOrEditTable(); setContextMenu(null); }}>Insert or format table</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { addMarkdownTableRow(); setContextMenu(null); }}>Add table row below</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { addMarkdownTableColumn(); setContextMenu(null); }}>Add table column right</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { formatMarkdownTable(); setContextMenu(null); }}>Format table</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { insertBlockAtSafeCursor("\n$$\nE = mc^2\n$$\n"); setContextMenu(null); }}>Insert formula</button>
          <button type="button" className="context-menu-button" disabled={!isMarkdown} onClick={() => { insertBlockAtSafeCursor("\n```mermaid\nflowchart TD\n  A --> B\n```\n"); setContextMenu(null); }}>Insert Mermaid diagram</button>
        </div>
      )}
    </section>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M11.5 3.1a.6.6 0 0 1 1 0l2.6 5.3 5.8.8a.6.6 0 0 1 .3 1l-4.2 4.1 1 5.8a.6.6 0 0 1-.9.6L12 18l-5.1 2.7a.6.6 0 0 1-.9-.6l1-5.8-4.2-4.1a.6.6 0 0 1 .3-1l5.8-.8 2.6-5.3Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
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
        <button className="sidebar-action" type="button" onClick={() => {
          const cmd = commands.find((c) => c.id === "publish.check");
          if (cmd) cmd.run();
        }}>Run checks</button>
        <button className="sidebar-action" type="button" onClick={() => {
          const cmd = commands.find((c) => c.id === "publish.export");
          if (cmd) cmd.run();
        }}>Export preview</button>
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
