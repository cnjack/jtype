import {
  isIsoDate,
  PRIORITY_RANK,
  type BoardInboxItem,
  type BoardProjectMetadata,
  type BoardViewCard,
  type BoardViewColumn,
} from "./board";

export const MAX_GANTT_DAYS = 548;

function dateValue(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year!, month! - 1, date!);
}

function isoDay(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function isPlanningDay(value: unknown): value is string {
  return typeof value === "string" && isIsoDate(value);
}

export function addPlanningDays(day: string, days: number): string {
  return isoDay(dateValue(day) + days * 86_400_000);
}

export function planningDayDistance(start: string, end: string): number {
  return Math.round((dateValue(end) - dateValue(start)) / 86_400_000);
}

export type BoardGanttRange = {
  start: string;
  end: string;
  days: number;
};

export type BoardGanttItem = {
  card: BoardViewCard;
  start: string;
  end: string;
  offset: number;
  span: number;
  milestone: boolean;
};

export function boardGanttRange(
  cards: BoardViewCard[],
  project: BoardProjectMetadata | undefined,
  today: string,
): BoardGanttRange {
  const starts = [project?.startDate, today, ...cards.flatMap((card) => [card.start, card.due])]
    .filter(isPlanningDay);
  const ends = [project?.targetDate, addPlanningDays(today, 30), ...cards.flatMap((card) => [card.start, card.due])]
    .filter(isPlanningDay);
  let start = starts.sort()[0] ?? today;
  const sortedEnds = ends.sort();
  let end = sortedEnds[sortedEnds.length - 1] ?? addPlanningDays(today, 30);
  if (planningDayDistance(start, end) < 13) end = addPlanningDays(start, 13);
  if (planningDayDistance(start, end) + 1 > MAX_GANTT_DAYS) {
    const projectStart = isPlanningDay(project?.startDate) ? project.startDate : null;
    const nearProjectStart = projectStart && Math.abs(planningDayDistance(projectStart, today)) < MAX_GANTT_DAYS / 2;
    start = nearProjectStart && projectStart < today ? projectStart : addPlanningDays(today, -30);
    end = addPlanningDays(start, MAX_GANTT_DAYS - 1);
  }
  return { start, end, days: planningDayDistance(start, end) + 1 };
}

export function boardGanttItem(
  card: BoardViewCard,
  range: BoardGanttRange,
): BoardGanttItem | null {
  const start = isPlanningDay(card.start) ? card.start : isPlanningDay(card.due) ? card.due : null;
  const end = isPlanningDay(card.due) ? card.due : start;
  if (!start || !end || end < start) return null;
  if (end < range.start || start > range.end) return null;
  const visibleStart = start < range.start ? range.start : start;
  const visibleEnd = end > range.end ? range.end : end;
  return {
    card,
    start,
    end,
    offset: planningDayDistance(range.start, visibleStart),
    span: planningDayDistance(visibleStart, visibleEnd) + 1,
    milestone: !isPlanningDay(card.start) && isPlanningDay(card.due),
  };
}

export type BoardBacklogGroup = {
  key: string;
  name: string;
  cards: BoardViewCard[];
};

export function boardBacklogGroups(
  cards: BoardViewCard[],
  columns: BoardViewColumn[],
): BoardBacklogGroup[] {
  const byStatus = new Map<string, BoardViewCard[]>();
  for (const card of cards) {
    if (card.archived) continue;
    const list = byStatus.get(card.columnKey) ?? [];
    list.push(card);
    byStatus.set(card.columnKey, list);
  }
  const groups = columns.map((column) => ({
    key: column.key,
    name: column.name,
    cards: [...(byStatus.get(column.key) ?? [])],
  }));
  const known = new Set(columns.map((column) => column.key));
  const unassigned = cards.filter((card) => !card.archived && !known.has(card.columnKey));
  if (unassigned.length > 0) groups.push({ key: "", name: "Unassigned", cards: unassigned });
  return groups;
}

function projectWorkSort(a: BoardViewCard, b: BoardViewCard): number {
  const due = (isPlanningDay(a.due) ? a.due : "9999-99-99").localeCompare(isPlanningDay(b.due) ? b.due : "9999-99-99");
  if (due !== 0) return due;
  const priority = (PRIORITY_RANK[a.priority || "none"] ?? 5) - (PRIORITY_RANK[b.priority || "none"] ?? 5);
  if (priority !== 0) return priority;
  return a.position - b.position || a.title.localeCompare(b.title);
}

export function boardMyWorkCards(
  cards: BoardViewCard[],
  currentUser: string | undefined,
  doneColumn?: string,
  today?: string,
  blockedCardIds?: ReadonlySet<string>,
): BoardViewCard[] {
  const identity = currentUser?.trim().toLowerCase();
  if (!identity) return [];
  const workRank = (card: BoardViewCard): number => {
    if (today && isPlanningDay(card.due) && card.due < today) return 0;
    if (today && isPlanningDay(card.due) && card.due === today) return 1;
    if (blockedCardIds?.has(card.id)) return 2;
    return 3;
  };
  return cards
    .filter((card) => !card.archived && card.columnKey !== doneColumn && card.assignee?.trim().toLowerCase() === identity)
    .sort((a, b) => workRank(a) - workRank(b) || projectWorkSort(a, b));
}

/** Extract complete @handles without treating email domains as mentions. */
export function extractBoardMentions(source: string | null | undefined): string[] {
  if (!source) return [];
  // Match the service parser's user-facing rules without pulling a Markdown
  // renderer into the planning model: code and Markdown links are not prose
  // notifications, and link destinations may legitimately contain `/@name`.
  const prose = source
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, " ");
  const mentions = new Set<string>();
  const expression = /(^|[\s([{>])@([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})\b/g;
  for (const match of prose.matchAll(expression)) mentions.add(match[2]!.toLowerCase());
  return [...mentions];
}

function mentionContextId(source: string | null | undefined, identity: string): string {
  const escaped = identity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mention = new RegExp(`(^|[\\s([{>])@${escaped}(?=$|[^a-zA-Z0-9._-])`, "i");
  const context = (source ?? "")
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, " ")
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => mention.test(line))
    .join("\n");
  let hash = 2166136261;
  for (let index = 0; index < context.length; index += 1) {
    hash ^= context.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function boardInboxItems(args: {
  cards: BoardViewCard[];
  currentUser?: string;
  today: string;
  blockedCardIds?: ReadonlySet<string>;
  blockerCardIds?: ReadonlyMap<string, ReadonlySet<string>>;
  dismissedKeys?: ReadonlySet<string>;
  doneColumn?: string;
}): BoardInboxItem[] {
  const identity = args.currentUser?.trim().toLowerCase();
  if (!identity) return [];
  const dismissed = args.dismissedKeys ?? new Set<string>();
  const items: BoardInboxItem[] = [];
  for (const card of args.cards) {
    if (card.archived) continue;
    if (extractBoardMentions(card.notes).includes(identity)) {
      const key = `${card.id}:mention:${identity}:${mentionContextId(card.notes, identity)}`;
      if (!dismissed.has(key)) {
        items.push({ key, cardId: card.id, kind: "mention", title: card.title, summary: `Mentioned @${identity}` });
      }
    }
    if (card.columnKey === args.doneColumn) continue;
    if (isPlanningDay(card.reminder) && card.reminder <= args.today) {
      const key = `${card.id}:reminder:${card.reminder}`;
      if (!dismissed.has(key)) {
        items.push({ key, cardId: card.id, kind: "reminder", title: card.title, summary: "Reminder due", date: card.reminder });
      }
    }
    const mine = card.assignee?.trim().toLowerCase() === identity;
    if (mine && isPlanningDay(card.due) && card.due <= args.today) {
      const key = `${card.id}:due:${card.due}`;
      if (!dismissed.has(key)) {
        items.push({
          key,
          cardId: card.id,
          kind: "due",
          title: card.title,
          summary: card.due < args.today ? "Overdue" : "Due today",
          date: card.due,
        });
      }
    }
    if (mine && args.blockedCardIds?.has(card.id)) {
      const relationKey = [...(args.blockerCardIds?.get(card.id) ?? [])].sort().join(",") || "unknown";
      const key = `${card.id}:blocked:${relationKey}`;
      if (!dismissed.has(key)) {
        items.push({ key, cardId: card.id, kind: "blocked", title: card.title, summary: "Work is blocked" });
      }
    }
  }
  return items.sort((a, b) => (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99") || a.title.localeCompare(b.title));
}

/** Keep dismissals only while their exact underlying Inbox reason still exists. */
export function reconcileDismissedInboxKeys(
  dismissedKeys: readonly string[],
  activeItems: readonly BoardInboxItem[],
): string[] {
  const activeKeys = new Set(activeItems.map((item) => item.key));
  return dismissedKeys.filter((key) => activeKeys.has(key));
}
