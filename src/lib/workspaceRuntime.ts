import type { WorkspaceSnapshot } from "./types";
import { tauri } from "./tauri";
import { WORKSPACE_ENTRY_PAGE_SIZE } from "./workspacePagination";

/**
 * Runtime adapter below the shared product layer. Desktop keeps the complete
 * native snapshot; Android/iOS opt into the first shallow root page while all
 * consumers continue receiving the canonical WorkspaceSnapshot type.
 */
export function openWorkspaceForRuntime(path: string, usePartialWorkspace: boolean) {
  return usePartialWorkspace
    ? tauri.openWorkspacePartial(path, WORKSPACE_ENTRY_PAGE_SIZE)
    : tauri.openWorkspace(path);
}

export function openDefaultVaultForRuntime(usePartialWorkspace: boolean) {
  return usePartialWorkspace
    ? tauri.openDefaultVaultPartial(WORKSPACE_ENTRY_PAGE_SIZE)
    : tauri.openDefaultVault();
}

/** Re-bootstrap after a mutation that still returns a complete native tree. */
export async function adaptWorkspaceForRuntime(
  workspace: WorkspaceSnapshot,
  usePartialWorkspace: boolean,
) {
  if (!usePartialWorkspace) return workspace;
  return tauri.openWorkspacePartial(workspace.rootPath, WORKSPACE_ENTRY_PAGE_SIZE);
}
