import { createContext, useContext, type Dispatch } from "react";
import type {
  Activity,
  InspectorTab,
  EditorMode,
  EntryKind,
  FileTreeNode,
  WorkspaceSnapshot,
  CloudProfile,
  VaultBinding,
  CloudWorkspace,
  SyncConflict,
  SyncStatus,
  VaultSettings,
  VaultProviderStatus,
  VaultProviderOperationProgress,
  ExternalVaultReconcileConflict,
} from "../lib/types";
import type { AICommandProposal } from "./aiCommands";
import { appStorage } from "../lib/storage";

export type AppMode = "empty" | "workspace" | "single-file" | "draft";

export interface AppState {
  mode: AppMode;
  activeActivity: Activity;
  activeInspector: InspectorTab;
  editorMode: EditorMode;
  focusMode: boolean;
  documentPanelOpen: boolean;
  currentPath: string;
  currentRelativePath: string;
  currentKind: EntryKind | "";
  originalContent: string;
  editorContent: string;
  isDirty: boolean;
  // Draft mode: an in-memory untitled document with no disk path yet.
  // Created via Cmd/Ctrl+N; saved through a "save as" flow (NEW_DRAFT/COMMIT_DRAFT).
  isDraft: boolean;
  isLoading: boolean;
  workspace: WorkspaceSnapshot | null;
  vaultProviderStatus: VaultProviderStatus | null;
  vaultProviderOperationProgress: VaultProviderOperationProgress | null;
  externalVaultConflicts: ExternalVaultReconcileConflict[];
  externalVaultConflictDialogOpen: boolean;
  syncToken: string;
  syncUsername: string;
  syncSiteUrl: string;
  lastSyncSnapshot: string;
  cloudProfile: CloudProfile | null;
  vaultBindings: VaultBinding[];
  vaultSettings: Record<string, VaultSettings | null>;
  cloudWorkspaces: CloudWorkspace[];
  oauthDeviceCode: string;
  oauthUserCode: string;
  oauthStartedAt: number | null;
  activeConflicts: SyncConflict[];
  contextNode: FileTreeNode | null;
  pendingAiProposal: AICommandProposal | null;
  statusMessage: string;
  contextMenu: { x: number; y: number; items: Array<{ label: string; action: () => void; disabled?: boolean }> } | null;
  commandPaletteOpen: boolean;
  quickSwitcherOpen: boolean;
  createNoteDialogOpen: boolean;
  createNoteFromDraft: boolean;
  // When the dialog is opened from a folder's right-click menu, the new resource
  // is created inside this directory instead of the active file's folder.
  // `null` means "no explicit target" (fall back to the active file's folder).
  createNoteTargetDir: string | null;
  conflictDialogOpen: boolean;
  accountDialogOpen: boolean;
  accountDialogSection: "account" | "workspace";
  serviceUrl: string;
  favoriteVersion: number;
  lastWorkspacePath: string;
  lastFilePath: string;
  syncStatus: SyncStatus;
  lastSyncAt: number;
  wsConnected: boolean;
  wsSessionId: string | null;
  lastWsActivityAt: number | null;
  lastWsEventType: string | null;
  editorContentVersion: number;
  expandedFolders: Set<string>;
  // Shared document zoom level (1 = 100%). Persisted so it survives restarts.
  zoomLevel: number;
  // In-page find bar (Cmd+F). Open state lives in the reducer so it integrates
  // with the keyboard shortcut + Escape handling.
  findBarOpen: boolean;
}

export function isCurrentVaultReadOnly(state: AppState) {
  const provider = state.vaultProviderStatus?.provider;
  return Boolean(
    provider
      && (provider.accessState !== "ready" || !provider.capabilities.canWrite),
  );
}

