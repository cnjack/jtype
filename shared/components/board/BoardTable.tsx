import { Trans } from "@lingui/react/macro";
import { UserIcon, CalendarDaysIcon, CheckCircleIcon, TagIcon } from "@heroicons/react/24/outline";
import { PRIORITY_STYLE, type BoardViewCard } from "../../lib/board";

/**
 * Table view over the same cards (Notion's "one data, many views"): a flat,
 * sorted list. Row click opens the same peek as the board.
 */
export function BoardTable({
  cards,
  statusName,
  today,
  doneKey,
  selectedId,
  onSelect,
}: {
  cards: BoardViewCard[];
  statusName: (key: string) => string;
  today: string;
  doneKey: string;
  selectedId?: string;
  onSelect: (card: BoardViewCard) => void;
}) {
  const th = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-brand-gray";
  const td = "px-3 py-2 align-middle";
  const dash = <span className="text-stone-300">—</span>;

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-[#fbfdfb]">
          <tr className="border-b border-black/[0.08]">
            <th className={th}>
              <Trans>Title</Trans>
            </th>
            <th className={th}>
              <Trans>Status</Trans>
            </th>
            <th className={th}>
              <Trans>Priority</Trans>
            </th>
            <th className={th}>
              <Trans>Assignee</Trans>
            </th>
            <th className={th}>
              <Trans>Due</Trans>
            </th>
            <th className={th}>
              <Trans>Tags</Trans>
            </th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => {
            const overdue = card.due && card.due < today && card.columnKey !== doneKey;
            return (
              <tr
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(card)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelect(card);
                }}
                className={`cursor-pointer border-b border-black/[0.04] transition-colors hover:bg-brand-soft/30 ${
                  selectedId === card.id ? "bg-brand-soft/40" : ""
                }`}
              >
                <td className={`${td} text-stone-800`}>
                  <span className="flex items-center gap-1.5">
                    {card.icon && <span>{card.icon}</span>}
                    <span className="truncate">{card.title}</span>
                    {(card.taskTotal ?? 0) > 0 && (
                      <span
                        className={`inline-flex items-center gap-0.5 rounded px-1 text-[11px] font-medium ${
                          card.taskDone === card.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        <CheckCircleIcon className="h-3 w-3" />
                        {card.taskDone}/{card.taskTotal}
                      </span>
                    )}
                  </span>
                </td>
                <td className={`${td} text-stone-600`}>{statusName(card.columnKey)}</td>
                <td className={td}>
                  {card.priority && card.priority !== "none" ? (
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_STYLE[card.priority] ?? "bg-stone-100 text-stone-500"}`}>
                      {card.priority}
                    </span>
                  ) : (
                    dash
                  )}
                </td>
                <td className={`${td} text-stone-600`}>
                  {card.assignee ? (
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5 text-brand-gray" />
                      {card.assignee}
                    </span>
                  ) : (
                    dash
                  )}
                </td>
                <td className={td}>
                  {card.due ? (
                    <span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-red-600" : "text-stone-600"}`}>
                      <CalendarDaysIcon className="h-3.5 w-3.5" />
                      {card.due}
                    </span>
                  ) : (
                    dash
                  )}
                </td>
                <td className={td}>
                  {card.tags.length ? (
                    <span className="flex flex-wrap gap-1">
                      {card.tags.map((tag) => (
                        <span
                          key={tag.label}
                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-brand-dark"
                          style={{ backgroundColor: tag.color ? `${tag.color}22` : undefined }}
                        >
                          <TagIcon className="h-3 w-3" />
                          {tag.label}
                        </span>
                      ))}
                    </span>
                  ) : (
                    dash
                  )}
                </td>
              </tr>
            );
          })}
          {cards.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-sm text-stone-400">
                <Trans>No cards</Trans>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
