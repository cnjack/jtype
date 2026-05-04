import { useEffect } from "react";
import { useAppDispatch, useAppState } from "../app/AppState";

const shortcuts: Array<{ ctrl?: boolean; shift?: boolean; key: string; action: string }> = [
  { ctrl: true, shift: true, key: "p", action: "commandPalette" },
  { ctrl: true, key: "o", action: "quickSwitcher" },
  { ctrl: true, key: "s", action: "file.save" },
  { ctrl: true, key: "r", action: "view.preview" },
  { ctrl: true, key: "4", action: "view.split" },
  { ctrl: true, shift: true, key: "t", action: "insert.table" },
  { ctrl: true, key: "b", action: "editor.bold" },
  { ctrl: true, key: "i", action: "editor.italic" },
  { ctrl: true, key: "k", action: "editor.link" },
  { key: "F2", action: "file.rename" },
];

export function useKeyboardShortcuts(onAction: (action: string) => void) {
  const dispatch = useAppDispatch();
  const state = useAppState();

  useEffect(() => {
    function handler(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      if (event.key === "Escape") {
        dispatch({ type: "SET_COMMAND_PALETTE", open: false });
        dispatch({ type: "SET_QUICK_SWITCHER", open: false });
        dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: false });
        dispatch({ type: "SET_ACCOUNT_DIALOG", open: false });
        dispatch({ type: "SET_CONTEXT_MENU", menu: null });
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        if (ctrlMatch && shiftMatch && (shortcut.key.toLowerCase() === key || event.key === shortcut.key)) {
          event.preventDefault();
          if (shortcut.action === "commandPalette") {
            dispatch({ type: "SET_COMMAND_PALETTE", open: true });
          } else if (shortcut.action === "quickSwitcher") {
            dispatch({ type: "SET_QUICK_SWITCHER", open: true });
          } else {
            onAction(shortcut.action);
          }
          return;
        }
      }

      if (state.quickSwitcherOpen && event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        onAction("quickSwitcher.create");
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [dispatch, onAction, state.quickSwitcherOpen]);
}
