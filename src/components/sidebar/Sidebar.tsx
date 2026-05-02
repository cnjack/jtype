import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { markdownNodes } from "../../lib/utils";
import { appStorage } from "../../lib/storage";
import type { Activity, EntryKind, FileTreeNode } from "../../lib/types";
import { useState, useMemo } from "react";

export function Sidebar() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  if (state.mode === "empty" && !state.workspace) return null;
  if (state.focusMode) return null;

  return (
    <aside id="workspace-sidebar" className="flex min-h-0 flex-col border-r border-black/[0.04] bg-[#f7faf8]">
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#008884]">Vault</p>
            <p id="workspace-name" className="mt-2 truncate text-base font-semibold text-stone-950">{state.workspace?.name ?? "No vault"}</p>
            <p id="workspace-path" className="mt-1 truncate text-xs text-[#6b7773]">{state.workspace?.rootPath ?? "Open a vault or Markdown file."}</p>
          </div>
        </div>
        <div className="mt-3">
          <button
            className="sidebar-action w-full"
            type="button"
            disabled={!state.workspace || state.isLoading}
            onClick={() => dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: true })}
          >
            New note
          </button>
        </div>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          className={`activity-button w-full justify-start ${state.activeActivity === "explorer" ? "activity-button-active" : ""}`}
          onClick={() => dispatch({ type: "SET_ACTIVITY", activity: "explorer" as Activity })}
        >
          Explorer
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {state.activeActivity === "explorer" && <ExplorerPanel />}
      </div>
    </aside>
  );
}

function ExplorerPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const [query, setQuery] = useState("");
  const favorites = useMemo(() => readFavorites(state.workspace?.rootPath), [state.workspace?.rootPath, state.currentPath, state.favoriteVersion]);
  const recentItems = useMemo(() => readRecentItems(), [state.currentPath]);

  const filteredResults = useMemo(() => {
    if (!query) return null;
    const nodes = markdownNodes(state.workspace?.entries ?? []);
    return nodes.filter((n) => `${n.name} ${n.relativePath}`.toLowerCase().includes(query.toLowerCase())).slice(0, 30);
  }, [state.workspace, query]);

  return (
    <div className="px-3 pb-4">
      <input
        className="sync-input"
        placeholder="Search files..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filteredResults ? (
        <div className="mt-3 space-y-1">
          {filteredResults.length === 0 ? (
            <p className="text-xs text-stone-500">No matches.</p>
          ) : (
            filteredResults.map((node) => (
              <button key={node.path} type="button" className="command-row" onClick={() => fs.openMarkdownFile(node.path, node.relativePath)}>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{node.name}</span>
                  <span className="block truncate text-xs text-stone-500">{node.relativePath}</span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          {favorites.length > 0 && (
            <>
              <div className="mb-2 mt-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-stone-500">Favorites</p>
                <button className="subtle-button" type="button" disabled={!state.currentPath} onClick={() => {
                  toggleFavorite(state.currentPath, state.workspace?.rootPath);
                  dispatch({ type: "TOGGLE_FAVORITE" });
                }}>
                  Toggle
                </button>
              </div>
              <div id="favorite-list" className="space-y-1">
                {favorites.map((node) => (
                  <button key={node.path} type="button" className="tree-button text-xs" onClick={() => fs.openMarkdownFile(node.path, node.relativePath)}>
                    <span className="text-stone-500">Favorite</span>
                    <span className="truncate font-semibold">{node.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <nav className="mt-2" aria-label="Workspace files">
            {!state.workspace ? (
              <p className="rounded-md border border-dashed border-stone-300 p-3 text-sm text-stone-500">
                Drop a folder here to open it as a vault.
              </p>
            ) : (
              <ul className="space-y-1">
                {state.workspace.entries.map((node) => (
                  <TreeNode key={node.path} node={node} depth={0} />
                ))}
              </ul>
            )}
          </nav>

          <section className="mt-5 border-t border-emerald-900/10 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase text-stone-500">Recent</p>
            <div className="space-y-1">
              {recentItems.length === 0 ? (
                <p className="text-xs text-stone-500">No recent items yet.</p>
              ) : (
                recentItems.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    className="tree-button text-xs"
                    onClick={() => {
                      if (item.kind === "workspace") fs.openWorkspace(item.path);
                      else fs.openMarkdownFile(item.path);
                    }}
                  >
                    <span className="text-stone-500">{item.kind === "workspace" ? "Vault" : "Markdown file"}</span>
                    <span className="truncate font-semibold">{item.name}</span>
                  </button>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function TreeNode({ node, depth }: { node: FileTreeNode; depth: number }) {
  const state = useAppState();
  const fs = useFileSystem();
  const dispatch = useAppDispatch();

  if (node.relativePath === ".jtype") return null;

  const isActive = node.relativePath === state.currentRelativePath;

  return (
    <li>
      <button
        type="button"
        className={`tree-button ${isActive ? "tree-button-active" : ""}`}
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        onClick={() => {
          if (node.kind === "markdown") fs.openMarkdownFile(node.path, node.relativePath);
          else dispatch({ type: "SELECT_TREE_NODE", node });
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          dispatch({ type: "SET_CONTEXT_NODE", node });
        }}
      >
        {iconForNode(node) && <span className="shrink-0 text-[#8a9691]">{iconForNode(node)}</span>}
        <span className="truncate">{node.name}</span>
      </button>
      {node.children.length > 0 && (
        <ul className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function iconForNode(node: FileTreeNode) {
  if (node.kind === "folder") return ">";
  if (node.kind === "markdown") return "";
  return "";
}

function readFavorites(rootPath?: string): FileTreeNode[] {
  const paths: string[] = appStorage.get(`favorites:${rootPath ?? "global"}`, []);
  return paths.map((p: string) => {
    const name = p.split(/[\\/]/).pop() ?? p;
    return { name, path: p, relativePath: name, kind: "markdown" as EntryKind, children: [] };
  });
}

function toggleFavorite(path: string, rootPath?: string) {
  if (!path) return;
  const key = `favorites:${rootPath ?? "global"}`;
  const paths: string[] = appStorage.get(key, []);
  const next = paths.includes(path) ? paths.filter((p) => p !== path) : [path, ...paths];
  appStorage.set(key, next);
}

type RecentItem = { kind: "file" | "workspace"; name: string; path: string };
function readRecentItems(): RecentItem[] {
  return appStorage.get("recent", []);
}
