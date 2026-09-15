import { expect, test } from "@playwright/test";
import {
  boardPersonalViewDefaults,
  boardPersonalViewStorageKey,
  loadBoardPersonalViewState,
  mergeBoardPersonalViewState,
  normalizeBoardPersonalViewState,
  saveBoardPersonalViewState,
} from "../../shared/lib/boardViewState";

test("personal view state allowlists persisted fields and falls back safely", () => {
  expect(
    normalizeBoardPersonalViewState({
      version: 99,
      viewType: "gantt",
      sortBy: "dangerous",
      scope: "my-work",
      filters: { tags: ["release", 7], archived: "archived", injected: true },
      search: "must not persist",
    }),
  ).toEqual({
    version: 1,
    viewType: "gantt",
    scope: "my-work",
    filters: { tags: ["release"], archived: "archived" },
  });
  expect(normalizeBoardPersonalViewState("broken")).toEqual({ version: 1 });
});

test("legacy board display values seed defaults without becoming project data", () => {
  expect(
    boardPersonalViewDefaults({
      title: "Release",
      columns: [],
      viewType: "calendar",
      groupBy: "priority",
      calendarMode: "agenda",
      project: { key: "REL" },
    }),
  ).toEqual({
    version: 1,
    viewType: "calendar",
    groupBy: "priority",
    calendarMode: "agenda",
    scope: "all",
    sortBy: "manual",
    filters: { archived: "active" },
  });
});

test("storage isolates identity, workspace and board and survives invalid JSON", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
  const key = boardPersonalViewStorageKey({ identity: "jack", workspace: "vault/a", board: "road map" });
  const other = boardPersonalViewStorageKey({ identity: "maya", workspace: "vault/a", board: "road map" });
  expect(key).not.toBe(other);
  const defaults = normalizeBoardPersonalViewState({ viewType: "board", scope: "all" });
  const next = mergeBoardPersonalViewState(defaults, { viewType: "backlog", collapsedGroupKeys: ["todo"] });
  saveBoardPersonalViewState(storage, key, next);
  expect(loadBoardPersonalViewState(storage, key, defaults)).toEqual(next);
  values.set(other, "{");
  expect(loadBoardPersonalViewState(storage, other, defaults)).toEqual(defaults);
});

test("blocked personal storage never breaks the in-memory view transition", () => {
  const blocked = {
    getItem: () => null,
    setItem: () => { throw new DOMException("quota", "QuotaExceededError"); },
  };
  expect(() => saveBoardPersonalViewState(blocked, "view", { version: 1, viewType: "backlog" }))
    .not.toThrow();
});
