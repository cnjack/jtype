import { expect, test } from "@playwright/test";
import {
  createSyncPushBatches,
  isRetryableSyncStatus,
  requestWithSyncRetry,
} from "../../src/lib/syncTransport";

test("packs sync work into deterministic bounded batches", () => {
  const batches = createSyncPushBatches({
    deviceId: "mobile-1",
    folders: [{ relativePath: "a" }, { relativePath: "b" }],
    documents: [1, 2, 3].map((index) => ({
      relativePath: `note-${index}.md`,
      title: `Note ${index}`,
      content: `# Note ${index}`,
    })),
    deletedPaths: [{ relativePath: "old.md" }],
    deletedFolders: [{ relativePath: "archive" }],
    trashOperations: [{ type: "empty_trash" }],
  }, "run-1", 3);

  expect(batches).toHaveLength(3);
  expect(batches.map((batch) => batch.requestId)).toEqual([
    "run-1:0001",
    "run-1:0002",
    "run-1:0003",
  ]);
  expect(batches.flatMap((batch) => batch.folders).map((item) => item.relativePath)).toEqual(["a", "b"]);
  expect(batches.flatMap((batch) => batch.documents).map((item) => item.relativePath)).toEqual([
    "note-1.md",
    "note-2.md",
    "note-3.md",
  ]);
  expect(batches.every((batch) => (
    batch.folders.length
    + batch.documents.length
    + batch.deletedPaths.length
    + batch.deletedFolders.length
    + batch.trashOperations.length
  ) <= 3)).toBe(true);
});

test("creates one idempotent request for an empty sync", () => {
  const [batch] = createSyncPushBatches({
    deviceId: "desktop-1",
    folders: [],
    documents: [],
    deletedPaths: [],
    deletedFolders: [],
    trashOperations: [],
  }, "run-empty");
  expect(batch.requestId).toBe("run-empty:0001");
});

test("splits large document payloads before the count limit", () => {
  const batches = createSyncPushBatches({
    deviceId: "mobile-large-content",
    folders: [],
    documents: ["one", "two"].map((name) => ({
      relativePath: `${name}.md`,
      title: name,
      content: "x".repeat(80),
    })),
    deletedPaths: [],
    deletedFolders: [],
    trashOperations: [],
  }, "large-run", 50, 120);

  expect(batches).toHaveLength(2);
  expect(batches.every((batch) => batch.documents.length === 1)).toBe(true);
});

test("retries transient responses with the same caller-owned request", async () => {
  let attempts = 0;
  const retries: number[] = [];
  const response = await requestWithSyncRetry(async () => {
    attempts += 1;
    return new Response(attempts < 3 ? "temporary" : "ok", { status: attempts < 3 ? 503 : 200 });
  }, {
    delaysMs: [1, 2],
    sleep: async () => undefined,
    onRetry: ({ attempt }) => retries.push(attempt),
  });

  expect(response.status).toBe(200);
  expect(attempts).toBe(3);
  expect(retries).toEqual([2, 3]);
});

test("does not retry permanent client failures", async () => {
  let attempts = 0;
  const response = await requestWithSyncRetry(async () => {
    attempts += 1;
    return new Response("forbidden", { status: 403 });
  }, { sleep: async () => undefined });

  expect(response.status).toBe(403);
  expect(attempts).toBe(1);
  expect(isRetryableSyncStatus(429)).toBe(true);
  expect(isRetryableSyncStatus(500)).toBe(true);
  expect(isRetryableSyncStatus(400)).toBe(false);
});
