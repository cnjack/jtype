import { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { ExclamationTriangleIcon, ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useCloudSync } from "../../hooks";
import type { SyncConflict } from "../../lib/types";

export function ConflictDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const sync = useCloudSync();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mergedContent, setMergedContent] = useState("");
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");

  const conflicts = state.activeConflicts;
  const conflict = conflicts[selectedIndex] as SyncConflict | undefined;

  const handleOpen = (index: number) => {
    setSelectedIndex(index);
    if (conflicts[index]) {
      setMergedContent(conflicts[index].localContent ?? "");
    }
  };

  const handleClose = () => {
    dispatch({ type: "SET_CONFLICT_DIALOG", open: false });
    setSelectedIndex(0);
    setMergedContent("");
  };

  const handleResolve = async (resolution: "accept_local" | "accept_cloud" | "manual_merge") => {
    if (!conflict) return;
    setResolving(true);
    setError("");
    try {
      const content = resolution === "manual_merge" ? mergedContent : undefined;
      await sync.resolveConflict(conflict.conflictId, resolution, content);
      // Move to next conflict or close
      if (conflicts.length <= 1) {
        handleClose();
      } else {
        const nextIndex = Math.min(selectedIndex, conflicts.length - 2);
        handleOpen(nextIndex);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setResolving(false);
    }
  };

  // When dialog opens and conflict changes, initialize merged content
  useEffect(() => {
    if (state.conflictDialogOpen && conflict && !mergedContent) {
      setMergedContent(conflict.localContent ?? "");
    }
  }, [state.conflictDialogOpen, conflict, mergedContent]);

  return (
    <Dialog open={state.conflictDialogOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="flex h-[85vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
              {conflict
                ? <span className="flex items-center gap-2">
                    {conflicts.length > 1 && (
                      <button
                        type="button"
                        className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                        onClick={() => handleOpen(selectedIndex)}
                        title="Back to list"
                      >
                        <ArrowLeftIcon className="h-4 w-4" />
                      </button>
                    )}
                    <span>Conflict: {conflict.relativePath}</span>
                    {conflicts.length > 1 && (
                      <span className="text-xs font-normal text-stone-400">
                        ({selectedIndex + 1} / {conflicts.length})
                      </span>
                    )}
                  </span>
                : `Sync Conflicts (${conflicts.length})`
              }
            </DialogTitle>
            <div className="flex items-center gap-2">
              {conflict && conflicts.length > 1 && (
                <>
                  <button
                    type="button"
                    disabled={selectedIndex === 0}
                    className="rounded p-1 text-stone-400 hover:bg-stone-100 disabled:opacity-30"
                    onClick={() => handleOpen(selectedIndex - 1)}
                    title="Previous conflict"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={selectedIndex >= conflicts.length - 1}
                    className="rounded p-1 text-stone-400 hover:bg-stone-100 disabled:opacity-30"
                    onClick={() => handleOpen(selectedIndex + 1)}
                    title="Next conflict"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                aria-label="Close conflicts dialog"
                title="Close"
                onClick={handleClose}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!conflict ? (
            // List view
            <div className="flex-1 overflow-y-auto p-5">
              {conflicts.length === 0 ? (
                <p className="text-sm text-stone-500">No conflicts to resolve.</p>
              ) : (
                <div className="space-y-2">
                  {conflicts.map((c, i) => (
                    <button
                      key={c.conflictId}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left transition hover:bg-amber-100"
                      onClick={() => handleOpen(i)}
                    >
                      <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" />
                      <span className="text-sm font-medium text-amber-900">{c.relativePath}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Merge view
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Three-panel diff */}
              <div className="grid min-h-0 flex-1 grid-cols-3 divide-x divide-stone-200">
                {/* Local */}
                <div className="flex flex-col">
                  <div className="border-b border-stone-200 bg-blue-50 px-3 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-700">Local (yours)</span>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-[10px] font-medium text-blue-600 ring-1 ring-blue-300 transition hover:bg-blue-100"
                        onClick={() => setMergedContent(conflict.localContent)}
                        title="Use local version as result"
                      >
                        Use this
                      </button>
                    </div>
                  </div>
                  <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-stone-700">
                    {conflict.localContent}
                  </pre>
                </div>

                {/* Cloud */}
                <div className="flex flex-col">
                  <div className="border-b border-stone-200 bg-green-50 px-3 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-green-700">Cloud (remote)</span>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-[10px] font-medium text-green-600 ring-1 ring-green-300 transition hover:bg-green-100"
                        onClick={() => setMergedContent(conflict.cloudContent)}
                        title="Use cloud version as result"
                      >
                        Use this
                      </button>
                    </div>
                  </div>
                  <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-stone-700">
                    {conflict.cloudContent}
                  </pre>
                </div>

                {/* Merged result */}
                <div className="flex flex-col">
                  <div className="border-b border-stone-200 bg-stone-100 px-3 py-1.5">
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

              {/* Action bar */}
              <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-5 py-3">
                <div className="flex items-center gap-2">
                  {error && <span className="text-xs text-red-600">{error}</span>}
                  <button
                    type="button"
                    disabled={resolving}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                    onClick={() => handleResolve("accept_local")}
                  >
                    Accept local
                  </button>
                  <button
                    type="button"
                    disabled={resolving}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
                    onClick={() => handleResolve("accept_cloud")}
                  >
                    Accept cloud
                  </button>
                </div>
                <button
                  type="button"
                  disabled={resolving}
                  className="rounded-md bg-[#008884] px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#006f6b] disabled:opacity-50"
                  onClick={() => handleResolve("manual_merge")}
                >
                  {resolving ? "Saving…" : "Save merged result"}
                </button>
              </div>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
