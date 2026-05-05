import { createContext, useContext, type ReactNode } from "react";
import { usePromptDialog } from "./PromptDialog";

export type PromptFn = (title: string, defaultValue?: string) => Promise<string | null>;

const PromptContext = createContext<PromptFn | null>(null);

export function PromptDialogProvider({ children }: { children: ReactNode }) {
  const { PromptDialog, prompt } = usePromptDialog();
  return (
    <PromptContext.Provider value={prompt}>
      {children}
      <PromptDialog />
    </PromptContext.Provider>
  );
}

export function usePrompt(): PromptFn {
  const prompt = useContext(PromptContext);
  if (!prompt) {
    throw new Error("usePrompt must be used within a PromptDialogProvider");
  }
  return prompt;
}
