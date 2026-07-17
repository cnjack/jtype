import { useEffect, useRef } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useAppState } from "../../app/AppState";
import { Sidebar } from "./Sidebar";

type MobileSidebarDialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Compact navigation reuses the desktop Sidebar instead of maintaining a
 * second mobile file tree. Only the container changes from a grid column to a
 * Headless UI dialog.
 */
export function MobileSidebarDialog({ open, onClose }: MobileSidebarDialogProps) {
  const state = useAppState();
  const openedPathRef = useRef<string | null>(null);
  const openedVaultRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    openedPathRef.current = state.currentPath;
    openedVaultRef.current = state.workspace?.rootPath ?? null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (
      state.currentPath !== openedPathRef.current ||
      (state.workspace?.rootPath ?? null) !== openedVaultRef.current
    ) {
      onClose();
    }
  }, [open, onClose, state.currentPath, state.workspace?.rootPath]);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[80]">
      <DialogBackdrop transition className="fixed inset-0 bg-stone-950/30 backdrop-blur-sm transition data-[closed]:opacity-0" />
      <div className="fixed inset-0 flex justify-start overflow-hidden">
        <DialogPanel
          id="mobile-vault-navigation"
          transition
          className="flex h-full w-[min(90vw,22rem)] flex-col bg-[#f5f8f6] shadow-2xl shadow-stone-950/25 transition duration-200 data-[closed]:-translate-x-full"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center justify-between px-5 py-2">
            <DialogTitle className="text-sm font-semibold text-stone-950"><Trans>Documents</Trans></DialogTitle>
            <button className="toolbar-button aspect-square px-0" type="button" title={t`Close`} onClick={onClose}>
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 [&>#workspace-sidebar]:h-full">
            <Sidebar />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
