import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./utils";
import type {
  WorkspaceSnapshot,
  PublishResult,
  AiIndexResult,
  ValidationResult,
  SyncDocument,
  CloudProfile,
  VaultBinding,
} from "./types";

export const tauri = {
  readFile(path: string) {
    return invoke<string>("read_markdown_file", { path });
  },
  writeFile(path: string, content: string) {
    return invoke("write_markdown_file", { path, content });
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
  applyCloudDocuments(rootPath: string, documents: Array<{ relativePath: string; content: string }>) {
    return invoke<WorkspaceSnapshot>("apply_cloud_documents", { rootPath, documents });
  },
  collectSyncDocuments(rootPath: string) {
    return invoke<SyncDocument[]>("collect_sync_documents", { rootPath });
  },
  bindCloudWorkspace(binding: VaultBinding) {
    return invoke<VaultBinding[]>("bind_cloud_workspace", { binding });
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
  get isAvailable() {
    return isTauriRuntime();
  },
};
