// Single source of truth for resource (file) types in JType.
//
// Maps a file path/extension to a resource type, its viewer, and capabilities.
// Dependency-free (no React, no platform APIs) so it can be imported by both the
// desktop app (src/) and the web frontend, and unit-tested in isolation.
//
// This is the Phase-0 file-type registry described in internal-docs/resources/prd.md.
// New surfaces (tree icons, resource viewers, the "New resource" picker) read from
// here instead of re-deriving extension checks. Existing markdown extension lists are
// kept identical so behaviour does not change for Markdown.

/** Coarse storage/sync tier (see PRD §3.3). */
export type ResourceTier = "text" | "asset" | "app";

/** Concrete resource type id. */
export type ResourceTypeId =
  | "markdown"
  | "image"
  | "pdf"
  | "generic"
  | "board"
  | "mermaid"
  | "drawio"
  | "excalidraw"
  | "swagger";

/** Which viewer/editor surface renders this type. */
export type ViewerId =
  | "markdown"
  | "image"
  | "pdf"
  | "none"
  | "board"
  | "mermaid"
  | "drawio"
  | "excalidraw"
  | "swagger";

export interface ResourceTypeDef {
  id: ResourceTypeId;
  /** Human label (English source string; localize at the call site if needed). */
  label: string;
  tier: ResourceTier;
  /** Lowercase extensions without the leading dot. */
  extensions: string[];
  /** Representative MIME type, used when building viewer `src` URLs. */
  mime: string;
  viewer: ViewerId;
  /** Whether the type supports in-app editing today. */
  editable: boolean;
  /** Whether the type can be previewed/rendered in-app today. */
  previewable: boolean;
}

/** Markdown — the original first-class text document type. */
const MARKDOWN: ResourceTypeDef = {
  id: "markdown",
  label: "Markdown",
  tier: "text",
  extensions: ["md", "markdown", "mdown", "mkd"],
  mime: "text/markdown",
  viewer: "markdown",
  editable: true,
  previewable: true,
};

/** Image assets. These + pdf mirror the desktop `is_asset_path` allowlist
 * (services/jtype-core) and the server `content_type_for` (jtype-web blobs);
 * keep all three in sync or the omitted type silently never syncs. */
const IMAGE: ResourceTypeDef = {
  id: "image",
  label: "Image",
  tier: "asset",
  extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "ico"],
  mime: "image/*",
  viewer: "image",
  editable: false,
  previewable: true,
};

/** PDF documents. */
const PDF: ResourceTypeDef = {
  id: "pdf",
  label: "PDF",
  tier: "asset",
  extensions: ["pdf"],
  mime: "application/pdf",
  viewer: "pdf",
  editable: false,
  previewable: true,
};

/** Fallback for any recognized-but-unsupported file. */
const GENERIC: ResourceTypeDef = {
  id: "generic",
  label: "File",
  tier: "asset",
  extensions: [],
  mime: "application/octet-stream",
  viewer: "none",
  editable: false,
  previewable: false,
};

/** Kanban board view — a `.board` JSON file that groups card-notes by status. */
const BOARD: ResourceTypeDef = {
  id: "board",
  label: "Board",
  tier: "app",
  extensions: ["board"],
  mime: "application/json",
  viewer: "board",
  editable: false,
  previewable: true,
};

/**
 * Mermaid diagram source (`.mmd`). A text document with a live diagram preview
 * and source editing (reuses the same Mermaid renderer as fenced code blocks).
 */
const MERMAID: ResourceTypeDef = {
  id: "mermaid",
  label: "Mermaid",
  tier: "text",
  extensions: ["mmd", "mermaid"],
  mime: "text/vnd.mermaid",
  viewer: "mermaid",
  editable: true,
  previewable: true,
};

/**
 * Draw.io / diagrams.net diagram (`.drawio`, mxGraph XML). Rendered read-only
 * and fully offline; `.drawio.svg` / `.drawio.png` exports are plain images and
 * keep flowing through the image viewer.
 */
const DRAWIO: ResourceTypeDef = {
  id: "drawio",
  label: "Draw.io",
  tier: "text",
  extensions: ["drawio"],
  mime: "application/vnd.jgraph.mxfile",
  viewer: "drawio",
  editable: false,
  previewable: true,
};

/** Excalidraw drawing (`.excalidraw`, JSON). Full in-app canvas editing. */
const EXCALIDRAW: ResourceTypeDef = {
  id: "excalidraw",
  label: "Excalidraw",
  tier: "text",
  extensions: ["excalidraw"],
  mime: "application/vnd.excalidraw+json",
  viewer: "excalidraw",
  editable: true,
  previewable: true,
};

/**
 * Swagger / OpenAPI spec, rendered read-only as API docs. Detected by filename
 * convention (e.g. `swagger.json`, `openapi.yaml`, `petstore.openapi.yml`) so we
 * never hijack every `.json` / `.yaml` file — see `SWAGGER_FILENAME` below.
 */
const SWAGGER: ResourceTypeDef = {
  id: "swagger",
  label: "Swagger / OpenAPI",
  tier: "text",
  // Concrete extensions are handled via SWAGGER_FILENAME (double extensions like
  // `.swagger.json`), so this list is intentionally empty for the BY_EXT map.
  extensions: [],
  mime: "application/yaml",
  viewer: "swagger",
  editable: false,
  previewable: true,
};

