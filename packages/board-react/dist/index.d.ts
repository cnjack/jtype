import { CSSProperties } from 'react';
import { ReactElement } from 'react';
import { ReactNode } from 'react';

declare type BoardArchiveFilter = "active" | "archived" | "all";

/** Shape of the `.board` JSON config document (mirrors WebBoardView). */
export declare type BoardConfigJSON = BoardDocumentConfig;

/** Canonical synced `.board` JSON shape used by Desktop, Web, and board-react. */
declare type BoardDocumentConfig = BoardViewConfig & {
    id: string;
};

declare type BoardDueFilter = "overdue" | "today" | "nextSevenDays" | "none";

/** A user-defined custom field on a board's cards (stored in frontmatter / properties). */
declare type BoardFieldDef = {
    key: string;
    label: string;
    type?: BoardFieldType;
};

declare type BoardFieldType = "text" | "number" | "date";

/**
 * Personal, view-only board filters. Values within one dimension are ORed;
 * populated dimensions are ANDed together.
 */
declare type BoardFilters = {
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

declare type BoardGroupKey = "status" | "priority" | "assignee";

/** A board-level label definition: a tag's text + its display color. */
declare type BoardLabelDef = {
    label: string;
    color?: string | null;
};

export declare type BoardLocale = 'en' | 'zh' | 'ja' | 'ko';

/** Device/user-owned display state. Never serialize this into `.board`. */
export declare type BoardPersonalViewState = {
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

/** Lightweight project facts stored in the `.board` document. */
declare type BoardProjectMetadata = {
    key?: string;
    summary?: string;
    startDate?: string;
    targetDate?: string;
};

export declare type BoardResolution = {
    boardDocId: string;
    boardRelativePath: string;
    /** Folder holding the board's card `.md` documents. */
    boardDir: string;
};

declare type BoardSortKey = "manual" | "due" | "priority" | "title";

/** Persistent, user-editable swimlane definition stored in a `.board` file. */
declare type BoardSwimlane = {
    /** Immutable machine identity referenced by card frontmatter `swimlane`. */
    key: string;
    name: string;
    color?: string | null;
};

declare type BoardSwimlaneGroupKey = BoardGroupKey | "custom";

export declare type BoardTag = {
    id?: string;
    label: string;
    color?: string | null;
};

export declare type BoardViewCard = {
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

declare type BoardViewColumn = {
    key: string;
    name: string;
    color?: string | null;
    /** Optional WIP limit; the column flags when its card count exceeds this. */
    limit?: number | null;
};

declare type BoardViewConfig = {
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

declare type BoardViewType = "board" | "table" | "calendar" | "backlog" | "gantt";

declare type BoardWorkScope = "all" | "my-work" | "inbox";

declare type CalendarMode = "month" | "agenda";

export declare type CreateClientOptions = {
    /** Origin of the jtype server, e.g. `https://jtype.nightc.com`. */
    baseUrl: string;
    /** REST-capable user/session token. Board-pinned MCP tokens are not REST tokens. */
    token: string;
    /** Override fetch (tests, custom agents). Defaults to the global fetch. */
    fetchImpl?: typeof fetch;
};

export declare function createJTypeClient(opts: CreateClientOptions): JTypeBoardDataClient;

/**
 * Typed API failure. `code` is the server's typed error string (body `error`
 * field) when present, else a generic `http_<status>` / `network_error`.
 * The message never contains the token.
 */
export declare class JTypeApiError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(status: number, code: string);
}

/**
 * Embeddable jtype kanban board: give it `baseUrl`+`token` (or an injected
 * `client`) plus `workspaceId`+`boardRef` and it renders the same shared
 * BoardSurface the jtype desktop + web apps use, backed by the document API.
 */
export declare function JTypeBoard({ workspaceId, boardRef, baseUrl, token, client: injectedClient, readOnly, currentUser, viewState: controlledViewState, onViewStateChange, live, pollIntervalMs, initialCardPath, additionalCardRoots, onCardOpen, renderCardSupplement, onConnectionChange, locale, className, style, }: JTypeBoardProps): ReactElement;

export declare type JTypeBoardConnection = 'live' | 'polling' | 'error';

/**
 * Everything the board embed calls. `createJTypeClient` is the direct
 * (baseUrl + token) implementation; hosts can substitute their own proxy-backed
 * implementation so no jtype token ever reaches the browser.
 */
export declare interface JTypeBoardDataClient {
    listDocuments(workspaceId: string): Promise<JTypeDocumentListItem[]>;
    getDocument(workspaceId: string, docId: string): Promise<JTypeCloudDocument>;
    saveDocument(workspaceId: string, req: JTypeSaveDocumentRequest): Promise<JTypeSaveDocumentResponse>;
    /** Optional: enables the card Delete action. Absent → deleting fails visibly. */
    deleteDocument?(workspaceId: string, docId: string): Promise<void>;
    /**
     * Optional: subscribe to a board's live SSE feed
     * (`GET /api/v1/workspaces/:id/boards/:boardRef/events`, `boardRef` = the
     * board's logical id from its `.board` config). Since PR #45
     * (kanban-unification-v2, commit a4d2a31) the server rejects anything but a
     * full-scope session token on the live WS/SSE surfaces — an mcp-scoped token
     * gets 403. Implementations must surface that as
     * `onDown({ permanent: true })` so the board falls back to *visible* polling
     * instead of pretending to be live. Returns an unsubscribe function.
     */
    subscribeBoardEvents?(workspaceId: string, boardRef: string, handlers: LiveSubscriptionHandlers): () => void;
}

/**
 * Typed board-embed failure. Rendered as an explicit error state — never a
 * blank board.
 */
export declare class JTypeBoardError extends Error {
    readonly code: 'board_not_found' | 'board_ref_ambiguous' | 'board_config_invalid' | 'props_invalid';
    /** For `board_ref_ambiguous`: the matching `.board` paths. */
    readonly candidates: string[];
    constructor(code: JTypeBoardError['code'], detail?: string, candidates?: string[]);
}

export declare type JTypeBoardProps = {
    /** Cloud workspace id (UUID). */
    workspaceId: string;
    /** Board name or `.board` relative path; resolved via listDocuments. */
    boardRef: string;
    /** jtype server origin. XOR with `client`. */
    baseUrl?: string;
    /** REST-capable user/session token. Board-pinned MCP tokens are not REST tokens. */
    token?: string;
    /**
     * Injected data client. When set, EVERY request (loads, polling, writes,
     * live subscription) goes through it — the browser never talks to jtype
     * directly, so a host proxy can keep the token server-side.
     * Memoize it: a new identity per render restarts the board.
     */
    client?: JTypeBoardDataClient;
    /** Hide all mutation affordances (view-only board). Default false. */
    readOnly?: boolean;
    /** Current user's display name; enables My Work and project Inbox signals. */
    currentUser?: string;
    /** Host-controlled personal display state. The package never uses host storage. */
    viewState?: Partial<BoardPersonalViewState>;
    /** Persist or observe personal display-state patches in the host application. */
    onViewStateChange?: (patch: Partial<BoardPersonalViewState>) => void;
    /**
     * Try the live SSE feed (default true). The direct adapter requires a full
     * REST session token; board-pinned MCP credentials cannot be used here.
     * A rejected stream visibly falls back to polling (connection chip plus
     * onConnectionChange('polling')). Never a silent fake-live.
     */
    live?: boolean;
    /** Polling cadence in ms (default 30000, min 5000). */
    pollIntervalMs?: number;
    /** Open this Card path once after the initial board snapshot resolves. */
    initialCardPath?: string;
    /**
     * Bound Card discovery to the board folder plus these relative directories.
     * Omit to discover matching Cards across the workspace. The Card's `board`
     * frontmatter must always match the resolved board id.
     */
    additionalCardRoots?: readonly string[];
    /** Intercept card opens (replaces the built-in editable/read-only detail). */
    onCardOpen?: (card: BoardViewCard) => void;
    /**
     * Add host-owned content after native Properties and Relations without
     * replacing jtype's detail. Not rendered for intercepted opens.
     */
    renderCardSupplement?: (card: BoardViewCard) => ReactNode;
    /** Observe live/polling/error transitions. */
    onConnectionChange?: (state: JTypeBoardConnection) => void;
    /** Board chrome locale (default 'en'). Shared across instances (see README). */
    locale?: BoardLocale;
    className?: string;
    style?: CSSProperties;
};

export declare type JTypeCloudDocument = {
    relativePath: string;
    title: string;
    isPublished: boolean;
    content: string;
    contentHash: string;
    versionId: string;
    updatedClock: number;
};

export declare type JTypeDocumentListItem = {
    id: string;
    relativePath: string;
    title: string;
    isPublished: boolean;
    contentHash: string;
    updatedClock: number;
    versionId: string | null;
};

export declare type JTypeSaveDocumentRequest = {
    relativePath: string;
    title?: string;
    content: string;
    baseContentHash?: string;
    baseContent?: string;
    /** Atomically fail with 409 if the path already exists. Required for creates. */
    createOnly?: boolean;
};

export declare type JTypeSaveDocumentResponse = {
    relativePath: string;
    contentHash: string;
    updatedClock: number;
    mergeStatus: 'accepted' | 'merged' | 'unchanged';
};

export declare type LiveSubscriptionHandlers = {
    /** A board event arrived. Payload is deliberately opaque — refetch. */
    onEvent: () => void;
    /** The stream is connected and delivering. */
    onUp: () => void;
    /**
     * The stream failed or ended. `permanent: true` means retrying is pointless
     * for this credential (e.g. the server rejected the token's scope) and the
     * board should settle on polling.
     */
    onDown: (info: {
        permanent: boolean;
        reason: string;
    }) => void;
};

/**
 * Resolve a host-supplied `boardRef` to the workspace's `.board` config doc.
 * The host only knows a name (what jcode Cloud's kanban link stores) or a
 * relative path; resolution order:
 *   1. exact relativePath match (`boardRef` itself, or `boardRef` + `.board`);
 *   2. unique basename match anywhere in the workspace
 *      (any folder containing `<boardRef>.board`).
 * Multiple basename matches → `board_ref_ambiguous` listing the candidates
 * (pass the full path to disambiguate); none → `board_not_found`.
 */
export declare function resolveBoardDoc(docs: JTypeDocumentListItem[], boardRef: string): BoardResolution;

/** Persisted while a derived priority/assignee view is converted to custom lanes. */
declare type SwimlaneMigration = {
    version: 1;
    source: "priority" | "assignee";
    mapping: Array<{
        value: string;
        swimlaneKey: string;
    }>;
};

export { }
