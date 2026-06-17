import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import * as pdfjsLib from "pdfjs-dist";

// Vite emits and fingerprints the worker asset from this URL. Must use
// new URL(..., import.meta.url) (not a bare string) or it 404s in production.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export interface PdfViewProps {
  /** Raw PDF bytes. */
  data: Uint8Array;
  /** Base render scale (before devicePixelRatio). Driven by app zoom level. */
  scale?: number;
}

/** Result of searching the PDF text layers. */
export interface PdfFindResult {
  /** Total number of matches across all pages. */
  count: number;
  /** Index of the currently highlighted match (0-based), or -1 if none. */
  activeIndex: number;
}

export interface PdfViewHandle {
  /**
   * Highlight matches for `query` (case-insensitive) across every page's text
   * layer, scroll the `activeIndex`-th match into view, and return the count.
   * Pass an empty query to clear highlights.
   */
  find: (query: string, activeIndex?: number) => Promise<PdfFindResult>;
}

/** One rendered page: canvas (pixels) + text layer (selectable/searchable). */
interface PageArtifact {
  pageNumber: number;
  /** Outer wrapper sizing the canvas + text layer stack. */
  wrapper: HTMLDivElement;
  /** The text-layer container built by pdf.js TextLayer. */
  textLayer: HTMLDivElement;
}

/**
 * Read-only PDF viewer: renders every page to a canvas with pdf.js, fully
 * offline from in-memory bytes. Heavy — always lazy-loaded by the host.
 *
 * A transparent pdf.js text layer is overlaid on each canvas so users can
 * select, copy, and search text (the canvas itself is just pixels).
 */
const PdfView = forwardRef<PdfViewHandle, PdfViewProps>(function PdfView(
  { data, scale = 1 },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<PageArtifact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";
    pagesRef.current = [];
    setError(null);
    setPageCount(0);

    let cancelled = false;
    // Copy the buffer: pdf.js takes ownership of the bytes it is given.
    const task = pdfjsLib.getDocument({ data: new Uint8Array(data) });

    task.promise
      .then(async (doc) => {
        if (cancelled) return;
        setPageCount(doc.numPages);
        const dpr = window.devicePixelRatio || 1;
        for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = await doc.getPage(pageNumber);
          const viewport = page.getViewport({ scale: scale * dpr });
          const cssWidth = viewport.width / dpr;
          const cssHeight = viewport.height / dpr;

          // Wrapper sizes the page so the absolutely-positioned text layer can
          // overlay the canvas pixel-for-pixel.
          const wrapper = document.createElement("div");
          wrapper.className = "pdf-page-wrapper";
          wrapper.style.position = "relative";
          wrapper.style.width = `${cssWidth}px`;
          wrapper.style.height = `${cssHeight}px`;
          wrapper.style.margin = "0 auto 1rem";

          const canvas = document.createElement("canvas");
          canvas.className = "pdf-page";
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${cssHeight}px`;
          canvas.style.borderRadius = "0.5rem";
          canvas.style.boxShadow = "0 1px 2px rgba(20,45,38,0.06)";
          wrapper.appendChild(canvas);

          // Text layer: transparent glyphs aligned over the canvas so users can
          // select/copy text and we can highlight search matches.
          const textLayerDiv = document.createElement("div");
          textLayerDiv.className = "textLayer";
          textLayerDiv.style.width = `${cssWidth}px`;
          textLayerDiv.style.height = `${cssHeight}px`;
          wrapper.appendChild(textLayerDiv);

          host.appendChild(wrapper);
          await page.render({ canvas, viewport }).promise;

          // Build the selectable text layer. pdf.js v6's TextLayer expects a
          // ReadableStream (from streamTextContent) rather than the resolved
          // TextContent object — passing the object throws
          // "undefined is not a function (near '...value of readableStream...')".
          const cssViewport = page.getViewport({ scale });
          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: page.streamTextContent(),
            container: textLayerDiv,
            viewport: cssViewport,
          });
          await textLayer.render();
          pagesRef.current.push({ pageNumber, wrapper, textLayer: textLayerDiv });
          page.cleanup();
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
      pagesRef.current = [];
      // Destroying the loading task tears down the document and frees the worker.
      try {
        void task.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [data, scale]);

  /** Highlight matches across all text layers and scroll to the active one. */
  const runFind = async (query: string, activeIndex = 0): Promise<PdfFindResult> => {
    const pages = pagesRef.current;
    const needle = query.trim().toLowerCase();
    // Clear previous highlights first (unwrap any marks we inserted).
    for (const { textLayer } of pages) {
      textLayer.querySelectorAll("mark.pdf-find-highlight").forEach((m) => {
        const parent = m.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(m.textContent ?? ""), m);
        parent.normalize();
      });
    }
    if (!needle) return { count: 0, activeIndex: -1 };

    // pdf.js lays each text run in its own span, so matches never span nodes;
    // a per-node indexOf + splitText is enough.
    const matches: HTMLElement[] = [];
    for (const { textLayer } of pages) {
      const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let node = walker.nextNode();
      while (node) {
        textNodes.push(node as Text);
        node = walker.nextNode();
      }
      for (let textNode of textNodes) {
        const text = textNode.nodeValue ?? "";
        const lower = text.toLowerCase();
        let from = 0;
        let idx = lower.indexOf(needle, from);
        while (idx !== -1) {
          // splitText returns the tail (the match + remainder); keep wrapping
          // within the new node so we don't lose our place.
          const tail = textNode.splitText(idx);
          const after = tail.splitText(needle.length);
          const mark = document.createElement("mark");
          mark.className = "pdf-find-highlight";
          mark.textContent = tail.nodeValue;
          tail.parentNode?.replaceChild(mark, tail);
          matches.push(mark);
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
    return { count: matches.length, activeIndex: target ? activeIndex : -1 };
  };

  useImperativeHandle(ref, () => ({ find: runFind }), []);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#f4f6f5] p-8 text-center">
        <p className="text-sm font-medium text-stone-700">
          <Trans>Could not render this PDF.</Trans>
        </p>
        <p className="max-w-md break-words text-xs text-brand-gray">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-auto bg-[#f4f6f5] p-6" aria-label={t`PDF document`}>
      <div ref={hostRef} data-page-count={pageCount} />
    </div>
  );
});

export default PdfView;
export { PdfView };
