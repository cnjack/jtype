import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t } from "@lingui/core/macro";
import { insertOrEditTable } from "../../hooks/useCommands";

/**
 * Slash command menu for the markdown textarea. Typing `/` at the start of a
 * line opens a filterable insert menu anchored at the caret; letters typed
 * after the slash narrow it, ArrowUp/Down navigate, Enter inserts (replacing
 * the `/query` text), Escape closes.
 *
 * The trigger is line-start-only on purpose: a slash mid-line is usually a
 * path or URL, and markdown block templates only make sense at line starts.
 *
 * Listeners are attached natively to `#editor` (the shell's uncontrolled
 * textarea) so this component stays decoupled from the editor's render path.
 */

type SlashItem = {
  id: string;
  title: string;
  hint: string;
  /** Template to insert. `$0` marks the caret position after insert. */
  template?: string;
  /** Custom insert used instead of `template` (after the /query is removed). */
  action?: () => void;
};

function buildItems(): SlashItem[] {
  return [
    { id: "h1", title: t`Heading 1`, hint: "#", template: "# $0" },
    { id: "h2", title: t`Heading 2`, hint: "##", template: "## $0" },
    { id: "h3", title: t`Heading 3`, hint: "###", template: "### $0" },
    { id: "bullet", title: t`Bullet list`, hint: "-", template: "- $0" },
    { id: "numbered", title: t`Numbered list`, hint: "1.", template: "1. $0" },
    { id: "task", title: t`Task list`, hint: "- [ ]", template: "- [ ] $0" },
    { id: "quote", title: t`Quote`, hint: ">", template: "> $0" },
    { id: "code", title: t`Code block`, hint: "```", template: "```\n$0\n```" },
    { id: "table", title: t`Table`, hint: "|—|", action: () => insertOrEditTable() },
    { id: "math", title: t`Math block`, hint: "$$", template: "$$\n$0\n$$" },
    { id: "mermaid", title: t`Mermaid diagram`, hint: "```mermaid", template: "```mermaid\nflowchart TD\n  A[Start] --> B[$0]\n```" },
    { id: "board", title: t`Board embed`, hint: "```jtype-board", template: "```jtype-board\n$0\n```" },
    { id: "divider", title: t`Divider`, hint: "---", template: "---\n$0" },
  ];
}

/** Pixel rect of the caret inside a textarea, via the mirror-div technique. */
function caretRect(textarea: HTMLTextAreaElement): { left: number; top: number; height: number } {
  const mirror = document.createElement("div");
  const style = getComputedStyle(textarea);
  for (const prop of [
    "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing",
    "lineHeight", "tabSize", "textIndent", "textTransform", "wordSpacing",
  ] as const) {
    mirror.style[prop as never] = style[prop as never];
  }
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";
  mirror.textContent = textarea.value.slice(0, textarea.selectionStart);
  const marker = document.createElement("span");
  marker.textContent = "​";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const markerTop = marker.offsetTop;
  const markerLeft = marker.offsetLeft;
  const lineHeight = parseFloat(style.lineHeight) || 20;
  mirror.remove();
  const box = textarea.getBoundingClientRect();
  return {
    left: box.left + markerLeft - textarea.scrollLeft,
    top: box.top + markerTop - textarea.scrollTop,
    height: lineHeight,
  };
}

export function SlashMenu({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [slashStart, setSlashStart] = useState(0);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo(buildItems, []);
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.id.includes(q) || item.title.toLowerCase().includes(q));
  }, [items, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelected(0);
  }, []);

  const apply = useCallback(
    (item: SlashItem) => {
      const editor = document.getElementById("editor") as HTMLTextAreaElement | null;
      if (!editor) return;
      const end = editor.selectionStart;
      // Remove the "/query" trigger text first.
      editor.setRangeText("", slashStart, end, "start");
      if (item.template) {
        const caretToken = item.template.indexOf("$0");
        const text = item.template.replace("$0", "");
        editor.setRangeText(text, slashStart, slashStart, "start");
        const caret = slashStart + (caretToken === -1 ? text.length : caretToken);
        editor.setSelectionRange(caret, caret);
      }
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      if (item.action) item.action();
      editor.focus();
      close();
    },
    [slashStart, close],
  );

  // Detect the "/" trigger from input events on the shell textarea.
  useEffect(() => {
    if (!enabled) {
      close();
      return;
    }
    const editor = document.getElementById("editor") as HTMLTextAreaElement | null;
    if (!editor) return;

    const onInput = () => {
      const caret = editor.selectionStart;
      const before = editor.value.slice(0, caret);
      const match = before.match(/(?:^|\n)(\/([a-zA-Z0-9-]*))$/);
      if (match) {
        const start = caret - match[1].length;
        setSlashStart(start);
        setQuery(match[2] ?? "");
        setSelected(0);
        const rect = caretRect(editor);
        setAnchor({ left: rect.left, top: rect.top + rect.height + 4 });
        setOpen(true);
      } else {
        close();
      }
    };
    const onBlur = () => {
      // Delay so a mousedown on the menu can run first.
      window.setTimeout(close, 120);
    };
    editor.addEventListener("input", onInput);
    editor.addEventListener("blur", onBlur);
    return () => {
      editor.removeEventListener("input", onInput);
      editor.removeEventListener("blur", onBlur);
    };
  }, [enabled, close]);

  // Keyboard navigation while the menu is open (capture so we win over other
  // textarea key handling).
  useEffect(() => {
    if (!open) return;
    const editor = document.getElementById("editor") as HTMLTextAreaElement | null;
    if (!editor) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelected((v) => (filtered.length ? (v + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelected((v) => (filtered.length ? (v - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (filtered.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        apply(filtered[Math.min(selected, filtered.length - 1)]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    editor.addEventListener("keydown", onKeyDown, true);
    return () => editor.removeEventListener("keydown", onKeyDown, true);
  }, [open, filtered, selected, apply, close]);

  // Keep the active item visible while cycling with the keyboard.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open || !anchor || filtered.length === 0) return null;

  return (
    <div
      ref={listRef}
      id="slash-menu"
      role="listbox"
      aria-label={t`Insert block`}
      className="fixed z-50 max-h-72 w-64 overflow-y-auto rounded-lg border border-black/[0.08] bg-white py-1 shadow-xl"
      style={{ left: anchor.left, top: anchor.top }}
    >
      {filtered.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={index === selected}
          data-index={index}
          className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm ${
            index === selected ? "bg-stone-100 text-stone-900" : "text-stone-700 hover:bg-stone-50"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            apply(item);
          }}
          onMouseEnter={() => setSelected(index)}
        >
          <span>{item.title}</span>
          <span className="shrink-0 font-mono text-xs text-stone-400">{item.hint}</span>
        </button>
      ))}
    </div>
  );
}
