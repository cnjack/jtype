import { useState, useEffect, type ReactNode, type KeyboardEvent } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

interface PaletteModalProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  inputPlaceholder: string;
  inputAriaLabel: string;
  inputId?: string;
  resultsId?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  children: (query: string) => ReactNode;
}

export function PaletteModal({ open, onClose, ariaLabel, inputPlaceholder, inputAriaLabel, inputId, resultsId, onKeyDown, children }: PaletteModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} className="modal-backdrop">
      <DialogPanel className="command-modal">
        <DialogTitle className="sr-only">{ariaLabel}</DialogTitle>
        <input
          id={inputId}
          className="command-input"
          placeholder={inputPlaceholder}
          aria-label={inputAriaLabel}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
        />
        <div id={resultsId} className="max-h-[420px] overflow-auto p-2">
          {children(query)}
        </div>
      </DialogPanel>
    </Dialog>
  );
}
