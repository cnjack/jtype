import { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "@lingui/react";
import { BoardPeek, BoardSurface, type BoardActions } from "@shared/components/board";
import {
  slugify,
  type BoardSwimlane,
  type BoardViewCard,
  type BoardViewConfig,
} from "@shared/lib/board";
import { i18n, ensureLocaleActivated } from "@shared/i18n";
import "../../src/styles.css";

declare global {
  interface Window {
    __BOARD_TEST_DROP_UPDATES__?: boolean;
    __BOARD_TEST_STATE__?: {
      config: BoardViewConfig;
      cards: BoardViewCard[];
      actions: Array<{
        type: "setConfig" | "updateCards";
        swimlaneKeys?: string[];
        cardIds?: string[];
      }>;
    };
  }
}

const initialConfig: BoardViewConfig = {
  title: "Product roadmap",
  groupBy: "status",
  swimlaneBy: "custom",
  columns: [
    { key: "todo", name: "To do", color: "#0ea5e9" },
    { key: "doing", name: "Doing", color: "#f59e0b", limit: 3 },
    { key: "done", name: "Done", color: "#22c55e" },
  ],
  doneColumn: "done",
  swimlanes: [
    { key: "lane_platform_11111111", name: "Platform", color: "#0ea5e9" },
    { key: "lane_growth_22222222", name: "Growth", color: "#22c55e" },
    { key: "lane_operations_33333333", name: "Operations", color: "#8b5cf6" },
  ],
};

const initialCards: BoardViewCard[] = [
  {
    id: "roadmap/offline.md",
    columnKey: "todo",
    position: 0,
    title: "Offline conflict indicator",
    priority: "high",
    assignee: "Jack",
    due: "2026-08-02",
    swimlaneKey: "lane_platform_11111111",
    tags: [{ label: "frontend" }],
    blockedBy: ["roadmap/dependency"],
  },
  {
    id: "roadmap/analytics.md",
    columnKey: "doing",
    position: 0,
    title: "Publishing analytics",
    priority: "medium",
    assignee: "Kim",
    due: "2026-08-05",
    swimlaneKey: "lane_growth_22222222",
    tags: [{ label: "analytics" }],
  },
  {
    id: "roadmap/legacy.md",
    columnKey: "done",
    position: 0,
    title: "Legacy lane cleanup",
    priority: "low",
    assignee: "Jack",
    swimlaneKey: "lane_deleted_99999999",
    tags: [],
  },
  {
    id: "roadmap/import.md",
    columnKey: "todo",
    position: 1,
    title: "Board import mapping",
    priority: "none",
    swimlaneKey: null,
    tags: [],
  },
];

function Harness() {
  const [config, setConfig] = useState<BoardViewConfig>(initialConfig);
  const [cards, setCards] = useState<BoardViewCard[]>(initialCards);
  const actionLog = useRef<
    Array<{
      type: "setConfig" | "updateCards";
      swimlaneKeys?: string[];
      cardIds?: string[];
    }>
  >([]);

  window.__BOARD_TEST_STATE__ = { config, cards, actions: actionLog.current };

  const actions = useMemo<BoardActions>(
    () => ({
      setConfig: async (patch) => {
        await Promise.resolve();
        actionLog.current.push({
          type: "setConfig",
          swimlaneKeys: patch.swimlanes?.map((lane) => lane.key),
        });
        setConfig((current) => ({ ...current, ...patch }));
      },
      createCard: async (columnKey, title) => {
        const id = `roadmap/${slugify(title)}.md`;
        setCards((current) => [
          ...current,
          {
            id,
            columnKey,
            position: current.length,
            title,
            priority: "none",
            swimlaneKey: null,
            tags: [],
          },
        ]);
        return id;
      },
      updateCard: async (cardId, patch) => {
        await Promise.resolve();
        setCards((current) =>
          current.map((card) => (card.id === cardId ? { ...card, ...patch } : card)),
        );
      },
      updateCards: async (updates, onProgress) => {
        actionLog.current.push({
          type: "updateCards",
          cardIds: updates.map((update) => update.cardId),
        });
        if (window.__BOARD_TEST_DROP_UPDATES__) {
          onProgress?.(updates.length, updates.length);
          return;
        }
        let completed = 0;
        for (const update of updates) {
          await Promise.resolve();
          setCards((current) =>
            current.map((card) =>
              card.id === update.cardId ? { ...card, ...update.patch } : card,
            ),
          );
          completed += 1;
          onProgress?.(completed, updates.length);
        }
      },
      moveCard: async (cardId, columnKey, position) => {
        setCards((current) =>
          current.map((card) =>
            card.id === cardId ? { ...card, columnKey, position } : card,
          ),
        );
      },
      deleteCard: async (card) => {
        setCards((current) => current.filter((item) => item.id !== card.id));
      },
      addColumn: async (name) => {
        const key = slugify(name);
        setConfig((current) => ({
          ...current,
          columns: [...current.columns, { key, name }],
        }));
      },
      renameColumn: async (key) => {
        setConfig((current) => ({
          ...current,
          columns: current.columns.map((column) =>
            column.key === key ? { ...column, name: `${column.name} renamed` } : column,
          ),
        }));
      },
      deleteColumn: async (key) => {
        setConfig((current) => ({
          ...current,
          columns: current.columns.filter((column) => column.key !== key),
        }));
      },
      reorderColumns: async (fromKey, toKey) => {
        setConfig((current) => {
          const columns = [...current.columns];
          const from = columns.findIndex((column) => column.key === fromKey);
          const to = columns.findIndex((column) => column.key === toKey);
          if (from < 0 || to < 0) return current;
          const [column] = columns.splice(from, 1);
          if (column) columns.splice(to, 0, column);
          return { ...current, columns };
        });
      },
      setColumnColor: async (key, color) => {
        setConfig((current) => ({
          ...current,
          columns: current.columns.map((column) =>
            column.key === key ? { ...column, color } : column,
          ),
        }));
      },
      setColumnLimit: async (key) => {
        setConfig((current) => ({
          ...current,
          columns: current.columns.map((column) =>
            column.key === key ? { ...column, limit: column.limit ? null : 4 } : column,
          ),
        }));
      },
      toggleDoneColumn: async (key) => {
        setConfig((current) => ({
          ...current,
          doneColumn: current.doneColumn === key ? undefined : key,
        }));
      },
    }),
    [],
  );

  return (
    <BoardSurface
      config={config}
      cards={cards}
      actions={actions}
      currentUser="Jack"
      peekComponent={BoardPeek}
    />
  );
}

ensureLocaleActivated("en");
createRoot(document.getElementById("root")!).render(
  <I18nProvider i18n={i18n}>
    <Harness />
  </I18nProvider>,
);
