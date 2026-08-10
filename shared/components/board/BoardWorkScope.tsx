import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import type { ReactNode } from "react";
import {
  BellAlertIcon,
  CalendarDaysIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { boardMyWorkCards } from "../../lib/boardPlanning";
import type { BoardInboxItem, BoardViewCard, BoardWorkScope } from "../../lib/board";

const inboxIcon = {
  mention: ChatBubbleLeftEllipsisIcon,
  reminder: BellAlertIcon,
  due: CalendarDaysIcon,
  blocked: LockClosedIcon,
};

export function BoardWorkScopeView({
  scope,
  cards,
  inboxItems,
  currentUser,
  selectedId,
  selectedIds,
  readOnly,
  statusName,
  doneKey,
  today,
  blockedCardIds,
  onSelect,
  onToggleSelect,
  onDismissInbox,
}: {
  scope: Exclude<BoardWorkScope, "all">;
  cards: BoardViewCard[];
  inboxItems: BoardInboxItem[];
  currentUser?: string;
  selectedId?: string;
  selectedIds?: ReadonlySet<string>;
  readOnly?: boolean;
  statusName: (key: string) => string;
  doneKey: string;
  today: string;
  blockedCardIds?: ReadonlySet<string>;
  onSelect: (card: BoardViewCard) => void;
  onToggleSelect?: (cardId: string) => void;
  onDismissInbox: (key: string) => void;
}) {
  const inboxSummary = (item: BoardInboxItem): string => {
    if (item.kind === "mention") return t`Mentioned @${currentUser?.trim() ?? ""}`;
    if (item.kind === "reminder") return t`Reminder due`;
    if (item.kind === "blocked") return t`Work is blocked`;
    return item.date && item.date < today ? t`Overdue` : t`Due today`;
  };

  if (!currentUser?.trim()) {
    return (
      <EmptyState
        icon={UserCircleIcon}
        title={<Trans>Sign in to see personal work</Trans>}
        body={<Trans>My Work and Inbox use your identity to find assigned cards, mentions and reminders.</Trans>}
      />
    );
  }

  if (scope === "inbox") {
    if (inboxItems.length === 0) {
      return <EmptyState icon={CheckIcon} title={<Trans>Inbox zero</Trans>} body={<Trans>You're caught up. New mentions, reminders, due work and blockers appear here.</Trans>} />;
    }
    return (
      <div className="min-h-0 flex-1 overflow-auto bg-stone-50 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          {inboxItems.map((item) => {
            const card = cards.find((candidate) => candidate.id === item.cardId);
            const Icon = inboxIcon[item.kind] ?? ExclamationTriangleIcon;
            return (
              <div key={item.key} className="group flex min-h-16 items-center gap-3 border-b border-line px-4 last:border-b-0 hover:bg-brand-soft/20">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark"><Icon className="h-4 w-4" /></span>
                <button
                  type="button"
                  disabled={!card}
                  data-card-id={card?.id}
                  onClick={() => card && onSelect(card)}
                  className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-default"
                >
                  <span className="block truncate text-sm font-medium text-stone-800">{item.title}</span>
                  <span className="block truncate text-xs text-brand-gray">{inboxSummary(item)}{item.date ? ` · ${item.date}` : ""}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDismissInbox(item.key)}
                  title={t`Dismiss`}
                  aria-label={t`Dismiss ${item.title}`}
                  className="rounded-md p-1.5 text-stone-400 opacity-60 outline-none hover:bg-white hover:text-stone-700 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand group-hover:opacity-100"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const mine = boardMyWorkCards(cards, currentUser, doneKey, today, blockedCardIds);
  if (mine.length === 0) {
    return <EmptyState icon={UserCircleIcon} title={<Trans>No assigned work</Trans>} body={<Trans>Cards assigned to you across this project appear here.</Trans>} />;
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-stone-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        {mine.map((card) => {
          const checked = selectedIds?.has(card.id) ?? false;
          return (
            <div
              key={card.id}
              className={`flex items-center gap-2 border-b border-line px-3 py-1.5 last:border-b-0 hover:bg-brand-soft/20 ${selectedId === card.id || checked ? "bg-brand-soft/35" : ""}`}
            >
              {!readOnly && onToggleSelect && (
                <button
                  type="button"
                  aria-pressed={checked}
                  aria-label={checked ? t`Remove from selection` : t`Add to selection`}
                  onClick={() => onToggleSelect(card.id)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border outline-none focus-visible:ring-2 focus-visible:ring-brand ${checked ? "border-brand bg-brand text-white" : "border-stone-300"}`}
                >
                  {checked && <CheckIcon className="h-3 w-3" />}
                </button>
              )}
              <button
                type="button"
                data-card-id={card.id}
                onClick={(event) => {
                  if ((event.metaKey || event.ctrlKey) && !readOnly && onToggleSelect) onToggleSelect(card.id);
                  else onSelect(card);
                }}
                className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-1 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span aria-hidden>{card.icon}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-stone-800">{card.title}</span>
                    <span className="flex items-center gap-2 truncate text-[11px] text-brand-gray">
                      {statusName(card.columnKey)}
                      {blockedCardIds?.has(card.id) && <span className="inline-flex items-center gap-1 text-amber-700"><LockClosedIcon className="h-3 w-3" /><Trans>Blocked</Trans></span>}
                    </span>
                  </span>
                </span>
                {card.due && <span className="inline-flex items-center gap-1 text-[11px] text-brand-gray"><CalendarDaysIcon className="h-3.5 w-3.5" />{card.due}</span>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: typeof UserCircleIcon; title: ReactNode; body: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-stone-50 p-8 text-center">
      <div className="max-w-sm"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"><Icon className="h-5 w-5" /></span><h2 className="mt-3 text-sm font-semibold text-stone-800">{title}</h2><p className="mt-1 text-xs leading-5 text-brand-gray">{body}</p></div>
    </div>
  );
}
