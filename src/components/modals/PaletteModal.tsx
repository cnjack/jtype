import { useState, useEffect, type ReactNode, type KeyboardEvent } from "react";

interface PaletteModalProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  inputPlaceholder: string;
  inputAriaLabel: string;
  resultsId?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  children: (query: string) => ReactNode;
}

export function PaletteModal({ open, onClose, ariaLabel, inputPlaceholder, inputAriaLabel, resultsId, onKeyDown, children }: PaletteModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={ariaLabel} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="command-modal">
        <input
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
      </div>
    </div>
  );
}
