import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { isCurrentVaultReadOnly, useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { markdownNodes } from "../../lib/utils";
import { tauri } from "../../lib/tauri";
import { appStorage } from "../../lib/storage";
import type { EntryKind, FileTreeNode, LocalTrashItem, RecentItem, TrashMetadataItem } from "../../lib/types";
import { useCallback, useEffect, useState, useMemo, type ReactNode } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { DeleteFolderDialog } from "../modals/DeleteFolderDialog";
import { MoveFolderDialog } from "../modals/MoveFolderDialog";
import { usePrompt, useConfirm } from "@shared/components/PromptDialogContext";
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
  DocumentIcon,
  PhotoIcon,
  ViewColumnsIcon,
  ShareIcon,
  RectangleGroupIcon,
  PencilSquareIcon,
  CodeBracketIcon,
  ClipboardIcon,
  ArrowRightIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import { resourceTypeForPath } from "@shared/lib/fileTypes";
import { useRuntimeCapabilities } from "../../app/RuntimeCapabilities";

/** Tree icon for a diagram resource, by its concrete type. */
function diagramIcon(name: string) {
  switch (resourceTypeForPath(name).id) {
    case "mermaid":
      return ShareIcon;
    case "drawio":
      return RectangleGroupIcon;
    case "excalidraw":
      return PencilSquareIcon;
    case "swagger":
      return CodeBracketIcon;
    default:
      return DocumentIcon;
  }
}

export function Sidebar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const confirm = useConfirm();
  const capabilities = useRuntimeCapabilities();
  if (state.mode === "empty" && !state.workspace) return null;
  if (state.focusMode) return null;

  const currentBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const currentVaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const activeCloudBinding = currentVaultSettings?.cloudSyncEnabled === false ? null : currentBinding;
  const isCloudViewer = activeCloudBinding?.workspaceRole === "viewer" || isCurrentVaultReadOnly(state);
  const workspaceName = activeCloudBinding?.workspaceName || state.workspace?.name || t`No vault`;
  const docCount = state.workspace ? markdownNodes(state.workspace.entries).length : 0;

  return (
    <aside id="workspace-sidebar" className="flex min-h-0 flex-col bg-transparent">
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
                {state.workspace ? t`${docCount} documents` : t`Open a vault or Markdown file.`}
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
                      <Trans>{docCount} documents</Trans>
                    </span>
                  </span>
                  <CheckIcon className="h-4 w-4 shrink-0 text-[#006f6b]" />
                </div>
              )}
              {recentVaults(state.workspace?.rootPath).length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {recentVaults(state.workspace?.rootPath).map((vault) => (
                    <div key={vault.path} className="group relative">
                      <MenuItem
                        as="button"
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition hover:bg-[#e8f6f2]"
                        onClick={() => { void fs.openWorkspace(vault.path); }}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-zinc-500 ring-1 ring-black/[0.04]">
                          {vault.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 pr-8 text-left">
                          <span className="block truncate font-semibold">{vault.name}</span>
                          <span className="block truncate text-xs text-zinc-500">{vault.path}</span>
                        </span>
                      </MenuItem>
                      <button
                        type="button"
                        title={t`Remove from list`}
                        className="absolute inset-y-0 right-1.5 z-10 flex w-7 items-center justify-center rounded-md text-zinc-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const ok = await confirm(t`Remove "${vault.name}" from list?`, { title: t`Remove vault`, destructive: true });
                          if (!ok) return;
                          await fs.removeRecentItem(vault.path);
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-black/[0.06] p-2 space-y-1">
              {capabilities.supportsExternalVault && (
                <MenuItem
                  as="button"
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition hover:bg-[#e8f6f2]"
                  onClick={() => { void fs.chooseWorkspaceFolder(); }}
                >
                  <FolderOpenIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                  <span className="min-w-0 text-left">
                    <span className="block truncate font-semibold"><Trans>Open another vault</Trans></span>
                    <span className="block truncate text-xs text-zinc-500"><Trans>Choose a local folder</Trans></span>
                  </span>
                </MenuItem>
              )}
              <MenuItem
                as="button"
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition hover:bg-[#e8f6f2]"
                onClick={() => { dispatch({ type: "SET_ACCOUNT_DIALOG", open: true }); }}
              >
                <Cog6ToothIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="font-semibold"><Trans>Settings</Trans></span>
              </MenuItem>
              {state.workspace && (
                <MenuItem
                  as="button"
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition hover:bg-[#e8f6f2]"
                  onClick={() => { dispatch({ type: "CLOSE_WORKSPACE" }); }}
                >
                  <XMarkIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                  <span className="font-semibold"><Trans>Close vault</Trans></span>
                </MenuItem>
              )}
              {activeCloudBinding && (
                <div className="mt-1 rounded-lg bg-[#e8f6f2] px-3 py-2 text-xs text-[#006f6b] ring-1 ring-[#008884]/10">
                  <Trans>Syncing with {activeCloudBinding.workspaceName}.</Trans>
                </div>
              )}
            </div>
          </MenuItems>
        </Menu>
        <div className="mt-3 flex gap-1.5">
          <button
            className="sidebar-action flex-1"
            type="button"
            title={t`New Document`}
            disabled={!state.workspace || state.isLoading || isCloudViewer}
            onClick={() => dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: true })}
          >
            <DocumentPlusIcon className="h-4 w-4" />
            <span className="ml-1.5"><Trans>New Document</Trans></span>
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
  const capabilities = useRuntimeCapabilities();
  const [query, setQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{ node: FileTreeNode; x: number; y: number } | null>(null);
  const [trashItems, setTrashItems] = useState<LocalTrashItem[]>([]);
  const [cloudTrashItems, setCloudTrashItems] = useState<TrashMetadataItem[]>([]);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ path: string; name: string } | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<{ path: string; name: string; kind: "folder" | "markdown" } | null>(null);
  const favorites = useMemo(() => readFavorites(state.workspace?.rootPath), [state.workspace?.rootPath, state.currentPath, state.favoriteVersion]);
  const currentVaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const currentBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const isCloudViewer = Boolean(
    (currentBinding?.workspaceRole === "viewer" && currentVaultSettings?.cloudSyncEnabled !== false)
      || isCurrentVaultReadOnly(state),
  );

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
    if (isCloudViewer) {
      dispatch({ type: "SET_STATUS", message: t`Viewer access is read-only.` });
      return;
    }
    const sourceName = sourceRelativePath.split("/").pop() ?? sourceRelativePath;
    const destPath = targetFolder ? `${targetFolder}/${sourceName}` : sourceName;
    if (destPath === sourceRelativePath) return;
    try {
      // Determine if source is a folder or file
      const sourceNode = findNode(state.workspace.entries, sourceRelativePath);
      if (sourceNode?.kind === "folder") {
        if (destPath.startsWith(sourceRelativePath + "/")) {
          dispatch({ type: "SET_STATUS", message: t`Cannot move folder into itself.` });
          return;
        }
        await fs.moveFolder(sourceRelativePath, destPath);
      } else {
        await fs.renameEntry(sourceRelativePath, destPath, false);
      }
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    }
  }, [isCloudViewer, state.workspace, dispatch, fs]);

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
    if (!contextMenu || capabilities.isTouchPrimary) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [capabilities.isTouchPrimary, contextMenu]);

  return (
    <div className="px-3 pb-4">
      {/* Pinned to the top of the scroll region so only the document list below
          scrolls — the search box stays put. */}
      <div className="sticky top-0 z-10 -mx-3 mb-1 bg-[#f5f8f6] px-3 pb-2 pt-0.5">
        <input
          className="sync-input"
          placeholder={t`Search files...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filteredResults ? (
        <div className="mt-3 space-y-1">
          {filteredResults.length === 0 ? (
            <p className="text-xs text-stone-500"><Trans>No matches.</Trans></p>
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
                <p className="text-xs font-semibold uppercase text-stone-500"><Trans>Favorites</Trans></p>
                <button className="subtle-button aspect-square px-0" type="button" title={t`Toggle favorite`} disabled={!state.currentPath} onClick={() => {
                  toggleFavorite(state.currentPath, state.workspace?.rootPath);
                  dispatch({ type: "TOGGLE_FAVORITE" });
                }}>
                  <StarIcon className="h-4 w-4" />
                </button>
              </div>
              <div id="favorite-list" className="space-y-1">
                {favorites.map((node) => (
                  <button key={node.path} type="button" className="tree-button text-xs" onClick={() => fs.openMarkdownFile(node.path, node.relativePath)}>
                    <span className="text-stone-500"><Trans>Favorite</Trans></span>
                    <span className="truncate font-semibold">{node.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <nav className="mt-2" aria-label={t`Workspace files`}>
            {!state.workspace ? (
              <p className="rounded-md border border-dashed border-stone-300 p-3 text-sm text-stone-500">
                <Trans>Drop a folder here to open it as a vault.</Trans>
              </p>
            ) : (
              <>
                <div className="mb-1 flex items-center justify-end gap-0.5">
                  <button
                    className="subtle-button aspect-square px-0"
                    type="button"
                    title={t`New folder`}
                    onClick={async () => {
                      if (!state.workspace) return;
                      const name = await prompt(t`New folder name:`);
                      if (name && name.trim()) {
                        try {
                          await fs.createFolder(name.trim());
                          dispatch({ type: "SET_STATUS", message: t`Created folder ${name.trim()}.` });
                        } catch (error) {
                          dispatch({ type: "SET_STATUS", message: String(error) });
                        }
                      }
                    }}
                  >
                    <FolderPlusIcon className="h-3.5 w-3.5" />
                  </button>
                  <button className="subtle-button aspect-square px-0" type="button" title={allExpanded ? t`Collapse all` : t`Expand all`} onClick={toggleExpandCollapse}>
                    {allExpanded
                      ? <ArrowsPointingInIcon className="h-3.5 w-3.5" />
                      : <ArrowsPointingOutIcon className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {state.workspace.entries.filter((n) => n.relativePath !== ".jtype").length === 0 ? (
                  <div className="rounded-md border border-dashed border-stone-300 p-4">
                    <p className="text-sm font-semibold text-stone-800"><Trans>No documents yet.</Trans></p>
                    <p className="mt-1 text-sm text-stone-500"><Trans>Create your first Markdown note.</Trans></p>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {groupBoardsWithFolders(state.workspace.entries).map((node) => (
                      <TreeNode
                        key={node.path}
                        node={node}
                        depth={0}
                        onContextMenu={(selectedNode, x, y) => setContextMenu({ node: selectedNode, x, y })}
                        onActionMenu={(selectedNode, x, y) => setContextMenu({ node: selectedNode, x, y })}
                        onDrop={(target, source) => handleDrop(target, source)}
                      />
                    ))}
                  </ul>
                )}
              </>
            )}
          </nav>

          <section className="mt-5 border-t border-emerald-900/10 pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-xs font-semibold uppercase text-stone-500">
                <TrashIcon className="h-3 w-3" /><Trans>Trash</Trans>
              </p>
              {mergedTrashItems.length > 0 && (
                <button className="subtle-button aspect-square px-0" type="button" title={t`Empty trash`} onClick={() => { void fs.emptyTrash().then(loadTrash); }}>
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {mergedTrashItems.length === 0 ? (
                <p className="text-xs text-stone-500"><Trans>No deleted notes.</Trans></p>
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
                          title={t`Restore`}
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
                                  dispatch({ type: "SET_STATUS", message: t`Restore queued. Will sync on next push.` });
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
                          title={t`Permanently delete`}
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
                                  dispatch({ type: "SET_STATUS", message: t`Permanent delete queued. Will sync on next push.` });
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
        <NodeActionMenu
          mobile={capabilities.isTouchPrimary}
          label={t`Actions for ${contextMenu.node.name}`}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
        >
          {contextMenu.node.kind === "folder" && (
            <>
              {!isCloudViewer && (
                <>
                  <button
                    type="button"
                    className="context-menu-button"
                    onClick={() => {
                      // Reuse the polished "New Document" dialog, targeted at the
                      // right-clicked folder, instead of a bare name prompt.
                      dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: true, targetDir: contextMenu.node.relativePath });
                      setContextMenu(null);
                    }}
                  >
                    <DocumentPlusIcon className="mr-2 h-3.5 w-3.5" /><Trans>New document</Trans>
                  </button>
                  <button
                    type="button"
                    className="context-menu-button"
                    onClick={async () => {
                      setContextMenu(null);
                      const name = await prompt(t`New folder name:`);
                      if (name && state.workspace) {
                        try {
                          await fs.createFolder(`${contextMenu.node.relativePath}/${name.trim()}`);
                          dispatch({ type: "SET_STATUS", message: t`Created folder ${name.trim()}.` });
                        } catch (error) {
                          dispatch({ type: "SET_STATUS", message: String(error) });
                        }
                      }
                    }}
                  >
                    <FolderPlusIcon className="mr-2 h-3.5 w-3.5" /><Trans>New folder</Trans>
                  </button>
                  <button
                    type="button"
                    className="context-menu-button"
                    onClick={async () => {
                      setContextMenu(null);
                      const newName = await prompt(t`Rename folder to:`, contextMenu.node.name);
                      if (newName && newName !== contextMenu.node.name && state.workspace) {
                        const parentPath = contextMenu.node.relativePath.split("/").slice(0, -1).join("/");
                        const newRelative = parentPath ? `${parentPath}/${newName.trim()}` : newName.trim();
                        try {
                          await fs.renameFolder(contextMenu.node.relativePath, newRelative);
                        } catch (error) {
                          dispatch({ type: "SET_STATUS", message: String(error) });
                        }
                      }
                    }}
                  >
                    <PencilIcon className="mr-2 h-3.5 w-3.5" /><Trans>Rename</Trans>
                  </button>
                </>
              )}
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
                <FolderOpenIcon className="mr-2 h-3.5 w-3.5" /><Trans>Open</Trans>
              </button>
              {!isCloudViewer && (
                <button
                  type="button"
                  className="context-menu-button"
                  onClick={async () => {
                    setContextMenu(null);
                    const newName = await prompt(t`Rename to:`, contextMenu.node.name);
                    if (newName && newName !== contextMenu.node.name && state.workspace) {
                      const parentPath = contextMenu.node.relativePath.split("/").slice(0, -1).join("/");
                      const newRelative = parentPath ? `${parentPath}/${newName.trim()}` : newName.trim();
                      try {
                        await fs.renameEntry(contextMenu.node.relativePath, newRelative, true);
                      } catch (error) {
                        dispatch({ type: "SET_STATUS", message: String(error) });
                      }
                    }
                  }}
                >
                  <PencilIcon className="mr-2 h-3.5 w-3.5" /><Trans>Rename</Trans>
                </button>
              )}
            </>
          )}
          <div className="my-1 border-t border-stone-200" />
          {!isCloudViewer && (
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
              <ArrowRightIcon className="mr-2 h-3.5 w-3.5" /><Trans>Move to...</Trans>
            </button>
          )}
          <button
            type="button"
            className="context-menu-button"
            onClick={() => {
              void navigator.clipboard
                .writeText(contextMenu.node.relativePath)
                .then(() => dispatch({ type: "SET_STATUS", message: t`Path copied to clipboard.` }))
                .catch((error) => dispatch({ type: "SET_STATUS", message: String(error) }));
              setContextMenu(null);
            }}
          >
            <ClipboardIcon className="mr-2 h-3.5 w-3.5" /><Trans>Copy path</Trans>
          </button>
          {tauri.isAvailable && capabilities.supportsExternalVault && !capabilities.isMobile && (
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
              <FolderOpenIcon className="mr-2 h-3.5 w-3.5" /><Trans>Show in Explorer</Trans>
            </button>
          )}
          {!isCloudViewer && (
            <>
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
                  <TrashIcon className="mr-2 h-3.5 w-3.5" /><Trans>Delete folder</Trans>
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
                  <TrashIcon className="mr-2 h-3.5 w-3.5" /><Trans>Move to trash</Trans>
                </button>
              )}
            </>
          )}
        </NodeActionMenu>
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

/**
 * Visually unify a board with its cards folder: a `<name>.board` file and its
 * sibling `<name>/` folder are shown as one expandable board node (the folder's
 * card files nest under the board), so they don't appear as two separate entries.
 */
function groupBoardsWithFolders(entries: FileTreeNode[]): FileTreeNode[] {
  const boardBases = new Set<string>();
  for (const e of entries) if (e.kind === "board") boardBases.add(e.name.replace(/\.board$/i, ""));
  const folderByName = new Map<string, FileTreeNode>();
  for (const e of entries) if (e.kind === "folder") folderByName.set(e.name, e);
  const out: FileTreeNode[] = [];
  for (const e of entries) {
    if (e.kind === "folder" && boardBases.has(e.name)) continue; // merged into its board
    if (e.kind === "board") {
      const folder = folderByName.get(e.name.replace(/\.board$/i, ""));
      out.push(folder ? { ...e, children: [...e.children, ...folder.children] } : e);
    } else {
      out.push(e);
    }
  }
  return out;
}

function TreeNode({
  node,
  depth,
  onContextMenu,
  onActionMenu,
  onDrop,
}: {
  node: FileTreeNode;
  depth: number;
  onContextMenu: (node: FileTreeNode, x: number, y: number) => void;
  onActionMenu: (node: FileTreeNode, x: number, y: number) => void;
  onDrop: (targetFolder: string, sourceRelativePath: string) => void;
}) {
  const state = useAppState();
  const fs = useFileSystem();
  const dispatch = useAppDispatch();
  const capabilities = useRuntimeCapabilities();
  const [dragOver, setDragOver] = useState(false);

  if (node.relativePath === ".jtype") return null;

  const isActive = node.relativePath === state.currentRelativePath;
  const isFolder = node.kind === "folder";
  // A board with merged card children is expandable too (chevron toggles, row opens it).
  const isExpandable = isFolder || (node.kind === "board" && node.children.length > 0);
  const isExpanded = isExpandable && state.expandedFolders.has(node.relativePath);
  const NodeIcon = isFolder
    ? FolderIcon
    : node.kind === "board"
      ? ViewColumnsIcon
      : node.kind === "markdown"
        ? DocumentTextIcon
        : node.kind === "diagram"
          ? diagramIcon(node.name)
          : resourceTypeForPath(node.name).id === "image"
            ? PhotoIcon
            : DocumentIcon;

  return (
    <li className="relative">
      <button
        type="button"
        className={`tree-button ${capabilities.isTouchPrimary ? "min-h-11 pr-12" : ""} ${isActive ? "tree-button-active" : ""} ${dragOver ? "ring-2 ring-[#008884]/40 bg-[#e8f6f2]" : ""}`}
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
          } else if (node.kind === "diagram") {
            fs.openDiagramFile(node.path, node.relativePath);
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
        {isExpandable ? (
          <span
            className="shrink-0 cursor-pointer text-[#8a9691]"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "TOGGLE_EXPAND_FOLDER", folderPath: node.relativePath });
            }}
          >
            {isExpanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
          </span>
        ) : null}
        <span className="shrink-0 text-[#8a9691]">
          <NodeIcon className="h-3.5 w-3.5" />
        </span>
        <span className={`truncate ${isFolder ? "font-semibold text-[#4b5753]" : ""}`}>{node.name}</span>
      </button>
      {capabilities.isTouchPrimary && (node.kind === "folder" || node.kind === "markdown" || node.kind === "board") && (
        <button
          type="button"
          aria-label={t`Actions for ${node.name}`}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-700"
          onClick={(event) => {
            event.stopPropagation();
            const rect = event.currentTarget.getBoundingClientRect();
            onActionMenu(node, rect.left, rect.bottom);
          }}
        >
          <EllipsisHorizontalIcon className="h-5 w-5" />
        </button>
      )}
      {isExpandable && isExpanded && node.children.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {groupBoardsWithFolders(node.children).map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} onContextMenu={onContextMenu} onActionMenu={onActionMenu} onDrop={onDrop} />
          ))}
        </ul>
      )}
    </li>
  );
}

function NodeActionMenu({
  mobile,
  label,
  position,
  onClose,
  children,
}: {
  mobile: boolean;
  label: string;
  position: { x: number; y: number };
  onClose: () => void;
  children: ReactNode;
}) {
  if (!mobile) {
    return (
      <div
        role="menu"
        aria-label={label}
        className="context-menu"
        style={{ left: position.x, top: position.y }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    );
  }

  return (
    <Dialog open onClose={onClose} className="relative z-[100]">
      <DialogBackdrop className="fixed inset-0 bg-stone-950/30 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-end">
        <DialogPanel
          id="mobile-file-actions"
          className="w-full max-h-[75dvh] overflow-y-auto rounded-t-3xl bg-white px-3 pt-3 shadow-2xl [&_.context-menu-button]:min-h-12 [&_.context-menu-button]:rounded-xl [&_.context-menu-button]:px-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300" aria-hidden />
          <DialogTitle className="truncate px-2 pb-2 text-sm font-semibold text-stone-900">{label}</DialogTitle>
          <div role="menu" aria-label={label} onClick={(event) => event.stopPropagation()}>
            {children}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
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

function recentVaults(currentPath?: string): RecentItem[] {
  const recent: RecentItem[] = appStorage.get("recent", []);
  return recent
    .filter((item) => item.kind === "workspace" && item.path !== currentPath)
    .slice(0, 5);
}

function formatTrashTime(value: number) {
  if (!value) return t`Deleted`;
  return new Date(value * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
