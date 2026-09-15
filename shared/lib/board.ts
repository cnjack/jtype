// Platform-agnostic board model + pure helpers shared by the desktop board
// (markdown files) and the web kanban (REST DB). The presentational board
// components in shared/components/board render this model; each platform adapts
// its own data layer into it. See internal-docs/web-board-alignment/design.md.

import { parseFrontmatter, writeFrontmatter } from "./frontmatter";

export type BoardViewColumn = {
  key: string;
  name: string;
  color?: string | null;
  /** Optional WIP limit; the column flags when its card count exceeds this. */
  limit?: number | null;
};

export type BoardGroupKey = "status" | "priority" | "assignee";
export type BoardSwimlaneGroupKey = BoardGroupKey | "custom";
export type BoardSortKey = "manual" | "due" | "priority" | "title";
export type BoardViewType = "board" | "table" | "calendar" | "backlog" | "gantt";
export type CalendarMode = "month" | "agenda";
export type BoardWorkScope = "all" | "my-work" | "inbox";

/** Persistent, user-editable swimlane definition stored in a `.board` file. */
export type BoardSwimlane = {
  /** Immutable machine identity referenced by card frontmatter `swimlane`. */
  key: string;
  name: string;
  color?: string | null;
};

/** Persisted while a derived priority/assignee view is converted to custom lanes. */
export type SwimlaneMigration = {
  version: 1;
  source: "priority" | "assignee";
  mapping: Array<{ value: string; swimlaneKey: string }>;
};

export type BoardFieldType = "text" | "number" | "date";
/** A user-defined custom field on a board's cards (stored in frontmatter / properties). */
export type BoardFieldDef = { key: string; label: string; type?: BoardFieldType };

/** Lightweight project facts stored in the `.board` document. */
export type BoardProjectMetadata = {
  key?: string;
  summary?: string;
  startDate?: string;
  targetDate?: string;
};

export type BoardViewConfig = {
  title: string;
  columns: BoardViewColumn[];
  /** Shared project facts; personal display state is intentionally separate. */
  project?: BoardProjectMetadata;
  /** Column key treated as terminal/done (suppresses overdue styling). */
  doneColumn?: string;
  /** Tint each column header by its (or an auto) color. */
  colorColumns?: boolean;
  viewType?: BoardViewType;
  groupBy?: BoardGroupKey;
  /** Sub-mode for the calendar view (month grid vs agenda list). Defaults to "month". */
  calendarMode?: CalendarMode;
  /** User-defined custom fields shown/edited on cards (board-level schema). */
  fields?: BoardFieldDef[];
  /**
   * Board-level label definitions giving tags an explicit color. A card references
   * a label by its `label` text in frontmatter `tags`; a tag with no matching
   * definition (or a definition with no color) falls back to a deterministic
   * auto-color, so tags are colored with zero config.
   */
  labels?: BoardLabelDef[];
  /** Board ticket-id prefix (e.g. `OCCSV`) for per-card `OCCSV-3371` ticket links. */
  ticketKey?: string;
  /**
   * Active custom swimlane mode. Historical configs may also contain
   * status/priority/assignee here from the retired two-dimensional layout;
   * those values now render as the single vertical swimlane dimension.
   */
  swimlaneBy?: BoardSwimlaneGroupKey;
  /** Persistent definitions used by custom vertical swimlanes. */
  swimlanes?: BoardSwimlane[];
  /** Present only while a derived-lane conversion is incomplete/retryable. */
  swimlaneMigration?: SwimlaneMigration;
};

/** Canonical synced `.board` JSON shape used by Desktop, Web, and board-react. */
export type BoardDocumentConfig = BoardViewConfig & {
  id: string;
};

/** Parse the shared `.board` JSON contract and reject shapes that would crash a surface. */
export function parseBoardDocumentConfig(content: string, fallbackTitle = "Untitled board"): BoardDocumentConfig {
  const value: unknown = JSON.parse(content);
  const isRecord = (candidate: unknown): candidate is Record<string, unknown> =>
    typeof candidate === "object" && candidate !== null && !Array.isArray(candidate);
  if (!isRecord(value)) throw new Error("Board configuration must be a JSON object.");
  if (typeof value.id !== "string" || value.id.trim() === "") {
    throw new Error("Board configuration is missing a non-empty id.");
  }
  if (!Array.isArray(value.columns) || value.columns.some((column) =>
    !isRecord(column) || typeof column.key !== "string" || typeof column.name !== "string"
  )) {
    throw new Error("Board configuration must contain columns with string key and name values.");
  }
  const objectArrays: Array<[string, readonly string[]]> = [
    ["fields", ["key", "label"]],
    ["labels", ["label"]],
    ["swimlanes", ["key", "name"]],
  ];
  for (const [field, requiredStrings] of objectArrays) {
    const candidate = value[field];
    if (candidate === undefined) continue;
    if (!Array.isArray(candidate) || candidate.some((entry) =>
      !isRecord(entry) || requiredStrings.some((key) => typeof entry[key] !== "string")
    )) {
      throw new Error(`Board configuration has an invalid ${field} array.`);
    }
  }
  if (value.project !== undefined && !isRecord(value.project)) {
    throw new Error("Board configuration has invalid project metadata.");
  }
  if (value.swimlaneMigration !== undefined) {
    const migration = value.swimlaneMigration;
    if (!isRecord(migration) || !Array.isArray(migration.mapping) || migration.mapping.some((entry) =>
      !isRecord(entry) || typeof entry.value !== "string" || typeof entry.swimlaneKey !== "string"
    )) {
      throw new Error("Board configuration has an invalid swimlane migration.");
    }
  }
  return {
    ...value,
    id: value.id,
    title: typeof value.title === "string" && value.title.trim() ? value.title : fallbackTitle,
    columns: value.columns,
  } as BoardDocumentConfig;
}

