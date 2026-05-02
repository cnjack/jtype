export type EntryKind = "folder" | "markdown" | "asset";
export type Activity = "explorer" | "settings";
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

export type SyncConflict = {
  conflictId: string;
  relativePath: string;
  localContent: string;
  cloudContent: string;
  baseContent?: string;
};

export type SyncPushResponse = {
  workspaceId: string;
  accepted: number;
  documents: CloudDocument[];
  conflicts: SyncConflict[];
};

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
