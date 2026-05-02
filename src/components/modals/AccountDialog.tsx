import { useAppDispatch, useAppState } from "../../app/AppState";
import { useCloudSync } from "../../hooks";
import type { CloudWorkspace } from "../../lib/types";

export function AccountDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const sync = useCloudSync();

  if (!state.accountDialogOpen) return null;

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
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Account and sync"
      onClick={(e) => {
        if (e.target === e.currentTarget) dispatch({ type: "SET_ACCOUNT_DIALOG", open: false });
      }}
    >
      <div className="command-modal max-w-lg">
        <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] bg-white/70 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-stone-950">Account and Cloud</p>
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
        <div className="space-y-3 p-5">
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
              Sync
            </button>
          </div>

          {displaySiteUrl && (
            <a id="account-site-link" className="block truncate text-xs font-semibold text-teal-700" href={displaySiteUrl} target="_blank" rel="noreferrer">
              Open site: {displaySiteUrl}
            </a>
          )}

          {state.workspace && (
            <div className="rounded-2xl border border-white/80 bg-white/80 p-4 text-xs shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.03]">
              <p className="font-semibold text-stone-900">Current vault</p>
              <p className="mt-1 truncate text-stone-500">{state.workspace.rootPath}</p>
              <p className="mt-2 text-stone-600">
                {currentVaultBinding
                  ? `Bound to ${currentVaultBinding.workspaceName}. Sync will push and pull this vault.`
                  : "Not bound to a cloud workspace yet. Binding starts bidirectional sync for this vault."}
              </p>
            </div>
          )}

          <div>
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

          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-stone-500">Conflicts</p>
            <div id="account-conflict-list" className="space-y-1">
              {state.activeConflicts.length === 0 ? (
                <p className="text-xs text-stone-500">No conflicts.</p>
              ) : (
                state.activeConflicts.map((c) => (
                  <div key={c.conflictId} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">
                    <p className="font-semibold text-amber-900">{c.relativePath}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button className="sidebar-action" type="button" onClick={() => sync.resolveConflict(c.conflictId, "accept_local")}>Accept local</button>
                      <button className="sidebar-action" type="button" onClick={() => sync.resolveConflict(c.conflictId, "accept_cloud")}>Accept cloud</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes = 0) {
  if (!bytes) return "No";
  if (bytes >= 1024 * 1024 * 1024) return `${Math.round(bytes / 1024 / 1024 / 1024)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
