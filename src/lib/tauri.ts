import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./utils";
import type {
  WorkspaceSnapshot,
  PublishResult,
  AiIndexResult,
  ValidationResult,
  SyncDocument,
  SyncFolder,
  SyncBaseEntry,
  CloudProfile,
  VaultBinding,
  VaultSettings,
  FolderContentsSummary,
  TrashMetadata,
  BoardCard,
  CardTemplate,
} from "./types";

export const tauri = {
  appReady() {
    return invoke<void>("app_ready");
  },
  readFile(path: string) {
    return invoke<string>("read_markdown_file", { path });
  },
  writeFile(path: string, content: string) {
    return invoke("write_markdown_file", { path, content });
  },
  writeBinaryFile(path: string, content: number[]) {
    return invoke("write_binary_file", { path, content });
  },
  readBinaryFile(path: string) {
    return invoke<number[]>("read_binary_file", { path });
  },
  createBoard(rootPath: string, relativePath: string, content: string) {
    return invoke<WorkspaceSnapshot>("create_board", { rootPath, relativePath, content });
  },
  readBoardFile(path: string) {
    return invoke<string>("read_board_file", { path });
  },
  writeBoardFile(path: string, content: string) {
    return invoke("write_board_file", { path, content });
  },
  scanBoardCards(rootPath: string, boardId: string) {
    return invoke<BoardCard[]>("scan_board_cards", { rootPath, boardId });
  },
  scanCardTemplates(rootPath: string, boardDir: string) {
    return invoke<CardTemplate[]>("scan_card_templates", { rootPath, boardDir });
  },
  openWorkspace(path: string) {
    return invoke<WorkspaceSnapshot>("open_workspace", { path });
  },
  openDefaultVault() {
    return invoke<WorkspaceSnapshot>("open_default_vault");
  },
  createEntry(rootPath: string, relativePath: string, kind: string) {
    return invoke<WorkspaceSnapshot>("create_workspace_entry", { rootPath, relativePath, kind });
  },
  renameEntry(rootPath: string, fromRelativePath: string, toRelativePath: string) {
    return invoke<WorkspaceSnapshot>("rename_workspace_entry", { rootPath, fromRelativePath, toRelativePath });
  },
  deleteEntry(rootPath: string, relativePath: string) {
    return invoke<WorkspaceSnapshot>("delete_workspace_entry", { rootPath, relativePath });
  },
  validateWorkspace(rootPath: string) {
    return invoke<ValidationResult>("validate_workspace", { rootPath });
  },
  exportStaticSite(rootPath: string, outputRelativePath: string) {
    return invoke<PublishResult>("export_static_site", { rootPath, outputRelativePath });
  },
  buildAiIndex(rootPath: string) {
    return invoke<AiIndexResult>("build_ai_index", { rootPath });
  },
  initialOpenPaths() {
    return invoke<string[]>("initial_open_paths");
  },
  loadCloudProfile() {
    return invoke<CloudProfile>("load_cloud_profile");
  },
  saveCloudProfile(profile: CloudProfile) {
    return invoke<CloudProfile>("save_cloud_profile", { profile });
  },
  listVaultBindings() {
    return invoke<VaultBinding[]>("list_vault_bindings");
  },
  applyCloudDocuments(rootPath: string, documents: Array<{ relativePath: string; content: string }>, folders: SyncFolder[] = []) {
    return invoke<WorkspaceSnapshot>("apply_cloud_documents", { rootPath, documents, folders });
  },
  applyDeletedCloudFolders(rootPath: string, folders: SyncFolder[]) {
    return invoke<WorkspaceSnapshot>("apply_deleted_cloud_folders", { rootPath, folders });
  },
  collectSyncDocuments(rootPath: string) {
    return invoke<SyncDocument[]>("collect_sync_documents", { rootPath });
  },
  collectSyncFolders(rootPath: string) {
    return invoke<SyncFolder[]>("collect_sync_folders", { rootPath });
  },
  saveSyncBases(rootPath: string, documents: SyncBaseEntry[]) {
    return invoke<void>("save_sync_bases", { rootPath, documents });
  },
  deleteSyncBases(rootPath: string, relativePaths: string[]) {
    return invoke<void>("delete_sync_bases", { rootPath, relativePaths });
  },
  loadSyncBases(rootPath: string) {
    return invoke<Record<string, string>>("load_sync_bases", { rootPath });
  },
  saveSyncFolderBases(rootPath: string, folders: string[]) {
    return invoke<void>("save_sync_folder_bases", { rootPath, folders });
  },
  deleteSyncFolderBases(rootPath: string, relativePaths: string[]) {
    return invoke<void>("delete_sync_folder_bases", { rootPath, relativePaths });
  },
  loadSyncFolderBases(rootPath: string) {
    return invoke<string[]>("load_sync_folder_bases", { rootPath });
  },
  bindCloudWorkspace(binding: VaultBinding) {
    return invoke<VaultBinding[]>("bind_cloud_workspace", { binding });
  },
  unbindCloudWorkspace(workspaceId: string, vaultPath: string) {
    return invoke<void>("unbind_cloud_workspace", { workspaceId, vaultPath });
  },
  clearSyncBases(vaultPath: string) {
    return invoke<void>("clear_sync_bases", { vaultPath });
  },
  loadVaultSettings(vaultPath: string) {
    return invoke<VaultSettings | null>("load_vault_settings", { vaultPath });
  },
  saveVaultSettings(vaultPath: string, settings: VaultSettings) {
    return invoke<void>("save_vault_settings", { vaultPath, settings });
  },
  detectVaultRoot(path: string) {
    return invoke<string | null>("detect_vault_root", { path });
  },
  trashEntry(rootPath: string, relativePath: string) {
    return invoke<WorkspaceSnapshot>("trash_workspace_entry", { rootPath, relativePath });
  },
  listTrash(rootPath: string) {
    return invoke<Array<{ trashId: string; relativePath: string; name: string; trashedAt: number }>>("list_workspace_trash", { rootPath });
  },
  restoreFromTrash(rootPath: string, trashId: string) {
    return invoke<WorkspaceSnapshot>("restore_workspace_trash", { rootPath, trashId });
  },
  permanentDeleteTrash(rootPath: string, trashId: string) {
    return invoke<void>("permanent_delete_trash", { rootPath, trashId });
  },
  emptyTrash(rootPath: string) {
    return invoke<void>("empty_workspace_trash", { rootPath });
  },
  startFileWatcher(rootPath: string) {
    return invoke<void>("start_file_watcher", { rootPath });
  },
  stopFileWatcher() {
    return invoke<void>("stop_file_watcher");
  },
  createFolder(rootPath: string, folderRelativePath: string) {
    return invoke<WorkspaceSnapshot>("create_workspace_folder", { rootPath, folderRelativePath });
  },
  renameFolder(rootPath: string, fromRelativePath: string, toRelativePath: string) {
    return invoke<[WorkspaceSnapshot, string[]]>("rename_workspace_folder", { rootPath, fromRelativePath, toRelativePath });
  },
  moveFolder(rootPath: string, fromRelativePath: string, toRelativePath: string) {
    return invoke<[WorkspaceSnapshot, string[]]>("move_workspace_folder", { rootPath, fromRelativePath, toRelativePath });
  },
  deleteFolder(rootPath: string, folderRelativePath: string, softDelete: boolean) {
    return invoke<[WorkspaceSnapshot, string[]]>("delete_workspace_folder", { rootPath, folderRelativePath, softDelete });
  },
  listFolderContents(rootPath: string, folderRelativePath: string) {
    return invoke<FolderContentsSummary>("list_folder_contents_cmd", { rootPath, folderRelativePath });
  },
  loadTrashMetadata(rootPath: string) {
    return invoke<TrashMetadata>("load_trash_metadata_cmd", { rootPath });
  },
  saveTrashMetadata(rootPath: string, metadata: TrashMetadata) {
    return invoke<void>("save_trash_metadata_cmd", { rootPath, metadata });
  },
  startCloudListener(serverUrl: string, token: string, workspaceId: string, deviceId: string) {
    return invoke<void>("start_cloud_listener", { serverUrl, token, workspaceId, deviceId });
  },
  stopCloudListener() {
    return invoke<void>("stop_cloud_listener");
  },
  cloudWsSend(message: string) {
    return invoke<void>("cloud_ws_send", { message });
  },

  get isAvailable() {
    return isTauriRuntime();
  },
};
