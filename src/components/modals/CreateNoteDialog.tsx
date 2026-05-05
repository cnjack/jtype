import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { DocumentPlusIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";

export function CreateNoteDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const [value, setValue] = useState("");

  const handleCreate = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: false });
    fs.createDocument(trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`);
    setValue("");
  };

  const handleClose = () => {
    dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: false });
    setValue("");
  };

  return (
    <Dialog open={state.createNoteDialogOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <DocumentPlusIcon className="h-5 w-5 text-[#006f6b]" />
            New Document
          </DialogTitle>
          <input
            className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#008884] focus:outline-none focus:ring-1 focus:ring-[#008884]"
            placeholder="Note name..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            autoFocus
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-[#006f6b] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#005854]"
              onClick={handleCreate}
              disabled={!value.trim()}
            >
              Create
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
