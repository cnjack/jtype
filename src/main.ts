import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";
import { marked } from "marked";
import { createLineDiff, type AICommandProposal } from "./aiCommands";

type EntryKind = "folder" | "markdown" | "asset";
type Activity = "files" | "search" | "library" | "publish" | "ai" | "settings";
type InspectorTab = "preview" | "properties" | "outline" | "links" | "publish" | "ai";
type EditorMode = "write" | "split" | "preview";
type CommandScope =
  | "global"
  | "workspace"
  | "file"
  | "folder"
  | "editor"
  | "selection"
  | "publish"
  | "ai";

type FileTreeNode = {
  name: string;
  path: string;
  relativePath: string;
  kind: EntryKind;
  children: FileTreeNode[];
};

type WorkspaceSnapshot = {
  rootPath: string;
  name: string;
  entries: FileTreeNode[];
  metadataCreated: boolean;
};

type PublishResult = {
  outputDir: string;
  pages: string[];
};

type AiIndexResult = {
  outputFile: string;
  documents: number;
  chunks: number;
  links: number;
  assets: number;
};

type ValidationResult = {
  errors: string[];
  warnings: string[];
};

type SyncDocument = {
  relativePath: string;
  title: string;
  status: string;
  content: string;
};

type AuthResponse = {
  token: string;
  username: string;
  siteUrl: string;
};

type SyncResponse = {
  workspaceId?: string;
  workspaceName: string;
  documentCount: number;
  siteUrl: string;
};

type CloudProfile = {
  serverUrl: string;
  username: string;
  siteUrl: string;
  token: string;
  deviceId: string;
};

type VaultBinding = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  localVaultPath: string;
  lastPulledClock: number;
};

type CloudWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  documentCount: number;
  storageBudgetBytes: number;
};

type CloudWorkspaceListResponse = {
  workspaces: CloudWorkspace[];
};

type OAuthDeviceStartResponse = {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
};

type CloudDocument = {
  relativePath: string;
  title: string;
  status: string;
  content: string;
  contentHash: string;
  versionId: string;
  updatedClock: number;
};

type SyncConflict = {
  conflictId: string;
  relativePath: string;
  localContent: string;
  cloudContent: string;
  baseContent?: string;
};

type SyncPushResponse = {
  workspaceId: string;
  accepted: number;
  documents: CloudDocument[];
  conflicts: SyncConflict[];
};

type AppState = {
  activeActivity: Activity;
  activeInspector: InspectorTab;
  editorMode: EditorMode;
  currentPath: string;
  currentRelativePath: string;
  currentKind: EntryKind | "";
  originalContent: string;
  isDirty: boolean;
  isLoading: boolean;
  workspace: WorkspaceSnapshot | null;
  syncToken: string;
  syncUsername: string;
  syncSiteUrl: string;
  lastSyncSnapshot: string;
  cloudProfile: CloudProfile | null;
  vaultBindings: VaultBinding[];
  cloudWorkspaces: CloudWorkspace[];
  oauthDeviceCode: string;
  oauthUserCode: string;
  activeConflicts: SyncConflict[];
  contextNode: FileTreeNode | null;
  pendingAiProposal: AICommandProposal | null;
};

type RecentItem = {
  kind: "file" | "workspace";
  name: string;
  path: string;
};

type FrontmatterParse = {
  data: Record<string, string>;
  body: string;
  hasFrontmatter: boolean;
};

type DocumentSummary = {
  node: FileTreeNode;
  title: string;
  status: string;
  publish: boolean;
  tags: string[];
};

type AppCommand = {
  id: string;
  title: string;
  aliases?: string[];
  shortcut?: string;
  scope: CommandScope[];
  isEnabled: () => boolean;
  disabledReason?: () => string | undefined;
  run: () => Promise<void> | void;
};

const openButton = document.querySelector<HTMLButtonElement>("#open-file");
const openFolderButton = document.querySelector<HTMLButtonElement>("#open-folder");
const saveButton = document.querySelector<HTMLButtonElement>("#save-file");
const newDocumentButton = document.querySelector<HTMLButtonElement>("#new-document");
const renameEntryButton = document.querySelector<HTMLButtonElement>("#rename-entry");
const deleteEntryButton = document.querySelector<HTMLButtonElement>("#delete-entry");
const publishButton = document.querySelector<HTMLButtonElement>("#publish-site");
const aiIndexButton = document.querySelector<HTMLButtonElement>("#build-ai-index");
const aiProposeTitleButton = document.querySelector<HTMLButtonElement>("#ai-propose-title");
const preview = document.querySelector<HTMLElement>("#preview");
const editor = document.querySelector<HTMLTextAreaElement>("#editor");
const fileName = document.querySelector<HTMLElement>("#file-name");
const filePath = document.querySelector<HTMLElement>("#file-path");
const stateChips = document.querySelector<HTMLElement>("#state-chips");
const documentBreadcrumbs = document.querySelector<HTMLElement>("#document-breadcrumbs");
const appContextTitle = document.querySelector<HTMLElement>("#app-context-title");
const workspaceName = document.querySelector<HTMLElement>("#workspace-name");
const workspacePath = document.querySelector<HTMLElement>("#workspace-path");
const fileTree = document.querySelector<HTMLElement>("#file-tree");
const favoriteList = document.querySelector<HTMLElement>("#favorite-list");
const favoriteCurrentButton = document.querySelector<HTMLButtonElement>("#favorite-current");
const favoriteCurrentTopButton = document.querySelector<HTMLButtonElement>("#favorite-current-top");
const recentList = document.querySelector<HTMLElement>("#recent-list");
const welcomeRecentList = document.querySelector<HTMLElement>("#welcome-recent-list");
const operationLog = document.querySelector<HTMLElement>("#operation-log");
const syncServiceUrlInput = document.querySelector<HTMLInputElement>("#sync-service-url");
const syncUsernameInput = document.querySelector<HTMLInputElement>("#sync-username");
const syncRegisterButton = document.querySelector<HTMLButtonElement>("#sync-register");
const syncNowButton = document.querySelector<HTMLButtonElement>("#sync-now");
const syncSiteLink = document.querySelector<HTMLAnchorElement>("#sync-site-link");
const commandPaletteButton = document.querySelector<HTMLButtonElement>("#command-palette-button");
const quickSwitcherButton = document.querySelector<HTMLButtonElement>("#quick-switcher-button");
const syncPanelButton = document.querySelector<HTMLButtonElement>("#sync-panel-button");
const commandDialog = document.querySelector<HTMLElement>("#command-dialog");
const commandInput = document.querySelector<HTMLInputElement>("#command-input");
const commandResults = document.querySelector<HTMLElement>("#command-results");
const quickDialog = document.querySelector<HTMLElement>("#quick-dialog");
const quickInput = document.querySelector<HTMLInputElement>("#quick-input");
const quickResults = document.querySelector<HTMLElement>("#quick-results");
const contextMenu = document.querySelector<HTMLElement>("#context-menu");
const workspaceSearchInput = document.querySelector<HTMLInputElement>("#workspace-search");
const searchResults = document.querySelector<HTMLElement>("#search-results");
const libraryFilter = document.querySelector<HTMLSelectElement>("#library-filter");
const libraryView = document.querySelector<HTMLElement>("#library-view");
const publishChecksButton = document.querySelector<HTMLButtonElement>("#publish-checks");
const publishQueue = document.querySelector<HTMLElement>("#publish-queue");
const propertiesPanel = document.querySelector<HTMLElement>("#properties-panel");
const outlinePanel = document.querySelector<HTMLElement>("#outline-panel");
const linksPanel = document.querySelector<HTMLElement>("#links-panel");
const publishPanel = document.querySelector<HTMLElement>("#publish-panel");
const aiPanel = document.querySelector<HTMLElement>("#ai-panel");
const editorPreviewGrid = document.querySelector<HTMLElement>("#editor-preview-grid");
const documentInfoToggle = document.querySelector<HTMLButtonElement>("#document-info-toggle");
const documentInfoClose = document.querySelector<HTMLButtonElement>("#document-info-close");
const accountDialog = document.querySelector<HTMLElement>("#account-dialog");
const accountStatus = document.querySelector<HTMLElement>("#account-status");
const accountServiceUrlInput = document.querySelector<HTMLInputElement>("#account-service-url");
const accountConnectButton = document.querySelector<HTMLButtonElement>("#account-connect");
const accountDisconnectButton = document.querySelector<HTMLButtonElement>("#account-disconnect");
let devicePollTimer: number | null = null;
const accountSyncButton = document.querySelector<HTMLButtonElement>("#account-sync");
const accountSiteLink = document.querySelector<HTMLAnchorElement>("#account-site-link");
const accountWorkspaceList = document.querySelector<HTMLElement>("#account-workspace-list");
const accountConflictList = document.querySelector<HTMLElement>("#account-conflict-list");
const welcomeOpenFolderButton = document.querySelector<HTMLButtonElement>("#welcome-open-folder");
const welcomeOpenFileButton = document.querySelector<HTMLButtonElement>("#welcome-open-file");
const welcomeDefaultVaultButton = document.querySelector<HTMLButtonElement>("#welcome-default-vault");
const welcomeCommandPaletteButton = document.querySelector<HTMLButtonElement>("#welcome-command-palette");

const commands = new Map<string, AppCommand>();
const AI_ENABLED = false;
let mermaidRenderer: Awaited<typeof import("mermaid")>["default"] | null = null;

const state: AppState = {
  activeActivity: "files",
  activeInspector: "preview",
  editorMode: "split",
  currentPath: "",
  currentRelativePath: "",
  currentKind: "",
  originalContent: "",
  isDirty: false,
  isLoading: false,
  workspace: null,
  syncToken: window.localStorage.getItem("jtype.sync.token") ?? "",
  syncUsername: window.localStorage.getItem("jtype.sync.username") ?? "",
  syncSiteUrl: window.localStorage.getItem("jtype.sync.siteUrl") ?? "",
  lastSyncSnapshot: window.localStorage.getItem("jtype.sync.snapshot") ?? "",
  cloudProfile: null,
  vaultBindings: [],
  cloudWorkspaces: [],
  oauthDeviceCode: "",
  oauthUserCode: "",
  activeConflicts: [],
  contextNode: null,
  pendingAiProposal: null,
};

marked.use({
  gfm: true,
  breaks: false,
});

function registerCommand(command: AppCommand) {
  commands.set(command.id, command);
}

