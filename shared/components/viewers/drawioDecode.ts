// Decode a `.drawio` (diagrams.net) file's `<mxfile>` envelope into the plain
// `<mxGraphModel>` XML that @maxgraph/core can import. Dependency-light: only
// `fflate` for the raw-DEFLATE step.
//
// A `.drawio` file is `<mxfile><diagram ...>BODY</diagram></mxfile>` where BODY is
// either (a) plain `<mxGraphModel>` XML, or (b) compressed as
// base64( rawDeflate( encodeURIComponent(xml) ) ). Note it is RAW deflate (no
// zlib header), so fflate's `inflateSync` (raw) is the correct call.
import { inflateSync, strFromU8 } from "fflate";

/** Thrown when a `.drawio` file cannot be parsed into renderable XML. */
export class DrawioDecodeError extends Error {}

function inflateRawToString(base64Body: string): string {
  const binary = atob(base64Body);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  // fflate `inflateSync` expands raw DEFLATE (no zlib/gzip wrapper).
  return strFromU8(inflateSync(bytes));
}

/**
 * Extract the first page's `<mxGraphModel>` XML from a `.drawio` file's text.
 * Handles uncompressed and compressed diagrams, multi-page files (first page),
 * and bare `<mxGraphModel>` documents without an `<mxfile>` wrapper.
 */
export function extractMxGraphXml(fileText: string): string {
  const text = (fileText ?? "").trim();
  if (!text) throw new DrawioDecodeError("Empty diagram.");
  // Already a bare model document.
  if (text.startsWith("<mxGraphModel")) return text;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(text, "text/xml");
  } catch {
    throw new DrawioDecodeError("Could not parse the diagram XML.");
  }
  if (doc.querySelector("parsererror")) {
    throw new DrawioDecodeError("Could not parse the diagram XML.");
  }

  const diagram = doc.querySelector("diagram");
  const body = (diagram?.textContent ?? "").trim();

  if (body) {
    // Uncompressed inline model.
    if (body.startsWith("<")) return body;
    // Compressed: base64 -> raw inflate -> URI-decode.
    try {
      return decodeURIComponent(inflateRawToString(body));
    } catch {
      throw new DrawioDecodeError("Could not decompress the diagram data.");
    }
  }

  // Some files embed the model directly (no <diagram> child).
  const model = doc.querySelector("mxGraphModel");
  if (model) return new XMLSerializer().serializeToString(model);

  throw new DrawioDecodeError("No diagram content found in this file.");
}
