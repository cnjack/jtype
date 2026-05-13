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
    <div className="flex items-center gap-0.5 px-1">
      <button
        type="button"
        className="editor-tool"
        disabled={disabled}
        onClick={() => onInsert("**", "**")}
        title="Bold"
        {...tp("Bold (Ctrl+B)")}
      >
        <BoldIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="editor-tool"
        disabled={disabled}
        onClick={() => onInsert("_", "_")}
        title="Italic"
        {...tp("Italic (Ctrl+I)")}
      >
        <ItalicIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="editor-tool"
        disabled={disabled}
        onClick={() => onInsert("[", "](url)")}
        title="Link"
        {...tp("Link (Ctrl+K)")}
      >
        <LinkIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="editor-tool"
        disabled={disabled}
        onClick={() => onInsert("`", "`")}
        title="Inline Code"
        {...tp("Code")}
      >
        <CodeBracketIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="editor-tool"
        disabled={disabled}
        onClick={() => onInsert("\n| Column 1 | Column 2 |\n| --- | --- |\n| cell | cell |\n")}
        title="Table"
        {...tp("Table")}
      >
        <TableCellsIcon className="h-4 w-4" />
      </button>
      {extraActions}
    </div>
  );
}
