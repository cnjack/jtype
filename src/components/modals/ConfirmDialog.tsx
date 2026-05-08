import { useState, useCallback } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export interface ConfirmDialogOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmRequest {
  message: string;
  options: ConfirmDialogOptions;
  resolve: (confirmed: boolean) => void;
}

export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

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
    const title = options.title ?? "Confirm";
    const confirmLabel = options.confirmLabel ?? "OK";
    const cancelLabel = options.cancelLabel ?? "Cancel";
    const confirmClass = options.destructive
      ? "rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      : "rounded-lg bg-[#006f6b] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#005854]";

    return (
      <Dialog open={true} onClose={handleCancel} className="relative z-50">
        <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-stone-900">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              {title}
            </DialogTitle>
            <p className="mt-3 text-sm text-stone-600 whitespace-pre-line">{message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
                onClick={handleCancel}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={confirmClass}
                onClick={handleConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    );
  }, [request, handleConfirm, handleCancel]);

  return { ConfirmDialog: ConfirmDialogComponent, confirm } as const;
}
