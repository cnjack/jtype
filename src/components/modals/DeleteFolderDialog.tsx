import { useEffect, useState } from "react";
import { Trans } from "@lingui/react/macro";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useAppState } from "../../app/AppState";
import { tauri } from "../../lib/tauri";
import { useFileSystem } from "../../hooks";
import type { FolderContentsSummary } from "../../lib/types";

export function DeleteFolderDialog({
  open,
  onClose,
  folderPath,
  folderName,
}: {
  open: boolean;
  onClose: () => void;
  folderPath: string;
  folderName: string;
}) {
  const state = useAppState();
  const fs = useFileSystem();
  const [summary, setSummary] = useState<FolderContentsSummary | null>(null);
  const [mode, setMode] = useState<"trash" | "keep">("trash");

  useEffect(() => {
    if (!open || !state.workspace) return;
    void (async () => {
      try {
        const s = await tauri.listFolderContents(state.workspace!.rootPath, folderPath);
        setSummary(s);
      } catch {
        setSummary(null);
      }
    })();
  }, [open, folderPath, state.workspace]);

  const handleDelete = async () => {
    if (!state.workspace) return;
    const softDelete = mode === "trash";
    await fs.deleteFolder(folderPath, softDelete, true);
    onClose();
  };

  const isEmpty = summary && summary.totalDocuments === 0 && summary.totalSubfolders === 0;

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-stone-950/25 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-xl border border-white/70 bg-[#fbfdfb] p-6 shadow-[0_25px_50px_-12px_rgb(28_25_23/0.2)]">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <TrashIcon className="h-5 w-5 text-red-600" />
            <Trans>Delete Folder</Trans>
          </DialogTitle>
          <p className="mt-2 text-sm text-stone-600">
            <Trans>Folder <span className="font-semibold">"{folderName}"</span></Trans>
          </p>
          {summary && !isEmpty && (
            <div className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
              <p><Trans>📁 {summary.totalSubfolders} subfolder{summary.totalSubfolders !== 1 ? "s" : ""}</Trans></p>
              <p><Trans>📄 {summary.totalDocuments} document{summary.totalDocuments !== 1 ? "s" : ""}</Trans></p>
            </div>
          )}
          {isEmpty ? (
            <p className="mt-3 text-sm text-stone-500"><Trans>This folder is empty.</Trans></p>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 rounded-lg border border-stone-200 p-2.5 text-sm hover:bg-stone-50 cursor-pointer">
                <input type="radio" name="delete-mode" checked={mode === "trash"} onChange={() => setMode("trash")} className="accent-[#006f6b]" />
                <span><Trans>Delete folder and contents (move to trash)</Trans></span>
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-stone-200 p-2.5 text-sm hover:bg-stone-50 cursor-pointer">
                <input type="radio" name="delete-mode" checked={mode === "keep"} onChange={() => setMode("keep")} className="accent-[#006f6b]" />
                <span><Trans>Delete folder only (keep documents in parent)</Trans></span>
              </label>
            </div>
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
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              onClick={() => void handleDelete()}
            >
              <Trans>Delete</Trans>
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
