import { test, expect } from "@playwright/test";
import { parseAttachments, serializeAttachments, attachmentName } from "../../shared/lib/board";

// Pure-logic acceptance for B3 attachments: round-trip + display name. The Rust
// parse_attachments (services/jtype-core/src/lib.rs) must stay in sync.

test("parseAttachments splits comma-separated values, trims, drops empties", () => {
  expect(parseAttachments("https://x.com/a.pdf, design/b.png")).toEqual(["https://x.com/a.pdf", "design/b.png"]);
  expect(parseAttachments(" one ,, two ")).toEqual(["one", "two"]);
  expect(parseAttachments("")).toEqual([]);
});

test("serializeAttachments round-trips with parseAttachments", () => {
  const list = ["https://x.com/a.pdf", "notes/b.md"];
  expect(parseAttachments(serializeAttachments(list))).toEqual(list);
  expect(serializeAttachments([])).toBe("");
});

test("attachmentName is the decoded basename without query string", () => {
  expect(attachmentName("https://cdn.example.com/files/spec.pdf")).toBe("spec.pdf");
  expect(attachmentName("design/mockups/home.png")).toBe("home.png");
  expect(attachmentName("https://x.com/a.pdf?token=abc")).toBe("a.pdf");
  expect(attachmentName("https://x.com/My%20Doc.pdf")).toBe("My Doc.pdf");
  expect(attachmentName("plain")).toBe("plain");
});
