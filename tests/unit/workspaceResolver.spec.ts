import { expect, test } from "@playwright/test";
import type { FileTreeNode, WorkspaceSnapshot } from "../../src/lib/types";
import { tauri } from "../../src/lib/tauri";
import {
  findLoadedWorkspaceEntry,
  resolveWorkspaceEntry,
  resolveWorkspaceWikiTarget,
} from "../../src/lib/workspaceResolver";

test.describe.configure({ mode: "serial" });
const runtime = globalThis as typeof globalThis & { isTauri?: boolean };
test.beforeAll(() => { runtime.isTauri = true; });
test.afterAll(() => { delete runtime.isTauri; });

function node(relativePath: string): FileTreeNode {
  return {
    name: relativePath.split("/").at(-1) ?? relativePath,
    path: `/vault/${relativePath}`,
    relativePath,
    kind: "markdown",
    children: [],
  };
}

function workspace(
  entries: FileTreeNode[],
  completeness: "complete" | "partial",
): WorkspaceSnapshot {
  return {
    rootPath: "/vault",
    name: "Vault",
    entries,
    metadataCreated: false,
    completeness,
    entryPages: {},
  };
}

test("exact resolver uses the loaded canonical node before native fallback", async () => {
  const loaded = node("docs/loaded.md");
  const original = tauri.resolveWorkspaceEntry;
  let nativeCalls = 0;
  tauri.resolveWorkspaceEntry = async () => {
    nativeCalls += 1;
    return node("native.md");
  };
  try {
    const current = workspace([{
      name: "docs",
      path: "/vault/docs",
      relativePath: "docs",
      kind: "folder",
      children: [loaded],
    }], "partial");
    expect(findLoadedWorkspaceEntry(current, loaded.relativePath)).toBe(loaded);
    await expect(resolveWorkspaceEntry(current, loaded.relativePath)).resolves.toBe(loaded);
    expect(nativeCalls).toBe(0);
  } finally {
    tauri.resolveWorkspaceEntry = original;
  }
});

test("partial exact and wikilink resolution delegate missing/ambiguous targets to native", async () => {
  const exactNative = node("projects/tail.md");
  const wikiNative = node("other/duplicate.md");
  const originalEntry = tauri.resolveWorkspaceEntry;
  const originalWiki = tauri.resolveWorkspaceWikiTarget;
  tauri.resolveWorkspaceEntry = async (_root, relativePath) =>
    relativePath === exactNative.relativePath ? exactNative : null;
  tauri.resolveWorkspaceWikiTarget = async () => wikiNative;
  try {
    const current = workspace([node("loaded/duplicate.md")], "partial");
    await expect(resolveWorkspaceEntry(current, exactNative.relativePath)).resolves.toBe(exactNative);
    await expect(resolveWorkspaceWikiTarget(current, "other/duplicate")).resolves.toBe(wikiNative);
  } finally {
    tauri.resolveWorkspaceEntry = originalEntry;
    tauri.resolveWorkspaceWikiTarget = originalWiki;
  }
});

test("complete Desktop snapshots preserve loaded-only wikilink precedence", async () => {
  const loaded = node("docs/note.md");
  const current = workspace([loaded], "complete");
  await expect(resolveWorkspaceWikiTarget(current, "note")).resolves.toBe(loaded);
  await expect(resolveWorkspaceEntry(current, "missing.md")).resolves.toBeNull();
});

test("partial resolvers retain loaded results when the native query is unavailable", async () => {
  const loaded = node("docs/note.md");
  const originalEntry = tauri.resolveWorkspaceEntry;
  const originalWiki = tauri.resolveWorkspaceWikiTarget;
  tauri.resolveWorkspaceEntry = async () => { throw new Error("native unavailable"); };
  tauri.resolveWorkspaceWikiTarget = async () => { throw new Error("native unavailable"); };
  try {
    const current = workspace([loaded], "partial");
    await expect(resolveWorkspaceEntry(current, "missing.md")).resolves.toBeNull();
    await expect(resolveWorkspaceWikiTarget(current, "note")).resolves.toBe(loaded);
  } finally {
    tauri.resolveWorkspaceEntry = originalEntry;
    tauri.resolveWorkspaceWikiTarget = originalWiki;
  }
});
