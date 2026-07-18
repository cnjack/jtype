import { useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useRuntimeCapabilities } from "../../app/RuntimeCapabilities";
import { useFileSystem } from "../../hooks";
import type { ExternalVaultReconcileConflictReason } from "../../lib/types";

export function ExternalVaultConflictDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const capabilities = useRuntimeCapabilities();
  const fs = useFileSystem();
  const [resolvingPath, setResolvingPath] = useState("");
  const [error, setError] = useState("");
  const provider = state.vaultProviderStatus?.provider;
  const canKeepJtype = Boolean(provider?.accessState === "ready" && provider.capabilities.canWrite);
  const compact = capabilities.prefersCompactLayout;

  const close = () => dispatch({ type: "SET_EXTERNAL_VAULT_CONFLICT_DIALOG", open: false });
  const resolve = async (relativePath: string, resolution: "useSource" | "useJtype") => {
    setResolvingPath(relativePath);
    setError("");
    try {
      await fs.resolveExternalVaultConflict(relativePath, resolution);
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setResolvingPath("");
    }
  };

  return (
    <Dialog
      open={state.externalVaultConflictDialogOpen && state.externalVaultConflicts.length > 0}
      onClose={close}
      className="relative z-50"
    >
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className={`fixed inset-0 flex ${compact ? "items-end" : "items-center justify-center p-4"}`}>
        <DialogPanel
          id="external-vault-conflict-dialog"
          data-compact={compact ? "true" : "false"}
          className={`flex w-full flex-col bg-white shadow-2xl ${
            compact ? "max-h-[92dvh] rounded-t-2xl" : "max-h-[80vh] max-w-3xl rounded-xl"
          }`}
        >
          <div
            className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-5 py-4"
            style={compact ? { paddingTop: "max(1rem, env(safe-area-inset-top))" } : undefined}
          >
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-stone-950">
                <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-600" />
                <Trans>External vault conflicts</Trans>
              </DialogTitle>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                <Trans>Choose which version to keep for each path. JType will never overwrite both versions silently.</Trans>
              </p>
            </div>
            <button
              type="button"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
              title={t`Close`}
              aria-label={t`Close`}
              onClick={close}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {state.externalVaultConflicts.map((conflict) => {
              const resolving = resolvingPath === conflict.relativePath;
              return (
                <section
                  key={`${conflict.relativePath}:${conflict.reason}`}
                  className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"
                >
                  <p className="break-all text-sm font-semibold text-stone-950">{conflict.relativePath}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-600">{conflictReason(conflict.reason)}</p>
                  <div className={`mt-3 grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
                      title={t`Keep device folder version`}
                      disabled={Boolean(resolvingPath)}
                      onClick={() => { void resolve(conflict.relativePath, "useSource"); }}
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <Trans>Keep device folder version</Trans>
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                      title={canKeepJtype ? t`Keep JType version` : t`The selected device folder is read-only`}
                      disabled={Boolean(resolvingPath) || !canKeepJtype}
                      onClick={() => { void resolve(conflict.relativePath, "useJtype"); }}
                    >
                      <ArrowUpTrayIcon className="h-4 w-4" />
                      {resolving ? <Trans>Resolving…</Trans> : <Trans>Keep JType version</Trans>}
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
          {error && <p className="shrink-0 border-t border-red-100 bg-red-50 px-5 py-3 text-xs text-red-700">{error}</p>}
          {compact && <div className="shrink-0" style={{ height: "env(safe-area-inset-bottom)" }} />}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function conflictReason(reason: ExternalVaultReconcileConflictReason) {
  switch (reason) {
    case "baselineRequired":
      return t`The device folder and JType mirror do not share a trusted baseline.`;
    case "sourceDeletedMirrorModified":
      return t`The path was deleted from the device folder but changed in JType.`;
    case "sourceModifiedMirrorDeleted":
      return t`The path changed in the device folder but was deleted in JType.`;
    case "sourceRemovedParentWithLocalChanges":
      return t`A device folder was removed while JType still has changed items inside it.`;
    case "unsafeTypeChange":
      return t`One version is a file and the other is a folder.`;
    default:
      return t`Both the device folder and JType changed this path.`;
  }
}
