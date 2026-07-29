import type { ComponentType } from "react";
import type {
  BoardViewCard,
  BoardViewConfig,
  BoardTag,
  BoardComment,
  BoardActivityEvent,
  BoardFieldDef,
} from "../../lib/board";

/** Mutations the board surface performs; each platform wires these to its data layer. */
export type BoardActions = {
  moveCard: (cardId: string, toColumnKey: string, index: number) => Promise<void> | void;
  /** Create a card; may return the new card id so the board opens its peek. */
  createCard: (columnKey: string, title: string) => Promise<string | void> | string | void;
  /** Apply a partial edit to a card (status/priority/assignee/due/tags/icon/title/notes). */
  updateCard: (cardId: string, patch: Partial<BoardViewCard>) => Promise<void> | void;
  /**
   * Apply several card patches and refresh once. Used by swimlane conversion
   * and move-before-delete so adapters can preserve optimistic-lock metadata.
   */
  updateCards?: (
    updates: Array<{ cardId: string; patch: Partial<BoardViewCard> }>,
    onProgress?: (completed: number, total: number) => void,
  ) => Promise<void> | void;
  deleteCard: (card: BoardViewCard) => Promise<void> | void;
  /** Bulk delete with a single confirmation (multi-select toolbar). Omit to
   *  hide the bulk Delete action. */
  deleteCards?: (cards: BoardViewCard[]) => Promise<void> | void;
  duplicateCard?: (card: BoardViewCard) => Promise<void> | void;
  copyCardLink?: (card: BoardViewCard) => Promise<void> | void;
  saveAsTemplate?: (card: BoardViewCard) => Promise<void> | void;
  openCardFull?: (card: BoardViewCard) => void;
  reorderColumns?: (fromKey: string, toKey: string) => Promise<void> | void;
  /** Create a column with the given name (the surface collects it inline). */
  addColumn?: (name: string) => Promise<void> | void;
  renameColumn?: (key: string) => Promise<void> | void;
  deleteColumn?: (key: string) => Promise<void> | void;
  setColumnColor?: (key: string, color: string | null) => Promise<void> | void;
  setColumnLimit?: (key: string) => Promise<void> | void;
  toggleDoneColumn?: (key: string) => Promise<void> | void;
  /**
   * Persist a view-config patch. Desktop + web file boards write the `.board`
   * document; the web DB kanban stores it per-board in localStorage.
   */
  setConfig: (patch: Partial<BoardViewConfig>) => Promise<void> | void;
  refresh?: () => Promise<void> | void;
};

export type BoardOption = {
  value: string;
  label: string;
  /** Optional categorical dot shown before the label. */
  color?: string | null;
  /** Marks a recoverable but invalid/missing current value. */
  warning?: boolean;
};

/**
 * Props of the card side peek. Lives here (not in BoardPeek.tsx) so the surface
 * can type its `peekComponent` slot without importing the peek implementation —
 * the peek pulls the markdown renderer (katex/marked/dompurify), which embeds
 * that never render it must be able to leave out of their bundle.
 */
export type BoardPeekProps = {
  card: BoardViewCard;
  statusOptions: BoardOption[];
  /** Custom swimlane definitions; omit to hide the field. */
  swimlaneOptions?: BoardOption[];
  /** Keep the mapping visible but immutable during a multi-document migration. */
  swimlaneDisabled?: boolean;
  assigneeOptions?: BoardOption[];
  tagOptions?: BoardTag[];
  /** Board-level custom field definitions to render as editable inputs. */
  fields?: BoardFieldDef[];
  /** Add a new custom field to the board (collected inline). */
  onAddField?: (label: string) => void;
  /** Sibling cards (excluding this one) offered as dependency targets. */
  dependencyCards?: { slug: string; title: string }[];
  /** Sub-cards of this card (children resolved via the `parent` slug). */
  childCards?: { id: string; title: string; icon?: string | null; statusName: string; done: boolean }[];
  /** Open another card's peek (sub-card list navigation). */
  onOpenCard?: (cardId: string) => void;
  /** Create a sub-card of this card (title collected inline). */
  onAddChild?: (title: string) => Promise<void> | void;
  loadNotes?: (id: string) => Promise<string>;
  onUploadAttachment?: (file: File) => Promise<string>;
  loadComments?: (id: string) => Promise<BoardComment[]>;
  addComment?: (id: string, body: string, parentId?: string) => Promise<BoardComment>;
  updateComment?: (commentId: string, body: string) => Promise<BoardComment>;
  deleteComment?: (commentId: string) => Promise<void>;
  toggleReaction?: (commentId: string, emoji: string) => Promise<BoardComment>;
  resolveComment?: (commentId: string, resolved: boolean) => Promise<BoardComment>;
  currentUser?: string;
  loadActivity?: (id: string) => Promise<BoardActivityEvent[]>;
  onChange: (patch: Partial<BoardViewCard>) => void;
  onClose: () => void;
  onDelete: () => void;
  onOpenFull?: () => void;
};

