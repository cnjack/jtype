import { test, expect } from "@playwright/test";
import {
  parseLinks,
  serializeLinks,
  cardSlug,
  blockedCounts,
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
