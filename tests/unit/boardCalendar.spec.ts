import { test, expect } from "@playwright/test";
import {
  isIsoDate,
  shiftMonth,
  currentMonth,
  monthMatrix,
  groupCardsByDay,
  type BoardViewCard,
} from "../../shared/lib/board";

// Pure-logic acceptance for the C3 calendar view. The month grid and agenda are
// built entirely from these helpers over zero-padded ISO date strings (no date
// library), so testing them here covers the view's correctness without a browser.

function card(id: string, due: string | null): BoardViewCard {
  return { id, columnKey: "todo", position: 0, title: id, due, tags: [] };
}

test("isIsoDate accepts only zero-padded YYYY-MM-DD", () => {
  expect(isIsoDate("2026-06-22")).toBe(true);
  expect(isIsoDate("2026-6-2")).toBe(false); // not zero-padded
  expect(isIsoDate("2026/06/22")).toBe(false);
  expect(isIsoDate("")).toBe(false);
  expect(isIsoDate(null)).toBe(false);
  expect(isIsoDate(undefined)).toBe(false);
  expect(isIsoDate("garbage")).toBe(false);
});

test("shiftMonth crosses year boundaries", () => {
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  expect(shiftMonth("2026-06", 0)).toBe("2026-06");
  expect(shiftMonth("2026-06", -7)).toBe("2025-11");
});

test("currentMonth has YYYY-MM shape", () => {
  expect(currentMonth()).toMatch(/^\d{4}-\d{2}$/);
});

test("monthMatrix is a 6x7 grid of contiguous ISO days starting on the week boundary", () => {
  const weeks = monthMatrix("2026-06"); // Sunday-start by default
  expect(weeks).toHaveLength(6);
  for (const row of weeks) expect(row).toHaveLength(7);

  const flat = weeks.flat();
  for (const d of flat) expect(isIsoDate(d)).toBe(true);

  // Grid begins on a Sunday (weekStart = 0).
  expect(new Date(`${flat[0]}T00:00:00`).getDay()).toBe(0);

  // Days are strictly contiguous (each is the previous +1 calendar day).
  for (let i = 1; i < flat.length; i++) {
    const prev = new Date(`${flat[i - 1]}T00:00:00`);
    const cur = new Date(`${flat[i]}T00:00:00`);
    expect((cur.getTime() - prev.getTime()) / 86_400_000).toBe(1);
  }

  // Every day of June 2026 is present.
  for (let d = 1; d <= 30; d++) {
    expect(flat).toContain(`2026-06-${String(d).padStart(2, "0")}`);
  }
});

test("monthMatrix honors Monday week-start", () => {
  const weeks = monthMatrix("2026-06", 1);
  expect(new Date(`${weeks.flat()[0]}T00:00:00`).getDay()).toBe(1); // Monday
});

test("groupCardsByDay buckets by due and drops invalid/absent dates", () => {
  const cards = [
    card("a", "2026-06-10"),
    card("b", "2026-06-10"),
    card("c", "2026-06-11"),
    card("d", null),
    card("e", "not-a-date"),
  ];
  const byDay = groupCardsByDay(cards);
  expect([...byDay.keys()].sort()).toEqual(["2026-06-10", "2026-06-11"]);
  expect(byDay.get("2026-06-10")!.map((c) => c.id)).toEqual(["a", "b"]);
  expect(byDay.get("2026-06-11")!.map((c) => c.id)).toEqual(["c"]);
});
