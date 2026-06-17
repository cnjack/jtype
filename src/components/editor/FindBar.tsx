import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@lingui/core/macro";
import {
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAppDispatch, useAppState } from "../../app/AppState";

/**
 * In-page find bar (Cmd+F). Searches the currently visible surface:
 *  - Markdown "write" mode: the `#editor` textarea (selects the match).
 *  - Markdown "preview"/"split" mode: the `#preview` article (highlights <mark>).
 *  - PDF: the `.textLayer` divs (highlights <mark> over transparent glyphs).
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

  // Where to search depends on what's visible.
  const isMarkdownWrite = state.currentKind === "markdown" && state.editorMode === "write";
  const isMarkdownPreview =
    state.currentKind === "markdown" && (state.editorMode === "preview" || state.editorMode === "split");
  const isPdf = state.currentKind === "asset";

  /** Run the search and highlight, anchoring on `index`. Returns match count. */
  const runSearch = useCallback(
    async (q: string, index: number) => {
      const needle = q.trim().toLowerCase();
      // PDF text layer search.
      if (isPdf) {
        const c = await highlightPdf(needle, index);
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
        const positions = findAllIndexes(editor.value.toLowerCase(), needle);
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
        const c = highlightPreview(needle, index);
        setCount(c);
        setActiveIndex(c > 0 ? Math.min(index, c - 1) : 0);
      }
    },
    [isPdf, isMarkdownWrite, isMarkdownPreview],
  );

  // Re-run search when the query changes.
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

  if (!state.findBarOpen) return null;

  const step = (delta: number) => {
    if (count === 0) return;
    const next = (activeIndex + delta + count) % count;
    void runSearch(query, next);
  };

  const close = () => dispatch({ type: "SET_FINDBAR", open: false });

  return (
    <div
      id="find-bar"
      className="absolute right-4 top-2 z-40 flex items-center gap-2 rounded-lg border border-black/[0.06] bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur"
    >
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
function highlightPreview(needle: string, activeIndex: number): number {
  const preview = document.getElementById("preview");
  if (!preview) return 0;
  clearMarks(preview, "mark.find-highlight");
  if (!needle) return 0;

  const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      // Skip inside our own highlight marks and script/style.
      if (!parent || parent.tagName === "MARK" || parent.tagName === "SCRIPT" || parent.tagName === "STYLE") {
        return NodeFilter.FILTER_REJECT;
      }
      return (node.nodeValue ?? "").toLowerCase().includes(needle)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const marks: HTMLElement[] = [];
  let textNode: Text | null = walker.nextNode() as Text | null;
  while (textNode) {
    const text = textNode.nodeValue ?? "";
    const lower = text.toLowerCase();
    let from = 0;
    let idx = lower.indexOf(needle, from);
    while (idx !== -1) {
      const tail: Text = textNode.splitText(idx);
      const after: Text = tail.splitText(needle.length);
      const mark = document.createElement("mark");
      mark.className = "find-highlight";
      mark.textContent = tail.nodeValue;
      tail.parentNode?.replaceChild(mark, tail);
      marks.push(mark);
      textNode = after;
      idx = (after.nodeValue ?? "").toLowerCase().indexOf(needle, 0);
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
async function highlightPdf(needle: string, activeIndex: number): Promise<number> {
  const layers = document.querySelectorAll<HTMLElement>(".textLayer");
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
      const lower = text.toLowerCase();
      let idx = lower.indexOf(needle, 0);
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
        idx = (after.nodeValue ?? "").toLowerCase().indexOf(needle, 0);
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