export type BoardSurfaceProps = {
  config: BoardViewConfig;
  cards: BoardViewCard[];
  actions: BoardActions;
  error?: string;
  /** Templates for "new from template" (web may omit). */
  templates?: { id: string; name: string }[];
  createFromTemplate?: (columnKey: string, templateId: string) => Promise<void> | void;
  /** Peek editing options (see design §1.2). */
  assigneeOptions?: BoardOption[];
  tagOptions?: BoardTag[];
  /** Lazily load a card's notes/body when opening the peek (desktop). */
  loadNotes?: (cardId: string) => Promise<string>;
  /** Upload a file as a card attachment, returning its URL/path. Omit to allow only URL/path entry. */
  onUploadAttachment?: (file: File) => Promise<string>;
  /** Card comments (cloud). Supply load/add/delete + currentUser to enable the section. */
  loadComments?: (cardId: string) => Promise<BoardComment[]>;
  addComment?: (cardId: string, body: string, parentId?: string) => Promise<BoardComment>;
  updateComment?: (commentId: string, body: string) => Promise<BoardComment>;
  deleteComment?: (commentId: string) => Promise<void>;
  toggleReaction?: (commentId: string, emoji: string) => Promise<BoardComment>;
  resolveComment?: (commentId: string, resolved: boolean) => Promise<BoardComment>;
  /** Current user's display name, to show delete only on their own comments. */
  currentUser?: string;
  /** Load a card's activity timeline (DB board); omit to hide the Activity section. */
  loadActivity?: (cardId: string) => Promise<BoardActivityEvent[]>;
  /**
   * Fullscreen ("focus mode") state, owned by the platform shell. When provided,
   * the surface shows a toggle button. Both platforms hide the sidebar + keep the
   * app header (so the macOS traffic-light area stays clear) rather than overlaying
   * the whole window. Omit to hide the button (e.g. inline embeds).
   */
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** Open the platform's board settings dialog (web: webhooks + MCP). Omit to hide the gear button. */
  onOpenSettings?: () => void;
  /**
   * Read-only surface: hides every mutation affordance (card + column drag, the
   * inline card/column composers, and the per-card/column action menus) while
   * keeping tap-to-open, search, filter, sort, and view switching. Omit/false
   * for the full interactive board (desktop + web). Used by embeds that only
   * have viewer access.
   */
  readOnly?: boolean;
  /**
   * Intercept a card open. When provided, tapping a card (or pressing Enter, or
   * selecting one in the table/calendar) calls this instead of opening the
   * built-in side peek — so a platform can render its own card detail (e.g. an
   * embed with a read-only detail, or a host-supplied handler). Omit to keep the
   * built-in editable peek (desktop + web).
   */
  onCardOpen?: (card: BoardViewCard) => void;
  /**
   * The card side-peek implementation, injected by the platform (desktop + web
   * pass the shared {@link BoardPeekProps}-shaped BoardPeek). A slot rather than
   * a direct import so embeds that intercept opens via `onCardOpen` don't carry
   * the peek's markdown-renderer dependency chain. Omit = no built-in peek.
   */
  peekComponent?: ComponentType<BoardPeekProps>;
  /**
   * Extra class for every panel the surface renders into a Headless UI portal
   * (the anchored dropdown menus). Portals mount at body level — outside any
   * wrapper element — so a style-scoped embed needs its scope class ON the
   * panel itself; scoping by Headless UI's own portal attribute would restyle
   * the HOST app's portals too. Desktop + web omit it (no-op).
   */
  portalClassName?: string;
};
