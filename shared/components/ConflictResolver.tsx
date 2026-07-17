import { useState } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  ArrowLeftIcon,
  CheckIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export type ConflictResolution = "accept_local" | "accept_cloud" | "manual_merge";

export interface ConflictItem {
  conflictId: string;
  relativePath: string;
  localContent: string;
  cloudContent: string;
}

export interface ConflictResolverProps {
  conflicts: ConflictItem[];
  resolving?: boolean;
  error?: string;
  compact?: boolean;
  touchOptimized?: boolean;
  onResolve: (conflictId: string, resolution: ConflictResolution, mergedContent?: string) => void;
}

type CompactPane = "local" | "cloud" | "result";

export function ConflictResolver({
  conflicts,
  resolving = false,
  error,
  compact = false,
  touchOptimized = false,
  onResolve,
}: ConflictResolverProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mergedContent, setMergedContent] = useState("");
  const [compactPane, setCompactPane] = useState<CompactPane>("local");

  const conflict = selectedIndex !== null ? conflicts[selectedIndex] : null;

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    setMergedContent(conflicts[index]?.localContent ?? "");
    setCompactPane("local");
  };

  const handleResolve = (resolution: ConflictResolution) => {
    if (!conflict) return;
    const content = resolution === "manual_merge" ? mergedContent : undefined;
    onResolve(conflict.conflictId, resolution, content);
    setSelectedIndex(null);
  };

  if (conflicts.length === 0) return null;

  return (
    <div
      data-compact={compact ? "true" : "false"}
      className={`rounded-lg border border-amber-300 bg-amber-50 ${compact ? "flex h-full min-h-0 flex-col overflow-hidden" : ""}`}
    >
      <div className={`flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 px-4 py-2 ${touchOptimized ? "min-h-11" : ""}`}>
        <span className="min-w-0 text-sm font-semibold text-amber-800">
          <Trans>⚠ {conflicts.length} Conflict{conflicts.length > 1 ? "s" : ""} to Resolve</Trans>
        </span>
        {conflict && (
          <button
            onClick={() => setSelectedIndex(null)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 text-xs text-amber-700 hover:bg-amber-100 ${touchOptimized ? "min-h-11" : "py-1 hover:underline"}`}
            aria-label={t`← Back to list`}
            title={t`← Back to list`}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {!conflict ? (
        <div className={`${compact ? "min-h-0 flex-1 overflow-y-auto" : ""} space-y-2 p-3`}>
          {conflicts.map((c, i) => (
            <button
              key={c.conflictId}
              onClick={() => handleSelect(i)}
              className={`flex w-full items-center gap-2 rounded border border-amber-200 bg-white p-2 text-left text-sm transition hover:bg-amber-100 ${touchOptimized ? "min-h-11" : ""}`}
            >
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="min-w-0 truncate font-medium text-amber-900">{c.relativePath}</span>
            </button>
          ))}
        </div>
      ) : compact ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 truncate border-b border-amber-200 px-4 py-2 text-xs font-medium text-amber-800">
            {conflict.relativePath}
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-1 border-b border-amber-200 bg-white/60 p-1" role="tablist">
            {(["local", "cloud", "result"] as const).map((pane) => {
              const label = pane === "local" ? t`Local (yours)` : pane === "cloud" ? t`Cloud (remote)` : t`Result (editable)`;
              return (
                <button
                  key={pane}
                  type="button"
                  role="tab"
                  aria-selected={compactPane === pane}
                  className={`min-h-11 rounded-md px-2 text-xs font-semibold transition ${compactPane === pane ? "bg-white text-stone-900 shadow-sm ring-1 ring-black/5" : "text-stone-500 hover:bg-white/70"}`}
                  onClick={() => setCompactPane(pane)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="min-h-0 flex-1 bg-white">
            {compactPane === "result" ? (
              <textarea
                aria-label={t`Result (editable)`}
                className="h-full min-h-56 w-full resize-none border-0 bg-stone-50 p-4 font-mono text-sm leading-relaxed text-stone-800 focus:outline-none focus:ring-0"
                value={mergedContent}
                onChange={(event) => setMergedContent(event.target.value)}
                spellCheck={false}
              />
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className={`flex min-h-11 shrink-0 items-center justify-between border-b border-amber-100 px-3 ${compactPane === "local" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>
                  <span className="text-xs font-semibold">
                    {compactPane === "local" ? t`Local (yours)` : t`Cloud (remote)`}
                  </span>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-xs font-semibold hover:bg-white/70"
                    title={t`Use this`}
                    onClick={() => {
                      setMergedContent(compactPane === "local" ? conflict.localContent : conflict.cloudContent);
                      setCompactPane("result");
                    }}
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                    <Trans>Use this</Trans>
                  </button>
                </div>
                <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-relaxed text-stone-700">
                  {compactPane === "local" ? conflict.localContent : conflict.cloudContent}
                </pre>
              </div>
            )}
          </div>
          <div
            className="shrink-0 space-y-2 border-t border-amber-200 bg-amber-50/90 p-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={resolving}
                onClick={() => handleResolve("accept_local")}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" />
                <Trans>Accept local</Trans>
              </button>
              <button
                disabled={resolving}
                onClick={() => handleResolve("accept_cloud")}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" />
                <Trans>Accept cloud</Trans>
              </button>
            </div>
            <button
              disabled={resolving}
              onClick={() => handleResolve("manual_merge")}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              <CheckIcon className="h-4 w-4" />
              {resolving ? t`Saving…` : t`Save merged result`}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="border-b border-amber-200 px-4 py-1.5 text-xs font-medium text-amber-800">
            {conflict.relativePath}
          </div>
          <div className="grid grid-cols-3 divide-x divide-amber-200" style={{ minHeight: "300px", maxHeight: "50vh" }}>
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-amber-200 bg-blue-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-blue-700"><Trans>Local (yours)</Trans></span>
                <button
                  onClick={() => setMergedContent(conflict.localContent)}
                  className={`rounded px-1.5 text-[10px] text-blue-600 ring-1 ring-blue-300 hover:bg-blue-100 ${touchOptimized ? "min-h-11" : "py-0.5"}`}
                >
                  <Trans>Use this</Trans>
                </button>
              </div>
              <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-stone-700">
                {conflict.localContent}
              </pre>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-amber-200 bg-green-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-green-700"><Trans>Cloud (remote)</Trans></span>
                <button
                  onClick={() => setMergedContent(conflict.cloudContent)}
                  className={`rounded px-1.5 text-[10px] text-green-600 ring-1 ring-green-300 hover:bg-green-100 ${touchOptimized ? "min-h-11" : "py-0.5"}`}
                >
                  <Trans>Use this</Trans>
                </button>
              </div>
              <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-stone-700">
                {conflict.cloudContent}
              </pre>
            </div>
            <div className="flex flex-col">
              <div className="border-b border-amber-200 bg-stone-100 px-3 py-1.5">
                <span className="text-xs font-semibold text-stone-600"><Trans>Result (editable)</Trans></span>
              </div>
              <textarea
                className="flex-1 resize-none border-0 bg-stone-50 p-3 font-mono text-xs leading-relaxed text-stone-800 focus:outline-none focus:ring-0"
                value={mergedContent}
                onChange={(e) => setMergedContent(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-amber-200 bg-amber-50/50 px-4 py-2">
            <div className="flex items-center gap-2">
              {error && <span className="text-xs text-red-600">{error}</span>}
              <button
                disabled={resolving}
                onClick={() => handleResolve("accept_local")}
                className={`rounded bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 ${touchOptimized ? "min-h-11" : "py-1"}`}
              >
                <Trans>Accept local</Trans>
              </button>
              <button
                disabled={resolving}
                onClick={() => handleResolve("accept_cloud")}
                className={`rounded bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 ${touchOptimized ? "min-h-11" : "py-1"}`}
              >
                <Trans>Accept cloud</Trans>
              </button>
            </div>
            <button
              disabled={resolving}
              onClick={() => handleResolve("manual_merge")}
              className={`rounded bg-brand px-4 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50 ${touchOptimized ? "min-h-11" : "py-1"}`}
            >
              {resolving ? t`Saving…` : t`Save merged result`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
