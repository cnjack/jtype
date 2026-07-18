import { expect, test } from "@playwright/test";
import type { FileTreeNode, WorkspaceEntryPage, WorkspaceSnapshot } from "../../src/lib/types";
import {
  mergeWorkspaceEntryPage,
  WORKSPACE_ENTRY_PAGE_SIZE,
  workspacePageCursorIsStale,
} from "../../src/lib/workspacePagination";

function node(relativePath: string, kind: FileTreeNode["kind"] = "markdown", children: FileTreeNode[] = []): FileTreeNode {
  return {
    name: relativePath.split("/").at(-1) ?? relativePath,
    path: `/vault/${relativePath}`,
    relativePath,
    kind,
    children,
  };
}

function workspace(entries: FileTreeNode[] = []): WorkspaceSnapshot {
  return {
    rootPath: "/vault",
    name: "Vault",
    entries,
    metadataCreated: false,
    completeness: "partial",
    entryPages: {},
  };
}

function page(
  relativePath: string,
  entries: FileTreeNode[],
  startIndex: number,
  totalEntries: number,
): WorkspaceEntryPage {
  const end = startIndex + entries.length;
  return {
    relativePath,
    entries,
    startIndex,
    totalEntries,
    nextCursor: end < totalEntries ? String(end) : null,
  };
}

test("merges sequential root pages into the canonical workspace snapshot", () => {
  expect(WORKSPACE_ENTRY_PAGE_SIZE).toBe(160);
  const first = mergeWorkspaceEntryPage(
    workspace(),
    page("", [node("docs", "folder"), node("note-001.md")], 0, 3),
  );
  const second = mergeWorkspaceEntryPage(
    first,
    page("", [node("note-002.md")], 2, 3),
  );

  expect(second.entries.map((entry) => entry.relativePath))
    .toEqual(["docs", "note-001.md", "note-002.md"]);
  expect(first.entries).toHaveLength(2);
  expect(first.entryPages?.[""]).toEqual({
    loadedEntries: 2,
    totalEntries: 3,
    nextCursor: "2",
  });
  expect(second.entryPages?.[""]).toEqual({
    loadedEntries: 3,
    totalEntries: 3,
    nextCursor: null,
  });
});

test("accepts opaque native cursors and recognizes stale cursor failures", () => {
  const firstPage = {
    ...page("", [node("note-001.md")], 0, 2),
    nextCursor: "v1:0123456789abcdef:1",
  };
  const merged = mergeWorkspaceEntryPage(workspace(), firstPage);

  expect(merged.entryPages?.[""]?.nextCursor).toBe("v1:0123456789abcdef:1");
  expect(workspacePageCursorIsStale(new Error("Workspace page cursor is stale."))).toBe(true);
  expect(workspacePageCursorIsStale(new Error("Workspace page cursor is invalid."))).toBe(false);
});

test("hydrates a nested folder without changing sibling UI nodes", () => {
  const sibling = node("root.md");
  const initial = workspace([node("docs", "folder"), sibling]);
  const hydrated = mergeWorkspaceEntryPage(
    initial,
    page("docs", [node("docs/a.md"), node("docs/b.md")], 0, 2),
  );

  expect(hydrated.entries[0].children.map((entry) => entry.relativePath))
    .toEqual(["docs/a.md", "docs/b.md"]);
  expect(hydrated.entries[1]).toBe(sibling);
  expect(hydrated.entryPages?.docs).toEqual({
    loadedEntries: 2,
    totalEntries: 2,
    nextCursor: null,
  });
});

test("root refresh preserves children already loaded for the same folder", () => {
  const child = node("docs/loaded.md");
  const initial = workspace([node("docs", "folder", [child]), node("old.md")]);
  const refreshed = mergeWorkspaceEntryPage(
    initial,
    page("", [node("docs", "folder"), node("new.md")], 0, 2),
  );

  expect(refreshed.entries[0].children).toEqual([child]);
  expect(refreshed.entries[1].relativePath).toBe("new.md");
  expect(refreshed.entryPages?.[""]?.loadedEntries).toBe(2);
});

test("rejects out-of-order, duplicate, and non-child pages", () => {
  expect(() => mergeWorkspaceEntryPage(
    workspace([node("note-001.md")]),
    page("", [node("note-003.md")], 2, 3),
  )).toThrow(/cursor order/);

  expect(() => mergeWorkspaceEntryPage(
    workspace(),
    page("", [node("same.md"), node("same.md")], 0, 2),
  )).toThrow(/duplicate/);

  expect(() => mergeWorkspaceEntryPage(
    workspace([node("docs", "folder")]),
    page("docs", [node("other/note.md")], 0, 1),
  )).toThrow(/non-child/);

  expect(() => mergeWorkspaceEntryPage(
    workspace([node("note-001.md")]),
    page("", [node("note-001.md")], 1, 2),
  )).toThrow(/already loaded/);

  expect(() => mergeWorkspaceEntryPage(
    workspace(),
    { ...page("", [node("note.md")], 0, 2), nextCursor: null },
  )).toThrow(/cursor does not match/);

  expect(() => mergeWorkspaceEntryPage(
    workspace(),
    page("", [], 0, 1),
  )).toThrow(/no progress/);
});
