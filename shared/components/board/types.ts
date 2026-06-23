import type { BoardViewCard, BoardViewConfig, BoardTag, BoardComment, BoardActivityEvent } from "../../lib/board";

/** Mutations the board surface performs; each platform wires these to its data layer. */
export type BoardActions = {
  moveCard: (cardId: string, toColumnKey: string, index: number) => Promise<void> | void;
  /** Create a card; may return the new card id so the board opens its peek. */
  createCard: (columnKey: string, title: string) => Promise<string | void> | string | void;
  /** Apply a partial edit to a card (status/priority/assignee/due/tags/icon/title/notes). */
  updateCard: (cardId: string, patch: Partial<BoardViewCard>) => Promise<void> | void;
  deleteCard: (card: BoardViewCard) => Promise<void> | void;
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
  /** Persist a view-config patch (desktop → .board; web → localStorage). */
  setConfig: (patch: Partial<BoardViewConfig>) => Promise<void> | void;
  refresh?: () => Promise<void> | void;
};

export type BoardOption = { value: string; label: string };

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
  /** Card comments (DB board). Supply all three + currentUser to enable the section. */
  loadComments?: (cardId: string) => Promise<BoardComment[]>;
  addComment?: (cardId: string, body: string) => Promise<BoardComment>;
  deleteComment?: (commentId: string) => Promise<void>;
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
};
