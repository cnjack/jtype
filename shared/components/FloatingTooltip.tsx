interface FloatingTooltipProps {
  label: string;
  x: number;
  y: number;
}

export function FloatingTooltip({ label, x, y }: FloatingTooltipProps) {
  return (
    <div
      className="floating-tooltip"
      style={{ left: x, top: y }}
    >
      {label}
    </div>
  );
}
