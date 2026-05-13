import type { ReactNode } from "react";

export type StatusChipVariant = "neutral" | "warning" | "success" | "info" | "error";

interface StatusChipProps {
  variant: StatusChipVariant;
  children: ReactNode;
}

const variantClasses: Record<StatusChipVariant, string> = {
  neutral: "status-chip-neutral",
  warning: "status-chip-warning",
  success: "status-chip-success",
  info: "status-chip-info",
  error: "status-chip-error",
};

export function StatusChip({ variant, children }: StatusChipProps) {
  return (
    <span className={`status-chip ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
