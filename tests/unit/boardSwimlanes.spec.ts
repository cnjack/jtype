import { test, expect } from "@playwright/test";
import {
  activeBoardLaneKey,
  applyBoardCardPatch,
  boardLaneValueOf,
  cardPatchForLaneValue,
  effectiveColumns,
  effectiveSwimlanes,
  hasDanglingSwimlane,
  normalizeSwimlaneBy,
  partitionSwimlanes,
  validateSwimlanes,
  validateSwimlaneName,
  visibleCards,
  type BoardViewCard,
  type BoardViewConfig,
} from "../../shared/lib/board";
import { parseFrontmatter } from "../../shared/lib/frontmatter";

// Pure-logic acceptance for vertical swimlanes. The partition tests below
// preserve compatibility coverage for boards saved by the retired 2-D layout.

function c(id: string, columnKey: string, extra: Partial<BoardViewCard> = {}): BoardViewCard {
  return { id, columnKey, position: 0, title: id, tags: [], ...extra };
}

test("one active vertical swimlane dimension is selected with legacy compatibility", () => {
  expect(activeBoardLaneKey({})).toBe("status");
  expect(activeBoardLaneKey({ groupBy: "priority" })).toBe("priority");
  expect(activeBoardLaneKey({ groupBy: "status", swimlaneBy: "custom" })).toBe("custom");
  expect(activeBoardLaneKey({ groupBy: "status", swimlaneBy: "assignee" })).toBe("assignee");
});

test("vertical swimlane drops patch the field owned by the selected dimension", () => {
  expect(cardPatchForLaneValue("status", "doing")).toEqual({ columnKey: "doing" });
  expect(cardPatchForLaneValue("priority", "high")).toEqual({ priority: "high" });
  expect(cardPatchForLaneValue("priority", "none")).toEqual({ priority: null });
  expect(cardPatchForLaneValue("assignee", "Jack")).toEqual({ assignee: "Jack" });
  expect(cardPatchForLaneValue("assignee", "")).toEqual({ assignee: null });
  expect(cardPatchForLaneValue("custom", "lane_platform_12345678")).toEqual({
    swimlaneKey: "lane_platform_12345678",
  });
  expect(cardPatchForLaneValue("custom", "")).toEqual({ swimlaneKey: null });
});

test("assignee swimlanes always include an Unassigned create and drop target", () => {
  const config: BoardViewConfig = {
    title: "Roadmap",
    columns: [{ key: "todo", name: "To do" }],
  };
  expect(effectiveColumns(config, [], "assignee", "Unassigned")).toEqual([
    { key: "", name: "Unassigned" },
  ]);
  expect(
    effectiveColumns(config, [c("assigned", "todo", { assignee: "Jack" })], "assignee", "Unassigned"),
  ).toEqual([
    { key: "Jack", name: "Jack" },
    { key: "", name: "Unassigned" },
  ]);
});

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

test("custom swimlanes keep empty definitions and bucket dangling card keys into Unassigned", () => {
  const config: BoardViewConfig = {
    title: "Roadmap",
    columns: [{ key: "todo", name: "To do" }],
    swimlaneBy: "custom",
    swimlanes: [
      { key: "lane_platform_12345678", name: "Platform" },
      { key: "lane_empty_12345678", name: "Operations" },
    ],
  };
  const cards = [
    c("valid", "todo", { swimlaneKey: "lane_platform_12345678" }),
    c("missing", "todo", { swimlaneKey: "lane_deleted_12345678" }),
    c("none", "todo"),
  ];

  const lanes = effectiveSwimlanes(config, cards, "custom", "Unassigned");
  expect(lanes.map((lane) => lane.key)).toEqual([
    "lane_platform_12345678",
    "lane_empty_12345678",
    "",
  ]);

  const grid = partitionSwimlanes(cards, "status", "custom", config.swimlanes);
  expect(grid.get("lane_platform_12345678")!.get("todo")!.map((card) => card.id)).toEqual(["valid"]);
  expect(grid.get("")!.get("todo")!.map((card) => card.id).sort()).toEqual(["missing", "none"]);
  expect(hasDanglingSwimlane(cards[1]!, config.swimlanes)).toBe(true);
  expect(boardLaneValueOf(cards[0]!, config)).toBe("lane_platform_12345678");
  expect(boardLaneValueOf(cards[1]!, config)).toBe("");
  expect(boardLaneValueOf(cards[2]!, config)).toBe("");
});

