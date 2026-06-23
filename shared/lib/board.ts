// Platform-agnostic board model + pure helpers shared by the desktop board
// (markdown files) and the web kanban (REST DB). The presentational board
// components in shared/components/board render this model; each platform adapts
// its own data layer into it. See internal-docs/web-board-alignment/design.md.

export type BoardViewColumn = {
  key: string;
  name: string;
  color?: string | null;
  /** Optional WIP limit; the column flags when its card count exceeds this. */
  limit?: number | null;
};

export type BoardGroupKey = "status" | "priority" | "assignee";
export type BoardSortKey = "manual" | "due" | "priority" | "title";
export type BoardViewType = "board" | "table";

export type BoardFieldType = "text" | "number" | "date";
/** A user-defined custom field on a board's cards (stored in frontmatter / properties). */
export type BoardFieldDef = { key: string; label: string; type?: BoardFieldType };

export type BoardViewConfig = {
  title: string;
  columns: BoardViewColumn[];
  /** Column key treated as terminal/done (suppresses overdue styling). */
  doneColumn?: string;
  /** Tint each column header by its (or an auto) color. */
  colorColumns?: boolean;
  viewType?: BoardViewType;
  groupBy?: BoardGroupKey;
  /** User-defined custom fields shown/edited on cards (board-level schema). */
  fields?: BoardFieldDef[];
  /**
   * Second grouping dimension rendered as horizontal swimlanes (rows) in the
   * board view. Must differ from `groupBy`; unset = no swimlanes.
   */
  swimlaneBy?: BoardGroupKey;
};

export type BoardTag = { id?: string; label: string; color?: string | null };

export type BoardViewCard = {
  /** Stable id — desktop: file path; web: card id. */
  id: string;
  /** The grouping value under the default (status) grouping. */
  columnKey: string;
  position: number;
  title: string;
  icon?: string | null;
  priority?: string | null;
  /** Display text (web resolves a member name; desktop uses free text). */
  assignee?: string | null;
  due?: string | null;
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

export type CardFilter = { prop: "priority" | "assignee" | "tag"; value: string };

/** A card comment (DB board). */
export type BoardComment = { id: string; author?: string | null; body: string; createdAt: string };

/** One entry in a card's activity timeline (newest first). */
export type BoardActivityEvent = { kind: string; at: string; by?: string | null };

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
  "board",
  "status",
  "position",
  "priority",
  "assignee",
  "due",
  "tags",
  "icon",
  "blocked_by",
  "blocks",
  "relates",
  "attachments",
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
 * For each card, how many distinct *unfinished* cards block it — combining its own
 * `blockedBy` with the reverse `blocks` edges of other cards. A card counts as
 * unfinished when it is not in the done column. Slugs that resolve to no card (or
 * to a finished one) don't count. Cycle-safe (no recursion).
 */
export function blockedCounts(cards: BoardViewCard[], doneColumn?: string): Map<string, number> {
  const doneKey = doneColumn || DEFAULT_DONE_COLUMN;
  const bySlug = new Map<string, BoardViewCard>();
  for (const c of cards) bySlug.set(cardSlug(c), c);
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
      const b = bySlug.get(slug);
      if (unfinished(b) && b.id !== c.id) add(c.id, b);
    }
  }
  for (const y of cards) {
    if (!unfinished(y)) continue;
    for (const slug of y.blocks ?? []) {
      const x = bySlug.get(slug);
      if (x && x.id !== y.id) add(x.id, y);
    }
  }
  const counts = new Map<string, number>();
  for (const [id, set] of blockers) counts.set(id, set.size);
  return counts;
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

/** The grouping value of a card under the active grouping. */
export function groupValueOf(card: BoardViewCard, groupBy: BoardGroupKey): string {
  if (groupBy === "priority") return card.priority || "none";
  if (groupBy === "assignee") return card.assignee || "";
  return card.columnKey || "";
}

/** Derive the columns to render for the active grouping. */
export function effectiveColumns(
  config: BoardViewConfig,
  cards: BoardViewCard[],
  groupBy: BoardGroupKey,
  unassignedLabel: string,
): BoardViewColumn[] {
  if (groupBy === "status") return config.columns;
  if (groupBy === "priority") return PRIORITY_ORDER.map((k) => ({ key: k, name: k }));
  const vals = new Set<string>();
  for (const c of cards) vals.add(groupValueOf(c, groupBy));
  return [...vals]
    .sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map((v) => ({ key: v, name: v || unassignedLabel }));
}

/**
 * Bucket cards into a swimlane grid: laneValue → columnValue → cards. Lane and
 * column values come from `groupValueOf` under the two grouping dimensions. The
 * board view renders rows (lanes) × columns from this. Order within a cell is the
 * caller's responsibility (pre-sort, e.g. with sortCards).
 */
export function partitionSwimlanes(
  cards: BoardViewCard[],
  groupBy: BoardGroupKey,
  swimlaneBy: BoardGroupKey,
): Map<string, Map<string, BoardViewCard[]>> {
  const grid = new Map<string, Map<string, BoardViewCard[]>>();
  for (const c of cards) {
    const lane = groupValueOf(c, swimlaneBy);
    const col = groupValueOf(c, groupBy);
    let row = grid.get(lane);
    if (!row) grid.set(lane, (row = new Map()));
    let cell = row.get(col);
    if (!cell) row.set(col, (cell = []));
    cell.push(c);
  }
  return grid;
}

export function cardMatchesFilter(card: BoardViewCard, filter: CardFilter | null): boolean {
  if (!filter) return true;
  if (filter.prop === "priority") return (card.priority || "none") === filter.value;
  if (filter.prop === "assignee") return (card.assignee || "") === filter.value;
  if (filter.prop === "tag") return card.tags.some((t) => t.label === filter.value);
  return true;
}

export function visibleCards(cards: BoardViewCard[], search: string, filter: CardFilter | null): BoardViewCard[] {
  const q = search.trim().toLowerCase();
  return cards.filter((c) => {
    if (q && !c.title.toLowerCase().includes(q)) return false;
    return cardMatchesFilter(c, filter);
  });
}

export function sortCards(list: BoardViewCard[], sortBy: BoardSortKey): BoardViewCard[] {
  const arr = [...list];
  if (sortBy === "due") arr.sort((a, b) => (a.due || "9999-99-99").localeCompare(b.due || "9999-99-99"));
  else if (sortBy === "priority") arr.sort((a, b) => (PRIORITY_RANK[a.priority || "none"] ?? 5) - (PRIORITY_RANK[b.priority || "none"] ?? 5));
  else if (sortBy === "title") arr.sort((a, b) => a.title.localeCompare(b.title));
  else arr.sort((a, b) => a.position - b.position);
  return arr;
}
