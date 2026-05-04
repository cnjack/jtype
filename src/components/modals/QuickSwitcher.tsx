import { useMemo } from "react";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { fuzzyMatch } from "../../lib/utils";
import { PaletteModal } from "./PaletteModal";

export function QuickSwitcher() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();

  const allNodes = useMemo(() => {
    if (!state.workspace?.entries) return [];
    return flattenMarkdownNodes(state.workspace.entries);
  }, [state.workspace]);

  return (
    <PaletteModal
      open={state.quickSwitcherOpen}
      onClose={() => dispatch({ type: "SET_QUICK_SWITCHER", open: false })}
      ariaLabel="Quick switcher"
      inputPlaceholder="Open or create note..."
      inputAriaLabel="Open or create note"
      resultsId="quick-results"
    >
      {(query) => {
        if (!state.workspace) {
          return <p className="p-3 text-sm text-stone-500">Open a vault to quick switch files.</p>;
        }

        const q = query.trim().toLowerCase();
        const results = allNodes
          .filter((node) => !q || fuzzyMatch(`${node.name} ${node.relativePath}`, q))
          .slice(0, 40);

        if (results.length === 0 && q) {
          return (
            <button className="command-row" type="button" onClick={() => {
              dispatch({ type: "SET_QUICK_SWITCHER", open: false });
            }}>
              <span>Create "{query}.md"</span>
              <span className="text-xs text-stone-500">Shift+Enter</span>
            </button>
          );
        }

        return results.map((node) => (
          <button
            key={node.path}
            type="button"
            className="command-row"
            onClick={() => {
              dispatch({ type: "SET_QUICK_SWITCHER", open: false });
              fs.openMarkdownFile(node.path, node.relativePath);
            }}
          >
            <span className="min-w-0">
              <span className="block font-semibold">{node.name}</span>
              <span className="block truncate text-xs text-stone-500">{node.relativePath}</span>
            </span>
            <span className="text-xs text-stone-500">Open</span>
          </button>
        ));
      }}
    </PaletteModal>
  );
}

function flattenMarkdownNodes(entries: import("../../lib/types").FileTreeNode[]): import("../../lib/types").FileTreeNode[] {
  const result: import("../../lib/types").FileTreeNode[] = [];
  for (const node of entries) {
    if (node.kind === "markdown") result.push(node);
    if (node.children) result.push(...flattenMarkdownNodes(node.children));
  }
  return result;
}