export type AppAction =
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "SET_STATUS"; message: string }
  | { type: "SET_ACTIVITY"; activity: Activity }
  | { type: "SET_INSPECTOR"; tab: InspectorTab }
  | { type: "SET_EDITOR_MODE"; mode: EditorMode }
  | { type: "TOGGLE_FOCUS_MODE" }
  | { type: "TOGGLE_DOCUMENT_PANEL" }
  | { type: "OPEN_WORKSPACE"; workspace: WorkspaceSnapshot; providerStatus?: VaultProviderStatus }
  | { type: "OPEN_FILE"; path: string; relativePath: string; content: string; kind: EntryKind }
  | { type: "SET_EDITOR_CONTENT"; content: string; sync?: boolean }
  | { type: "SAVE_FILE" }
  | { type: "CLEAR_DOCUMENT" }
  // Draft lifecycle: NEW_DRAFT creates an in-memory untitled document (no disk
  // path, never written to appStorage). COMMIT_DRAFT promotes a draft to a real
  // file once the user picks a path via "save as". DISCARD_DRAFT drops the draft.
  | { type: "NEW_DRAFT" }
  | { type: "COMMIT_DRAFT"; path: string; relativePath: string }
  | { type: "DISCARD_DRAFT" }
  | { type: "UPDATE_WORKSPACE"; workspace: WorkspaceSnapshot }
  | { type: "SET_VAULT_PROVIDER_STATUS"; status: VaultProviderStatus | null }
  | { type: "SET_VAULT_PROVIDER_OPERATION_PROGRESS"; progress: VaultProviderOperationProgress | null }
  | { type: "SET_EXTERNAL_VAULT_CONFLICTS"; conflicts: ExternalVaultReconcileConflict[] }
  | { type: "SET_EXTERNAL_VAULT_CONFLICT_DIALOG"; open: boolean }
  | { type: "SET_SYNC_SESSION"; token: string; username: string; siteUrl: string; profile: CloudProfile }
  | { type: "SET_CLOUD_PROFILE"; profile: CloudProfile }
  | { type: "SET_VAULT_BINDINGS"; bindings: VaultBinding[] }
  | { type: "SET_VAULT_SETTINGS"; vaultPath: string; settings: VaultSettings | null }
  | { type: "DISCONNECT_WORKSPACE"; workspaceId: string; vaultPath: string; settings?: VaultSettings }
  | { type: "SET_CLOUD_WORKSPACES"; workspaces: CloudWorkspace[] }
  | { type: "SET_OAUTH"; deviceCode: string; userCode: string; startedAt: number }
  | { type: "CLEAR_OAUTH" }
  | { type: "SET_CONFLICTS"; conflicts: SyncConflict[] }
  | { type: "REMOVE_CONFLICT"; conflictId: string }
  | { type: "SET_CONTEXT_NODE"; node: FileTreeNode | null }
  | { type: "SET_AI_PROPOSAL"; proposal: AICommandProposal | null }
  | { type: "SET_CONTEXT_MENU"; menu: AppState["contextMenu"] }
  | { type: "SET_COMMAND_PALETTE"; open: boolean }
  | { type: "SET_QUICK_SWITCHER"; open: boolean }
  | { type: "SET_CREATE_NOTE_DIALOG"; open: boolean; fromDraft?: boolean; targetDir?: string }
  | { type: "SET_CONFLICT_DIALOG"; open: boolean }
  | { type: "SET_ACCOUNT_DIALOG"; open: boolean; section?: "account" | "workspace" }
  | { type: "SET_SERVICE_URL"; url: string }
  | { type: "SET_SYNC_SNAPSHOT"; snapshot: string }
  | { type: "SELECT_TREE_NODE"; node: FileTreeNode }
  | { type: "DISCONNECT_ACCOUNT" }
  | { type: "APPLY_AI_PATCH" }
  | { type: "TOGGLE_FAVORITE" }
  | { type: "SET_LAST_PATHS"; workspacePath: string; filePath: string }
  | { type: "SET_SYNC_STATUS"; status: SyncStatus; success?: boolean }
  | { type: "SET_WS_CONNECTED"; connected: boolean }
  | { type: "SET_WS_SESSION"; sessionId: string | null }
  | { type: "SET_WS_ACTIVITY"; msgType: string }
  | { type: "CLOSE_WORKSPACE" }
  | { type: "TOGGLE_EXPAND_FOLDER"; folderPath: string }
  | { type: "SET_EXPANDED_FOLDERS"; folders: Set<string> }
  | { type: "SET_ZOOM"; level: number }
  | { type: "SET_FINDBAR"; open: boolean };

function getMode(state: Pick<AppState, "workspace" | "currentPath" | "isDraft">): AppMode {
  // Draft takes precedence: an in-memory untitled document renders the editor
  // regardless of whether a workspace/file is also present.
  if (state.isDraft) return "draft";
  if (state.workspace) return "workspace";
  if (state.currentPath) return "single-file";
  return "empty";
}

