import { Fragment, type ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  FunnelIcon,
  LockClosedIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  PRIORITY_ORDER,
  activeBoardFilterCount,
  type BoardDueFilter,
  type BoardFilters,
} from "../../lib/board";

type FilterDimension =
  | "priorities"
  | "assignees"
  | "tags"
  | "due"
  | "blocked"
  | "mine"
  | "missingRow";

function toggleValue(values: string[] | undefined, value: string): string[] | undefined {
  const next = new Set(values ?? []);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next.size > 0 ? [...next] : undefined;
}

function OptionButton({
  selected,
  children,
  onClick,
  selectionRole = "checkbox",
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
  selectionRole?: "checkbox" | "radio";
}) {
  return (
    <button
      type="button"
      role={selectionRole}
      aria-checked={selected}
      onClick={onClick}
      className={`flex min-h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-xs transition ${
        selected
          ? "bg-brand-soft/70 font-medium text-brand-dark"
          : "text-stone-600 hover:bg-stone-50"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
          selectionRole === "radio" ? "rounded-full" : "rounded"
        } ${
          selected ? "border-brand bg-brand text-white" : "border-stone-300 bg-white"
        }`}
        aria-hidden
      >
        {selected && <CheckIcon className="h-3 w-3" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line px-3 py-3 first:border-t-0">
      <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-gray">
        {title}
      </h3>
      {children}
    </section>
  );
}

function dueLabel(due: BoardDueFilter): string {
  if (due === "overdue") return t`Overdue`;
  if (due === "today") return t`Due today`;
  if (due === "nextSevenDays") return t`Next 7 days`;
  return t`No due date`;
}

export function BoardFilterPopover({
  filters,
  onChange,
  assignees,
  tags,
  currentUser,
  visibleCount,
  totalCount,
  portalClassName,
}: {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  assignees: string[];
  tags: string[];
  currentUser?: string;
  visibleCount: number;
  totalCount: number;
  portalClassName?: string;
}) {
  const activeCount = activeBoardFilterCount(filters);
  const portal = portalClassName ? ` ${portalClassName}` : "";
  const update = <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const clearDimension = (dimension: FilterDimension) => {
    const next = { ...filters };
    delete next[dimension];
    onChange(next);
  };

  const chips: Array<{ key: FilterDimension; label: string }> = [];
  if (filters.priorities?.length) {
    const priorities = filters.priorities.map((priority) =>
      priority === "none" ? t`No priority` : priority,
    );
    chips.push({ key: "priorities", label: t`Priority: ${priorities.join(", ")}` });
  }
  if (filters.assignees?.length) {
    chips.push({
      key: "assignees",
      label: t`Assignee: ${filters.assignees
        .map((assignee) => assignee || t`Unassigned`)
        .join(", ")}`,
    });
  }
  if (filters.tags?.length) {
    chips.push({ key: "tags", label: t`Labels: ${filters.tags.join(", ")}` });
  }
  if (filters.due) chips.push({ key: "due", label: dueLabel(filters.due) });
  if (filters.blocked) chips.push({ key: "blocked", label: t`Blocked` });
  if (filters.mine) chips.push({ key: "mine", label: t`My cards` });
  if (filters.missingRow) chips.push({ key: "missingRow", label: t`Missing row` });

  return (
    <Fragment>
      <Popover className="relative">
        <PopoverButton
          className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs transition ${
            activeCount > 0
              ? "border-brand/40 bg-brand-soft/60 font-medium text-brand-dark"
              : "border-stone-200 bg-white text-stone-600 hover:border-brand/40 hover:text-brand-dark"
          }`}
          aria-label={activeCount > 0 ? t`Filters, ${activeCount} active` : t`Filters`}
        >
          <FunnelIcon className="h-3.5 w-3.5" />
          <Trans>Filters</Trans>
          {activeCount > 0 && (
            <span className="rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">
              {activeCount}
            </span>
          )}
          <ChevronDownIcon className="h-3 w-3 text-stone-400" />
        </PopoverButton>
        <PopoverPanel
          anchor="bottom start"
          className={`z-40 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-line bg-white shadow-xl shadow-emerald-950/10 [--anchor-gap:6px] focus:outline-none${portal}`}
        >
          <div className="flex min-h-12 items-center gap-3 px-4">
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-stone-800">
                <Trans>Filter cards</Trans>
              </span>
              <span className="block text-[10px] text-brand-gray">
                <Trans>
                  {visibleCount} of {totalCount} cards shown
                </Trans>
              </span>
            </span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => onChange({})}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-brand-dark hover:bg-brand-soft"
              >
                <Trans>Clear all</Trans>
              </button>
            )}
          </div>

          <div className="max-h-[min(70vh,34rem)] overflow-y-auto">
            <FilterSection title={<Trans>Priority</Trans>}>
              <div className="grid grid-cols-2 gap-1">
                {PRIORITY_ORDER.map((priority) => (
                  <OptionButton
                    key={priority}
                    selected={filters.priorities?.includes(priority) ?? false}
                    onClick={() =>
                      update("priorities", toggleValue(filters.priorities, priority))
                    }
                  >
                    {priority === "none" ? t`No priority` : priority}
                  </OptionButton>
                ))}
              </div>
            </FilterSection>

            <FilterSection title={<Trans>Assignee</Trans>}>
              <div className="space-y-1">
                {currentUser && (
                  <OptionButton
                    selected={!!filters.mine}
                    onClick={() => update("mine", filters.mine ? undefined : true)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <UserCircleIcon className="h-3.5 w-3.5" />
                      <Trans>My cards</Trans>
                    </span>
                  </OptionButton>
                )}
                <OptionButton
                  selected={filters.assignees?.includes("") ?? false}
                  onClick={() =>
                    update("assignees", toggleValue(filters.assignees, ""))
                  }
                >
                  <Trans>Unassigned</Trans>
                </OptionButton>
                {assignees.map((assignee) => (
                  <OptionButton
                    key={assignee}
                    selected={filters.assignees?.includes(assignee) ?? false}
                    onClick={() =>
                      update("assignees", toggleValue(filters.assignees, assignee))
                    }
                  >
                    {assignee}
                  </OptionButton>
                ))}
              </div>
            </FilterSection>

            {tags.length > 0 && (
              <FilterSection title={<Trans>Labels</Trans>}>
                <div className="space-y-1">
                  {tags.map((tag) => (
                    <OptionButton
                      key={tag}
                      selected={filters.tags?.includes(tag) ?? false}
                      onClick={() => update("tags", toggleValue(filters.tags, tag))}
                    >
                      {tag}
                    </OptionButton>
                  ))}
                </div>
              </FilterSection>
            )}

            <FilterSection title={<Trans>Due date</Trans>}>
              <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label={t`Due date`}>
                {(["overdue", "today", "nextSevenDays", "none"] as BoardDueFilter[]).map(
                  (due) => (
                    <OptionButton
                      key={due}
                      selected={filters.due === due}
                      selectionRole="radio"
                      onClick={() => update("due", due)}
                    >
                      {dueLabel(due)}
                    </OptionButton>
                  ),
                )}
              </div>
            </FilterSection>

            <FilterSection title={<Trans>Card state</Trans>}>
              <OptionButton
                selected={!!filters.blocked}
                onClick={() => update("blocked", filters.blocked ? undefined : true)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <LockClosedIcon className="h-3.5 w-3.5" />
                  <Trans>Blocked cards</Trans>
                </span>
              </OptionButton>
              {filters.missingRow && (
                <div className="mt-1">
                  <OptionButton
                    selected
                    onClick={() => update("missingRow", undefined)}
                  >
                    <Trans>Cards with a missing row</Trans>
                  </OptionButton>
                </div>
              )}
            </FilterSection>
          </div>
        </PopoverPanel>
      </Popover>

      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => clearDimension(chip.key)}
          title={t`Remove filter`}
          aria-label={t`Remove filter: ${chip.label}`}
          className="inline-flex h-7 max-w-48 items-center gap-1 rounded-full border border-brand/20 bg-brand-soft/45 px-2 text-[11px] font-medium text-brand-dark hover:border-brand/40 hover:bg-brand-soft"
        >
          <span className="truncate">{chip.label}</span>
          <XMarkIcon className="h-3 w-3 shrink-0" />
        </button>
      ))}
    </Fragment>
  );
}
