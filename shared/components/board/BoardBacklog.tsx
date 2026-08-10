import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import {
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  FlagIcon,
  LockClosedIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { boardBacklogGroups } from "../../lib/boardPlanning";
import { PRIORITY_STYLE, type BoardViewCard, type BoardViewColumn } from "../../lib/board";

export function BoardBacklog({
  cards,
  columns,
  selectedId,
  selectedIds,
  readOnly,
  blockedCardIds,
  collapsedGroupKeys,
  onSelect,
  onToggleSelect,
  onToggleCollapsed,
}: {
  cards: BoardViewCard[];
  columns: BoardViewColumn[];
  selectedId?: string;
  selectedIds?: ReadonlySet<string>;
  readOnly?: boolean;
  blockedCardIds?: ReadonlySet<string>;
  collapsedGroupKeys?: ReadonlySet<string>;
  onSelect: (card: BoardViewCard) => void;
  onToggleSelect?: (cardId: string) => void;
  onToggleCollapsed?: (groupKey: string) => void;
}) {
  const archivedCards = cards.filter((card) => card.archived);
  const groups = [
    ...boardBacklogGroups(cards, columns),
    ...(archivedCards.length > 0 ? [{ key: "__archived", name: t`Archived`, cards: archivedCards }] : []),
  ];

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-stone-50 px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-3">
        {groups.map((group) => (
          <Disclosure
            as="section"
            key={`${group.key}:${collapsedGroupKeys?.has(group.key) ? "closed" : "open"}`}
            defaultOpen={!collapsedGroupKeys?.has(group.key)}
            className="overflow-hidden rounded-xl border border-line bg-white shadow-sm"
          >
            {({ open }) => <>
            <DisclosureButton
              onClick={() => onToggleCollapsed?.(group.key)}
              className="flex min-h-11 w-full cursor-pointer items-center gap-2 border-b border-line px-4 text-left text-xs font-semibold text-stone-700 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
            >
              <ChevronDownIcon className={`h-3.5 w-3.5 text-stone-400 transition ${open ? "rotate-0" : "-rotate-90"}`} />
              <span>{group.name}</span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                {group.cards.length}
              </span>
            </DisclosureButton>
            <DisclosurePanel>
            {group.cards.length === 0 ? (
              <div className="px-4 py-5 text-xs text-stone-400"><Trans>No cards in this status</Trans></div>
            ) : (
              <div className="divide-y divide-line">
                {group.cards.map((card) => {
                  const checked = selectedIds?.has(card.id) ?? false;
                  return (
                    <div
                      key={card.id}
                      className={`flex min-h-12 items-center gap-2 px-3 py-1.5 transition hover:bg-brand-soft/25 ${
                        selectedId === card.id || checked ? "bg-brand-soft/40" : ""
                      }`}
                    >
                      {!readOnly && onToggleSelect && (
                        <button
                          type="button"
                          aria-label={checked ? t`Remove from selection` : t`Add to selection`}
                          aria-pressed={checked}
                          onClick={() => onToggleSelect(card.id)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                            checked ? "border-brand bg-brand text-white" : "border-stone-300 bg-white"
                          }`}
                        >
                          {checked && <CheckIcon className="h-3 w-3" />}
                        </button>
                      )}
                      <button
                        type="button"
                        data-card-id={card.id}
                        aria-current={selectedId === card.id ? "true" : undefined}
                        onClick={(event) => {
                          if ((event.metaKey || event.ctrlKey) && !readOnly && onToggleSelect) onToggleSelect(card.id);
                          else onSelect(card);
                        }}
                        className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-md px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="shrink-0 text-base" aria-hidden>{card.icon || "·"}</span>
                          <span className="min-w-24 flex-1 truncate text-sm font-medium text-stone-800">{card.title}</span>
                          {card.priority && card.priority !== "none" && (
                            <span className={`hidden rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline ${PRIORITY_STYLE[card.priority] ?? "bg-stone-100 text-stone-500"}`}>
                              <FlagIcon className="mr-0.5 inline h-3 w-3" />{card.priority}
                            </span>
                          )}
                          {blockedCardIds?.has(card.id) && <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"><LockClosedIcon className="h-3 w-3" /><Trans>Blocked</Trans></span>}
                          {card.tags.slice(0, 2).map((tag) => <span key={tag.label} className="hidden max-w-28 truncate rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600 lg:inline">{tag.label}</span>)}
                        </span>
                        <span className="flex shrink-0 items-center gap-3 text-[11px] text-brand-gray">
                          {card.assignee && <span className="hidden items-center gap-1 md:inline-flex"><UserIcon className="h-3.5 w-3.5" />{card.assignee}</span>}
                          {(card.start || card.due) && <span className="inline-flex items-center gap-1"><CalendarDaysIcon className="h-3.5 w-3.5" />{[card.start, card.due].filter(Boolean).join(" → ")}</span>}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            </DisclosurePanel>
            </>}
          </Disclosure>
        ))}
      </div>
    </div>
  );
}
