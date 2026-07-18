import { useAppDispatch, useAppState } from "../app/AppState";
import { useCallback } from "react";
import { isEditableResourcePath } from "@shared/lib/fileTypes";

export interface CommandDef {
  id: string;
  title: string;
  aliases?: string[];
  scope?: string[];
  shortcut?: string;
  isEnabled: () => boolean;
  disabledReason?: () => string;
  run: () => void;
}

export function useCommands(fs: ReturnType<typeof import("./useFileSystem").useFileSystem>, sync: ReturnType<typeof import("./useCloudSync").useCloudSync>) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const currentVaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const currentVaultBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const isCloudViewer = Boolean(currentVaultBinding?.workspaceRole === "viewer" && currentVaultSettings?.cloudSyncEnabled !== false);

  const commands: CommandDef[] = [
    {
      id: "file.open",
      title: "Open Markdown file",
      aliases: ["open"],
      scope: ["global"],
      shortcut: "",
      isEnabled: () => true,
      run: () => fs.chooseMarkdownFile(),
    },
    {
      id: "workspace.open",
      title: "Open vault folder",
      aliases: ["folder", "vault"],
      scope: ["global"],
      shortcut: "",
      isEnabled: () => true,
      run: () => fs.chooseWorkspaceFolder(),
    },
    {
      id: "file.save",
      title: "Save current file",
      aliases: ["write"],
      shortcut: "Ctrl+S",
      scope: ["file", "draft"],
      // Markdown and editable diagram resources (Mermaid/Excalidraw) are saveable.
      // Drafts (in-memory untitled docs) trigger the "save as" flow.
      isEnabled: () =>
        state.isDraft ||
        ((state.currentKind === "markdown" ||
          (state.currentKind === "diagram" && isEditableResourcePath(state.currentPath))) &&
        state.isDirty),
      disabledReason: () => isCloudViewer ? "Viewer access is read-only" : "No unsaved changes",
      run: () => fs.saveCurrentFile(),
    },
    {
      id: "file.newDraft",
      title: "New untitled document",
      aliases: ["new", "untitled"],
      shortcut: "Ctrl+N",
      scope: ["global"],
      // Works in every mode — including empty (welcome) and single-file —
      // because a draft has no disk path and no workspace dependency.
      isEnabled: () => !isCloudViewer,
      run: () => dispatch({ type: "NEW_DRAFT" }),
    },
    {
      id: "file.new",
      title: "Create new document",
      aliases: ["create"],
      scope: ["workspace"],
      isEnabled: () => Boolean(state.workspace) && !isCloudViewer,
      disabledReason: () => isCloudViewer ? "Viewer access is read-only" : "Open a vault first",
      run: () => dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: true }),
    },
    {
      id: "file.rename",
      title: "Rename current entry",
      scope: ["file"],
      isEnabled: () => Boolean(state.workspace && state.currentRelativePath) && !isCloudViewer,
      disabledReason: () => isCloudViewer ? "Viewer access is read-only" : "No entry selected",
      run: () => fs.renameCurrentEntry(),
    },
    {
      id: "file.delete",
      title: "Delete current entry",
      scope: ["file"],
      isEnabled: () => Boolean(state.workspace && state.currentRelativePath) && !isCloudViewer,
      disabledReason: () => isCloudViewer ? "Viewer access is read-only" : "No entry selected",
      run: () => fs.deleteCurrentEntry(),
    },
    {
      id: "file.favorite",
      title: "Toggle favorite",
      aliases: ["star"],
      scope: ["file"],
      isEnabled: () => Boolean(state.currentPath),
      disabledReason: () => "No file open",
      run: () => {
        if (!state.currentPath) return;
        const key = `jtype.favorites:${state.workspace?.rootPath ?? "global"}`;
        const favorites: string[] = JSON.parse(window.localStorage.getItem(key) ?? "[]");
        const next = favorites.includes(state.currentPath)
          ? favorites.filter((p) => p !== state.currentPath)
          : [state.currentPath, ...favorites];
        window.localStorage.setItem(key, JSON.stringify(next));
        dispatch({ type: "SET_STATUS", message: next.includes(state.currentPath) ? "Added to favorites." : "Removed from favorites." });
      },
    },
    {
      id: "publish.export",
      title: "Export static site",
      aliases: ["build"],
      scope: ["workspace"],
      isEnabled: () => Boolean(state.workspace) && !state.isLoading,
      disabledReason: () => "Open a vault first",
      run: () => fs.exportSite(),
    },
    {
      id: "publish.check",
      title: "Run publish checks",
      aliases: ["validate"],
      scope: ["workspace"],
      isEnabled: () => Boolean(state.workspace) && !state.isLoading,
      disabledReason: () => "Open a vault first",
      run: () => fs.runPublishChecks(),
    },
    {
      id: "sync.workspace",
      title: "Sync vault to cloud workspace",
      aliases: ["upload", "site"],
      scope: ["publish", "workspace"],
      isEnabled: () => Boolean(state.workspace && state.syncToken && currentVaultBinding && currentVaultSettings?.cloudSyncEnabled !== false) && !state.isLoading,
      disabledReason: () => currentVaultSettings?.cloudSyncEnabled === false ? "Enable cloud sync for this vault first" : "Bind this vault to a cloud workspace before syncing",
      run: () => sync.syncWorkspaceToWeb(),
    },
    {
      id: "sync.verify",
      title: "Verify and repair cloud sync",
      aliases: ["reconcile", "repair", "verify"],
      scope: ["publish", "workspace"],
      isEnabled: () => Boolean(state.workspace && state.syncToken && currentVaultBinding && currentVaultSettings?.cloudSyncEnabled !== false) && !state.isLoading,
      disabledReason: () => currentVaultSettings?.cloudSyncEnabled === false ? "Enable cloud sync for this vault first" : "Bind this vault to a cloud workspace before syncing",
      run: () => {
        if (!currentVaultBinding) return;
        dispatch({ type: "SET_STATUS", message: "Verifying cloud sync…" });
        void sync.reconcileDocuments(currentVaultBinding).then((result) => {
          if (!result) {
            dispatch({ type: "SET_STATUS", message: "Could not verify cloud sync." });
            return;
          }
          const orphanNote = result.orphans > 0
            ? ` · ${result.orphans} non-syncable server row${result.orphans === 1 ? "" : "s"} ignored (delete on web)`
            : "";
          dispatch({
            type: "SET_STATUS",
            message: `Cloud sync verified — ${result.inSync} in sync, ${result.repaired} repaired, ${result.localEdits} local edit${result.localEdits === 1 ? "" : "s"} kept.${orphanNote}`,
          });
        });
      },
    },
    {
      id: "ai.index",
      title: "Build AI index",
      aliases: ["context"],
      scope: ["ai", "workspace"],
      isEnabled: () => Boolean(state.workspace) && !state.isLoading,
      disabledReason: () => "Open a vault first",
      run: () => fs.buildAiIndex(),
    },
    {
      id: "view.commandPalette",
      title: "Open command palette",
      shortcut: "Ctrl+Shift+P",
      scope: ["global"],
      isEnabled: () => true,
      run: () => dispatch({ type: "SET_COMMAND_PALETTE", open: true }),
    },
    {
      id: "view.quickSwitcher",
      title: "Open quick switcher",
      shortcut: "Ctrl+O",
      scope: ["global"],
      isEnabled: () => true,
      run: () => dispatch({ type: "SET_QUICK_SWITCHER", open: true }),
    },
    {
      id: "view.focus",
      title: "Toggle focus mode",
      scope: ["global"],
      isEnabled: () => true,
      run: () => dispatch({ type: "TOGGLE_FOCUS_MODE" }),
    },
    {
      id: "view.info",
      title: "Toggle document info",
      scope: ["global"],
      isEnabled: () => true,
      run: () => dispatch({ type: "TOGGLE_DOCUMENT_PANEL" }),
    },
    {
      id: "view.split",
      title: "Toggle edit and preview",
      aliases: ["split", "preview"],
      shortcut: "Ctrl+4",
      scope: ["global"],
      isEnabled: () => true,
      run: () => dispatch({ type: "SET_EDITOR_MODE", mode: state.editorMode === "split" ? "write" : "split" }),
    },
    {
      id: "view.preview",
      title: "Toggle preview mode",
      aliases: ["rendered"],
      shortcut: "Ctrl+R",
      scope: ["global"],
      isEnabled: () => true,
      run: () => dispatch({ type: "SET_EDITOR_MODE", mode: state.editorMode === "preview" ? "write" : "preview" }),
    },
    {
      id: "view.find",
      title: "Find in document",
      aliases: ["search", "find"],
      shortcut: "Ctrl+F",
      scope: ["file", "draft"],
      isEnabled: () => Boolean(state.currentPath) || state.isDraft,
      run: () => dispatch({ type: "SET_FINDBAR", open: true }),
    },
    {
      id: "editor.undo",
      title: "Undo editor change",
      shortcut: "Ctrl+Z",
      scope: ["editor"],
      isEnabled: () => state.currentKind === "markdown" && !isCloudViewer,
      disabledReason: () => isCloudViewer ? "Viewer access is read-only" : "Open a Markdown file",
      run: () => runEditorHistory("undo"),
    },
    {
      id: "editor.redo",
      title: "Redo editor change",
      shortcut: "Ctrl+Shift+Z",
      scope: ["editor"],
      isEnabled: () => state.currentKind === "markdown" && !isCloudViewer,
      disabledReason: () => isCloudViewer ? "Viewer access is read-only" : "Open a Markdown file",
      run: () => runEditorHistory("redo"),
    },
    {
      id: "editor.bold",
      title: "Bold selection",
      shortcut: "Ctrl+B",
      scope: ["editor", "selection"],
      isEnabled: () => state.currentKind === "markdown" && !isCloudViewer,
      disabledReason: () => isCloudViewer ? "Viewer access is read-only" : "Open a Markdown file",
      run: () => wrapSelection("**", "**", "bold text"),
    },
    {
      id: "editor.italic",
      title: "Italic selection",
      shortcut: "Ctrl+I",
      scope: ["editor", "selection"],
      isEnabled: () => state.currentKind === "markdown" && !isCloudViewer,
      disabledReason: () => isCloudViewer ? "Viewer access is read-only" : "Open a Markdown file",
      run: () => wrapSelection("_", "_", "italic text"),
    },
    {
      id: "editor.link",
      title: "Insert link",
      shortcut: "Ctrl+K",
      scope: ["editor", "selection"],
      isEnabled: () => state.currentKind === "markdown" && !isCloudViewer,
      disabledReason: () => isCloudViewer ? "Viewer access is read-only" : "Open a Markdown file",
      run: () => wrapSelection("[", "](url)", "link text"),
    },
    {
      id: "editor.code",
      title: "Inline code",
      scope: ["editor", "selection"],
      isEnabled: () => state.currentKind === "markdown" && !isCloudViewer,
      run: () => wrapSelection("`", "`", "code"),
    },
    {
      id: "insert.table",
      title: "Insert or format table",
      aliases: ["table"],
      shortcut: "Ctrl+Shift+T",
      scope: ["editor"],
      isEnabled: () => state.currentKind === "markdown" && !isCloudViewer,
      run: () => insertOrEditTable(),
    },
    {
      id: "insert.math",
      title: "Insert formula block",
      aliases: ["latex", "katex", "equation"],
      scope: ["editor"],
      isEnabled: () => state.currentKind === "markdown" && !isCloudViewer,
      run: () => insertBlockAtSafeCursor("\n$$\nE = mc^2\n$$\n"),
    },
    {
      id: "insert.mermaid",
      title: "Insert Mermaid diagram",
      aliases: ["diagram", "flowchart"],
      scope: ["editor"],
      isEnabled: () => state.currentKind === "markdown" && !isCloudViewer,
      run: () => insertBlockAtSafeCursor("\n```mermaid\nflowchart TD\n  A[Start] --> B[Write Markdown]\n  B --> C[Preview]\n```\n"),
    },
    {
      id: "insert.task",
      title: "Insert task list",
      scope: ["editor"],
      isEnabled: () => state.currentKind === "markdown" && !isCloudViewer,
      run: () => insertBlockAtSafeCursor("\n- [ ] Task\n"),
    },
  ];

  const findCommand = useCallback((id: string) => commands.find((c) => c.id === id), [commands]);

  return { commands, findCommand };
}