/**
 * Filename convention for Swagger/OpenAPI specs. Matches `swagger`/`openapi`
 * (optionally as a secondary `.swagger` / `.openapi` extension) followed by a
 * json/yaml/yml extension: `swagger.json`, `openapi.yaml`, `api.swagger.yml`,
 * `petstore-openapi.json`.
 */
const SWAGGER_FILENAME = /(?:^|[.\-_])(?:swagger|openapi)\.(?:json|ya?ml)$/i;

/** True when a path is a Swagger/OpenAPI spec by filename convention. */
export function isSwaggerPath(path: string): boolean {
  const base = path.split(/[\\/]/).pop() ?? path;
  return SWAGGER_FILENAME.test(base);
}

/** Ordered registry (markdown first, then board, then text diagrams, then assets). */
export const RESOURCE_TYPES: ResourceTypeDef[] = [
  MARKDOWN,
  BOARD,
  MERMAID,
  DRAWIO,
  EXCALIDRAW,
  SWAGGER,
  IMAGE,
  PDF,
];

/** Per-extension MIME overrides so viewers get a precise `src` content type. */
const EXACT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  pdf: "application/pdf",
};

const BY_EXT: Record<string, ResourceTypeDef> = (() => {
  const map: Record<string, ResourceTypeDef> = {};
  for (const def of RESOURCE_TYPES) {
    for (const ext of def.extensions) map[ext] = def;
  }
  return map;
})();

/** Lowercase extension without the dot, or "" if none. */
export function extname(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? path;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** Resolve the resource type for a path, falling back to the generic file type. */
export function resourceTypeForPath(path: string): ResourceTypeDef {
  // Swagger/OpenAPI specs are detected by filename convention (double extensions
  // like `.swagger.json`) before the extension map, so a `.json`/`.yaml` spec is
  // recognised without claiming every JSON/YAML file.
  if (isSwaggerPath(path)) return SWAGGER;
  return BY_EXT[extname(path)] ?? GENERIC;
}

/** Precise MIME for a path, suitable for an object/data URL `src`. */
export function mimeForPath(path: string): string {
  return EXACT_MIME[extname(path)] ?? resourceTypeForPath(path).mime;
}

export function isMarkdownPath(path: string): boolean {
  return resourceTypeForPath(path).id === "markdown";
}

/** True for `.board` kanban view files (JSON config over card-notes). */
export function isBoardPath(path: string): boolean {
  return resourceTypeForPath(path).id === "board";
}

export function isImagePath(path: string): boolean {
  return resourceTypeForPath(path).id === "image";
}

export function isPdfPath(path: string): boolean {
  return resourceTypeForPath(path).id === "pdf";
}

/**
 * A "binary document" is a non-text file that is a FIRST-CLASS document: it
 * appears as a standalone entry in the file tree and opens in its own viewer,
 * as opposed to images (which are inline markdown attachments, not tree
 * entries). Binary documents sync via the blob channel (document_blobs), NOT
 * the text-document channel — so they are deliberately excluded from
 * `syncsAsDocument`. Currently PDF only; extend here as new types are added.
 * Mirrors `is_binary_document_path` in jtype-core and jtype-web (Rust) — keep
 * the three in lockstep (see the cross-language fixture test).
 */
export function isBinaryDocumentPath(path: string): boolean {
  return isPdfPath(path);
}

export function isMermaidPath(path: string): boolean {
  return resourceTypeForPath(path).id === "mermaid";
}

export function isDrawioPath(path: string): boolean {
  return resourceTypeForPath(path).id === "drawio";
}

export function isExcalidrawPath(path: string): boolean {
  return resourceTypeForPath(path).id === "excalidraw";
}

/**
 * A "diagram" resource is a text-based file (Mermaid, Draw.io, Excalidraw, or
 * Swagger/OpenAPI) that renders in a dedicated in-app viewer/editor instead of
 * the Markdown editor. These ride the same text/document sync path as Markdown
 * (they are not binary assets). Mirrors `is_diagram_path` in jtype-core (Rust).
 */
export function isDiagramTextPath(path: string): boolean {
  const id = resourceTypeForPath(path).id;
  return id === "mermaid" || id === "drawio" || id === "excalidraw" || id === "swagger";
}

/**
 * Single source of truth for "files that sync through the document pipeline as
 * opaque text" — Markdown notes, `.board` kanban views, and diagram resources.
 * Every place that decides the synced document set must use THIS predicate, not
 * an inline extension check, so the client agrees with the server and desktop.
 * Mirrors `is_syncable_document_path` in jtype-core (Rust) and jtype-web (Rust);
 * keep all three in lockstep — see the cross-language fixture test.
 */
export function syncsAsDocument(path: string): boolean {
  return isMarkdownPath(path) || isBoardPath(path) || isDiagramTextPath(path);
}

/** True when the resource supports in-app editing (and writes back to the file). */
export function isEditableResourcePath(path: string): boolean {
  return resourceTypeForPath(path).editable;
}

/**
 * A "viewable asset" is a recognized non-text file with a dedicated viewer
 * (image or pdf). This matches the desktop `is_asset_path` allowlist that the
 * file tree currently surfaces as `EntryKind::Asset`.
 */
export function isViewableAssetPath(path: string): boolean {
  const def = resourceTypeForPath(path);
  return def.tier === "asset" && def.viewer !== "none";
}
