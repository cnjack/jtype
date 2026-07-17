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
  HomeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { useConfirm } from "@shared/components/PromptDialogContext";
import { LanguageSwitcherMenuPanel } from "@shared/components/LanguageSwitcher";
import { useRuntimeCapabilities } from "../../app/RuntimeCapabilities";

export function Header() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const sync = useCloudSync();
  const { i18n } = useLingui();
  const confirm = useConfirm();
  const capabilities = useRuntimeCapabilities();
  const [showLangPanel, setShowLangPanel] = useState(false);

  const breadcrumbs = state.mode === "single-file" ? t`Markdown file` : state.mode === "draft" ? t`Untitled` : "";

  const isSingleFile = state.mode === "single-file";

  // In single-file mode there's no sidebar, so closing the document is the only
  // way back to the welcome screen. Guard against losing unsaved edits.
  const handleBackToHome = async () => {
    if (state.isDirty) {
      const ok = await confirm(t`Discard unsaved changes and return to home?`, {
        title: t`Unsaved changes`,
        destructive: true,
      });
      if (!ok) return;
    }
    dispatch({ type: "CLEAR_DOCUMENT" });
  };

  // Drop the in-memory draft (Cmd+N). Drafts are never persisted, so confirm
  // whenever there's any real content.
  const handleDiscardDraft = async () => {
    if (state.editorContent.trim() !== "") {
      const ok = await confirm(t`Discard this untitled document?`, {
        title: t`Discard draft`,
        destructive: true,
      });
      if (!ok) return;
    }
    dispatch({ type: "DISCARD_DRAFT" });
  };

  const hasDocument = Boolean(state.currentPath) || state.isDraft;
  const currentBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const currentVaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const cloudSyncEnabled = Boolean(currentBinding && currentVaultSettings?.cloudSyncEnabled !== false);

  const userInitial = (state.syncUsername || "A").charAt(0).toUpperCase();

  return (
    <header
      data-tauri-drag-region={capabilities.supportsWindowDrag ? "" : undefined}
      className="relative z-10 flex min-h-12 items-center justify-between gap-4 bg-transparent px-5 pt-5"
    >
      <div className="flex min-w-0 items-center gap-4">
        {breadcrumbs && (
          <div className="hidden min-w-0 pl-1 md:block">
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
          <>
            <button className="toolbar-button aspect-square px-0" type="button" title={t`Back to home`} onClick={handleBackToHome}>
              <HomeIcon className="h-4 w-4" />
            </button>
            <button className="toolbar-button aspect-square px-0" type="button" title={t`Open file`} onClick={() => fs.chooseMarkdownFile()}>
              <FolderOpenIcon className="h-4 w-4" />
            </button>
          </>
        )}
        {state.mode === "draft" && (
          <button className="toolbar-button aspect-square px-0" type="button" title={t`Discard draft`} onClick={handleDiscardDraft}>
            <XMarkIcon className="h-4 w-4" />
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
              anchor="bottom end"
              className="z-[100] w-48 rounded-lg border border-black/[0.06] bg-white p-1 shadow-lg shadow-stone-900/10 outline-none transition [--anchor-gap:8px] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
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
