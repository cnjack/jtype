import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t } from "@lingui/core/macro";
import { useAppDispatch, useAppState } from "../app/AppState";
import { useFileSystem } from "../hooks";
import { usePrompt, useConfirm } from "@shared/components/PromptDialogContext";
import { parseFrontmatter, writeFrontmatter } from "@shared/lib/frontmatter";
import { BoardSurface, BoardPeek } from "@shared/components/board";
import type { BoardActions } from "@shared/components/board";
import {
  DEFAULT_DONE_COLUMN,
  pickCustomFields,
  resolveTags,
  serializeAttachments,
  serializeLinks,
  slugify,
  type BoardComment,
  type BoardViewCard,
  type BoardViewConfig,
} from "@shared/lib/board";
import { httpRequest } from "@shared/lib/http";
import { tauri } from "../lib/tauri";
import { basename, normalizePath } from "../lib/utils";
import type { BoardConfig, BoardCard, CardTemplate } from "../lib/types";
import { useRuntimeCapabilities } from "../app/RuntimeCapabilities";
import { useMobileInteraction } from "../hooks/useMobileInteraction";

function rand(): string {
  return Math.random().toString(36).slice(2, 6);
}

/**
 * Desktop adapter for the shared {@link BoardSurface}. Loads a `.board` JSON view
 * + scans its card-notes (markdown files), normalizes them, and maps the board's
 * actions onto the local filesystem (tauri).
 */
