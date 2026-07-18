import { useState } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import {
  PRIORITY_STYLE,
  BOARD_CARD_RENDER_BATCH_SIZE,
  currentMonth,
  groupCardsByDay,
  isIsoDate,
  monthMatrix,
  shiftMonth,
  sortCards,
  type BoardViewCard,
  type CalendarMode,
} from "../../lib/board";

/** Localized short weekday labels, Sunday-first (2023-01-01 was a Sunday). */
const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  new Date(2023, 0, 1 + i).toLocaleDateString(undefined, { weekday: "short" }),
);

/**
 * Calendar view over the same cards (Notion's "one data, many views"): a month
 * grid or an agenda list, keyed off each card's `due`. A card click opens the
 * same peek as the board/table. The remembered sub-mode lives in the board
 * config (`calendarMode`); the visible month is local cursor state.
 */
export function BoardCalendar({
  cards,
  today,
  doneKey,
  mode,
  onModeChange,
  selectedId,
  onSelect,
}: {
  cards: BoardViewCard[];
  today: string;
  doneKey: string;
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  selectedId?: string;
  onSelect: (card: BoardViewCard) => void;
}) {
  const [month, setMonth] = useState(() => currentMonth());
  const [agendaRenderLimit, setAgendaRenderLimit] = useState(BOARD_CARD_RENDER_BATCH_SIZE * 2);
  const byDay = groupCardsByDay(cards);
  const [ys, ms] = month.split("-");
  const monthLabel = new Date(Number(ys), Number(ms) - 1, 1).toLocaleDateString(undefined, { year: "numeric", month: "long" });

  const isOverdue = (c: BoardViewCard) => !!c.due && c.due < today && c.columnKey !== doneKey;

  const navBtn =
    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:border-brand/40 hover:text-brand-dark";
  const modeBtn = (m: CalendarMode) =>
    `rounded-md px-2 py-1 text-xs font-medium ${
      mode === m ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"
    }`;

  const cardChip = (card: BoardViewCard, compact: boolean) => {
    const overdue = isOverdue(card);
    return (
      <button
        key={card.id}
        type="button"
        onClick={() => onSelect(card)}
        title={card.title}
        className={`flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] transition-colors ${
          selectedId === card.id ? "bg-brand-soft/60" : "bg-stone-100/70 hover:bg-brand-soft/40"
        } ${overdue ? "text-red-600" : "text-stone-700"}`}
      >
        {card.priority && card.priority !== "none" && (
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_STYLE[card.priority]?.split(" ")[0] ?? "bg-stone-300"}`} />
        )}
        {card.icon && <span className="shrink-0">{card.icon}</span>}
        <span className="truncate">{card.title}</span>
        {!compact && (card.taskTotal ?? 0) > 0 && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-[10px] text-stone-400">
            <CheckCircleIcon className="h-2.5 w-2.5" />
            {card.taskDone}/{card.taskTotal}
          </span>
        )}
      </button>
    );
  };

  const header = (
    <div className="flex items-center gap-2 border-b border-black/[0.04] px-4 py-2">
      {mode === "month" && (
        <>
          <button type="button" className={navBtn} title={t`Previous month`} aria-label={t`Previous month`} onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button type="button" className={navBtn} title={t`Next month`} aria-label={t`Next month`} onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <span className="min-w-[8rem] text-sm font-medium text-brand-dark">{monthLabel}</span>
          <button
            type="button"
            className="rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-brand/40 hover:text-brand-dark"
            onClick={() => setMonth(currentMonth())}
          >
            <Trans>Today</Trans>
          </button>
        </>
      )}
      <div className="ml-auto inline-flex items-center rounded-lg border border-stone-200 p-0.5">
        <button type="button" className={modeBtn("month")} onClick={() => onModeChange("month")}>
          <Trans>Month</Trans>
        </button>
        <button type="button" className={modeBtn("agenda")} onClick={() => onModeChange("agenda")}>
          <Trans>Agenda</Trans>
        </button>
      </div>
    </div>
  );

  if (mode === "agenda") {
    const sorted = sortCards(cards, "due");
    const rendered = sorted.slice(0, agendaRenderLimit);
    const dated = rendered.filter((c) => isIsoDate(c.due));
    const undated = rendered.filter((c) => !isIsoDate(c.due));
    let lastDay = "";
    return (
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-total-cards={cards.length}
        data-rendered-cards={rendered.length}
      >
        {header}
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {dated.length === 0 && undated.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-stone-400">
              <Trans>No cards</Trans>
            </div>
          )}
          {dated.map((card) => {
            const showHeader = card.due !== lastDay;
            lastDay = card.due as string;
            return (
              <div key={card.id}>
                {showHeader && (
                  <div className={`mt-3 mb-1 text-xs font-medium ${card.due === today ? "text-brand-dark" : "text-brand-gray"}`}>
                    {card.due}
                    {card.due === today && (
                      <span className="ml-1 rounded bg-brand-soft px-1 text-[10px] text-brand-dark">
                        <Trans>Today</Trans>
                      </span>
                    )}
                  </div>
                )}
                <div className="max-w-xl">{cardChip(card, false)}</div>
              </div>
            );
          })}
          {undated.length > 0 && (
            <>
              <div className="mt-4 mb-1 text-xs font-medium text-stone-400">
                <Trans>Unscheduled</Trans>
              </div>
              <div className="max-w-xl space-y-0.5">{undated.map((card) => cardChip(card, false))}</div>
            </>
          )}
          {rendered.length < sorted.length && (
            <button
              type="button"
              className="mt-4 min-h-11 rounded-lg border border-dashed border-brand/20 px-4 py-2 text-xs font-semibold text-brand-dark hover:border-brand/40"
              onClick={() => setAgendaRenderLimit((limit) => limit + BOARD_CARD_RENDER_BATCH_SIZE * 2)}
            >
              <Trans>Show more</Trans> · {sorted.length - rendered.length}
            </button>
          )}
        </div>
      </div>
    );
  }

  const weeks = monthMatrix(month);
  const monthRenderedCount = weeks.flat().reduce(
    (count, day) => count + Math.min((byDay.get(day) ?? []).length, 4),
    0,
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-total-cards={cards.length} data-rendered-cards={monthRenderedCount}>
      {header}
      <div className="grid grid-cols-7 border-b border-black/[0.04] bg-[#fbfdfb]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-1 text-center text-[11px] font-medium uppercase tracking-wide text-brand-gray">
            {w}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-auto">
        {weeks.flat().map((day) => {
          const inMonth = day.slice(0, 7) === month;
          const isToday = day === today;
          const dayCards = byDay.get(day) ?? [];
          return (
            <div
              key={day}
              className={`flex min-h-[5.5rem] flex-col gap-0.5 border-b border-r border-black/[0.04] p-1 ${inMonth ? "" : "bg-stone-50/60"}`}
            >
              <div
                className={`mb-0.5 inline-flex h-5 w-5 items-center justify-center self-start rounded-full text-[11px] ${
                  isToday ? "bg-brand text-white" : inMonth ? "text-stone-500" : "text-stone-300"
                }`}
              >
                {Number(day.slice(8, 10))}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayCards.slice(0, 4).map((card) => cardChip(card, true))}
                {dayCards.length > 4 && (
                  <span className="px-1 text-[10px] text-stone-400">+{dayCards.length - 4}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