function getEditor(): HTMLTextAreaElement | null {
  return document.querySelector<HTMLTextAreaElement>("#editor");
}

function runEditorHistory(action: "undo" | "redo") {
  const editor = getEditor();
  if (!editor) return;
  editor.focus();
  try {
    // The editor and all shared formatting commands use the WebView's native
    // editing history, so accessory buttons and hardware shortcuts converge on
    // the same stack without maintaining a parallel React undo model.
    document.execCommand(action);
  } catch {
    // A WebView without native history support keeps the current content. The
    // command remains non-destructive and hardware typing is unaffected.
  }
}

function replaceEditorRange(
  editor: HTMLTextAreaElement,
  text: string,
  start: number,
  end: number,
  selectionMode: "select" | "end",
) {
  editor.focus();
  editor.setSelectionRange(start, end);

  // WebView/browser native typing already owns the undo stack. Route command
  // edits through the same editing primitive so Ctrl/Cmd+Z can undo toolbar,
  // hardware-keyboard and mobile accessory actions as well. execCommand is
  // retained by WKWebView and Android WebView specifically for this editing
  // compatibility; setRangeText remains the conservative fallback.
  let insertedWithNativeHistory = false;
  try {
    insertedWithNativeHistory = document.execCommand("insertText", false, text);
  } catch {
    insertedWithNativeHistory = false;
  }

  if (!insertedWithNativeHistory) {
    editor.setRangeText(text, start, end, selectionMode);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (selectionMode === "select") {
    editor.setSelectionRange(start, start + text.length);
  } else {
    editor.setSelectionRange(start + text.length, start + text.length);
  }
}

function wrapSelection(prefix: string, suffix: string, fallback: string) {
  const editor = getEditor();
  if (!editor) return;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selected = editor.value.slice(start, end) || fallback;
  const next = `${prefix}${selected}${suffix}`;
  replaceEditorRange(editor, next, start, end, "select");
}

function insertAtCursor(text: string) {
  const editor = getEditor();
  if (!editor) return;
  replaceEditorRange(editor, text, editor.selectionStart, editor.selectionEnd, "end");
}

function currentLineIndex(): number {
  const editor = getEditor();
  if (!editor) return 0;
  return editor.value.slice(0, editor.selectionStart).split("\n").length - 1;
}

function lineStartOffset(lines: string[], lineIndex: number): number {
  if (lineIndex >= lines.length) return lines.join("\n").length;
  return lines.slice(0, lineIndex).reduce((total, line) => total + line.length + 1, 0);
}

function currentFenceRange(): { start: number; end: number; language: string } | null {
  const editor = getEditor();
  if (!editor) return null;
  const lines = editor.value.split("\n");
  const cursorLine = currentLineIndex();
  let openLine = -1;
  let language = "";
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^\s*```([\w-]*)\s*$/);
    if (!match) continue;
    if (openLine === -1) {
      openLine = i;
      language = match[1] || "";
      continue;
    }
    const closeLine = i;
    if (cursorLine >= openLine && cursorLine <= closeLine) {
      return { start: openLine, end: closeLine, language };
    }
    openLine = -1;
    language = "";
  }
  if (openLine !== -1 && cursorLine >= openLine) {
    return { start: openLine, end: lines.length - 1, language };
  }
  return null;
}

function insertBlockAtSafeCursor(text: string) {
  const editor = getEditor();
  if (!editor) return;
  const fence = currentFenceRange();
  if (!fence) {
    insertAtCursor(text);
    return;
  }
  const lines = editor.value.split("\n");
  const insertAt = lineStartOffset(lines, Math.min(fence.end + 1, lines.length));
  const normalized = text.startsWith("\n") ? text : `\n${text}`;
  replaceEditorRange(editor, normalized, insertAt, insertAt, "end");
}

function looksLikeTableLine(line = ""): boolean {
  return line.includes("|") && line.trim().split("|").length >= 3;
}

function currentTableRange(): { start: number; end: number } | null {
  const editor = getEditor();
  if (!editor) return null;
  if (currentFenceRange()) return null;
  const lines = editor.value.split("\n");
  let cursorLine = currentLineIndex();
  if (!looksLikeTableLine(lines[cursorLine]) && looksLikeTableLine(lines[cursorLine - 1])) cursorLine -= 1;
  if (!looksLikeTableLine(lines[cursorLine])) return null;
  let start = cursorLine;
  while (start > 0 && looksLikeTableLine(lines[start - 1])) start -= 1;
  let end = cursorLine;
  while (end < lines.length - 1 && looksLikeTableLine(lines[end + 1])) end += 1;
  if (end - start < 1) return null;
  return { start, end };
}

function lastTableRange(): { start: number; end: number } | null {
  const editor = getEditor();
  if (!editor) return null;
  const lines = editor.value.split("\n");
  let range: { start: number; end: number } | null = null;
  let openFence = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*```/.test(lines[i])) {
      openFence = !openFence;
      continue;
    }
    if (openFence || !looksLikeTableLine(lines[i])) continue;
    const start = i;
    let end = i;
    while (end < lines.length - 1 && looksLikeTableLine(lines[end + 1])) end += 1;
    if (end - start >= 1) range = { start, end };
    i = end;
  }
  return range;
}

function parseTableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function insertOrEditTable() {
  const range = currentTableRange();
  if (range) {
    formatMarkdownTable();
    return;
  }
  insertBlockAtSafeCursor("\n| Column | Value |\n| --- | --- |\n| Item | Detail |\n");
}

function formatMarkdownTable() {
  const range = currentTableRange();
  const editor = getEditor();
  if (!range || !editor) return;
  const lines = editor.value.split("\n");
  const tableLines = lines.slice(range.start, range.end + 1);
  const dataLines = tableLines.filter((l) => !looksLikeSeparator(l));
  if (dataLines.length === 0) return;
  const widths = parseTableCells(dataLines[0]).map(() => 4);
  for (const line of dataLines) {
    parseTableCells(line).forEach((cell, col) => {
      widths[col] = Math.max(widths[col], cell.length);
    });
  }
  const formatted = tableLines.map((line) => {
    if (looksLikeSeparator(line)) {
      return `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`;
    }
    const cells = parseTableCells(line);
    return `| ${cells.map((cell, column) => cell.padEnd(widths[column], " ")).join(" | ")} |`;
  });
  const allLines = editor.value.split("\n");
  allLines.splice(range.start, range.end - range.start + 1, ...formatted);
  editor.value = allLines.join("\n");
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  editor.focus();
}

