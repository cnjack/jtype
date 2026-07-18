import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem, useWorkspaceEntrySearch } from "../../hooks";
import { workspaceIndexFor } from "../../lib/workspaceIndex";
import { PaletteModal } from "./PaletteModal";

export function QuickSwitcher() {
  const state = useAppState();
  const dispatch = useAppDispatch();
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
      {(query) => <QuickSwitcherResults query={query} />}
    </PaletteModal>
  );
}

function QuickSwitcherResults({ query }: { query: string }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const workspaceIndex = workspaceIndexFor(state.workspace?.entries);

  const raw = query.trim();
  let normalizedQuery = raw.toLowerCase();
  let folderFilter = "";
  if (normalizedQuery.startsWith("folder:")) {
    folderFilter = normalizedQuery.slice(7).trim();
    normalizedQuery = "";
  }
  const search = useWorkspaceEntrySearch(
    state.workspace,
    normalizedQuery,
    folderFilter,
    "quickOpen",
    40,
  );

  if (!state.workspace) {
    return <p className="p-3 text-sm text-stone-500"><Trans>Open a vault to quick switch files.</Trans></p>;
  }

  if (search.entries.length === 0 && normalizedQuery && !search.isLoading) {
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
    <div
      data-index-size={workspaceIndex.quickOpenable.length}
      data-result-count={search.entries.length}
      data-partial-workspace={search.isPartial || undefined}
    >
      {search.entries.map((node) => (
        <button
          key={node.path}
          type="button"
          className="command-row"
          onClick={() => {
            dispatch({ type: "SET_QUICK_SWITCHER", open: false });
            if (node.kind === "board") {
              dispatch({ type: "SELECT_TREE_NODE", node });
            } else if (node.kind === "diagram") {
              void fs.openDiagramFile(node.path, node.relativePath);
            } else {
              void fs.openMarkdownFile(node.path, node.relativePath);
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
}