export type BoardConfigIssue =
  | { kind: "duplicate_swimlane_key"; key: string }
  | { kind: "duplicate_swimlane_name"; name: string }
  | { kind: "dangling_swimlane"; key: string; cardCount: number };

export type BoardTag = { id?: string; label: string; color?: string | null };

/** A board-level label definition: a tag's text + its display color. */
export type BoardLabelDef = { label: string; color?: string | null };

export type BoardViewCard = {
  /** Stable id — desktop: absolute file path; web/embed: relative document path. */
  id: string;
  /**
   * Portable vault-relative document path used by persisted card relations.
   * Desktop supplies this separately because `id` is an absolute filesystem path.
   */
  relationKey?: string;
  /** Allocated ticket id (e.g. `OCCSV-3371`), cloud-indexed; shown as a card badge. */
  ticket?: string | null;
  /** The grouping value under the default (status) grouping. */
  columnKey: string;
  position: number;
  title: string;
  icon?: string | null;
  priority?: string | null;
  /** Display text (web resolves a member name; desktop uses free text). */
  assignee?: string | null;
  /** Stable custom swimlane identity from card frontmatter `swimlane`. */
  swimlaneKey?: string | null;
  /** Planned start day (`YYYY-MM-DD`), used by the Gantt projection. */
  start?: string | null;
  due?: string | null;
  /** Portable project reminder day (`YYYY-MM-DD`). */
  reminder?: string | null;
  /** Archived Cards remain Markdown documents but leave active projections. */
  archived?: boolean;
  tags: BoardTag[];
  /** Markdown body / description. */
  notes?: string;
  taskDone?: number;
  taskTotal?: number;
  excerpt?: string | null;
  /** Attachment URLs / vault paths (frontmatter `attachments`). */
  attachments?: string[];
  /** Values for the board's user-defined custom fields, keyed by field key. */
  custom?: Record<string, string>;
  /** Card slugs this card is blocked by (frontmatter `blocked_by`). */
  blockedBy?: string[];
  /** Card slugs this card blocks (frontmatter `blocks`). */
  blocks?: string[];
  /** Card slugs this card relates to, no direction (frontmatter `relates`). */
  relates?: string[];
  /** Parent card slug (frontmatter `parent`) — makes this card a sub-card. */
  parent?: string | null;
};

/** Parse a frontmatter `attachments` value (comma-separated URLs/paths) into a list. */
export function parseAttachments(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Serialize attachment URLs/paths back to a frontmatter value. */
export function serializeAttachments(list: string[]): string {
  return list.join(", ");
}

/**
 * Frontmatter owned by the normalized card model. Custom fields must never
 * overwrite these keys, including aliases used by component-level patches.
 */
const RESERVED_CARD_FRONTMATTER_KEYS = new Set([
  "id",
  "relationKey",
  "board",
  "ticket",
  "title",
  "status",
  "columnKey",
  "position",
  "priority",
  "assignee",
  "swimlane",
  "swimlaneKey",
  "start",
  "due",
  "reminder",
  "archived",
  "icon",
  "tags",
  "attachments",
  "notes",
  "taskDone",
  "taskTotal",
  "excerpt",
  "blocked_by",
  "blockedBy",
  "blocks",
  "relates",
  "parent",
]);

/**
 * Apply a normalized card patch to Markdown frontmatter. Keeping this mapping
 * shared prevents Desktop, Web, and board-react from drifting on core fields.
 */
export function applyBoardCardPatch(content: string, patch: Partial<BoardViewCard>): string {
  const { data, body } = parseFrontmatter(content);
  const next = { ...data };
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.columnKey !== undefined) next.status = patch.columnKey;
  if (patch.priority !== undefined) next.priority = patch.priority ?? "";
  if (patch.assignee !== undefined) next.assignee = patch.assignee ?? "";
  if (patch.swimlaneKey !== undefined) next.swimlane = patch.swimlaneKey ?? "";
  if (patch.start !== undefined) next.start = patch.start ?? "";
  if (patch.due !== undefined) next.due = patch.due ?? "";
  if (patch.reminder !== undefined) next.reminder = patch.reminder ?? "";
  if (patch.archived !== undefined) next.archived = patch.archived ? "true" : "";
  if (patch.icon !== undefined) next.icon = patch.icon ?? "";
  if (patch.tags !== undefined) next.tags = patch.tags.map((tag) => tag.label).join(", ");
  if (patch.attachments !== undefined) next.attachments = serializeAttachments(patch.attachments);
  if (patch.custom !== undefined) {
    for (const [key, value] of Object.entries(patch.custom)) {
      if (!RESERVED_CARD_FRONTMATTER_KEYS.has(key)) next[key] = value ?? "";
    }
  }
  if (patch.blockedBy !== undefined) next.blocked_by = serializeLinks(patch.blockedBy);
  if (patch.blocks !== undefined) next.blocks = serializeLinks(patch.blocks);
  if (patch.relates !== undefined) next.relates = serializeLinks(patch.relates);
  if (patch.parent !== undefined) next.parent = patch.parent ? serializeLinks([patch.parent]) : "";
  return writeFrontmatter(patch.notes !== undefined ? patch.notes : body, next);
}

