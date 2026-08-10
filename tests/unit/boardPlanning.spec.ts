import { expect, test } from "@playwright/test";
import { applyBoardCardPatch, blockingCardIds, parseBoardDocumentConfig, type BoardViewCard } from "../../shared/lib/board";
import { parseFrontmatter } from "../../shared/lib/frontmatter";
import {
  boardBacklogGroups,
  boardGanttItem,
  boardGanttRange,
  boardInboxItems,
  boardMyWorkCards,
  extractBoardMentions,
  MAX_GANTT_DAYS,
  reconcileDismissedInboxKeys,
} from "../../shared/lib/boardPlanning";

function card(id: string, patch: Partial<BoardViewCard> = {}): BoardViewCard {
  return {
    id,
    columnKey: "todo",
    position: 0,
    title: id,
    tags: [],
    ...patch,
  };
}

test("board config parsing rejects crash-prone shapes and supplies a legacy title fallback", () => {
  expect(() => parseBoardDocumentConfig('{"id":"broken"}')).toThrow(/columns/);
  expect(() => parseBoardDocumentConfig('{"id":"broken","columns":[null]}')).toThrow(/columns/);
  expect(parseBoardDocumentConfig('{"id":"roadmap","columns":[]}', "Roadmap")).toMatchObject({
    id: "roadmap",
    title: "Roadmap",
    columns: [],
  });
});

test("planning, archive, labels, attachments and relations round-trip through Card frontmatter", () => {
  const content = applyBoardCardPatch("---\nboard: launch\nstatus: todo\n---\nBody", {
    start: "2026-08-11",
    due: "2026-08-18",
    reminder: "2026-08-15",
    archived: true,
    tags: [{ label: "release" }],
    attachments: ["https://example.com/spec.pdf", "assets/plan.png"],
    blockedBy: ["launch/api"],
    relates: ["launch/docs"],
  });
  const parsed = parseFrontmatter(content);
  expect(parsed.data).toMatchObject({
    start: "2026-08-11",
    due: "2026-08-18",
    reminder: "2026-08-15",
    archived: "true",
    tags: "release",
    attachments: "https://example.com/spec.pdf, assets/plan.png",
    blocked_by: "[[launch/api]]",
    relates: "[[launch/docs]]",
  });
  expect(parsed.body.trim()).toBe("Body");
});

test("Gantt uses the project window, bars, milestones and unscheduled Cards", () => {
  const cards = [
    card("bar", { start: "2026-08-12", due: "2026-08-16" }),
    card("milestone", { due: "2026-08-20" }),
    card("unscheduled"),
  ];
  const range = boardGanttRange(cards, { startDate: "2026-08-10", targetDate: "2026-08-31" }, "2026-08-11");
  expect(range.start).toBe("2026-08-10");
  expect(range.end).toBe("2026-09-10");
  expect(boardGanttItem(cards[0]!, range)).toMatchObject({ offset: 2, span: 5, milestone: false });
  expect(boardGanttItem(cards[1]!, range)).toMatchObject({ offset: 10, span: 1, milestone: true });
  expect(boardGanttItem(cards[2]!, range)).toBeNull();
});

test("Gantt bounds hostile date spans and keeps out-of-window cards out of the rendered grid", () => {
  const ancient = card("ancient", { start: "1900-01-01", due: "1900-01-02" });
  const distant = card("distant", { due: "9999-12-31" });
  const range = boardGanttRange([ancient, distant], undefined, "2026-08-11");
  expect(range.days).toBe(MAX_GANTT_DAYS);
  expect(boardGanttItem(ancient, range)).toBeNull();
  expect(boardGanttItem(distant, range)).toBeNull();
});

test("Backlog and My Work project the same Card identities", () => {
  const cards = [
    card("mine", { assignee: "Jack", due: "2026-08-12", priority: "high" }),
    card("done", { columnKey: "done", assignee: "jack" }),
    card("archived", { assignee: "jack", archived: true }),
  ];
  expect(boardBacklogGroups(cards, [{ key: "todo", name: "Todo" }, { key: "done", name: "Done" }]))
    .toEqual([
      { key: "todo", name: "Todo", cards: [cards[0]] },
      { key: "done", name: "Done", cards: [cards[1]] },
    ]);
  expect(boardMyWorkCards(cards, "jack", "done").map((item) => item.id)).toEqual(["mine"]);
});