test("an empty custom board still exposes an Unassigned create and drop target", () => {
  expect(
    effectiveSwimlanes(
      { title: "Empty", columns: [], swimlaneBy: "custom", swimlanes: [] },
      [],
      "custom",
      "Unassigned",
    ),
  ).toEqual([{ key: "", name: "Unassigned" }]);
});

test("Missing swimlane filter finds only dangling references", () => {
  const config: BoardViewConfig = {
    title: "Roadmap",
    columns: [],
    swimlanes: [{ key: "lane_platform_12345678", name: "Platform" }],
  };
  const cards = [
    c("valid", "todo", { swimlaneKey: "lane_platform_12345678" }),
    c("missing", "todo", { swimlaneKey: "lane_deleted_12345678" }),
    c("none", "todo"),
  ];
  expect(
    visibleCards(cards, "", { prop: "swimlaneIssue", value: "dangling" }, config).map((card) => card.id),
  ).toEqual(["missing"]);
});

test("card patch serializes and clears the stable swimlane frontmatter key", () => {
  const original = "---\ntitle: Card\nstatus: todo\n---\n\nBody";
  const assigned = applyBoardCardPatch(original, { swimlaneKey: "lane_platform_12345678" });
  expect(assigned).toContain("swimlane: lane_platform_12345678");
  expect(applyBoardCardPatch(assigned, { swimlaneKey: null })).not.toContain("swimlane:");
});

test("custom fields cannot overwrite canonical card frontmatter", () => {
  const original = "---\ntitle: Card\nstatus: todo\nswimlane: lane_old\n---\n\nBody";
  const patched = applyBoardCardPatch(original, {
    title: "Updated",
    columnKey: "doing",
    swimlaneKey: "lane_new",
    custom: {
      title: "Overridden",
      status: "done",
      swimlane: "lane_wrong",
      effort: "5",
    },
  });
  const { data } = parseFrontmatter(patched);
  expect(data.title).toBe("Updated");
  expect(data.status).toBe("doing");
  expect(data.swimlane).toBe("lane_new");
  expect(data.effort).toBe("5");
});

test("swimlane names are trimmed, bounded, and case-insensitively unique", () => {
  const lanes = [{ key: "lane_platform_12345678", name: "Platform" }];
  expect(validateSwimlaneName(" platform ", lanes)).toContain("unique");
  expect(validateSwimlaneName("Platform", lanes, lanes[0]!.key)).toBeNull();
  expect(validateSwimlaneName(" ", lanes)).toContain("required");
  expect(validateSwimlaneName("x".repeat(81), lanes)).toContain("80");
});

test("unknown persisted swimlane modes degrade to no swimlanes", () => {
  expect(normalizeSwimlaneBy("custom")).toBe("custom");
  expect(normalizeSwimlaneBy("priority")).toBe("priority");
  expect(normalizeSwimlaneBy("future-mode")).toBeUndefined();
  expect(normalizeSwimlaneBy(null)).toBeUndefined();
});

test("swimlane validation reports duplicate definitions and dangling keys without rewriting them", () => {
  const config: BoardViewConfig = {
    title: "Roadmap",
    columns: [],
    swimlanes: [
      { key: "lane_platform_12345678", name: "Platform" },
      { key: "lane_platform_12345678", name: "Platform duplicate" },
      { key: "lane_growth_12345678", name: " platform " },
    ],
  };
  const cards = [
    c("one", "todo", { swimlaneKey: "lane_deleted_12345678" }),
    c("two", "todo", { swimlaneKey: "lane_deleted_12345678" }),
    c("three", "todo"),
  ];

  expect(validateSwimlanes(config, cards)).toEqual([
    { kind: "duplicate_swimlane_key", key: "lane_platform_12345678" },
    { kind: "duplicate_swimlane_name", name: "Platform" },
    { kind: "dangling_swimlane", key: "lane_deleted_12345678", cardCount: 2 },
  ]);
  expect(effectiveSwimlanes(config, cards, "custom", "Unassigned").map((lane) => lane.key)).toEqual([
    "lane_platform_12345678",
    "lane_growth_12345678",
    "",
  ]);
});