/** The display name for an attachment: its last path segment (decoded). */
export function attachmentName(url: string): string {
  const last = url.split(/[\\/]/).pop() || url;
  try {
    return decodeURIComponent(last.split("?")[0] || last);
  } catch {
    return last;
  }
}

/**
 * Whether an attachment value is safe to render as a clickable `href`. Blocks
 * dangerous schemes (`javascript:`, `data:`, `vbscript:`, `file:`, …); allows
 * http(s) and scheme-less relative/vault paths. An attachment may carry a
 * user-supplied URL, so this guards against stored XSS via the link.
 */
export function isSafeAttachmentUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(u);
  if (!scheme) return true; // no scheme → relative path
  const s = scheme[1]!.toLowerCase();
  return s === "http" || s === "https";
}

/** Read the declared custom-field values out of a flat property/frontmatter map. */
export function pickCustomFields(
  props: Record<string, string> | null | undefined,
  fields: BoardFieldDef[] | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!props || !fields) return out;
  for (const f of fields) {
    const v = props[f.key];
    if (v !== undefined && v !== "") out[f.key] = v;
  }
  return out;
}

/**
 * Legacy single-filter shape kept for consumers that imported it before the
 * structured filter UI shipped. New code should use {@link BoardFilters}.
 */
export type CardFilter =
  | { prop: "priority" | "assignee" | "tag"; value: string }
  | { prop: "swimlaneIssue"; value: "dangling" };

export type BoardDueFilter = "overdue" | "today" | "nextSevenDays" | "none";
export type BoardArchiveFilter = "active" | "archived" | "all";

/**
 * Personal, view-only board filters. Values within one dimension are ORed;
 * populated dimensions are ANDed together.
 */
export type BoardFilters = {
  priorities?: string[];
  assignees?: string[];
  tags?: string[];
  due?: BoardDueFilter;
  blocked?: boolean;
  mine?: boolean;
  /** Active is the implicit default, so archived Cards never disappear forever. */
  archived?: BoardArchiveFilter;
  /** Recovery-only filter for cards that reference a deleted custom row. */
  missingRow?: boolean;
};

/** Device/user-owned display state. Never serialize this into `.board`. */
export type BoardPersonalViewState = {
  version: 1;
  viewType?: BoardViewType;
  groupBy?: BoardGroupKey;
  swimlaneBy?: BoardSwimlaneGroupKey;
  calendarMode?: CalendarMode;
  sortBy?: BoardSortKey;
  filters?: BoardFilters;
  collapsedGroupKeys?: string[];
  scope?: BoardWorkScope;
  dismissedInboxItemKeys?: string[];
};

export type BoardFilterContext = {
  config?: Pick<BoardViewConfig, "swimlanes">;
  currentUser?: string;
  /** Injectable for deterministic tests; defaults to the local current day. */
  today?: string;
  /** Resolved unfinished dependencies, including reverse `blocks` links. */
  blockedCardIds?: ReadonlySet<string>;
};

/** One emoji reaction summary on a comment. */
export type CommentReaction = { emoji: string; count: number; mine: boolean };

/** A card comment (cloud feature; threading is one level deep via parentId). */
export type BoardComment = {
  id: string;
  author?: string | null;
  authorUserId?: string;
  body: string;
  /** Root comment id when this is a reply. */
  parentId?: string | null;
  /** Set when the thread (root only) is resolved. */
  resolvedAt?: string | null;
  reactions?: CommentReaction[];
  createdAt: string;
  updatedAt?: string;
};

export type BoardActivityActor = {
  kind: "user" | "agent" | "system";
  userId?: string | null;
  label: string;
};

export type BoardActivityClient = {
  kind: string;
  label?: string | null;
};

export type BoardActivityToken = {
  label?: string | null;
};

export type BoardFieldChange = {
  field: string;
  before?: unknown;
  after?: unknown;
};

/** One immutable entry in a Card's activity timeline (newest first). */
export type BoardActivityEvent = {
  id?: string;
  kind: string;
  at: string;
  /** Legacy version-history author. */
  by?: string | null;
  actor?: BoardActivityActor;
  client?: BoardActivityClient;
  token?: BoardActivityToken;
  changes?: BoardFieldChange[];
};

export type BoardInboxKind = "mention" | "reminder" | "due" | "blocked";

export type BoardInboxItem = {
  key: string;
  cardId: string;
  kind: BoardInboxKind;
  title: string;
  summary: string;
  date?: string | null;
};

export const PRIORITIES = ["none", "low", "medium", "high", "urgent"];
export const PRIORITY_ORDER = ["urgent", "high", "medium", "low", "none"];
export const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
export const PRIORITY_STYLE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-amber-100 text-amber-700",
  medium: "bg-sky-100 text-sky-700",
  low: "bg-stone-100 text-stone-500",
};
/** Preset column colors (Notion-style swatches). */
export const COLUMN_COLORS = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899", "#78716c"];
export const DEFAULT_DONE_COLUMN = "done";

