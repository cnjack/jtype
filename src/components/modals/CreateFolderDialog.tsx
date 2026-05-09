import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { FolderPlusIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";

export function CreateFolderDialog({
  open,
  onClose,
  parentPath,
}: {
  open: boolean;
  onClose: () => void;
  parentPath: string;
}) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!state.workspace || !name.trim()) return;
    const folderRelativePath = parentPath ? `${parentPath}/${name.trim()}` : name.trim();
    try {
      await fs.createFolder(folderRelativePath);
      dispatch({ type: "TOGGLE_EXPAND_FOLDER", folderPath: parentPath || folderRelativePath });
      setName("");
      setError("");
      onClose();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <FolderPlusIcon className="h-5 w-5 text-[#006f6b]" />
            New Folder
          </DialogTitle>
          {parentPath && (
            <p className="mt-1 text-xs text-stone-500">in {parentPath}/</p>
          )}
          <input
            className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#008884] focus:outline-none focus:ring-1 focus:ring-[#008884]"
            placeholder="Folder name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); }}
            autoFocus
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
              onClick={() => { setName(""); setError(""); onClose(); }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-[#006f6b] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#005854]"
              onClick={() => void handleCreate()}
              disabled={!name.trim()}
            >
              Create
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
