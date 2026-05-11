import { useAppDispatch, useAppState } from "../../app/AppState";
import { useCloudSync } from "../../hooks";
import { useConfirm } from "./ConfirmDialogContext";
import type { CloudWorkspace } from "../../lib/types";
import { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { CloudArrowUpIcon, LinkSlashIcon, XMarkIcon } from "@heroicons/react/24/outline";

export function AccountDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const sync = useCloudSync();
  const confirm = useConfirm();
  const [activeSection, setActiveSection] = useState<"account" | "workspace">(state.accountDialogSection);
  const [pendingWorkspaceSync, setPendingWorkspaceSync] = useState(false);

  useEffect(() => {
    if (state.accountDialogOpen) setActiveSection(state.accountDialogSection);
  }, [state.accountDialogOpen, state.accountDialogSection]);

  useEffect(() => {
    if (!pendingWorkspaceSync || !state.syncToken || !state.workspace) return;
    setPendingWorkspaceSync(false);
    void sync.autoCreateAndBindWorkspace();
  }, [pendingWorkspaceSync, state.syncToken, state.workspace, sync]);

  const displaySiteUrl = state.syncSiteUrl.replace("/@", "/u/");
  const currentVaultBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const currentVaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const isLocalMode = state.workspace && currentVaultSettings?.cloudSyncEnabled === false;
  const activeVaultBinding = isLocalMode ? null : currentVaultBinding;
  const canSyncCurrentVault = Boolean(state.workspace && state.syncToken && !isLocalMode);

  const bindWorkspace = async (ws: CloudWorkspace) => {
    if (!state.workspace) return;
    if (state.isDirty) {
      const confirmed = await confirm(
        "You have unsaved changes. Switching cloud workspace before saving may cause conflicts.\n\nContinue anyway?",
        { title: "Unsaved changes" },
      );
      if (!confirmed) return;
    }
    try {
      await sync.bindCurrentVaultToWorkspace(ws);
    } catch (error) {
      if (String(error).includes("UNPUSHED_CHANGES")) return;
      dispatch({ type: "SET_STATUS", message: String(error) });
    }
  };

  const disconnectCurrentVault = async () => {
    if (!currentVaultBinding) return;
    const confirmed = await confirm(
      `Disconnect "${currentVaultBinding.workspaceName}" from this vault?\n\nLocal files will stay on disk. Cloud data and workspace membership are not changed.`,
      { title: "Disconnect workspace" },
    );
    if (!confirmed) return;
    await sync.disconnectWorkspace();
  };

  const startWorkspaceSync = async () => {
    if (!state.syncToken) {
      setPendingWorkspaceSync(true);
      await sync.startBrowserOAuth();
      return;
    }
    await sync.autoCreateAndBindWorkspace();
  };

  return (
    <Dialog open={state.accountDialogOpen} onClose={() => dispatch({ type: "SET_ACCOUNT_DIALOG", open: false })} className="modal-backdrop">
      <DialogPanel className="command-modal flex h-[min(720px,92vh)] max-w-5xl flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] bg-white/70 px-5 py-4">
          <div>
            <DialogTitle className="text-2xl font-semibold text-stone-950">Settings</DialogTitle>
            <p className="mt-1 text-xs text-[#6b7773]">
              {state.syncToken
                ? `Connected as ${state.syncUsername || "your account"}. Sync vaults with cloud workspaces.`
                : state.oauthUserCode
                  ? `Waiting for browser authorization (code ${state.oauthUserCode})...`
                  : "Connect in the browser. Desktop never asks for your password."}
            </p>
          </div>
          <button className="subtle-button aspect-square px-0" type="button" aria-label="Close account dialog" title="Close" onClick={() => dispatch({ type: "SET_ACCOUNT_DIALOG", open: false })}>
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border-r border-black/[0.04] bg-[#f7faf8] p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-stone-500">Account</p>
            <SettingsNavButton active={activeSection === "account"} onClick={() => setActiveSection("account")} label="Profile" />
            <p className="mb-2 mt-5 text-xs font-semibold uppercase text-stone-500">Cloud workspace</p>
            <SettingsNavButton active={activeSection === "workspace"} onClick={() => setActiveSection("workspace")} label="General" />
          </aside>

          <main className="min-h-0 overflow-y-auto p-6">
            {activeSection === "account" && (
              <section className="max-w-2xl">
                <h2 className="text-2xl font-semibold text-stone-950">Profile</h2>
                <p className="mt-1 text-sm text-[#6b7773]">Connect desktop sync through the browser and choose the service endpoint.</p>
                <div className="mt-6 space-y-3">
                  <input
                    className="sync-input"
                    value={state.serviceUrl}
                    onChange={(e) => dispatch({ type: "SET_SERVICE_URL", url: e.target.value })}
                    aria-label="Account service URL"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {!state.syncToken ? (
                      <button className="sidebar-action" type="button" onClick={() => sync.startBrowserOAuth()}>Connect in browser</button>
                    ) : (
                      <button className="sidebar-action" type="button" onClick={() => sync.disconnectAccount()}>Disconnect</button>
                    )}
                    <button
                      id="account-sync"
                      className="sidebar-action"
                      type="button"
                      disabled={!canSyncCurrentVault || state.isLoading}
                      onClick={() => activeVaultBinding ? sync.syncWorkspaceToWeb() : sync.autoCreateAndBindWorkspace()}
                      title={isLocalMode ? "Enable cloud sync for this vault first" : "Sync current vault"}
                    >
                      {activeVaultBinding ? "Sync now" : "Start sync"}
                    </button>
                  </div>
                  {displaySiteUrl && (
                    <a id="account-site-link" className="block truncate text-xs font-semibold text-teal-700" href={displaySiteUrl} target="_blank" rel="noreferrer">
                      Open site: {displaySiteUrl}
                    </a>
                  )}
                </div>
              </section>
            )}

            {activeSection === "workspace" && (
              <section className="max-w-3xl">
                <h2 className="text-2xl font-semibold text-stone-950">General</h2>
                <p className="mt-1 text-sm text-[#6b7773]">Bind the current local vault to one cloud workspace.</p>
                {state.workspace && (
                  <div className="mt-6 rounded-2xl border border-white/80 bg-white/80 p-4 text-xs shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900">Current vault</p>
                        <p className="mt-1 truncate text-stone-500">{state.workspace.rootPath}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 font-semibold ${activeVaultBinding ? "bg-teal-50 text-teal-700" : "bg-stone-100 text-stone-600"}`}>
                        {activeVaultBinding ? "Cloud sync" : "Local mode"}
                      </span>
                    </div>
                    <p className="mt-2 text-stone-600">
                      {activeVaultBinding
                        ? `Bound to ${activeVaultBinding.workspaceName}. Sync will push and pull this vault.`
                        : isLocalMode
                          ? "This vault is local-only. You can keep working without cloud sync or enable it below."
                          : "Not bound to a cloud workspace yet. Binding starts bidirectional sync for this vault."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeVaultBinding && (
                        <>
                          <button className="toolbar-button toolbar-button-primary" type="button" disabled={state.isLoading} onClick={() => sync.syncWorkspaceToWeb()} title="Sync now">
                            <CloudArrowUpIcon className="h-4 w-4" />
                            Sync now
                          </button>
                          <button className="toolbar-button" type="button" onClick={disconnectCurrentVault} title="Disconnect cloud sync">
                            <LinkSlashIcon className="h-4 w-4" />
                            Disconnect
                          </button>
                        </>
                      )}
                      {!activeVaultBinding && (
                        <button className="toolbar-button toolbar-button-primary" type="button" disabled={state.isLoading} onClick={startWorkspaceSync} title={isLocalMode ? "Enable cloud sync" : "Start cloud sync"}>
                          <CloudArrowUpIcon className="h-4 w-4" />
                          {isLocalMode ? "Enable cloud sync" : "Start sync"}
                        </button>
                      )}
                    </div>
                    {pendingWorkspaceSync && !state.syncToken && (
                      <p className="mt-3 text-xs text-teal-700">Browser authorization is open. Sync will continue after sign-in completes.</p>
                    )}
                  </div>
                )}
                <div className="mt-6">
                  <p className="mb-2 text-xs font-semibold uppercase text-stone-500">Cloud workspaces</p>
                  <div id="account-workspace-list" className="space-y-1">
                    {!state.syncToken ? (
                      <p className="text-xs text-stone-500">Connect to load workspaces.</p>
                    ) : state.cloudWorkspaces.length === 0 ? (
                      <p className="text-xs text-stone-500">No cloud workspaces yet. Sync this vault to create one.</p>
                    ) : (
                      state.cloudWorkspaces.map((ws) => {
                        const isBound = activeVaultBinding?.workspaceId === ws.id;
                        const workspaceName = (ws.name || ws.slug || "Untitled workspace").replace(/^:/, "");
                        return (
                        <button key={ws.id} className={`workspace-row ${isBound && !isLocalMode ? "workspace-row-bound" : ""}`} type="button" onClick={() => bindWorkspace(ws)}>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{workspaceName}</span>
                            <span className="block truncate text-xs text-stone-500">{ws.documentCount ?? 0} documents - {formatBytes(ws.storageBudgetBytes)} budget</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">{isBound && !isLocalMode ? "Bound" : ws.role}</span>
                        </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            )}


          </main>
        </div>
      </DialogPanel>
    </Dialog>
  );
}

function SettingsNavButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition ${active ? "bg-white font-semibold text-[#006f6b] shadow-sm shadow-emerald-950/5 ring-1 ring-[#008884]/10" : "text-stone-600 hover:bg-white/80 hover:text-stone-950"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function formatBytes(bytes = 0) {
  if (!bytes) return "No";
  if (bytes >= 1024 * 1024 * 1024) return `${Math.round(bytes / 1024 / 1024 / 1024)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
