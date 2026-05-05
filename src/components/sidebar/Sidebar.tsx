import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { markdownNodes } from "../../lib/utils";
import { tauri } from "../../lib/tauri";
import { appStorage } from "../../lib/storage";
import type { EntryKind, FileTreeNode, LocalTrashItem, TrashMetadataItem } from "../../lib/types";
import { useCallback, useEffect, useState, useMemo } from "react";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { DeleteFolderDialog } from "../modals/DeleteFolderDialog";
import { MoveFolderDialog } from "../modals/MoveFolderDialog";
import { usePrompt } from "../modals/PromptDialogContext";
import {
  DocumentPlusIcon,
  Cog6ToothIcon,
  XMarkIcon,
  StarIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  FolderOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  FolderIcon,
  FolderPlusIcon,
  PencilIcon,
  DocumentTextIcon,
  ClipboardIcon,
  ArrowRightIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
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
        <div className="mt-3 flex gap-1.5">
          <button
            className="sidebar-action flex-1"
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
  const prompt = usePrompt();
  const [query, setQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{ node: FileTreeNode; x: number; y: number } | null>(null);
  const [trashItems, setTrashItems] = useState<LocalTrashItem[]>([]);
  const [cloudTrashItems, setCloudTrashItems] = useState<TrashMetadataItem[]>([]);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ path: string; name: string } | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<{ path: string; name: string; kind: "folder" | "markdown" } | null>(null);
  const favorites = useMemo(() => readFavorites(state.workspace?.rootPath), [state.workspace?.rootPath, state.currentPath, state.favoriteVersion]);

  // Persist expand state
  useEffect(() => {
    if (state.workspace) {
      appStorage.set(`expandedFolders:${state.workspace.rootPath}`, [...state.expandedFolders]);
    }
  }, [state.expandedFolders, state.workspace?.rootPath]);

  useEffect(() => {
    if (state.workspace) {
      const saved: string[] = appStorage.get(`expandedFolders:${state.workspace.rootPath}`, []);
      if (saved.length > 0) {
        dispatch({ type: "SET_EXPANDED_FOLDERS", folders: new Set(saved) });
      }
    }
  }, [state.workspace?.rootPath]);

  const allFolderPaths = useMemo(() => {
    if (!state.workspace) return new Set<string>();
    const paths = new Set<string>();
    const walk = (nodes: FileTreeNode[]) => {
      for (const n of nodes) {
        if (n.kind === "folder" && n.name !== ".jtype") {
          paths.add(n.relativePath);
          walk(n.children);
        }
      }
    };
    walk(state.workspace.entries);
    return paths;
  }, [state.workspace]);

  const allExpanded = allFolderPaths.size > 0 && allFolderPaths.size === state.expandedFolders.size;

  const toggleExpandCollapse = useCallback(() => {
    if (allExpanded) {
      dispatch({ type: "SET_EXPANDED_FOLDERS", folders: new Set<string>() });
    } else {
      dispatch({ type: "SET_EXPANDED_FOLDERS", folders: new Set(allFolderPaths) });
    }
  }, [allExpanded, allFolderPaths, dispatch]);

  const handleDrop = useCallback(async (targetFolder: string, sourceRelativePath: string) => {
    if (!state.workspace) return;
    const sourceName = sourceRelativePath.split("/").pop() ?? sourceRelativePath;
    const destPath = targetFolder ? `${targetFolder}/${sourceName}` : sourceName;
    if (destPath === sourceRelativePath) return;
    try {
      // Determine if source is a folder or file
      const sourceNode = findNode(state.workspace.entries, sourceRelativePath);
      if (sourceNode?.kind === "folder") {
        if (destPath.startsWith(sourceRelativePath + "/")) {
          dispatch({ type: "SET_STATUS", message: "Cannot move folder into itself." });
          return;
        }
        const [workspace] = await tauri.moveFolder(state.workspace.rootPath, sourceRelativePath, destPath);
        dispatch({ type: "UPDATE_WORKSPACE", workspace });
      } else {
        const workspace = await tauri.renameEntry(state.workspace.rootPath, sourceRelativePath, destPath);
        dispatch({ type: "UPDATE_WORKSPACE", workspace });
      }
      dispatch({ type: "SET_STATUS", message: `Moved ${sourceName} to ${targetFolder || "root"}.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    }
  }, [state.workspace, dispatch]);

  const filteredResults = useMemo(() => {
    if (!query) return null;
    const nodes = markdownNodes(state.workspace?.entries ?? []);
    return nodes.filter((n) => `${n.name} ${n.relativePath}`.toLowerCase().includes(query.toLowerCase())).slice(0, 30);
  }, [state.workspace, query]);

  const loadTrash = useCallback(async () => {
    const items = await fs.listTrash();
    setTrashItems(items);
    if (tauri.isAvailable && state.workspace) {
      try {
        const meta = await tauri.loadTrashMetadata(state.workspace.rootPath);
        setCloudTrashItems(meta.items.filter((item) => item.source === "cloud"));
      } catch { setCloudTrashItems([]); }
    }
  }, [fs.listTrash, state.workspace?.rootPath]);

  type MergedTrashItem = {
    relativePath: string;
    trashedAt: number;
    localTrashId?: string;
    cloudTrashId?: string;
  };

  const mergedTrashItems = useMemo(() => {
    const map = new Map<string, MergedTrashItem>();
    for (const item of trashItems) {
      const existing = map.get(item.relativePath);
      map.set(item.relativePath, {
        relativePath: item.relativePath,
        trashedAt: existing ? Math.max(existing.trashedAt, item.trashedAt) : item.trashedAt,
        localTrashId: item.trashId,
        cloudTrashId: existing?.cloudTrashId,
      });
    }
    for (const item of cloudTrashItems) {
      const existing = map.get(item.relativePath);
      map.set(item.relativePath, {
        relativePath: item.relativePath,
        trashedAt: existing ? Math.max(existing.trashedAt, item.trashedAt) : item.trashedAt,
        localTrashId: existing?.localTrashId,
        cloudTrashId: item.cloudTrashId,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.trashedAt - a.trashedAt);
  }, [trashItems, cloudTrashItems]);

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
              <>
                <div className="mb-1 flex items-center justify-end gap-0.5">
                  <button
                    className="subtle-button aspect-square px-0"
                    type="button"
                    title="New folder"
                    onClick={async () => {
                      if (!state.workspace) return;
                      const name = await prompt("New folder name:");
                      if (name && name.trim()) {
                        try {
                          const workspace = await tauri.createFolder(state.workspace.rootPath, name.trim());
                          dispatch({ type: "UPDATE_WORKSPACE", workspace });
                          dispatch({ type: "SET_STATUS", message: `Created folder ${name.trim()}.` });
                        } catch (error) {
                          dispatch({ type: "SET_STATUS", message: String(error) });
                        }
                      }
                    }}
                  >
                    <FolderPlusIcon className="h-3.5 w-3.5" />
                  </button>
                  <button className="subtle-button aspect-square px-0" type="button" title={allExpanded ? "Collapse all" : "Expand all"} onClick={toggleExpandCollapse}>
                    {allExpanded
                      ? <ArrowsPointingInIcon className="h-3.5 w-3.5" />
                      : <ArrowsPointingOutIcon className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <ul className="space-y-1">
                  {state.workspace.entries.map((node) => (
                    <TreeNode
                      key={node.path}
                      node={node}
                      depth={0}
                      onContextMenu={(selectedNode, x, y) => setContextMenu({ node: selectedNode, x, y })}
                      onDrop={(target, source) => handleDrop(target, source)}
                    />
                  ))}
                </ul>
              </>
            )}
          </nav>

          <section className="mt-5 border-t border-emerald-900/10 pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-stone-500">Trash</p>
              {mergedTrashItems.length > 0 && (
                <button className="subtle-button aspect-square px-0" type="button" title="Empty trash" onClick={() => { void fs.emptyTrash().then(loadTrash); }}>
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {mergedTrashItems.length === 0 ? (
                <p className="text-xs text-stone-500">No deleted notes.</p>
              ) : (
                mergedTrashItems.map((item) => (
                  <div key={item.localTrashId ?? item.cloudTrashId ?? item.relativePath} className="rounded-lg px-2.5 py-2 text-xs text-[#4b5753] hover:bg-white/80">
                    <p className="min-w-0 truncate font-semibold">{item.relativePath}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-stone-500">{formatTrashTime(item.trashedAt)}</span>
                      <div className="flex gap-1">
                        <button
                          className="subtle-button aspect-square px-0"
                          type="button"
                          title="Restore"
                          onClick={() => {
                            if (item.localTrashId) {
                              void fs.restoreTrashItem(item.localTrashId).then(loadTrash);
                            } else if (item.cloudTrashId && state.workspace) {
                              void (async () => {
                                try {
                                  const meta = await tauri.loadTrashMetadata(state.workspace!.rootPath);
                                  meta.pendingTrashOps.push({ type: "restore", trashId: item.cloudTrashId! });
                                  meta.items = meta.items.filter((i) => i.cloudTrashId !== item.cloudTrashId);
                                  await tauri.saveTrashMetadata(state.workspace!.rootPath, meta);
                                  dispatch({ type: "SET_STATUS", message: "Restore queued. Will sync on next push." });
                                  void loadTrash();
                                } catch (error) {
                                  dispatch({ type: "SET_STATUS", message: String(error) });
                                }
                              })();
                            }
                          }}
                        >
                          <ArrowUturnLeftIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="subtle-button aspect-square px-0 text-red-400 hover:text-red-600"
                          type="button"
                          title="Permanently delete"
                          onClick={() => {
                            if (item.localTrashId) {
                              void fs.permanentDeleteTrash(item.localTrashId).then(loadTrash);
                            } else if (item.cloudTrashId && state.workspace) {
                              void (async () => {
                                try {
                                  const meta = await tauri.loadTrashMetadata(state.workspace!.rootPath);
                                  meta.pendingTrashOps.push({ type: "permanent_delete", trashId: item.cloudTrashId! });
                                  meta.items = meta.items.filter((i) => i.cloudTrashId !== item.cloudTrashId);
                                  await tauri.saveTrashMetadata(state.workspace!.rootPath, meta);
                                  dispatch({ type: "SET_STATUS", message: "Permanent delete queued. Will sync on next push." });
                                  void loadTrash();
                                } catch (error) {
                                  dispatch({ type: "SET_STATUS", message: String(error) });
                                }
                              })();
                            }
                          }}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
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
          {contextMenu.node.kind === "folder" && (
            <>
              <button
                type="button"
                className="context-menu-button"
                onClick={async () => {
                  const name = await prompt("New document name (e.g. note.md):");
                  if (name) void fs.createDocument(`${contextMenu.node.relativePath}/${name.trim()}`);
                  setContextMenu(null);
                }}
              >
                <DocumentPlusIcon className="mr-2 h-3.5 w-3.5" />New document
              </button>
              <button
                type="button"
                className="context-menu-button"
                onClick={async () => {
                  const name = await prompt("New folder name:");
                  if (name && state.workspace) {
                    try {
                      const workspace = await tauri.createFolder(state.workspace!.rootPath, `${contextMenu.node.relativePath}/${name.trim()}`);
                      dispatch({ type: "UPDATE_WORKSPACE", workspace });
                      dispatch({ type: "SET_STATUS", message: `Created folder ${name.trim()}.` });
                    } catch (error) {
                      dispatch({ type: "SET_STATUS", message: String(error) });
                    }
                  }
                  setContextMenu(null);
                }}
              >
                <FolderPlusIcon className="mr-2 h-3.5 w-3.5" />New folder
              </button>
              <button
                type="button"
                className="context-menu-button"
                onClick={async () => {
                  const newName = await prompt("Rename folder to:", contextMenu.node.name);
                  if (newName && newName !== contextMenu.node.name && state.workspace) {
                    const parentPath = contextMenu.node.relativePath.split("/").slice(0, -1).join("/");
                    const newRelative = parentPath ? `${parentPath}/${newName.trim()}` : newName.trim();
                    try {
                      const [workspace] = await tauri.renameFolder(state.workspace!.rootPath, contextMenu.node.relativePath, newRelative);
                      dispatch({ type: "UPDATE_WORKSPACE", workspace });
                      dispatch({ type: "SET_STATUS", message: `Renamed folder to ${newName.trim()}.` });
                    } catch (error) {
                      dispatch({ type: "SET_STATUS", message: String(error) });
                    }
                  }
                  setContextMenu(null);
                }}
              >
                <PencilIcon className="mr-2 h-3.5 w-3.5" />Rename
              </button>
            </>
          )}
          {contextMenu.node.kind === "markdown" && (
            <>
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
              <button
                type="button"
                className="context-menu-button"
                onClick={async () => {
                  const newName = await prompt("Rename to:", contextMenu.node.name);
                  if (newName && newName !== contextMenu.node.name && state.workspace) {
                    const parentPath = contextMenu.node.relativePath.split("/").slice(0, -1).join("/");
                    const newRelative = parentPath ? `${parentPath}/${newName.trim()}` : newName.trim();
                    try {
                      const workspace = await tauri.renameEntry(state.workspace!.rootPath, contextMenu.node.relativePath, newRelative);
                      dispatch({ type: "UPDATE_WORKSPACE", workspace });
                      dispatch({ type: "SET_STATUS", message: `Renamed to ${newName.trim()}.` });
                      // If the renamed file is currently open, update its path
                      if (state.currentRelativePath === contextMenu.node.relativePath) {
                        void fs.openMarkdownFile(`${state.workspace!.rootPath}/${newRelative}`, newRelative);
                      }
                    } catch (error) {
                      dispatch({ type: "SET_STATUS", message: String(error) });
                    }
                  }
                  setContextMenu(null);
                }}
              >
                <PencilIcon className="mr-2 h-3.5 w-3.5" />Rename
              </button>
            </>
          )}
          <div className="my-1 border-t border-stone-200" />
          <button
            type="button"
            className="context-menu-button"
            onClick={() => {
              setMoveFolderTarget({
                path: contextMenu.node.relativePath,
                name: contextMenu.node.name,
                kind: contextMenu.node.kind === "folder" ? "folder" : "markdown",
              });
              setContextMenu(null);
            }}
          >
            <ArrowRightIcon className="mr-2 h-3.5 w-3.5" />Move to...
          </button>
          <button
            type="button"
            className="context-menu-button"
            onClick={() => {
              void navigator.clipboard.writeText(contextMenu.node.relativePath);
              dispatch({ type: "SET_STATUS", message: "Path copied to clipboard." });
              setContextMenu(null);
            }}
          >
            <ClipboardIcon className="mr-2 h-3.5 w-3.5" />Copy path
          </button>
          {tauri.isAvailable && (
            <button
              type="button"
              className="context-menu-button"
              onClick={() => {
                void (async () => {
                  try {
                    const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
                    await revealItemInDir(contextMenu.node.path);
                  } catch (error) {
                    dispatch({ type: "SET_STATUS", message: String(error) });
                  }
                })();
                setContextMenu(null);
              }}
            >
              <FolderOpenIcon className="mr-2 h-3.5 w-3.5" />Show in Explorer
            </button>
          )}
          <div className="my-1 border-t border-stone-200" />
          {contextMenu.node.kind === "folder" ? (
            <button
              type="button"
              className="context-menu-button text-red-700 hover:text-red-800"
              onClick={() => {
                setDeleteFolderTarget({ path: contextMenu.node.relativePath, name: contextMenu.node.name });
                setContextMenu(null);
              }}
            >
              <TrashIcon className="mr-2 h-3.5 w-3.5" />Delete folder
            </button>
          ) : (
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
          )}
        </div>
      )}
      {deleteFolderTarget && (
        <DeleteFolderDialog
          open={!!deleteFolderTarget}
          onClose={() => setDeleteFolderTarget(null)}
          folderPath={deleteFolderTarget.path}
          folderName={deleteFolderTarget.name}
        />
      )}
      {moveFolderTarget && (
        <MoveFolderDialog
          open={!!moveFolderTarget}
          onClose={() => setMoveFolderTarget(null)}
          sourcePath={moveFolderTarget.path}
          sourceName={moveFolderTarget.name}
          sourceKind={moveFolderTarget.kind}
        />
      )}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  onContextMenu,
  onDrop,
}: {
  node: FileTreeNode;
  depth: number;
  onContextMenu: (node: FileTreeNode, x: number, y: number) => void;
  onDrop: (targetFolder: string, sourceRelativePath: string) => void;
}) {
  const state = useAppState();
  const fs = useFileSystem();
  const dispatch = useAppDispatch();
  const [dragOver, setDragOver] = useState(false);

  if (node.relativePath === ".jtype") return null;

  const isActive = node.relativePath === state.currentRelativePath;
  const isFolder = node.kind === "folder";
  const isExpanded = isFolder && state.expandedFolders.has(node.relativePath);

  return (
    <li>
      <button
        type="button"
        className={`tree-button ${isActive ? "tree-button-active" : ""} ${dragOver ? "ring-2 ring-[#008884]/40 bg-[#e8f6f2]" : ""}`}
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", node.relativePath);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          if (!isFolder) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!isFolder) return;
          const source = e.dataTransfer.getData("text/plain");
          if (source && source !== node.relativePath) {
            onDrop(node.relativePath, source);
          }
        }}
        onClick={() => {
          if (isFolder) {
            dispatch({ type: "TOGGLE_EXPAND_FOLDER", folderPath: node.relativePath });
          } else if (node.kind === "markdown") {
            fs.openMarkdownFile(node.path, node.relativePath);
          } else {
            dispatch({ type: "SELECT_TREE_NODE", node });
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(node, e.clientX, e.clientY);
        }}
      >
        {isFolder ? (
          <span className="shrink-0 text-[#8a9691]">
            {isExpanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
          </span>
        ) : null}
        <span className="shrink-0 text-[#8a9691]">
          {isFolder ? <FolderIcon className="h-3.5 w-3.5" /> : node.kind === "markdown" ? <DocumentTextIcon className="h-3.5 w-3.5" /> : null}
        </span>
        <span className={`truncate ${isFolder ? "font-semibold text-[#4b5753]" : ""}`}>{node.name}</span>
      </button>
      {isFolder && isExpanded && node.children.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} onContextMenu={onContextMenu} onDrop={onDrop} />
          ))}
        </ul>
      )}
    </li>
  );
}

function findNode(entries: FileTreeNode[], relativePath: string): FileTreeNode | undefined {
  for (const entry of entries) {
    if (entry.relativePath === relativePath) return entry;
    if (entry.kind === "folder") {
      const found = findNode(entry.children, relativePath);
      if (found) return found;
    }
  }
  return undefined;
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
