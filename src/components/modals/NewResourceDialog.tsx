import { useEffect, useState } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ViewColumnsIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  FolderIcon,
  ShareIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";

type Step = "choose" | "name";
type NamedKind = "markdown" | "board" | "mermaid" | "excalidraw";

type ResourceChoice = {
  id: "markdown" | "import" | "kanban" | "mermaid" | "excalidraw";
  label: string;
  description: string;
  Icon: typeof DocumentTextIcon;
};

const MERMAID_STARTER = "flowchart TD\n  A[Start] --> B[End]\n";
const EXCALIDRAW_STARTER = JSON.stringify(
  { type: "excalidraw", version: 2, source: "jtype", elements: [], appState: {}, files: {} },
  null,
  2,
);

/** File extension created for each named resource kind. */
const KIND_EXTENSION: Record<NamedKind, string> = {
  markdown: ".md",
  board: ".board",
  mermaid: ".mmd",
  excalidraw: ".excalidraw",
};

/**
 * "New resource" picker. Replaces the old single-purpose note dialog: the user
 * first chooses what kind of resource to create (a Markdown document, an
 * imported binary asset, or a Kanban board), then completes the type-specific
 * flow. See internal-docs/resources/prd.md §5.3.
 */
export function NewResourceDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const [step, setStep] = useState<Step>("choose");
  const [name, setName] = useState("");
  const [nameFor, setNameFor] = useState<NamedKind>("markdown");

  const open = state.createNoteDialogOpen;

  // Reset to the first step whenever the dialog re-opens.
  useEffect(() => {
    if (open) {
      // When invoked from "save draft as…", skip the kind picker — a draft is
      // always markdown — and go straight to naming.
      if (state.createNoteFromDraft) {
        setStep("name");
        setNameFor("markdown");
      } else {
        setStep("choose");
      }
      setName("");
    }
  }, [open, state.createNoteFromDraft]);

  const close = () => dispatch({ type: "SET_CREATE_NOTE_DIALOG", open: false });

  const choices: ResourceChoice[] = [
    {
      id: "markdown",
      label: t`Markdown document`,
      description: t`A text document you write and preview`,
      Icon: DocumentTextIcon,
    },
    {
      id: "import",
      label: t`Import file`,
      description: t`Bring in an image or PDF from your computer`,
      Icon: ArrowUpTrayIcon,
    },
    {
      id: "kanban",
      label: t`Kanban board`,
      description: t`Track work in columns and cards`,
      Icon: ViewColumnsIcon,
    },
    {
      id: "mermaid",
      label: t`Mermaid diagram`,
      description: t`A text-based diagram with a live preview`,
      Icon: ShareIcon,
    },
    {
      id: "excalidraw",
      label: t`Excalidraw drawing`,
      description: t`A hand-drawn style whiteboard canvas`,
      Icon: PencilSquareIcon,
    },
  ];

  const pick = (id: ResourceChoice["id"]) => {
    if (id === "import") {
      close();
      void fs.importAsset();
      return;
    }
    setNameFor(id === "kanban" ? "board" : id);
    setStep("name");
  };

  // Create new resources in the folder of the currently-open file (where the
  // user is), falling back to the vault root.
  const activeDir = (() => {
    const rel = state.currentRelativePath;
    if (!rel) return "";
    const slash = rel.lastIndexOf("/");
    return slash > 0 ? rel.slice(0, slash) : "";
  })();

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    close();
    const ext = KIND_EXTENSION[nameFor];
    const withExt = trimmed.endsWith(ext) ? trimmed : `${trimmed}${ext}`;
    if (nameFor === "board") {
      void fs.createBoard(trimmed, activeDir);
    } else if (nameFor === "mermaid") {
      void fs.createDiagram(withExt, MERMAID_STARTER, activeDir);
    } else if (nameFor === "excalidraw") {
      void fs.createDiagram(withExt, EXCALIDRAW_STARTER, activeDir);
    } else if (state.createNoteFromDraft) {
      // Promote the in-memory draft into the vault instead of creating an
      // empty file and discarding what the user already typed.
      void fs.commitDraftToWorkspace(withExt, activeDir);
    } else {
      void fs.createDocument(withExt, activeDir);
    }
    setName("");
  };

  const NameIcon = { markdown: DocumentTextIcon, board: ViewColumnsIcon, mermaid: ShareIcon, excalidraw: PencilSquareIcon }[nameFor];
  const nameTitle =
    state.createNoteFromDraft ? <Trans>Save draft as…</Trans>
    : nameFor === "board" ? <Trans>New board</Trans>
    : nameFor === "mermaid" ? <Trans>New Mermaid diagram</Trans>
    : nameFor === "excalidraw" ? <Trans>New Excalidraw drawing</Trans>
    : <Trans>New document</Trans>;
  const nameSubtitle =
    state.createNoteFromDraft ? <Trans>Save your untitled document into the vault</Trans>
    : nameFor === "board" ? <Trans>A kanban board over your notes</Trans>
    : nameFor === "mermaid" ? <Trans>A text-based diagram with a live preview</Trans>
    : nameFor === "excalidraw" ? <Trans>A hand-drawn style whiteboard canvas</Trans>
    : <Trans>A Markdown document you write and preview</Trans>;
  const namePlaceholder =
    nameFor === "board" ? t`Board name`
    : nameFor === "mermaid" ? t`Diagram name`
    : nameFor === "excalidraw" ? t`Drawing name`
    : t`Document name`;

  return (
    <Dialog open={open} onClose={close} className="relative z-50">
      <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          {step === "choose" ? (
            <>
              <DialogTitle className="text-base font-semibold text-stone-900">
                <Trans>New resource</Trans>
              </DialogTitle>
              <p className="mt-1 text-sm text-brand-gray">
                <Trans>Choose what you want to create.</Trans>
              </p>
              <div className="mt-4 space-y-2">
                {choices.map(({ id, label, description, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className="group flex w-full items-center gap-3 rounded-lg border border-stone-200 px-3 py-2.5 text-left transition-colors hover:border-brand/50 hover:bg-brand-soft/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    onClick={() => pick(id)}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-stone-900">{label}</span>
                      <span className="block truncate text-xs text-brand-gray">{description}</span>
                    </span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-300 transition-colors group-hover:text-brand-dark" />
                  </button>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
                  onClick={close}
                >
                  <Trans>Cancel</Trans>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                  <NameIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-semibold text-stone-900">
                    {nameTitle}
                  </DialogTitle>
                  <p className="truncate text-xs text-brand-gray">{nameSubtitle}</p>
                </div>
              </div>

              <div className="relative mt-4">
                <input
                  className="w-full rounded-lg border border-stone-300 px-3 py-2.5 pr-16 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  placeholder={namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitName();
                  }}
                  autoFocus
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-400">
                  {KIND_EXTENSION[nameFor]}
                </span>
              </div>

              <p className="mt-2 flex items-center gap-1 text-xs text-brand-gray">
                <FolderIcon className="h-3.5 w-3.5 shrink-0" />
                <Trans>Creates in</Trans>
                <span className="truncate font-medium text-stone-600">{activeDir || t`vault root`}</span>
              </p>

              <div className="mt-5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
                  onClick={() => setStep("choose")}
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  <Trans>Back</Trans>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
                    onClick={close}
                  >
                    <Trans>Cancel</Trans>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none"
                    onClick={commitName}
                    disabled={!name.trim()}
                  >
                    <Trans>Create</Trans>
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
