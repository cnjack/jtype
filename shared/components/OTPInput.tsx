import { useEffect, useRef } from "react";

/**
 * OTPInput — 6-digit device-flow user_code input.
 *
 * Props-in / Callbacks-out. No platform coupling (no Tauri / no fetch).
 * Handles: auto-advance, Backspace retreat, ←/→ navigation, paste-split,
 * and onComplete when all cells are filled.
 *
 * The backend mints a numeric-only code (see `short_user_code`), so input
 * is constrained to digits via inputMode=numeric + a digit-only sanitizer.
 */
export interface OTPInputProps {
  /** Number of cells. Default 6. */
  length?: number;
  /** Controlled value (string of digits). */
  value: string;
  onChange: (value: string) => void;
  /** Fired once when every cell is filled. */
  onComplete?: (value: string) => void;
  /** Show error styling (red border). */
  error?: boolean;
  /** Focus first cell on mount. */
  autoFocus?: boolean;
  /** Render a separator after this many cells. Default 3 (renders 3-3 split). */
  groupSize?: number;
  /** Cell size: `md` (default, for full-page auth) or `sm` (inline forms). */
  size?: "md" | "sm";
  /** Accessible label for the cell group. */
  ariaLabel?: string;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error = false,
  autoFocus = false,
  groupSize = 3,
  size = "md",
  ariaLabel,
}: OTPInputProps) {
  const cellRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Normalize value into exactly `length` single-char cells.
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  // Fire onComplete when all cells filled.
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  useEffect(() => {
    if (chars.every((c) => c !== "")) {
      completeRef.current?.(chars.join(""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  useEffect(() => {
    if (autoFocus) cellRefs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusCell = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, length - 1));
    cellRefs.current[clamped]?.focus();
    cellRefs.current[clamped]?.select();
  };

  const setValueAt = (idx: number, char: string) => {
    const next = chars.slice();
    next[idx] = char;
    onChange(next.join(""));
  };

  const handleInput = (idx: number, raw: string) => {
    // Take only the last typed digit; ignore non-digits.
    const digit = raw.replace(/\D/g, "").slice(-1);
    setValueAt(idx, digit);
    if (digit && idx < length - 1) focusCell(idx + 1);
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (chars[idx]) {
        setValueAt(idx, "");
      } else if (idx > 0) {
        focusCell(idx - 1);
        setValueAt(idx - 1, "");
      }
      return;
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      focusCell(idx - 1);
      return;
    }
    if (e.key === "ArrowRight" && idx < length - 1) {
      e.preventDefault();
      focusCell(idx + 1);
      return;
    }
    if (e.key === "Enter") {
      // Let the form submit naturally; no-op here.
      return;
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text") ?? "";
    const digits = text.replace(/\D/g, "").slice(0, length);
    if (!digits) return;
    onChange(digits);
    // Focus next empty cell, or last if all filled.
    const nextEmpty = Math.min(digits.length, length - 1);
    focusCell(nextEmpty);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const allFilled = chars.every((c) => c !== "");

  return (
    <div className="otp" role="group" aria-label={ariaLabel}>
      {chars.map((char, idx) => (
        <span key={idx} className="contents">
          <input
            ref={(el) => {
              cellRefs.current[idx] = el;
            }}
            className={`otp-cell ${size === "sm" ? "otp-cell-sm" : ""} ${char ? "filled" : ""} ${allFilled ? "complete" : ""} ${error ? "otp-error" : ""}`}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={char}
            aria-label={`Digit ${idx + 1} of ${length}`}
            onChange={(e) => handleInput(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            onFocus={handleFocus}
          />
          {idx === groupSize - 1 && idx < length - 1 && (
            <span className="otp-sep" aria-hidden="true">
              <svg width="6" height="2">
                <rect width="6" height="2" rx="1" fill="currentColor" />
              </svg>
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
