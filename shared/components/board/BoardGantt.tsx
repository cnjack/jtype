import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { ReactNode } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import {
  boardGanttItem,
  boardGanttRange,
  isPlanningDay,
  type BoardGanttItem,
} from "../../lib/boardPlanning";
import type { BoardProjectMetadata, BoardViewCard } from "../../lib/board";

const DAY_WIDTH = 28;
const ROW_HEIGHT = 44;

function dayLabel(day: string, locale: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale || "en", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

export function BoardGantt({
  cards,
  project,
  today,
  selectedId,
  onSelect,
}: {
  cards: BoardViewCard[];
  project?: BoardProjectMetadata;
  today: string;
  selectedId?: string;
  onSelect: (card: BoardViewCard) => void;
}) {
  const { i18n } = useLingui();
  const range = boardGanttRange(cards, project, today);
  const items = cards.map((card) => boardGanttItem(card, range)).filter((item): item is BoardGanttItem => !!item);
  const scheduledIds = new Set(items.map((item) => item.card.id));
  const hasSchedule = (card: BoardViewCard) => isPlanningDay(card.start) || isPlanningDay(card.due);
  const outsideTimeline = cards.filter((card) => hasSchedule(card) && !scheduledIds.has(card.id));
  const unscheduled = cards.filter((card) => !hasSchedule(card));
  const days = Array.from({ length: range.days }, (_, index) => {
    const date = new Date(`${range.start}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-stone-50 p-4 sm:p-5">
      <div className="min-w-max overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="sticky top-0 z-20 flex h-12 border-b border-line bg-white/95 backdrop-blur">
          <div className="sticky left-0 z-30 flex w-72 shrink-0 items-center border-r border-line bg-white px-4">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-stone-800">{project?.summary || <Trans>Project timeline</Trans>}</p>
              <p className="text-[10px] text-brand-gray">{range.start} – {range.end}</p>
            </div>
          </div>
          <div className="relative flex" style={{ width: range.days * DAY_WIDTH }}>
            {days.map((day, index) => (
              <div
                key={day}
                title={day}
                className={`flex w-7 shrink-0 items-end justify-center border-r border-line pb-1 text-[9px] ${
                  day === today ? "bg-brand-soft font-semibold text-brand-dark" : index % 7 === 0 ? "bg-stone-50 text-stone-500" : "text-stone-400"
                }`}
              >
                {index % 7 === 0 || day === today ? dayLabel(day, i18n.locale).replace(" ", "\n") : day.slice(8)}
              </div>
            ))}
          </div>
        </div>

        {items.map((item) => (
          <GanttRow key={item.card.id} item={item} days={range.days} selected={selectedId === item.card.id} onSelect={onSelect} />
        ))}

        {items.length === 0 && (
          <div className="flex h-24 items-center justify-center text-xs text-stone-400"><Trans>No scheduled cards yet</Trans></div>
        )}
      </div>

      <GanttCardBucket cards={outsideTimeline} title={<Trans>Outside timeline</Trans>} onSelect={onSelect} />
      <GanttCardBucket cards={unscheduled} title={<Trans>Unscheduled</Trans>} onSelect={onSelect} />
    </div>
  );
}

function GanttCardBucket({
  cards,
  title,
  onSelect,
}: {
  cards: BoardViewCard[];
  title: ReactNode;
  onSelect: (card: BoardViewCard) => void;
}) {
  if (cards.length === 0) return null;
  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <CalendarDaysIcon className="h-4 w-4 text-stone-400" />
        <h3 className="text-xs font-semibold text-stone-700">{title}</h3>
        <span className="rounded-full bg-stone-100 px-2 text-[10px] text-stone-500">{cards.length}</span>
      </header>
      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            data-card-id={card.id}
            onClick={() => onSelect(card)}
            className="min-w-0 rounded-lg border border-line bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-700 outline-none transition hover:border-brand/30 hover:bg-brand-soft/30 focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span className="mr-1.5" aria-hidden>{card.icon}</span>{card.title}
          </button>
        ))}
      </div>
    </section>
  );
}

function GanttRow({
  item,
  days,
  selected,
  onSelect,
}: {
  item: BoardGanttItem;
  days: number;
  selected: boolean;
  onSelect: (card: BoardViewCard) => void;
}) {
  const left = Math.max(0, item.offset) * DAY_WIDTH;
  const width = Math.max(1, Math.min(item.span, days - Math.max(0, item.offset))) * DAY_WIDTH;
  return (
    <div className={`flex border-b border-line last:border-b-0 ${selected ? "bg-brand-soft/25" : ""}`} style={{ height: ROW_HEIGHT }}>
      <button
        type="button"
        data-card-id={item.card.id}
        onClick={() => onSelect(item.card)}
        className="sticky left-0 z-10 flex w-72 shrink-0 items-center gap-2 border-r border-line bg-white px-4 text-left outline-none hover:bg-brand-soft/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        <span aria-hidden>{item.card.icon}</span>
        <span className="truncate text-xs font-medium text-stone-700">{item.card.title}</span>
      </button>
      <div className="relative bg-[linear-gradient(to_right,var(--color-line)_1px,transparent_1px)] bg-[length:28px_100%]" style={{ width: days * DAY_WIDTH }}>
        {item.milestone ? (
          <button
            type="button"
            title={`${item.card.title} · ${item.end}`}
            aria-label={`${item.card.title}, ${t`milestone`} ${item.end}`}
            onClick={() => onSelect(item.card)}
            className="absolute top-1/2 -translate-y-1/2 text-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
            style={{ left: left + DAY_WIDTH / 2 - 8 }}
          >
            <span className="block h-3.5 w-3.5 rotate-45 rounded-[2px] bg-brand shadow-sm" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            title={`${item.card.title} · ${item.start} – ${item.end}`}
            aria-label={`${item.card.title}, ${item.start} ${t`to`} ${item.end}`}
            onClick={() => onSelect(item.card)}
            className="absolute top-2.5 h-6 min-w-5 overflow-hidden rounded-md bg-brand px-2 text-left text-[10px] font-medium leading-6 text-white shadow-sm outline-none hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            style={{ left, width }}
          >
            <span className="block truncate">{item.card.title}</span>
          </button>
        )}
      </div>
    </div>
  );
}
