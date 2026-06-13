import { tauri } from "./tauri";
import type { LocalKanbanStore, LocalKanbanBoard, PendingKanbanOp } from "./types";

/**
 * Desktop Kanban sync glue: replays the local pending-ops queue against the
 * cloud REST API (push), then pulls the authoritative cloud board snapshot and
 * merges it back into the on-disk store via `kanban_merge_remote_board` (pull).
 *
 * IDs are client-generated and reused on both ends (design.md §11.11), so a
 * board edited offline converges with its cloud twin by shared id. Boards/cards
 * *created* offline only converge once the cloud create endpoints honour the
 * client-supplied id (design.md §13.1) — until then their create push is
 * best-effort and the cloud snapshot is treated as source of truth on pull.
 */
export interface KanbanSyncContext {
  /** Cloud server origin, e.g. "https://cloud.example.com" (no trailing slash). */
  serverUrl: string;
  token: string;
  workspaceId: string;
}

interface CloudColumn {
  id: string; name: string; position: number; wipLimit?: number | null; color?: string | null;
}
interface CloudCard {
  id: string; columnId: string; title: string; description?: string | null; position: number;
  priority: string; dueAt?: string | null; assigneeUserId?: string | null; labelIds?: string[];
  archivedAt?: string | null; updatedClock?: number;
}
interface CloudLabel { id: string; name: string; color: string; description?: string | null; }
interface CloudBoard {
  id: string; name: string; description?: string | null; position?: number; updatedClock?: number;
  columns?: CloudColumn[]; cards?: CloudCard[]; labels?: CloudLabel[];
}

async function rest<T>(ctx: KanbanSyncContext, method: string, path: string, body?: unknown): Promise<T | null> {
  const res = await fetch(`${ctx.serverUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ctx.token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`);
  if (res.status === 204) return null;
  return (await res.json()) as T;
}

/** Translate a queued local op into the REST request that replays it. */
function opToRequest(ctx: KanbanSyncContext, op: PendingKanbanOp): { method: string; path: string; body?: unknown } | null {
  const wid = ctx.workspaceId;
  const base = `/api/v1/workspaces/${wid}/kanban`;
  const p = (op.payload ?? {}) as Record<string, unknown>;
  switch (op.type) {
    case "createBoard":
      return { method: "POST", path: `${base}/boards`, body: { id: op.boardId, name: p.name, description: p.description ?? null } };
    case "deleteBoard":
      return { method: "DELETE", path: `${base}/boards/${op.boardId}` };
    case "createCard":
      return { method: "POST", path: `${base}/boards/${op.boardId}/cards`, body: { id: op.cardId, columnId: p.columnId, title: p.title, priority: p.priority } };
    case "moveCard":
      return { method: "POST", path: `${base}/boards/${op.boardId}/cards/move`, body: { cardId: op.cardId, targetColumnId: p.targetColumnId, targetPosition: p.targetPosition } };
    case "archiveCard":
      return { method: "POST", path: `${base}/cards/${op.cardId}/archive`, body: {} };
    case "restoreCard":
      return { method: "POST", path: `${base}/cards/${op.cardId}/restore`, body: {} };
    default:
      return null;
  }
}

function cloudBoardToLocal(c: CloudBoard): LocalKanbanBoard {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    position: c.position ?? 0,
    updatedClock: c.updatedClock ?? 0,
    columns: (c.columns ?? []).map(col => ({
      id: col.id, name: col.name, position: col.position, wipLimit: col.wipLimit ?? null, color: col.color ?? null,
    })),
    cards: (c.cards ?? []).map(card => ({
      id: card.id, columnId: card.columnId, title: card.title, description: card.description ?? null,
      position: card.position, priority: card.priority, dueAt: card.dueAt ?? null,
      assigneeUserId: card.assigneeUserId ?? null, labelIds: card.labelIds ?? [],
      archivedAt: card.archivedAt ?? null, updatedClock: card.updatedClock ?? 0,
    })),
    labels: (c.labels ?? []).map(l => ({ id: l.id, name: l.name, color: l.color, description: l.description ?? null })),
  };
}

/** Push pending ops then pull+merge the cloud board. Returns the updated store. */
export async function syncKanbanBoard(
  rootPath: string,
  boardId: string,
  ctx: KanbanSyncContext,
): Promise<LocalKanbanStore> {
  // 1. Push: drain and replay local edits, best-effort.
  const ops = await tauri.kanbanTakePendingOps(rootPath);
  const failed: PendingKanbanOp[] = [];
  for (const op of ops) {
    const req = opToRequest(ctx, op);
    if (!req) continue;
    try {
      await rest(ctx, req.method, req.path, req.body);
    } catch {
      failed.push(op);
    }
  }
  if (failed.length > 0) {
    console.warn(`[kanbanSync] ${failed.length}/${ops.length} ops failed to push; cloud snapshot taken as source of truth.`);
  }

  // 2. Pull: fetch the authoritative cloud board and merge it locally (LWW).
  try {
    const cloud = await rest<CloudBoard>(ctx, "GET", `/api/v1/workspaces/${ctx.workspaceId}/kanban/boards/${boardId}`);
    if (cloud) {
      return await tauri.kanbanMergeRemoteBoard(rootPath, cloudBoardToLocal(cloud), cloud.updatedClock ?? 0);
    }
  } catch (e) {
    console.warn(`[kanbanSync] pull failed: ${e}`);
  }
  return await tauri.kanbanLoad(rootPath);
}
