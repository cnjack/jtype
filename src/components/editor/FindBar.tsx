import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@lingui/core/macro";
import {
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAppDispatch, useAppState } from "../../app/AppState";

/**
 * In-page find bar (Cmd+F). Searches the currently visible surface:
 *  - Markdown "write" mode: the `#editor` textarea (selects the match).
 *  - Markdown "preview"/"split" mode: the `#preview` article (highlights <mark>).
 *  - PDF: the `.textLayer` divs (highlights <mark> over transparent glyphs).
 *
 * Replace (Cmd+Alt+F) is available only in write mode: matches in the rendered
 * preview/PDF don't map 1:1 onto markdown source offsets, so mutating from
 * those surfaces would be unsound. Replacement goes through setRangeText plus
 * a synthetic `input` event so the normal editor change pipeline runs.
 *
 * The bar is driven by AppState.findBarOpen so Escape (handled globally) and
 * Cmd+F (handled in EditorShell) can open/close it. Local state holds the query
 * and the active match index.
 */
export function FindBar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceValue, setReplaceValue] = useState("");
  const [matchCase, setMatchCase] = useState(false);

  // Where to search depends on what's visible.
  const isMarkdownWrite = state.currentKind === "markdown" && state.editorMode === "write";
  const isMarkdownPreview =
    state.currentKind === "markdown" && (state.editorMode === "preview" || state.editorMode === "split");
  const isPdf = state.currentKind === "asset";
  const canReplace =
    isMarkdownWrite && !(document.getElementById("editor") as HTMLTextAreaElement | null)?.readOnly;

  /** Run the search and highlight, anchoring on `index`. Returns match count. */
  const runSearch = useCallback(
    async (q: string, index: number) => {
      const needle = matchCase ? q.trim() : q.trim().toLowerCase();
      // PDF text layer search.
      if (isPdf) {
        const c = await highlightPdf(needle, index, matchCase);
        setCount(c);
        setActiveIndex(c > 0 ? Math.min(index, c - 1) : 0);
        return;
      }
      // Markdown source (textarea): count + select the active match.
      if (isMarkdownWrite) {
        const editor = document.getElementById("editor") as HTMLTextAreaElement | null;
        if (!editor || !needle) {
          setCount(0);
          setActiveIndex(0);
          return;
        }
        const positions = findAllIndexes(matchCase ? editor.value : editor.value.toLowerCase(), needle);
        setCount(positions.length);
        if (positions.length === 0) {
          setActiveIndex(0);
          return;
        }
        const target = positions[Math.min(index, positions.length - 1)];
        setActiveIndex(Math.min(index, positions.length - 1));
        editor.focus();
        editor.setSelectionRange(target, target + needle.length);
        return;
      }
      // Markdown preview: highlight matches in #preview.
      if (isMarkdownPreview) {
        const c = highlightPreview(needle, index, matchCase);
        setCount(c);
        setActiveIndex(c > 0 ? Math.min(index, c - 1) : 0);
      }
    },
    [isPdf, isMarkdownWrite, isMarkdownPreview, matchCase],
  );

  // Re-run search when the query or case sensitivity changes.
  useEffect(() => {
    void runSearch(query, 0);
  }, [query, runSearch]);

  // Re-apply preview highlights after the markdown re-renders (morphdom wipes
  // our <mark> nodes). editorContentVersion bumps on every content change.
  useEffect(() => {
    if (isMarkdownPreview && query.trim()) {
      void runSearch(query, activeIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.editorContentVersion]);

  // Focus the input when the bar opens.
  useEffect(() => {
    if (state.findBarOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      // Closing clears highlights so the document is clean again.
      setQuery("");
      setReplaceOpen(false);
      void runSearch("", 0);
    }
  }, [state.findBarOpen, runSearch]);

  // EditorShell dispatches Cmd+G as a CustomEvent so we can step the match
  // index without lifting transient find state into the global reducer.
  useEffect(() => {
    if (!state.findBarOpen) return;
    const onStep = (e: Event) => {
      const direction = (e as CustomEvent<{ direction: number }>).detail?.direction ?? 1;
      step(direction);
    };
    window.addEventListener("jtype:find-step", onStep);
    return () => window.removeEventListener("jtype:find-step", onStep);
    // step closes over query/count/activeIndex; re-bind when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.findBarOpen, query, count, activeIndex]);

  // Cmd+Alt+F (EditorShell) asks for the replace row.
  useEffect(() => {
    const onOpenReplace = () => setReplaceOpen(true);
    window.addEventListener("jtype:find-open-replace", onOpenReplace);
    return () => window.removeEventListener("jtype:find-open-replace", onOpenReplace);
  }, []);

  if (!state.findBarOpen) return null;

  const step = (delta: number) => {
    if (count === 0) return;
    const next = (activeIndex + delta + count) % count;
    void runSearch(query, next);
  };

  const close = () => dispatch({ type: "SET_FINDBAR", open: false });

  /** Current match positions in the textarea source, honoring case mode. */
  const sourceMatches = (editor: HTMLTextAreaElement) => {
    const needle = matchCase ? query.trim() : query.trim().toLowerCase();
    if (!needle) return { needle, positions: [] as number[] };
    return { needle, positions: findAllIndexes(matchCase ? editor.value : editor.value.toLowerCase(), needle) };
  };

  /** setRangeText keeps the undo stack; the synthetic bubbling `input` event
   * runs EditorShell's onInput so app state stays in sync with the DOM. */
  const applyEdit = (editor: HTMLTextAreaElement, text: string, start: number, end: number) => {
    editor.setRangeText(text, start, end, "end");
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const replaceCurrent = () => {
    const editor = document.getElementById("editor") as HTMLTextAreaElement | null;
    if (!editor || !canReplace) return;
    const { needle, positions } = sourceMatches(editor);
    if (positions.length === 0) return;
    const idx = Math.min(activeIndex, positions.length - 1);
    const start = positions[idx];
    applyEdit(editor, replaceValue, start, start + needle.length);
    // The next match now sits at the same index; re-anchor there.
    void runSearch(query, idx);
  };

  const replaceAll = () => {
    const editor = document.getElementById("editor") as HTMLTextAreaElement | null;
    if (!editor || !canReplace) return;
    const { needle, positions } = sourceMatches(editor);
    if (positions.length === 0) return;
    const source = editor.value;
    let result = "";
    let last = 0;
    for (const pos of positions) {
      result += source.slice(last, pos) + replaceValue;
      last = pos + needle.length;
    }
    result += source.slice(last);
    applyEdit(editor, result, 0, source.length);
    void runSearch(query, 0);
  };

  return (
    <div
      id="find-bar"
      className="absolute right-4 top-2 z-40 flex flex-col gap-1 rounded-lg border border-black/[0.06] bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur"
    >
      <div className="flex items-center gap-2">
        {canReplace && (
          <button
            type="button"
            className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            title={replaceOpen ? t`Hide replace` : t`Show replace`}
            aria-label={replaceOpen ? t`Hide replace` : t`Show replace`}
            aria-expanded={replaceOpen}
            onClick={() => setReplaceOpen((v) => !v)}
          >
            <ChevronRightIcon className={`h-3.5 w-3.5 transition-transform ${replaceOpen ? "rotate-90" : ""}`} />
          </button>
        )}
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-stone-400" />
        <input
          ref={inputRef}
          id="find-input"
          className="w-44 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
          placeholder={t`Find`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              step(e.shiftKey ? -1 : 1);
            } else if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
          aria-label={t`Find in document`}
        />
        <span className="shrink-0 text-xs tabular-nums text-stone-400" aria-live="polite">
          {query.trim() === ""
            ? ""
            : count === 0
              ? t`No results`
              : `${activeIndex + 1}/${count}`}
        </span>
        <button
          type="button"
          className={`rounded px-1 py-0.5 text-xs font-semibold ${matchCase ? "bg-stone-200 text-stone-800" : "text-stone-400 hover:bg-stone-100"}`}
          title={t`Match case`}
          aria-label={t`Match case`}
          aria-pressed={matchCase}
          onClick={() => setMatchCase((v) => !v)}
        >
          Aa
        </button>
        <button
          type="button"
          className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"
          title={t`Previous match`}
          aria-label={t`Previous match`}
          disabled={count === 0}
          onClick={() => step(-1)}
        >
          <ChevronUpIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"
          title={t`Next match`}
          aria-label={t`Next match`}
          disabled={count === 0}
          onClick={() => step(1)}
        >
          <ChevronDownIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1 text-stone-500 hover:bg-stone-100"
          title={t`Close find bar`}
          aria-label={t`Close find bar`}
          onClick={close}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      {canReplace && replaceOpen && (
        <div className="flex items-center gap-2 pl-[26px]">
          <input
            className="w-44 rounded border border-stone-200 bg-white px-1.5 py-0.5 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-400"
            placeholder={t`Replace with`}
            value={replaceValue}
            onChange={(e) => setReplaceValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (e.metaKey || e.ctrlKey) replaceAll();
                else replaceCurrent();
              } else if (e.key === "Escape") {
                e.preventDefault();
                close();
              }
            }}
            aria-label={t`Replace with`}
          />
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-30"
            disabled={count === 0}
            onClick={replaceCurrent}
          >
            <span>{t`Replace`}</span>
          </button>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-30"
            disabled={count === 0}
            onClick={replaceAll}
          >
            <span>{t`All`}</span>
          </button>
        </div>
      )}
    </div>
  );
}

/** Return every start index of `needle` in `haystack`. */
function findAllIndexes(haystack: string, needle: string): number[] {
  if (!needle) return [];
  const out: number[] = [];
  let from = 0;
  let idx = haystack.indexOf(needle, from);
  while (idx !== -1) {
    out.push(idx);
    from = idx + needle.length;
    idx = haystack.indexOf(needle, from);
  }
  return out;
}

/** Highlight matches inside `#preview` and scroll the active one into view. */
function highlightPreview(needle: string, activeIndex: number, matchCase: boolean): number {
  const preview = document.getElementById("preview");
  if (!preview) return 0;
  clearMarks(preview, "mark.find-highlight");
  if (!needle) return 0;

  const norm = (value: string) => (matchCase ? value : value.toLowerCase());
  const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      // Skip inside our own highlight marks and script/style.
      if (!parent || parent.tagName === "MARK" || parent.tagName === "SCRIPT" || parent.tagName === "STYLE") {
        return NodeFilter.FILTER_REJECT;
      }
      return norm(node.nodeValue ?? "").includes(needle)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const marks: HTMLElement[] = [];
  let textNode: Text | null = walker.nextNode() as Text | null;
  while (textNode) {
    const text = textNode.nodeValue ?? "";
    let idx = norm(text).indexOf(needle, 0);
    while (idx !== -1) {
      const tail: Text = textNode.splitText(idx);
      const after: Text = tail.splitText(needle.length);
      const mark = document.createElement("mark");
      mark.className = "find-highlight";
      mark.textContent = tail.nodeValue;
      tail.parentNode?.replaceChild(mark, tail);
      marks.push(mark);
      textNode = after;
      idx = norm(after.nodeValue ?? "").indexOf(needle, 0);
    }
    textNode = walker.nextNode() as Text | null;
  }

  const target = marks[Math.min(Math.max(activeIndex, 0), marks.length - 1)];
  if (target) {
    target.classList.add("find-highlight-active");
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  return marks.length;
}

/** Highlight matches across every `.textLayer` (PDF) and scroll to active. */
async function highlightPdf(needle: string, activeIndex: number, matchCase: boolean): Promise<number> {
  const layers = document.querySelectorAll<HTMLElement>(".textLayer");
  const norm = (value: string) => (matchCase ? value : value.toLowerCase());
  let total = 0;
  const matches: HTMLElement[] = [];
  for (const layer of Array.from(layers)) {
    clearMarks(layer, "mark.pdf-find-highlight");
    if (!needle) continue;
    const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      textNodes.push(node as Text);
      node = walker.nextNode();
    }
    for (let textNode of textNodes) {
      const text = textNode.nodeValue ?? "";
      let idx = norm(text).indexOf(needle, 0);
      while (idx !== -1) {
        const tail = textNode.splitText(idx);
        const after = tail.splitText(needle.length);
        const mark = document.createElement("mark");
        mark.className = "pdf-find-highlight";
        mark.textContent = tail.nodeValue;
        tail.parentNode?.replaceChild(mark, tail);
        matches.push(mark);
        total += 1;
        textNode = after;
        idx = norm(after.nodeValue ?? "").indexOf(needle, 0);
      }
    }
  }

  const target = matches[Math.min(Math.max(activeIndex, 0), matches.length - 1)];
  if (target) {
    target.classList.add("pdf-find-active");
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  return total;
}

/** Unwrap marks with the given selector inside `root` and normalize text. */
function clearMarks(root: ParentNode, selector: string) {
  root.querySelectorAll(selector).forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(m.textContent ?? ""), m);
    parent.normalize();
  });
}
