import { createRoot } from "react-dom/client";
import {
  JTypeBoard,
  type JTypeBoardDataClient,
  type JTypeCloudDocument,
  type JTypeDocumentListItem,
  type JTypeSaveDocumentRequest,
} from "../../packages/board-react/dist/index.js";
import "../../packages/board-react/dist/style.css";

declare global {
  interface Window {
    __BOARD_EMBED_TEST__?: {
      saveCalls: JTypeSaveDocumentRequest[];
      openedCardTitle?: string;
    };
  }
}

type StoredDocument = JTypeCloudDocument & { id: string };

const boardConfig = {
  id: "b_jcode",
  title: "Jcode",
  columns: [
    { key: "backlog", name: "Backlog", color: "#94a3b8" },
    { key: "todo", name: "To do", color: "#f59e0b" },
    { key: "doing", name: "Doing", color: "#22c55e" },
    { key: "done", name: "Done", color: "#0ea5e9" },
  ],
  doneColumn: "done",
  groupBy: "status",
};

const cardTitles = [
  "Harden WebFetch, delegated agents, and Hooks approval boundaries",
  "Conversation history paging, full-text search, and fast recovery",
  "CLI/Desktop verifiable update path",
  "Make edit and retry context branches non-destructive",
  "Remote, SSH, and Cloud review executor transcript",
  "MCP lifecycle non-blocking refresh and tool directory reuse",
  "Finish remaining review tasks",
  "Package a scoped board UI for host applications",
];

function cardContent(title: string, index: number): string {
  const priority = index === 0 ? "urgent" : index < 5 ? "high" : "medium";
  return `---
title: ${title}
board: b_jcode
status: todo
priority: ${priority}
position: ${index}
assignee: Jack
---
# ${title}

## Goal
Keep the embedded board editable without leaking styles or breaking the host dialog.

## Acceptance criteria
- Card details use the shared focused editor.
- Long content scrolls inside the detail dialog.
`;
}

let clock = 1;
const stored = new Map<string, StoredDocument>();

function put(id: string, relativePath: string, title: string, content: string) {
  stored.set(id, {
    id,
    relativePath,
    title,
    isPublished: true,
    content,
    contentHash: `hash-${clock++}`,
    versionId: `v-${clock}`,
    updatedClock: clock,
  });
}

put("doc-board", "jcode.board", "Jcode", JSON.stringify(boardConfig, null, 2));
cardTitles.forEach((title, index) => {
  put(`doc-${index}`, `jcode/card-${index}.md`, title, cardContent(title, index));
});
put(
  "doc-done",
  "jcode/done.md",
  "Publish package integration fix",
  cardContent("Publish package integration fix", 20)
    .replace("status: todo", "status: done")
    .replace("position: 20", "position: 0"),
);
put(
  "doc-shared-a",
  "jcode/area-a/shared-dependency.md",
  "Shared dependency",
  cardContent("Shared dependency", 21),
);
put(
  "doc-shared-b",
  "jcode/area-b/shared-dependency.md",
  "Shared dependency",
  cardContent("Shared dependency", 22),
);

const saveCalls: JTypeSaveDocumentRequest[] = [];
window.__BOARD_EMBED_TEST__ = { saveCalls };

const client: JTypeBoardDataClient = {
  async listDocuments(): Promise<JTypeDocumentListItem[]> {
    return [...stored.values()].map((doc) => ({
      id: doc.id,
      relativePath: doc.relativePath,
      title: doc.title,
      isPublished: doc.isPublished,
      contentHash: doc.contentHash,
      updatedClock: doc.updatedClock,
      versionId: doc.versionId,
    }));
  },
  async getDocument(_workspaceId, docId) {
    const doc = stored.get(docId);
    if (!doc) throw new Error(`missing document: ${docId}`);
    return { ...doc };
  },
  async saveDocument(_workspaceId, request) {
    if (request.relativePath.endsWith("/failing-child.md")) {
      throw new Error("simulated child create failure");
    }
    saveCalls.push(request);
    const existing = [...stored.values()].find((doc) => doc.relativePath === request.relativePath);
    const id = existing?.id ?? `doc-${clock}`;
    put(id, request.relativePath, request.title ?? existing?.title ?? request.relativePath, request.content);
    const saved = stored.get(id)!;
    return {
      relativePath: saved.relativePath,
      contentHash: saved.contentHash,
      updatedClock: saved.updatedClock,
      mergeStatus: "accepted",
    };
  },
  async deleteDocument(_workspaceId, docId) {
    stored.delete(docId);
  },
};

const query = new URLSearchParams(window.location.search);
const readOnly = query.get("readonly") === "1";
const interceptOpen = query.get("intercept") === "1";
const showSupplement = query.get("supplement") === "1";
const initialCardPath = query.get("card") ?? undefined;

createRoot(document.getElementById("root")!).render(
  <div className="cloud-shell">
    <div className="cloud-modal" data-testid="cloud-modal">
      <header className="cloud-header">Kanban</header>
      <section className="cloud-config">
        <strong>Automation columns</strong>
        <span>Trigger: To do</span>
        <span>Complete: Done</span>
      </section>
      <main className="cloud-board-host" data-testid="cloud-board-host">
        <JTypeBoard
          client={client}
          workspaceId="ws-team"
          boardRef="jcode.board"
          live={false}
          locale="en"
          readOnly={readOnly}
          initialCardPath={initialCardPath}
          pollIntervalMs={initialCardPath ? 5_000 : undefined}
          renderCardSupplement={
            showSupplement
              ? (card) => (
                  <section data-testid="host-card-supplement">
                    Cloud executions for {card.title}
                  </section>
                )
              : undefined
          }
          onCardOpen={
            interceptOpen
              ? (card) => {
                  window.__BOARD_EMBED_TEST__!.openedCardTitle = card.title;
                }
              : undefined
          }
        />
      </main>
    </div>
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root { width: 100%; height: 100%; margin: 0; }
      body { color: #292524; font-family: ui-sans-serif, system-ui, sans-serif; }
      .cloud-shell {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        padding: 32px;
        background: #e7e5e4;
      }
      .cloud-modal {
        display: flex;
        flex-direction: column;
        width: min(94vw, 1180px);
        height: min(86dvh, 790px);
        overflow: hidden;
        border: 1px solid rgba(28, 25, 23, 0.08);
        border-radius: 18px;
        background: #fff;
        box-shadow: 0 28px 90px rgba(28, 25, 23, 0.18);
      }
      .cloud-header {
        flex: none;
        padding: 18px 20px;
        border-bottom: 1px solid #e7e5e4;
        font-size: 18px;
        font-weight: 650;
      }
      .cloud-config {
        display: flex;
        flex: none;
        align-items: center;
        gap: 20px;
        margin: 20px;
        padding: 14px 16px;
        border: 1px solid #e7e5e4;
        border-radius: 12px;
        color: #78716c;
        font-size: 13px;
      }
      .cloud-config strong { margin-right: auto; color: #44403c; }
      .cloud-board-host {
        min-height: 0;
        flex: 1;
        overflow: auto;
        margin: 0 20px 20px;
      }
    `}</style>
  </div>,
);
