import type {
  BoardFilters,
  BoardPersonalViewState,
  BoardViewConfig,
} from "./board";

export type BoardPreferenceStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const VIEW_TYPES = new Set(["board", "table", "calendar", "backlog", "gantt"]);
const GROUPS = new Set(["status", "priority", "assignee"]);
const LANES = new Set(["status", "priority", "assignee", "custom"]);
const CALENDAR_MODES = new Set(["month", "agenda"]);
const SORTS = new Set(["manual", "due", "priority", "title"]);
const SCOPES = new Set(["all", "my-work", "inbox"]);
const DUE_FILTERS = new Set(["overdue", "today", "nextSevenDays", "none"]);
const ARCHIVE_FILTERS = new Set(["active", "archived", "all"]);

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const next = value.filter((item): item is string => typeof item === "string");
  return next.length > 0 ? [...new Set(next)] : undefined;
}

function normalizeFilters(value: unknown): BoardFilters | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const filters: BoardFilters = {};
  filters.priorities = stringArray(raw.priorities);
  filters.assignees = stringArray(raw.assignees);
  filters.tags = stringArray(raw.tags);
  if (typeof raw.due === "string" && DUE_FILTERS.has(raw.due)) {
    filters.due = raw.due as BoardFilters["due"];
  }
  if (raw.blocked === true) filters.blocked = true;
  if (raw.mine === true) filters.mine = true;
  if (typeof raw.archived === "string" && ARCHIVE_FILTERS.has(raw.archived)) {
    filters.archived = raw.archived as BoardFilters["archived"];
  }
  if (raw.missingRow === true) filters.missingRow = true;
  return Object.values(filters).some((entry) => entry !== undefined) ? filters : undefined;
}

/** Parse untrusted persisted state through a versioned, property-level allowlist. */
export function normalizeBoardPersonalViewState(value: unknown): BoardPersonalViewState {
  const state: BoardPersonalViewState = { version: 1 };
  if (!value || typeof value !== "object" || Array.isArray(value)) return state;
  const raw = value as Record<string, unknown>;
  if (typeof raw.viewType === "string" && VIEW_TYPES.has(raw.viewType)) {
    state.viewType = raw.viewType as BoardPersonalViewState["viewType"];
  }
  if (typeof raw.groupBy === "string" && GROUPS.has(raw.groupBy)) {
    state.groupBy = raw.groupBy as BoardPersonalViewState["groupBy"];
  }
  if (typeof raw.swimlaneBy === "string" && LANES.has(raw.swimlaneBy)) {
    state.swimlaneBy = raw.swimlaneBy as BoardPersonalViewState["swimlaneBy"];
  }
  if (typeof raw.calendarMode === "string" && CALENDAR_MODES.has(raw.calendarMode)) {
    state.calendarMode = raw.calendarMode as BoardPersonalViewState["calendarMode"];
  }
  if (typeof raw.sortBy === "string" && SORTS.has(raw.sortBy)) {
    state.sortBy = raw.sortBy as BoardPersonalViewState["sortBy"];
  }
  if (typeof raw.scope === "string" && SCOPES.has(raw.scope)) {
    state.scope = raw.scope as BoardPersonalViewState["scope"];
  }
  state.filters = normalizeFilters(raw.filters);
  state.collapsedGroupKeys = stringArray(raw.collapsedGroupKeys);
  state.dismissedInboxItemKeys = stringArray(raw.dismissedInboxItemKeys);
  return state;
}

/** Legacy shared values are defaults only; interaction writes personal state. */
export function boardPersonalViewDefaults(config: BoardViewConfig): BoardPersonalViewState {
  return normalizeBoardPersonalViewState({
    version: 1,
    viewType: config.viewType,
    groupBy: config.groupBy,
    swimlaneBy: config.swimlaneBy,
    calendarMode: config.calendarMode,
    scope: "all",
    sortBy: "manual",
    filters: { archived: "active" },
  });
}

export function mergeBoardPersonalViewState(
  current: BoardPersonalViewState,
  patch: Partial<BoardPersonalViewState>,
): BoardPersonalViewState {
  return normalizeBoardPersonalViewState({ ...current, ...patch, version: 1 });
}

export function boardPersonalViewStorageKey(parts: {
  identity?: string | null;
  workspace: string;
  board: string;
}): string {
  const identity = parts.identity?.trim() || "local";
  return `jtype.board-view.v1:${encodeURIComponent(identity)}:${encodeURIComponent(parts.workspace)}:${encodeURIComponent(parts.board)}`;
}

export function loadBoardPersonalViewState(
  storage: BoardPreferenceStorage,
  key: string,
  defaults: BoardPersonalViewState,
): BoardPersonalViewState {
  try {
    const raw = storage.getItem(key);
    if (!raw) return normalizeBoardPersonalViewState(defaults);
    return mergeBoardPersonalViewState(defaults, JSON.parse(raw));
  } catch {
    return normalizeBoardPersonalViewState(defaults);
  }
}

export function saveBoardPersonalViewState(
  storage: BoardPreferenceStorage,
  key: string,
  state: BoardPersonalViewState,
): void {
  try {
    storage.setItem(key, JSON.stringify(normalizeBoardPersonalViewState(state)));
  } catch {
    // Personal projection state is best-effort. A blocked/quota-limited
    // storage adapter must never break the in-memory Board interaction.
  }
}