function looksLikeSeparator(line: string): boolean {
  return /^\|?\s*[-:]+/.test(line.trim());
}

export function addMarkdownTableRow() {
  const activeRange = currentTableRange();
  const range = activeRange ?? lastTableRange();
  const editor = getEditor();
  if (!range || !editor) {
    insertOrEditTable();
    return;
  }
  const lines = editor.value.split("\n");
  const cells = parseTableCells(lines[range.start]);
  const row = `| ${cells.map(() => " ").join(" | ")} |`;
  const insertIndex = activeRange ? Math.max(currentLineIndex() + 1, range.start + 2) : range.start + 2;
  lines.splice(insertIndex, 0, row);
  editor.value = lines.join("\n");
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  editor.focus();
}

export function addMarkdownTableColumn() {
  const range = currentTableRange() ?? lastTableRange();
  const editor = getEditor();
  if (!range || !editor) {
    insertOrEditTable();
    return;
  }
  const lines = editor.value.split("\n");
  for (let i = range.start; i <= range.end; i += 1) {
    const cells = parseTableCells(lines[i]);
    if (looksLikeSeparator(lines[i])) {
      cells.push("---");
    } else if (i === range.start) {
      cells.push("New column");
    } else {
      cells.push("");
    }
    lines[i] = `| ${cells.join(" | ")} |`;
  }
  editor.value = lines.join("\n");
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  editor.focus();
  formatMarkdownTable();
}

export { insertAtCursor, insertBlockAtSafeCursor, addMarkdownTableRow as addTableRowBelow, insertOrEditTable, formatMarkdownTable, wrapSelection, runEditorHistory };
