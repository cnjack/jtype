import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { searchQuickOpen, workspaceIndexFor } from "../../lib/workspaceIndex";
import { PaletteModal } from "./PaletteModal";

export function QuickSwitcher() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();

  const workspaceIndex = workspaceIndexFor(state.workspace?.entries);

  return (
    <PaletteModal
      open={state.quickSwitcherOpen}
      onClose={() => dispatch({ type: "SET_QUICK_SWITCHER", open: false })}
      ariaLabel={t`Quick switcher`}
      inputPlaceholder={t`Open or create Document...`}
      inputAriaLabel={t`Open or create Document`}
      inputId="quick-switcher-input"
      resultsId="quick-results"
    >
      {(query) => {
        if (!state.workspace) {
          return <p className="p-3 text-sm text-stone-500"><Trans>Open a vault to quick switch files.</Trans></p>;
        }

        const raw = query.trim();
        let q = raw.toLowerCase();
        let folderFilter = "";
        if (q.startsWith("folder:")) {
          folderFilter = q.slice(7).trim();
          q = "";
        }

        const results = searchQuickOpen(workspaceIndex, q, folderFilter, 40);

        if (results.length === 0 && q) {
          return (
            <button className="command-row" type="button" onClick={() => {
              dispatch({ type: "SET_QUICK_SWITCHER", open: false });
            }}>
              <span><Trans>Create "{query}.md"</Trans></span>
              <span className="text-xs text-stone-500">Shift+Enter</span>
            </button>
          );
        }

        return (
          <div data-index-size={workspaceIndex.quickOpenable.length} data-result-count={results.length}>
            {results.map((node) => (
              <button
                key={node.path}
                type="button"
                className="command-row"
                onClick={() => {
                  dispatch({ type: "SET_QUICK_SWITCHER", open: false });
                  if (node.kind === "board") {
                    dispatch({ type: "SELECT_TREE_NODE", node });
                  } else {
                    fs.openMarkdownFile(node.path, node.relativePath);
                  }
                }}
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{node.name}</span>
                  <span className="block truncate text-xs text-stone-500">{node.relativePath}</span>
                </span>
                <span className="text-xs text-stone-500"><Trans>Open</Trans></span>
              </button>
            ))}
          </div>
        );
      }}
    </PaletteModal>
  );
}
