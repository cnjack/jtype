import type { FileTreeNode, WorkspaceEntryPage, WorkspaceSnapshot } from "./types";

/** Matches the existing shared tree render window; native IO and DOM hydrate together. */
export const WORKSPACE_ENTRY_PAGE_SIZE = 160;

export function workspaceSnapshotIsPartial(workspace: WorkspaceSnapshot | null | undefined) {
  return workspace?.completeness === "partial";
}

export function workspaceEntryPageState(
  workspace: WorkspaceSnapshot | null | undefined,
  relativePath: string,
) {
  return workspace?.entryPages?.[relativePath];
}

export function workspacePageCursorIsStale(error: unknown) {
  return String(error).includes("Workspace page cursor is stale.");
}

function parentRelativePath(relativePath: string) {
  const index = relativePath.lastIndexOf("/");
  return index < 0 ? "" : relativePath.slice(0, index);
}

function carryLoadedChildren(entries: FileTreeNode[], previous: FileTreeNode[]) {
  const previousByPath = new Map(previous.map((entry) => [entry.relativePath, entry]));
  return entries.map((entry) => {
    const existing = previousByPath.get(entry.relativePath);
    if (!existing || existing.kind !== "folder" || entry.kind !== "folder") return entry;
    return existing.children.length > 0 ? { ...entry, children: existing.children } : entry;
  });
}

function validatePage(page: WorkspaceEntryPage) {
  if (!Number.isSafeInteger(page.startIndex) || page.startIndex < 0) {
    throw new Error("Workspace page start index is invalid.");
  }
  if (!Number.isSafeInteger(page.totalEntries) || page.totalEntries < 0) {
    throw new Error("Workspace page total is invalid.");
  }
  if (page.startIndex + page.entries.length > page.totalEntries) {
    throw new Error("Workspace page exceeds its declared total.");
  }
  const endIndex = page.startIndex + page.entries.length;
  if (page.entries.length === 0 && endIndex < page.totalEntries) {
    throw new Error("Workspace page made no progress.");
  }
  if (endIndex < page.totalEntries) {
    if (typeof page.nextCursor !== "string" || page.nextCursor.trim().length === 0) {
      throw new Error("Workspace page cursor does not match its contents.");
    }
  } else if (page.nextCursor !== null) {
    throw new Error("Workspace page cursor does not match its contents.");
  }
  const paths = new Set<string>();
  for (const entry of page.entries) {
    if (parentRelativePath(entry.relativePath) !== page.relativePath) {
      throw new Error("Workspace page contains a non-child entry.");
    }
    if (paths.has(entry.relativePath)) {
      throw new Error("Workspace page contains a duplicate entry.");
    }
    paths.add(entry.relativePath);
  }
}

function mergeDirectPage(current: FileTreeNode[], page: WorkspaceEntryPage) {
  if (page.startIndex === 0) {
    return carryLoadedChildren(page.entries, current);
  }
  if (page.startIndex !== current.length) {
    throw new Error("Workspace pages must be merged in cursor order.");
  }
  const currentPaths = new Set(current.map((entry) => entry.relativePath));
  if (page.entries.some((entry) => currentPaths.has(entry.relativePath))) {
    throw new Error("Workspace page repeats an already loaded entry.");
  }
  return [...current, ...carryLoadedChildren(page.entries, current)];
}

function mergeFolderPage(
  entries: FileTreeNode[],
  page: WorkspaceEntryPage,
): { entries: FileTreeNode[]; found: boolean } {
  let found = false;
  const next = entries.map((entry) => {
    if (entry.relativePath === page.relativePath) {
      if (entry.kind !== "folder") {
        throw new Error("Workspace page parent is not a folder.");
      }
      found = true;
      return { ...entry, children: mergeDirectPage(entry.children, page) };
    }
    if (entry.kind !== "folder" || !page.relativePath.startsWith(`${entry.relativePath}/`)) {
      return entry;
    }
    const nested = mergeFolderPage(entry.children, page);
    if (!nested.found) return entry;
    found = true;
    return { ...entry, children: nested.entries };
  });
  return { entries: next, found };
}

/**
 * Merge one native page into the same immutable WorkspaceSnapshot consumed by
 * Desktop. This keeps platform compatibility below AppState and the shared UI.
 */
export function mergeWorkspaceEntryPage(
  workspace: WorkspaceSnapshot,
  page: WorkspaceEntryPage,
): WorkspaceSnapshot {
  validatePage(page);
  const entries = page.relativePath === ""
    ? mergeDirectPage(workspace.entries, page)
    : (() => {
        const merged = mergeFolderPage(workspace.entries, page);
        if (!merged.found) {
          throw new Error("Workspace page parent is not loaded.");
        }
        return merged.entries;
      })();
  const loadedEntries = page.startIndex + page.entries.length;
  const entryPages = {
    ...(workspace.entryPages ?? {}),
    [page.relativePath]: {
      loadedEntries,
      totalEntries: page.totalEntries,
      nextCursor: page.nextCursor,
    },
  };

  return {
    ...workspace,
    entries,
    entryPages,
  };
}
