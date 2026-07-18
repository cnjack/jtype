import { fuzzyMatch } from "@shared/lib/utils";
import type { FileTreeNode } from "./types";

export const TREE_RENDER_BATCH_SIZE = 160;

type SearchEntry = {
  node: FileTreeNode;
  searchText: string;
  parentPath: string;
};

export type WorkspaceIndex = {
  allNodes: FileTreeNode[];
  documents: FileTreeNode[];
  folders: FileTreeNode[];
  quickOpenable: FileTreeNode[];
  documentSearch: SearchEntry[];
  quickOpenSearch: SearchEntry[];
  markdownByRelativeStem: Map<string, FileTreeNode>;
  markdownByBaseStem: Map<string, FileTreeNode>;
  buildDurationMs: number;
};

const indexCache = new WeakMap<FileTreeNode[], WorkspaceIndex>();
const emptyEntries: FileTreeNode[] = [];

function normalizeStem(value: string) {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\.(md|markdown|mdown|mkd)$/i, "")
    .toLowerCase();
}

function parentPath(relativePath: string) {
  const slash = relativePath.lastIndexOf("/");
  return slash < 0 ? "" : relativePath.slice(0, slash);
}

function makeSearchEntry(node: FileTreeNode): SearchEntry {
  return {
    node,
    searchText: `${node.name} ${node.relativePath}`.toLowerCase(),
    parentPath: parentPath(node.relativePath).toLowerCase(),
  };
}

/**
 * Build one iterative, cached index for every consumer of a workspace snapshot.
 * The WeakMap makes Sidebar, VaultHome, Quick Open and Editor link resolution
 * share the exact same index without adding state-management coupling.
 */
export function workspaceIndexFor(entries: FileTreeNode[] | undefined): WorkspaceIndex {
  const source = entries ?? emptyEntries;
  const cached = indexCache.get(source);
  if (cached) return cached;
  const startedAt = performance.now();

  const allNodes: FileTreeNode[] = [];
  const documents: FileTreeNode[] = [];
  const folders: FileTreeNode[] = [];
  const quickOpenable: FileTreeNode[] = [];
  const documentSearch: SearchEntry[] = [];
  const quickOpenSearch: SearchEntry[] = [];
  const markdownByRelativeStem = new Map<string, FileTreeNode>();
  const markdownByBaseStem = new Map<string, FileTreeNode>();
  const stack = [...source].reverse();

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.relativePath === ".jtype" || node.relativePath.startsWith(".jtype/")) continue;
    allNodes.push(node);

    if (node.kind === "folder") {
      folders.push(node);
    } else if (node.kind === "markdown") {
      documents.push(node);
      quickOpenable.push(node);
      const entry = makeSearchEntry(node);
      documentSearch.push(entry);
      quickOpenSearch.push(entry);
      markdownByRelativeStem.set(normalizeStem(node.relativePath), node);
      const baseStem = normalizeStem(node.name);
      if (!markdownByBaseStem.has(baseStem)) markdownByBaseStem.set(baseStem, node);
    } else if (node.kind === "board") {
      quickOpenable.push(node);
      quickOpenSearch.push(makeSearchEntry(node));
    }

    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      stack.push(node.children[index]);
    }
  }

  const index = {
    allNodes,
    documents,
    folders,
    quickOpenable,
    documentSearch,
    quickOpenSearch,
    markdownByRelativeStem,
    markdownByBaseStem,
    buildDurationMs: Math.round((performance.now() - startedAt) * 100) / 100,
  };
  indexCache.set(source, index);
  if (documents.length >= 1_000) {
    console.info(
      `[JTypePerformance] workspace_index nodes=${allNodes.length} documents=${documents.length} elapsed_ms=${index.buildDurationMs}`,
    );
  }
  return index;
}

export function searchWorkspaceDocuments(index: WorkspaceIndex, query: string, limit = 30) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return index.documents.slice(0, limit);
  const results: FileTreeNode[] = [];
  for (const entry of index.documentSearch) {
    if (!entry.searchText.includes(normalized)) continue;
    results.push(entry.node);
    if (results.length === limit) break;
  }
  return results;
}

export function searchQuickOpen(
  index: WorkspaceIndex,
  query: string,
  folderFilter: string,
  limit = 40,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedFolder = folderFilter.trim().toLowerCase();
  const results: FileTreeNode[] = [];
  // Exact substrings rank ahead of fuzzy subsequences. This prevents a large
  // vault's early fuzzy matches from crowding an exact filename out of the
  // bounded result window.
  if (normalizedQuery) {
    for (const entry of index.quickOpenSearch) {
      if (normalizedFolder && !entry.parentPath.includes(normalizedFolder)) continue;
      if (!entry.searchText.includes(normalizedQuery)) continue;
      results.push(entry.node);
      if (results.length === limit) return results;
    }
  }
  for (const entry of index.quickOpenSearch) {
    if (normalizedFolder && !entry.parentPath.includes(normalizedFolder)) continue;
    if (normalizedQuery && entry.searchText.includes(normalizedQuery)) continue;
    if (normalizedQuery && !fuzzyMatch(entry.searchText, normalizedQuery)) continue;
    results.push(entry.node);
    if (results.length === limit) break;
  }
  return results;
}

export function findMarkdownByWikiTarget(index: WorkspaceIndex, target: string) {
  const normalized = normalizeStem(target);
  return index.markdownByRelativeStem.get(normalized)
    ?? index.markdownByBaseStem.get(normalized)
    ?? null;
}

function nodeContainsRelativePath(node: FileTreeNode, relativePath: string) {
  if (node.relativePath === relativePath) return true;
  const stack = [...node.children];
  while (stack.length > 0) {
    const child = stack.pop()!;
    if (child.relativePath === relativePath) return true;
    stack.push(...child.children);
  }
  return false;
}

/**
 * Return a bounded, ordered window that includes the active node. A document
 * opened through Quick Open therefore remains visible without mounting every
 * preceding sibling in a very large flat directory.
 */
export function progressiveTreeWindow(
  nodes: FileTreeNode[],
  requestedCount: number,
  activeRelativePath: string,
) {
  const size = Math.min(nodes.length, Math.max(1, requestedCount));
  if (!activeRelativePath || size === nodes.length) return { start: 0, end: size };
  const activeIndex = nodes.findIndex((node) => nodeContainsRelativePath(node, activeRelativePath));
  if (activeIndex < size) return { start: 0, end: size };
  const start = Math.min(
    Math.max(0, activeIndex - Math.floor(size / 2)),
    nodes.length - size,
  );
  return { start, end: start + size };
}