function registerCommands() {
  const appCommands: AppCommand[] = [
    {
      id: "file.open",
      title: "Open Markdown file",
      aliases: ["open file", "markdown"],
      shortcut: "Ctrl+Alt+O",
      scope: ["global"],
      isEnabled: () => !state.isLoading,
      run: chooseMarkdownFile,
    },
    {
      id: "workspace.open",
      title: "Open vault folder",
      aliases: ["open folder", "workspace"],
      shortcut: "Ctrl+Shift+O",
      scope: ["global"],
      isEnabled: () => !state.isLoading,
      run: chooseWorkspaceFolder,
    },
    {
      id: "vault.openDefault",
      title: "Open default vault",
      aliases: ["documents .jtype", "vault"],
      scope: ["global"],
      isEnabled: () => !state.isLoading,
      run: openDefaultVault,
    },
    {
      id: "file.save",
      title: "Save current file",
      aliases: ["write"],
      shortcut: "Ctrl+S",
      scope: ["file", "editor"],
      isEnabled: () => state.currentKind === "markdown" && Boolean(state.currentPath) && state.isDirty,
      disabledReason: () => (state.currentKind === "markdown" ? "No unsaved changes" : "Open a Markdown file first"),
      run: saveCurrentFile,
    },
    {
      id: "file.new",
      title: "New note or folder",
      aliases: ["new document", "create"],
      scope: ["workspace"],
      isEnabled: () => Boolean(state.workspace) && !state.isLoading,
      disabledReason: () => "Open a vault first",
      run: createDocument,
    },
    {
      id: "file.rename",
      title: "Rename or move current entry",
      aliases: ["move"],
      shortcut: "F2",
      scope: ["file", "folder"],
      isEnabled: () => Boolean(state.workspace && state.currentRelativePath) && !state.isLoading,
      disabledReason: () => "Select a vault item first",
      run: renameCurrentEntryWithImpact,
    },
    {
      id: "file.delete",
      title: "Delete current entry",
      aliases: ["trash"],
      scope: ["file", "folder"],
      isEnabled: () => Boolean(state.workspace && state.currentRelativePath) && !state.isLoading,
      disabledReason: () => "Select a vault item first",
      run: deleteCurrentEntry,
    },
    {
      id: "file.favorite",
      title: "Toggle favorite",
      aliases: ["star", "pin"],
      scope: ["file"],
      isEnabled: () => Boolean(state.workspace && state.currentPath),
      disabledReason: () => "Open or select a file first",
      run: toggleCurrentFavorite,
    },
    {
      id: "publish.export",
      title: "Export static site",
      aliases: ["publish preview"],
      scope: ["publish", "workspace"],
      isEnabled: () => Boolean(state.workspace) && !state.isLoading,
      disabledReason: () => "Open a vault first",
      run: exportSite,
    },
    {
      id: "publish.check",
      title: "Run publish checks",
      aliases: ["validate", "issues"],
      scope: ["publish", "workspace"],
      isEnabled: () => Boolean(state.workspace) && !state.isLoading,
      disabledReason: () => "Open a vault first",
      run: runPublishChecks,
    },
    {
      id: "sync.workspace",
      title: "Sync vault to cloud workspace",
      aliases: ["upload", "site"],
      scope: ["publish", "workspace"],
      isEnabled: () => Boolean(state.workspace && state.syncToken) && !state.isLoading,
      disabledReason: () => (state.workspace ? "Login or register before syncing" : "Open a vault first"),
      run: () => syncWorkspaceToWeb(),
    },
    {
      id: "ai.index",
      title: "Build AI index",
      aliases: ["context"],
      scope: ["ai", "workspace"],
      isEnabled: () => Boolean(state.workspace) && !state.isLoading,
      disabledReason: () => "Open a vault first",
      run: buildAiIndex,
    },
    {
      id: "ai.proposeTitle",
      title: "AI: propose title frontmatter",
      aliases: ["frontmatter", "metadata"],
      scope: ["ai", "file"],
      isEnabled: () => state.currentKind === "markdown" && Boolean(editor?.value),
      disabledReason: () => "Open a Markdown file first",
      run: proposeTitleFrontmatter,
    },
    {
      id: "view.commandPalette",
      title: "Open command palette",
      shortcut: "Ctrl+Shift+P",
      scope: ["global"],
      isEnabled: () => true,
      run: () => openCommandPalette(),
    },
    {
      id: "view.quickSwitcher",
      title: "Open quick switcher",
      shortcut: "Ctrl+O",
      scope: ["global"],
      isEnabled: () => true,
      run: () => openQuickSwitcher(),
    },
    {
      id: "view.focus",
      title: "Toggle focus mode",
      scope: ["global"],
      isEnabled: () => true,
      run: toggleFocusMode,
    },
    {
      id: "view.info",
      title: "Toggle document info",
      scope: ["global"],
      isEnabled: () => true,
      run: toggleDocumentInfo,
    },
    {
      id: "view.split",
      title: "Toggle edit and preview",
      aliases: ["split", "preview"],
      shortcut: "Ctrl+4",
      scope: ["global"],
      isEnabled: () => true,
      run: () => setEditorMode(state.editorMode === "split" ? "write" : "split"),
    },
    {
      id: "view.preview",
      title: "Toggle preview mode",
      aliases: ["rendered"],
      shortcut: "Ctrl+R",
      scope: ["global"],
      isEnabled: () => true,
      run: () => setEditorMode(state.editorMode === "preview" ? "write" : "preview"),
    },
    {
      id: "editor.bold",
      title: "Bold selection",
      shortcut: "Ctrl+B",
      scope: ["editor", "selection"],
      isEnabled: () => state.currentKind === "markdown",
      run: () => wrapSelection("**", "**", "bold text"),
    },
    {
      id: "editor.italic",
      title: "Italic selection",
      shortcut: "Ctrl+I",
      scope: ["editor", "selection"],
      isEnabled: () => state.currentKind === "markdown",
      run: () => wrapSelection("_", "_", "italic text"),
    },
    {
      id: "editor.link",
      title: "Insert link",
      shortcut: "Ctrl+K",
      scope: ["editor", "selection"],
      isEnabled: () => state.currentKind === "markdown",
      run: () => wrapSelection("[", "](url)", "link text"),
    },
    {
      id: "editor.code",
      title: "Inline code",
      scope: ["editor", "selection"],
      isEnabled: () => state.currentKind === "markdown",
      run: () => wrapSelection("`", "`", "code"),
    },
    {
      id: "insert.table",
      title: "Insert or format table",
      aliases: ["table"],
      shortcut: "Ctrl+Shift+T",
      scope: ["editor"],
      isEnabled: () => state.currentKind === "markdown",
      run: insertOrEditTable,
    },
    {
      id: "insert.math",
      title: "Insert formula block",
      aliases: ["latex", "katex", "equation"],
      scope: ["editor"],
      isEnabled: () => state.currentKind === "markdown",
      run: insertMathBlock,
    },
    {
      id: "insert.mermaid",
      title: "Insert Mermaid diagram",
      aliases: ["diagram", "flowchart"],
      scope: ["editor"],
      isEnabled: () => state.currentKind === "markdown",
      run: insertMermaidBlock,
    },
    {
      id: "insert.task",
      title: "Insert task list",
      scope: ["editor"],
      isEnabled: () => state.currentKind === "markdown",
      run: () => insertAtCursor("\n- [ ] Task\n"),
    },
  ];

  appCommands
    .filter((command) => AI_ENABLED || !command.scope.includes("ai"))
    .forEach(registerCommand);
}

function setStatus(name: string, path = "") {
  if (fileName) fileName.textContent = name;
  if (filePath) filePath.textContent = path;
  if (documentBreadcrumbs) {
    documentBreadcrumbs.textContent = state.currentRelativePath
      ? `${state.workspace?.name ?? "Vault"} / ${state.currentRelativePath}`
      : path || "No document selected";
  }
}

function setWorkspaceStatus(workspace: WorkspaceSnapshot | null) {
  if (workspaceName) workspaceName.textContent = workspace?.name ?? "No vault";
  if (workspacePath) workspacePath.textContent = workspace?.rootPath ?? "Open a vault or Markdown file.";
  updateAppMode();
}

function updateAppMode() {
  const isWorkspace = Boolean(state.workspace);
  const isSingleFile = !isWorkspace && Boolean(state.currentPath);
  document.body.classList.toggle("workspace-mode", isWorkspace);
  document.body.classList.toggle("single-file-mode", isSingleFile);
  document.body.classList.toggle("app-empty", !isWorkspace && !isSingleFile);
  if (appContextTitle) {
    appContextTitle.textContent = isWorkspace ? "Vault" : isSingleFile ? "Markdown file" : "Markdown editor";
  }
  if (documentBreadcrumbs && !state.currentPath) {
    documentBreadcrumbs.textContent = isWorkspace ? state.workspace?.name ?? "Vault" : "No document selected";
  }
}

function logOperation(message: string) {
  if (operationLog) operationLog.textContent = message;
}

function setFileState(label: string) {
  renderStateChips(label);
}

function setLoading(isLoading: boolean) {
  state.isLoading = isLoading;
  if (openButton) openButton.disabled = isLoading;
  if (openFolderButton) openFolderButton.disabled = isLoading;
  updateActionButtons();
}

function updateActionButtons() {
  const hasWorkspace = Boolean(state.workspace);
  const hasCurrentEntry = hasWorkspace && Boolean(state.currentRelativePath);
  const hasMarkdown = state.currentKind === "markdown" && Boolean(state.currentPath);

  if (saveButton) saveButton.disabled = !isCommandEnabled("file.save");
  if (newDocumentButton) newDocumentButton.disabled = !isCommandEnabled("file.new");
  if (renameEntryButton) renameEntryButton.disabled = !isCommandEnabled("file.rename");
  if (deleteEntryButton) deleteEntryButton.disabled = !isCommandEnabled("file.delete");
  if (publishButton) publishButton.disabled = !isCommandEnabled("publish.export");
  if (aiIndexButton) aiIndexButton.disabled = !isCommandEnabled("ai.index");
  if (aiProposeTitleButton) aiProposeTitleButton.disabled = !isCommandEnabled("ai.proposeTitle");
  if (syncNowButton) syncNowButton.disabled = !isCommandEnabled("sync.workspace");
  if (accountSyncButton) accountSyncButton.disabled = !isCommandEnabled("sync.workspace");
  if (syncPanelButton) syncPanelButton.textContent = state.syncToken ? state.syncUsername || "Account" : "Sign in";
  if (publishChecksButton) publishChecksButton.disabled = !isCommandEnabled("publish.check");
  if (favoriteCurrentButton) favoriteCurrentButton.disabled = !hasCurrentEntry && !hasMarkdown;
  if (favoriteCurrentTopButton) favoriteCurrentTopButton.disabled = !hasCurrentEntry && !hasMarkdown;

  document.querySelectorAll<HTMLButtonElement>("[data-command]").forEach((button) => {
    const commandId = button.dataset.command ?? "";
    button.disabled = !isCommandEnabled(commandId);
  });
}

function isCommandEnabled(commandId: string) {
  const command = commands.get(commandId);
  return command ? command.isEnabled() : false;
}

function setDirty(isDirty: boolean) {
  state.isDirty = isDirty;
  setFileState(isDirty ? "Unsaved changes" : state.currentPath ? "Saved" : "Ready");
  updateActionButtons();
  renderInspectorPanels();
}

async function renderMarkdown(content: string) {
  const rendered = await marked.parse(renderMath(content));

  if (!preview) return;

  if (content.trim()) {
    preview.classList.remove("empty");
    preview.innerHTML = DOMPurify.sanitize(rendered);
    prepareMermaidPreview();
    await renderMermaidPreview();
  } else {
    preview.classList.add("empty");
    preview.innerHTML = "<h2>Empty document</h2><p>Start typing Markdown to preview it here.</p>";
  }
}

function renderMath(content: string) {
  const withBlocks = content.replace(/\$\$([\s\S]+?)\$\$/g, (_match, expression: string) => {
    try {
      return `<div class="math-block">${katex.renderToString(expression.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<pre><code>${escapeHtml(expression.trim())}</code></pre>`;
    }
  });

  return withBlocks.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_match, prefix: string, expression: string) => {
    try {
      return `${prefix}${katex.renderToString(expression.trim(), { displayMode: false, throwOnError: false })}`;
    } catch {
      return `${prefix}$${expression}$`;
    }
  });
}

function prepareMermaidPreview() {
  if (!preview) return;
  preview.querySelectorAll<HTMLElement>("pre > code.language-mermaid").forEach((code) => {
    const block = document.createElement("div");
    block.className = "mermaid";
    block.textContent = code.textContent ?? "";
    code.parentElement?.replaceWith(block);
  });
}

async function renderMermaidPreview() {
  if (!preview) return;
  const nodes = preview.querySelectorAll<HTMLElement>(".mermaid");
  if (nodes.length === 0) return;
  try {
    if (!mermaidRenderer) {
      const module = await import("mermaid");
      mermaidRenderer = module.default;
      mermaidRenderer.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
    }
    await mermaidRenderer.run({ nodes });
  } catch (error) {
    logOperation(`Mermaid preview needs attention: ${String(error)}`);
  }
}

