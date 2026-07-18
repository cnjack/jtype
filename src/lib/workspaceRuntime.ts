import type { WorkspaceSnapshot } from "./types";
import { tauri } from "./tauri";
import { WORKSPACE_ENTRY_PAGE_SIZE } from "./workspacePagination";

export type WorkspaceBootstrapMetrics = {
  loadedEntries: number;
  totalEntries: number;
  elapsedMs: number;
  snapshotBytes: number;
};

export function workspaceBootstrapMetrics(
  workspace: WorkspaceSnapshot,
  elapsedMs: number,
): WorkspaceBootstrapMetrics {
  const rootPage = workspace.entryPages?.[""];
  return {
    loadedEntries: rootPage?.loadedEntries ?? workspace.entries.length,
    totalEntries: rootPage?.totalEntries ?? workspace.entries.length,
    elapsedMs: Math.max(0, elapsedMs),
    snapshotBytes: new TextEncoder().encode(JSON.stringify(workspace)).byteLength,
  };
}

async function openPartialWorkspace(
  source: "path" | "default" | "refresh",
  open: () => Promise<WorkspaceSnapshot>,
) {
  const startedAt = performance.now();
  const workspace = await open();
  const metrics = workspaceBootstrapMetrics(workspace, performance.now() - startedAt);
  if (metrics.totalEntries >= 1_000) {
    console.info(
      `[JTypePerformance] workspace_bootstrap_partial source=${source} loaded=${metrics.loadedEntries} total=${metrics.totalEntries} ipc_ms=${metrics.elapsedMs.toFixed(1)} snapshot_bytes=${metrics.snapshotBytes}`,
    );
  }
  return workspace;
}

/**
 * Runtime adapter below the shared product layer. Desktop keeps the complete
 * native snapshot; Android/iOS opt into the first shallow root page while all
 * consumers continue receiving the canonical WorkspaceSnapshot type.
 */
export function openWorkspaceForRuntime(path: string, usePartialWorkspace: boolean) {
  return usePartialWorkspace
    ? openPartialWorkspace("path", () => tauri.openWorkspacePartial(path, WORKSPACE_ENTRY_PAGE_SIZE))
    : tauri.openWorkspace(path);
}

export function openDefaultVaultForRuntime(usePartialWorkspace: boolean) {
  return usePartialWorkspace
    ? openPartialWorkspace("default", () => tauri.openDefaultVaultPartial(WORKSPACE_ENTRY_PAGE_SIZE))
    : tauri.openDefaultVault();
}

/** Re-bootstrap after a mutation that still returns a complete native tree. */
export async function adaptWorkspaceForRuntime(
  workspace: WorkspaceSnapshot,
  usePartialWorkspace: boolean,
) {
  if (!usePartialWorkspace) return workspace;
  return openPartialWorkspace(
    "refresh",
    () => tauri.openWorkspacePartial(workspace.rootPath, WORKSPACE_ENTRY_PAGE_SIZE),
  );
}
