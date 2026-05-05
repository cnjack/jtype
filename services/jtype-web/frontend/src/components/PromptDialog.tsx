import { useState, useCallback } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { ChatBubbleLeftRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export interface PromptDialogProps {
  open: boolean
  title: string
  defaultValue?: string
  confirmLabel?: string
  onConfirm: (value: string) => void
  onClose: () => void
}

export function PromptDialog({
  open,
  title,
  defaultValue = '',
  confirmLabel = 'OK',
  onConfirm,
  onClose,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState('')

  const handleConfirm = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Please enter a value.')
      return
    }
    onConfirm(trimmed)
    setValue('')
    setError('')
  }

  const handleClose = () => {
    setValue('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-brand" />
            {title}
          </DialogTitle>
          <input
            className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleConfirm() }}
            autoFocus
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-brand-dark px-3 py-1.5 text-sm font-medium text-white hover:bg-brand"
              onClick={() => void handleConfirm()}
              disabled={!value.trim()}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <ExclamationTriangleIcon className={`h-5 w-5 ${danger ? 'text-red-600' : 'text-brand'}`} />
            {title}
          </DialogTitle>
          <p className="mt-2 text-sm text-stone-600">{message}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-dark hover:bg-brand'}`}
              onClick={() => void onConfirm()}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export function usePromptDialog() {
  const [request, setRequest] = useState<{
    type: 'prompt'
    title: string
    defaultValue: string
    resolve: (value: string | null) => void
  } | {
    type: 'confirm'
    title: string
    message: string
    danger: boolean
    resolve: (value: boolean) => void
  } | null>(null)

  const prompt = useCallback((title: string, defaultValue = ''): Promise<string | null> => {
    return new Promise((resolve) => {
      setRequest({ type: 'prompt', title, defaultValue, resolve })
    })
  }, [])

  const confirm = useCallback((title: string, message: string, danger = false): Promise<boolean> => {
    return new Promise((resolve) => {
      setRequest({ type: 'confirm', title, message, danger, resolve })
    })
  }, [])

  const handlePromptConfirm = useCallback((value: string) => {
    if (request?.type === 'prompt') request.resolve(value)
    setRequest(null)
  }, [request])

  const handlePromptClose = useCallback(() => {
    if (request?.type === 'prompt') request.resolve(null)
    setRequest(null)
  }, [request])

  const handleConfirmConfirm = useCallback(() => {
    if (request?.type === 'confirm') request.resolve(true)
    setRequest(null)
  }, [request])

  const handleConfirmClose = useCallback(() => {
    if (request?.type === 'confirm') request.resolve(false)
    setRequest(null)
  }, [request])

  const PromptDialogComponent = useCallback(() => {
    if (!request) return null
    if (request.type === 'prompt') {
      return (
        <PromptDialog
          open
          title={request.title}
          defaultValue={request.defaultValue}
          onConfirm={handlePromptConfirm}
          onClose={handlePromptClose}
        />
      )
    }
    return (
      <ConfirmDialog
        open
        title={request.title}
        message={request.message}
        danger={request.danger}
        onConfirm={handleConfirmConfirm}
        onClose={handleConfirmClose}
      />
    )
  }, [request, handlePromptConfirm, handlePromptClose, handleConfirmConfirm, handleConfirmClose])

  return { PromptDialog: PromptDialogComponent, prompt, confirm } as const
}
