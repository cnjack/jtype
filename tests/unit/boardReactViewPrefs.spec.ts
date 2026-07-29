import { test, expect } from "@playwright/test";
import {
  applyCardPatch,
  applyLocalViewPatch,
  cardFromDoc,
  LOCAL_VIEW_KEYS,
  toViewConfig,
  type BoardConfigJSON,
} from "../../packages/board-react/src/boardData";

// readOnly view retention for jtype-board-react: a read-only embed keeps
// Board/Table/Calendar (and grouping) choices in a local override that is
// merged over EVERY fresh poll snapshot — so the 30s poll can't snap the view
// back — while non-view keys can never be altered locally.

test("retains only view-preference keys, dropping data-shape keys", () => {
  let local = applyLocalViewPatch({}, { viewType: "table" });
  local = applyLocalViewPatch(local, {
    groupBy: "priority",
    // a hostile/buggy patch must not let a viewer rewrite board data locally
    columns: [{ key: "x", name: "X" }],
    title: "evil",
    doneColumn: "x",
  });
  expect(local).toEqual({ viewType: "table", groupBy: "priority" });
  expect(LOCAL_VIEW_KEYS).toEqual(["viewType", "groupBy", "swimlaneBy", "calendarMode"]);
});

test("the local override survives a fresh server snapshot (poll cycle)", () => {
  const local = applyLocalViewPatch({}, { viewType: "table" });
  // 30s later: load() delivers a brand-new server config...
  const freshServerConfig = { id: "b1", title: "Board", columns: [], viewType: "board" as const, groupBy: "status" };
  // ...and the effective config (what JTypeBoard renders in readOnly) still shows the local choice.
  const effective = { ...freshServerConfig, ...local };
  expect(effective.viewType).toBe("table");
  expect(effective.title).toBe("Board");
  expect(effective.groupBy).toBe("status"); // untouched keys come from the server
});

test("an explicit undefined lands (how the surface clears swimlaneBy)", () => {
  const local = applyLocalViewPatch({ swimlaneBy: "priority" }, { swimlaneBy: undefined });
  expect("swimlaneBy" in local).toBe(true);
  const effective = { swimlaneBy: "priority", ...local };
  expect(effective.swimlaneBy).toBeUndefined();
});

test("later patches override earlier ones", () => {
  let local = applyLocalViewPatch({}, { viewType: "table" });
  local = applyLocalViewPatch(local, { viewType: "calendar", calendarMode: "agenda" });
  expect(local).toEqual({ viewType: "calendar", calendarMode: "agenda" });
});

test("board-react reads, renders, and writes the canonical custom swimlane mapping", () => {
  const config: BoardConfigJSON = {
    id: "roadmap",
    title: "Roadmap",
    columns: [{ key: "todo", name: "To do" }],
    swimlaneBy: "custom",
    swimlanes: [{ key: "lane_platform_12345678", name: "Platform" }],
  };
  const card = cardFromDoc(
    {
      relativePath: "roadmap/card.md",
      title: "Card",
      content:
        "---\ntitle: Card\nboard: roadmap\nstatus: todo\nswimlane: lane_platform_12345678\n---\n\nBody",
    },
    config,
  );
  expect(card?.swimlaneKey).toBe("lane_platform_12345678");
  expect(toViewConfig(config, "roadmap").swimlanes).toEqual(config.swimlanes);

  const moved = applyCardPatch(
    "---\ntitle: Card\nboard: roadmap\nstatus: todo\n---\n\nBody",
    { swimlaneKey: "lane_platform_12345678" },
  );
  expect(moved).toContain("swimlane: lane_platform_12345678");
});
