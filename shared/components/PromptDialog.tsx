import { useState, useCallback } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";

export interface PromptDialogProps {
  open: boolean;
  title: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export function PromptDialog({
  open,
  title,
  defaultValue = "",
  placeholder,
  confirmLabel = t`OK`,
  onConfirm,
  onClose,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState("");

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(t`Please enter a value.`);
      return;
    }
    onConfirm(trimmed);
    setValue("");
    setError("");
  };

  const handleClose = () => {
    setValue("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-[120]">
      <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-brand-dark" />
            {title}
          </DialogTitle>
          <input
            className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            value={value}
            placeholder={placeholder}
            onChange={(e) => { setValue(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleConfirm(); }}
            autoFocus
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
              onClick={handleClose}
            >
              <Trans>Cancel</Trans>
            </button>
            <button
              type="button"
              className="rounded-lg bg-brand-dark px-3 py-1.5 text-sm font-medium text-white hover:bg-brand"
              onClick={() => void handleConfirm()}
              disabled={!value.trim()}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export function usePromptDialog() {
  const [request, setRequest] = useState<{
    title: string;
    defaultValue: string;
    resolve: (value: string | null) => void;
  } | null>(null);

  const prompt = useCallback((title: string, defaultValue = ""): Promise<string | null> => {
    return new Promise((resolve) => {
      setRequest({ title, defaultValue, resolve });
    });
  }, []);

  const handleConfirm = useCallback((value: string) => {
    request?.resolve(value);
    setRequest(null);
  }, [request]);

  const handleClose = useCallback(() => {
    request?.resolve(null);
    setRequest(null);
  }, [request]);

  const PromptDialogComponent = useCallback(() => {
    if (!request) return null;
    return (
      <PromptDialog
        open={true}
        title={request.title}
        defaultValue={request.defaultValue}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    );
  }, [request, handleConfirm, handleClose]);

  return { PromptDialog: PromptDialogComponent, prompt } as const;
}
