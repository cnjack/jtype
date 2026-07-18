import { t } from "@lingui/core/macro";
import type { ReactNode } from "react";
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  CodeBracketIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";

type InsertFn = (before: string, after?: string) => void;

export interface EditorToolbarProps {
  onInsert: InsertFn;
  disabled?: boolean;
  tooltipProps?: (label: string) => Record<string, unknown>;
  extraActions?: ReactNode;
}

export function EditorToolbar({ onInsert, disabled, tooltipProps, extraActions }: EditorToolbarProps) {
  const tp = tooltipProps ?? (() => ({}));

  return (
    <div className="flex items-center gap-0.5 px-1" role="toolbar" aria-label={t`Editor formatting`}>
      <button
        type="button"
        className="editor-tool"
        disabled={disabled}
        onClick={() => onInsert("**", "**")}
        title={t`Bold`}
        aria-label={t`Bold`}
        aria-keyshortcuts="Control+B Meta+B"
        {...tp(t`Bold (Ctrl+B)`)}
      >
        <BoldIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="editor-tool"
        disabled={disabled}
        onClick={() => onInsert("_", "_")}
        title={t`Italic`}
        aria-label={t`Italic`}
        aria-keyshortcuts="Control+I Meta+I"
        {...tp(t`Italic (Ctrl+I)`)}
      >
        <ItalicIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="editor-tool"
        disabled={disabled}
        onClick={() => onInsert("[", "](url)")}
        title={t`Link`}
        aria-label={t`Link`}
        aria-keyshortcuts="Control+K Meta+K"
        {...tp(t`Link (Ctrl+K)`)}
      >
        <LinkIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="editor-tool"
        disabled={disabled}
        onClick={() => onInsert("`", "`")}
        title={t`Inline Code`}
        aria-label={t`Inline Code`}
        {...tp(t`Code`)}
      >
        <CodeBracketIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="editor-tool"
        disabled={disabled}
        onClick={() => onInsert("\n| Column 1 | Column 2 |\n| --- | --- |\n| cell | cell |\n")}
        title={t`Table`}
        aria-label={t`Table`}
        {...tp(t`Table`)}
      >
        <TableCellsIcon className="h-4 w-4" />
      </button>
      {extraActions}
    </div>
  );
}
