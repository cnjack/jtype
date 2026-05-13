import { useState, useCallback, useRef } from "react";

interface FloatingTooltipState {
  label: string;
  x: number;
  y: number;
}

export function useFloatingTooltip() {
  const [tooltip, setTooltip] = useState<FloatingTooltipState | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((label: string, element: HTMLElement) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    const rect = element.getBoundingClientRect();
    setTooltip({
      label,
      x: Math.min(Math.max(rect.left + rect.width / 2, 12), window.innerWidth - 12),
      y: rect.bottom + 8,
    });
  }, []);

  const hide = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => setTooltip(null), 80);
  }, []);

  const tooltipProps = useCallback(
    (label: string) => ({
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(label, e.currentTarget),
      onMouseLeave: hide,
      onFocus: (e: React.FocusEvent<HTMLElement>) => show(label, e.currentTarget),
      onBlur: hide,
    }),
    [show, hide]
  );

  return { tooltip, tooltipProps, show, hide };
}
