import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useCloudSync } from "../../hooks";
import type { VaultSettings } from "../../lib/types";

type SyncPromptDialogProps = {
  open: boolean;
};

export function SyncPromptDialog({ open }: SyncPromptDialogProps) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const sync = useCloudSync();
  const [pendingStart, setPendingStart] = useState(false);
  const vaultName = state.workspace?.name ?? "this vault";
  const vaultPath = state.workspace?.rootPath ?? "";

  const laterSettings = useMemo<VaultSettings>(() => ({
    cloudSyncEnabled: true,
    syncPromptDismissedAt: new Date().toISOString(),
    syncDisabledPermanently: false,
  }), []);

  useEffect(() => {
    if (!pendingStart || !state.syncToken || !state.workspace) return;
    setPendingStart(false);
    void sync.autoCreateAndBindWorkspace();
  }, [pendingStart, state.syncToken, state.workspace, sync]);

  const saveSettings = async (settings: VaultSettings, message: string) => {
    await sync.saveCurrentVaultSettings(settings);
    dispatch({ type: "SET_STATUS", message });
  };

  const startSync = async () => {
    if (!state.syncToken) {
      setPendingStart(true);
      await sync.startBrowserOAuth();
      return;
    }
    await sync.autoCreateAndBindWorkspace();
  };

  return (
    <Dialog open={open} onClose={() => saveSettings(laterSettings, "Cloud sync reminder snoozed.")} className="modal-backdrop">
      <DialogPanel className="command-modal max-w-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            <CloudArrowUpIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-2xl font-semibold text-stone-950">Sync "{vaultName}" to cloud?</DialogTitle>
            <p className="mt-2 text-sm leading-6 text-[#5f6d68]">
              Back up this local vault to a cloud workspace, keep devices in sync, and open the same notes from the web.
            </p>
            {vaultPath && <p className="mt-2 truncate font-mono text-xs text-stone-500">{vaultPath}</p>}
          </div>
        </div>

        {pendingStart && !state.syncToken && (
          <div className="mt-5 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-800">
            Browser authorization is open. This sync will continue after sign-in completes.
          </div>
        )}

        <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <button className="toolbar-button toolbar-button-primary justify-center" type="button" disabled={state.isLoading} onClick={startSync}>
            Start sync
          </button>
          <button className="toolbar-button justify-center" type="button" onClick={() => saveSettings(laterSettings, "Cloud sync reminder snoozed.")}>
            Later
          </button>
          <button
            className="toolbar-button justify-center"
            type="button"
            onClick={() => saveSettings({
              cloudSyncEnabled: false,
              syncPromptDismissedAt: null,
              syncDisabledPermanently: true,
            }, "This vault is now local-only.")}
          >
            Local only
          </button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