function basename(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

function isMarkdownPath(path: string) {
  return /\.(md|markdown|mdown|mkd)$/i.test(path);
}

function relativePathFromWorkspace(path: string) {
  if (!state.workspace) return "";
  const root = normalizePath(state.workspace.rootPath);
  const normalized = normalizePath(path);
  if (!normalized.startsWith(root)) return "";
  return normalized.slice(root.length).replace(/^\/+/, "");
}

function normalizePath(path: string) {
  return path.replace(/\\/g, "/");
}

function showError(message: string) {
  setFileState("Error");
  logOperation(message);
  if (preview) {
    preview.classList.add("empty");
    preview.innerHTML = `<h2>Something needs attention</h2><p>${DOMPurify.sanitize(message)}</p>`;
  }
}

function showNotice(message: string) {
  logOperation(message);
}

function openAccountDialog() {
  if (!accountDialog) return;
  renderSyncSession();
  accountDialog.classList.remove("hidden");
  setTimeout(() => (state.syncToken ? accountSyncButton : accountConnectButton)?.focus(), 0);
  if (state.syncToken) void refreshCloudWorkspaces();
}

function closeAccountDialog() {
  accountDialog?.classList.add("hidden");
}

async function openMarkdownFile(path: string, relativePath = "") {
  if (!isMarkdownPath(path)) {
    showError("Only Markdown files are supported right now.");
    return;
  }

  try {
    setLoading(true);
    setFileState("Opening");
    const content = await invoke<string>("read_markdown_file", { path });
    const derivedRelativePath = relativePath || relativePathFromWorkspace(path);
    if (!relativePath && state.workspace && !derivedRelativePath) {
      state.workspace = null;
      setWorkspaceStatus(null);
    }

    state.currentPath = path;
    state.currentRelativePath = derivedRelativePath;
    state.currentKind = "markdown";
    state.originalContent = content;
    state.pendingAiProposal = null;
    updateAppMode();
    setStatus(basename(path), path);

    if (editor) {
      editor.value = content;
      editor.disabled = false;
    }

    await renderMarkdown(content);
    setDirty(false);
    renderAllWorkspaceSurfaces();
    addRecent({ kind: "file", name: basename(path), path });
    logOperation(`Opened ${state.currentRelativePath || basename(path)}.`);
  } catch (error) {
    showError(String(error));
  } finally {
    setLoading(false);
  }
}

async function chooseMarkdownFile() {
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
    showError(String(error));
  }
}

async function chooseWorkspaceFolder() {
  try {
    const selected = await open({ multiple: false, directory: true });
    if (!selected) return;

    const selectedPath = Array.isArray(selected) ? selected[0] : selected;
    if (selectedPath) await openWorkspace(selectedPath);
  } catch (error) {
    showError(String(error));
  }
}

async function openDefaultVault() {
  try {
    setLoading(true);
    setFileState("Opening");
    const workspace = await invoke<WorkspaceSnapshot>("open_default_vault");
    await applyOpenedWorkspace(workspace);
    addRecent({ kind: "workspace", name: workspace.name, path: workspace.rootPath });
    logOperation(workspace.metadataCreated ? "Default vault created." : "Default vault opened.");
  } catch (error) {
    showError(String(error));
  } finally {
    setLoading(false);
  }
}

async function openWorkspace(path: string) {
  try {
    setLoading(true);
    setFileState("Opening");
    const workspace = await invoke<WorkspaceSnapshot>("open_workspace", { path });
    await applyOpenedWorkspace(workspace);
    addRecent({ kind: "workspace", name: workspace.name, path: workspace.rootPath });
    logOperation(workspace.metadataCreated ? "Vault opened and .jtype metadata created." : "Vault opened.");
  } catch (error) {
    showError(String(error));
  } finally {
    setLoading(false);
  }
}

async function applyOpenedWorkspace(workspace: WorkspaceSnapshot) {
  state.workspace = workspace;
  state.currentPath = "";
  state.currentRelativePath = "";
  state.currentKind = "";
  state.originalContent = "";
  state.pendingAiProposal = null;
  if (editor) {
    editor.value = "";
    editor.disabled = true;
  }
  await renderMarkdown("");
  setStatus("No file selected", "");
  setWorkspaceStatus(workspace);
  renderAllWorkspaceSurfaces();
  updateActionButtons();
}

async function saveCurrentFile() {
  if (!state.currentPath || !editor) return;

  try {
    setLoading(true);
    setFileState("Saving");
    await invoke("write_markdown_file", {
      path: state.currentPath,
      content: editor.value,
    });
    state.originalContent = editor.value;
    setDirty(false);
    logOperation(`Saved ${state.currentRelativePath || basename(state.currentPath)}.`);
    if (state.workspace && state.syncToken) {
      void syncWorkspaceToWeb({ silent: true });
    }
  } catch (error) {
    showError(String(error));
  } finally {
    setLoading(false);
  }
}

function syncServiceUrl() {
  return (
    accountServiceUrlInput?.value ||
    syncServiceUrlInput?.value ||
    state.cloudProfile?.serverUrl ||
    "http://localhost:13345"
  )
    .trim()
    .replace(/\/$/, "");
}

function setSyncSession(response: AuthResponse) {
  stopDevicePolling();
  state.oauthDeviceCode = "";
  state.oauthUserCode = "";
  state.syncToken = response.token || state.syncToken;
  state.syncUsername = response.username;
  state.syncSiteUrl = response.siteUrl;
  const profile: CloudProfile = {
    serverUrl: syncServiceUrl(),
    username: response.username,
    siteUrl: response.siteUrl,
    token: state.syncToken,
    deviceId: state.cloudProfile?.deviceId ?? "",
  };
  state.cloudProfile = profile;
  window.localStorage.setItem("jtype.sync.token", state.syncToken);
  window.localStorage.setItem("jtype.sync.username", response.username);
  window.localStorage.setItem("jtype.sync.siteUrl", response.siteUrl);
  void saveCloudProfile(profile);
  renderSyncSession();
  updateActionButtons();
}

async function loadCloudProfile() {
  if (!isTauriRuntime()) return;
  try {
    const profile = await invoke<CloudProfile>("load_cloud_profile");
    state.cloudProfile = profile;
    if (profile.token) state.syncToken = profile.token;
    if (profile.username) state.syncUsername = profile.username;
    if (profile.siteUrl) state.syncSiteUrl = profile.siteUrl;
    if (accountServiceUrlInput) accountServiceUrlInput.value = profile.serverUrl || "http://localhost:13345";
    if (syncServiceUrlInput) syncServiceUrlInput.value = profile.serverUrl || "http://localhost:13345";
    window.localStorage.setItem("jtype.sync.token", state.syncToken);
    window.localStorage.setItem("jtype.sync.username", state.syncUsername);
    window.localStorage.setItem("jtype.sync.siteUrl", state.syncSiteUrl);
    renderSyncSession();
  } catch (error) {
    logOperation(`Cloud profile unavailable: ${String(error)}`);
  }
}

async function saveCloudProfile(profile: CloudProfile) {
  if (!isTauriRuntime()) return;
  try {
    state.cloudProfile = await invoke<CloudProfile>("save_cloud_profile", { profile });
  } catch (error) {
    logOperation(`Cloud profile was not saved: ${String(error)}`);
  }
}

async function loadVaultBindings() {
  if (!isTauriRuntime()) return;
  try {
    state.vaultBindings = await invoke<VaultBinding[]>("list_vault_bindings");
    renderCloudWorkspaces();
  } catch (error) {
    logOperation(`Vault bindings unavailable: ${String(error)}`);
  }
}

async function refreshCloudWorkspaces() {
  if (!state.syncToken) return;
  try {
    const response = await fetch(`${syncServiceUrl()}/api/v1/workspaces`, {
      headers: { Authorization: `Bearer ${state.syncToken}` },
    });
    if (!response.ok) throw new Error(await response.text());
    const result = (await response.json()) as CloudWorkspaceListResponse;
    state.cloudWorkspaces = result.workspaces;
    renderCloudWorkspaces();
  } catch (error) {
    logOperation(`Cloud workspaces unavailable: ${String(error)}`);
  }
}

function renderCloudWorkspaces() {
  if (!accountWorkspaceList) return;
  if (!state.syncToken) {
    accountWorkspaceList.innerHTML = `<p class="text-xs text-stone-500">Connect to load workspaces.</p>`;
    return;
  }
  if (!state.cloudWorkspaces.length) {
    accountWorkspaceList.innerHTML = `<p class="text-xs text-stone-500">No cloud workspaces yet. Sync this vault to create one.</p>`;
    return;
  }
  accountWorkspaceList.innerHTML = state.cloudWorkspaces
    .map((workspace) => {
      const binding = state.vaultBindings.find((item) => item.workspaceId === workspace.id);
      const action = binding ? "Open" : "Bind";
      const path = binding ? `<span class="block truncate text-[11px] text-stone-500">${escapeHtml(binding.localVaultPath)}</span>` : "";
      return `<button class="sidebar-action w-full text-left" data-cloud-workspace="${escapeHtml(workspace.id)}" type="button"><span class="font-semibold">${escapeHtml(workspace.name)}</span><span class="ml-2 text-xs text-stone-500">${escapeHtml(workspace.role)} · ${action}</span>${path}</button>`;
    })
    .join("");
  accountWorkspaceList.querySelectorAll<HTMLButtonElement>("[data-cloud-workspace]").forEach((button) => {
    button.addEventListener("click", () => void openOrBindCloudWorkspace(button.dataset.cloudWorkspace ?? ""));
  });
}

async function openOrBindCloudWorkspace(workspaceId: string) {
  const workspace = state.cloudWorkspaces.find((item) => item.id === workspaceId);
  if (!workspace) return;
  const existing = state.vaultBindings.find((item) => item.workspaceId === workspaceId);
  if (existing) {
    await openWorkspace(existing.localVaultPath);
    return;
  }
  const selected = await open({ multiple: false, directory: true });
  const selectedPath = Array.isArray(selected) ? selected[0] : selected;
  if (!selectedPath) return;
  const binding: VaultBinding = {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    localVaultPath: selectedPath,
    lastPulledClock: 0,
  };
  await saveVaultBinding(binding);
  await openWorkspace(selectedPath);
  await pullCloudWorkspace(binding);
}

function renderSyncSession() {
  if (syncUsernameInput && state.syncUsername) syncUsernameInput.value = state.syncUsername;
  if (syncServiceUrlInput && accountServiceUrlInput) syncServiceUrlInput.value = accountServiceUrlInput.value;
  if (accountStatus) {
    accountStatus.textContent = state.syncToken
      ? `Connected as ${state.syncUsername}. Sync vaults with cloud workspaces.`
      : state.oauthUserCode
        ? `Waiting for browser authorization (code ${state.oauthUserCode})...`
        : "Connect in the browser. Desktop never asks for your password.";
  }

  if (state.syncSiteUrl) {
    const displaySiteUrl = state.syncSiteUrl.replace("/@", "/u");
    for (const link of [syncSiteLink, accountSiteLink]) {
      if (!link) continue;
      link.href = displaySiteUrl;
      link.textContent = `Open site: ${displaySiteUrl}`;
      link.classList.remove("hidden");
    }
  } else {
    syncSiteLink?.classList.add("hidden");
    accountSiteLink?.classList.add("hidden");
  }
  if (state.syncToken) {
    accountConnectButton?.classList.add("hidden");
    accountDisconnectButton?.classList.remove("hidden");
  } else {
    accountConnectButton?.classList.remove("hidden");
    accountDisconnectButton?.classList.add("hidden");
  }
  renderCloudWorkspaces();
  renderConflictList();
  updateActionButtons();
}

function stopDevicePolling() {
  if (devicePollTimer !== null) {
    clearInterval(devicePollTimer);
    devicePollTimer = null;
  }
}

