import { expect, test } from "@playwright/test";
import type { FileTreeNode } from "../../src/lib/types";
import {
  findMarkdownByWikiTarget,
  progressiveTreeWindow,
  searchQuickOpen,
  searchWorkspaceDocuments,
  TREE_RENDER_BATCH_SIZE,
  workspaceIndexFor,
} from "../../src/lib/workspaceIndex";

function markdownNode(index: number, folder = ""): FileTreeNode {
  const name = `performance-note-${String(index).padStart(5, "0")}.md`;
  const relativePath = folder ? `${folder}/${name}` : name;
  return {
    name,
    path: `/vault/${relativePath}`,
    relativePath,
    kind: "markdown",
    children: [],
  };
}

test("builds and reuses one large workspace index within the performance budget", () => {
  const entries = Array.from({ length: 20_000 }, (_, index) => markdownNode(index));
  const startedAt = performance.now();
  const index = workspaceIndexFor(entries);
  const elapsedMs = performance.now() - startedAt;

  expect(index.documents).toHaveLength(20_000);
  expect(index.quickOpenable).toHaveLength(20_000);
  expect(workspaceIndexFor(entries)).toBe(index);
  expect(elapsedMs).toBeLessThan(750);
});

test("searches the cached index with bounded result arrays", () => {
  const entries = Array.from({ length: 5_000 }, (_, index) => markdownNode(index, `folder-${index % 20}`));
  const index = workspaceIndexFor(entries);

  expect(searchWorkspaceDocuments(index, "04999", 30).map((node) => node.name))
    .toEqual(["performance-note-04999.md"]);
  expect(searchWorkspaceDocuments(index, "performance", 30)).toHaveLength(30);
  expect(searchQuickOpen(index, "performance-note-04999", "folder-19", 40).at(0)?.name)
    .toBe("performance-note-04999.md");
  expect(findMarkdownByWikiTarget(index, "folder-19/performance-note-04999"))
    .toBe(searchWorkspaceDocuments(index, "04999", 1)[0]);
});

test("keeps the active tree row in a bounded ordered window", () => {
  const entries = Array.from({ length: 5_000 }, (_, index) => markdownNode(index));
  expect(progressiveTreeWindow(entries, TREE_RENDER_BATCH_SIZE, ""))
    .toEqual({ start: 0, end: TREE_RENDER_BATCH_SIZE });

  const active = progressiveTreeWindow(entries, TREE_RENDER_BATCH_SIZE, "performance-note-04999.md");
  expect(active.end - active.start).toBe(TREE_RENDER_BATCH_SIZE);
  expect(active.end).toBe(5_000);
  expect(entries.slice(active.start, active.end).at(-1)?.relativePath)
    .toBe("performance-note-04999.md");
});