/**
 * Frontmatter / property keys the board itself owns. A user-defined custom-field
 * key must never equal one of these, or writing the field value would clobber a
 * core card attribute (e.g. a field called "Status" → key `status`).
 */
export const RESERVED_CARD_KEYS = [
  "title",
  "relationKey",
  "board",
  "status",
  "position",
  "priority",
  "assignee",
  "swimlane",
  "start",
  "due",
  "reminder",
  "archived",
  "tags",
  "icon",
  "blocked_by",
  "blocks",
  "relates",
  "attachments",
  "parent",
];

/** Count Markdown task checkboxes (`- [ ]` / `- [x]`) in a body → (done, total). */
export function countTasks(md: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const line of md.split("\n")) {
    const m = line.replace(/^\s+/, "").match(/^[-*+] \[([ xX])\]/);
    if (m) {
      total += 1;
      if (m[1]?.toLowerCase() === "x") done += 1;
    }
  }
  return { done, total };
}

/** First line with visible text, leading Markdown markers stripped, truncated. */
export function bodyExcerpt(md: string): string | null {
  for (const raw of md.split("\n")) {
    const s = raw
      .trim()
      .replace(/^[#>\-*+\s]+/, "")
      .replace(/^\[[ xX]\]\s*/, "")
      .trim();
    if (s) return s.length > 120 ? `${s.slice(0, 120)}…` : s;
  }
  return null;
}

/** Parse a free-text tags value (`a, b` / `[a, b]`, optional `#`) into a list. */
export function parseTagList(raw: string): string[] {
  return raw
    .trim()
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);
}

/**
 * Palette for auto-assigned tag colors (deterministic by label). These are
 * intentional categorical hues, not theme colors — the shared token system only
 * defines brand-accent semantics (no 10-way categorical scale), so raw hex is the
 * right tool here. (Exempt from the shared "no hardcoded hex" rule, which targets
 * brand/neutral surfaces.)
 */
export const TAG_COLORS = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#14b8a6", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899", "#78716c"];

/**
 * A stable color for a tag label: a deterministic palette pick from the label's
 * hash, so the same tag is always the same color across cards/boards with zero
 * configuration. An explicit `.board` label color overrides this (see resolveTags).
 */
export function autoTagColor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (Math.imul(h, 31) + label.charCodeAt(i)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length]!;
}

/** Resolve raw tag labels into colored {@link BoardTag}s: an explicit board label
 *  definition's color wins, else a deterministic auto-color. */
export function resolveTags(rawLabels: string[], labels?: BoardLabelDef[]): BoardTag[] {
  return rawLabels.map((label) => {
    const def = labels?.find((l) => l.label === label);
    return { label, color: def?.color ?? autoTagColor(label) };
  });
}

/** The tag options for the peek multiselect: every defined label plus every tag
 *  currently in use on a card, each with its resolved color (deduped by label). */
export function collectTagOptions(cards: BoardViewCard[], labels?: BoardLabelDef[]): BoardTag[] {
  const byLabel = new Map<string, string | null | undefined>();
  for (const l of labels ?? []) byLabel.set(l.label, l.color ?? autoTagColor(l.label));
  for (const c of cards) for (const t of c.tags) if (!byLabel.has(t.label)) byLabel.set(t.label, t.color ?? autoTagColor(t.label));
  return [...byLabel].map(([label, color]) => ({ label, color }));
}

/** Parse a dependency value (`[[a]], [[b]]` or `a, b`) into card slugs. */
export function parseLinks(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().replace(/^\[\[/, "").replace(/\]\]$/, "").trim())
    .filter(Boolean);
}

/** Serialize card slugs back to a frontmatter dependency value (`[[a]], [[b]]`). */
export function serializeLinks(slugs: string[]): string {
  return slugs.map((s) => `[[${s}]]`).join(", ");
}

/** A card's slug — the basename of its id (file path / relativePath) without `.md`. */
export function cardSlug(card: BoardViewCard): string {
  const base = card.id.split(/[\\/]/).pop() ?? card.id;
  return base.replace(/\.md$/i, "");
}

/**
 * Collision-resistant identity persisted by new dependency and parent writes.
 * Existing basename-only links remain readable through the resolver below.
 */
export function cardRelationKey(card: BoardViewCard): string {
  return (card.relationKey ?? card.id)
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\.md$/i, "");
}

function cardReferenceResolver(cards: BoardViewCard[]): (reference: string) => BoardViewCard | undefined {
  const byKey = new Map<string, BoardViewCard>();
  const byBasename = new Map<string, BoardViewCard[]>();
  const bySuffix = new Map<string, BoardViewCard | null>();
  for (const card of cards) {
    const key = cardRelationKey(card);
    byKey.set(key, card);
    const parts = key.split("/").filter(Boolean);
    const basename = parts[parts.length - 1] ?? key;
    const matches = byBasename.get(basename);
    if (matches) matches.push(card);
    else byBasename.set(basename, [card]);
    for (let index = 1; index < parts.length - 1; index += 1) {
      const suffix = parts.slice(index).join("/");
      const existing = bySuffix.get(suffix);
      bySuffix.set(suffix, existing === undefined || existing === card ? card : null);
    }
  }

  return (reference) => {
    const normalized = reference.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\.md$/i, "");
    const exact = byKey.get(normalized);
    if (exact) return exact;

    // Accept a path relative to a board root when it has exactly one suffix
    // match (e.g. `feature/login` resolving `roadmap/feature/login.md`).
    if (normalized.includes("/")) {
      return bySuffix.get(normalized) ?? undefined;
    }

    // Legacy `[[basename]]` values are safe only while unique.
    const basenameMatches = byBasename.get(normalized) ?? [];
    return basenameMatches.length === 1 ? basenameMatches[0] : undefined;
  };
}