test("Backlog never duplicates archived Cards with unknown statuses", () => {
  const archived = card("archived", { archived: true, columnKey: "retired" });
  const groups = boardBacklogGroups([archived], [{ key: "todo", name: "Todo" }]);
  expect(groups.flatMap((group) => group.cards)).toEqual([]);
});

test("My Work prioritizes overdue, due today, blocked, then remaining work", () => {
  const cards = [
    card("remaining", { assignee: "jack", priority: "urgent" }),
    card("blocked", { assignee: "jack", priority: "low" }),
    card("today", { assignee: "jack", due: "2026-08-11" }),
    card("overdue", { assignee: "jack", due: "2026-08-10" }),
  ];
  expect(boardMyWorkCards(cards, "jack", "done", "2026-08-11", new Set(["blocked"])).map((item) => item.id))
    .toEqual(["overdue", "today", "blocked", "remaining"]);
});

test("mentions ignore code, links, URLs and email domains while Inbox reason keys change with their cause", () => {
  expect(extractBoardMentions("Hi @Jack, mail dev@example.com, `@inline`, ```\n@block\n```, [@link](/@target), /@path and @release.bot"))
    .toEqual(["jack", "release.bot"]);
  const cards = [
    card("release", {
      assignee: "jack",
      notes: "Please review @Jack",
      reminder: "2026-08-10",
      due: "2026-08-11",
      blockedBy: ["api"],
    }),
  ];
  const items = boardInboxItems({
    cards,
    currentUser: "jack",
    today: "2026-08-11",
    blockedCardIds: new Set(["release"]),
  });
  expect(items.map((item) => item.kind).sort()).toEqual(["blocked", "due", "mention", "reminder"]);
  const dismissed = new Set([items.find((item) => item.kind === "reminder")!.key]);
  expect(boardInboxItems({ cards, currentUser: "jack", today: "2026-08-11", dismissedKeys: dismissed }))
    .not.toContainEqual(expect.objectContaining({ kind: "reminder" }));

  const completed = card("completed", {
    columnKey: "done",
    assignee: "jack",
    notes: "Follow up with @jack",
    reminder: "2026-08-01",
    due: "2026-08-01",
    blockedBy: ["api"],
  });
  expect(boardInboxItems({
    cards: [completed],
    currentUser: "jack",
    today: "2026-08-11",
    doneColumn: "done",
    blockedCardIds: new Set(["completed"]),
  }).map((item) => item.kind)).toEqual(["mention"]);
});

test("Inbox dismissal and blocker reason keys follow the exact active signal", () => {
  const mentioned = card("release", { assignee: "jack", notes: "Ping @jack" });
  const mentionItems = boardInboxItems({ cards: [mentioned], currentUser: "jack", today: "2026-08-11" });
  const mentionKey = mentionItems[0]!.key;
  expect(reconcileDismissedInboxKeys([mentionKey], [])).toEqual([]);
  expect(boardInboxItems({ cards: [mentioned], currentUser: "jack", today: "2026-08-11", dismissedKeys: new Set() }))
    .toContainEqual(expect.objectContaining({ key: mentionKey }));
  const changedMention = boardInboxItems({
    cards: [card("release", { assignee: "jack", notes: "@jack please review the revised plan" })],
    currentUser: "jack",
    today: "2026-08-11",
  })[0]!.key;
  expect(changedMention).not.toBe(mentionKey);

  const firstCards = [
    card("release", { assignee: "jack" }),
    card("api", { blocks: ["release"] }),
  ];
  const firstBlockers = blockingCardIds(firstCards, "done");
  const first = boardInboxItems({
    cards: firstCards,
    currentUser: "jack",
    today: "2026-08-11",
    blockedCardIds: new Set(firstBlockers.keys()),
    blockerCardIds: firstBlockers,
  }).find((item) => item.kind === "blocked")!;

  const secondCards = [
    card("release", { assignee: "jack" }),
    card("database", { blocks: ["release"] }),
  ];
  const secondBlockers = blockingCardIds(secondCards, "done");
  const second = boardInboxItems({
    cards: secondCards,
    currentUser: "jack",
    today: "2026-08-11",
    blockedCardIds: new Set(secondBlockers.keys()),
    blockerCardIds: secondBlockers,
  }).find((item) => item.kind === "blocked")!;
  expect(first.key).not.toBe(second.key);
});
