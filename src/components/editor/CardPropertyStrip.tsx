import { ViewColumnsIcon, UserIcon, CalendarDaysIcon, TagIcon } from "@heroicons/react/24/outline";
import { Trans } from "@lingui/react/macro";
import { parseFrontmatter } from "@shared/lib/frontmatter";

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-amber-100 text-amber-700",
  medium: "bg-sky-100 text-sky-700",
  low: "bg-stone-100 text-stone-500",
};

/**
 * A read-only summary strip shown above a card document (a `.md` note with a
 * `board` frontmatter field): a clean chip view of the card's properties. The
 * properties themselves are edited in the board (peek / inline), not here, so
 * this strip stays a non-editable summary. Renders nothing for ordinary docs.
 */
export function CardPropertyStrip({ content }: { content: string }) {
  const { data } = parseFrontmatter(content);
  if (!data.board) return null;

  const tags = data.tags
    ? data.tags
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean)
    : [];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.05] bg-[#f6faf7] px-5 py-2 text-xs">
      <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 font-medium text-brand-dark">
        <ViewColumnsIcon className="h-3.5 w-3.5" />
        <Trans>Card</Trans>
      </span>
      {data.icon && <span className="text-sm leading-none">{data.icon}</span>}
      {data.status && (
        <span className="rounded-md bg-white px-1.5 py-0.5 text-stone-600 ring-1 ring-black/[0.06]">{data.status}</span>
      )}
      {data.priority && data.priority !== "none" && (
        <span className={`rounded px-1.5 py-0.5 font-medium ${PRIORITY_STYLE[data.priority] ?? "bg-stone-100 text-stone-500"}`}>
          {data.priority}
        </span>
      )}
      {data.assignee && (
        <span className="inline-flex items-center gap-0.5 text-brand-gray">
          <UserIcon className="h-3 w-3" />
          {data.assignee}
        </span>
      )}
      {data.due && (
        <span className="inline-flex items-center gap-0.5 text-brand-gray">
          <CalendarDaysIcon className="h-3 w-3" />
          {data.due}
        </span>
      )}
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-0.5 rounded bg-brand-soft/60 px-1.5 py-0.5 text-brand-dark">
          <TagIcon className="h-3 w-3" />
          {tag}
        </span>
      ))}
      <span className="ml-auto text-[11px] text-stone-400">
        <Trans>Edit properties in the board</Trans>
      </span>
    </div>
  );
}