/**
 * For each card, how many distinct *unfinished* cards block it — combining its own
 * `blockedBy` with the reverse `blocks` edges of other cards. A card counts as
 * unfinished when it is not in the done column. Slugs that resolve to no card (or
 * to a finished one) don't count. Cycle-safe (no recursion).
 */
export function blockingCardIds(cards: BoardViewCard[], doneColumn?: string): Map<string, ReadonlySet<string>> {
  const doneKey = doneColumn || DEFAULT_DONE_COLUMN;
  const resolveReference = cardReferenceResolver(cards);
  const unfinished = (c: BoardViewCard | undefined): c is BoardViewCard => !!c && c.columnKey !== doneKey;
  // cardId -> set of blocker card ids (dedups blockedBy + reverse blocks).
  const blockers = new Map<string, Set<string>>();
  const add = (cardId: string, blocker: BoardViewCard) => {
    let set = blockers.get(cardId);
    if (!set) blockers.set(cardId, (set = new Set()));
    set.add(blocker.id);
  };
  for (const c of cards) {
    for (const slug of c.blockedBy ?? []) {
      const b = resolveReference(slug);
      if (unfinished(b) && b.id !== c.id) add(c.id, b);
    }
  }
  for (const y of cards) {
    if (!unfinished(y)) continue;
    for (const slug of y.blocks ?? []) {
      const x = resolveReference(slug);
      if (x && x.id !== y.id) add(x.id, y);
    }
  }
  return blockers;
}

export function blockedCounts(cards: BoardViewCard[], doneColumn?: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [id, set] of blockingCardIds(cards, doneColumn)) counts.set(id, set.size);
  return counts;
}

/**
 * Sub-cards of each card, resolved via the child's `parent` slug. Keyed by the
 * PARENT card id. Self-parenting and dangling slugs are ignored; deeper
 * nesting is allowed in data but progress is computed per level (no recursion).
 */
export function childCardsByParent(cards: BoardViewCard[]): Map<string, BoardViewCard[]> {
  const resolveReference = cardReferenceResolver(cards);
  const map = new Map<string, BoardViewCard[]>();
  for (const c of cards) {
    if (!c.parent) continue;
    const parent = resolveReference(c.parent);
    if (!parent || parent.id === c.id) continue;
    const list = map.get(parent.id);
    if (list) list.push(c);
    else map.set(parent.id, [c]);
  }
  return map;
}

/** Sub-card progress for a parent: a child is done when it sits in the done column. */
export function childProgress(children: BoardViewCard[], doneColumn?: string): { done: number; total: number } {
  const doneKey = doneColumn || DEFAULT_DONE_COLUMN;
  return { done: children.filter((c) => c.columnKey === doneKey).length, total: children.length };
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9一-龥]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

const BOARD_GROUP_KEYS = new Set<BoardGroupKey>(["status", "priority", "assignee"]);

/** Runtime guard for untrusted `.board` JSON. */
export function normalizeGroupBy(value: unknown): BoardGroupKey {
  return typeof value === "string" && BOARD_GROUP_KEYS.has(value as BoardGroupKey)
    ? (value as BoardGroupKey)
    : "status";
}

/** Unknown future/corrupt swimlane modes degrade safely to no swimlanes. */
export function normalizeSwimlaneBy(value: unknown): BoardSwimlaneGroupKey | undefined {
  if (value === "custom") return "custom";
  return typeof value === "string" && BOARD_GROUP_KEYS.has(value as BoardGroupKey)
    ? (value as BoardGroupKey)
    : undefined;
}

/**
 * The one grouping dimension rendered as vertical swimlane columns.
 *
 * `swimlaneBy` wins for backward compatibility with boards saved by the
 * retired two-dimensional layout. New non-custom selections use `groupBy`;
 * custom swimlanes continue using the existing persisted `swimlaneBy` field.
 */
export function activeBoardLaneKey(
  config: Pick<BoardViewConfig, "groupBy" | "swimlaneBy">,
): BoardSwimlaneGroupKey {
  return normalizeSwimlaneBy(config.swimlaneBy) ?? normalizeGroupBy(config.groupBy);
}

/** Map a vertical swimlane drop target to the normalized card field it owns. */
export function cardPatchForLaneValue(
  laneBy: BoardSwimlaneGroupKey,
  value: string,
): Partial<BoardViewCard> {
  if (laneBy === "status") return { columnKey: value };
  if (laneBy === "priority") return { priority: value === "none" ? null : value };
  if (laneBy === "assignee") return { assignee: value || null };
  return { swimlaneKey: value || null };
}

/**
 * Resolve the lane a new card will actually occupy after its create-dialog
 * patch is applied. Nullable fields need an own-property check: `null` means
 * "Unassigned/none", while an absent key means "keep the clicked lane".
 */
