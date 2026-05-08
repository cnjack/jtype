import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useConfirmDialog, type ConfirmDialogOptions } from "./ConfirmDialog";

export type ConfirmFn = (message: string, options?: ConfirmDialogOptions) => Promise<boolean>;

declare global {
  interface Window {
    jtypeConfirm?: ConfirmFn;
  }
}

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const { ConfirmDialog, confirm } = useConfirmDialog();

  useEffect(() => {
    window.jtypeConfirm = confirm;
    return () => {
      delete window.jtypeConfirm;
    };
  }, [confirm]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  }
  return confirm;
}
