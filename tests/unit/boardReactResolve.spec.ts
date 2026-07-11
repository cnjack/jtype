import { test, expect } from "@playwright/test";
import { resolveBoardDoc, JTypeBoardError } from "../../packages/board-react/src/resolveBoard";
import type { JTypeDocumentListItem } from "../../packages/board-react/src/client";

// boardRef self-resolution for the jtype-board-react embed: the host only knows
// workspaceId + a board name (what jcode Cloud's kanban link stores); the
// package must deterministically find the `.board` config doc — or fail with a
// typed, listable error (never a blank board).

function doc(id: string, relativePath: string): JTypeDocumentListItem {
  return {
    id,
    relativePath,
    title: relativePath,
    isPublished: false,
    contentHash: `hash-${id}`,
    updatedClock: 1,
    versionId: null,
  };
}

const docs = [
  doc("1", "notes/readme.md"),
  doc("2", "jcloud-dev.board"),
  doc("3", "jcloud-dev/first-card.md"),
  doc("4", "team/sprint.board"),
  doc("5", "archive/sprint.board"),
];

test("resolves an exact relativePath (with .board suffix)", () => {
  const r = resolveBoardDoc(docs, "team/sprint.board");
  expect(r).toEqual({ boardDocId: "4", boardRelativePath: "team/sprint.board", boardDir: "team/sprint" });
});

test("resolves a bare board name by appending .board", () => {
  const r = resolveBoardDoc(docs, "jcloud-dev");
  expect(r.boardDocId).toBe("2");
  expect(r.boardDir).toBe("jcloud-dev");
});

test("resolves a nested board by unique basename", () => {
  const one = [doc("9", "projects/roadmap.board")];
  const r = resolveBoardDoc(one, "roadmap");
  expect(r.boardDocId).toBe("9");
  expect(r.boardDir).toBe("projects/roadmap");
});

test("an exact path match beats basename candidates", () => {
  const both = [doc("root", "sprint.board"), doc("nested", "team/sprint.board")];
  expect(resolveBoardDoc(both, "sprint.board").boardDocId).toBe("root");
  expect(resolveBoardDoc(both, "team/sprint").boardDocId).toBe("nested");
});

test("ambiguous basename fails with the candidate paths listed", () => {
  let err: unknown;
  try {
    resolveBoardDoc(docs, "sprint");
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(JTypeBoardError);
  const be = err as JTypeBoardError;
  expect(be.code).toBe("board_ref_ambiguous");
  expect(be.candidates.sort()).toEqual(["archive/sprint.board", "team/sprint.board"]);
});

test("unknown ref fails with board_not_found (also for empty ref and non-.board paths)", () => {
  expect(() => resolveBoardDoc(docs, "nope")).toThrowError(/board_not_found/);
  expect(() => resolveBoardDoc(docs, "")).toThrowError(/board_not_found/);
  // a plain markdown doc never resolves as a board
  expect(() => resolveBoardDoc(docs, "notes/readme.md")).toThrowError(/board_not_found/);
});

test("matching is case-insensitive on the .board suffix and tolerates ./ prefix", () => {
  const one = [doc("c", "Ops/Rota.BOARD")];
  expect(resolveBoardDoc(one, "./Ops/Rota").boardDocId).toBe("c");
  expect(resolveBoardDoc(one, "ops/rota.board").boardDocId).toBe("c");
});
