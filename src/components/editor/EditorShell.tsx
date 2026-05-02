import { useRef, useEffect, useCallback, useState } from "react";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { renderToContainer } from "../../lib/markdown";
import { parseFrontmatter, writeFrontmatter } from "../../lib/frontmatter";
import { basename, normalizePath } from "../../lib/utils";
import { useCommandsList } from "../../app/App";
import { addMarkdownTableColumn, addMarkdownTableRow, formatMarkdownTable, insertBlockAtSafeCursor, insertOrEditTable } from "../../hooks/useCommands";
import type { EditorMode } from "../../lib/types";

export function EditorShell() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const commands = useCommandsList();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const isSyncingScroll = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.value = state.editorContent;
    }
  }, [state.currentPath]);

  useEffect(() => {
    if (previewRef.current && state.currentKind === "markdown") {
      void renderToContainer(state.editorContent, previewRef.current);
    }
  }, [state.editorContent, state.currentKind]);

  const handleInput = useCallback(() => {
    const content = editorRef.current?.value ?? "";
    dispatch({ type: "SET_EDITOR_CONTENT", content });
  }, [dispatch]);

  const fileName = state.currentPath ? basename(state.currentPath) : "No file selected";
  const isMarkdown = state.currentKind === "markdown";

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
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      const ratio = source.scrollTop / (source.scrollHeight - source.clientHeight || 1);
      target.scrollTop = ratio * (target.scrollHeight - target.clientHeight || 1);
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
  }, []);

  return (
    <section className="flex min-h-0 flex-col bg-[#fbfdfb]">
      <div className="flex min-h-[68px] items-center justify-between gap-3 border-b border-black/[0.04] bg-white/70 px-6 backdrop-blur-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p id="document-breadcrumbs" className="truncate text-xs font-medium text-[#6b7773]">
              {state.currentRelativePath
                ? `${state.workspace?.name ?? "Vault"} / ${state.currentRelativePath}`
                : state.currentPath || "No document selected"}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="truncate text-lg font-semibold tracking-[-0.01em] text-stone-950">{fileName}</p>
            {state.currentPath && (
              <button type="button" className="editor-tool text-xs" aria-label="Star" onClick={toggleFavorite}>
                {isFavorite ? "Starred" : "Star"}
              </button>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
            <span id="file-state" className={`status-chip ${state.isDirty ? "status-chip-warning" : "status-chip-neutral"}`}>{fileStateLabel}</span>
          {isMarkdown && state.mode === "workspace" && <span className="status-chip status-chip-neutral">{publishStatus}</span>}
          {state.syncSiteUrl && isMarkdown && state.mode === "workspace" && <span className="status-chip status-chip-info">Synced</span>}
          {isFavorite && <span className="status-chip status-chip-success">Favorite</span>}
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
        <button className={`editor-tool ${state.documentPanelOpen ? "bg-[#0d0d0c] text-white hover:bg-[#0d0d0c] hover:text-white" : ""}`} type="button" title="Document info" onClick={() => dispatch({ type: "TOGGLE_DOCUMENT_PANEL" })}>Info</button>
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

      <div id="operation-log" className="border-t border-black/[0.04] bg-white/70 px-5 py-3 text-xs text-[#6b7773]">
        {state.statusMessage}
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
        <select
          className="compact-select mt-1 w-full"
          defaultValue={value}
          aria-label={field}
          onChange={(e) => onUpdate(field, e.target.value)}
        >
          <option value="">-</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
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
      {state.syncSiteUrl && state.currentRelativePath && (
        <a
          className="mt-2 block truncate text-xs font-semibold text-teal-700"
          href={`${state.syncSiteUrl.replace(/\/$/, "")}/${state.currentRelativePath.replace(/\.(md|markdown|mdown|mkd)$/i, "")}`}
          target="_blank"
          rel="noreferrer"
        >
          View published page
        </a>
      )}
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

  const publicUrl = state.syncSiteUrl && state.currentRelativePath
    ? `${state.syncSiteUrl.replace(/\/$/, "")}/${normalizePath(state.currentRelativePath).replace(/\.(md|markdown|mdown|mkd)$/i, "")}`
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
