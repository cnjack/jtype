import { useEffect, useState, type FormEvent } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { CalendarDaysIcon, ClipboardDocumentListIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { BoardProjectMetadata } from "../../lib/board";
import { fieldCls } from "./controls";

export function ProjectSettingsDialog({
  open,
  project,
  portalClassName,
  onClose,
  onSave,
}: {
  open: boolean;
  project?: BoardProjectMetadata;
  portalClassName?: string;
  onClose: () => void;
  onSave: (project: BoardProjectMetadata | undefined) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<BoardProjectMetadata>(project ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const portal = portalClassName ? ` ${portalClassName}` : "";

  useEffect(() => {
    if (!open) return;
    setDraft(project ?? {});
    setError("");
  }, [open, project]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [key, value?.trim() || undefined]),
    ) as BoardProjectMetadata;
    if ((next.key?.length ?? 0) > 32) {
      setError(t`Project key can be at most 32 characters.`);
      return;
    }
    if ((next.summary?.length ?? 0) > 280) {
      setError(t`Project summary can be at most 280 characters.`);
      return;
    }
    if (next.startDate && next.targetDate && next.startDate > next.targetDate) {
      setError(t`Target date must be on or after the start date.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(Object.values(next).some(Boolean) ? next : undefined);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t`Could not save project settings.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? () => undefined : onClose} className={`fixed inset-0 z-[70]${portal}`}>
      <DialogBackdrop className={`fixed inset-0 bg-stone-950/20${portal}`} />
      <div className={`fixed inset-0 flex items-center justify-center p-4${portal}`}>
        <DialogPanel className={`w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/[0.06]${portal}`}>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"><ClipboardDocumentListIcon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm font-semibold text-stone-900"><Trans>Project settings</Trans></DialogTitle>
              <p className="mt-0.5 text-xs text-brand-gray"><Trans>Lightweight planning metadata shared by every board view.</Trans></p>
            </div>
            <button type="button" onClick={onClose} disabled={busy} title={t`Close`} aria-label={t`Close`} className="rounded-lg p-1.5 text-stone-400 outline-none hover:bg-stone-100 hover:text-stone-700 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"><XMarkIcon className="h-4 w-4" /></button>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-stone-700"><Trans>Project key</Trans></span>
              <input autoFocus maxLength={32} className={`${fieldCls} h-9 w-full px-3`} value={draft.key ?? ""} placeholder={t`e.g. JT`} onChange={(event) => setDraft((current) => ({ ...current, key: event.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-stone-700"><Trans>Summary</Trans></span>
              <textarea maxLength={280} className={`${fieldCls} min-h-20 w-full resize-y px-3 py-2`} value={draft.summary ?? ""} placeholder={t`What outcome is this project driving?`} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-stone-700"><CalendarDaysIcon className="h-3.5 w-3.5 text-stone-400" /><Trans>Start date</Trans></span>
                <input type="date" className={`${fieldCls} h-9 w-full px-2`} value={draft.startDate ?? ""} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-stone-700"><CalendarDaysIcon className="h-3.5 w-3.5 text-stone-400" /><Trans>Target date</Trans></span>
                <input type="date" className={`${fieldCls} h-9 w-full px-2`} value={draft.targetDate ?? ""} onChange={(event) => setDraft((current) => ({ ...current, targetDate: event.target.value }))} />
              </label>
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 outline-none hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"><Trans>Cancel</Trans></button>
              <button type="submit" disabled={busy} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white outline-none hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50">{busy ? <Trans>Saving…</Trans> : <Trans>Save project</Trans>}</button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