async function startBrowserOAuth() {
  try {
    setLoading(true);
    const response = await fetch(`${syncServiceUrl()}/api/oauth/device/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: state.cloudProfile?.deviceId ?? "desktop" }),
    });
    if (!response.ok) throw new Error(await response.text());
    const start = (await response.json()) as OAuthDeviceStartResponse;
    state.oauthDeviceCode = start.deviceCode;
    state.oauthUserCode = start.userCode;
    renderSyncSession();
    await openUrl(start.verificationUrl);
    logOperation(`Browser authorization opened. Use code ${start.userCode}.`);

    stopDevicePolling();
    devicePollTimer = window.setInterval(async () => {
      try {
        const pollResponse = await fetch(`${syncServiceUrl()}/api/oauth/device/poll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceCode: state.oauthDeviceCode }),
        });
        if (pollResponse.ok) {
          const auth = (await pollResponse.json()) as AuthResponse;
          stopDevicePolling();
          state.oauthDeviceCode = "";
          state.oauthUserCode = "";
          setSyncSession(auth);
          await refreshCloudWorkspaces();
          logOperation(`Connected as ${auth.username}.`);
          renderSyncSession();
          return;
        }
        const errText = await pollResponse.text();
        if (errText.includes("authorization pending")) {
          return;
        }
        stopDevicePolling();
        state.oauthDeviceCode = "";
        state.oauthUserCode = "";
        showError(`Authorization failed: ${errText}`);
        renderSyncSession();
      } catch (error) {
        stopDevicePolling();
        state.oauthDeviceCode = "";
        state.oauthUserCode = "";
        showError(String(error));
        renderSyncSession();
      }
    }, 1000);
  } catch (error) {
    showError(String(error));
  } finally {
    setLoading(false);
  }
}

async function disconnectAccount() {
  stopDevicePolling();
  state.syncToken = "";
  state.syncUsername = "";
  state.syncSiteUrl = "";
  state.cloudProfile = null;
  state.vaultBindings = [];
  state.cloudWorkspaces = [];
  state.oauthDeviceCode = "";
  state.oauthUserCode = "";
  window.localStorage.removeItem("jtype.sync.token");
  window.localStorage.removeItem("jtype.sync.username");
  window.localStorage.removeItem("jtype.sync.siteUrl");
  window.localStorage.removeItem("jtype.sync.snapshot");
  renderSyncSession();
  updateActionButtons();
  logOperation("Disconnected from cloud account.");
}

async function syncWorkspaceToWeb(options: { silent?: boolean } = {}) {
  if (!state.workspace) {
    showError("Open a vault before syncing.");
    return;
  }
  if (!state.syncToken) {
    showError("Login or register before syncing.");
    return;
  }

  try {
    setLoading(true);
    if (!options.silent) logOperation("Syncing vault...");
    const documents = await invoke<SyncDocument[]>("collect_sync_documents", {
      rootPath: state.workspace.rootPath,
    });
    const binding = currentVaultBinding();
    if (binding) {
      await pullCloudWorkspace(binding);
      const push = await fetch(`${syncServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/sync/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.syncToken}`,
        },
        body: JSON.stringify({
          deviceId: state.cloudProfile?.deviceId ?? "desktop",
          documents: documents.map((document) => ({
            relativePath: document.relativePath,
            title: document.title,
            status: document.status,
            content: document.content,
          })),
        }),
      });
      if (!push.ok) throw new Error(await push.text());
      const result = (await push.json()) as SyncPushResponse;
      state.activeConflicts = result.conflicts ?? [];
      state.lastSyncSnapshot = `${Date.now()}:${documents.map((document) => `${document.relativePath}:${document.content.length}`).join("|")}`;
      window.localStorage.setItem("jtype.sync.snapshot", state.lastSyncSnapshot);
      await applyCloudDocuments(result.documents);
      renderSyncSession();
      renderAllWorkspaceSurfaces();
      logOperation(`Synced ${result.accepted} document(s) with cloud workspace ${binding.workspaceName}.`);
      return;
    }

    const response = await fetch(`${syncServiceUrl()}/api/sync/workspace`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.syncToken}`,
      },
      body: JSON.stringify({ workspaceName: state.workspace.name, documents }),
    });
    if (!response.ok) throw new Error(await response.text());
    const result = (await response.json()) as SyncResponse;
    state.syncSiteUrl = result.siteUrl;
    state.lastSyncSnapshot = `${Date.now()}:${documents.map((document) => `${document.relativePath}:${document.content.length}`).join("|")}`;
    window.localStorage.setItem("jtype.sync.siteUrl", result.siteUrl);
    window.localStorage.setItem("jtype.sync.snapshot", state.lastSyncSnapshot);
    if (result.workspaceId && state.workspace) {
      window.localStorage.setItem(`jtype.workspaceBinding:${state.workspace.rootPath}`, result.workspaceId);
      const binding: VaultBinding = {
        workspaceId: result.workspaceId,
        workspaceName: result.workspaceName,
        workspaceSlug: slugify(result.workspaceName),
        localVaultPath: state.workspace.rootPath,
        lastPulledClock: 0,
      };
      await saveVaultBinding(binding);
      await refreshCloudWorkspaces();
    }
    renderSyncSession();
    renderAllWorkspaceSurfaces();
    logOperation(`Synced ${result.documentCount} document(s) to ${result.siteUrl}.`);
  } catch (error) {
    showError(String(error));
  } finally {
    setLoading(false);
  }
}

async function createDocument(defaultPath = "untitled.md") {
  if (!state.workspace) return;
  const relativePath = window.prompt("New Markdown path or folder name", defaultPath)?.trim();
  if (!relativePath) return;
  const kind: EntryKind = isMarkdownPath(relativePath) ? "markdown" : "folder";

  try {
    setLoading(true);
    const workspace = await invoke<WorkspaceSnapshot>("create_workspace_entry", {
      rootPath: state.workspace.rootPath,
      relativePath,
      kind,
    });
    state.workspace = workspace;
    setWorkspaceStatus(workspace);
    renderAllWorkspaceSurfaces();
    if (kind === "markdown") {
      await openMarkdownFile(`${workspace.rootPath}/${relativePath}`, relativePath);
    } else {
      selectTreeNode({ name: basename(relativePath), path: `${workspace.rootPath}/${relativePath}`, relativePath, kind: "folder", children: [] });
      logOperation(`Created folder ${relativePath}.`);
    }
  } catch (error) {
    showError(String(error));
  } finally {
    setLoading(false);
  }
}

async function renameCurrentEntryWithImpact() {
  if (!state.workspace || !state.currentRelativePath) return;
  const fromRelativePath = state.currentRelativePath;
  const nextPath = window.prompt("Move or rename path", fromRelativePath)?.trim();
  if (!nextPath || nextPath === fromRelativePath) return;

  const impacted = await findLinkImpacts(fromRelativePath);
  let updateLinks = false;
  if (impacted.length > 0) {
    updateLinks = window.confirm(
      `Rename impact:\n\n${impacted.length} Markdown file(s) link to ${fromRelativePath}.\n\nChoose OK to rename and update links, or Cancel to rename only.`
    );
  }

  await renameEntry(fromRelativePath, nextPath, updateLinks);
}

async function renameEntry(fromRelativePath: string, toRelativePath: string, updateLinks: boolean) {
  if (!state.workspace) return;

  try {
    setLoading(true);
    const impacted = updateLinks ? await findLinkImpacts(fromRelativePath) : [];
    const workspace = await invoke<WorkspaceSnapshot>("rename_workspace_entry", {
      rootPath: state.workspace.rootPath,
      fromRelativePath,
      toRelativePath,
    });
    state.workspace = workspace;

    if (updateLinks) {
      await updateLinksAfterRename(impacted, fromRelativePath, toRelativePath);
    }

    setWorkspaceStatus(workspace);
    renderAllWorkspaceSurfaces();
    if (isMarkdownPath(toRelativePath)) {
      await openMarkdownFile(`${workspace.rootPath}/${toRelativePath}`, toRelativePath);
    } else {
      selectTreeNode({ name: basename(toRelativePath), path: `${workspace.rootPath}/${toRelativePath}`, relativePath: toRelativePath, kind: "folder", children: [] });
      logOperation(`Renamed entry to ${toRelativePath}.`);
    }
  } catch (error) {
    showError(String(error));
  } finally {
    setLoading(false);
  }
}

async function deleteCurrentEntry() {
  if (!state.workspace || !state.currentRelativePath) return;
  const confirmed = window.confirm(`Delete ${state.currentRelativePath}? This removes it from disk.`);
  if (!confirmed) return;

  try {
    setLoading(true);
    const workspace = await invoke<WorkspaceSnapshot>("delete_workspace_entry", {
      rootPath: state.workspace.rootPath,
      relativePath: state.currentRelativePath,
    });
    state.workspace = workspace;
    clearCurrentDocument();
    await renderMarkdown("");
    setDirty(false);
    setWorkspaceStatus(workspace);
    renderAllWorkspaceSurfaces();
    logOperation("Entry deleted.");
  } catch (error) {
    showError(String(error));
  } finally {
    setLoading(false);
  }
}

function clearCurrentDocument() {
  state.currentPath = "";
  state.currentRelativePath = "";
  state.currentKind = "";
  state.originalContent = "";
  state.pendingAiProposal = null;
  if (editor) {
    editor.value = "";
    editor.disabled = true;
  }
  setStatus("No file selected", "");
}

async function exportSite() {
  if (!state.workspace) return;

  try {
    setLoading(true);
    const validation = await invoke<ValidationResult>("validate_workspace", {
      rootPath: state.workspace.rootPath,
    });
    if (validation.errors.length > 0) {
      logOperation(`Export blocked: ${validation.errors[0]}`);
      renderPublishPanel(validation);
      return;
    }

    const result = await invoke<PublishResult>("export_static_site", {
      rootPath: state.workspace.rootPath,
      outputRelativePath: ".jtype/dist",
    });
    const warningText = validation.warnings.length > 0 ? ` ${validation.warnings.length} warning(s).` : "";
    logOperation(`Exported ${result.pages.length} page(s) to ${result.outputDir}.${warningText}`);
    renderPublishPanel(validation);

    if (result.pages.length > 0) {
      const firstPage = `${result.outputDir}/${result.pages[0]}`;
      try {
        await openPath(firstPage);
      } catch {
        showNotice(
          `Exported to ${result.outputDir}. Could not auto-open the local preview from this desktop permission scope.`
        );
      }
    }
  } catch (error) {
    showError(String(error));
  } finally {
    setLoading(false);
  }
}

async function runPublishChecks() {
  if (!state.workspace) return;
  try {
    setLoading(true);
    const validation = await invoke<ValidationResult>("validate_workspace", {
      rootPath: state.workspace.rootPath,
    });
    renderPublishPanel(validation);
    await renderPublishQueue(validation);
    const issueCount = validation.errors.length + validation.warnings.length;
    logOperation(issueCount > 0 ? `Publish checks found ${issueCount} issue(s).` : "Publish checks passed.");
    setActivity("publish");
    setInspector("publish");
  } catch (error) {
    showError(String(error));
  } finally {
    setLoading(false);
  }
}

async function buildAiIndex() {
  if (!state.workspace) return;

  try {
    setLoading(true);
    const result = await invoke<AiIndexResult>("build_ai_index", {
      rootPath: state.workspace.rootPath,
    });
    logOperation(
      `AI index wrote ${result.documents} document(s), ${result.chunks} chunk(s), ${result.links} link(s), ${result.assets} asset(s) to ${result.outputFile}.`
    );
    setActivity("ai");
    setInspector("ai");
    renderAiPanel(`Index ready: ${result.documents} documents, ${result.chunks} chunks.`);
  } catch (error) {
    showError(String(error));
  } finally {
    setLoading(false);
  }
}

async function openInitialPath() {
  try {
    const paths = await invoke<string[]>("initial_open_paths");
    const firstMarkdownPath = paths.find(isMarkdownPath);
    if (firstMarkdownPath) await openMarkdownFile(firstMarkdownPath);
  } catch (error) {
    showError(String(error));
  }
}

async function registerDragDrop() {
  const webview = getCurrentWebview();

  await webview.onDragDropEvent((event) => {
    if (event.payload.type !== "drop") return;

    const firstPath = event.payload.paths[0];
    const firstMarkdownPath = event.payload.paths.find(isMarkdownPath);

    if (firstMarkdownPath) {
      void openMarkdownFile(firstMarkdownPath);
    } else if (firstPath) {
      void openWorkspace(firstPath);
    }
  });
}

function renderAllWorkspaceSurfaces() {
  updateAppMode();
  renderFileTree();
  renderFavoriteItems();
  renderRecentItems();
  renderSearchResults();
  void renderLibraryView();
  void renderPublishQueue();
  renderInspectorPanels();
  renderStateChips(state.isDirty ? "Unsaved changes" : state.currentPath ? "Saved" : "Ready");
  updateActionButtons();
}

function renderFileTree() {
  if (!fileTree) return;

  fileTree.innerHTML = "";

  if (!state.workspace) {
    const empty = document.createElement("p");
    empty.className = "rounded-md border border-dashed border-stone-300 p-3 text-sm text-stone-500";
    empty.textContent = "Drop a folder here to open it as a vault.";
    fileTree.append(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "space-y-1";
  renderNodes(state.workspace.entries, list, 0);
  fileTree.append(list);
}

function selectTreeNode(node: FileTreeNode) {
  state.currentPath = node.path;
  state.currentRelativePath = node.relativePath;
  state.currentKind = node.kind;
  state.originalContent = "";
  state.pendingAiProposal = null;
  if (editor) {
    editor.value = "";
    editor.disabled = true;
  }
  setStatus(node.name, node.path);
  setFileState("Selected");
  renderAllWorkspaceSurfaces();
}

function renderNodes(nodes: FileTreeNode[], parent: HTMLElement, depth: number) {
  for (const node of nodes) {
    if (node.relativePath === ".jtype") continue;
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tree-button${node.relativePath === state.currentRelativePath ? " tree-button-active" : ""}`;
    button.style.paddingLeft = `${0.5 + depth * 0.75}rem`;
    button.textContent = `${iconForNode(node)} ${node.name}`;
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      state.contextNode = node;
      showContextMenu(event.clientX, event.clientY, node);
    });

    if (node.kind === "markdown") {
      button.addEventListener("click", () => void openMarkdownFile(node.path, node.relativePath));
    } else if (node.kind === "folder") {
      button.addEventListener("click", () => selectTreeNode(node));
    } else {
      button.disabled = true;
    }

    item.append(button);

    if (node.children.length > 0) {
      const childList = document.createElement("ul");
      childList.className = "mt-1 space-y-1";
      renderNodes(node.children, childList, depth + 1);
      item.append(childList);
    }

    parent.append(item);
  }
}

