import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";

export function Header() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();

  const breadcrumbs = state.currentRelativePath
    ? `${state.workspace?.name ?? "Vault"} / ${state.currentRelativePath}`
    : state.mode === "workspace"
      ? state.workspace?.name ?? "Vault"
      : state.mode === "single-file"
        ? "Markdown file"
        : "";

  const isSingleFile = state.mode === "single-file";
  const hasDocument = Boolean(state.currentPath);

  const handleLogoClick = () => {
    if (state.mode !== "empty") {
      dispatch({ type: "CLOSE_WORKSPACE" });
    }
  };

  const userInitial = (state.syncUsername || "A").charAt(0).toUpperCase();

  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b border-black/[0.04] bg-white/85 px-5 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-4">
        <button
          className="-mx-1 select-none rounded-lg px-1 py-0.5 transition hover:bg-emerald-50"
          type="button"
          onClick={handleLogoClick}
          title="Back to home"
          style={{ fontFamily: "'Arial Black', 'Segoe UI', Arial, sans-serif", fontSize: 18, fontWeight: 900, letterSpacing: 0 }}
        >
          <span className="text-[#8d939d]">[</span>
          <span className="text-[#008884]">J</span>
          <span className="text-[#0d0d0c]">TYPE</span>
          <span className="text-[#8d939d]">]</span>
        </button>
        <div className="hidden min-w-0 border-l border-emerald-900/10 pl-4 md:block">
          <p id="app-context-title" className="truncate text-xs font-medium text-[#67736f]">{breadcrumbs}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {state.mode === "workspace" && (
          <button
            className="toolbar-button"
            type="button"
            onClick={() => dispatch({ type: "SET_QUICK_SWITCHER", open: true })}
          >
            Quick open
          </button>
        )}
        {isSingleFile && (
          <button className="toolbar-button" type="button" onClick={() => fs.chooseMarkdownFile()}>
            Open file
          </button>
        )}
        {hasDocument && (
          <button
            className="toolbar-button toolbar-button-primary"
            type="button"
            disabled={state.currentKind !== "markdown" || !state.isDirty}
            onClick={() => fs.saveCurrentFile()}
          >
            Save
          </button>
        )}
        {!isSingleFile && (
          <button
            id="sync-panel-button"
            className="user-avatar"
            type="button"
            title={state.syncToken ? state.syncUsername : "Sign in"}
            onClick={() => dispatch({ type: "SET_ACCOUNT_DIALOG", open: true })}
          >
            {userInitial}
          </button>
        )}
      </div>
    </header>
  );
}
