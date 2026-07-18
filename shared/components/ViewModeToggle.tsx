import { t } from "@lingui/core/macro";
import { PencilSquareIcon, ViewColumnsIcon, EyeIcon } from "@heroicons/react/24/outline";

export type EditorMode = "write" | "split" | "preview";

interface ViewModeToggleProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  tooltipProps?: (label: string) => Record<string, unknown>;
  allowSplit?: boolean;
  touchOptimized?: boolean;
}

export function ViewModeToggle({ mode, onModeChange, tooltipProps, allowSplit = true, touchOptimized = false }: ViewModeToggleProps) {
  const tp = tooltipProps ?? (() => ({}));
  const touchStyle = touchOptimized ? { minHeight: 44, minWidth: 48 } : undefined;
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-stone-100 p-0.5" role="group" aria-label={t`Editor view`}>
      <button
        type="button"
        className={`view-mode-button ${mode === "write" ? "view-mode-button-active" : ""}`}
        onClick={() => onModeChange("write")}
        title={t`Write`}
        aria-label={t`Write`}
        aria-pressed={mode === "write"}
        style={touchStyle}
        {...tp(t`Write`)}
      >
        <PencilSquareIcon className="h-3.5 w-3.5" />
      </button>
      {allowSplit && (
        <button
          type="button"
          className={`view-mode-button ${mode === "split" ? "view-mode-button-active" : ""}`}
          onClick={() => onModeChange("split")}
          title={t`Split`}
          aria-label={t`Split`}
          aria-pressed={mode === "split"}
          style={touchStyle}
          {...tp(t`Split`)}
        >
          <ViewColumnsIcon className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        className={`view-mode-button ${mode === "preview" ? "view-mode-button-active" : ""}`}
        onClick={() => onModeChange("preview")}
        title={t`Preview`}
        aria-label={t`Preview`}
        aria-pressed={mode === "preview"}
        style={touchStyle}
        {...tp(t`Preview`)}
      >
        <EyeIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
