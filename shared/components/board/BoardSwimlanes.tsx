import { useState } from "react";
import { Trans } from "@lingui/react/macro";
import { CheckCircleIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import {
  PRIORITY_STYLE,
  BOARD_CARD_RENDER_BATCH_SIZE,
  groupValueOf,
  partitionSwimlanes,
  sortCards,
  type BoardGroupKey,
  type BoardViewCard,
  type BoardViewColumn,
} from "../../lib/board";

/**
 * Two-dimensional board view: the primary grouping as columns and a second
 * dimension as horizontal swimlanes (rows). A read-friendly overview built from
 * the same cards as the kanban — clicking a card opens the same peek (where its
 * status / swimlane attribute can be changed). Drag stays in the 1-D board view.
 */
export function BoardSwimlanes({
  cards,
  columns,
  lanes,
  groupKey,
  swimlaneKey,
  today,
  doneKey,
  selectedId,
  onSelect,
}: {
  cards: BoardViewCard[];
  columns: BoardViewColumn[];
  lanes: BoardViewColumn[];
  groupKey: BoardGroupKey;
  swimlaneKey: BoardGroupKey;
  today: string;
  doneKey: string;
  selectedId?: string;
  onSelect: (card: BoardViewCard) => void;
}) {
  const [renderLimit, setRenderLimit] = useState(BOARD_CARD_RENDER_BATCH_SIZE * 2);
  const renderedCards = cards.slice(0, renderLimit);
  const fullGrid = partitionSwimlanes(cards, groupKey, swimlaneKey);
  const grid = partitionSwimlanes(renderedCards, groupKey, swimlaneKey);
  const gridCols = { gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(11rem, 1fr))` };

  const chip = (card: BoardViewCard) => {
    const overdue = card.due && card.due < today && card.columnKey !== doneKey;
    return (
      <button
        key={card.id}
        type="button"
        onClick={() => onSelect(card)}
        title={card.title}
        className={`block w-full rounded-lg bg-white p-2 text-left text-sm shadow-sm ring-1 transition hover:ring-brand/30 ${
          selectedId === card.id ? "ring-brand/60" : "ring-black/[0.04]"
        }`}
      >
        <span className="block truncate text-stone-800">
          {card.icon && <span className="mr-1">{card.icon}</span>}
          {card.title}
        </span>
        {((card.priority && card.priority !== "none") || card.due || (card.taskTotal ?? 0) > 0) && (
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {card.priority && card.priority !== "none" && (
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_STYLE[card.priority] ?? "bg-stone-100 text-stone-500"}`}>{card.priority}</span>
            )}
            {(card.taskTotal ?? 0) > 0 && (
              <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${card.taskDone === card.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`}>
                <CheckCircleIcon className="h-3 w-3" />
                {card.taskDone}/{card.taskTotal}
              </span>
            )}
            {card.due && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] ${overdue ? "font-medium text-red-600" : "text-brand-gray"}`}>
                <CalendarDaysIcon className="h-3 w-3" />
                {card.due}
              </span>
            )}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="min-h-0 flex-1 overflow-auto p-4"
      data-total-cards={cards.length}
      data-rendered-cards={renderedCards.length}
    >
      <div className="min-w-max">
        {/* Column header row */}
        <div className="sticky top-0 z-10 grid gap-3 bg-[#fbfdfb] pb-1.5" style={gridCols}>
          {columns.map((col) => (
            <div key={col.key} className="px-1 text-[11px] font-medium uppercase tracking-wide text-brand-gray">
              {col.name}
            </div>
          ))}
        </div>

        {lanes.map((lane) => {
          const row = grid.get(lane.key);
          const fullRow = fullGrid.get(lane.key);
          const laneTotal = fullRow ? [...fullRow.values()].reduce((n, cell) => n + cell.length, 0) : 0;
          return (
            <div key={lane.key} className="mb-2">
              <div className="flex items-center gap-2 py-1.5">
                <span className="text-xs font-semibold text-brand-dark">{lane.name}</span>
                <span className="rounded-full bg-stone-100 px-1.5 text-[11px] text-stone-400">{laneTotal}</span>
              </div>
              <div className="grid items-start gap-3" style={gridCols}>
                {columns.map((col) => {
                  const cell = sortCards((row?.get(col.key) ?? []).filter((c) => groupValueOf(c, groupKey) === col.key), "manual");
                  return (
                    <div key={col.key} className="min-h-[3rem] space-y-2 rounded-lg bg-[#f6faf7] p-1.5">
                      {cell.map((card) => chip(card))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {lanes.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-stone-400">
            <Trans>No cards</Trans>
          </div>
        )}
        {renderedCards.length < cards.length && (
          <button
            type="button"
            className="min-h-11 w-full rounded-lg border border-dashed border-brand/20 px-4 py-2 text-xs font-semibold text-brand-dark hover:border-brand/40"
            onClick={() => setRenderLimit((limit) => limit + BOARD_CARD_RENDER_BATCH_SIZE * 2)}
          >
            <Trans>Show more</Trans> · {cards.length - renderedCards.length}
          </button>
        )}
      </div>
    </div>
  );
}
