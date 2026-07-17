import { useState, useCallback } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { t } from "@lingui/core/macro";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = t`Confirm`,
  cancelLabel = t`Cancel`,
  danger = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-[120]">
      <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <ExclamationTriangleIcon className={`h-5 w-5 ${danger ? "text-red-600" : "text-amber-500"}`} />
            {title}
          </DialogTitle>
          <p className="mt-3 text-sm text-stone-600 whitespace-pre-line">{message}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
              onClick={onClose}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-brand-dark hover:bg-brand"}`}
              onClick={() => void onConfirm()}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export interface ConfirmDialogOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function useConfirmDialog() {
  const [request, setRequest] = useState<{
    message: string;
    options: ConfirmDialogOptions;
    resolve: (confirmed: boolean) => void;
  } | null>(null);

  const confirm = useCallback((message: string, options: ConfirmDialogOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      setRequest({ message, options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    request?.resolve(true);
    setRequest(null);
  }, [request]);

  const handleCancel = useCallback(() => {
    request?.resolve(false);
    setRequest(null);
  }, [request]);

  const ConfirmDialogComponent = useCallback(() => {
    if (!request) return null;
    const { message, options } = request;
    return (
      <ConfirmDialog
        open={true}
        title={options.title ?? t`Confirm`}
        message={message}
        confirmLabel={options.confirmLabel ?? t`OK`}
        cancelLabel={options.cancelLabel ?? t`Cancel`}
        danger={options.destructive}
        onConfirm={handleConfirm}
        onClose={handleCancel}
      />
    );
  }, [request, handleConfirm, handleCancel]);

  return { ConfirmDialog: ConfirmDialogComponent, confirm } as const;
}
