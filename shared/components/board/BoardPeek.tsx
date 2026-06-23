import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { XMarkIcon, TrashIcon, ArrowsPointingOutIcon, EyeIcon, PencilSquareIcon, PaperClipIcon, ArrowUpTrayIcon, ChatBubbleLeftIcon, ClockIcon } from "@heroicons/react/24/outline";
import { renderToContainer } from "../../lib/markdown";
import { PRIORITIES, attachmentName, isSafeAttachmentUrl, type BoardViewCard } from "../../lib/board";
import { fieldCls, EmojiField, ListboxSelect, TagMultiSelect } from "./controls";
import type { BoardOption } from "./types";
import type { BoardTag, BoardFieldDef, BoardComment, BoardActivityEvent } from "../../lib/board";

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
  fields,
  onAddField,
  dependencyCards,
  loadNotes,
  onUploadAttachment,
  loadComments,
  addComment,
  deleteComment,
  currentUser,
  loadActivity,
  onChange,
  onClose,
  onDelete,
  onOpenFull,
}: {
  card: BoardViewCard;
  statusOptions: BoardOption[];
  assigneeOptions?: BoardOption[];
  tagOptions?: BoardTag[];
  /** Board-level custom field definitions to render as editable inputs. */
  fields?: BoardFieldDef[];
  /** Add a new custom field to the board (collected inline). */
  onAddField?: (label: string) => void;
  /** Sibling cards (excluding this one) offered as dependency targets. */
  dependencyCards?: { slug: string; title: string }[];
  loadNotes?: (id: string) => Promise<string>;
  onUploadAttachment?: (file: File) => Promise<string>;
  loadComments?: (id: string) => Promise<BoardComment[]>;
  addComment?: (id: string, body: string) => Promise<BoardComment>;
  deleteComment?: (commentId: string) => Promise<void>;
  currentUser?: string;
  loadActivity?: (id: string) => Promise<BoardActivityEvent[]>;
  onChange: (patch: Partial<BoardViewCard>) => void;
  onClose: () => void;
  onDelete: () => void;
  onOpenFull?: () => void;
}) {
  const [newField, setNewField] = useState("");
  const [draft, setDraft] = useState<BoardViewCard>(card);
  const [notes, setNotes] = useState(card.notes ?? "");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [newAttach, setNewAttach] = useState("");
  const [uploading, setUploading] = useState(false);
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [activity, setActivity] = useState<BoardActivityEvent[]>([]);
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

  // Load comments when a card opens (DB board only).
  useEffect(() => {
    if (!loadComments) {
      setComments([]);
      return;
    }
    let cancelled = false;
    setNewComment("");
    void loadComments(card.id)
      .then((cs) => {
        if (!cancelled) setComments(cs);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  // Load the activity timeline when a card opens (DB board only).
  useEffect(() => {
    if (!loadActivity) {
      setActivity([]);
      return;
    }
    let cancelled = false;
    void loadActivity(card.id)
      .then((evs) => {
        if (!cancelled) setActivity(evs);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  const submitComment = async () => {
    const body = newComment.trim();
    if (!body || !addComment) return;
    try {
      const created = await addComment(card.id, body);
      setComments((cs) => [...cs, created]);
      setNewComment("");
    } catch {
      /* surfaced by the caller's error state */
    }
  };
  const removeComment = async (id: string) => {
    if (!deleteComment) return;
    try {
      await deleteComment(id);
      setComments((cs) => cs.filter((c) => c.id !== id));
    } catch {
      /* ignore */
    }
  };

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

  // Dependency editing maps slug<->title so the picker shows titles while the
  // card stores slugs. Unresolved slugs (renamed/cross-board) are preserved as-is.
  const slugToTitle = new Map((dependencyCards ?? []).map((c) => [c.slug, c.title]));
  const titleToSlug = new Map((dependencyCards ?? []).map((c) => [c.title, c.slug]));
  const depOptions = (dependencyCards ?? []).map((c) => ({ label: c.title }));
  const depField = (key: "blockedBy" | "blocks" | "relates") => (
    <TagMultiSelect
      value={(draft[key] ?? []).map((s) => slugToTitle.get(s) ?? s)}
      options={depOptions}
      onChange={(titles) => setField({ [key]: titles.map((tt) => titleToSlug.get(tt) ?? tt) }, true)}
    />
  );

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

          {fields?.map((f) => (
            <Fragment key={f.key}>
              <span className="truncate text-xs text-brand-gray" title={f.label}>
                {f.label}
              </span>
              <input
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                className={fieldCls}
                value={draft.custom?.[f.key] ?? ""}
                onChange={(e) => setField({ custom: { ...(draft.custom ?? {}), [f.key]: e.target.value } }, f.type === "date" || f.type === "number")}
              />
            </Fragment>
          ))}
          {onAddField && (
            <>
              <span className="text-xs text-brand-gray" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const label = newField.trim();
                  if (label) {
                    onAddField(label);
                    setNewField("");
                  }
                }}
              >
                <input
                  className={fieldCls}
                  placeholder={t`+ Add field`}
                  value={newField}
                  onChange={(e) => setNewField(e.target.value)}
                />
              </form>
            </>
          )}
          {dependencyCards && (
            <>
              <span className="text-xs text-brand-gray">
                <Trans>Blocked by</Trans>
              </span>
              {depField("blockedBy")}

              <span className="text-xs text-brand-gray">
                <Trans>Blocks</Trans>
              </span>
              {depField("blocks")}

              <span className="text-xs text-brand-gray">
                <Trans>Relates</Trans>
              </span>
              {depField("relates")}
            </>
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
                  {isSafeAttachmentUrl(url) ? (
                    <a href={url} target="_blank" rel="noreferrer" className="flex-1 truncate text-brand-dark hover:underline" title={url}>
                      {attachmentName(url)}
                    </a>
                  ) : (
                    <span className="flex-1 truncate text-stone-500" title={t`Unsafe link blocked: ${url}`}>
                      {attachmentName(url)} <span className="text-red-500">({t`unsafe`})</span>
                    </span>
                  )}
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

        {loadComments && (
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-gray">
              <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
              <Trans>Comments</Trans>
            </span>
            <ul className="mt-1.5 space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="group rounded-lg border border-stone-100 bg-stone-50/60 p-2 text-xs">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-stone-700">{c.author ?? <Trans>Someone</Trans>}</span>
                    <span className="text-stone-400">{c.createdAt.slice(0, 16)}</span>
                    {deleteComment && currentUser && c.author === currentUser && (
                      <button
                        type="button"
                        onClick={() => void removeComment(c.id)}
                        title={t`Delete comment`}
                        className="ml-auto rounded p-0.5 text-stone-300 opacity-0 hover:text-red-600 group-hover:opacity-100"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 whitespace-pre-wrap text-stone-700">{c.body}</div>
                </li>
              ))}
              {comments.length === 0 && (
                <li className="text-xs text-stone-400">
                  <Trans>No comments yet</Trans>
                </li>
              )}
            </ul>
            {addComment && (
              <form
                className="mt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitComment();
                }}
              >
                <textarea
                  className="w-full resize-y rounded-lg border border-stone-200 p-2 text-xs text-stone-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  rows={2}
                  placeholder={t`Add a comment…`}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void submitComment();
                    }
                  }}
                />
                <div className="mt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
                  >
                    <Trans>Comment</Trans>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {loadActivity && activity.length > 0 && (
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-gray">
              <ClockIcon className="h-3.5 w-3.5" />
              <Trans>Activity</Trans>
            </span>
            <ul className="mt-1.5 space-y-1">
              {activity.map((ev, i) => (
                <li key={i} className="flex items-baseline gap-2 text-xs text-stone-500">
                  <span className="font-medium text-stone-700">
                    {ev.kind === "created" ? (
                      <Trans>Created</Trans>
                    ) : ev.kind === "updated" ? (
                      <Trans>Updated</Trans>
                    ) : ev.kind === "archived" ? (
                      <Trans>Archived</Trans>
                    ) : ev.kind === "restored" ? (
                      <Trans>Restored</Trans>
                    ) : (
                      ev.kind
                    )}
                  </span>
                  {ev.by && <span className="text-stone-400">· {ev.by}</span>}
                  <span className="ml-auto whitespace-nowrap text-stone-400">{ev.at.slice(0, 16)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
