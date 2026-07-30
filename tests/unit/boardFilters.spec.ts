import { expect, test } from "@playwright/test";
import {
  activeBoardFilterCount,
  cardMatchesFilters,
  hasBoardFilters,
  visibleCards,
  type BoardViewCard,
} from "../../shared/lib/board";

function card(id: string, extra: Partial<BoardViewCard> = {}): BoardViewCard {
  return {
    id,
    columnKey: "todo",
    position: 0,
    title: id,
    tags: [],
    ...extra,
  };
}

test("structured filters OR within a dimension and AND across dimensions", () => {
  const cards = [
    card("mine-high", {
      priority: "high",
      assignee: "Jack",
      tags: [{ label: "frontend" }],
    }),
    card("mine-low", {
      priority: "low",
      assignee: "Jack",
      tags: [{ label: "frontend" }],
    }),
    card("other-high", {
      priority: "high",
      assignee: "Kim",
      tags: [{ label: "backend" }],
    }),
  ];

  expect(
    visibleCards(
      cards,
      "",
      {
        priorities: ["high", "medium"],
        tags: ["frontend"],
        mine: true,
      },
      undefined,
      { currentUser: "jack", today: "2026-07-30" },
    ).map((item) => item.id),
  ).toEqual(["mine-high"]);
});

test("due filters distinguish overdue, today, next seven days, and no due date", () => {
  const cards = [
    card("overdue", { due: "2026-07-29" }),
    card("today", { due: "2026-07-30" }),
    card("soon", { due: "2026-08-05" }),
    card("later", { due: "2026-08-06" }),
    card("none"),
  ];
  const context = { today: "2026-07-30" };

  expect(cards.filter((item) => cardMatchesFilters(item, { due: "overdue" }, context)).map((item) => item.id))
    .toEqual(["overdue"]);
  expect(cards.filter((item) => cardMatchesFilters(item, { due: "today" }, context)).map((item) => item.id))
    .toEqual(["today"]);
  expect(cards.filter((item) => cardMatchesFilters(item, { due: "nextSevenDays" }, context)).map((item) => item.id))
    .toEqual(["today", "soon"]);
  expect(cards.filter((item) => cardMatchesFilters(item, { due: "none" }, context)).map((item) => item.id))
    .toEqual(["none"]);
});

test("blocked and missing-swimlane filters compose without mutating cards", () => {
  const cards = [
    card("matching", {
      blockedBy: ["dependency"],
      swimlaneKey: "row_deleted",
    }),
    card("not-blocked", { swimlaneKey: "row_deleted" }),
    card("valid-row", {
      blockedBy: ["dependency"],
      swimlaneKey: "row_valid",
    }),
  ];
  const filters = { blocked: true, missingRow: true };

  expect(hasBoardFilters(filters)).toBe(true);
  expect(activeBoardFilterCount(filters)).toBe(2);
  expect(
    visibleCards(cards, "", filters, {
      swimlanes: [{ key: "row_valid", name: "Valid" }],
    }, {
      blockedCardIds: new Set(["matching"]),
    }).map((item) => item.id),
  ).toEqual(["matching"]);
  expect(cards[0]?.swimlaneKey).toBe("row_deleted");
});