export function BoardView({ boardPath, boardRelativePath }: { boardPath: string; boardRelativePath: string }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const capabilities = useRuntimeCapabilities();
  const performHaptic = useMobileInteraction();
  const fs = useFileSystem();
  const prompt = usePrompt();
  const confirm = useConfirm();
  const rootPath = state.workspace?.rootPath ?? "";

  const [config, setConfig] = useState<BoardConfig | null>(null);
  const [rawCards, setRawCards] = useState<BoardCard[]>([]);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [error, setError] = useState("");

  const cardsDir = boardRelativePath.replace(/\.board$/i, "");
  const boardName = basename(cardsDir);

  const load = useCallback(async () => {
    if (!tauri.isAvailable) {
      setError("Board view is available in the desktop app.");
      return;
    }
    try {
      const cfg = JSON.parse(await tauri.readBoardFile(boardPath)) as BoardConfig;
      setConfig(cfg);
      setRawCards(await tauri.scanBoardCards(rootPath, cfg.id));
      setTemplates(await tauri.scanCardTemplates(rootPath, cardsDir).catch(() => []));
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }, [boardPath, rootPath, cardsDir]);

  useEffect(() => {
    void load();
  }, [load]);

  // Re-scan when the vault snapshot changes (e.g. a remote edit from the web was
  // pulled in) so the board stays live in sync with the cloud.
  useEffect(() => {
    if (!state.workspace) return;
    const id = setTimeout(() => void load(), 250);
    return () => clearTimeout(id);
  }, [state.workspace, load]);

  const rawById = useMemo(() => new Map(rawCards.map((c) => [c.path, c])), [rawCards]);

  // --- cloud comments (bound + synced vaults only) --------------------------
  // Comments live in the cloud, keyed by the card's cloud DOCUMENT id. The
  // desktop resolves a card's relativePath to that id via the documents list
  // (cached), then talks to the same REST API the web board uses.
  const cloudCtx = useMemo(() => {
    if (!state.workspace || !state.syncToken || !state.cloudProfile?.token) return null;
    if (state.vaultSettings[state.workspace.rootPath]?.cloudSyncEnabled === false) return null;
    const binding = state.vaultBindings.find((b) => b.localVaultPath === state.workspace?.rootPath);
    if (!binding) return null;
    const serviceUrl = (state.serviceUrl || state.cloudProfile?.serverUrl || "http://localhost:13345").trim().replace(/\/$/, "");
    return { serviceUrl, token: state.syncToken, workspaceId: binding.workspaceId };
  }, [state.workspace, state.syncToken, state.cloudProfile, state.vaultSettings, state.vaultBindings, state.serviceUrl]);

  const docIdCache = useRef<Map<string, string>>(new Map());

  const cloudJson = useCallback(
    async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
      if (!cloudCtx) throw new Error("cloud not connected");
      const res = await httpRequest(`${cloudCtx.serviceUrl}/api/v1/workspaces/${cloudCtx.workspaceId}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cloudCtx.token}`,
          "x-client-type": capabilities.clientType,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    },
    [capabilities.clientType, cloudCtx],
  );

  /** Resolve a card's cloud document id from its vault relativePath (cached). */
  const resolveDocId = useCallback(
    async (cardPath: string): Promise<string> => {
      const raw = rawById.get(cardPath);
      if (!raw) throw new Error("card not found");
      const rel = normalizePath(raw.relativePath);
      const cached = docIdCache.current.get(rel);
      if (cached) return cached;
      const docs = await cloudJson<{ id: string; relativePath: string }[]>("/documents");
      for (const doc of docs) docIdCache.current.set(normalizePath(doc.relativePath), doc.id);
      const id = docIdCache.current.get(rel);
      if (!id) throw new Error("card not synced to cloud yet");
      return id;
    },
    [rawById, cloudJson],
  );

  // Comment callbacks are only offered when the vault is cloud-bound; without
  // them the peek hides its Comments section (comments stay a cloud feature).
  const commentProps = useMemo(() => {
    if (!cloudCtx) return {};
    return {
      loadComments: async (cardId: string): Promise<BoardComment[]> => {
        try {
          const docId = await resolveDocId(cardId);
          return await cloudJson<BoardComment[]>(`/documents/${docId}/comments`);
        } catch {
          return [];
        }
      },
      addComment: async (cardId: string, body: string, parentId?: string): Promise<BoardComment> => {
        const docId = await resolveDocId(cardId);
        return cloudJson<BoardComment>(`/documents/${docId}/comments`, "POST", { body, parentId });
      },
      updateComment: (commentId: string, body: string): Promise<BoardComment> =>
        cloudJson<BoardComment>(`/comments/${commentId}`, "PATCH", { body }),
      deleteComment: async (commentId: string): Promise<void> => {
        await cloudJson<void>(`/comments/${commentId}`, "DELETE");
      },
      toggleReaction: (commentId: string, emoji: string): Promise<BoardComment> =>
        cloudJson<BoardComment>(`/comments/${commentId}/reactions`, "POST", { emoji }),
      resolveComment: (commentId: string, resolved: boolean): Promise<BoardComment> =>
        cloudJson<BoardComment>(`/comments/${commentId}/resolve`, "POST", { resolved }),
      currentUser: state.syncUsername || undefined,
    };
  }, [cloudCtx, cloudJson, resolveDocId, state.syncUsername]);

  const cards: BoardViewCard[] = useMemo(
    () =>
      rawCards.map((c) => ({
        id: c.path,
        columnKey: c.status,
        position: c.position,
        title: c.title,
        icon: c.icon ?? null,
        priority: c.priority ?? null,
        assignee: c.assignee ?? null,
        due: c.due ?? null,
        tags: resolveTags(c.tags ?? [], config?.labels),
        taskDone: c.taskDone,
        taskTotal: c.taskTotal,
        excerpt: c.excerpt ?? null,
        notes: c.body,
        attachments: c.attachments ?? [],
        custom: pickCustomFields(c.properties, config?.fields),
        blockedBy: c.blockedBy ?? [],
        blocks: c.blocks ?? [],
        relates: c.relates ?? [],
        parent: c.parent ?? null,
      })),
    [rawCards, config?.fields, config?.labels],
  );

  const viewConfig: BoardViewConfig = useMemo(
    () =>
      config
        ? {
            title: config.title || boardName,
            columns: config.columns,
            doneColumn: config.doneColumn,
            colorColumns: config.colorColumns,
            viewType: config.viewType,
            calendarMode: config.calendarMode,
            fields: config.fields,
            labels: config.labels,
            ticketKey: config.ticketKey,
            swimlaneBy: config.swimlaneBy as BoardViewConfig["swimlaneBy"],
            groupBy: (config.groupBy as BoardViewConfig["groupBy"]) || "status",
          }
        : { title: boardName, columns: [] },
    [config, boardName],
  );

  const saveConfig = useCallback(
    async (next: BoardConfig) => {
      setConfig(next);
      try {
        await tauri.writeBoardFile(boardPath, JSON.stringify(next, null, 2));
        await load();
      } catch (e) {
        setError(String(e));
      }
    },
    [boardPath, load],
  );

  const writeNew = useCallback(
    async (slug: string, content: string): Promise<string> => {
      let rel = `${cardsDir}/${slug}.md`;
      try {
        await tauri.createEntry(rootPath, rel, "markdown");
      } catch {
        rel = `${cardsDir}/${slug}-${rand()}.md`;
        await tauri.createEntry(rootPath, rel, "markdown");
      }
      const path = `${rootPath}/${rel}`;
      await tauri.writeFile(path, content);
      dispatch({ type: "UPDATE_WORKSPACE", workspace: await tauri.openWorkspace(rootPath) });
      return path;
    },
    [rootPath, cardsDir, dispatch],
  );

  const actions: BoardActions = useMemo(
    () => ({
      refresh: () => load(),
      setConfig: async (patch) => {
        if (!config) return;
        await saveConfig({ ...config, ...patch });
      },
      createCard: async (colKey, title) => {
        if (!config || !rootPath) return;
        const groupKey = config.groupBy || "status";
        const pos = rawCards.filter((c) => (groupKey === "status" ? c.status : groupKey === "priority" ? c.priority || "none" : c.assignee || "") === colKey).reduce((m, c) => Math.max(m, c.position), -1) + 1;
        const data: Record<string, string> = {
          title,
          board: config.id,
          status: groupKey === "status" ? colKey : config.columns[0]?.key ?? "todo",
          position: String(pos),
        };
        if (groupKey !== "status") data[groupKey] = colKey;
        const path = await writeNew(slugify(title), writeFrontmatter("", data));
        await load();
        return path;
      },
      updateCard: async (id, patch) => {
        try {
          const { data, body } = parseFrontmatter(await tauri.readFile(id));
          const next = { ...data };
          if (patch.title !== undefined) next.title = patch.title;
          if (patch.columnKey !== undefined) next.status = patch.columnKey;
          if (patch.priority !== undefined) next.priority = patch.priority ?? "";
          if (patch.assignee !== undefined) next.assignee = patch.assignee ?? "";
          if (patch.due !== undefined) next.due = patch.due ?? "";
          if (patch.icon !== undefined) next.icon = patch.icon ?? "";
          if (patch.tags !== undefined) next.tags = patch.tags.map((tg) => tg.label).join(", ");
          if (patch.attachments !== undefined) next.attachments = serializeAttachments(patch.attachments);
          if (patch.custom !== undefined) for (const [k, v] of Object.entries(patch.custom)) next[k] = v ?? "";
          if (patch.blockedBy !== undefined) next.blocked_by = serializeLinks(patch.blockedBy);
          if (patch.blocks !== undefined) next.blocks = serializeLinks(patch.blocks);
          if (patch.relates !== undefined) next.relates = serializeLinks(patch.relates);
          if (patch.parent !== undefined) next.parent = patch.parent ? serializeLinks([patch.parent]) : "";
          const newBody = patch.notes !== undefined ? patch.notes : body;
          await tauri.writeFile(id, writeFrontmatter(newBody, next));
          await load();
        } catch (e) {
          setError(String(e));
        }
      },
      moveCard: async (id, toCol, index) => {
        if (!config) return;
        const groupKey = config.groupBy || "status";
        const moved = rawById.get(id);
        if (!moved) return;
        try {
          if (groupKey !== "status") {
            const cur = groupKey === "priority" ? moved.priority || "none" : moved.assignee || "";
            if (cur === toCol) return;
            const { data, body } = parseFrontmatter(await tauri.readFile(id));
            await tauri.writeFile(id, writeFrontmatter(body, { ...data, [groupKey]: toCol }));
            await load();
            return;
          }
          const target = rawCards.filter((c) => c.status === toCol && c.path !== id).sort((a, b) => a.position - b.position);
          const at = Math.max(0, Math.min(index, target.length));
          target.splice(at, 0, moved);
          for (let i = 0; i < target.length; i++) {
            const c = target[i];
            if (c.path !== id && c.position === i && c.status === toCol) continue;
            const { data, body } = parseFrontmatter(await tauri.readFile(c.path));
            await tauri.writeFile(c.path, writeFrontmatter(body, { ...data, status: toCol, position: String(i) }));
          }
          await load();
        } catch (e) {
          setError(String(e));
        }
      },
      deleteCard: async (card) => {
        const raw = rawById.get(card.id);
        if (!raw) return;
        if (!(await confirm(t`Delete card "${card.title}"? It moves to the trash.`))) return;
        try {
          const ws = await tauri.trashEntry(rootPath, raw.relativePath);
          dispatch({ type: "UPDATE_WORKSPACE", workspace: ws });
          await load();
        } catch (e) {
          setError(String(e));
        }
      },
      deleteCards: async (cardsToDelete) => {
        if (cardsToDelete.length === 0) return;
        if (!(await confirm(t`Delete ${cardsToDelete.length} cards? They move to the trash.`))) return;
        try {
          let ws = null;
          for (const card of cardsToDelete) {
            const raw = rawById.get(card.id);
            if (!raw) continue;
            ws = await tauri.trashEntry(rootPath, raw.relativePath);
          }
          if (ws) dispatch({ type: "UPDATE_WORKSPACE", workspace: ws });
          await load();
        } catch (e) {
          setError(String(e));
        }
      },
      duplicateCard: async (card) => {
        if (!config) return;
        const raw = rawById.get(card.id);
        if (!raw) return;
        try {
          const { data, body } = parseFrontmatter(await tauri.readFile(card.id));
          const newTitle = t`${card.title} copy`;
          const pos = rawCards.filter((c) => c.status === raw.status).reduce((m, c) => Math.max(m, c.position), -1) + 1;
          await writeNew(slugify(newTitle), writeFrontmatter(body, { ...data, title: newTitle, position: String(pos) }));
          await load();
        } catch (e) {
          setError(String(e));
        }
      },
      copyCardLink: async (card) => {
        const raw = rawById.get(card.id);
        const name = (raw ? basename(raw.relativePath) : card.title).replace(/\.md$/i, "");
        try {
          await navigator.clipboard.writeText(`[[${name}]]`);
        } catch {
          /* clipboard unavailable */
        }
      },
      saveAsTemplate: async (card) => {
        const raw = rawById.get(card.id);
        if (!raw || !rootPath) return;
        const name = (await prompt(t`Template name`, card.title))?.trim();
        if (!name) return;
        try {
          const { data, body } = parseFrontmatter(await tauri.readFile(card.id));
          const next: Record<string, string> = { ...data, title: name };
          delete next.board;
          delete next.status;
          delete next.position;
          const rel = `${cardsDir}/.templates/${slugify(name)}.md`;
          try {
            await tauri.createEntry(rootPath, rel, "markdown");
          } catch {
            /* overwrite */
          }
          await tauri.writeFile(`${rootPath}/${rel}`, writeFrontmatter(body, next));
          dispatch({ type: "UPDATE_WORKSPACE", workspace: await tauri.openWorkspace(rootPath) });
          await load();
        } catch (e) {
          setError(String(e));
        }
      },
      openCardFull: (card) => {
        const raw = rawById.get(card.id);
        if (raw) fs.openMarkdownFile(raw.path, raw.relativePath);
      },
      reorderColumns: async (fromKey, toKey) => {
        if (!config || fromKey === toKey) return;
        const cols = [...config.columns];
        const from = cols.findIndex((c) => c.key === fromKey);
        const to = cols.findIndex((c) => c.key === toKey);
        if (from < 0 || to < 0) return;
        const [m] = cols.splice(from, 1);
        cols.splice(to, 0, m);
        await saveConfig({ ...config, columns: cols });
      },
      addColumn: async (name) => {
        if (!config) return;
        let key = slugify(name);
        const taken = new Set(config.columns.map((c) => c.key));
        while (taken.has(key)) key = `${key}-${rand().slice(0, 2)}`;
        await saveConfig({ ...config, columns: [...config.columns, { key, name }] });
      },
      renameColumn: async (key) => {
        if (!config) return;
        const col = config.columns.find((c) => c.key === key);
        const name = (await prompt(t`Rename column`, col?.name))?.trim();
        if (!name) return;
        await saveConfig({ ...config, columns: config.columns.map((c) => (c.key === key ? { ...c, name } : c)) });
      },
      deleteColumn: async (key) => {
        if (!config || config.columns.length <= 1) return;
        const col = config.columns.find((c) => c.key === key);
        const colName = col?.name ?? key;
        const fallback = config.columns.find((c) => c.key !== key)!;
        const inCol = rawCards.filter((c) => c.status === key);
        const msg =
          inCol.length > 0
            ? t`Delete column "${colName}"? Its ${inCol.length} card(s) move to "${fallback.name}".`
            : t`Delete column "${colName}"?`;
        if (!(await confirm(msg))) return;
        try {
          for (const c of inCol) {
            const { data, body } = parseFrontmatter(await tauri.readFile(c.path));
            await tauri.writeFile(c.path, writeFrontmatter(body, { ...data, status: fallback.key }));
          }
          await saveConfig({ ...config, columns: config.columns.filter((c) => c.key !== key) });
        } catch (e) {
          setError(String(e));
        }
      },
      setColumnColor: async (key, color) => {
        if (!config) return;
        await saveConfig({ ...config, columns: config.columns.map((c) => (c.key === key ? { ...c, color } : c)) });
      },
      setColumnLimit: async (key) => {
        if (!config) return;
        const col = config.columns.find((c) => c.key === key);
        const raw = await prompt(t`WIP limit (blank to clear)`, col?.limit != null ? String(col.limit) : "");
        if (raw === null) return;
        const n = parseInt(raw.trim(), 10);
        const limit = raw.trim() === "" || Number.isNaN(n) || n <= 0 ? null : n;
        await saveConfig({ ...config, columns: config.columns.map((c) => (c.key === key ? { ...c, limit } : c)) });
      },
      toggleDoneColumn: async (key) => {
        if (!config) return;
        const doneColumn = (config.doneColumn ?? DEFAULT_DONE_COLUMN) === key ? undefined : key;
        await saveConfig({ ...config, doneColumn });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, rawCards, rawById, rootPath, cardsDir, load, saveConfig, writeNew, prompt, confirm, dispatch],
  );

  const createFromTemplate = useCallback(
    async (colKey: string, templateId: string) => {
      if (!config || !rootPath) return;
      const tpl = templates.find((tp) => tp.path === templateId);
      if (!tpl) return;
      try {
        const groupKey = config.groupBy || "status";
        const { data, body } = parseFrontmatter(await tauri.readFile(tpl.path));
        const pos = rawCards.filter((c) => c.status === (groupKey === "status" ? colKey : config.columns[0]?.key)).reduce((m, c) => Math.max(m, c.position), -1) + 1;
        const next: Record<string, string> = {
          ...data,
          title: tpl.name,
          board: config.id,
          status: groupKey === "status" ? colKey : config.columns[0]?.key ?? "todo",
          position: String(pos),
        };
        if (groupKey !== "status") next[groupKey] = colKey;
        await writeNew(slugify(tpl.name), writeFrontmatter(body, next));
        await load();
      } catch (e) {
        setError(String(e));
      }
    },
    [config, rootPath, templates, rawCards, writeNew, load],
  );

  const loadNotes = useCallback(async (id: string) => {
    try {
      return parseFrontmatter(await tauri.readFile(id)).body;
    } catch {
      return "";
    }
  }, []);

  return (
    <BoardSurface
      config={viewConfig}
      cards={cards}
      actions={actions}
      error={error}
      templates={templates.map((tp) => ({ id: tp.path, name: tp.name }))}
      createFromTemplate={createFromTemplate}
      loadNotes={loadNotes}
      {...commentProps}
      fullscreen={state.focusMode}
      onToggleFullscreen={() => dispatch({ type: "TOGGLE_FOCUS_MODE" })}
      peekComponent={BoardPeek}
      compact={capabilities.prefersCompactLayout}
      touchOptimized={capabilities.isTouchPrimary}
      onTouchFeedback={(style) => { void performHaptic(style); }}
    />
  );
}
