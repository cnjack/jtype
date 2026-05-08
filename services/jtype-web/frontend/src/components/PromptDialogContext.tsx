import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { usePromptDialog } from './PromptDialog'

export type PromptFn = (title: string, defaultValue?: string) => Promise<string | null>
export type ConfirmFn = (title: string, message: string, danger?: boolean) => Promise<boolean>

declare global {
  interface Window {
    jtypePrompt?: PromptFn
    jtypeConfirm?: ConfirmFn
  }
}

interface PromptDialogContextValue {
  prompt: PromptFn
  confirm: ConfirmFn
}

const PromptDialogContext = createContext<PromptDialogContextValue | null>(null)

export function PromptDialogProvider({ children }: { children: ReactNode }) {
  const { PromptDialog, prompt, confirm } = usePromptDialog()

  useEffect(() => {
    window.jtypePrompt = prompt
    window.jtypeConfirm = confirm
    return () => {
      delete window.jtypePrompt
      delete window.jtypeConfirm
    }
  }, [prompt, confirm])

  return (
    <PromptDialogContext.Provider value={{ prompt, confirm }}>
      {children}
      <PromptDialog />
    </PromptDialogContext.Provider>
  )
}

export function usePrompt(): PromptFn {
  const ctx = useContext(PromptDialogContext)
  if (!ctx) {
    throw new Error('usePrompt must be used within a PromptDialogProvider')
  }
  return ctx.prompt
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(PromptDialogContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within a PromptDialogProvider')
  }
  return ctx.confirm
}
