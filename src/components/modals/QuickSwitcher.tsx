import { useMemo } from "react";
import { t, Trans } from "@lingui/macro";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { fuzzyMatch } from "@shared/lib/utils";
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
      ariaLabel={t`Quick switcher`}
      inputPlaceholder={t`Open or create Document...`}
      inputAriaLabel={t`Open or create Document`}
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

        const results = allNodes
          .filter((node) => {
            if (folderFilter) {
              const parentPath = node.relativePath?.replace(/\/[^/]+$/, "") ?? "";
              if (!parentPath.toLowerCase().includes(folderFilter)) return false;
            }
            return !q || fuzzyMatch(`${node.name} ${node.relativePath}`, q);
          })
          .slice(0, 40);

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
            <span className="text-xs text-stone-500"><Trans>Open</Trans></span>
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
