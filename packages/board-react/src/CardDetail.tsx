import type { ReactNode } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { attachmentName, isSafeAttachmentUrl, PRIORITY_STYLE, type BoardViewCard } from '@shared/lib/board'
import type { BoardConfigJSON } from './boardData'
import type { UiStrings } from './strings'

/**
 * Built-in read-only card detail — the embed's default when the host doesn't
 * intercept opens via `onCardOpen`. Deliberately NOT the shared BoardPeek: the
 * peek is an editor and carries the markdown-renderer dependency chain
 * (katex/marked/dompurify), which would triple the embed bundle. Notes are
 * shown as plain text in the MVP.
 */
export function CardDetail({
  card,
  config,
  strings,
  supplement,
  onClose,
}: {
  card: BoardViewCard
  config: BoardConfigJSON
  strings: UiStrings
  supplement?: ReactNode
  onClose: () => void
}) {
  const statusName = config.columns.find((c) => c.key === card.columnKey)?.name || card.columnKey
  const swimlaneName = card.swimlaneKey
    ? config.swimlanes?.find((lane) => lane.key === card.swimlaneKey)?.name ?? strings.unassigned
    : strings.unassigned
  const fieldRows: [string, string][] = [
    [strings.status, statusName],
    ...(config.swimlaneBy === 'custom' || (config.swimlanes?.length ?? 0) > 0
      ? ([[strings.swimlane, swimlaneName]] as [string, string][])
      : []),
    ...(card.priority && card.priority !== 'none' ? ([[strings.priority, card.priority]] as [string, string][]) : []),
    ...(card.assignee ? ([[strings.assignee, card.assignee]] as [string, string][]) : []),
    ...(card.start ? ([[strings.start, card.start]] as [string, string][]) : []),
    ...(card.due ? ([[strings.due, card.due]] as [string, string][]) : []),
    ...(card.reminder ? ([[strings.reminder, card.reminder]] as [string, string][]) : []),
    ...(card.archived ? ([[strings.archived, '✓']] as [string, string][]) : []),
    ...(config.fields ?? [])
      .map((f): [string, string] => [f.label, card.custom?.[f.key] ?? ''])
      .filter(([, v]) => v !== ''),
  ]

  return (
    <Dialog open onClose={onClose} className="jtb-scope fixed inset-0 z-[70]">
      <DialogBackdrop className="fixed inset-0 bg-stone-950/12 transition-opacity" />
      <div className="fixed inset-0 flex justify-end overflow-hidden">
        <DialogPanel
          data-testid="read-only-card-detail"
          className="flex h-full w-full flex-col border-l border-black/[0.06] bg-white shadow-[-18px_0_56px_rgba(28,25,23,0.14)] sm:max-w-[26rem] sm:rounded-l-2xl"
        >
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-black/[0.05] px-4">
            <DialogTitle className="text-xs font-semibold text-brand-gray">
              {strings.cardReadOnlyHint}
            </DialogTitle>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              title={strings.close}
              aria-label={strings.close}
              className="rounded-lg p-1.5 text-stone-400 outline-none transition hover:bg-stone-100 hover:text-stone-700 focus-visible:ring-2 focus-visible:ring-brand"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {card.ticket && (
              <span className="mb-1 inline-block rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] font-medium tracking-tight text-stone-500">
                {card.ticket}
              </span>
            )}
            <h2 className="text-base font-semibold text-stone-900">
              {card.icon && <span className="mr-1">{card.icon}</span>}
              {card.title}
            </h2>

            <dl className="mt-3 grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1.5">
              {fieldRows.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="truncate text-xs text-brand-gray" title={label}>
                    {label}
                  </dt>
                  <dd className="text-sm text-stone-800">
                    {label === strings.priority ? (
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_STYLE[value] ?? 'bg-stone-100 text-stone-500'}`}>
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
              {card.tags.length > 0 && (
                <div className="contents">
                  <dt className="text-xs text-brand-gray">{strings.tags}</dt>
                  <dd className="flex flex-wrap gap-1">
                    {card.tags.map((tag) => (
                      <span
                        key={tag.label}
                        className="rounded px-1.5 py-0.5 text-[11px] text-brand-dark"
                        style={{ backgroundColor: tag.color ? `${tag.color}22` : 'rgba(0,136,132,0.10)' }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            {(card.attachments?.length ?? 0) > 0 && (
              <div className="mt-4">
                <span className="text-xs font-medium text-brand-gray">{strings.attachments}</span>
                <ul className="mt-1 space-y-1">
                  {card.attachments!.map((url) => (
                    <li key={url} className="rounded border border-stone-200 px-2 py-1 text-xs">
                      {isSafeAttachmentUrl(url) ? (
                        <a href={url} target="_blank" rel="noreferrer" className="block truncate text-brand-dark hover:underline" title={url}>
                          {attachmentName(url)}
                        </a>
                      ) : (
                        <span className="block truncate text-stone-500" title={url}>
                          {attachmentName(url)} <span className="text-red-500">({strings.unsafeLink})</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {card.notes && card.notes.trim() !== '' && (
              <div className="mt-4">
                <span className="text-xs font-medium text-brand-gray">{strings.notes}</span>
                <pre className="mt-1.5 whitespace-pre-wrap rounded-lg border border-stone-100 bg-stone-50/60 p-2 font-mono text-[12px] leading-5 text-stone-800">
                  {card.notes}
                </pre>
              </div>
            )}

            {supplement != null && supplement !== false && supplement !== '' && (
              <section
                aria-label={strings.additionalInformation}
                className="mt-4 border-t border-stone-100 pt-4"
              >
                {supplement}
              </section>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