export function newCardLaneValue(
  laneBy: BoardSwimlaneGroupKey,
  clickedLane: string,
  initial: Partial<BoardViewCard> = {},
): string {
  if (laneBy === "status") return initial.columnKey ?? clickedLane;
  if (laneBy === "priority") {
    return Object.prototype.hasOwnProperty.call(initial, "priority")
      ? initial.priority || "none"
      : clickedLane;
  }
  if (laneBy === "assignee") {
    return Object.prototype.hasOwnProperty.call(initial, "assignee")
      ? initial.assignee || ""
      : clickedLane;
  }
  return Object.prototype.hasOwnProperty.call(initial, "swimlaneKey")
    ? initial.swimlaneKey || ""
    : clickedLane;
}

/** Create a collision-resistant immutable custom swimlane key. */
export function newSwimlaneKey(name: string, existingKeys: Iterable<string> = []): string {
  const taken = new Set(existingKeys);
  const prefix = `lane_${slugify(name).replace(/-/g, "_")}`;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8)
        : Math.random().toString(36).slice(2, 10).padEnd(8, "0");
    const key = `${prefix}_${suffix}`;
    if (!taken.has(key)) return key;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

/** Validate a user-facing lane name against length and board-local uniqueness rules. */
export function validateSwimlaneName(
  name: string,
  lanes: BoardSwimlane[],
  excludingKey?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Swimlane name is required.";
  if (trimmed.length > 80) return "Swimlane names can be at most 80 characters.";
  const duplicate = lanes.some(
    (lane) => lane.key !== excludingKey && lane.name.trim().toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
  );
  return duplicate ? "Swimlane names must be unique on this board." : null;
}

/** The normalized custom swimlane identity used for bucketing and selection. */
export function customSwimlaneKeyOf(card: BoardViewCard): string {
  return card.swimlaneKey || "";
}

/**
 * Report malformed definitions and recoverable card references without
 * rewriting either document. Duplicate keys are resolved first-definition-wins
 * by the renderer; dangling card keys remain recoverable in Unassigned.
 */
export function validateSwimlanes(
  config: Pick<BoardViewConfig, "swimlanes">,
  cards: BoardViewCard[],
): BoardConfigIssue[] {
  const issues: BoardConfigIssue[] = [];
  const lanes = config.swimlanes ?? [];
  const seenKeys = new Set<string>();
  const duplicateKeys = new Set<string>();
  const seenNames = new Map<string, string>();
  const duplicateNames = new Set<string>();

  for (const lane of lanes) {
    if (seenKeys.has(lane.key)) duplicateKeys.add(lane.key);
    else seenKeys.add(lane.key);

    const normalizedName = lane.name.trim().toLocaleLowerCase();
    if (normalizedName) {
      if (seenNames.has(normalizedName)) duplicateNames.add(normalizedName);
      else seenNames.set(normalizedName, lane.name.trim());
    }
  }

  for (const key of duplicateKeys) issues.push({ kind: "duplicate_swimlane_key", key });
  for (const normalizedName of duplicateNames) {
    issues.push({
      kind: "duplicate_swimlane_name",
      name: seenNames.get(normalizedName) ?? normalizedName,
    });
  }

  const danglingCounts = new Map<string, number>();
  for (const card of cards) {
    const key = customSwimlaneKeyOf(card);
    if (key && !seenKeys.has(key)) {
      danglingCounts.set(key, (danglingCounts.get(key) ?? 0) + 1);
    }
  }
  for (const [key, cardCount] of danglingCounts) {
    issues.push({ kind: "dangling_swimlane", key, cardCount });
  }
  return issues;
}

/** The grouping value of a card under the active grouping. */
export function groupValueOf(card: BoardViewCard, groupBy: BoardSwimlaneGroupKey): string {
  if (groupBy === "custom") return customSwimlaneKeyOf(card);
  if (groupBy === "priority") return card.priority || "none";
  if (groupBy === "assignee") return card.assignee || "";
  return card.columnKey || "";
}

/**
 * The rendered lane value for a card. Deleted or unknown custom swimlane IDs
 * are collected in Unassigned while the original ID stays on the card so the
 * mapping remains recoverable.
 */
export function boardLaneValueOf(
  card: BoardViewCard,
  config: Pick<BoardViewConfig, "groupBy" | "swimlaneBy" | "swimlanes">,
): string {
  const laneBy = activeBoardLaneKey(config);
  const value = groupValueOf(card, laneBy);
  if (
    laneBy === "custom" &&
    value &&
    !(config.swimlanes ?? []).some((lane) => lane.key === value)
  ) {
    return "";
  }
  return value;
}

/** Derive the columns to render for the active grouping. */
export function effectiveColumns(
  config: BoardViewConfig,
  cards: BoardViewCard[],
  groupBy: BoardGroupKey,
  unassignedLabel: string,
): BoardViewColumn[] {
  if (groupBy === "status") return config.columns;
  if (groupBy === "priority") {
    return PRIORITY_ORDER.map((key) => ({
      key,
      name:
        key === "none"
          ? unassignedLabel
          : `${key.charAt(0).toUpperCase()}${key.slice(1)}`,
    }));
  }
  // Assignee boards always expose Unassigned so an empty board still has a
  // valid create/drop target and assigned cards can be cleared by dragging.
  const vals = new Set<string>([""]);
  for (const c of cards) vals.add(groupValueOf(c, groupBy));
  return [...vals]
    .sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map((v) => ({ key: v, name: v || unassignedLabel }));
}