function showContextMenu(x: number, y: number, node: FileTreeNode) {
  if (!contextMenu) return;
  contextMenu.innerHTML = "";
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;

  const items: Array<[string, () => void, boolean?]> = [
    ["Open", () => (node.kind === "markdown" ? void openMarkdownFile(node.path, node.relativePath) : selectTreeNode(node)), false],
    ["Rename / move", () => {
      state.currentPath = node.path;
      state.currentRelativePath = node.relativePath;
      state.currentKind = node.kind;
      void renameCurrentEntryWithImpact();
    }],
    ["Delete", () => {
      state.currentPath = node.path;
      state.currentRelativePath = node.relativePath;
      state.currentKind = node.kind;
      void deleteCurrentEntry();
    }],
    ["Toggle favorite", () => toggleFavorite(node.path), node.kind !== "markdown"],
    ["Copy Markdown link", () => void navigator.clipboard?.writeText(`[${node.name}](${node.relativePath})`), node.kind !== "markdown"],
    ["Copy public URL", () => void navigator.clipboard?.writeText(publicUrlFor(node.relativePath)), node.kind !== "markdown" || !state.syncSiteUrl],
    ["Reveal in Explorer", () => void openPath(node.path)],
  ];

  for (const [label, action, disabled] of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "context-menu-button";
    button.textContent = label;
    button.disabled = Boolean(disabled);
    button.addEventListener("click", () => {
      hideContextMenu();
      action();
    });
    contextMenu.append(button);
  }

  contextMenu.classList.remove("hidden");
}

function hideContextMenu() {
  contextMenu?.classList.add("hidden");
}

function iconForNode(node: FileTreeNode) {
  if (node.kind === "folder") return ">";
  if (node.kind === "markdown") return "MD";
  return "*";
}

function flattenNodes(nodes = state.workspace?.entries ?? []): FileTreeNode[] {
  const flattened: FileTreeNode[] = [];
  for (const node of nodes) {
    if (node.relativePath !== ".jtype") flattened.push(node);
    flattened.push(...flattenNodes(node.children));
  }
  return flattened;
}

function markdownNodes() {
  return flattenNodes().filter((node) => node.kind === "markdown");
}

function readRecentItems() {
  try {
    return JSON.parse(window.localStorage.getItem("jtype.recent") ?? "[]") as RecentItem[];
  } catch {
    return [];
  }
}

function addRecent(item: RecentItem) {
  const nextItems = [item, ...readRecentItems().filter((recent) => recent.path !== item.path)].slice(0, 12);
  window.localStorage.setItem("jtype.recent", JSON.stringify(nextItems));
  renderRecentItems();
}

function renderRecentItems() {
  const items = readRecentItems();

  renderRecentHost(recentList, items, "text-xs");
  renderRecentHost(welcomeRecentList, items, "text-sm");
}

function renderRecentHost(host: HTMLElement | null, items: RecentItem[], textClass: string) {
  if (!host) return;
  host.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = `${textClass} text-stone-500`;
    empty.textContent = "No recent vaults or Markdown files yet.";
    host.append(empty);
    return;
  }

  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tree-button ${textClass}`;
    button.textContent = `${item.kind === "workspace" ? "WS" : "MD"} ${item.name}`;
    button.addEventListener("click", () => {
      if (item.kind === "workspace") void openWorkspace(item.path);
      else void openMarkdownFile(item.path);
    });
    host.append(button);
  }
}

function currentVaultBinding() {
  if (!state.workspace) return null;
  return state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath) ?? null;
}

async function pullCloudWorkspace(binding: VaultBinding) {
  if (!state.workspace || !state.syncToken) return;
  const response = await fetch(`${syncServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/sync/pull`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.syncToken}`,
    },
    body: JSON.stringify({
      sinceClock: binding.lastPulledClock,
      deviceId: state.cloudProfile?.deviceId ?? "desktop",
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  const result = (await response.json()) as { documents: CloudDocument[]; conflicts: SyncConflict[] };
  state.activeConflicts = result.conflicts ?? [];
  await applyCloudDocuments(result.documents);
  const nextClock = Math.max(binding.lastPulledClock, ...result.documents.map((doc) => doc.updatedClock));
  await saveVaultBinding({ ...binding, lastPulledClock: Number.isFinite(nextClock) ? nextClock : binding.lastPulledClock });
}

async function applyCloudDocuments(documents: CloudDocument[]) {
  if (!state.workspace || documents.length === 0) return;
  const workspace = await invoke<WorkspaceSnapshot>("apply_cloud_documents", {
    rootPath: state.workspace.rootPath,
    documents: documents.map((document) => ({
      relativePath: document.relativePath,
      content: document.content,
    })),
  });
  state.workspace = workspace;
  setWorkspaceStatus(workspace);
  renderAllWorkspaceSurfaces();
}

function renderConflictList() {
  if (!accountConflictList) return;
  if (!state.activeConflicts.length) {
    accountConflictList.innerHTML = `<p class="text-xs text-stone-500">No conflicts.</p>`;
    return;
  }
  accountConflictList.innerHTML = state.activeConflicts
    .map((conflict) => `<div class="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs"><p class="font-semibold text-amber-900">${escapeHtml(conflict.relativePath)}</p><div class="mt-2 grid grid-cols-2 gap-2"><button class="sidebar-action" data-conflict-local="${escapeHtml(conflict.conflictId)}" type="button">Accept local</button><button class="sidebar-action" data-conflict-cloud="${escapeHtml(conflict.conflictId)}" type="button">Accept cloud</button></div></div>`)
    .join("");
  accountConflictList.querySelectorAll<HTMLButtonElement>("[data-conflict-local]").forEach((button) => {
    button.addEventListener("click", () => void resolveConflict(button.dataset.conflictLocal ?? "", "accept_local"));
  });
  accountConflictList.querySelectorAll<HTMLButtonElement>("[data-conflict-cloud]").forEach((button) => {
    button.addEventListener("click", () => void resolveConflict(button.dataset.conflictCloud ?? "", "accept_cloud"));
  });
}

async function resolveConflict(conflictId: string, resolution: "accept_local" | "accept_cloud") {
  const binding = currentVaultBinding();
  if (!binding || !state.syncToken) return;
  try {
    const response = await fetch(`${syncServiceUrl()}/api/v1/workspaces/${binding.workspaceId}/conflicts/${conflictId}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.syncToken}`,
      },
      body: JSON.stringify({ resolution }),
    });
    if (!response.ok) throw new Error(await response.text());
    const document = (await response.json()) as CloudDocument;
    state.activeConflicts = state.activeConflicts.filter((conflict) => conflict.conflictId !== conflictId);
    await applyCloudDocuments([document]);
    renderSyncSession();
    logOperation(`Resolved conflict in ${document.relativePath}.`);
  } catch (error) {
    showError(String(error));
  }
}

async function saveVaultBinding(binding: VaultBinding) {
  if (!isTauriRuntime()) return;
  try {
    state.vaultBindings = await invoke<VaultBinding[]>("bind_cloud_workspace", { binding });
  } catch (error) {
    logOperation(`Vault binding was not saved: ${String(error)}`);
  }
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "workspace";
}

function favoriteKey() {
  return `jtype.favorites:${state.workspace?.rootPath ?? "global"}`;
}

function readFavorites() {
  try {
    return JSON.parse(window.localStorage.getItem(favoriteKey()) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function writeFavorites(paths: string[]) {
  window.localStorage.setItem(favoriteKey(), JSON.stringify(paths));
}

function toggleCurrentFavorite() {
  if (!state.currentPath) return;
  toggleFavorite(state.currentPath);
}

function toggleFavorite(path: string) {
  const favorites = readFavorites();
  const next = favorites.includes(path) ? favorites.filter((item) => item !== path) : [path, ...favorites];
  writeFavorites(next);
  renderFavoriteItems();
  renderStateChips(state.isDirty ? "Dirty" : "Saved");
}

function renderFavoriteItems() {
  if (!favoriteList) return;
  favoriteList.innerHTML = "";
  const favorites = readFavorites();
  const nodes = markdownNodes();
  const favoriteNodes = favorites
    .map((path) => nodes.find((node) => node.path === path))
    .filter((node): node is FileTreeNode => Boolean(node));

  if (favoriteNodes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "text-xs text-stone-500";
    empty.textContent = "No favorites yet.";
    favoriteList.append(empty);
    return;
  }

  for (const node of favoriteNodes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tree-button text-xs";
    button.textContent = `Star ${node.name}`;
    button.addEventListener("click", () => void openMarkdownFile(node.path, node.relativePath));
    favoriteList.append(button);
  }
}

function renderStateChips(label: string) {
  if (!stateChips) return;

  const chips: Array<[string, string, string?]> = [[label, label === "Unsaved changes" ? "status-chip-warning" : label === "Error" ? "status-chip-error" : "status-chip-neutral", "file-state"]];
  if (state.currentKind === "markdown" && editor) {
    const frontmatter = parseFrontmatter(editor.value).data;
    const publishStatus = frontmatter.status || (truthy(frontmatter.publish) ? "published" : "draft");
    chips.push([publishStatus, publishStatus === "published" ? "status-chip-success" : "status-chip-neutral"]);
    if (state.syncSiteUrl) chips.push(["Synced", "status-chip-info"]);
    if (isFavorite(state.currentPath)) chips.push(["Favorite", "status-chip-success"]);
  }

  stateChips.innerHTML = "";
  for (const [text, className, id] of chips) {
    const chip = document.createElement("span");
    chip.className = `status-chip ${className}`;
    chip.textContent = text;
    if (id) chip.id = id;
    stateChips.append(chip);
  }
}

function isFavorite(path: string) {
  return path ? readFavorites().includes(path) : false;
}

function parseFrontmatter(content: string): FrontmatterParse {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    return { data: {}, body: content, hasFrontmatter: false };
  }
  const normalized = content.replace(/\r\n/g, "\n");
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) return { data: {}, body: content, hasFrontmatter: false };

  const yaml = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).replace(/^\n/, "");
  const data: Record<string, string> = {};
  for (const line of yaml.split("\n")) {
    const index = line.indexOf(":");
    if (index > 0) {
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      data[key] = value;
    }
  }
  return { data, body, hasFrontmatter: true };
}

