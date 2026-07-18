import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FolderOpenIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { tauri } from "../../lib/tauri";

export function VaultProviderBanner() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const status = state.vaultProviderStatus;
  const provider = status?.provider;
  const isExternal = provider?.kind === "externalMirror";

  useEffect(() => {
    if (!isExternal || !tauri.isAvailable) return;
    const refresh = () => { void fs.refreshVaultProvider(); };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    const unlisten = listen("vault-provider-changed", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      void unlisten.then((stop) => stop());
    };
  }, [fs.refreshVaultProvider, isExternal]);

  if (!isExternal || !provider || !status) return null;

  const needsAccess = provider.accessState !== "ready";
  const hasConflicts = state.externalVaultConflicts.length > 0;
  const tone = needsAccess || status.pendingWriteBack || hasConflicts ? "amber" : "green";
  const message = needsAccess
    ? provider.accessState === "sourceUnavailable"
      ? <Trans>The selected folder is unavailable. Choose it again to continue.</Trans>
      : <Trans>Folder access is required. Choose this vault again to continue.</Trans>
    : status.pendingWriteBack
      ? <Trans>An interrupted change is ready to finish safely.</Trans>
      : hasConflicts
        ? <Trans>External changes need your choice before syncing can continue.</Trans>
        : <Trans>Changes are synced with the selected device folder.</Trans>;

  return (
    <section
      id="external-vault-status"
      className={`flex min-w-0 items-center gap-3 border-b px-4 py-2.5 text-sm ${
        tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-emerald-100 bg-emerald-50/80 text-emerald-950"
      }`}
      aria-live="polite"
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
        {tone === "amber" ? <ExclamationTriangleIcon className="h-4.5 w-4.5" /> : <FolderOpenIcon className="h-4.5 w-4.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{provider.displayName}</span>
        <span className="block truncate text-xs opacity-75">{message}</span>
      </span>
      {hasConflicts && (
        <button
          type="button"
          className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-200"
          title={t`Resolve external vault conflicts`}
          aria-label={t`Resolve external vault conflicts`}
          onClick={() => dispatch({ type: "SET_EXTERNAL_VAULT_CONFLICT_DIALOG", open: true })}
        >
          {state.externalVaultConflicts.length} <Trans>conflicts</Trans>
        </button>
      )}
      {needsAccess ? (
        <button
          type="button"
          title="Choose folder again"
          aria-label="Choose folder again"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-700 text-white transition hover:bg-amber-800 disabled:opacity-50"
          disabled={state.isLoading}
          onClick={() => { void fs.reauthorizeExternalVault(); }}
        >
          <KeyIcon className="h-4.5 w-4.5" />
        </button>
      ) : (
        <button
          type="button"
          title={status.pendingWriteBack ? "Finish interrupted changes" : "Check external changes"}
          aria-label={status.pendingWriteBack ? "Finish interrupted changes" : "Check external changes"}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition disabled:opacity-50 ${tone === "amber" ? "bg-amber-700 text-white hover:bg-amber-800" : "bg-white text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"}`}
          disabled={state.isLoading || state.isDirty}
          onClick={() => { void fs.reconcileExternalVault(); }}
        >
          {status.pendingWriteBack ? <CheckCircleIcon className="h-4.5 w-4.5" /> : <ArrowPathIcon className="h-4.5 w-4.5" />}
        </button>
      )}
    </section>
  );
}