/** Whether a card references a custom swimlane definition that no longer exists. */
export function hasDanglingSwimlane(
  card: BoardViewCard,
  swimlanes: BoardSwimlane[] | undefined,
): boolean {
  const key = card.swimlaneKey;
  return !!key && !(swimlanes ?? []).some((lane) => lane.key === key);
}

/**
 * Derive vertical swimlane columns. Custom lanes come from persistent
 * definitions so empty lanes remain visible; Unassigned always remains a
 * valid create/drop target, including on empty and read-only boards.
 */
export function effectiveSwimlanes(
  config: BoardViewConfig,
  cards: BoardViewCard[],
  swimlaneBy: BoardSwimlaneGroupKey,
  unassignedLabel: string,
): BoardViewColumn[] {
  if (swimlaneBy !== "custom") {
    return effectiveColumns(config, cards, swimlaneBy, unassignedLabel);
  }
  const seen = new Set<string>();
  const definitions = (config.swimlanes ?? []).filter((lane) => {
    if (seen.has(lane.key)) return false;
    seen.add(lane.key);
    return true;
  });
  return [
    ...definitions.map((lane) => ({ key: lane.key, name: lane.name, color: lane.color })),
    { key: "", name: unassignedLabel },
  ];
}

/**
 * Legacy two-dimensional partition helper retained for persisted-layout data
 * tests and compatibility tooling. The current board renders one vertical
 * swimlane dimension and does not call this helper.
 */
export function partitionSwimlanes(
  cards: BoardViewCard[],
  groupBy: BoardGroupKey,
  swimlaneBy: BoardSwimlaneGroupKey,
  swimlanes?: BoardSwimlane[],
): Map<string, Map<string, BoardViewCard[]>> {
  const grid = new Map<string, Map<string, BoardViewCard[]>>();
  const validCustomKeys =
    swimlaneBy === "custom" ? new Set((swimlanes ?? []).map((lane) => lane.key)) : null;
  for (const c of cards) {
    const rawLane = groupValueOf(c, swimlaneBy);
    const lane =
      swimlaneBy === "custom" && (!rawLane || !validCustomKeys?.has(rawLane))
        ? ""
        : rawLane;
    const col = groupValueOf(c, groupBy);
    let row = grid.get(lane);
    if (!row) grid.set(lane, (row = new Map()));
    let cell = row.get(col);
    if (!cell) row.set(col, (cell = []));
    cell.push(c);
  }
  return grid;
}

/** Test one card against a legacy single filter. */
export function cardMatchesFilter(
  card: BoardViewCard,
  filter: CardFilter | null,
  config?: Pick<BoardViewConfig, "swimlanes">,
): boolean {
  if (!filter) return true;
  if (filter.prop === "swimlaneIssue") return hasDanglingSwimlane(card, config?.swimlanes);
  if (filter.prop === "priority") return (card.priority || "none") === filter.value;
  if (filter.prop === "assignee") return (card.assignee || "") === filter.value;
  if (filter.prop === "tag") return card.tags.some((t) => t.label === filter.value);
  return true;
}

function normalizedFilterValues(values: string[] | undefined): Set<string> {
  return new Set((values ?? []).map((value) => value.trim().toLowerCase()));
}

function offsetIsoDay(day: string, offset: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return isoDay(new Date(year!, month! - 1, date! + offset));
}

/** Whether a structured filter object has any active criteria. */
export function hasBoardFilters(filters: BoardFilters): boolean {
  return !!(
    filters.priorities?.length ||
    filters.assignees?.length ||
    filters.tags?.length ||
    filters.due ||
    filters.blocked ||
    filters.mine ||
    (filters.archived !== undefined && filters.archived !== "active") ||
    filters.missingRow
  );
}

/** Number of active filter dimensions, used by the toolbar count badge. */
export function activeBoardFilterCount(filters: BoardFilters): number {
  return [
    !!filters.priorities?.length,
    !!filters.assignees?.length,
    !!filters.tags?.length,
    !!filters.due,
    !!filters.blocked,
    !!filters.mine,
    filters.archived !== undefined && filters.archived !== "active",
    !!filters.missingRow,
  ].filter(Boolean).length;
}

/**
 * Test one card against structured board filters. Selected values within a
 * dimension are ORed; dimensions are ANDed.
 */
export function cardMatchesFilters(
  card: BoardViewCard,
  filters: BoardFilters,
  context: BoardFilterContext = {},
): boolean {
  const archiveMode = filters.archived ?? "active";
  if (archiveMode === "active" && card.archived) return false;
  if (archiveMode === "archived" && !card.archived) return false;

  const priorities = normalizedFilterValues(filters.priorities);
  if (priorities.size > 0 && !priorities.has((card.priority || "none").toLowerCase())) {
    return false;
  }

  const assignees = normalizedFilterValues(filters.assignees);
  if (assignees.size > 0 && !assignees.has((card.assignee || "").trim().toLowerCase())) {
    return false;
  }

  const tags = normalizedFilterValues(filters.tags);
  if (
    tags.size > 0 &&
    !card.tags.some((tag) => tags.has(tag.label.trim().toLowerCase()))
  ) {
    return false;
  }

  if (filters.due) {
    const due = card.due && isIsoDate(card.due) ? card.due : null;
    const today = context.today && isIsoDate(context.today) ? context.today : todayStr();
    if (filters.due === "none" && due) return false;
    if (filters.due !== "none" && !due) return false;
    if (due) {
      if (filters.due === "overdue" && due >= today) return false;
      if (filters.due === "today" && due !== today) return false;
      if (
        filters.due === "nextSevenDays" &&
        (due < today || due > offsetIsoDay(today, 6))
      ) {
        return false;
      }
    }
  }

  if (
    filters.blocked &&
    !(context.blockedCardIds
      ? context.blockedCardIds.has(card.id)
      : (card.blockedBy?.length ?? 0) > 0)
  ) {
    return false;
  }
  if (filters.mine) {
    const currentUser = context.currentUser?.trim().toLowerCase();
    if (!currentUser || card.assignee?.trim().toLowerCase() !== currentUser) return false;
  }
  if (
    filters.missingRow &&
    !hasDanglingSwimlane(card, context.config?.swimlanes)
  ) {
    return false;
  }
  return true;
}

