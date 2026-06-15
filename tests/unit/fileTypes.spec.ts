import { test, expect } from "@playwright/test";
import {
  syncsAsDocument,
  isBoardPath,
  isMarkdownPath,
  isDiagramTextPath,
  isBinaryDocumentPath,
  isImagePath,
} from "../../shared/lib/fileTypes";

// Cross-language guard. This fixture MUST MATCH the Rust fixture in
// services/jtype-core/src/lib.rs (test
// `syncable_document_predicate_covers_all_synced_text_types`) and the jtype-web
// `is_syncable_document_path`. The three predicates decide "which files sync as
// documents"; any drift between them is a silent sync-loss bug (e.g. the .board
// download regression). If you add a synced type here, add it in Rust too.
const SYNCABLE = [
  "note.md",
  "a.markdown",
  "23232.board",
  "flow.mmd",
  "diagram.mermaid",
  "arch.drawio",
  "sketch.excalidraw",
  "swagger.json",
  "petstore-openapi.yaml",
];
const NOT_SYNCABLE = [
  "photo.png",
  "doc.pdf",
  "data.csv",
  "notes.txt",
  "archive.zip",
  "image.drawio.svg", // a Draw.io export image — an asset, not a synced document
];

test("syncsAsDocument covers exactly the synced-document type set", () => {
  for (const p of SYNCABLE) expect(syncsAsDocument(p), `${p} should sync`).toBe(true);
  for (const p of NOT_SYNCABLE) expect(syncsAsDocument(p), `${p} should not sync`).toBe(false);
});

test("syncsAsDocument == markdown || board || diagram", () => {
  for (const p of [...SYNCABLE, ...NOT_SYNCABLE]) {
    expect(syncsAsDocument(p)).toBe(isMarkdownPath(p) || isBoardPath(p) || isDiagramTextPath(p));
  }
});

// First-class binary documents (tree entries, blob channel) vs inline images.
// MUST MATCH the Rust fixture in services/jtype-core/src/lib.rs
// (`binary_document_predicate_is_pdf_only`).
test("isBinaryDocumentPath = pdf only; images are not binary documents", () => {
  for (const p of ["doc.pdf", "reports/q3.PDF"]) expect(isBinaryDocumentPath(p), `${p} is a binary document`).toBe(true);
  for (const p of ["note.md", "photo.png", "logo.svg", "flow.mmd", "23232.board"]) {
    expect(isBinaryDocumentPath(p), `${p} is not a binary document`).toBe(false);
  }
  for (const p of ["photo.png", "logo.svg", "a.jpeg", "icon.webp"]) expect(isImagePath(p), `${p} is an image`).toBe(true);
  expect(isImagePath("doc.pdf")).toBe(false);
  // binary documents sync via the blob channel, NOT the text-document channel.
  expect(syncsAsDocument("doc.pdf")).toBe(false);
});
