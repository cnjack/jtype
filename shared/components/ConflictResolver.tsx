import { useState } from "react";

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
  onResolve: (conflictId: string, resolution: ConflictResolution, mergedContent?: string) => void;
}

export function ConflictResolver({ conflicts, resolving = false, error, onResolve }: ConflictResolverProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mergedContent, setMergedContent] = useState("");

  const conflict = selectedIndex !== null ? conflicts[selectedIndex] : null;

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    setMergedContent(conflicts[index]?.localContent ?? "");
  };

  const handleResolve = (resolution: ConflictResolution) => {
    if (!conflict) return;
    const content = resolution === "manual_merge" ? mergedContent : undefined;
    onResolve(conflict.conflictId, resolution, content);
    setSelectedIndex(null);
  };

  if (conflicts.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50">
      <div className="flex items-center justify-between border-b border-amber-200 px-4 py-2">
        <span className="text-sm font-semibold text-amber-800">
          ⚠ {conflicts.length} Conflict{conflicts.length > 1 ? "s" : ""} to Resolve
        </span>
        {conflict && (
          <button
            onClick={() => setSelectedIndex(null)}
            className="text-xs text-amber-700 hover:underline"
          >
            ← Back to list
          </button>
        )}
      </div>

      {!conflict ? (
        <div className="space-y-2 p-3">
          {conflicts.map((c, i) => (
            <button
              key={c.conflictId}
              onClick={() => handleSelect(i)}
              className="flex w-full items-center gap-2 rounded border border-amber-200 bg-white p-2 text-left text-sm transition hover:bg-amber-100"
            >
              <span className="text-amber-600">⚠</span>
              <span className="font-medium text-amber-900">{c.relativePath}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="border-b border-amber-200 px-4 py-1.5 text-xs font-medium text-amber-800">
            {conflict.relativePath}
          </div>
          <div className="grid grid-cols-3 divide-x divide-amber-200" style={{ minHeight: "300px", maxHeight: "50vh" }}>
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-amber-200 bg-blue-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-blue-700">Local (yours)</span>
                <button
                  onClick={() => setMergedContent(conflict.localContent)}
                  className="rounded px-1.5 py-0.5 text-[10px] text-blue-600 ring-1 ring-blue-300 hover:bg-blue-100"
                >
                  Use this
                </button>
              </div>
              <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-stone-700">
                {conflict.localContent}
              </pre>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-amber-200 bg-green-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-green-700">Cloud (remote)</span>
                <button
                  onClick={() => setMergedContent(conflict.cloudContent)}
                  className="rounded px-1.5 py-0.5 text-[10px] text-green-600 ring-1 ring-green-300 hover:bg-green-100"
                >
                  Use this
                </button>
              </div>
              <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-stone-700">
                {conflict.cloudContent}
              </pre>
            </div>
            <div className="flex flex-col">
              <div className="border-b border-amber-200 bg-stone-100 px-3 py-1.5">
                <span className="text-xs font-semibold text-stone-600">Result (editable)</span>
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
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Accept local
              </button>
              <button
                disabled={resolving}
                onClick={() => handleResolve("accept_cloud")}
                className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Accept cloud
              </button>
            </div>
            <button
              disabled={resolving}
              onClick={() => handleResolve("manual_merge")}
              className="rounded bg-brand px-4 py-1 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {resolving ? "Saving…" : "Save merged result"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