/** Whether a card matches a search query: title, ticket, assignee, tags, and
 *  the markdown body are all searched (case-insensitive substring). */
export function cardMatchesSearch(card: BoardViewCard, q: string): boolean {
  if (card.title.toLowerCase().includes(q)) return true;
  if (card.ticket && card.ticket.toLowerCase().includes(q)) return true;
  if (card.assignee && card.assignee.toLowerCase().includes(q)) return true;
  if (card.tags.some((t) => t.label.toLowerCase().includes(q))) return true;
  if (card.notes && card.notes.toLowerCase().includes(q)) return true;
  if (!card.notes && card.excerpt && card.excerpt.toLowerCase().includes(q)) return true;
  return false;
}

/** Convert the pre-structured single-filter API into the new filter model. */
function normalizeBoardFilters(filters: BoardFilters | CardFilter | null): BoardFilters {
  if (!filters) return {};
  if ("prop" in filters) {
    if (filters.prop === "priority") return { priorities: [filters.value] };
    if (filters.prop === "assignee") return { assignees: [filters.value] };
    if (filters.prop === "tag") return { tags: [filters.value] };
    return { missingRow: true };
  }
  return filters;
}

/** Apply the board's text query and structured filters to its authoritative card list. */
export function visibleCards(
  cards: BoardViewCard[],
  search: string,
  filters: BoardFilters | CardFilter | null,
  config?: Pick<BoardViewConfig, "swimlanes">,
  context: Omit<BoardFilterContext, "config"> = {},
): BoardViewCard[] {
  const q = search.trim().toLowerCase();
  const normalized = normalizeBoardFilters(filters);
  return cards.filter((c) => {
    if (q && !cardMatchesSearch(c, q)) return false;
    return cardMatchesFilters(c, normalized, { ...context, config });
  });
}

export function sortCards(list: BoardViewCard[], sortBy: BoardSortKey): BoardViewCard[] {
  const arr = [...list];
  if (sortBy === "due") arr.sort((a, b) => (isIsoDate(a.due) ? a.due : "9999-99-99").localeCompare(isIsoDate(b.due) ? b.due : "9999-99-99"));
  else if (sortBy === "priority") arr.sort((a, b) => (PRIORITY_RANK[a.priority || "none"] ?? 5) - (PRIORITY_RANK[b.priority || "none"] ?? 5));
  else if (sortBy === "title") arr.sort((a, b) => a.title.localeCompare(b.title));
  else arr.sort((a, b) => a.position - b.position);
  return arr;
}

// --- calendar helpers (C3) -------------------------------------------------
// All dates are zero-padded ISO `YYYY-MM-DD` strings compared lexically, so the
// calendar needs no external date library (matching sortCards/todayStr).

/** Format a Date as a local `YYYY-MM-DD` string. */
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** True when `s` is a well-formed zero-padded ISO date (`YYYY-MM-DD`). */
export function isIsoDate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const parsed = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === s;
}

/** Today's month as `YYYY-MM` (local). */
export function currentMonth(): string {
  return todayStr().slice(0, 7);
}

/** Shift a `YYYY-MM` month string by `delta` months, returning `YYYY-MM`. */
export function shiftMonth(ym: string, delta: number): string {
  const [ys, ms] = ym.split("-");
  const d = new Date(Number(ys), Number(ms) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Bucket cards by their due day (`YYYY-MM-DD`). Cards whose `due` is missing or
 * not a valid ISO date are omitted (the agenda view surfaces them as unscheduled).
 */
export function groupCardsByDay(cards: BoardViewCard[]): Map<string, BoardViewCard[]> {
  const map = new Map<string, BoardViewCard[]>();
  for (const c of cards) {
    if (!isIsoDate(c.due)) continue;
    const list = map.get(c.due);
    if (list) list.push(c);
    else map.set(c.due, [c]);
  }
  return map;
}

/**
 * A 6×7 matrix of ISO day strings covering the weeks that contain month `ym`
 * (`YYYY-MM`). `weekStart` 0 = Sunday (default), 1 = Monday. Leading/trailing
 * cells belong to the adjacent months.
 */
export function monthMatrix(ym: string, weekStart = 0): string[][] {
  const [ys, ms] = ym.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const start = new Date(y, m - 1, 1 - offset);
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: string[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(isoDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)));
    }
    weeks.push(row);
  }
  return weeks;
}
