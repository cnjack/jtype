import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { frontmatterLineCount } from "../lib/frontmatter";

// While a pane is actively scrolled it "owns" the sync; scroll events on the
// other pane within this idle window are treated as programmatic echoes and
// ignored. Continued scrolling on the active pane keeps refreshing the timer.
const SYNC_LOCK_MS = 100;

// Building a hidden mirror for very large documents would create hundreds of
// thousands of nodes; above this line count we fall back to proportional sync.
const MAX_MIRROR_LINES = 8000;

// Style properties that affect how text wraps and how tall each line is. The
// editor mirror copies these from the live textarea so its line offsets match.
const MIRROR_PROPS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontVariant",
  "letterSpacing",
  "wordSpacing",
  "textTransform",
  "textIndent",
  "lineHeight",
  "tabSize",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
] as const;

type Anchor = { line: number; top: number };

type EditorOffsets = {
  key: string;
  // offsets[i] = the editor scrollTop at which source line i sits at the top.
  offsets: number[];
  totalLines: number;
  frontmatterLines: number;
};

type PreviewAnchors = {
  key: string;
  anchors: Anchor[];
};

/**
 * Measure the vertical offset of every source line inside the textarea using a
 * hidden mirror element. A textarea exposes no per-line geometry and soft-wraps
 * long lines, so proportional scrolling drifts out of alignment; the mirror
 * reproduces the textarea's wrapping to recover true line offsets.
 */
function buildEditorOffsets(editor: HTMLTextAreaElement): number[] | null {
  const lines = editor.value.split("\n");
  if (lines.length > MAX_MIRROR_LINES) return null;

  const computed = getComputedStyle(editor);
  const mirror = document.createElement("div");
  const style = mirror.style as unknown as Record<string, string>;
  for (const prop of MIRROR_PROPS) style[prop] = (computed as unknown as Record<string, string>)[prop];
  style.position = "absolute";
  style.top = "0";
  style.left = "-9999px";
  style.visibility = "hidden";
  style.border = "0";
  style.boxSizing = "border-box";
  // clientWidth excludes the border (and any scrollbar), matching the textarea's
  // content+padding box; border-box + this width reproduces the wrap width.
  style.width = `${editor.clientWidth}px`;
  style.whiteSpace = "pre-wrap";
  style.overflowWrap = "break-word";
  style.wordWrap = "break-word";

  const markers: HTMLSpanElement[] = [];
  const fragment = document.createDocumentFragment();
  for (const text of lines) {
    const marker = document.createElement("span");
    markers.push(marker);
    fragment.appendChild(marker);
    // Trailing newline forces blank lines to occupy a row, matching the textarea.
    fragment.appendChild(document.createTextNode(`${text}\n`));
  }
  mirror.appendChild(fragment);
  document.body.appendChild(mirror);
  const offsets = markers.map((marker) => marker.offsetTop);
  document.body.removeChild(mirror);
  return offsets;
}

function readPreviewAnchors(preview: HTMLElement): Anchor[] {
  const anchors: Anchor[] = [];
  preview.querySelectorAll<HTMLElement>("[data-source-line]").forEach((node) => {
    const line = Number(node.dataset.sourceLine);
    if (Number.isFinite(line)) anchors.push({ line, top: node.offsetTop });
  });
  anchors.sort((a, b) => a.line - b.line);
  // Enforce non-decreasing tops so interpolation stays monotonic even if an
  // out-of-flow element reports a smaller offsetTop than an earlier block.
  for (let i = 1; i < anchors.length; i += 1) {
    if (anchors[i].top < anchors[i - 1].top) anchors[i].top = anchors[i - 1].top;
  }
  return anchors;
}

// Linear interpolation across sorted anchors: map x (a line, or a top) to the
// paired value. `byLine` selects the lookup axis.
function interpolate(anchors: Anchor[], x: number, byLine: boolean): number {
  if (anchors.length === 0) return 0;
  const at = (a: Anchor) => (byLine ? a.line : a.top);
  const to = (a: Anchor) => (byLine ? a.top : a.line);
  if (x <= at(anchors[0])) return to(anchors[0]);
  const last = anchors.length - 1;
  if (x >= at(anchors[last])) return to(anchors[last]);
  let lo = 0;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (at(anchors[mid]) <= x) lo = mid;
    else hi = mid - 1;
  }
  const a = anchors[lo];
  const b = anchors[lo + 1];
  const span = at(b) - at(a) || 1;
  return to(a) + (to(b) - to(a)) * ((x - at(a)) / span);
}

function proportional(source: HTMLElement, target: HTMLElement) {
  const sourceRange = Math.max(1, source.scrollHeight - source.clientHeight);
  const targetRange = Math.max(1, target.scrollHeight - target.clientHeight);
  target.scrollTop = (source.scrollTop / sourceRange) * targetRange;
}

