import { useEffect, useRef, useState } from "react";
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
  /** Base render scale (before devicePixelRatio). */
  scale?: number;
}

/**
 * Read-only PDF viewer: renders every page to a canvas with pdf.js, fully
 * offline from in-memory bytes. Heavy — always lazy-loaded by the host.
 */
export default function PdfView({ data, scale = 1.2 }: PdfViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";
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
          const canvas = document.createElement("canvas");
          canvas.className = "pdf-page mx-auto mb-4 rounded-lg shadow-sm ring-1 ring-black/[0.06]";
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / dpr}px`;
          canvas.style.height = `${viewport.height / dpr}px`;
          host.appendChild(canvas);
          // pdf.js v6: pass the canvas element (it manages the 2D context itself).
          await page.render({ canvas, viewport }).promise;
          page.cleanup();
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
      // Destroying the loading task tears down the document and frees the worker.
      try {
        void task.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [data, scale]);

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
}

export { PdfView };
