import { useMemo } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useCommandsList } from "../../app/App";
import { fuzzyMatch } from "@shared/lib/utils";
import { PaletteModal } from "./PaletteModal";

export function CommandPalette() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const commands = useCommandsList();

  const allCommands = useMemo(() => {
    return commands.filter((c) => c.id !== "view.commandPalette");
  }, [commands]);

  return (
    <PaletteModal
      open={state.commandPaletteOpen}
      onClose={() => dispatch({ type: "SET_COMMAND_PALETTE", open: false })}
      ariaLabel={t`Command palette`}
      inputPlaceholder={t`Search commands...`}
      inputAriaLabel={t`Search commands`}
      resultsId="command-results"
    >
      {(query) => {
        const q = query.trim().toLowerCase();
        const filtered = allCommands
          .filter((c) => fuzzyMatch(`${c.title} ${c.aliases?.join(" ") ?? ""} ${c.id}`, q))
          .slice(0, 40);

        if (filtered.length === 0) {
          return <p className="p-3 text-sm text-stone-500"><Trans>No commands found.</Trans></p>;
        }

        return filtered.map((command) => {
          const disabled = !command.isEnabled();
          const reason = disabled ? (command.disabledReason?.() ?? t`Unavailable`) : command.scope?.join(", ") ?? "";
          return (
            <button
              key={command.id}
              type="button"
              className="command-row"
              disabled={disabled}
              title={command.title}
              onClick={() => {
                dispatch({ type: "SET_COMMAND_PALETTE", open: false });
                command.run();
              }}
            >
              <span className="min-w-0">
                <span className="block font-semibold">{command.title}</span>
                <span className="block text-xs text-stone-500">{reason}</span>
              </span>
              <span className="shrink-0 text-xs text-stone-500">{command.shortcut ?? ""}</span>
            </button>
          );
        });
      }}
    </PaletteModal>
  );
}
