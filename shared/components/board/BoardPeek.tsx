import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { XMarkIcon, TrashIcon, ArrowsPointingOutIcon, EyeIcon, PencilSquareIcon, PaperClipIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { renderToContainer } from "../../lib/markdown";
import { PRIORITIES, attachmentName, type BoardViewCard } from "../../lib/board";
import { fieldCls, EmojiField, ListboxSelect, TagMultiSelect } from "./controls";
import type { BoardOption } from "./types";
import type { BoardTag } from "../../lib/board";

/**
 * Side peek for editing a card without leaving the board. Platform-agnostic: it
 * edits a normalized {@link BoardViewCard} and emits debounced `onChange` patches.
 * Assignee/tags fall back to free-text unless the platform supplies option lists.
 */
export function BoardPeek({
  card,
  statusOptions,
  assigneeOptions,
  tagOptions,
  loadNotes,
  onUploadAttachment,
  onChange,
  onClose,
  onDelete,
  onOpenFull,
}: {
  card: BoardViewCard;
  statusOptions: BoardOption[];
  assigneeOptions?: BoardOption[];
  tagOptions?: BoardTag[];
  loadNotes?: (id: string) => Promise<string>;
  onUploadAttachment?: (file: File) => Promise<string>;
  onChange: (patch: Partial<BoardViewCard>) => void;
  onClose: () => void;
  onDelete: () => void;
  onOpenFull?: () => void;
}) {
  const [draft, setDraft] = useState<BoardViewCard>(card);
  const [notes, setNotes] = useState(card.notes ?? "");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [newAttach, setNewAttach] = useState("");
  const [uploading, setUploading] = useState(false);
  const previewRef = useRef<HTMLElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-init when a different card is opened; lazily load notes if needed.
  useEffect(() => {
    setDraft(card);
    setNotes(card.notes ?? "");
    if (loadNotes) {
      let cancelled = false;
      void loadNotes(card.id).then((body) => {
        if (!cancelled) setNotes(body);
      });
      return () => {
        cancelled = true;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  const debouncedPatch = useCallback(
    (patch: Partial<BoardViewCard>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onChange(patch), 350);
    },
    [onChange],
  );

  const setField = (patch: Partial<BoardViewCard>, immediate = false) => {
    setDraft((d) => ({ ...d, ...patch }));
    if (immediate) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      onChange(patch);
    } else {
      debouncedPatch(patch);
    }
  };

  const setBodyText = (value: string) => {
    setNotes(value);
    debouncedPatch({ notes: value });
  };

  useEffect(() => {
    if (mode !== "preview" || !previewRef.current) return;
    void renderToContainer(notes, previewRef.current);
  }, [mode, notes]);

  const tagLabels = draft.tags.map((t2) => t2.label);

  const attachments = draft.attachments ?? [];
  const setAttachments = (next: string[]) => setField({ attachments: next }, true);
  const addAttachment = (url: string) => {
    const u = url.trim();
    if (u && !attachments.includes(u)) setAttachments([...attachments, u]);
  };
  const handleUpload = async (file: File | undefined) => {
    if (!file || !onUploadAttachment) return;
    setUploading(true);
    try {
      addAttachment(await onUploadAttachment(file));
    } finally {
      setUploading(false);
    }
  };

  return (
    <aside className="flex h-full w-full flex-col border-l border-black/[0.06] bg-white">
      <div className="flex items-center justify-between border-b border-black/[0.05] px-3 py-2">
        <span className="text-xs font-medium text-brand-gray">
          <Trans>Card</Trans>
        </span>
        <div className="flex items-center gap-1">
          {onOpenFull && (
            <button
              type="button"
              onClick={onOpenFull}
              title={t`Open in full editor`}
              className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-brand-dark"
            >
              <ArrowsPointingOutIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            title={t`Delete card`}
            className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={onClose} title={t`Close`} className="rounded p-1 text-stone-400 hover:bg-stone-100">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <input
          className="w-full bg-transparent text-base font-semibold text-stone-900 focus:outline-none"
          placeholder={t`Untitled card`}
          value={draft.title}
          onChange={(e) => setField({ title: e.target.value })}
        />

        <div className="mt-3 grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5">
          <span className="text-xs text-brand-gray">
            <Trans>Icon</Trans>
          </span>
          <EmojiField value={draft.icon} onChange={(v) => setField({ icon: v }, true)} />

          <span className="text-xs text-brand-gray">
            <Trans>Status</Trans>
          </span>
          <ListboxSelect
            value={draft.columnKey}
            options={statusOptions}
            onChange={(v) => setField({ columnKey: v }, true)}
          />

          <span className="text-xs text-brand-gray">
            <Trans>Priority</Trans>
          </span>
          <ListboxSelect
            value={draft.priority ?? "none"}
            options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            onChange={(v) => setField({ priority: v }, true)}
          />

          <span className="text-xs text-brand-gray">
            <Trans>Assignee</Trans>
          </span>
          {assigneeOptions ? (
            <ListboxSelect
              value={draft.assignee ?? ""}
              options={assigneeOptions}
              onChange={(v) => setField({ assignee: v }, true)}
            />
          ) : (
            <input
              className={fieldCls}
              value={draft.assignee ?? ""}
              placeholder="—"
              onChange={(e) => setField({ assignee: e.target.value })}
            />
          )}

          <span className="text-xs text-brand-gray">
            <Trans>Due</Trans>
          </span>
          <input
            type="date"
            className={fieldCls}
            value={draft.due ?? ""}
            onChange={(e) => setField({ due: e.target.value }, true)}
          />

          <span className="text-xs text-brand-gray">
            <Trans>Tags</Trans>
          </span>
          {tagOptions ? (
            <TagMultiSelect
              value={tagLabels}
              options={tagOptions.map((tg) => ({ label: tg.label, color: tg.color }))}
              onChange={(labels) =>
                setField({ tags: labels.map((l) => tagOptions.find((tg) => tg.label === l) ?? { label: l }) }, true)
              }
            />
          ) : (
            <input
              className={fieldCls}
              value={tagLabels.join(", ")}
              placeholder={t`comma, separated`}
              onChange={(e) =>
                setField({
                  tags: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((label) => ({ label })),
                })
              }
            />
          )}
        </div>

        <div className="mt-4">
          <span className="text-xs font-medium text-brand-gray">
            <Trans>Attachments</Trans>
          </span>
          {attachments.length > 0 && (
            <div className="mt-1 space-y-1">
              {attachments.map((url) => (
                <div key={url} className="flex items-center gap-1.5 rounded border border-stone-200 px-2 py-1 text-xs">
                  <PaperClipIcon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                  <a href={url} target="_blank" rel="noreferrer" className="flex-1 truncate text-brand-dark hover:underline" title={url}>
                    {attachmentName(url)}
                  </a>
                  <button
                    type="button"
                    onClick={() => setAttachments(attachments.filter((a) => a !== url))}
                    title={t`Remove`}
                    className="rounded p-0.5 text-stone-400 hover:text-red-600"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-1.5">
            <form
              className="flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                addAttachment(newAttach);
                setNewAttach("");
              }}
            >
              <input className={fieldCls} placeholder={t`Paste a URL or path`} value={newAttach} onChange={(e) => setNewAttach(e.target.value)} />
            </form>
            {onUploadAttachment && (
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-brand/40 hover:text-brand-dark">
                <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                {uploading ? <Trans>Uploading…</Trans> : <Trans>Upload</Trans>}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    void handleUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium text-brand-gray">
            <Trans>Notes</Trans>
          </span>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "write" ? "preview" : "write"))}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-stone-500 hover:bg-stone-100"
          >
            {mode === "write" ? (
              <>
                <EyeIcon className="h-3.5 w-3.5" />
                <Trans>Preview</Trans>
              </>
            ) : (
              <>
                <PencilSquareIcon className="h-3.5 w-3.5" />
                <Trans>Write</Trans>
              </>
            )}
          </button>
        </div>

        {mode === "write" ? (
          <textarea
            className="mt-1.5 min-h-[220px] w-full resize-y rounded-lg border border-stone-200 p-2 font-mono text-[13px] leading-6 text-stone-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            value={notes}
            placeholder={t`Add details...`}
            onChange={(e) => setBodyText(e.target.value)}
          />
        ) : (
          <article ref={previewRef} className="preview mt-1.5 min-h-[220px] rounded-lg border border-stone-100 p-2 text-sm" />
        )}
      </div>
    </aside>
  );
}
