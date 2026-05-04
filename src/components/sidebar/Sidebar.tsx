import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { markdownNodes } from "../../lib/utils";
import { appStorage } from "../../lib/storage";
import type { EntryKind, FileTreeNode, LocalTrashItem } from "../../lib/types";
import { useCallback, useEffect, useState, useMemo } from "react";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import {
  DocumentPlusIcon,
  Cog6ToothIcon,
  XMarkIcon,
  StarIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  FolderOpenIcon,
  ChevronDownIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

export function Sidebar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  if (state.mode === "empty" && !state.workspace) return null;
  if (state.focusMode) return null;

  const currentBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const workspaceName = currentBinding?.workspaceName || state.workspace?.name || "No vault";
  const docCount = state.workspace ? markdownNodes(state.workspace.entries).length : 0;

  return (
    <aside id="workspace-sidebar" className="flex min-h-0 flex-col border-r border-black/[0.04] bg-[#f7faf8]">
      <div className="p-5 pb-4">
        <Menu as="div" className="relative">
          <MenuButton
            type="button"
            className="flex w-full items-center gap-2 rounded-xl bg-white/75 px-2.5 py-2 text-left shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.04] transition hover:bg-white hover:ring-[#008884]/20"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eef7f4] text-sm font-semibold text-[#006f6b]">
              {workspaceName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span id="workspace-name" className="block truncate text-sm font-semibold text-stone-950">{workspaceName}</span>
              <span id="workspace-path" className="block truncate text-xs text-[#6b7773]">
                {state.workspace ? `${docCount} documents` : "Open a vault or Markdown file."}
              </span>
            </span>
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-[#8a9691]" />
          </MenuButton>
          <MenuItems
            as="div"
            className="absolute left-0 top-12 z-50 w-[320px] overflow-hidden rounded-xl border border-black/[0.06] bg-[#fbfdfb] shadow-2xl shadow-stone-900/15"
          >
            <div className="max-h-64 overflow-y-auto p-2">
              {state.workspace && (
                <div className="flex items-center gap-2 rounded-lg bg-[#e8f6f2] px-2.5 py-2 text-sm font-semibold text-[#006f6b]">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-[#006f6b] ring-1 ring-black/[0.04]">
                    {workspaceName.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{workspaceName}</span>
                    <span className="block truncate text-xs font-normal text-[#6b7773]">
                      {docCount} documents
                    </span>
                  </span>
                  <CheckIcon className="h-4 w-4 shrink-0 text-[#006f6b]" />
                </div>
              )}
              {recentVaults(state.workspace?.rootPath).length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {recentVaults(state.workspace?.rootPath).map((vault) => (
                    <MenuItem
                      key={vault.path}
                      as="button"
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition hover:bg-[#e8f6f2]"
                      onClick={() => { void fs.openWorkspace(vault.path); }}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-zinc-500 ring-1 ring-black/[0.04]">
                        {vault.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate font-semibold">{vault.name}</span>
                        <span className="block truncate text-xs text-zinc-500">{vault.path}</span>
                      </span>
                    </MenuItem>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-black/[0.06] p-2 space-y-1">
              <MenuItem
                as="button"
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition hover:bg-[#e8f6f2]"
                onClick={() => { void fs.chooseWorkspaceFolder(); }}
              >
                <FolderOpenIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="min-w-0 text-left">
                  <span className="block truncate font-semibold">Open another vault</span>
                  <span className="block truncate text-xs text-zinc-500">Choose a local folder</span>
                </span>
              </MenuItem>
              <MenuItem
                as="button"
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition hover:bg-[#e8f6f2]"
                onClick={() => { dispatch({ type: "SET_ACCOUNT_DIALOG", open: true }); }}
              >
                <Cog6ToothIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="font-semibold">Settings</span>
              </MenuItem>
              {state.workspace && (
                <MenuItem
                  as="button"
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition hover:bg-[#e8f6f2]"
                  onClick={() => { dispatch({ type: "CLOSE_WORKSPACE" }); }}
                >
                  <XMarkIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                  <span className="font-semibold">Close vault</span>
                </MenuItem>
              )}
              {currentBinding && (
                <div className="mt-1 rounded-lg bg-[#e8f6f2] px-3 py-2 text-xs text-[#006f6b] ring-1 ring-[#008884]/10">
                  Syncing with {currentBinding.workspaceName}.
                </div>
              )}
            </div>
          </MenuItems>
        </Menu>
        <div className="mt-3">
          <button
            className="sidebar-action w-full"
            type="button"
            title="New Document"
            disabled={!state.workspace || state.isLoading}
            onClick={() => dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: true })}
          >
            <DocumentPlusIcon className="h-4 w-4" />
            <span className="ml-1.5">New Document</span>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <ExplorerPanel />
      </div>
    </aside>
  );
}

function ExplorerPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const [query, setQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{ node: FileTreeNode; x: number; y: number } | null>(null);
  const [trashItems, setTrashItems] = useState<LocalTrashItem[]>([]);
  const favorites = useMemo(() => readFavorites(state.workspace?.rootPath), [state.workspace?.rootPath, state.currentPath, state.favoriteVersion]);

  const filteredResults = useMemo(() => {
    if (!query) return null;
    const nodes = markdownNodes(state.workspace?.entries ?? []);
    return nodes.filter((n) => `${n.name} ${n.relativePath}`.toLowerCase().includes(query.toLowerCase())).slice(0, 30);
  }, [state.workspace, query]);

  const loadTrash = useCallback(async () => {
    const items = await fs.listTrash();
    setTrashItems(items);
  }, [fs.listTrash]);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash, state.workspace?.rootPath, state.workspace?.entries, state.statusMessage]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu]);

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
                <button className="subtle-button aspect-square px-0" type="button" title="Toggle favorite" disabled={!state.currentPath} onClick={() => {
                  toggleFavorite(state.currentPath, state.workspace?.rootPath);
                  dispatch({ type: "TOGGLE_FAVORITE" });
                }}>
                  <StarIcon className="h-4 w-4" />
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
                  <TreeNode
                    key={node.path}
                    node={node}
                    depth={0}
                    onContextMenu={(selectedNode, x, y) => setContextMenu({ node: selectedNode, x, y })}
                  />
                ))}
              </ul>
            )}
          </nav>

          <section className="mt-5 border-t border-emerald-900/10 pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-stone-500">Trash</p>
              {trashItems.length > 0 && (
                <button className="subtle-button aspect-square px-0" type="button" title="Empty trash" onClick={() => { void fs.emptyTrash().then(loadTrash); }}>
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {trashItems.length === 0 ? (
                <p className="text-xs text-stone-500">No deleted notes.</p>
              ) : (
                trashItems.map((item) => (
                  <div key={item.trashId} className="rounded-lg px-2.5 py-2 text-xs text-[#4b5753] hover:bg-white/80">
                    <p className="truncate font-semibold">{item.relativePath}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-stone-500">{formatTrashTime(item.trashedAt)}</span>
                      <button
                        className="subtle-button aspect-square px-0"
                        type="button"
                        title="Restore"
                        onClick={() => { void fs.restoreTrashItem(item.trashId).then(loadTrash); }}
                      >
                        <ArrowUturnLeftIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
      {contextMenu && (
        <div
          role="menu"
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.node.kind === "markdown" && (
            <button
              type="button"
              className="context-menu-button"
              onClick={() => {
                void fs.openMarkdownFile(contextMenu.node.path, contextMenu.node.relativePath);
                setContextMenu(null);
              }}
            >
              <FolderOpenIcon className="mr-2 h-3.5 w-3.5" />Open
            </button>
          )}
          <button
            type="button"
            className="context-menu-button text-red-700 hover:text-red-800"
            onClick={() => {
              void fs.deleteEntry(contextMenu.node.relativePath);
              setContextMenu(null);
            }}
          >
            <TrashIcon className="mr-2 h-3.5 w-3.5" />Move to trash
          </button>
        </div>
      )}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  onContextMenu,
}: {
  node: FileTreeNode;
  depth: number;
  onContextMenu: (node: FileTreeNode, x: number, y: number) => void;
}) {
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
          e.stopPropagation();
          onContextMenu(node, e.clientX, e.clientY);
        }}
      >
        {iconForNode(node) && <span className="shrink-0 text-[#8a9691]">{iconForNode(node)}</span>}
        <span className="truncate">{node.name}</span>
      </button>
      {node.children.length > 0 && (
        <ul className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} onContextMenu={onContextMenu} />
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
function recentVaults(currentPath?: string): RecentItem[] {
  const recent: RecentItem[] = appStorage.get("recent", []);
  return recent
    .filter((item) => item.kind === "workspace" && item.path !== currentPath)
    .slice(0, 5);
}

function formatTrashTime(value: number) {
  if (!value) return "Deleted";
  return new Date(value * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
