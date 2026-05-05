import { createContext, useContext, type ReactNode } from 'react'
import { usePromptDialog } from './PromptDialog'

export type PromptFn = (title: string, defaultValue?: string) => Promise<string | null>
export type ConfirmFn = (title: string, message: string, danger?: boolean) => Promise<boolean>

interface PromptDialogContextValue {
  prompt: PromptFn
  confirm: ConfirmFn
}

const PromptDialogContext = createContext<PromptDialogContextValue | null>(null)

export function PromptDialogProvider({ children }: { children: ReactNode }) {
  const { PromptDialog, prompt, confirm } = usePromptDialog()
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
