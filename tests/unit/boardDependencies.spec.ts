import { test, expect } from "@playwright/test";
import {
  parseLinks,
  serializeLinks,
  cardSlug,
  cardRelationKey,
  blockedCounts,
  childCardsByParent,
  newCardLaneValue,
  type BoardViewCard,
} from "../../shared/lib/board";

// Pure-logic acceptance for D1 card dependencies. The "blocked" badge and the
// frontmatter round-trip are built entirely from these helpers, so testing them
// covers the feature's correctness without a browser. The Rust `parse_card_links`
// must stay in sync (services/jtype-core/src/lib.rs).

function c(id: string, columnKey: string, extra: Partial<BoardViewCard> = {}): BoardViewCard {
  return { id, columnKey, position: 0, title: id, tags: [], ...extra };
}

test("parseLinks unwraps [[ ]] and tolerates plain slugs", () => {
  expect(parseLinks("[[a]], [[b]]")).toEqual(["a", "b"]);
  expect(parseLinks("a, b")).toEqual(["a", "b"]);
  expect(parseLinks("  [[x]]  ")).toEqual(["x"]);
  expect(parseLinks("")).toEqual([]);
  expect(parseLinks("[[a]], , [[b]]")).toEqual(["a", "b"]);
});

test("serializeLinks round-trips with parseLinks", () => {
  expect(serializeLinks(["a", "b"])).toBe("[[a]], [[b]]");
  expect(serializeLinks([])).toBe("");
  expect(parseLinks(serializeLinks(["login-page", "api"]))).toEqual(["login-page", "api"]);
});

test("cardSlug is the basename without .md, across path separators", () => {
  expect(cardSlug(c("vault/sub/login-page.md", "todo"))).toBe("login-page");
  expect(cardSlug(c("card-1", "todo"))).toBe("card-1");
  expect(cardSlug(c("a\\b\\c.md", "todo"))).toBe("c");
});

test("cardRelationKey keeps the normalized relative path", () => {
  expect(cardRelationKey(c("vault/sub/login-page.md", "todo"))).toBe("vault/sub/login-page");
  expect(cardRelationKey(c("./card-1.md", "todo"))).toBe("card-1");
  expect(cardRelationKey(c("a\\b\\c.md", "todo"))).toBe("a/b/c");
  expect(
    cardRelationKey(
      c("/Users/jack/vault/roadmap/login-page.md", "todo", {
        relationKey: "roadmap/login-page.md",
      }),
    ),
  ).toBe("roadmap/login-page");
});

test("newCardLaneValue uses the final nullable create-dialog value", () => {
  expect(newCardLaneValue("status", "todo", { columnKey: "doing" })).toBe("doing");
  expect(newCardLaneValue("priority", "high", { priority: null })).toBe("none");
  expect(newCardLaneValue("assignee", "Jack", { assignee: null })).toBe("");
  expect(newCardLaneValue("custom", "platform", { swimlaneKey: null })).toBe("");
  expect(newCardLaneValue("assignee", "Jack", {})).toBe("Jack");
});

test("blockedCounts: a card is blocked by unfinished blockers only", () => {
  const cards = [
    c("a.md", "todo", { blockedBy: ["b"] }),
    c("b.md", "todo"),
  ];
  expect(blockedCounts(cards).get("a.md")).toBe(1);

  const done = [
    c("a.md", "todo", { blockedBy: ["b"] }),
    c("b.md", "done"),
  ];
  expect(blockedCounts(done).has("a.md")).toBe(false); // blocker finished
});

test("blockedCounts: reverse `blocks` edges count too, and dedup", () => {
  // c.blocks → a, plus a.blockedBy → c: still one distinct blocker.
  const cards = [
    c("a.md", "todo", { blockedBy: ["c"] }),
    c("c.md", "todo", { blocks: ["a"] }),
  ];
  expect(blockedCounts(cards).get("a.md")).toBe(1);

  // Two distinct unfinished blockers → count 2.
  const two = [
    c("a.md", "todo", { blockedBy: ["b", "c"] }),
    c("b.md", "todo"),
    c("c.md", "doing"),
  ];
  expect(blockedCounts(two).get("a.md")).toBe(2);
});

test("blockedCounts: unresolved slugs and self-references are ignored", () => {
  const cards = [
    c("a.md", "todo", { blockedBy: ["ghost", "a"] }), // missing card + self
    c("b.md", "todo", { blockedBy: [] }),
  ];
  expect(blockedCounts(cards).has("a.md")).toBe(false);
});

test("blockedCounts honors a custom done column", () => {
  const cards = [
    c("a.md", "todo", { blockedBy: ["b"] }),
    c("b.md", "shipped"),
  ];
  expect(blockedCounts(cards, "shipped").has("a.md")).toBe(false);
  expect(blockedCounts(cards, "done").get("a.md")).toBe(1);
});

test("dependency references prefer exact paths and keep unique legacy basenames", () => {
  const cards = [
    c("roadmap/one/api.md", "todo"),
    c("roadmap/two/api.md", "todo"),
    c("roadmap/client.md", "todo", { blockedBy: ["roadmap/two/api"] }),
    c("roadmap/legacy.md", "todo", { blockedBy: ["client"] }),
    c("roadmap/ambiguous.md", "todo", { blockedBy: ["api"] }),
  ];
  expect(blockedCounts(cards).get("roadmap/client.md")).toBe(1);
  expect(blockedCounts(cards).get("roadmap/legacy.md")).toBe(1);
  expect(blockedCounts(cards).has("roadmap/ambiguous.md")).toBe(false);
});

test("dependency path suffixes resolve only when unique", () => {
  const unique = [
    c("vault/roadmap/one/api.md", "todo"),
    c("vault/roadmap/client.md", "todo", { blockedBy: ["roadmap/one/api"] }),
  ];
  expect(blockedCounts(unique).get("vault/roadmap/client.md")).toBe(1);

  const ambiguous = [
    ...unique,
    c("archive/roadmap/one/api.md", "todo"),
  ];
  expect(blockedCounts(ambiguous).has("vault/roadmap/client.md")).toBe(false);
});

test("sub-card parents use exact paths and resolve legacy basenames only when unique", () => {
  const cards = [
    c("roadmap/one/epic.md", "todo"),
    c("roadmap/two/epic.md", "todo"),
    c("roadmap/one/child.md", "todo", { parent: "roadmap/one/epic" }),
    c("roadmap/legacy-parent.md", "todo"),
    c("roadmap/legacy-child.md", "todo", { parent: "legacy-parent" }),
    c("roadmap/ambiguous-child.md", "todo", { parent: "epic" }),
  ];
  const children = childCardsByParent(cards);
  expect(children.get("roadmap/one/epic.md")?.map((card) => card.id)).toEqual([
    "roadmap/one/child.md",
  ]);
  expect(children.get("roadmap/legacy-parent.md")?.map((card) => card.id)).toEqual([
    "roadmap/legacy-child.md",
  ]);
  expect(
    [...children.values()].flat().some((card) => card.id === "roadmap/ambiguous-child.md"),
  ).toBe(false);
});
