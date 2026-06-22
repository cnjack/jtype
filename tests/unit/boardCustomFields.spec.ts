import { test, expect } from "@playwright/test";
import { pickCustomFields, type BoardFieldDef } from "../../shared/lib/board";

// Pure-logic acceptance for C5 custom fields: the adapters read declared field
// values out of a flat property/frontmatter map via pickCustomFields.

const fields: BoardFieldDef[] = [
  { key: "story_points", label: "Story Points", type: "number" },
  { key: "owner_team", label: "Owner Team" },
];

test("pickCustomFields extracts only declared, non-empty keys", () => {
  const props = { story_points: "5", owner_team: "Platform", board: "proj", status: "todo" };
  expect(pickCustomFields(props, fields)).toEqual({ story_points: "5", owner_team: "Platform" });
});

test("pickCustomFields skips missing/empty values and undeclared keys", () => {
  expect(pickCustomFields({ story_points: "3", owner_team: "" }, fields)).toEqual({ story_points: "3" });
  expect(pickCustomFields({ unrelated: "x" }, fields)).toEqual({});
  expect(pickCustomFields(null, fields)).toEqual({});
  expect(pickCustomFields({ story_points: "1" }, undefined)).toEqual({});
});
