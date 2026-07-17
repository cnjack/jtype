import { useEffect, useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useFileSystem } from "../../hooks";
import { useConfirm } from "@shared/components/PromptDialogContext";
import { readRecentItems } from "../../hooks/useFileSystem";
import type { RecentItem } from "../../lib/types";
import { useRuntimeCapabilities } from "../../app/RuntimeCapabilities";

export function WelcomeScreen() {
  const fs = useFileSystem();
  const confirm = useConfirm();
  const capabilities = useRuntimeCapabilities();
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() => readRecentItems());
  const defaultVaultPath = "~/Documents/Jtype Vaullt";

  // Re-read the recent list whenever the window regains focus. Opening a
  // file/vault elsewhere mutates localStorage, so a stale snapshot would show
  // entries the user just opened (or hide ones they removed from the side bar).
  useEffect(() => {
    const refresh = () => setRecentItems(readRecentItems());
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("jtype:recent-changed", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("jtype:recent-changed", refresh);
    };
  }, []);

  const handleRemove = async (item: RecentItem) => {
    const ok = await confirm(t`Remove "${item.name}" from list?`, {
      title: item.kind === "workspace" ? t`Remove vault` : t`Remove file`,
      destructive: true,
    });
    if (!ok) return;
    await fs.removeRecentItem(item.path);
    setRecentItems(readRecentItems());
  };

  return (
    <section id="welcome-screen" className="welcome-screen min-h-0 overflow-y-auto bg-[#fbfaf7]">
      <div className="mx-auto flex min-h-full w-full min-w-0 max-w-4xl flex-col px-4 py-16 sm:px-8">
        <div className="w-full min-w-0 max-w-2xl">
          <div
            className="select-none mb-4"
            style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace", fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}
          >
            <span className="text-stone-400">[</span>
            <span className="text-teal-700">J</span>
            <span className="text-stone-900">TYPE</span>
            <span className="text-stone-400">]</span>
          </div>
          <h2 className="mt-3 break-words text-3xl font-semibold tracking-normal text-stone-950 [overflow-wrap:anywhere]"><Trans>Create a vault or edit one Markdown file.</Trans></h2>
          <p className="mt-3 max-w-xl break-words text-sm leading-6 text-stone-600 [overflow-wrap:anywhere]">
            <Trans>A vault is a local folder for notes, sync, and publishing. A single file opens JType as a focused Markdown editor.</Trans>
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button id="welcome-default-vault" className="toolbar-button toolbar-button-primary" type="button" onClick={() => fs.openDefaultVault()}>
              <Trans>Use default vault</Trans>
            </button>
            {capabilities.supportsExternalVault && (
              <>
                <button id="welcome-open-folder" className="toolbar-button" type="button" onClick={() => fs.chooseWorkspaceFolder()}>
                  <Trans>Open vault</Trans>
                </button>
                <button id="welcome-open-markdown" className="toolbar-button" type="button" onClick={() => fs.chooseMarkdownFile()}>
                  <Trans>Open Markdown file</Trans>
                </button>
              </>
            )}
          </div>
          {capabilities.usesAppPrivateVault ? (
            <p id="welcome-private-vault-note" className="mt-3 text-xs text-stone-500">
              <Trans>Stored privately by JType on this device.</Trans>
            </p>
          ) : (
            <p className="mt-3 text-xs text-stone-500"><Trans>Default vault path: <span className="font-mono text-stone-700">{defaultVaultPath}</span></Trans></p>
          )}
        </div>
        <section className="mt-10 w-full min-w-0 max-w-2xl rounded-lg border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-950"><Trans>Recent</Trans></p>
          </div>
          <div className="space-y-1">
            {recentItems.length === 0 ? (
              <p className="text-sm text-stone-500"><Trans>No recent vaults or Markdown files yet.</Trans></p>
            ) : (
              recentItems.map((item) => (
                <div key={item.path} className="group relative">
                  <button
                    type="button"
                    className="tree-button w-full pr-9 text-sm"
                    onClick={() => {
                      if (item.kind === "workspace") fs.openWorkspace(item.path);
                      else fs.openMarkdownFile(item.path);
                    }}
                  >
                    <span className="text-stone-500">{item.kind === "workspace" ? t`Vault` : t`Markdown file`}</span>
                    <span className="truncate font-semibold">{item.name}</span>
                  </button>
                  <button
                    type="button"
                    title={t`Remove from list`}
                    className="absolute inset-y-0 right-1.5 flex w-7 items-center justify-center rounded-md text-stone-400 opacity-0 transition-opacity hover:bg-stone-100 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); void handleRemove(item); }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
