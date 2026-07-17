import { useMemo, useState } from "react";
import { Trans } from "@lingui/react/macro";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { ArrowRightIcon, ChevronDownIcon, ChevronRightIcon, FolderIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import type { FileTreeNode } from "../../lib/types";

export function MoveFolderDialog({
  open,
  onClose,
  sourcePath,
  sourceName,
  sourceKind,
}: {
  open: boolean;
  onClose: () => void;
  sourcePath: string;
  sourceName: string;
  sourceKind: "folder" | "markdown";
}) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const [selected, setSelected] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const folders = useMemo(() => {
    if (!state.workspace) return [];
    return collectFolders(state.workspace.entries);
  }, [state.workspace]);

  const destPath = selected
    ? `${selected}/${sourceName}`
    : sourceName;

  const isValid = selected !== "" && selected !== sourcePath && !selected.startsWith(sourcePath + "/");

  const handleMove = async () => {
    if (!state.workspace || !isValid) return;
    try {
      if (sourceKind === "folder") {
        await fs.moveFolder(sourcePath, destPath);
      } else {
        await fs.renameEntry(sourcePath, destPath, false);
      }
      onClose();
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    }
  };

  const toggleExpand = (path: string) => {
    const next = new Set(expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[100]">
      <div className="fixed inset-0 bg-stone-950/25 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-xl border border-white/70 bg-[#fbfdfb] p-6 shadow-[0_25px_50px_-12px_rgb(28_25_23/0.2)]">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <ArrowRightIcon className="h-5 w-5 text-[#006f6b]" />
            <Trans>Move to Folder</Trans>
          </DialogTitle>
          <p className="mt-1 text-xs text-stone-500"><Trans>Select destination for "{sourceName}"</Trans></p>

          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-stone-200 p-2">
            <button
              type="button"
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${selected === "" ? "bg-[#e8f6f2] text-[#006f6b] font-semibold" : "text-stone-700 hover:bg-stone-50"}`}
              onClick={() => setSelected("")}
            >
              <FolderIcon className="h-3.5 w-3.5" />
              <span><Trans>/ (root)</Trans></span>
            </button>
            {folders.map((f) => (
              <FolderPickerNode
                key={f.path}
                folder={f}
                depth={0}
                selected={selected}
                expanded={expanded}
                sourcePath={sourcePath}
                onSelect={setSelected}
                onToggle={toggleExpand}
              />
            ))}
          </div>

          {selected !== "" && (
            <p className="mt-2 text-xs text-stone-500">
              <Trans>Destination: <span className="font-mono">{destPath}</span></Trans>
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
              onClick={onClose}
            >
              <Trans>Cancel</Trans>
            </button>
            <button
              type="button"
              className="rounded-lg bg-[#006f6b] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#005854] disabled:opacity-50"
              onClick={() => void handleMove()}
              disabled={!isValid}
            >
              <Trans>Move</Trans>
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

type FolderInfo = { name: string; path: string; children: FolderInfo[] };

function collectFolders(entries: FileTreeNode[]): FolderInfo[] {
  return entries
    .filter((e) => e.kind === "folder" && e.name !== ".jtype")
    .map((e) => ({
      name: e.name,
      path: e.relativePath,
      children: collectFolders(e.children),
    }));
}

function FolderPickerNode({
  folder,
  depth,
  selected,
  expanded,
  sourcePath,
  onSelect,
  onToggle,
}: {
  folder: FolderInfo;
  depth: number;
  selected: string;
  expanded: Set<string>;
  sourcePath: string;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}) {
  const isSource = folder.path === sourcePath;
  const isChildOfSource = folder.path.startsWith(sourcePath + "/");
  const isDisabled = isSource || isChildOfSource;
  const isExpanded = expanded.has(folder.path);
  const isActive = selected === folder.path;

  return (
    <>
      <button
        type="button"
        className={`flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${isActive ? "bg-[#e8f6f2] text-[#006f6b] font-semibold" : isDisabled ? "text-stone-300 cursor-not-allowed" : "text-stone-700 hover:bg-stone-50"}`}
        style={{ paddingLeft: `${0.5 + (depth + 1) * 0.75}rem` }}
        onClick={() => {
          if (isDisabled) return;
          onSelect(folder.path);
        }}
        disabled={isDisabled}
      >
        {folder.children.length > 0 && (
          <span
            className="shrink-0 cursor-pointer text-stone-400"
            onClick={(e) => { e.stopPropagation(); onToggle(folder.path); }}
          >
            {isExpanded ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
          </span>
        )}
        <FolderIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{folder.name}</span>
      </button>
      {isExpanded && folder.children.map((child) => (
        <FolderPickerNode
          key={child.path}
          folder={child}
          depth={depth + 1}
          selected={selected}
          expanded={expanded}
          sourcePath={sourcePath}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}
