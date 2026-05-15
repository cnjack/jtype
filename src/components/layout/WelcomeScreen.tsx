import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useFileSystem } from "../../hooks";

export function WelcomeScreen() {
  const fs = useFileSystem();

  const recentItems = readRecentItems();
  const defaultVaultPath = "~/Documents/Jtype Vaullt";

  return (
    <section id="welcome-screen" className="welcome-screen min-h-0 overflow-y-auto bg-[#fbfaf7]">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col px-8 py-16">
        <div className="max-w-2xl">
          <div
            className="select-none mb-4"
            style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace", fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}
          >
            <span className="text-stone-400">[</span>
            <span className="text-teal-700">J</span>
            <span className="text-stone-900">TYPE</span>
            <span className="text-stone-400">]</span>
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-stone-950"><Trans>Create a vault or edit one Markdown file.</Trans></h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
            <Trans>A vault is a local folder for notes, sync, and publishing. A single file opens JType as a focused Markdown editor.</Trans>
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button id="welcome-default-vault" className="toolbar-button toolbar-button-primary" type="button" onClick={() => fs.openDefaultVault()}>
              <Trans>Use default vault</Trans>
            </button>
            <button id="welcome-open-folder" className="toolbar-button" type="button" onClick={() => fs.chooseWorkspaceFolder()}>
              <Trans>Open vault</Trans>
            </button>
            <button className="toolbar-button" type="button" onClick={() => fs.chooseMarkdownFile()}>
              <Trans>Open Markdown file</Trans>
            </button>
          </div>
          <p className="mt-3 text-xs text-stone-500"><Trans>Default vault path: <span className="font-mono text-stone-700">{defaultVaultPath}</span></Trans></p>
        </div>
        <section className="mt-10 max-w-2xl rounded-lg border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-950"><Trans>Recent</Trans></p>
          </div>
          <div className="space-y-1">
            {recentItems.length === 0 ? (
              <p className="text-sm text-stone-500"><Trans>No recent vaults or Markdown files yet.</Trans></p>
            ) : (
              recentItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className="tree-button text-sm"
                  onClick={() => {
                    if (item.kind === "workspace") fs.openWorkspace(item.path);
                    else fs.openMarkdownFile(item.path);
                  }}
                >
                  <span className="text-stone-500">{item.kind === "workspace" ? t`Vault` : t`Markdown file`}</span>
                  <span className="truncate font-semibold">{item.name}</span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

import type { RecentItem } from "../../lib/types";
function readRecentItems(): RecentItem[] {
  try {
    return JSON.parse(window.localStorage.getItem("jtype.recent") ?? "[]");
  } catch {
    return [];
  }
}
