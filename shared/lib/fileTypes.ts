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
export type ResourceTypeId = "markdown" | "image" | "pdf" | "generic" | "board";

/** Which viewer/editor surface renders this type. */
export type ViewerId = "markdown" | "image" | "pdf" | "none" | "board";

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

/** Image assets. The first 6 + pdf below match the desktop `is_asset_path` allowlist. */
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

/** Ordered registry (markdown first, then board, then assets). */
export const RESOURCE_TYPES: ResourceTypeDef[] = [MARKDOWN, BOARD, IMAGE, PDF];

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
  return BY_EXT[extname(path)] ?? GENERIC;
}

/** Precise MIME for a path, suitable for an object/data URL `src`. */
export function mimeForPath(path: string): string {
  return EXACT_MIME[extname(path)] ?? resourceTypeForPath(path).mime;
}

export function isMarkdownPath(path: string): boolean {
  return resourceTypeForPath(path).id === "markdown";
}

export function isImagePath(path: string): boolean {
  return resourceTypeForPath(path).id === "image";
}

export function isPdfPath(path: string): boolean {
  return resourceTypeForPath(path).id === "pdf";
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
