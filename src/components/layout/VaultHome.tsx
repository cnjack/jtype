import { useMemo } from "react";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { markdownNodes } from "../../lib/utils";
import { appStorage } from "../../lib/storage";
import { basename } from "../../lib/utils";

export function VaultHome() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const documents = useMemo(() => markdownNodes(state.workspace?.entries ?? []), [state.workspace]);
  const recentItems = useMemo(() => readRecentItems(), [state.currentPath]);
  const recentDocs = recentItems.filter((item) => item.kind === "file").slice(0, 4);

  return (
    <section id="vault-home" className="flex min-h-0 flex-col bg-[#fbfaf7]">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-8 py-10">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase text-teal-700">Vault ready</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-stone-950">Choose a note or create a new one.</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              This vault lives at <span className="font-mono text-stone-800">{state.workspace?.rootPath}</span>. Local notes stay on disk until you connect a cloud workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="toolbar-button toolbar-button-primary" type="button" onClick={() => dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: true })}>
                New note
              </button>
              <button className="toolbar-button" type="button" onClick={() => dispatch({ type: "SET_QUICK_SWITCHER", open: true })}>
                Quick open
              </button>
              <button className="toolbar-button" type="button" onClick={() => dispatch({ type: "SET_ACCOUNT_DIALOG", open: true })}>
                {state.syncToken ? "Cloud sync" : "Connect cloud"}
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-950">Documents</p>
                <span className="text-xs text-stone-500">{documents.length} Markdown file{documents.length === 1 ? "" : "s"}</span>
              </div>
              <div className="space-y-1">
                {documents.length === 0 ? (
                  <div className="rounded-md border border-dashed border-stone-300 p-4">
                    <p className="text-sm font-semibold text-stone-800">No notes yet.</p>
                    <p className="mt-1 text-sm text-stone-500">Create your first Markdown note or drop files into this vault.</p>
                  </div>
                ) : (
                  documents.slice(0, 12).map((node) => (
                    <button key={node.path} type="button" className="command-row" onClick={() => fs.openMarkdownFile(node.path, node.relativePath)}>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{basename(node.name).replace(/\.(md|markdown|mdown|mkd)$/i, "")}</span>
                        <span className="block truncate text-xs text-stone-500">{node.relativePath}</span>
                      </span>
                      <span className="shrink-0 text-xs text-stone-500">Markdown</span>
                    </button>
                  ))
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-sm font-semibold text-stone-950">Recent</p>
                <div className="mt-3 space-y-1">
                  {recentDocs.length === 0 ? (
                    <p className="text-sm text-stone-500">Open a note and it will appear here.</p>
                  ) : (
                    recentDocs.map((item) => (
                      <button key={item.path} type="button" className="tree-button text-sm" onClick={() => fs.openMarkdownFile(item.path)}>
                        <span className="text-stone-500">Markdown file</span>
                        <span className="truncate font-semibold">{item.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-sm font-semibold text-stone-950">Cloud</p>
                <p className="mt-1 text-sm text-stone-500">
                  {state.syncToken ? `Connected as ${state.syncUsername || "your account"}.` : "Connect when you want sync, collaboration, and publishing."}
                </p>
                <button className="toolbar-button mt-3 w-full" type="button" onClick={() => dispatch({ type: "SET_ACCOUNT_DIALOG", open: true })}>
                  {state.syncToken ? "Manage cloud" : "Connect cloud"}
                </button>
              </section>
            </aside>
          </div>
        </div>
      </div>
      <div id="operation-log" className="border-t border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-500">
        {state.statusMessage}
      </div>
    </section>
  );
}

type RecentItem = { kind: "file" | "workspace"; name: string; path: string };

function readRecentItems(): RecentItem[] {
  return appStorage.get("recent", []);
}
