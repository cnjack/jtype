import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { t, Trans } from "@lingui/macro";
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
    <Dialog open={open} onClose={() => saveSettings(laterSettings, t`Cloud sync reminder snoozed.`)} className="relative z-50">
      <div className="fixed inset-0 bg-stone-950/25 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center px-4 py-6 sm:p-8">
        <DialogPanel className="w-full max-w-xl rounded-xl border border-white/70 bg-[#fbfdfb] p-5 shadow-2xl shadow-stone-900/20 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
              <CloudArrowUpIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold text-stone-950 sm:text-2xl"><Trans>Sync "{vaultName}" to cloud?</Trans></DialogTitle>
              <p className="mt-2 text-sm leading-6 text-[#5f6d68]">
                <Trans>Back up this local vault to a cloud workspace, keep devices in sync, and open the same notes from the web.</Trans>
              </p>
              {vaultPath && <p className="mt-2 truncate font-mono text-xs text-stone-500">{vaultPath}</p>}
            </div>
          </div>

          {pendingStart && !state.syncToken && (
            <div className="mt-5 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-800">
              <Trans>Browser authorization is open. This sync will continue after sign-in completes.</Trans>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:grid sm:grid-cols-[auto_auto_minmax(12rem,1fr)]">
            <button className="toolbar-button justify-center" type="button" onClick={() => saveSettings(laterSettings, t`Cloud sync reminder snoozed.`)}>
              <Trans>Later</Trans>
            </button>
            <button
              className="toolbar-button justify-center"
              type="button"
              onClick={() => saveSettings({
                cloudSyncEnabled: false,
                syncPromptDismissedAt: null,
                syncDisabledPermanently: true,
              }, t`This vault is now local-only.`)}
            >
              <Trans>Local only</Trans>
            </button>
            <button className="toolbar-button toolbar-button-primary justify-center" type="button" disabled={state.isLoading} onClick={startSync}>
              <Trans>Start sync</Trans>
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
