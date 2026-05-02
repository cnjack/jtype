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
    <header className="flex min-h-14 items-center justify-between gap-4 border-b border-stone-200 bg-stone-50 px-4">
      <div className="flex min-w-0 items-center gap-4">
        <button
          className="select-none rounded-md px-1 py-0.5 -mx-1 transition hover:bg-stone-200/60"
          type="button"
          onClick={handleLogoClick}
          title="Back to home"
          style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace", fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}
        >
          <span className="text-stone-400">[</span>
          <span className="text-teal-700">J</span>
          <span className="text-stone-900">TYPE</span>
          <span className="text-stone-400">]</span>
        </button>
        <div className="hidden min-w-0 border-l border-stone-200 pl-4 md:block">
          <p className="truncate text-xs text-stone-500">{breadcrumbs}</p>
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
