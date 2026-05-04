import { useCallback, useRef } from "react";
import type { KeyboardEvent } from "react";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { PaletteModal } from "./PaletteModal";

export function CreateNoteDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const queryRef = useRef("");

  const handleCreate = useCallback(() => {
    const trimmed = queryRef.current.trim();
    if (!trimmed) return;
    dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: false });
    fs.createDocument(trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`);
  }, [dispatch, fs]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleCreate();
    }
  }, [handleCreate]);

  return (
    <PaletteModal
      open={state.createNoteDialogOpen}
      onClose={() => dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: false })}
      ariaLabel="Create new note"
      inputPlaceholder="Note name..."
      inputAriaLabel="Note name"
      onKeyDown={handleKeyDown}
    >
      {(query) => {
        queryRef.current = query;
        const trimmed = query.trim();
        return (
          <div className="space-y-2 p-2">
            <button
              className="command-row"
              type="button"
              disabled={!trimmed}
              onClick={handleCreate}
            >
              <span className="min-w-0">
                <span className="block font-semibold">
                  {trimmed ? `Create "${trimmed}"` : "Enter a note name"}
                </span>
                <span className="block text-xs text-stone-500">
                  {trimmed.endsWith(".md") ? "Markdown file" : "Will add .md extension"}
                </span>
              </span>
              <span className="shrink-0 text-xs text-stone-500">Enter</span>
            </button>
          </div>
        );
      }}
    </PaletteModal>
  );
}
