import { useEffect, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ViewColumnsIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  FolderIcon,
  ShareIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'

type Step = 'choose' | 'name'
type NamedKind = 'markdown' | 'board' | 'mermaid' | 'excalidraw'

type ResourceChoice = {
  id: 'markdown' | 'import' | 'kanban' | 'mermaid' | 'excalidraw'
  label: string
  description: string
  Icon: typeof DocumentTextIcon
}

const MERMAID_STARTER = 'flowchart TD\n  A[Start] --> B[End]\n'
const EXCALIDRAW_STARTER = JSON.stringify(
  { type: 'excalidraw', version: 2, source: 'jtype', elements: [], appState: {}, files: {} },
  null,
  2,
)

const KIND_EXTENSION: Record<NamedKind, string> = {
  markdown: '.md',
  board: '.board',
  mermaid: '.mmd',
  excalidraw: '.excalidraw',
}

type NewResourceDialogProps = {
  open: boolean
  /** Folder the new resource is created in (empty = vault root). */
  baseDir: string
  onClose: () => void
  onCreateDocument: (name: string, baseDir: string) => void
  onCreateBoard: (name: string, baseDir: string) => void
  /** Create a diagram resource (Mermaid/Excalidraw) with starter content. */
  onCreateDiagram?: (relativePath: string, content: string, baseDir: string) => void
  /** Import is only offered when a handler is provided (the web has no upload yet). */
  onImport?: () => void
}

/**
 * "New resource" picker — a faithful port of the desktop NewResourceDialog so the
 * web create-document flow matches the app: step 1 chooses what to create, step 2
 * names it. The data layer is injected via props instead of AppState/useFileSystem.
 */
export function NewResourceDialog({
  open,
  baseDir,
  onClose,
  onCreateDocument,
  onCreateBoard,
  onCreateDiagram,
  onImport,
}: NewResourceDialogProps) {
  const [step, setStep] = useState<Step>('choose')
  const [name, setName] = useState('')
  const [nameFor, setNameFor] = useState<NamedKind>('markdown')

  // Reset to the first step whenever the dialog re-opens.
  useEffect(() => {
    if (open) {
      setStep('choose')
      setName('')
      setNameFor('markdown')
    }
  }, [open])

  const choices: ResourceChoice[] = [
    {
      id: 'markdown',
      label: t`Markdown document`,
      description: t`A text document you write and preview`,
      Icon: DocumentTextIcon,
    },
    // Import has no web backend yet, so only show it when a handler is wired.
    ...(onImport
      ? [
          {
            id: 'import' as const,
            label: t`Import file`,
            description: t`Bring in an image or PDF from your computer`,
            Icon: ArrowUpTrayIcon,
          },
        ]
      : []),
    {
      id: 'kanban',
      label: t`Kanban board`,
      description: t`Track work in columns and cards`,
      Icon: ViewColumnsIcon,
    },
    ...(onCreateDiagram
      ? [
          {
            id: 'mermaid' as const,
            label: t`Mermaid diagram`,
            description: t`A text-based diagram with a live preview`,
            Icon: ShareIcon,
          },
          {
            id: 'excalidraw' as const,
            label: t`Excalidraw drawing`,
            description: t`A hand-drawn style whiteboard canvas`,
            Icon: PencilSquareIcon,
          },
        ]
      : []),
  ]

  const pick = (id: ResourceChoice['id']) => {
    if (id === 'import') {
      onClose()
      onImport?.()
      return
    }
    setNameFor(id === 'kanban' ? 'board' : id)
    setStep('name')
  }

  const commitName = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onClose()
    const ext = KIND_EXTENSION[nameFor]
    const withExt = trimmed.endsWith(ext) ? trimmed : `${trimmed}${ext}`
    if (nameFor === 'board') {
      onCreateBoard(trimmed, baseDir)
    } else if (nameFor === 'mermaid') {
      onCreateDiagram?.(withExt, MERMAID_STARTER, baseDir)
    } else if (nameFor === 'excalidraw') {
      onCreateDiagram?.(withExt, EXCALIDRAW_STARTER, baseDir)
    } else {
      onCreateDocument(withExt, baseDir)
    }
    setName('')
  }

  const NameIcon = { markdown: DocumentTextIcon, board: ViewColumnsIcon, mermaid: ShareIcon, excalidraw: PencilSquareIcon }[nameFor]
  const nameTitle =
    nameFor === 'board' ? <Trans>New board</Trans>
    : nameFor === 'mermaid' ? <Trans>New Mermaid diagram</Trans>
    : nameFor === 'excalidraw' ? <Trans>New Excalidraw drawing</Trans>
    : <Trans>New document</Trans>
  const nameSubtitle =
    nameFor === 'board' ? <Trans>A kanban board over your notes</Trans>
    : nameFor === 'mermaid' ? <Trans>A text-based diagram with a live preview</Trans>
    : nameFor === 'excalidraw' ? <Trans>A hand-drawn style whiteboard canvas</Trans>
    : <Trans>A Markdown document you write and preview</Trans>
  const namePlaceholder =
    nameFor === 'board' ? t`Board name`
    : nameFor === 'mermaid' ? t`Diagram name`
    : nameFor === 'excalidraw' ? t`Drawing name`
    : t`Document name`

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          {step === 'choose' ? (
            <>
              <DialogTitle className="text-base font-semibold text-stone-900">
                <Trans>New resource</Trans>
              </DialogTitle>
              <p className="mt-1 text-sm text-brand-gray">
                <Trans>Choose what you want to create.</Trans>
              </p>
              <div className="mt-4 space-y-2">
                {choices.map(({ id, label, description, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className="group flex w-full items-center gap-3 rounded-lg border border-stone-200 px-3 py-2.5 text-left transition-colors hover:border-brand/50 hover:bg-brand-soft/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    onClick={() => pick(id)}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-stone-900">{label}</span>
                      <span className="block truncate text-xs text-brand-gray">{description}</span>
                    </span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-300 transition-colors group-hover:text-brand-dark" />
                  </button>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
                  onClick={onClose}
                >
                  <Trans>Cancel</Trans>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                  <NameIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-semibold text-stone-900">
                    {nameTitle}
                  </DialogTitle>
                  <p className="truncate text-xs text-brand-gray">{nameSubtitle}</p>
                </div>
              </div>

              <div className="relative mt-4">
                <input
                  className="w-full rounded-lg border border-stone-300 px-3 py-2.5 pr-16 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  placeholder={namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitName()
                  }}
                  autoFocus
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-400">
                  {KIND_EXTENSION[nameFor]}
                </span>
              </div>

              <p className="mt-2 flex items-center gap-1 text-xs text-brand-gray">
                <FolderIcon className="h-3.5 w-3.5 shrink-0" />
                <Trans>Creates in</Trans>
                <span className="truncate font-medium text-stone-600">{baseDir || t`vault root`}</span>
              </p>

              <div className="mt-5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
                  onClick={() => setStep('choose')}
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  <Trans>Back</Trans>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
                    onClick={onClose}
                  >
                    <Trans>Cancel</Trans>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none"
                    onClick={commitName}
                    disabled={!name.trim()}
                  >
                    <Trans>Create</Trans>
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
