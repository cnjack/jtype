import type { FileTreeNode, WorkspaceSnapshot } from "./types";
import { tauri } from "./tauri";
import { findMarkdownByWikiTarget, workspaceIndexFor } from "./workspaceIndex";
import { workspaceSnapshotIsPartial } from "./workspacePagination";

export function findLoadedWorkspaceEntry(
  workspace: WorkspaceSnapshot | null | undefined,
  relativePath: string,
) {
  if (!workspace) return null;
  return workspaceIndexFor(workspace.entries).allNodes.find(
    (node) => node.relativePath === relativePath,
  ) ?? null;
}

/** Loaded-first exact resolver with a native fallback only for partial vaults. */
export async function resolveWorkspaceEntry(
  workspace: WorkspaceSnapshot,
  relativePath: string,
): Promise<FileTreeNode | null> {
  const loaded = findLoadedWorkspaceEntry(workspace, relativePath);
  if (loaded || !workspaceSnapshotIsPartial(workspace) || !tauri.isAvailable) return loaded;
  return tauri.resolveWorkspaceEntry(workspace.rootPath, relativePath).catch(() => loaded);
}

/** Preserve Desktop wikilink precedence while allowing an unloaded target. */
export async function resolveWorkspaceWikiTarget(
  workspace: WorkspaceSnapshot,
  target: string,
): Promise<FileTreeNode | null> {
  const loaded = findMarkdownByWikiTarget(workspaceIndexFor(workspace.entries), target);
  if (!workspaceSnapshotIsPartial(workspace) || !tauri.isAvailable) return loaded;
  // A loaded basename match must not outrank an unloaded exact relative-stem
  // match, so partial snapshots ask the canonical native resolver.
  return tauri.resolveWorkspaceWikiTarget(workspace.rootPath, target).catch(() => loaded);
}
