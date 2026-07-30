import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  FlagIcon,
  TagIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PRIORITIES, type BoardTag, type BoardViewCard } from "../../lib/board";
import { fieldCls, ListboxSelect, TagMultiSelect } from "./controls";
import type { BoardOption } from "./types";

export type CardCreateDraft = Pick<BoardViewCard, "title"> &
  Partial<Pick<BoardViewCard, "columnKey" | "priority" | "assignee" | "due" | "notes" | "tags">>;

export function CardCreateDialog({
  open,
  boardTitle,
  laneName,
  initialStatus,
  initialPriority = "none",
  initialAssignee = "",
  statusOptions,
  assigneeOptions,
  tagOptions,
  portalClassName,
  onClose,
  onCreate,
}: {
  open: boolean;
  boardTitle: string;
  laneName: string;
  initialStatus: string;
  initialPriority?: string;
  initialAssignee?: string;
  statusOptions: BoardOption[];
  assigneeOptions?: BoardOption[];
  tagOptions?: BoardTag[];
  portalClassName?: string;
  onClose: () => void;
  onCreate: (draft: CardCreateDraft) => Promise<boolean | void> | boolean | void;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(initialPriority);
  const [assignee, setAssignee] = useState(initialAssignee);
  const [due, setDue] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagText, setTagText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const portal = portalClassName ? ` ${portalClassName}` : "";

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setNotes("");
    setStatus(initialStatus);
    setPriority(initialPriority);
    setAssignee(initialAssignee);
    setDue("");
    setTags([]);
    setTagText("");
    setSubmitting(false);
    setSubmitError("");
    window.setTimeout(() => titleRef.current?.focus(), 0);
  }, [initialAssignee, initialPriority, initialStatus, open]);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const created = await onCreate({
        title: trimmed,
        columnKey: status,
        priority,
        assignee: assignee || null,
        due: due || null,
        notes,
        tags: tags.map((label) => tagOptions?.find((tag) => tag.label === label) ?? { label }),
      });
      if (created !== false) onClose();
    } catch {
      setSubmitError(t`Could not create card. Try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? () => {} : onClose} className={`fixed inset-0 z-50${portal}`}>
      <DialogBackdrop className={`fixed inset-0 bg-stone-950/25 backdrop-blur-[3px]${portal}`} />
      <div className={`fixed inset-0 flex items-center justify-center overflow-y-auto p-3 sm:p-6${portal}`}>
        <DialogPanel
          className={`flex min-h-[430px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_28px_90px_rgba(28,25,23,0.22)] ring-1 ring-black/[0.06]${portal}`}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void submit();
            }
          }}
        >
          <div className="flex items-center gap-2 px-6 pb-3 pt-5 text-xs text-brand-gray">
            <span className="max-w-[15rem] truncate font-medium text-stone-600">{boardTitle}</span>
            <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-stone-300" />
            <DialogTitle className="font-semibold text-stone-800">
              <Trans>New card</Trans>
            </DialogTitle>
            <span className="ml-auto rounded-full bg-brand-soft px-2 py-1 font-medium text-brand-dark">
              {laneName}
            </span>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              title={t`Close`}
              aria-label={t`Close`}
              className="ml-1 rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-40"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 px-6 pb-5">
            <input
              ref={titleRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t`Card title`}
              aria-label={t`Card title`}
              className="w-full bg-transparent text-[1.35rem] font-semibold tracking-[-0.02em] text-stone-900 outline-none placeholder:text-stone-300"
            />
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t`Add a description…`}
              aria-label={t`Description`}
              className="mt-3 min-h-44 w-full resize-none bg-transparent text-sm leading-6 text-stone-700 outline-none placeholder:text-stone-400"
            />
          </div>

          <div className="border-t border-line px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <PropertyChip icon={<FlagIcon className="h-3.5 w-3.5" />}>
                <ListboxSelect
                  value={status}
                  options={statusOptions}
                  onChange={setStatus}
                  portalClassName={portalClassName}
                />
              </PropertyChip>
              <PropertyChip icon={<FlagIcon className="h-3.5 w-3.5" />}>
                <ListboxSelect
                  value={priority}
                  options={PRIORITIES.map((value) => ({ value, label: value }))}
                  onChange={setPriority}
                  portalClassName={portalClassName}
                />
              </PropertyChip>
              <PropertyChip icon={<UserIcon className="h-3.5 w-3.5" />}>
                {assigneeOptions ? (
                  <ListboxSelect
                    value={assignee}
                    options={[{ value: "", label: t`Unassigned` }, ...assigneeOptions]}
                    onChange={setAssignee}
                    portalClassName={portalClassName}
                  />
                ) : (
                  <input
                    value={assignee}
                    onChange={(event) => setAssignee(event.target.value)}
                    placeholder={t`Unassigned`}
                    aria-label={t`Assignee`}
                    className={`${fieldCls} w-28`}
                  />
                )}
              </PropertyChip>
              <PropertyChip icon={<TagIcon className="h-3.5 w-3.5" />}>
                {tagOptions ? (
                  <TagMultiSelect
                    value={tags}
                    options={tagOptions.map((tag) => ({ label: tag.label, color: tag.color }))}
                    onChange={setTags}
                    portalClassName={portalClassName}
                  />
                ) : (
                  <input
                    value={tagText}
                    onChange={(event) => {
                      setTagText(event.target.value);
                      setTags(
                        event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      );
                    }}
                    placeholder={t`Add labels`}
                    aria-label={t`Tags`}
                    className={`${fieldCls} w-28`}
                  />
                )}
              </PropertyChip>
              <PropertyChip icon={<CalendarDaysIcon className="h-3.5 w-3.5" />}>
                <input
                  type="date"
                  value={due}
                  onChange={(event) => setDue(event.target.value)}
                  aria-label={t`Due`}
                  className={fieldCls}
                />
              </PropertyChip>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-line bg-stone-50/70 px-5 py-3">
            {submitError ? (
              <span role="alert" className="text-[11px] font-medium text-red-600">
                {submitError}
              </span>
            ) : (
              <span className="text-[11px] text-stone-400">
                <Trans>Markdown is supported</Trans>
              </span>
            )}
            <span className="ml-auto hidden text-[11px] text-stone-400 sm:inline">
              <Trans>Press ⌘/Ctrl + Enter to create</Trans>
            </span>
            <button
              type="button"
              disabled={!title.trim() || submitting}
              onClick={() => void submit()}
              className="rounded-lg bg-brand-dark px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? <Trans>Creating…</Trans> : <Trans>Create card</Trans>}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function PropertyChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-1.5 text-stone-400 shadow-sm [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-1 [&_button]:shadow-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-1 [&_input]:shadow-none">
      {icon}
      <div className="min-w-24 text-stone-700">{children}</div>
    </div>
  );
}