function writeFrontmatter(content: string, nextData: Record<string, string>) {
  const parsed = parseFrontmatter(content);
  const merged = { ...parsed.data, ...nextData };
  const yaml = Object.entries(merged)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  return `---\n${yaml}\n---\n\n${parsed.body.trimStart()}`;
}

function titleFromMarkdown(content: string, fallback: string) {
  const parsed = parseFrontmatter(content);
  if (parsed.data.title) return parsed.data.title;
  const match = parsed.body.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function truthy(value: string | undefined) {
  return ["true", "yes", "1", "published"].includes((value ?? "").toLowerCase());
}

function renderInspectorPanels() {
  renderPropertiesPanel();
  renderOutlinePanel();
  void renderLinksPanel();
  renderPublishPanel();
  renderAiPanel();
}

function renderPropertiesPanel() {
  if (!propertiesPanel) return;
  if (!editor || state.currentKind !== "markdown") {
    propertiesPanel.innerHTML = `<p class="text-sm text-stone-500">Open a Markdown file to edit frontmatter properties.</p>`;
    return;
  }

  const parsed = parseFrontmatter(editor.value);
  const fields = ["title", "description", "tags", "slug", "status", "publish", "createdAt", "updatedAt"];
  propertiesPanel.innerHTML = `
    <div class="space-y-4">
      <div>
        <p class="text-sm font-semibold text-stone-950">Properties</p>
        <p class="mt-1 text-xs text-stone-500">Edits are written back to YAML frontmatter.</p>
      </div>
      <div id="properties-fields" class="space-y-3"></div>
      <div>
        <label class="field-label" for="frontmatter-source">Frontmatter source</label>
        <textarea id="frontmatter-source" class="field-textarea" readonly>${escapeHtml(
          Object.entries(parsed.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n")
        )}</textarea>
      </div>
    </div>
  `;

  const fieldsHost = propertiesPanel.querySelector<HTMLElement>("#properties-fields");
  if (!fieldsHost) return;
  for (const field of fields) {
    const label = document.createElement("label");
    label.className = "block";
    label.innerHTML = `<span class="field-label">${field}</span>`;
    const input = document.createElement("input");
    input.className = "field-input";
    input.value = parsed.data[field] ?? "";
    input.placeholder = field === "status" ? "draft | published | archived" : "";
    input.addEventListener("change", () => updateFrontmatterField(field, input.value));
    label.append(input);
    fieldsHost.append(label);
  }
}

function updateFrontmatterField(field: string, value: string) {
  if (!editor) return;
  editor.value = writeFrontmatter(editor.value, { [field]: value.trim() });
  void renderMarkdown(editor.value);
  setDirty(editor.value !== state.originalContent);
}

function renderOutlinePanel() {
  if (!outlinePanel) return;
  if (!editor || state.currentKind !== "markdown") {
    outlinePanel.innerHTML = `<p class="text-sm text-stone-500">Open a Markdown file to see its outline.</p>`;
    return;
  }
  const headings = extractHeadings(editor.value);
  if (headings.length === 0) {
    outlinePanel.innerHTML = `<p class="text-sm text-stone-500">No headings found.</p>`;
    return;
  }

  outlinePanel.innerHTML = `<div class="space-y-1"></div>`;
  const host = outlinePanel.firstElementChild as HTMLElement | null;
  if (!host) return;
  for (const heading of headings) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tree-button";
    button.style.paddingLeft = `${heading.level * 0.5}rem`;
    button.textContent = heading.title;
    button.addEventListener("click", () => focusEditorLine(heading.line));
    host.append(button);
  }
}

function extractHeadings(content: string) {
  return content.split("\n").flatMap((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    return match ? [{ level: match[1].length, title: match[2].trim(), line: index }] : [];
  });
}

function focusEditorLine(lineNumber: number) {
  if (!editor) return;
  const lines = editor.value.split("\n");
  const position = lines.slice(0, lineNumber).join("\n").length + (lineNumber > 0 ? 1 : 0);
  editor.focus();
  editor.setSelectionRange(position, position);
}

async function renderLinksPanel() {
  if (!linksPanel) return;
  if (!editor || state.currentKind !== "markdown") {
    linksPanel.innerHTML = `<p class="text-sm text-stone-500">Open a Markdown file to inspect links.</p>`;
    return;
  }

  const outgoing = extractMarkdownLinks(editor.value);
  const backlinks = state.currentRelativePath ? await findLinkImpacts(state.currentRelativePath) : [];
  linksPanel.innerHTML = `
    <div class="space-y-4">
      <section>
        <p class="text-sm font-semibold text-stone-950">Outgoing links</p>
        <div class="mt-2 space-y-1">${outgoing.length ? outgoing.map((link) => linkRow(link.target, link.line)).join("") : emptyText("No outgoing links.")}</div>
      </section>
      <section>
        <p class="text-sm font-semibold text-stone-950">Backlinks</p>
        <div class="mt-2 space-y-1">${backlinks.length ? backlinks.map((link) => linkRow(link.relativePath, link.line)).join("") : emptyText("No backlinks found.")}</div>
      </section>
      <section>
        <p class="text-sm font-semibold text-stone-950">Public URL</p>
        <p class="mt-2 break-all text-xs text-stone-600">${state.syncSiteUrl && state.currentRelativePath ? publicUrlFor(state.currentRelativePath) : "Sync to web to get a public URL."}</p>
      </section>
    </div>
  `;
}

function linkRow(target: string, line: number) {
  return `<div class="rounded-md border border-stone-200 px-2 py-1.5 text-xs"><span class="font-semibold text-stone-800">${escapeHtml(
    target
  )}</span><span class="ml-2 text-stone-500">line ${line + 1}</span></div>`;
}

function emptyText(text: string) {
  return `<p class="text-xs text-stone-500">${text}</p>`;
}

function extractMarkdownLinks(content: string) {
  const links: Array<{ target: string; line: number }> = [];
  content.split("\n").forEach((line, index) => {
    for (const match of line.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      links.push({ target: match[1], line: index });
    }
    for (const match of line.matchAll(/\[\[([^\]]+)\]\]/g)) {
      links.push({ target: match[1], line: index });
    }
  });
  return links;
}

async function findLinkImpacts(targetRelativePath: string) {
  if (!state.workspace) return [];
  const targetName = basename(targetRelativePath);
  const impacts: Array<{ relativePath: string; path: string; line: number; content: string }> = [];

  for (const node of markdownNodes()) {
    try {
      const content = node.path === state.currentPath && editor ? editor.value : await invoke<string>("read_markdown_file", { path: node.path });
      const links = extractMarkdownLinks(content);
      for (const link of links) {
        if (normalizePath(link.target) === normalizePath(targetRelativePath) || basename(link.target) === targetName) {
          impacts.push({ relativePath: node.relativePath, path: node.path, line: link.line, content });
        }
      }
    } catch {
      // Ignore unreadable files in impact preview; publish checks will surface broader problems.
    }
  }
  return impacts;
}

async function updateLinksAfterRename(
  impacts: Array<{ relativePath: string; path: string; content: string }>,
  fromRelativePath: string,
  toRelativePath: string
) {
  const fromName = basename(fromRelativePath);
  const toName = basename(toRelativePath);
  const seen = new Set<string>();

  for (const impact of impacts) {
    if (seen.has(impact.path)) continue;
    seen.add(impact.path);
    const before = impact.content;
    const after = replaceAllText(
      replaceAllText(
        replaceAllText(replaceAllText(before, `](${fromRelativePath})`, `](${toRelativePath})`), `](${fromName})`, `](${toName})`),
        `[[${fromRelativePath}]]`,
        `[[${toRelativePath}]]`
      ),
      `[[${fromName}]]`,
      `[[${toName}]]`
    );
    if (after !== before) {
      await invoke("write_markdown_file", { path: impact.path, content: after });
    }
  }
}

function replaceAllText(value: string, from: string, to: string) {
  return value.split(from).join(to);
}

function renderPublishPanel(validation?: ValidationResult) {
  if (!publishPanel) return;
  const parsed = editor ? parseFrontmatter(editor.value).data : {};
  const checks = [
    ["Title exists", Boolean(parsed.title || (editor && titleFromMarkdown(editor.value, "")))],
    ["Slug is set", Boolean(parsed.slug)],
    ["Publishable status", (parsed.status ?? "draft") !== "archived"],
    ["Vault synced", Boolean(state.syncSiteUrl)],
  ];
  const issues = validation ? [...validation.errors, ...validation.warnings] : [];
  publishPanel.innerHTML = `
    <div class="space-y-4">
      <section class="panel-card">
        <p class="text-sm font-semibold text-stone-950">Publish flow</p>
        <p class="mt-2 text-xs text-stone-500">Run checks first, then sync to your web site or export a local static preview.</p>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button id="publish-panel-check" class="sidebar-action" type="button">Run checks</button>
          <button id="publish-panel-export" class="sidebar-action" type="button">Export preview</button>
        </div>
        <button id="publish-panel-sync" class="sidebar-action mt-2 w-full" type="button">${state.syncToken ? "Sync to web" : "Sign in to sync"}</button>
      </section>
      <section class="panel-card">
        <p class="text-sm font-semibold text-stone-950">Current document checks</p>
        <div class="mt-2 space-y-1">
          ${checks.map(([label, ok]) => `<div class="flex justify-between text-xs"><span>${label}</span><span class="${ok ? "text-teal-700" : "text-amber-700"}">${ok ? "OK" : "Needs work"}</span></div>`).join("")}
        </div>
      </section>
      <section class="panel-card">
        <p class="text-sm font-semibold text-stone-950">Vault checks</p>
        <div class="mt-2 space-y-1">${issues.length ? issues.map((issue) => `<p class="text-xs text-amber-700">${escapeHtml(issue)}</p>`).join("") : `<p class="text-xs text-stone-500">Run checks to refresh vault issues.</p>`}</div>
      </section>
      <section class="panel-card">
        <p class="text-sm font-semibold text-stone-950">Public URL</p>
        <p class="mt-2 break-all text-xs text-stone-600">${state.currentRelativePath && state.syncSiteUrl ? publicUrlFor(state.currentRelativePath) : "Sync vault to generate public URLs."}</p>
      </section>
    </div>
  `;
  publishPanel.querySelector<HTMLButtonElement>("#publish-panel-check")?.addEventListener("click", () => void runPublishChecks());
  publishPanel.querySelector<HTMLButtonElement>("#publish-panel-export")?.addEventListener("click", () => void exportSite());
  publishPanel.querySelector<HTMLButtonElement>("#publish-panel-sync")?.addEventListener("click", () => {
    if (state.syncToken) void syncWorkspaceToWeb();
    else openAccountDialog();
  });
}

