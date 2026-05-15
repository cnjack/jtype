import { useState } from "react";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem, useCloudSync } from "../../hooks";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import {
  MagnifyingGlassIcon,
  FolderOpenIcon,
  UserCircleIcon,
  CloudIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { LanguageSwitcherMenuPanel } from "@shared/components/LanguageSwitcher";

export function Header() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const sync = useCloudSync();
  const { i18n } = useLingui();
  const [showLangPanel, setShowLangPanel] = useState(false);

  const breadcrumbs = state.mode === "single-file" ? t`Markdown file` : "";

  const isSingleFile = state.mode === "single-file";
  const hasDocument = Boolean(state.currentPath);
  const currentBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const currentVaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const cloudSyncEnabled = Boolean(currentBinding && currentVaultSettings?.cloudSyncEnabled !== false);

  const handleLogoClick = () => {
    if (state.mode !== "empty") {
      dispatch({ type: "CLOSE_WORKSPACE" });
    }
  };

  const userInitial = (state.syncUsername || "A").charAt(0).toUpperCase();

  return (
    <header className="relative z-10 flex min-h-16 items-center justify-between gap-4 border-b border-black/[0.04] bg-white/85 px-5 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-4">
        <button
          className="-mx-1 select-none rounded-lg px-1 py-0.5 transition hover:bg-emerald-50"
          type="button"
          onClick={handleLogoClick}
          title={t`Back to home`}
          style={{ fontFamily: "'Arial Black', 'Segoe UI', Arial, sans-serif", fontSize: 18, fontWeight: 900, letterSpacing: 0 }}
        >
          <span className="text-[#8d939d]">[</span>
          <span className="text-[#008884]">J</span>
          <span className="text-[#0d0d0c]">TYPE</span>
          <span className="text-[#8d939d]">]</span>
        </button>
        {breadcrumbs && (
          <div className="hidden min-w-0 border-l border-emerald-900/10 pl-4 md:block">
            <p id="app-context-title" className="truncate text-xs font-medium text-[#67736f]">{breadcrumbs}</p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {state.mode === "workspace" && (
          <>
            <button
              className="toolbar-button aspect-square px-0"
              type="button"
              title={cloudSyncEnabled ? t`Cloud workspace: ${currentBinding?.workspaceName ?? ""}` : t`Local vault mode`}
              onClick={() => dispatch({ type: "SET_ACCOUNT_DIALOG", open: true, section: "workspace" })}
            >
              {cloudSyncEnabled ? <CloudIcon className="h-4 w-4" /> : <FolderOpenIcon className="h-4 w-4" />}
            </button>
            <button
              className="toolbar-button aspect-square px-0"
              type="button"
              title={t`Quick open`}
              onClick={() => dispatch({ type: "SET_QUICK_SWITCHER", open: true })}
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
            </button>
          </>
        )}
        {isSingleFile && (
          <button className="toolbar-button aspect-square px-0" type="button" title={t`Open file`} onClick={() => fs.chooseMarkdownFile()}>
            <FolderOpenIcon className="h-4 w-4" />
          </button>
        )}
        {hasDocument && state.isDirty && (
          <span className="status-chip status-chip-warning"><Trans>Unsaved</Trans></span>
        )}
        {!isSingleFile && (
          <Menu as="div" className="relative inline-block text-left">
            <MenuButton
              id="sync-panel-button"
              className="user-avatar"
              title={state.syncToken ? state.syncUsername : t`Sign in`}
            >
              {userInitial}
            </MenuButton>
            <MenuItems
              transition
              className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-lg border border-black/[0.06] bg-white p-1 shadow-lg shadow-stone-900/10 outline-none transition focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
            >
              <MenuItem>
                {({ focus }) => (
                  <button
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-stone-700 transition ${focus ? "bg-[#e8f6f2] text-[#006f6b]" : ""}`}
                    onClick={() => dispatch({ type: "SET_ACCOUNT_DIALOG", open: true, section: "account" })}
                  >
                    <UserCircleIcon className="h-4 w-4" />
                    <Trans>Profile</Trans>
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ focus }) => (
                  <button
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-stone-700 transition ${focus ? "bg-[#e8f6f2] text-[#006f6b]" : ""}`}
                    onClick={() => dispatch({ type: "SET_ACCOUNT_DIALOG", open: true, section: "workspace" })}
                  >
                    <CloudIcon className="h-4 w-4" />
                    <Trans>Cloud workspace</Trans>
                  </button>
                )}
              </MenuItem>
              <div>
                <button
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-stone-700 transition`}
                  onClick={() => setShowLangPanel((v) => !v)}
                >
                  <GlobeAltIcon className="h-4 w-4" />
                  <span className="flex-1 text-left">{t`Language`}</span>
                  <span className="text-xs text-stone-400">{showLangPanel ? "▲" : "▼"}</span>
                </button>
                {showLangPanel && (
                  <LanguageSwitcherMenuPanel
                    currentLocale={i18n.locale as import("@shared/i18n").SupportedLocale}
                    onSelect={async (locale) => {
                      const { activateLocale } = await import("@shared/i18n");
                      await activateLocale(locale);
                    }}
                  />
                )}
              </div>
              <div className="my-1 h-px bg-black/[0.06]" />
              <MenuItem>
                {({ focus }) => (
                  <button
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-stone-700 transition ${focus ? "bg-[#e8f6f2] text-[#006f6b]" : ""}`}
                    onClick={() => {
                      if (state.syncToken) {
                        sync.disconnectAccount();
                      } else {
                        dispatch({ type: "SET_ACCOUNT_DIALOG", open: true, section: "account" });
                      }
                    }}
                  >
                    {state.syncToken ? <ArrowLeftOnRectangleIcon className="h-4 w-4" /> : <ArrowRightOnRectangleIcon className="h-4 w-4" />}
                    {state.syncToken ? <Trans>Log out</Trans> : <Trans>Sign in</Trans>}
                  </button>
                )}
              </MenuItem>
            </MenuItems>
          </Menu>
        )}
      </div>
    </header>
  );
}
