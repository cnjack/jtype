import { useEffect, useMemo, useState } from "react";
import type {
  FileTreeNode,
  WorkspaceEntrySearchScope,
  WorkspaceSnapshot,
} from "../lib/types";
import { tauri } from "../lib/tauri";
import {
  searchQuickOpen,
  searchWorkspaceDocuments,
  workspaceIndexFor,
} from "../lib/workspaceIndex";
import { workspaceSnapshotIsPartial } from "../lib/workspacePagination";

/**
 * Shared search surface adapter. A complete Desktop snapshot stays entirely
 * synchronous. A partial mobile snapshot renders loaded matches immediately,
 * then replaces them with the native full-vault result in canonical order.
 */
export function useWorkspaceEntrySearch(
  workspace: WorkspaceSnapshot | null,
  query: string,
  folderFilter: string,
  scope: WorkspaceEntrySearchScope,
  limit: number,
) {
  const loadedEntries = useMemo(() => {
    const index = workspaceIndexFor(workspace?.entries);
    return scope === "documents"
      ? searchWorkspaceDocuments(index, query, limit)
      : searchQuickOpen(index, query, folderFilter, limit);
  }, [folderFilter, limit, query, scope, workspace?.entries]);
  const [nativeEntries, setNativeEntries] = useState<FileTreeNode[] | null>(null);
  const partial = workspaceSnapshotIsPartial(workspace);

  useEffect(() => {
    if (!workspace || !partial || !tauri.isAvailable) {
      setNativeEntries(null);
      return;
    }

    let cancelled = false;
    setNativeEntries(null);
    void tauri.searchWorkspaceEntries(
      workspace.rootPath,
      query,
      folderFilter,
      scope,
      limit,
    ).then((result) => {
      if (!cancelled) setNativeEntries(result.entries);
    }).catch(() => {
      if (!cancelled) setNativeEntries(loadedEntries);
    });

    return () => {
      cancelled = true;
    };
  }, [folderFilter, limit, loadedEntries, partial, query, scope, workspace?.entries, workspace?.rootPath]);

  return {
    entries: partial && nativeEntries ? nativeEntries : loadedEntries,
    isLoading: partial && nativeEntries === null,
    isPartial: partial,
  };
}
