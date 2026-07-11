import { useEffect } from 'react'
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
  onClose,
}: {
  card: BoardViewCard
  config: BoardConfigJSON
  strings: UiStrings
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const statusName = config.columns.find((c) => c.key === card.columnKey)?.name || card.columnKey
  const fieldRows: [string, string][] = [
    [strings.status, statusName],
    ...(card.priority && card.priority !== 'none' ? ([[strings.priority, card.priority]] as [string, string][]) : []),
    ...(card.assignee ? ([[strings.assignee, card.assignee]] as [string, string][]) : []),
    ...(card.due ? ([[strings.due, card.due]] as [string, string][]) : []),
    ...(config.fields ?? [])
      .map((f): [string, string] => [f.label, card.custom?.[f.key] ?? ''])
      .filter(([, v]) => v !== ''),
  ]

  return (
    <aside
      className="absolute right-0 top-0 z-40 flex h-full w-[360px] max-w-[92%] flex-col border-l border-black/[0.06] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.07)]"
      aria-label={strings.cardReadOnlyHint}
    >
      <div className="flex items-center justify-between border-b border-black/[0.05] px-3 py-2">
        <span className="text-xs font-medium text-brand-gray">{strings.cardReadOnlyHint}</span>
        <button
          type="button"
          onClick={onClose}
          title={strings.close}
          aria-label={strings.close}
          className="rounded p-1 text-stone-400 hover:bg-stone-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
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
      </div>
    </aside>
  )
}
