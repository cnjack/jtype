import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePromptDialog } from "./PromptDialog";
import { useConfirmDialog, type ConfirmDialogOptions } from "./ConfirmDialog";

export type PromptFn = (title: string, defaultValue?: string) => Promise<string | null>;
export type ConfirmFn = (message: string, options?: ConfirmDialogOptions) => Promise<boolean>;

declare global {
  interface Window {
    jtypePrompt?: PromptFn;
    jtypeConfirm?: ConfirmFn;
  }
}

interface DialogContextValue {
  prompt: PromptFn;
  confirm: ConfirmFn;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function PromptDialogProvider({ children }: { children: ReactNode }) {
  const { PromptDialog, prompt } = usePromptDialog();
  const { ConfirmDialog, confirm } = useConfirmDialog();

  useEffect(() => {
    window.jtypePrompt = prompt;
    window.jtypeConfirm = confirm;
    return () => {
      delete window.jtypePrompt;
      delete window.jtypeConfirm;
    };
  }, [prompt, confirm]);

  return (
    <DialogContext.Provider value={{ prompt, confirm }}>
      {children}
      <PromptDialog />
      <ConfirmDialog />
    </DialogContext.Provider>
  );
}

export function usePrompt(): PromptFn {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("usePrompt must be used within a PromptDialogProvider");
  return ctx.prompt;
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useConfirm must be used within a PromptDialogProvider");
  return ctx.confirm;
}
