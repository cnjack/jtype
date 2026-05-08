import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePromptDialog } from "./PromptDialog";

export type PromptFn = (title: string, defaultValue?: string) => Promise<string | null>;

declare global {
  interface Window {
    jtypePrompt?: PromptFn;
  }
}

const PromptContext = createContext<PromptFn | null>(null);

export function PromptDialogProvider({ children }: { children: ReactNode }) {
  const { PromptDialog, prompt } = usePromptDialog();

  useEffect(() => {
    window.jtypePrompt = prompt;
    return () => {
      delete window.jtypePrompt;
    };
  }, [prompt]);

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
