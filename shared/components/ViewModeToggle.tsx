import { PencilSquareIcon, ViewColumnsIcon, EyeIcon } from "@heroicons/react/24/outline";

export type EditorMode = "write" | "split" | "preview";

interface ViewModeToggleProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  tooltipProps?: (label: string) => Record<string, unknown>;
}

export function ViewModeToggle({ mode, onModeChange, tooltipProps }: ViewModeToggleProps) {
  const tp = tooltipProps ?? (() => ({}));
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-stone-100 p-0.5">
      <button
        type="button"
        className={`view-mode-button ${mode === "write" ? "view-mode-button-active" : ""}`}
        onClick={() => onModeChange("write")}
        title="Write"
        {...tp("Write")}
      >
        <PencilSquareIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={`view-mode-button ${mode === "split" ? "view-mode-button-active" : ""}`}
        onClick={() => onModeChange("split")}
        title="Split"
        {...tp("Split")}
      >
        <ViewColumnsIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={`view-mode-button ${mode === "preview" ? "view-mode-button-active" : ""}`}
        onClick={() => onModeChange("preview")}
        title="Preview"
        {...tp("Preview")}
      >
        <EyeIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
