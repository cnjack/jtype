import { expect, test } from "@playwright/test";
import type { WorkspaceSnapshot } from "../../src/lib/types";
import { workspaceBootstrapMetrics } from "../../src/lib/workspaceRuntime";

function snapshot(partial: boolean): WorkspaceSnapshot {
  return {
    rootPath: "/vault",
    name: "性能 vault",
    entries: [{
      name: "note.md",
      path: "/vault/note.md",
      relativePath: "note.md",
      kind: "markdown",
      children: [],
    }],
    metadataCreated: false,
    completeness: partial ? "partial" : "complete",
    entryPages: partial ? {
      "": { loadedEntries: 160, totalEntries: 5_000, nextCursor: "160" },
    } : {},
  };
}

test("reports bounded partial bootstrap counts and UTF-8 snapshot bytes", () => {
  const workspace = snapshot(true);
  const metrics = workspaceBootstrapMetrics(workspace, 12.5);

  expect(metrics).toEqual({
    loadedEntries: 160,
    totalEntries: 5_000,
    elapsedMs: 12.5,
    snapshotBytes: new TextEncoder().encode(JSON.stringify(workspace)).byteLength,
  });
});

test("falls back to complete snapshot entry counts and clamps elapsed time", () => {
  const metrics = workspaceBootstrapMetrics(snapshot(false), -1);

  expect(metrics.loadedEntries).toBe(1);
  expect(metrics.totalEntries).toBe(1);
  expect(metrics.elapsedMs).toBe(0);
});
