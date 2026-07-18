import { Trans, Plural } from "@lingui/react/macro";
import { useMemo } from "react";
import { isCurrentVaultReadOnly, useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { appStorage } from "../../lib/storage";
import { basename } from "../../lib/utils";
import { workspaceIndexFor } from "../../lib/workspaceIndex";
import { SyncPromptDialog } from "../modals/SyncPromptDialog";
import { useRuntimeCapabilities } from "../../app/RuntimeCapabilities";

export function VaultHome() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const capabilities = useRuntimeCapabilities();
  const documents = workspaceIndexFor(state.workspace?.entries).documents;
  const recentItems = useMemo(() => readRecentItems(), [state.currentPath]);
  const recentDocs = recentItems.filter((item) => item.kind === "file").slice(0, 4);
  const vaultName = state.workspace?.name ?? "Vault";
  const externalProvider = state.vaultProviderStatus?.provider.kind === "externalMirror"
    ? state.vaultProviderStatus.provider
    : null;
  const isReadOnly = isCurrentVaultReadOnly(state);
  const currentBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const vaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const shouldShowSyncPrompt = Boolean(
    state.workspace &&
    vaultSettings !== undefined &&
    !currentBinding &&
    (vaultSettings == null || vaultSettings.cloudSyncEnabled !== false) &&
    !vaultSettings?.syncDisabledPermanently &&
    shouldRemind(vaultSettings?.syncPromptDismissedAt),
  );

  return (
    <section id="vault-home" className="flex min-h-0 flex-col bg-[#fbfdfb]">
      <SyncPromptDialog open={shouldShowSyncPrompt} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={`mx-auto w-full max-w-6xl ${capabilities.prefersCompactLayout ? "px-5 py-7" : "px-10 py-12"}`}>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#008884]"><Trans>Vault ready</Trans></p>
            <h2 className={`${capabilities.prefersCompactLayout ? "text-3xl" : "text-4xl"} mt-4 break-words font-semibold tracking-[-0.035em] text-stone-950`}>{vaultName}</h2>
            {externalProvider ? (
              <p id="vault-home-external-note" className="mt-3 max-w-2xl text-sm leading-7 text-[#5f6d68]">
                <Trans>Choose a note or create a new one. Changes are kept in sync with the selected device folder.</Trans>
              </p>
            ) : capabilities.usesAppPrivateVault ? (
              <p id="vault-home-private-note" className="mt-3 max-w-2xl text-sm leading-7 text-[#5f6d68]">
                <Trans>Choose a note or create a new one. Stored privately by JType on this device.</Trans>
              </p>
            ) : (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f6d68]">
                <Trans>Choose a note or create a new one. This vault lives at <span className="font-mono text-stone-800">{state.workspace?.rootPath}</span>.</Trans>
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="toolbar-button toolbar-button-primary" type="button" disabled={isReadOnly} onClick={() => dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: true })}>
                <Trans>New Document</Trans>
              </button>
              <button className="toolbar-button" type="button" onClick={() => dispatch({ type: "SET_QUICK_SWITCHER", open: true })}>
                <Trans>Quick open</Trans>
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="panel-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-950"><Trans>Documents</Trans></p>
                <span className="text-xs text-[#6b7773]"><Plural value={documents.length} one="# Markdown file" other="# Markdown files" /></span>
              </div>
              <div className="space-y-1">
                {documents.length === 0 ? (
                  <div className="rounded-md border border-dashed border-stone-300 p-4">
                    <p className="text-sm font-semibold text-stone-800"><Trans>No notes yet.</Trans></p>
                    <p className="mt-1 text-sm text-stone-500"><Trans>Create your first Markdown note or drop files into this vault.</Trans></p>
                  </div>
                ) : (
                  documents.slice(0, 12).map((node) => (
                    <button key={node.path} type="button" className="command-row" onClick={() => fs.openMarkdownFile(node.path, node.relativePath)}>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{basename(node.name).replace(/\.(md|markdown|mdown|mkd)$/i, "")}</span>
                        <span className="block truncate text-xs text-stone-500">{node.relativePath}</span>
                      </span>
                      <span className="shrink-0 text-xs text-stone-500"><Trans>Markdown</Trans></span>
                    </button>
                  ))
                )}
              </div>
            </section>

            <aside className="space-y-5">
              <section className="panel-card p-5">
                <p className="text-sm font-semibold text-stone-950"><Trans>Recent</Trans></p>
                <div className="mt-3 space-y-1">
                  {recentDocs.length === 0 ? (
                    <p className="text-sm text-stone-500"><Trans>Open a note and it will appear here.</Trans></p>
                  ) : (
                    recentDocs.map((item) => (
                      <button key={item.path} type="button" className="tree-button text-sm" onClick={() => fs.openMarkdownFile(item.path)}>
                        <span className="text-stone-500"><Trans>Markdown file</Trans></span>
                        <span className="truncate font-semibold">{item.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

function shouldRemind(dismissedAt?: string | null) {
  if (!dismissedAt) return true;
  const timestamp = Date.parse(dismissedAt);
  if (!Number.isFinite(timestamp)) return true;
  return Date.now() - timestamp >= 7 * 24 * 60 * 60 * 1000;
}

import type { RecentItem } from "../../lib/types";

function readRecentItems(): RecentItem[] {
  return appStorage.get("recent", []);
}
