import { useAppDispatch, useAppState } from "../../app/AppState";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";

export function Breadcrumb() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  if (!state.workspace || !state.currentRelativePath) return null;

  const segments = state.currentRelativePath.split("/");

  return (
    <nav className="flex items-center gap-0.5 text-xs text-[#6b7773]" aria-label="Breadcrumb">
      <button
        type="button"
        className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-[#e8f6f2] hover:text-[#006f6b]"
        onClick={() => dispatch({ type: "CLEAR_DOCUMENT" })}
        title={state.workspace.name}
      >
        <HomeIcon className="h-3 w-3" />
        <span className="max-w-[8ch] truncate">{state.workspace.name}</span>
      </button>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const partialPath = segments.slice(0, index + 1).join("/");
        return (
          <span key={partialPath} className="flex items-center gap-0.5">
            <ChevronRightIcon className="h-3 w-3 text-[#c0c8c4]" />
            {isLast ? (
              <span className="max-w-[16ch] truncate font-medium text-stone-700">{segment}</span>
            ) : (
              <button
                type="button"
                className="max-w-[12ch] truncate rounded px-1 py-0.5 hover:bg-[#e8f6f2] hover:text-[#006f6b]"
                onClick={() => dispatch({ type: "TOGGLE_EXPAND_FOLDER", folderPath: partialPath })}
                title={partialPath}
              >
                {segment}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