async function renderPublishQueue(validation?: ValidationResult) {
  if (!publishQueue) return;
  if (!state.workspace) {
    publishQueue.innerHTML = `<p class="text-xs text-stone-500">Open a workspace to see publish queue.</p>`;
    return;
  }
  publishQueue.innerHTML = `<p class="text-xs text-stone-500">Building queue...</p>`;
  const summaries = await collectDocumentSummaries();
  const issues = validation ? validation.errors.length + validation.warnings.length : 0;
  publishQueue.innerHTML = "";

  const groups = [
    ["Ready", summaries.filter((item) => item.publish || item.status === "published")],
    ["Draft", summaries.filter((item) => !item.publish && item.status !== "published")],
  ] as const;

  for (const [label, items] of groups) {
    const section = document.createElement("section");
    section.className = "panel-card";
    section.innerHTML = `<p class="text-xs font-semibold uppercase text-stone-500">${label} (${items.length})</p>`;
    const list = document.createElement("div");
    list.className = "mt-2 space-y-1";
    for (const item of items) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "command-row";
      button.innerHTML = `<span class="min-w-0 truncate">${escapeHtml(item.title)}</span><span class="shrink-0 text-xs text-stone-500">${escapeHtml(item.status)}</span>`;
      button.addEventListener("click", () => void openMarkdownFile(item.node.path, item.node.relativePath));
      list.append(button);
    }
    if (items.length === 0) list.innerHTML = `<p class="text-xs text-stone-500">No documents.</p>`;
    section.append(list);
    publishQueue.append(section);
  }

  if (issues > 0) {
    const issue = document.createElement("p");
    issue.className = "text-xs font-semibold text-amber-700";
    issue.textContent = `${issues} issue(s) found by publish checks.`;
    publishQueue.prepend(issue);
  }
}

async function collectDocumentSummaries() {
  const summaries: DocumentSummary[] = [];
  for (const node of markdownNodes()) {
    try {
      const content = node.path === state.currentPath && editor ? editor.value : await invoke<string>("read_markdown_file", { path: node.path });
      const frontmatter = parseFrontmatter(content).data;
      const tags = (frontmatter.tags ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      summaries.push({
        node,
        title: titleFromMarkdown(content, node.name),
        status: frontmatter.status || (truthy(frontmatter.publish) ? "published" : "draft"),
        publish: truthy(frontmatter.publish) || frontmatter.status === "published",
        tags,
      });
    } catch {
      summaries.push({ node, title: node.name, status: "error", publish: false, tags: [] });
    }
  }
  return summaries;
}

async function renderLibraryView() {
  if (!libraryView) return;
  if (!state.workspace) {
    libraryView.innerHTML = `<p class="text-xs text-stone-500">Open a workspace to browse the library.</p>`;
    return;
  }
  const filter = libraryFilter?.value ?? "all";
  const summaries = await collectDocumentSummaries();
  const filtered = summaries.filter((summary) => {
    if (filter === "draft") return summary.status === "draft";
    if (filter === "published") return summary.publish;
    if (filter === "review") return !summary.publish || summary.status === "error";
    return true;
  });

  libraryView.innerHTML = "";
  if (filtered.length === 0) {
    libraryView.innerHTML = `<p class="text-xs text-stone-500">No documents match this view.</p>`;
    return;
  }

  for (const summary of filtered) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "command-row";
    button.innerHTML = `<span class="min-w-0"><span class="block truncate font-semibold">${escapeHtml(
      summary.title
    )}</span><span class="block truncate text-xs text-stone-500">${escapeHtml(summary.node.relativePath)}</span></span><span class="shrink-0 text-xs text-stone-500">${escapeHtml(summary.status)}</span>`;
    button.addEventListener("click", () => void openMarkdownFile(summary.node.path, summary.node.relativePath));
    libraryView.append(button);
  }
}

function renderSearchResults() {
  if (!searchResults) return;
  const query = workspaceSearchInput?.value.trim().toLowerCase() ?? "";
  const nodes = markdownNodes().filter((node) => !query || `${node.name} ${node.relativePath}`.toLowerCase().includes(query));
  searchResults.innerHTML = "";
  if (!state.workspace) {
    searchResults.innerHTML = `<p class="text-xs text-stone-500">Open a workspace to search.</p>`;
    return;
  }
  if (nodes.length === 0) {
    searchResults.innerHTML = `<p class="text-xs text-stone-500">No matches.</p>`;
    return;
  }
  for (const node of nodes.slice(0, 30)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "command-row";
    button.innerHTML = `<span class="truncate">${escapeHtml(node.name)}</span><span class="truncate text-xs text-stone-500">${escapeHtml(node.relativePath)}</span>`;
    button.addEventListener("click", () => void openMarkdownFile(node.path, node.relativePath));
    searchResults.append(button);
  }
}

function renderAiPanel(message = "") {
  if (!aiPanel) return;
  const proposal = state.pendingAiProposal;
  if (!proposal) {
    aiPanel.innerHTML = `
      <div class="space-y-4">
        <section class="panel-card">
          <p class="text-sm font-semibold text-stone-950">AI review surface</p>
          <p class="mt-2 text-xs text-stone-500">${message || "Run an AI command to stage a reviewable patch."}</p>
        </section>
      </div>
    `;
    return;
  }

  const patch = proposal.proposedChanges[0];
  const diff = createLineDiff(patch.before, patch.after)
    .slice(0, 80)
    .map((line) => {
      const color = line.kind === "added" ? "text-teal-700" : line.kind === "removed" ? "text-red-700" : "text-stone-600";
      const prefix = line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " ";
      return `<pre class="${color}">${prefix} ${escapeHtml(line.content)}</pre>`;
    })
    .join("");

  aiPanel.innerHTML = `
    <div class="space-y-4">
      <section class="panel-card">
        <p class="text-sm font-semibold text-stone-950">${escapeHtml(proposal.name)}</p>
        <p class="mt-2 text-xs text-stone-500">${escapeHtml(proposal.explanation)}</p>
      </section>
      <section class="panel-card">
        <p class="text-xs font-semibold uppercase text-stone-500">Patch preview</p>
        <div class="mt-2 max-h-80 overflow-auto rounded bg-stone-50 p-2 font-mono text-xs">${diff}</div>
      </section>
      <div class="grid grid-cols-2 gap-2">
        <button id="ai-apply-patch" class="sidebar-action" type="button">Apply patch</button>
        <button id="ai-reject-patch" class="sidebar-action" type="button">Reject</button>
      </div>
    </div>
  `;
  aiPanel.querySelector<HTMLButtonElement>("#ai-apply-patch")?.addEventListener("click", applyAiPatch);
  aiPanel.querySelector<HTMLButtonElement>("#ai-reject-patch")?.addEventListener("click", rejectAiPatch);
}

function proposeTitleFrontmatter() {
  if (!editor || !state.currentPath) return;
  const current = editor.value;
  const title = titleFromMarkdown(current, basename(state.currentPath).replace(/\.(md|markdown|mdown|mkd)$/i, ""));
  const next = writeFrontmatter(current, { title, status: parseFrontmatter(current).data.status || "draft" });
  state.pendingAiProposal = {
    id: "proposal.titleFrontmatter",
    name: "Propose title frontmatter",
    scope: "document",
    explanation: `Use the document heading or filename to stage title metadata for ${state.currentRelativePath || basename(state.currentPath)}.`,
    proposedChanges: [{ path: state.currentPath, before: current, after: next }],
  };
  setActivity("ai");
  setInspector("ai");
  renderAiPanel();
}

function applyAiPatch() {
  if (!editor || !state.pendingAiProposal) return;
  const patch = state.pendingAiProposal.proposedChanges[0];
  editor.value = patch.after;
  state.pendingAiProposal = null;
  void renderMarkdown(editor.value);
  setDirty(editor.value !== state.originalContent);
  renderAiPanel("Patch applied to the editor buffer. Save to write it to disk.");
  logOperation("AI patch applied to editor buffer.");
}

function rejectAiPatch() {
  state.pendingAiProposal = null;
  renderAiPanel("Patch rejected.");
  logOperation("AI patch rejected.");
}

function publicUrlFor(relativePath: string) {
  if (!state.syncSiteUrl) return "";
  const withoutExt = normalizePath(relativePath).replace(/\.(md|markdown|mdown|mkd)$/i, "");
  return `${state.syncSiteUrl.replace(/\/$/, "")}/${withoutExt}`;
}

function openCommandPalette(query = "") {
  if (!commandDialog || !commandInput) return;
  commandDialog.classList.remove("hidden");
  commandInput.value = query;
  renderCommandResults();
  setTimeout(() => commandInput.focus(), 0);
}

function closeCommandPalette() {
  commandDialog?.classList.add("hidden");
}

function renderCommandResults() {
  if (!commandResults || !commandInput) return;
  const query = commandInput.value.trim().toLowerCase();
  const results = [...commands.values()]
    .filter((command) => fuzzyMatch(`${command.title} ${command.aliases?.join(" ") ?? ""} ${command.id}`, query))
    .slice(0, 40);

  commandResults.innerHTML = "";
  if (results.length === 0) {
    commandResults.innerHTML = `<p class="p-3 text-sm text-stone-500">No commands found.</p>`;
    return;
  }
  for (const command of results) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "command-row";
    button.disabled = !command.isEnabled();
    const disabledReason = !command.isEnabled() ? command.disabledReason?.() ?? "Unavailable" : command.scope.join(", ");
    button.innerHTML = `<span class="min-w-0"><span class="block font-semibold">${escapeHtml(
      command.title
    )}</span><span class="block text-xs text-stone-500">${escapeHtml(disabledReason)}</span></span><span class="shrink-0 text-xs text-stone-500">${command.shortcut ?? ""}</span>`;
    button.addEventListener("click", () => {
      closeCommandPalette();
      void command.run();
    });
    commandResults.append(button);
  }
}

function openQuickSwitcher(query = "") {
  if (!quickDialog || !quickInput) return;
  quickDialog.classList.remove("hidden");
  quickInput.value = query;
  renderQuickResults();
  setTimeout(() => quickInput.focus(), 0);
}

function closeQuickSwitcher() {
  quickDialog?.classList.add("hidden");
}

function renderQuickResults() {
  if (!quickResults || !quickInput) return;
  const query = quickInput.value.trim().toLowerCase();
  const nodes = markdownNodes().filter((node) => !query || fuzzyMatch(`${node.name} ${node.relativePath}`, query));
  quickResults.innerHTML = "";

  if (!state.workspace) {
    quickResults.innerHTML = `<p class="p-3 text-sm text-stone-500">Open a workspace to quick switch files.</p>`;
    return;
  }

  const shown = nodes.slice(0, 40);
  if (shown.length === 0) {
    quickResults.innerHTML = `<button class="command-row" type="button"><span>Create "${escapeHtml(quickInput.value)}.md"</span><span class="text-xs text-stone-500">Shift+Enter</span></button>`;
    quickResults.querySelector("button")?.addEventListener("click", () => {
      closeQuickSwitcher();
      void createDocument(`${quickInput.value || "untitled"}.md`);
    });
    return;
  }

  for (const node of shown) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "command-row";
    button.innerHTML = `<span class="min-w-0"><span class="block font-semibold">${escapeHtml(
      node.name
    )}</span><span class="block truncate text-xs text-stone-500">${escapeHtml(node.relativePath)}</span></span><span class="text-xs text-stone-500">Open</span>`;
    button.addEventListener("click", () => {
      closeQuickSwitcher();
      void openMarkdownFile(node.path, node.relativePath);
    });
    quickResults.append(button);
  }
}

function fuzzyMatch(value: string, query: string) {
  if (!query) return true;
  const normalized = value.toLowerCase();
  let cursor = 0;
  for (const character of query) {
    cursor = normalized.indexOf(character, cursor);
    if (cursor === -1) return false;
    cursor += 1;
  }
  return true;
}

function setActivity(activity: Activity) {
  state.activeActivity = activity;
  document.querySelectorAll<HTMLElement>("[data-activity]").forEach((button) => {
    button.classList.toggle("activity-button-active", button.dataset.activity === activity);
  });
  document.querySelectorAll<HTMLElement>("[data-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== activity);
  });
  if (activity === "library") void renderLibraryView();
  if (activity === "publish") void renderPublishQueue();
}