export function useScrollSync(
  editorRef: RefObject<HTMLTextAreaElement | null>,
  previewRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  const activeSource = useRef<HTMLElement | null>(null);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    // Caches rebuilt only when a cheap DOM signature changes (content, width, or
    // wrap/height), so each scroll event is a couple of layout reads, not a
    // full mirror rebuild.
    let editorCache: EditorOffsets | null = null;
    let previewCache: PreviewAnchors | null = null;

    const getEditorOffsets = (): EditorOffsets | null => {
      const key = `${editor.value.length}|${editor.clientWidth}|${editor.scrollHeight}`;
      if (editorCache && editorCache.key === key) return editorCache;
      const offsets = buildEditorOffsets(editor);
      if (!offsets) {
        editorCache = null;
        return null;
      }
      editorCache = {
        key,
        offsets,
        totalLines: offsets.length,
        frontmatterLines: frontmatterLineCount(editor.value),
      };
      return editorCache;
    };

    const getPreviewAnchors = (totalLines: number, frontmatterLines: number): Anchor[] => {
      const key = `${preview.childElementCount}|${preview.clientWidth}|${preview.scrollHeight}|${totalLines}`;
      if (previewCache && previewCache.key === key) return previewCache.anchors;
      const real = readPreviewAnchors(preview);
      // Pin the document head and tail together so the two panes reach top and
      // bottom in lockstep regardless of how content density differs between.
      const maxScroll = Math.max(0, preview.scrollHeight - preview.clientHeight);
      const bodyLines = Math.max(0, totalLines - frontmatterLines);
      const anchors: Anchor[] = [{ line: 0, top: 0 }];
      for (const anchor of real) {
        if (anchor.line > 0 && anchor.line < bodyLines) anchors.push(anchor);
      }
      const lastReal = real.length > 0 ? real[real.length - 1].line : 0;
      anchors.push({ line: Math.max(bodyLines, lastReal + 1), top: maxScroll });
      previewCache = { key, anchors };
      return anchors;
    };

    const syncFromEditor = () => {
      const offsets = getEditorOffsets();
      if (!offsets) return proportional(editor, preview);
      const anchors = getPreviewAnchors(offsets.totalLines, offsets.frontmatterLines);
      if (anchors.length < 2) return proportional(editor, preview);
      const editorLine = interpolateScrollTopToLine(offsets.offsets, editor.scrollTop);
      const bodyLine = editorLine - offsets.frontmatterLines;
      preview.scrollTop = interpolate(anchors, bodyLine, true);
    };

    const syncFromPreview = () => {
      const offsets = getEditorOffsets();
      if (!offsets) return proportional(preview, editor);
      const anchors = getPreviewAnchors(offsets.totalLines, offsets.frontmatterLines);
      if (anchors.length < 2) return proportional(preview, editor);
      const bodyLine = interpolate(anchors, preview.scrollTop, false);
      const editorLine = bodyLine + offsets.frontmatterLines;
      editor.scrollTop = interpolateLineToScrollTop(offsets.offsets, editorLine);
    };

    // Setting `target.scrollTop` fires a `scroll` event on the target on a later
    // frame; locking to the actively-scrolled pane lets us discard that echo
    // instead of racing it with a rAF-cleared flag (which let the echo sync back
    // and quantize the position upward).
    const drive = (source: HTMLElement, run: () => void) => {
      if (activeSource.current && activeSource.current !== source) return;
      activeSource.current = source;
      run();
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      releaseTimer.current = setTimeout(() => {
        activeSource.current = null;
      }, SYNC_LOCK_MS);
    };

    const handleEditorScroll = () => drive(editor, syncFromEditor);
    const handlePreviewScroll = () => drive(preview, syncFromPreview);

    editor.addEventListener("scroll", handleEditorScroll, { passive: true });
    preview.addEventListener("scroll", handlePreviewScroll, { passive: true });

    return () => {
      editor.removeEventListener("scroll", handleEditorScroll);
      preview.removeEventListener("scroll", handlePreviewScroll);
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      activeSource.current = null;
    };
  }, [editorRef, previewRef, enabled]);
}

// offsets[i] is the scrollTop at which line i sits at the viewport top; convert a
// scrollTop to the fractional source line it currently shows.
function interpolateScrollTopToLine(offsets: number[], scrollTop: number): number {
  if (offsets.length === 0) return 0;
  if (scrollTop <= offsets[0]) return 0;
  const last = offsets.length - 1;
  if (scrollTop >= offsets[last]) return last;
  let lo = 0;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= scrollTop) lo = mid;
    else hi = mid - 1;
  }
  const span = offsets[lo + 1] - offsets[lo] || 1;
  return lo + (scrollTop - offsets[lo]) / span;
}

function interpolateLineToScrollTop(offsets: number[], line: number): number {
  if (offsets.length === 0) return 0;
  if (line <= 0) return offsets[0];
  const last = offsets.length - 1;
  if (line >= last) return offsets[last];
  const i = Math.floor(line);
  return offsets[i] + (offsets[i + 1] - offsets[i]) * (line - i);
}
