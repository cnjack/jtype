import { useAppDispatch, useAppState } from "../../app/AppState";
import { useCloudSync } from "../../hooks";
import { useConfirm } from "@shared/components/PromptDialogContext";
import type { CloudWorkspace } from "../../lib/types";
import { tauri, type CliStatus } from "../../lib/tauri";
import { DeviceAuthWaiting } from "./DeviceAuthWaiting";
import { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { CloudArrowUpIcon, CommandLineIcon, LinkSlashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useRuntimeCapabilities } from "../../app/RuntimeCapabilities";

export function AccountDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const sync = useCloudSync();
  const confirm = useConfirm();
  const capabilities = useRuntimeCapabilities();
  const [activeSection, setActiveSection] = useState<"account" | "workspace" | "cli">(state.accountDialogSection);
  const [pendingWorkspaceSync, setPendingWorkspaceSync] = useState(false);
  const [cli, setCli] = useState<CliStatus | null>(null);
  const [cliBusy, setCliBusy] = useState(false);
  const [cliError, setCliError] = useState<string | null>(null);

  useEffect(() => {
    if (state.accountDialogOpen) setActiveSection(state.accountDialogSection);
  }, [state.accountDialogOpen, state.accountDialogSection]);

  useEffect(() => {
    if (!capabilities.supportsCliInstall && activeSection === "cli") setActiveSection("account");
  }, [activeSection, capabilities.supportsCliInstall]);

  useEffect(() => {
    if (state.accountDialogOpen && activeSection === "cli" && capabilities.supportsCliInstall && tauri.isAvailable && !cli) {
      tauri.cliStatus().then(setCli).catch((e) => setCliError(String(e)));
    }
  }, [state.accountDialogOpen, activeSection, capabilities.supportsCliInstall, cli]);

  const toggleCli = async () => {
    setCliBusy(true);
    setCliError(null);
    try {
      setCli(cli?.installed ? await tauri.uninstallCli() : await tauri.installCli());
    } catch (e) {
      setCliError(String(e));
    } finally {
      setCliBusy(false);
    }
  };

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
        t`You have unsaved changes. Switching cloud workspace before saving may cause conflicts.\n\nContinue anyway?`,
        { title: t`Unsaved changes` },
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
      t`Disconnect "${currentVaultBinding.workspaceName}" from this vault?\n\nLocal files will stay on disk. Cloud data and workspace membership are not changed.`,
      { title: t`Disconnect workspace` },
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
            <DialogTitle className="text-2xl font-semibold text-stone-950"><Trans>Settings</Trans></DialogTitle>
            <p className="mt-1 text-xs text-[#6b7773]">
              {state.syncToken
                ? t`Connected as ${state.syncUsername || t`your account`}. Sync vaults with cloud workspaces.`
                : state.oauthUserCode
                  ? t`Waiting for browser authorization (code ${state.oauthUserCode})...`
                  : t`Connect in the browser. Desktop never asks for your password.`}
            </p>
          </div>
          <button className="subtle-button aspect-square px-0" type="button" aria-label={t`Close account dialog`} title={t`Close`} onClick={() => dispatch({ type: "SET_ACCOUNT_DIALOG", open: false })}>
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border-r border-black/[0.04] bg-[#f7faf8] p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-stone-500"><Trans>Account</Trans></p>
            <SettingsNavButton active={activeSection === "account"} onClick={() => setActiveSection("account")} label={t`Profile`} />
            <p className="mb-2 mt-5 text-xs font-semibold uppercase text-stone-500"><Trans>Cloud workspace</Trans></p>
            <SettingsNavButton active={activeSection === "workspace"} onClick={() => setActiveSection("workspace")} label={t`General`} />
            {capabilities.supportsCliInstall && (
              <>
                <p className="mb-2 mt-5 text-xs font-semibold uppercase text-stone-500"><Trans>Tools</Trans></p>
                <SettingsNavButton active={activeSection === "cli"} onClick={() => setActiveSection("cli")} label={t`Command line`} />
              </>
            )}
          </aside>

          <main className="min-h-0 overflow-y-auto p-6">
            {activeSection === "account" && (
              state.oauthUserCode && !state.syncToken ? (
                <DeviceAuthWaiting
                  userCode={state.oauthUserCode}
                  startedAt={state.oauthStartedAt}
                  onCancel={() => sync.cancelBrowserOAuth()}
                  onReopenBrowser={() => {
                    // If expired, start a fresh flow (new code); otherwise just reopen the same URL.
                    if (!state.oauthStartedAt) {
                      sync.startBrowserOAuth();
                    } else {
                      sync.reopenBrowser();
                    }
                  }}
                />
              ) : (
                <section className="max-w-2xl">
                  <h2 className="text-2xl font-semibold text-stone-950"><Trans>Profile</Trans></h2>
                  <p className="mt-1 text-sm text-[#6b7773]"><Trans>Connect desktop sync through the browser and choose the service endpoint.</Trans></p>
                  <div className="mt-6 space-y-3">
                    <input
                      className="sync-input"
                      value={state.serviceUrl}
                      onChange={(e) => dispatch({ type: "SET_SERVICE_URL", url: e.target.value })}
                      aria-label={t`Account service URL`}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {!state.syncToken ? (
                        <button className="sidebar-action" type="button" onClick={() => sync.startBrowserOAuth()}><Trans>Connect in browser</Trans></button>
                      ) : (
                        <button className="sidebar-action" type="button" onClick={() => sync.disconnectAccount()}><Trans>Disconnect</Trans></button>
                      )}
                      <button
                        id="account-sync"
                        className="sidebar-action"
                        type="button"
                        disabled={!canSyncCurrentVault || state.isLoading}
                        onClick={() => activeVaultBinding ? sync.syncWorkspaceToWeb() : sync.autoCreateAndBindWorkspace()}
                        title={isLocalMode ? t`Enable cloud sync for this vault first` : t`Sync current vault`}
                      >
                        {activeVaultBinding ? t`Sync now` : t`Start sync`}
                      </button>
                    </div>
                    {displaySiteUrl && (
                      <a id="account-site-link" className="block truncate text-xs font-semibold text-teal-700" href={displaySiteUrl} target="_blank" rel="noreferrer">
                        <Trans>Open site: {displaySiteUrl}</Trans>
                      </a>
                    )}
                  </div>
                </section>
              )
            )}

            {activeSection === "workspace" && (
              <section className="max-w-3xl">
                <h2 className="text-2xl font-semibold text-stone-950"><Trans>General</Trans></h2>
                <p className="mt-1 text-sm text-[#6b7773]"><Trans>Bind the current local vault to one cloud workspace.</Trans></p>
                {state.workspace && (
                  <div className="mt-6 rounded-2xl border border-white/80 bg-white/80 p-4 text-xs shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900"><Trans>Current vault</Trans></p>
                        <p className="mt-1 truncate text-stone-500">{state.workspace.rootPath}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 font-semibold ${activeVaultBinding ? "bg-teal-50 text-teal-700" : "bg-stone-100 text-stone-600"}`}>
                        {activeVaultBinding ? t`Cloud sync` : t`Local mode`}
                      </span>
                    </div>
                    <p className="mt-2 text-stone-600">
                      {activeVaultBinding
                        ? t`Bound to ${activeVaultBinding.workspaceName}. Sync will push and pull this vault.`
                        : isLocalMode
                          ? t`This vault is local-only. You can keep working without cloud sync or enable it below.`
                          : t`Not bound to a cloud workspace yet. Binding starts bidirectional sync for this vault.`}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeVaultBinding && (
                        <>
                          <button className="toolbar-button toolbar-button-primary" type="button" disabled={state.isLoading} onClick={() => sync.syncWorkspaceToWeb()} title={t`Sync now`}>
                            <CloudArrowUpIcon className="h-4 w-4" />
                            <Trans>Sync now</Trans>
                          </button>
                          <button className="toolbar-button" type="button" onClick={disconnectCurrentVault} title={t`Disconnect cloud sync`}>
                            <LinkSlashIcon className="h-4 w-4" />
                            <Trans>Disconnect</Trans>
                          </button>
                        </>
                      )}
                      {!activeVaultBinding && (
                        <button className="toolbar-button toolbar-button-primary" type="button" disabled={state.isLoading} onClick={startWorkspaceSync} title={isLocalMode ? t`Enable cloud sync` : t`Start cloud sync`}>
                          <CloudArrowUpIcon className="h-4 w-4" />
                          {isLocalMode ? t`Enable cloud sync` : t`Start sync`}
                        </button>
                      )}
                    </div>
                    {pendingWorkspaceSync && !state.syncToken && (
                      <p className="mt-3 text-xs text-teal-700"><Trans>Browser authorization is open. Sync will continue after sign-in completes.</Trans></p>
                    )}
                  </div>
                )}
                <div className="mt-6">
                  <p className="mb-2 text-xs font-semibold uppercase text-stone-500"><Trans>Cloud workspaces</Trans></p>
                  <div id="account-workspace-list" className="space-y-1">
                    {!state.syncToken ? (
                      <p className="text-xs text-stone-500"><Trans>Connect to load workspaces.</Trans></p>
                    ) : state.cloudWorkspaces.length === 0 ? (
                      <p className="text-xs text-stone-500"><Trans>No cloud workspaces yet. Sync this vault to create one.</Trans></p>
                    ) : (
                      state.cloudWorkspaces.map((ws) => {
                        const isBound = activeVaultBinding?.workspaceId === ws.id;
                        const workspaceName = (ws.name || ws.slug || t`Untitled workspace`).replace(/^:/, "");
                        return (
                        <button key={ws.id} className={`workspace-row ${isBound && !isLocalMode ? "workspace-row-bound" : ""}`} type="button" onClick={() => bindWorkspace(ws)}>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{workspaceName}</span>
                            <span className="block truncate text-xs text-stone-500"><Trans>{ws.documentCount ?? 0} documents - {formatBytes(ws.storageBudgetBytes)} budget</Trans></span>
                          </span>
                          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">{isBound && !isLocalMode ? t`Bound` : ws.role}</span>
                        </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeSection === "cli" && capabilities.supportsCliInstall && (
              <section className="max-w-2xl">
                <h2 className="text-2xl font-semibold text-stone-950"><Trans>Command line (jtype)</Trans></h2>
                <p className="mt-1 text-sm text-[#6b7773]">
                  <Trans>Install the jtype CLI to manage notes and kanban from your terminal and connect AI agents over MCP.</Trans>
                </p>
                {!tauri.isAvailable ? (
                  <p className="mt-6 text-sm text-stone-500"><Trans>Available in the desktop app.</Trans></p>
                ) : (
                  <div className="mt-6 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold text-stone-900">
                          <CommandLineIcon className="h-4 w-4 text-[#008884]" />
                          <Trans>Install jtype to your PATH</Trans>
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {cli?.installed ? <Trans>Installed</Trans> : <Trans>Not installed</Trans>}
                          {cli?.version ? ` — ${cli.version}` : ""}
                        </p>
                        {cli?.asset && !cli.installed && (
                          <p className="mt-1 truncate text-xs text-stone-400"><Trans>Downloads</Trans> <code>{cli.asset}</code></p>
                        )}
                        {cli?.path && <p className="mt-1 truncate text-xs text-stone-400">{cli.path}</p>}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!cli?.installed}
                        disabled={cliBusy}
                        onClick={toggleCli}
                        title={cli?.installed ? t`Uninstall jtype CLI` : t`Install jtype CLI`}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition ${cli?.installed ? "bg-[#008884]" : "bg-stone-300"} ${cliBusy ? "opacity-60" : ""}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${cli?.installed ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    </div>
                    {cliBusy && <p className="mt-3 text-xs text-teal-700"><Trans>Working…</Trans></p>}
                    {cli?.installed && !cli.onPath && (
                      <p className="mt-3 text-xs text-amber-700"><Trans>Restart your terminal to pick up the updated PATH.</Trans></p>
                    )}
                    {cliError && <p className="mt-3 text-xs text-red-600">{cliError}</p>}
                    <p className="mt-3 text-xs text-stone-500">
                      <Trans>Then run `jtype login` to sign in.</Trans>
                    </p>
                  </div>
                )}
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