function setInspector(tab: InspectorTab) {
  state.activeInspector = tab;
  document.querySelectorAll<HTMLElement>("[data-inspector]").forEach((button) => {
    button.classList.toggle("inspector-tab-active", button.dataset.inspector === tab);
  });
  document.querySelectorAll<HTMLElement>("[data-inspector-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.inspectorPanel !== tab);
  });
}

function setEditorMode(mode: EditorMode) {
  state.editorMode = mode;
  if (editorPreviewGrid) {
    editorPreviewGrid.classList.toggle("view-mode-write", mode === "write");
    editorPreviewGrid.classList.toggle("view-mode-split", mode === "split");
    editorPreviewGrid.classList.toggle("view-mode-preview", mode === "preview");
  }
  document.querySelectorAll<HTMLButtonElement>("[data-view-mode]").forEach((button) => {
    button.classList.toggle("view-mode-button-active", button.dataset.viewMode === mode);
  });
  if (mode !== "preview") editor?.focus();
}

function toggleDocumentInfo() {
  document.body.classList.toggle("document-panel-collapsed");
}

function toggleFocusMode() {
  document.body.classList.toggle("focus-mode");
  logOperation(document.body.classList.contains("focus-mode") ? "Focus mode enabled." : "Focus mode disabled.");
}

function wrapSelection(prefix: string, suffix: string, fallback: string) {
  if (!editor) return;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selected = editor.value.slice(start, end) || fallback;
  const next = `${prefix}${selected}${suffix}`;
  editor.setRangeText(next, start, end, "select");
  void renderMarkdown(editor.value);
  setDirty(editor.value !== state.originalContent);
  editor.focus();
}

function insertAtCursor(text: string) {
  if (!editor) return;
  editor.setRangeText(text, editor.selectionStart, editor.selectionEnd, "end");
  void renderMarkdown(editor.value);
  setDirty(editor.value !== state.originalContent);
  editor.focus();
}

function insertOrEditTable() {
  const range = currentTableRange();
  if (range) {
    formatMarkdownTable();
    return;
  }
  insertAtCursor("\n| Column | Value |\n| --- | --- |\n| Item | Detail |\n");
}

function insertMathBlock() {
  insertAtCursor("\n$$\nE = mc^2\n$$\n");
}

function insertMermaidBlock() {
  insertAtCursor("\n```mermaid\nflowchart TD\n  A[Start] --> B[Write Markdown]\n  B --> C[Preview]\n```\n");
}

function currentLineIndex() {
  if (!editor) return 0;
  return editor.value.slice(0, editor.selectionStart).split("\n").length - 1;
}

function currentTableRange() {
  if (!editor) return null;
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

function looksLikeTableLine(line = "") {
  return line.includes("|") && line.trim().split("|").length >= 3;
}

function parseTableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function replaceLines(start: number, end: number, replacement: string[]) {
  if (!editor) return;
  const lines = editor.value.split("\n");
  lines.splice(start, end - start + 1, ...replacement);
  editor.value = lines.join("\n");
  void renderMarkdown(editor.value);
  setDirty(editor.value !== state.originalContent);
  editor.focus();
}

function addMarkdownTableRow() {
  const range = currentTableRange();
  if (!range || !editor) {
    insertOrEditTable();
    return;
  }
  const lines = editor.value.split("\n");
  const cells = parseTableCells(lines[range.start]);
  const row = `| ${cells.map(() => " ").join(" | ")} |`;
  lines.splice(Math.max(currentLineIndex() + 1, range.start + 2), 0, row);
  editor.value = lines.join("\n");
  void renderMarkdown(editor.value);
  setDirty(editor.value !== state.originalContent);
  editor.focus();
}

function addMarkdownTableColumn() {
  const range = currentTableRange();
  if (!range || !editor) {
    insertOrEditTable();
    return;
  }
  const lines = editor.value.split("\n");
  for (let index = range.start; index <= range.end; index += 1) {
    const cells = parseTableCells(lines[index]);
    const isSeparator = cells.every((cell) => /^:?-{3,}:?$/.test(cell));
    cells.push(isSeparator ? "---" : "");
    lines[index] = `| ${cells.join(" | ")} |`;
  }
  editor.value = lines.join("\n");
  void renderMarkdown(editor.value);
  setDirty(editor.value !== state.originalContent);
  editor.focus();
}

function formatMarkdownTable() {
  const range = currentTableRange();
  if (!range || !editor) return;
  const lines = editor.value.split("\n");
  const rows = lines.slice(range.start, range.end + 1).map(parseTableCells);
  const columnCount = Math.max(...rows.map((row) => row.length));
  const widths = Array.from({ length: columnCount }, (_, column) =>
    Math.max(3, ...rows.map((row) => (row[column] ?? "").length))
  );
  const formatted = rows.map((row, index) => {
    const normalized = Array.from({ length: columnCount }, (_, column) => row[column] ?? "");
    const isSeparator = index === 1 || normalized.every((cell) => /^:?-{3,}:?$/.test(cell));
    const cells = normalized.map((cell, column) => {
      const value = isSeparator ? "-".repeat(widths[column]) : cell;
      return value.padEnd(widths[column], " ");
    });
    return `| ${cells.join(" | ")} |`;
  });
  replaceLines(range.start, range.end, formatted);
}

function showEditorContextMenu(x: number, y: number) {
  if (!contextMenu) return;
  const inTable = Boolean(currentTableRange());
  contextMenu.innerHTML = "";
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  const items: Array<[string, () => void, boolean?]> = [
    ["Bold", () => commands.get("editor.bold")?.run(), state.currentKind !== "markdown"],
    ["Insert link", () => commands.get("editor.link")?.run(), state.currentKind !== "markdown"],
    ["Insert table", insertOrEditTable, state.currentKind !== "markdown"],
    ["Add table row below", addMarkdownTableRow, !inTable],
    ["Add table column right", addMarkdownTableColumn, !inTable],
    ["Format table", formatMarkdownTable, !inTable],
    ["Insert formula", insertMathBlock, state.currentKind !== "markdown"],
    ["Insert Mermaid diagram", insertMermaidBlock, state.currentKind !== "markdown"],
  ];
  for (const [label, action, disabled] of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "context-menu-button";
    button.textContent = label;
    button.disabled = Boolean(disabled);
    button.addEventListener("click", () => {
      hideContextMenu();
      action();
    });
    contextMenu.append(button);
  }
  contextMenu.classList.remove("hidden");
}

function escapeHtml(value: string) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function bindEvents() {
  openButton?.addEventListener("click", () => void commands.get("file.open")?.run());
  openFolderButton?.addEventListener("click", () => void commands.get("workspace.open")?.run());
  welcomeOpenFolderButton?.addEventListener("click", () => void commands.get("workspace.open")?.run());
  welcomeDefaultVaultButton?.addEventListener("click", () => void commands.get("vault.openDefault")?.run());
  welcomeOpenFileButton?.addEventListener("click", () => void commands.get("file.open")?.run());
  welcomeCommandPaletteButton?.addEventListener("click", () => openCommandPalette());
  saveButton?.addEventListener("click", () => void commands.get("file.save")?.run());
  newDocumentButton?.addEventListener("click", () => void commands.get("file.new")?.run());
  renameEntryButton?.addEventListener("click", () => void commands.get("file.rename")?.run());
  deleteEntryButton?.addEventListener("click", () => void commands.get("file.delete")?.run());
  publishButton?.addEventListener("click", () => void commands.get("publish.export")?.run());
  aiIndexButton?.addEventListener("click", () => void commands.get("ai.index")?.run());
  aiProposeTitleButton?.addEventListener("click", () => void commands.get("ai.proposeTitle")?.run());
  syncRegisterButton?.addEventListener("click", () => void startBrowserOAuth());
  accountConnectButton?.addEventListener("click", () => void startBrowserOAuth());
  accountDisconnectButton?.addEventListener("click", () => void disconnectAccount());
  accountSyncButton?.addEventListener("click", () => void commands.get("sync.workspace")?.run());
  syncPanelButton?.addEventListener("click", openAccountDialog);
  publishChecksButton?.addEventListener("click", () => void commands.get("publish.check")?.run());
  favoriteCurrentButton?.addEventListener("click", () => void commands.get("file.favorite")?.run());
  favoriteCurrentTopButton?.addEventListener("click", () => void commands.get("file.favorite")?.run());
  commandPaletteButton?.addEventListener("click", () => openCommandPalette());
  quickSwitcherButton?.addEventListener("click", () => openQuickSwitcher());
  documentInfoToggle?.addEventListener("click", toggleDocumentInfo);
  documentInfoClose?.addEventListener("click", toggleDocumentInfo);
  accountServiceUrlInput?.addEventListener("input", () => {
    if (syncServiceUrlInput) syncServiceUrlInput.value = accountServiceUrlInput.value;
  });
  commandInput?.addEventListener("input", renderCommandResults);
  quickInput?.addEventListener("input", renderQuickResults);
  workspaceSearchInput?.addEventListener("input", renderSearchResults);
  libraryFilter?.addEventListener("change", () => void renderLibraryView());

  document.querySelectorAll<HTMLButtonElement>("[data-activity]").forEach((button) => {
    button.addEventListener("click", () => {
      const activity = (button.dataset.activity ?? "files") as Activity;
      if (activity === "settings") {
        openAccountDialog();
        return;
      }
      setActivity(activity);
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-inspector]").forEach((button) => {
    button.addEventListener("click", () => setInspector((button.dataset.inspector ?? "preview") as InspectorTab));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      const command = commands.get(button.dataset.command ?? "");
      if (command?.isEnabled()) void command.run();
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-view-mode]").forEach((button) => {
    button.addEventListener("click", () => setEditorMode((button.dataset.viewMode ?? "split") as EditorMode));
  });

  editor?.addEventListener("input", () => {
    const content = editor.value;
    setDirty(content !== state.originalContent);
    void renderMarkdown(content);
  });
  editor?.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    showEditorContextMenu(event.clientX, event.clientY);
  });

  document.addEventListener("click", (event) => {
    if (contextMenu && !contextMenu.contains(event.target as Node)) hideContextMenu();
    if (event.target === accountDialog) closeAccountDialog();
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (event.key === "Escape") {
      closeCommandPalette();
      closeQuickSwitcher();
      closeAccountDialog();
      hideContextMenu();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === "p") {
      event.preventDefault();
      openCommandPalette();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "o") {
      event.preventDefault();
      openQuickSwitcher();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "s") {
      event.preventDefault();
      void commands.get("file.save")?.run();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "r") {
      event.preventDefault();
      void commands.get("view.preview")?.run();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "4") {
      event.preventDefault();
      void commands.get("view.split")?.run();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === "t") {
      event.preventDefault();
      void commands.get("insert.table")?.run();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "b") {
      event.preventDefault();
      void commands.get("editor.bold")?.run();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "i") {
      event.preventDefault();
      void commands.get("editor.italic")?.run();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "k") {
      event.preventDefault();
      void commands.get("editor.link")?.run();
      return;
    }
    if (event.key === "F2") {
      event.preventDefault();
      void commands.get("file.rename")?.run();
      return;
    }
    if (quickDialog && !quickDialog.classList.contains("hidden") && event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      closeQuickSwitcher();
      void createDocument(`${quickInput?.value || "untitled"}.md`);
    }
  });
}

if (editor) editor.disabled = true;
registerCommands();
bindEvents();
setWorkspaceStatus(null);
setActivity("files");
setInspector("preview");
setEditorMode("split");
updateActionButtons();
renderRecentItems();
renderFavoriteItems();
renderSyncSession();
if (isTauriRuntime()) {
  void loadCloudProfile();
  void loadVaultBindings();
  void registerDragDrop();
  void openInitialPath();
} else {
  logOperation("Browser preview mode. Run `npm run tauri dev` for desktop file access.");
}

function isTauriRuntime() {
  return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}
