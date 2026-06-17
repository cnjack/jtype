import { useEffect, useState, lazy, Suspense } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  PhotoIcon,
  DocumentIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import { openPath } from "@tauri-apps/plugin-opener";
import { tauri } from "../../lib/tauri";
import { basename } from "../../lib/utils";
import { resourceTypeForPath, mimeForPath } from "@shared/lib/fileTypes";
import { useAppState } from "../../app/AppState";

// pdf.js is heavy; only load it when a PDF is actually opened.
const PdfView = lazy(() => import("@shared/components/viewers/PdfView"));

type LoadState =
  | { status: "loading" }
  | { status: "ready"; url: string; size: number; bytes: Uint8Array }
  | { status: "unavailable" }
  | { status: "error"; message: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

function iconForType(id: string) {
  if (id === "image") return PhotoIcon;
  if (id === "pdf") return DocumentIcon;
  if (id === "markdown") return DocumentTextIcon;
  return DocumentIcon;
}

/**
 * Read-only viewer for non-Markdown resources (images, PDFs, and a generic
 * fallback). Reads bytes through the `read_binary_file` Tauri command and
 * renders them from an in-memory object URL. Outside the desktop shell it shows
 * a clear "preview unavailable" state rather than a broken surface.
 */
export function ResourceViewer({ path, relativePath }: { path: string; relativePath?: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const { zoomLevel } = useAppState();
  const def = resourceTypeForPath(path);
  const name = relativePath ? basename(relativePath) : basename(path);
  const TypeIcon = iconForType(def.id);

  useEffect(() => {
    let revoked = false;
    let objectUrl = "";

    if (!tauri.isAvailable) {
      setState({ status: "unavailable" });
      return;
    }
    if (def.viewer === "none") {
      setState({ status: "ready", url: "", size: 0, bytes: new Uint8Array() });
      return;
    }

    setState({ status: "loading" });
    tauri
      .readBinaryFile(path)
      .then((bytes) => {
        if (revoked) return;
        const buffer = new Uint8Array(bytes);
        const blob = new Blob([buffer], { type: mimeForPath(path) });
        objectUrl = URL.createObjectURL(blob);
        setState({ status: "ready", url: objectUrl, size: buffer.byteLength, bytes: buffer });
      })
      .catch((error) => {
        if (revoked) return;
        setState({ status: "error", message: String(error) });
      });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, def.viewer]);

  const openInOs = () => {
    if (tauri.isAvailable) void openPath(path);
  };

  const size = state.status === "ready" ? state.size : 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fbfdfb]">
      {/* Source strip */}
      <div className="flex items-center gap-3 bg-white/70 px-5 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
          <TypeIcon className="h-4 w-4" />
        </span>
        {/* The filename is already shown in the editor header's title bar, so the
            source strip only carries provenance + size to avoid repeating it. */}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs text-brand-gray">
            <ComputerDesktopIcon className="h-3 w-3" />
            <Trans>Local</Trans>
            <span aria-hidden>·</span>
            <span>{def.label}</span>
            {size > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{formatBytes(size)}</span>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-brand/40 hover:text-brand-dark disabled:opacity-40"
          onClick={openInOs}
          disabled={!tauri.isAvailable}
          title={t`Open in system app`}
        >
          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          <Trans>Open in system app</Trans>
        </button>
      </div>

      {/* Viewer body */}
      <div className="relative min-h-0 flex-1 overflow-auto">
        {state.status === "loading" && (
          <div className="flex h-full items-center justify-center">
            <div className="h-24 w-40 animate-pulse rounded-xl bg-stone-200/70" aria-label={t`Loading preview`} />
          </div>
        )}

        {state.status === "ready" && def.viewer === "image" && (
          <div
            className="flex min-h-full items-center justify-center p-8"
            style={{
              backgroundColor: "#f4f6f5",
              backgroundImage:
                "linear-gradient(45deg, #e7ebe9 25%, transparent 25%), linear-gradient(-45deg, #e7ebe9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e7ebe9 75%), linear-gradient(-45deg, transparent 75%, #e7ebe9 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
            }}
          >
            <img
              src={state.url}
              alt={name}
              className="max-h-full max-w-full rounded-lg object-contain shadow-sm ring-1 ring-black/[0.06]"
            />
          </div>
        )}

        {state.status === "ready" && def.viewer === "pdf" && (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="h-24 w-40 animate-pulse rounded-xl bg-stone-200/70" aria-label={t`Loading preview`} />
              </div>
            }
          >
            <PdfView data={state.bytes} scale={zoomLevel} />
          </Suspense>
        )}

        {state.status === "ready" && def.viewer === "none" && (
          <FallbackCard name={name} label={def.label} onOpen={openInOs} canOpen={tauri.isAvailable} />
        )}

        {state.status === "unavailable" && (
          <FallbackCard
            name={name}
            label={def.label}
            canOpen={false}
            message={t`Preview is available in the desktop app.`}
          />
        )}

        {state.status === "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <ExclamationTriangleIcon className="h-10 w-10 text-amber-500" />
            <p className="text-sm font-medium text-stone-700">
              <Trans>Could not open this file.</Trans>
            </p>
            <p className="max-w-md break-words text-xs text-brand-gray">{state.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FallbackCard({
  name,
  label,
  onOpen,
  canOpen,
  message,
}: {
  name: string;
  label: string;
  onOpen?: () => void;
  canOpen: boolean;
  message?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
        <DocumentIcon className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-stone-800">{name}</p>
      <p className="text-xs text-brand-gray">{message ?? t`${label} files can not be previewed in JType yet.`}</p>
      {canOpen && onOpen && (
        <button
          type="button"
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 hover:border-brand/40 hover:text-brand-dark"
          onClick={onOpen}
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          <Trans>Open in system app</Trans>
        </button>
      )}
    </div>
  );
}
