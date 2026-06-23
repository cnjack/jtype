import { test, expect } from "@playwright/test";
import { partitionSwimlanes, type BoardViewCard } from "../../shared/lib/board";

// Pure-logic acceptance for C4 swimlanes: the 2-D board view buckets cards into
// laneValue → columnValue → cards, which partitionSwimlanes computes.

function c(id: string, columnKey: string, extra: Partial<BoardViewCard> = {}): BoardViewCard {
  return { id, columnKey, position: 0, title: id, tags: [], ...extra };
}

test("partitionSwimlanes buckets by lane (swimlane dim) then column (group dim)", () => {
  const cards = [
    c("a", "todo", { priority: "high" }),
    c("b", "todo", { priority: "low" }),
    c("c", "done", { priority: "high" }),
    c("d", "todo", { priority: "high" }),
  ];
  // columns = status, lanes = priority
  const grid = partitionSwimlanes(cards, "status", "priority");
  expect(grid.get("high")!.get("todo")!.map((x) => x.id).sort()).toEqual(["a", "d"]);
  expect(grid.get("high")!.get("done")!.map((x) => x.id)).toEqual(["c"]);
  expect(grid.get("low")!.get("todo")!.map((x) => x.id)).toEqual(["b"]);
  expect(grid.get("low")!.has("done")).toBe(false);
});

test("partitionSwimlanes uses 'none'/'' fallbacks for missing dimension values", () => {
  const cards = [c("a", "todo"), c("b", "todo", { assignee: "kim" })];
  // lanes = assignee → missing assignee buckets under "" (unassigned)
  const grid = partitionSwimlanes(cards, "status", "assignee");
  expect(grid.get("")!.get("todo")!.map((x) => x.id)).toEqual(["a"]);
  expect(grid.get("kim")!.get("todo")!.map((x) => x.id)).toEqual(["b"]);

  // lanes = priority → missing priority buckets under "none"
  const grid2 = partitionSwimlanes(cards, "status", "priority");
  expect(grid2.get("none")!.get("todo")!.map((x) => x.id).sort()).toEqual(["a", "b"]);
});
