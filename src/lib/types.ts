export type EntryKind = "folder" | "markdown" | "asset";
export type Activity = "explorer" | "trash" | "settings";
export type InspectorTab = "preview" | "properties" | "outline" | "links" | "publish" | "ai";
export type EditorMode = "write" | "split" | "preview";
export type CommandScope = "global" | "workspace" | "file" | "folder" | "editor" | "selection" | "publish" | "ai";

export type FileTreeNode = {
  name: string;
  path: string;
  relativePath: string;
  kind: EntryKind;
  children: FileTreeNode[];
};

export type WorkspaceSnapshot = {
  rootPath: string;
  name: string;
  entries: FileTreeNode[];
  metadataCreated: boolean;
};

export type PublishResult = {
  outputDir: string;
  pages: string[];
};

export type AiIndexResult = {
  outputFile: string;
  documents: number;
  chunks: number;
  links: number;
  assets: number;
};

export type ValidationResult = {
  errors: string[];
  warnings: string[];
};

export type SyncDocument = {
  relativePath: string;
  title: string;
  status: string;
  content: string;
};

export type SyncBaseEntry = {
  relativePath: string;
  content: string;
};

export type AuthResponse = {
  token: string;
  username: string;
  siteUrl: string;
};

export type SyncResponse = {
  workspaceId?: string;
  workspaceName: string;
  documentCount: number;
  siteUrl: string;
};

export type CloudProfile = {
  serverUrl: string;
  username: string;
  siteUrl: string;
  token: string;
  deviceId: string;
};

export type VaultBinding = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  localVaultPath: string;
  lastPulledClock: number;
};

export type CloudWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  documentCount: number;
  storageBudgetBytes: number;
};

export type CloudWorkspaceListResponse = {
  workspaces: CloudWorkspace[];
};

export type OAuthDeviceStartResponse = {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
};

export type CloudDocument = {
  relativePath: string;
  title: string;
  status: string;
  content: string;
  contentHash: string;
  versionId: string;
  updatedClock: number;
};

export type ConflictRange = {
  baseStart: number;
  baseEnd: number;
  localLines: string[];
  cloudLines: string[];
};

export type SyncConflict = {
  conflictId: string;
  relativePath: string;
  localContent: string;
  cloudContent: string;
  baseContent?: string;
  conflictRanges?: ConflictRange[];
};

export function parseSyncConflicts(raw: Array<Record<string, unknown>>): SyncConflict[] {
  return raw.map((c) => ({
    conflictId: c.conflictId as string,
    relativePath: c.relativePath as string,
    localContent: c.localContent as string,
    cloudContent: c.cloudContent as string,
    baseContent: c.baseContent as string | undefined,
    conflictRanges: typeof c.conflictRanges === "string"
      ? JSON.parse(c.conflictRanges)
      : Array.isArray(c.conflictRanges) ? c.conflictRanges : undefined,
  }));
}

export type MergeStatus = "accepted" | "merged" | "unchanged";

export type SyncPushDocument = CloudDocument & {
  mergeStatus: MergeStatus;
};

export type SyncPushResponse = {
  workspaceId: string;
  accepted: number;
  documents: SyncPushDocument[];
  deletedPaths?: DeletedPath[];
  conflicts: SyncConflict[];
};

export type DeletedPath = {
  relativePath: string;
  deletedClock: number;
};

export type DeletedPathInput = {
  relativePath: string;
};

export type LocalTrashItem = {
  trashId: string;
  relativePath: string;
  name: string;
  trashedAt: number;
};

export type TrashItem = {
  id: string;
  documentId: string;
  relativePath: string;
  title: string;
  contentHash: string;
  deletedByUserId: string;
  sourceDeviceId?: string;
  sourceUserId?: string;
  deletedAt: string;
  expiresAt: string;
  deletedClock: number;
};

export type SyncStatus = "idle" | "syncing" | "conflict" | "offline";

export type RecentItem = {
  kind: "file" | "workspace";
  name: string;
  path: string;
};

export type FrontmatterParse = {
  data: Record<string, string>;
  body: string;
  hasFrontmatter: boolean;
};

export type DocumentSummary = {
  node: FileTreeNode;
  title: string;
  status: string;
  publish: boolean;
  tags: string[];
};

export type FolderContentsSummary = {
  folderName: string;
  totalDocuments: number;
  totalSubfolders: number;
  documentNames: string[];
};

export type MergedTrashItem = {
  id: string;
  documentId?: string;
  relativePath: string;
  title: string;
  contentHash?: string;
  deletedAt: string;
  expiresAt?: string;
  deletedClock?: number;
  source: "cloud" | "local";
  syncStatus: "local_only" | "synced" | "conflict" | "pending_restore";
};

export type TrashEvent = {
  id: string;
  eventType: "empty_trash" | "permanent_delete_item" | "permanent_delete_all";
  eventClock: number;
  eventData: Record<string, unknown>;
  createdAt: string;
};

export type TrashSyncPayload = {
  items: TrashItem[];
  events: TrashEvent[];
  expiredTrashIds: string[];
  trashCursor: number;
};

export type TrashMetadata = {
  items: TrashMetadataItem[];
  lastSyncedClock: number;
  pendingTrashOps: PendingTrashOp[];
};

export type PendingTrashOp =
  | { type: "restore"; trashId: string }
  | { type: "permanent_delete"; trashId: string }
  | { type: "empty_trash" };

export type TrashMetadataItem = {
  trashId: string;
  relativePath: string;
  name: string;
  trashedAt: number;
  source: string;
  cloudTrashId?: string;
};

export type AppCommand = {
  id: string;
  title: string;
  aliases?: string[];
  shortcut?: string;
  scope: CommandScope[];
  isEnabled: () => boolean;
  disabledReason?: () => string | undefined;
  run: () => Promise<void> | void;
};
