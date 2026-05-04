import { useAppDispatch, useAppState } from "../../app/AppState";
import { useCloudSync } from "../../hooks";
import type { CloudWorkspace } from "../../lib/types";
import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

export function AccountDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const sync = useCloudSync();
  const [activeSection, setActiveSection] = useState<"account" | "workspace">(state.accountDialogSection);

  const displaySiteUrl = state.syncSiteUrl.replace("/@", "/u/");
  const currentVaultBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;

  const bindWorkspace = (ws: CloudWorkspace) => {
    if (!state.workspace) return;
    const workspaceName = (ws.name || ws.slug || "Untitled workspace").replace(/^:/, "");
    const binding = {
      workspaceId: ws.id,
      workspaceName,
      workspaceSlug: ws.slug,
      localVaultPath: state.workspace.rootPath,
      lastPulledClock: 0,
    };
    const existing = state.vaultBindings.filter((b) => b.workspaceId !== ws.id && b.localVaultPath !== state.workspace?.rootPath);
    const nextBindings = [...existing, binding];
    dispatch({ type: "SET_VAULT_BINDINGS", bindings: nextBindings });
    if ((window as unknown as { __VAULT_BINDINGS__?: unknown[] }).__VAULT_BINDINGS__) {
      (window as unknown as { __VAULT_BINDINGS__: unknown[] }).__VAULT_BINDINGS__ = nextBindings;
    }
    dispatch({ type: "SET_STATUS", message: `Bound "${workspaceName}" to current vault.` });
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
          <button className="subtle-button" type="button" aria-label="Close account dialog" onClick={() => dispatch({ type: "SET_ACCOUNT_DIALOG", open: false })}>
            Close
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
                      disabled={!state.workspace || !state.syncToken || state.isLoading}
                      onClick={() => sync.syncWorkspaceToWeb()}
                    >
                      Sync now
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
                    <p className="font-semibold text-stone-900">Current vault</p>
                    <p className="mt-1 truncate text-stone-500">{state.workspace.rootPath}</p>
                    <p className="mt-2 text-stone-600">
                      {currentVaultBinding
                        ? `Bound to ${currentVaultBinding.workspaceName}. Sync will push and pull this vault.`
                        : "Not bound to a cloud workspace yet. Binding starts bidirectional sync for this vault."}
                    </p>
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
                        const isBound = currentVaultBinding?.workspaceId === ws.id;
                        const workspaceName = (ws.name || ws.slug || "Untitled workspace").replace(/^:/, "");
                        return (
                        <button key={ws.id} className={`workspace-row ${isBound ? "workspace-row-bound" : ""}`} type="button" onClick={() => bindWorkspace(ws)}>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{workspaceName}</span>
                            <span className="block truncate text-xs text-stone-500">{ws.documentCount ?? 0} documents - {formatBytes(ws.storageBudgetBytes)} budget</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">{isBound ? "Bound" : ws.role}</span>
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
