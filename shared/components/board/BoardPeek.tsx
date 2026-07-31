import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  XMarkIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  PencilSquareIcon,
  PaperClipIcon,
  ArrowUpTrayIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  FaceSmileIcon,
  ArrowUturnLeftIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  FlagIcon,
  RectangleStackIcon,
  TagIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { PRIORITIES, attachmentName, isSafeAttachmentUrl, type BoardViewCard } from "../../lib/board";
import { fieldCls, EmojiField, ListboxSelect, TagMultiSelect } from "./controls";
import type { BoardPeekProps } from "./types";
import type { BoardComment, BoardActivityEvent } from "../../lib/board";

/**
 * Focused card detail for editing without leaving the board. Platform-agnostic:
 * it edits a normalized {@link BoardViewCard} and emits debounced `onChange` patches.
 * Assignee/tags fall back to free-text unless the platform supplies option lists.
 */
export function BoardPeek({
  card,
  boardTitle,
  statusOptions,
  swimlaneOptions,
  swimlaneDisabled,
  assigneeOptions,
  tagOptions,
  fields,
  onAddField,
  dependencyCards,
  childCards,
  onOpenCard,
  onAddChild,
  loadNotes,
  onUploadAttachment,
  loadComments,
  addComment,
  updateComment,
  deleteComment,
  toggleReaction,
  resolveComment,
  currentUser,
  loadActivity,
  renderMarkdownToContainer,
  renderMarkdownToHtml,
  portalClassName,
  supplement,
  onChange,
  onClose,
  onDelete,
  onOpenFull,
}: BoardPeekProps) {
  const [newField, setNewField] = useState("");
  const [newChild, setNewChild] = useState("");
  const [addingChild, setAddingChild] = useState(false);
  const [childError, setChildError] = useState("");
  const childRequestRef = useRef(0);
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
  const pendingPatch = useRef<Partial<BoardViewCard>>({});
  const pendingOnChange = useRef(onChange);

  const flushPendingPatch = useCallback((extra: Partial<BoardViewCard> = {}) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const patch = { ...pendingPatch.current, ...extra };
    pendingPatch.current = {};
    if (Object.keys(patch).length > 0) pendingOnChange.current(patch);
  }, []);

  // Re-init when a different card is opened; lazily load notes if needed.
  useEffect(() => {
    childRequestRef.current += 1;
    setDraft(card);
    setNotes(card.notes ?? "");
    setNewChild("");
    setAddingChild(false);
    setChildError("");
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

  // A quick close/card switch must not discard the last debounced title/notes
  // edit. The callback is captured when that patch is queued, so it still
  // targets the card that owned the draft.
  useEffect(() => () => flushPendingPatch(), [card.id, flushPendingPatch]);

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
      // Deleting a root cascades to its replies server-side; mirror locally.
      setComments((cs) => cs.filter((c) => c.id !== id && c.parentId !== id));
    } catch {
      /* ignore */
    }
  };

  /** Swap an updated comment into the list (edit / reaction / resolve). */
  const replaceComment = (updated: BoardComment) =>
    setComments((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));

  const rootComments = comments.filter((c) => !c.parentId);
  const repliesByRoot = new Map<string, BoardComment[]>();
  for (const c of comments) {
    if (!c.parentId) continue;
    const list = repliesByRoot.get(c.parentId);
    if (list) list.push(c);
    else repliesByRoot.set(c.parentId, [c]);
  }

  const debouncedPatch = useCallback(
    (patch: Partial<BoardViewCard>) => {
      pendingPatch.current = { ...pendingPatch.current, ...patch };
      pendingOnChange.current = onChange;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => flushPendingPatch(), 350);
    },
    [flushPendingPatch, onChange],
  );

  const setField = (patch: Partial<BoardViewCard>, immediate = false) => {
    setDraft((d) => ({ ...d, ...patch }));
    if (immediate) {
      pendingOnChange.current = onChange;
      flushPendingPatch(patch);
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
    if (renderMarkdownToContainer) {
      void renderMarkdownToContainer(notes, previewRef.current);
      return;
    }
    // Lightweight embeds intentionally omit the full document renderer. Keep
    // this dependency-free fallback safe inside an arbitrary host.
    previewRef.current.textContent = notes;
  }, [mode, notes, renderMarkdownToContainer]);

  const tagLabels = draft.tags.map((t2) => t2.label);

  const attachments = draft.attachments ?? [];
  const setAttachments = (next: string[]) => setField({ attachments: next }, true);
  const addAttachment = (url: string) => {
    const u = url.trim();
    if (u && !attachments.includes(u)) setAttachments([...attachments, u]);
  };
  const submitNewChild = async () => {
    const title = newChild.trim();
    if (!title || !onAddChild || addingChild) return;
    const requestId = childRequestRef.current + 1;
    childRequestRef.current = requestId;
    setAddingChild(true);
    setChildError("");
    try {
      await onAddChild(title);
      if (childRequestRef.current !== requestId) return;
      setNewChild("");
    } catch {
      if (childRequestRef.current !== requestId) return;
      setChildError(t`Could not create sub-card. Try again.`);
    } finally {
      if (childRequestRef.current === requestId) setAddingChild(false);
    }
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

  // Relations use stable path values. Duplicate titles are disambiguated in the
  // label, while legacy basename references resolve only when they are unique.
  const dependencyTitleCounts = new Map<string, number>();
  const dependencyBySlug = new Map((dependencyCards ?? []).map((card) => [card.slug, card]));
  const dependencyByBasename = new Map<string, { slug: string; title: string }[]>();
  const dependencyBySuffix = new Map<string, { slug: string; title: string } | null>();
  for (const card of dependencyCards ?? []) {
    dependencyTitleCounts.set(card.title, (dependencyTitleCounts.get(card.title) ?? 0) + 1);
    const parts = card.slug.split("/").filter(Boolean);
    const basename = parts[parts.length - 1] ?? card.slug;
    const matches = dependencyByBasename.get(basename);
    if (matches) matches.push(card);
    else dependencyByBasename.set(basename, [card]);
    for (let index = 1; index < parts.length - 1; index += 1) {
      const suffix = parts.slice(index).join("/");
      const existing = dependencyBySuffix.get(suffix);
      dependencyBySuffix.set(suffix, existing === undefined || existing === card ? card : null);
    }
  }
  const dependencyOptions = (dependencyCards ?? []).map((card) => ({
    value: card.slug,
    label: (dependencyTitleCounts.get(card.title) ?? 0) > 1
      ? `${card.title} · ${card.slug}`
      : card.title,
  }));
  const resolveDependencyValue = (reference: string): string => {
    if (!reference || dependencyBySlug.has(reference)) return reference;
    if (!reference.includes("/")) {
      const matches = dependencyByBasename.get(reference) ?? [];
      return matches.length === 1 ? matches[0]!.slug : reference;
    }
    return dependencyBySuffix.get(reference)?.slug ?? reference;
  };
  const depField = (key: "blockedBy" | "blocks" | "relates") => (
    <TagMultiSelect
      value={(draft[key] ?? []).map(resolveDependencyValue)}
      options={dependencyOptions}
      onChange={(slugs) => setField({ [key]: slugs }, true)}
      portalClassName={portalClassName}
    />
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
          {draft.icon ? <span className="text-sm">{draft.icon}</span> : <RectangleStackIcon className="h-4 w-4" />}
        </span>
        {boardTitle && <span className="max-w-48 truncate text-xs font-medium text-brand-gray">{boardTitle}</span>}
        <ChevronRightIcon className="h-3.5 w-3.5 text-stone-300" />
        <span className="text-xs font-semibold text-stone-700">
          {draft.ticket ?? <Trans>Card</Trans>}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {onOpenFull && (
            <button
              type="button"
              onClick={onOpenFull}
              title={t`Open in full editor`}
              className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-brand-dark"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            title={t`Delete card`}
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title={t`Close`}
            aria-label={t`Close`}
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8 lg:px-12">
          <input
            autoFocus
            className="w-full bg-transparent text-2xl font-semibold tracking-[-0.025em] text-stone-950 outline-none placeholder:text-stone-300 sm:text-[1.75rem]"
            placeholder={t`Untitled card`}
            value={draft.title}
            onChange={(e) => setField({ title: e.target.value })}
          />

          <section className="mt-7">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700">
                <Trans>Description</Trans>
              </span>
              <button
                type="button"
                onClick={() => setMode((m) => (m === "write" ? "preview" : "write"))}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-stone-100"
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
                className="mt-2 min-h-[280px] w-full resize-y rounded-xl border border-stone-200 bg-stone-50/35 px-4 py-3 text-sm leading-6 text-stone-800 outline-none transition focus:border-brand/50 focus:bg-white focus:ring-4 focus:ring-brand/5"
                value={notes}
                placeholder={t`Add details...`}
                onChange={(e) => setBodyText(e.target.value)}
              />
            ) : (
              <article
                ref={previewRef}
                className={`preview mt-2 min-h-[280px] rounded-xl border border-stone-100 bg-stone-50/20 px-4 py-3 text-sm${renderMarkdownToContainer ? "" : " whitespace-pre-wrap"}`}
              />
            )}
          </section>

          {(onAddChild || (childCards?.length ?? 0) > 0) && (
            <section className="mt-8 border-t border-line pt-6">
              <span className="text-xs font-semibold text-stone-700">
                <Trans>Sub-cards</Trans>
                {(childCards?.length ?? 0) > 0 && (
                  <span className="ml-1.5 font-normal text-stone-400">
                    {childCards!.filter((c) => c.done).length}/{childCards!.length}
                  </span>
                )}
              </span>
              <ul className="mt-2 space-y-1.5">
                {(childCards ?? []).map((child) => (
                  <li key={child.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl border border-stone-100 bg-stone-50/55 px-3 py-2 text-left text-xs transition hover:border-brand/25 hover:bg-brand-soft/20"
                      onClick={() => onOpenCard?.(child.id)}
                      title={t`Open sub-card`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${child.done ? "bg-emerald-500" : "bg-stone-300"}`} />
                      <span className={`min-w-0 flex-1 truncate ${child.done ? "text-stone-400 line-through" : "text-stone-700"}`}>
                        {child.icon && <span className="mr-1">{child.icon}</span>}
                        {child.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-stone-400">{child.statusName}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {onAddChild && (
                <form
                  className="mt-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitNewChild();
                  }}
                >
                  <input
                    className={`${fieldCls} w-full`}
                    placeholder={t`+ Add sub-card`}
                    value={newChild}
                    disabled={addingChild}
                    onChange={(e) => setNewChild(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      e.stopPropagation();
                      void submitNewChild();
                    }}
                  />
                  {childError && (
                    <p className="mt-1 text-[11px] text-red-600" role="alert">
                      {childError}
                    </p>
                  )}
                </form>
              )}
            </section>
          )}

          <section className="mt-8 border-t border-line pt-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700">
              <PaperClipIcon className="h-3.5 w-3.5 text-stone-400" />
              <Trans>Attachments</Trans>
            </span>
            {attachments.length > 0 && (
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {attachments.map((url) => (
                  <div key={url} className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs">
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
            <div className="mt-2 flex items-center gap-2">
              <form
                className="flex-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  addAttachment(newAttach);
                  setNewAttach("");
                }}
              >
                <input
                  className={`${fieldCls} w-full`}
                  placeholder={t`Paste a URL or path`}
                  value={newAttach}
                  onChange={(e) => setNewAttach(e.target.value)}
                />
              </form>
              {onUploadAttachment && (
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 hover:border-brand/40 hover:text-brand-dark">
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
          </section>

          {loadComments && (
            <section className="mt-8 border-t border-line pt-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                <ChatBubbleLeftIcon className="h-3.5 w-3.5 text-stone-400" />
                <Trans>Comments</Trans>
              </span>
              <ul className="mt-2 space-y-2">
                {rootComments.map((root) => (
                  <CommentThread
                    key={root.id}
                    root={root}
                    replies={repliesByRoot.get(root.id) ?? []}
                    currentUser={currentUser}
                    canReply={!!addComment}
                    onReply={
                      addComment
                        ? async (body) => {
                            const created = await addComment(card.id, body, root.id);
                            setComments((cs) => [...cs, created]);
                          }
                        : undefined
                    }
                    onEdit={
                      updateComment
                        ? async (id, body) => {
                            const updated = await updateComment(id, body);
                            replaceComment(updated);
                          }
                        : undefined
                    }
                    onDelete={deleteComment ? (id) => void removeComment(id) : undefined}
                    onReact={
                      toggleReaction
                        ? async (id, emoji) => {
                            replaceComment(await toggleReaction(id, emoji));
                          }
                        : undefined
                    }
                    onResolve={
                      resolveComment
                        ? async (resolved) => {
                            replaceComment(await resolveComment(root.id, resolved));
                          }
                        : undefined
                    }
                    renderMarkdownToHtml={renderMarkdownToHtml}
                  />
                ))}
                {comments.length === 0 && (
                  <li className="text-xs text-stone-400">
                    <Trans>No comments yet</Trans>
                  </li>
                )}
              </ul>
              {addComment && (
                <form
                  className="mt-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitComment();
                  }}
                >
                  <textarea
                    className="w-full resize-y rounded-xl border border-stone-200 p-3 text-xs text-stone-800 outline-none focus:border-brand focus:ring-4 focus:ring-brand/5"
                    rows={3}
                    placeholder={t`Add a comment… (Markdown supported)`}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void submitComment();
                      }
                    }}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    >
                      <Trans>Comment</Trans>
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {loadActivity && activity.length > 0 && (
            <section className="mb-3 mt-8 border-t border-line pt-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                <ClockIcon className="h-3.5 w-3.5 text-stone-400" />
                <Trans>Activity</Trans>
              </span>
              <ul className="mt-2 space-y-1.5">
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
            </section>
          )}
        </main>

        <aside className="max-h-[46%] shrink-0 overflow-y-auto border-t border-line bg-stone-50/70 px-5 py-5 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
          <h2 className="text-xs font-semibold text-stone-800">
            <Trans>Properties</Trans>
          </h2>
          <div className="mt-4 space-y-1">
            <PropertyRow icon={<FaceSmileIcon className="h-4 w-4" />} label={<Trans>Icon</Trans>}>
              <EmojiField
                value={draft.icon}
                onChange={(v) => setField({ icon: v }, true)}
                portalClassName={portalClassName}
              />
            </PropertyRow>
            <PropertyRow icon={<RectangleStackIcon className="h-4 w-4" />} label={<Trans>Status</Trans>}>
              <ListboxSelect
                value={draft.columnKey}
                options={statusOptions}
                onChange={(v) => setField({ columnKey: v }, true)}
                portalClassName={portalClassName}
              />
            </PropertyRow>
            {swimlaneOptions && (
              <PropertyRow icon={<RectangleStackIcon className="h-4 w-4" />} label={<Trans>Swimlane</Trans>}>
                <ListboxSelect
                  value={draft.swimlaneKey ?? ""}
                  options={swimlaneOptions}
                  onChange={(v) => setField({ swimlaneKey: v || null }, true)}
                  disabled={swimlaneDisabled}
                  portalClassName={portalClassName}
                />
              </PropertyRow>
            )}
            <PropertyRow icon={<FlagIcon className="h-4 w-4" />} label={<Trans>Priority</Trans>}>
              <ListboxSelect
                value={draft.priority ?? "none"}
                options={PRIORITIES.map((p) => ({ value: p, label: p }))}
                onChange={(v) => setField({ priority: v }, true)}
                portalClassName={portalClassName}
              />
            </PropertyRow>
            <PropertyRow icon={<UserIcon className="h-4 w-4" />} label={<Trans>Assignee</Trans>}>
              {assigneeOptions ? (
                <ListboxSelect
                  value={draft.assignee ?? ""}
                  options={[{ value: "", label: t`Unassigned` }, ...assigneeOptions]}
                  onChange={(v) => setField({ assignee: v || null }, true)}
                  portalClassName={portalClassName}
                />
              ) : (
                <input
                  className={`${fieldCls} w-full`}
                  value={draft.assignee ?? ""}
                  placeholder="—"
                  onChange={(e) => setField({ assignee: e.target.value })}
                />
              )}
            </PropertyRow>
            <PropertyRow icon={<CalendarDaysIcon className="h-4 w-4" />} label={<Trans>Due</Trans>}>
              <input
                type="date"
                className={`${fieldCls} w-full`}
                value={draft.due ?? ""}
                onChange={(e) => setField({ due: e.target.value || null }, true)}
              />
            </PropertyRow>
            <PropertyRow icon={<TagIcon className="h-4 w-4" />} label={<Trans>Tags</Trans>}>
              {tagOptions ? (
                <TagMultiSelect
                  value={tagLabels}
                  options={tagOptions.map((tg) => ({ label: tg.label, color: tg.color }))}
                  onChange={(labels) =>
                    setField({ tags: labels.map((l) => tagOptions.find((tg) => tg.label === l) ?? { label: l }) }, true)
                  }
                  portalClassName={portalClassName}
                />
              ) : (
                <input
                  className={`${fieldCls} w-full`}
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
            </PropertyRow>
          </div>

          {(fields?.length || onAddField) && (
            <div className="mt-6 border-t border-line pt-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <Trans>Custom fields</Trans>
              </h3>
              <div className="mt-2 space-y-2">
                {fields?.map((f) => (
                  <label key={f.key} className="block">
                    <span className="mb-1 block truncate text-[11px] text-brand-gray" title={f.label}>
                      {f.label}
                    </span>
                    <input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      className={`${fieldCls} w-full`}
                      value={draft.custom?.[f.key] ?? ""}
                      onChange={(e) =>
                        setField(
                          { custom: { ...(draft.custom ?? {}), [f.key]: e.target.value } },
                          f.type === "date" || f.type === "number",
                        )
                      }
                    />
                  </label>
                ))}
                {onAddField && (
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
                      className={`${fieldCls} w-full`}
                      placeholder={t`+ Add field`}
                      value={newField}
                      onChange={(e) => setNewField(e.target.value)}
                    />
                  </form>
                )}
              </div>
            </div>
          )}

          {dependencyCards && (
            <div className="mt-6 border-t border-line pt-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <Trans>Relations</Trans>
              </h3>
              <div className="mt-2 space-y-2">
                <RelationField label={<Trans>Blocked by</Trans>}>{depField("blockedBy")}</RelationField>
                <RelationField label={<Trans>Blocks</Trans>}>{depField("blocks")}</RelationField>
                <RelationField label={<Trans>Relates</Trans>}>{depField("relates")}</RelationField>
                <RelationField label={<Trans>Parent</Trans>}>
                  <ListboxSelect
                    value={resolveDependencyValue(draft.parent ?? "")}
                    options={[{ value: "", label: "—" }, ...dependencyOptions]}
                    onChange={(v) => setField({ parent: v || null }, true)}
                    portalClassName={portalClassName}
                  />
                </RelationField>
              </div>
            </div>
          )}

          {supplement != null && supplement !== false && supplement !== "" && (
            <section
              aria-label={t`Additional information`}
              className="mt-6 border-t border-line pt-5"
            >
              {supplement}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function PropertyRow({ icon, label, children }: { icon: ReactNode; label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-10 grid-cols-[88px_minmax(0,1fr)] items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white">
      <span className="flex min-w-0 items-center gap-2 text-xs text-brand-gray">
        <span className="shrink-0 text-stone-400">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function RelationField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-brand-gray">{label}</span>
      {children}
    </label>
  );
}

/** The small fixed emoji set offered by the reaction picker. */
const REACTION_SET = ["👍", "❤️", "🎉", "😄", "👀", "✅"];

/** Markdown-rendered comment body when supplied; safe plain text in embeds. */
function CommentBody({
  body,
  renderMarkdownToHtml,
}: {
  body: string;
  renderMarkdownToHtml?: BoardPeekProps["renderMarkdownToHtml"];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!renderMarkdownToHtml) return;
    let cancelled = false;
    void renderMarkdownToHtml(body).then((html) => {
      if (!cancelled && ref.current) ref.current.innerHTML = html;
    });
    return () => {
      cancelled = true;
    };
  }, [body, renderMarkdownToHtml]);
  if (!renderMarkdownToHtml) {
    return <div className="mt-0.5 whitespace-pre-wrap text-stone-700">{body}</div>;
  }
  return <div ref={ref} className="comment-markdown mt-0.5 text-stone-700" />;
}

function CommentRow({
  comment,
  currentUser,
  onEdit,
  onDelete,
  onReact,
  extraActions,
  renderMarkdownToHtml,
}: {
  comment: BoardComment;
  currentUser?: string;
  onEdit?: (id: string, body: string) => Promise<void>;
  onDelete?: (id: string) => void;
  onReact?: (id: string, emoji: string) => Promise<void>;
  extraActions?: ReactNode;
  renderMarkdownToHtml?: BoardPeekProps["renderMarkdownToHtml"];
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.body);
  const [pickerOpen, setPickerOpen] = useState(false);
  const own = !!currentUser && comment.author === currentUser;

  const saveEdit = async () => {
    const body = editText.trim();
    if (!body || !onEdit) return;
    await onEdit(comment.id, body);
    setEditing(false);
  };

  return (
    <div className="group/comment">
      <div className="flex items-baseline gap-2">
        <span className="font-medium text-stone-700">{comment.author ?? <Trans>Someone</Trans>}</span>
        <span className="text-stone-400">{comment.createdAt.slice(0, 16)}</span>
        {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
          <span className="text-[10px] text-stone-300">
            <Trans>edited</Trans>
          </span>
        )}
        <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/comment:opacity-100">
          {onReact && (
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              title={t`Add reaction`}
              className="rounded p-0.5 text-stone-300 hover:text-amber-500"
            >
              <FaceSmileIcon className="h-3.5 w-3.5" />
            </button>
          )}
          {extraActions}
          {own && onEdit && !editing && (
            <button
              type="button"
              onClick={() => {
                setEditText(comment.body);
                setEditing(true);
              }}
              title={t`Edit comment`}
              className="rounded p-0.5 text-stone-300 hover:text-brand-dark"
            >
              <PencilSquareIcon className="h-3.5 w-3.5" />
            </button>
          )}
          {own && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              title={t`Delete comment`}
              className="rounded p-0.5 text-stone-300 hover:text-red-600"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </div>
      {editing ? (
        <div className="mt-1">
          <textarea
            className="w-full resize-y rounded-lg border border-stone-200 p-2 text-xs text-stone-800 focus:border-brand focus:outline-none"
            rows={2}
            value={editText}
            autoFocus
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void saveEdit();
              }
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <div className="mt-1 flex justify-end gap-1">
            <button type="button" className="rounded px-2 py-0.5 text-xs text-stone-500 hover:bg-stone-100" onClick={() => setEditing(false)}>
              <Trans>Cancel</Trans>
            </button>
            <button
              type="button"
              className="rounded-md bg-brand px-2 py-0.5 text-xs font-medium text-white disabled:opacity-40"
              disabled={!editText.trim()}
              onClick={() => void saveEdit()}
            >
              <Trans>Save</Trans>
            </button>
          </div>
        </div>
      ) : (
        <CommentBody body={comment.body} renderMarkdownToHtml={renderMarkdownToHtml} />
      )}
      {((comment.reactions?.length ?? 0) > 0 || pickerOpen) && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {(comment.reactions ?? []).map((r) => (
            <button
              key={r.emoji}
              type="button"
              disabled={!onReact}
              onClick={() => void onReact?.(comment.id, r.emoji)}
              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] ${
                r.mine ? "border-brand/40 bg-brand-soft/40 text-brand-dark" : "border-stone-200 bg-white text-stone-600"
              }`}
              title={r.mine ? t`Remove your reaction` : t`React`}
            >
              {r.emoji} {r.count}
            </button>
          ))}
          {pickerOpen && onReact && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-stone-200 bg-white px-1 py-0.5">
              {REACTION_SET.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="rounded px-0.5 text-[13px] hover:bg-stone-100"
                  onClick={() => {
                    setPickerOpen(false);
                    void onReact(comment.id, emoji);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One comment thread: the root, its (one-level) replies, an inline reply
 * composer, and the resolve toggle. Resolved threads fold to a single bar.
 */
function CommentThread({
  root,
  replies,
  currentUser,
  canReply,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onResolve,
  renderMarkdownToHtml,
}: {
  root: BoardComment;
  replies: BoardComment[];
  currentUser?: string;
  canReply: boolean;
  onReply?: (body: string) => Promise<void>;
  onEdit?: (id: string, body: string) => Promise<void>;
  onDelete?: (id: string) => void;
  onReact?: (id: string, emoji: string) => Promise<void>;
  onResolve?: (resolved: boolean) => Promise<void>;
  renderMarkdownToHtml?: BoardPeekProps["renderMarkdownToHtml"];
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const resolved = !!root.resolvedAt;

  const submitReply = async () => {
    const body = replyText.trim();
    if (!body || !onReply) return;
    await onReply(body);
    setReplyText("");
    setReplying(false);
  };

  if (resolved && !expanded) {
    return (
      <li className="rounded-lg border border-stone-100 bg-stone-50/40 text-xs">
        <button
          type="button"
          className="flex w-full items-center gap-2 p-2 text-left text-stone-400 hover:text-stone-600"
          onClick={() => setExpanded(true)}
          title={t`Show resolved thread`}
        >
          <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <span className="min-w-0 flex-1 truncate">
            <Trans>Resolved</Trans> · {root.body.split("\n")[0]}
          </span>
          {replies.length > 0 && <span className="shrink-0 text-stone-300">{replies.length}</span>}
        </button>
      </li>
    );
  }

  return (
    <li className={`rounded-lg border p-2 text-xs ${resolved ? "border-emerald-100 bg-emerald-50/30" : "border-stone-100 bg-stone-50/60"}`}>
      <CommentRow
        comment={root}
        currentUser={currentUser}
        onEdit={onEdit}
        onDelete={onDelete}
        onReact={onReact}
        renderMarkdownToHtml={renderMarkdownToHtml}
        extraActions={
          <>
            {canReply && onReply && (
              <button
                type="button"
                onClick={() => setReplying((v) => !v)}
                title={t`Reply`}
                className="rounded p-0.5 text-stone-300 hover:text-brand-dark"
              >
                <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
              </button>
            )}
            {onResolve && (
              <button
                type="button"
                onClick={() => void onResolve(!resolved)}
                title={resolved ? t`Unresolve thread` : t`Resolve thread`}
                className={`rounded p-0.5 ${resolved ? "text-emerald-500 hover:text-stone-400" : "text-stone-300 hover:text-emerald-600"}`}
              >
                <CheckCircleIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        }
      />
      {replies.length > 0 && (
        <ul className="mt-2 space-y-2 border-l-2 border-stone-100 pl-2">
          {replies.map((reply) => (
            <li key={reply.id}>
              <CommentRow
                comment={reply}
                currentUser={currentUser}
                onEdit={onEdit}
                onDelete={onDelete}
                onReact={onReact}
                renderMarkdownToHtml={renderMarkdownToHtml}
              />
            </li>
          ))}
        </ul>
      )}
      {resolved && (
        <button type="button" className="mt-1.5 text-[10px] text-stone-400 hover:text-stone-600" onClick={() => setExpanded(false)}>
          <Trans>Collapse resolved thread</Trans>
        </button>
      )}
      {replying && (
        <form
          className="mt-2 border-l-2 border-stone-100 pl-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submitReply();
          }}
        >
          <textarea
            className="w-full resize-y rounded-lg border border-stone-200 p-2 text-xs text-stone-800 focus:border-brand focus:outline-none"
            rows={2}
            autoFocus
            placeholder={t`Reply…`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void submitReply();
              }
              if (e.key === "Escape") setReplying(false);
            }}
          />
          <div className="mt-1 flex justify-end">
            <button type="submit" disabled={!replyText.trim()} className="rounded-md bg-brand px-2 py-0.5 text-xs font-medium text-white disabled:opacity-40">
              <Trans>Reply</Trans>
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