const initialState: AppState = {
  mode: "empty",
  activeActivity: "explorer",
  activeInspector: "preview",
  editorMode: appStorage.get("ui.editorMode", "split"),
  focusMode: appStorage.get("ui.focusMode", false),
  documentPanelOpen: appStorage.get("ui.documentPanelOpen", true),
  currentPath: "",
  currentRelativePath: "",
  currentKind: "",
  originalContent: "",
  editorContent: "",
  isDirty: false,
  isDraft: false,
  isLoading: false,
  workspace: null,
  vaultProviderStatus: null,
  vaultProviderOperationProgress: null,
  externalVaultConflicts: [],
  externalVaultConflictDialogOpen: false,
  syncToken: appStorage.getSensitive("sync.token", ""),
  syncUsername: appStorage.get("sync.username", ""),
  syncSiteUrl: appStorage.get("sync.siteUrl", ""),
  lastSyncSnapshot: appStorage.get("sync.snapshot", ""),
  cloudProfile: null,
  vaultBindings: [],
  vaultSettings: {},
  cloudWorkspaces: [],
  oauthDeviceCode: "",
  oauthUserCode: "",
  oauthStartedAt: null,
  activeConflicts: [],
  contextNode: null,
  pendingAiProposal: null,
  statusMessage: "Local-first mode. Files remain on disk.",
  contextMenu: null,
  commandPaletteOpen: false,
  quickSwitcherOpen: false,
  createNoteDialogOpen: false,
  createNoteFromDraft: false,
  createNoteTargetDir: null,
  conflictDialogOpen: false,
  accountDialogOpen: false,
  accountDialogSection: "workspace",
  serviceUrl: "http://localhost:13345",
  favoriteVersion: 0,
  lastWorkspacePath: appStorage.get("lastWorkspacePath", ""),
  lastFilePath: appStorage.get("lastFilePath", ""),
  syncStatus: "idle",
  lastSyncAt: 0,
  wsConnected: false,
  wsSessionId: null,
  lastWsActivityAt: null,
  lastWsEventType: null,
  editorContentVersion: 0,
  expandedFolders: new Set<string>(),
  zoomLevel: appStorage.get("ui.zoomLevel", 1),
  findBarOpen: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.isLoading };
    case "SET_STATUS":
      return { ...state, statusMessage: action.message };
    case "SET_ACTIVITY":
      return { ...state, activeActivity: action.activity };
    case "SET_INSPECTOR":
      return { ...state, activeInspector: action.tab };
    case "SET_EDITOR_MODE":
      appStorage.set("ui.editorMode", action.mode);
      return { ...state, editorMode: action.mode };
    case "TOGGLE_FOCUS_MODE":
      appStorage.set("ui.focusMode", !state.focusMode);
      return { ...state, focusMode: !state.focusMode };
    case "TOGGLE_DOCUMENT_PANEL":
      appStorage.set("ui.documentPanelOpen", !state.documentPanelOpen);
      return { ...state, documentPanelOpen: !state.documentPanelOpen };
    case "OPEN_WORKSPACE":
      appStorage.set("lastWorkspacePath", action.workspace.rootPath);
      appStorage.set("lastFilePath", "");
      return {
        ...state,
        workspace: action.workspace,
        vaultProviderStatus: action.providerStatus ?? null,
        vaultProviderOperationProgress: null,
        externalVaultConflicts: [],
        externalVaultConflictDialogOpen: false,
        currentPath: "",
        currentRelativePath: "",
        currentKind: "",
        originalContent: "",
        editorContent: "",
        isDirty: false,
        isDraft: false,
        pendingAiProposal: null,
        mode: "workspace" as AppMode,
        lastWorkspacePath: action.workspace.rootPath,
        lastFilePath: "",
      };
    case "OPEN_FILE": {
      appStorage.set("lastFilePath", action.path);
      const fileMode = getMode({ workspace: state.workspace, currentPath: action.path, isDraft: false });
      if (fileMode === "single-file") {
        appStorage.set("lastWorkspacePath", "");
      }
      // When re-opening the same file with identical content (e.g. after sync),
      // skip bumping editorContentVersion to avoid unnecessary editor/preview reset
      const isSameFile = action.path === state.currentPath;
      const contentChanged = action.content !== state.editorContent;
      const bumpVersion = !isSameFile || contentChanged;
      // Auto-expand parent folders so the opened file is visible in the sidebar
      const parentSegments = action.relativePath.split("/").slice(0, -1);
      const expandedFolders = new Set(state.expandedFolders);
      for (let i = 1; i <= parentSegments.length; i++) {
        expandedFolders.add(parentSegments.slice(0, i).join("/"));
      }
      return {
        ...state,
        currentPath: action.path,
        currentRelativePath: action.relativePath,
        currentKind: action.kind,
        originalContent: action.content,
        editorContent: action.content,
        isDirty: false,
        isDraft: false,
        pendingAiProposal: null,
        mode: fileMode,
        lastFilePath: action.path,
        lastWorkspacePath: fileMode === "single-file" ? "" : state.lastWorkspacePath,
        editorContentVersion: bumpVersion ? state.editorContentVersion + 1 : state.editorContentVersion,
        expandedFolders,
      };
    }
    case "SET_EDITOR_CONTENT": {
      const isDirty = action.content !== state.originalContent;
      return {
        ...state,
        editorContent: action.content,
        isDirty,
        // When set programmatically (e.g. the card property strip rewrites
        // frontmatter), bump the version so the textarea re-syncs from state.
        editorContentVersion: action.sync ? state.editorContentVersion + 1 : state.editorContentVersion,
      };
    }
    case "SAVE_FILE":
      return { ...state, originalContent: state.editorContent, isDirty: false };
    case "CLEAR_DOCUMENT":
      appStorage.set("lastFilePath", "");
      return {
        ...state,
        currentPath: "",
        currentRelativePath: "",
        currentKind: "",
        originalContent: "",
        editorContent: "",
        isDirty: false,
        isDraft: false,
        pendingAiProposal: null,
        mode: getMode({ workspace: state.workspace, currentPath: "", isDraft: false }),
        lastFilePath: "",
      };
    case "NEW_DRAFT":
      // Single-draft semantics: if a draft is already open, keep it (this just
      // refocuses the editor instead of wiping what the user typed).
      if (state.isDraft) return state;
      // In-memory untitled document. No disk path, no appStorage writes —
      // drafts must never be persisted as lastFilePath (that would make the
      // app try to re-open a non-existent path on next launch).
      return {
        ...state,
        currentPath: "",
        currentRelativePath: "",
        currentKind: "markdown",
        originalContent: "",
        editorContent: "",
        isDirty: false,
        isDraft: true,
        pendingAiProposal: null,
        mode: "draft" as AppMode,
        editorContentVersion: state.editorContentVersion + 1,
      };
    case "COMMIT_DRAFT": {
      // Promote a draft to a real file: the content already lives in
      // editorContent, so we skip the disk read that OPEN_FILE does.
      appStorage.set("lastFilePath", action.path);
      const fileMode = getMode({ workspace: state.workspace, currentPath: action.path, isDraft: false });
      if (fileMode === "single-file") {
        appStorage.set("lastWorkspacePath", "");
      }
      // Auto-expand parent folders so the saved file is visible in the sidebar.
      const parentSegments = action.relativePath.split("/").slice(0, -1);
      const expandedFolders = new Set(state.expandedFolders);
      for (let i = 1; i <= parentSegments.length; i++) {
        expandedFolders.add(parentSegments.slice(0, i).join("/"));
      }
      return {
        ...state,
        currentPath: action.path,
        currentRelativePath: action.relativePath,
        currentKind: "markdown",
        // editorContent stays as-is — it's the draft the user just edited.
        originalContent: state.editorContent,
        isDirty: false,
        isDraft: false,
        pendingAiProposal: null,
        mode: fileMode,
        lastFilePath: action.path,
        lastWorkspacePath: fileMode === "single-file" ? "" : state.lastWorkspacePath,
        expandedFolders,
      };
    }
    case "DISCARD_DRAFT":
      return {
        ...state,
        currentPath: "",
        currentRelativePath: "",
        currentKind: "",
        originalContent: "",
        editorContent: "",
        isDirty: false,
        isDraft: false,
        pendingAiProposal: null,
        mode: getMode({ workspace: state.workspace, currentPath: "", isDraft: false }),
      };
    case "UPDATE_WORKSPACE": {
      const externalProvider =
        state.vaultProviderStatus?.provider.kind === "externalMirror" &&
        action.workspace.rootPath === state.workspace?.rootPath
          ? state.vaultProviderStatus.provider
          : null;
      return {
        ...state,
        workspace: externalProvider
          ? { ...action.workspace, name: externalProvider.displayName }
          : action.workspace,
      };
    }
    case "SET_VAULT_PROVIDER_STATUS": {
      const workspace =
        action.status?.provider.kind === "externalMirror" &&
        state.workspace?.rootPath === action.status.provider.localRootPath
          ? { ...state.workspace, name: action.status.provider.displayName }
          : state.workspace;
      return { ...state, workspace, vaultProviderStatus: action.status };
    }
    case "SET_VAULT_PROVIDER_OPERATION_PROGRESS":
      return { ...state, vaultProviderOperationProgress: action.progress };
    case "SET_EXTERNAL_VAULT_CONFLICTS":
      return { ...state, externalVaultConflicts: action.conflicts };
    case "SET_EXTERNAL_VAULT_CONFLICT_DIALOG":
      return { ...state, externalVaultConflictDialogOpen: action.open };
    case "SET_SYNC_SESSION": {
      appStorage.setSensitive("sync.token", action.token);
      appStorage.set("sync.username", action.username);
      appStorage.set("sync.siteUrl", action.siteUrl);
      return {
        ...state,
        syncToken: action.token,
        syncUsername: action.username,
        syncSiteUrl: action.siteUrl,
        cloudProfile: action.profile,
        oauthDeviceCode: "",
        oauthUserCode: "",
        oauthStartedAt: null,
      };
    }
    case "SET_CLOUD_PROFILE":
      return { ...state, cloudProfile: action.profile };
    case "SET_VAULT_BINDINGS":
      return { ...state, vaultBindings: action.bindings };
    case "SET_VAULT_SETTINGS": {
      const next = { ...state.vaultSettings };
      next[action.vaultPath] = action.settings;
      return { ...state, vaultSettings: next };
    }
    case "DISCONNECT_WORKSPACE": {
      const nextSettings = { ...state.vaultSettings };
      if (action.settings) nextSettings[action.vaultPath] = action.settings;
      // Only reset the *current* vault's sync state. Removing a binding for a
      // non-current vault (e.g. pruning the recent list) must not wipe the
      // active vault's conflicts / connection.
      const isCurrent = action.vaultPath === state.workspace?.rootPath;
      return {
        ...state,
        vaultBindings: state.vaultBindings.filter(
          (binding) => !(binding.workspaceId === action.workspaceId && binding.localVaultPath === action.vaultPath),
        ),
        vaultSettings: nextSettings,
        ...(isCurrent ? { activeConflicts: [], syncStatus: "idle", wsConnected: false } : {}),
      };
    }
    case "SET_CLOUD_WORKSPACES":
      return { ...state, cloudWorkspaces: action.workspaces };
    case "SET_OAUTH":
      return { ...state, oauthDeviceCode: action.deviceCode, oauthUserCode: action.userCode, oauthStartedAt: action.startedAt };
    case "CLEAR_OAUTH":
      return { ...state, oauthDeviceCode: "", oauthUserCode: "", oauthStartedAt: null };
    case "SET_CONFLICTS": {
      // Merge incoming conflicts with existing ones.
      // Incoming conflicts update/replace by relativePath; existing ones are kept.
      const merged = new Map<string, typeof action.conflicts[number]>();
      for (const c of state.activeConflicts) {
        merged.set(c.relativePath, c);
      }
      for (const c of action.conflicts) {
        merged.set(c.relativePath, c);
      }
      return { ...state, activeConflicts: Array.from(merged.values()) };
    }
    case "REMOVE_CONFLICT":
      return { ...state, activeConflicts: state.activeConflicts.filter(c => c.conflictId !== action.conflictId) };
    case "SET_CONTEXT_NODE":
      return { ...state, contextNode: action.node };
    case "SET_AI_PROPOSAL":
      return { ...state, pendingAiProposal: action.proposal };
    case "SET_CONTEXT_MENU":
      return { ...state, contextMenu: action.menu };
    case "SET_COMMAND_PALETTE":
      return { ...state, commandPaletteOpen: action.open };
    case "SET_QUICK_SWITCHER":
      return { ...state, quickSwitcherOpen: action.open };
    case "SET_CREATE_NOTE_DIALOG":
      return {
        ...state,
        createNoteDialogOpen: action.open,
        // Track whether the dialog is being used to "save a draft as…" so the
        // commit step can promote the draft instead of creating an empty file.
        createNoteFromDraft: action.open ? Boolean(action.fromDraft) : false,
        // Remember the folder the dialog was launched from (right-click menu);
        // cleared on close so the next open falls back to the active folder.
        createNoteTargetDir: action.open ? (action.targetDir ?? null) : null,
      };
    case "SET_CONFLICT_DIALOG":
      return { ...state, conflictDialogOpen: action.open };
    case "SET_ACCOUNT_DIALOG":
      return {
        ...state,
        accountDialogOpen: action.open,
        accountDialogSection: action.section ?? state.accountDialogSection,
      };
    case "SET_SERVICE_URL":
      return { ...state, serviceUrl: action.url };
    case "SET_SYNC_SNAPSHOT": {
      appStorage.set("sync.snapshot", action.snapshot);
      return { ...state, lastSyncSnapshot: action.snapshot };
    }
    case "SELECT_TREE_NODE":
      return {
        ...state,
        currentPath: action.node.path,
        currentRelativePath: action.node.relativePath,
        currentKind: action.node.kind,
        originalContent: "",
        editorContent: "",
        isDirty: false,
        isDraft: false,
        pendingAiProposal: null,
      };
    case "DISCONNECT_ACCOUNT": {
      appStorage.removeSensitive("sync.token");
      appStorage.remove("sync.username");
      appStorage.remove("sync.siteUrl");
      appStorage.remove("sync.snapshot");
      return {
        ...state,
        syncToken: "",
        syncUsername: "",
        syncSiteUrl: "",
        cloudProfile: null,
        vaultBindings: [],
        cloudWorkspaces: [],
        oauthDeviceCode: "",
        oauthUserCode: "",
        oauthStartedAt: null,
        activeConflicts: [],
      };
    }
    case "APPLY_AI_PATCH": {
      if (!state.pendingAiProposal) return state;
      const patch = state.pendingAiProposal.proposedChanges[0];
      return {
        ...state,
        editorContent: patch.after,
        isDirty: patch.after !== state.originalContent,
        pendingAiProposal: null,
        editorContentVersion: state.editorContentVersion + 1,
      };
    }
    case "TOGGLE_FAVORITE":
      return { ...state, favoriteVersion: state.favoriteVersion + 1 };
    case "SET_LAST_PATHS":
      appStorage.set("lastWorkspacePath", action.workspacePath);
      appStorage.set("lastFilePath", action.filePath);
      return { ...state, lastWorkspacePath: action.workspacePath, lastFilePath: action.filePath };
    case "SET_SYNC_STATUS":
      return { ...state, syncStatus: action.status, lastSyncAt: action.status === "idle" && action.success ? Date.now() : state.lastSyncAt };
    case "SET_WS_CONNECTED":
      return { ...state, wsConnected: action.connected, ...(action.connected ? {} : { wsSessionId: null }) };
    case "SET_WS_SESSION":
      return { ...state, wsSessionId: action.sessionId };
    case "SET_WS_ACTIVITY":
      return { ...state, lastWsActivityAt: Date.now(), lastWsEventType: action.msgType };
    case "CLOSE_WORKSPACE": {
      appStorage.set("lastWorkspacePath", "");
      appStorage.set("lastFilePath", "");
      return {
        ...state,
        workspace: null,
        vaultProviderStatus: null,
        vaultProviderOperationProgress: null,
        externalVaultConflicts: [],
        externalVaultConflictDialogOpen: false,
        currentPath: "",
        currentRelativePath: "",
        currentKind: "",
        originalContent: "",
        editorContent: "",
        isDirty: false,
        isDraft: false,
        pendingAiProposal: null,
        mode: "empty" as AppMode,
        lastWorkspacePath: "",
        lastFilePath: "",
        expandedFolders: new Set<string>(),
      };
    }
    case "TOGGLE_EXPAND_FOLDER": {
      const next = new Set(state.expandedFolders);
      if (next.has(action.folderPath)) {
        next.delete(action.folderPath);
      } else {
        next.add(action.folderPath);
      }
      return { ...state, expandedFolders: next };
    }
    case "SET_EXPANDED_FOLDERS":
      return { ...state, expandedFolders: action.folders };
    case "SET_ZOOM": {
      // Clamp to a sane range so documents stay readable and PDF re-renders
      // (which scale canvas pixels) don't get pathologically expensive.
      const clamped = Math.min(2.5, Math.max(0.5, Math.round(action.level * 100) / 100));
      appStorage.set("ui.zoomLevel", clamped);
      return { ...state, zoomLevel: clamped };
    }
    case "SET_FINDBAR":
      return { ...state, findBarOpen: action.open };
    default:
      return state;
  }
}

export { initialState };

const AppStateContext = createContext<AppState>(initialState);
const AppDispatchContext = createContext<Dispatch<AppAction>>(() => {});

export function useAppState() {
  return useContext(AppStateContext);
}

export function useAppDispatch() {
  return useContext(AppDispatchContext);
}

export { AppStateContext, AppDispatchContext };
