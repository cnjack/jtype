import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t } from "@lingui/core/macro";
import { ArrowPathIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppState } from "../app/AppState";
import { useFileSystem } from "../hooks";
import { usePrompt, useConfirm } from "@shared/components/PromptDialogContext";
import { parseFrontmatter, titleFromMarkdown, writeFrontmatter } from "@shared/lib/frontmatter";
import { renderMarkdownToHtml, renderToContainer } from "@shared/lib/markdown";
import { BoardSurface, BoardPeek, guardBoardActions } from "@shared/components/board";
import type { BoardActions, BoardSurfaceProps } from "@shared/components/board";
import {
  DEFAULT_DONE_COLUMN,
  activeBoardLaneKey,
  applyBoardCardPatch,
  bodyExcerpt,
  boardLaneValueOf,
  cardPatchForLaneValue,
  countTasks,
  newCardLaneValue,
  normalizeGroupBy,
  normalizeSwimlaneBy,
  parseAttachments,
  parseBoardDocumentConfig,
  parseLinks,
  parseTagList,
  pickCustomFields,
  resolveTags,
  slugify,
  type BoardComment,
  type BoardActivityEvent,
  type BoardPersonalViewState,
  type BoardViewCard,
  type BoardViewConfig,
} from "@shared/lib/board";
import {
  boardPersonalViewDefaults,
  boardPersonalViewStorageKey,
  loadBoardPersonalViewState,
  mergeBoardPersonalViewState,
  saveBoardPersonalViewState,
} from "@shared/lib/boardViewState";
import { httpRequest } from "@shared/lib/http";
import { tauri } from "../lib/tauri";
import { basename, normalizePath } from "../lib/utils";
import type { BoardConfig, BoardCard, CardTemplate } from "../lib/types";

type BoardSnapshotState = "loading" | "ready" | "stale";

function rand(): string {
  return Math.random().toString(36).slice(2, 6);
}

function updatedBoardCard(current: BoardCard, content: string): BoardCard {
  const { data, body } = parseFrontmatter(content);
  const tasks = countTasks(body);
  const position = Number.parseInt(data.position ?? "0", 10);
  return {
    ...current,
    title: titleFromMarkdown(content, current.title),
    status: data.status ?? "",
    position: Number.isFinite(position) ? position : 0,
    priority: data.priority || null,
    assignee: data.assignee || null,
    start: data.start || null,
    due: data.due || null,
    reminder: data.reminder || null,
    archived: ["true", "1", "yes"].includes((data.archived ?? "").toLowerCase()),
    tags: data.tags ? parseTagList(data.tags) : [],
    taskDone: tasks.done,
    taskTotal: tasks.total,
    icon: data.icon || null,
    excerpt: bodyExcerpt(body),
    body,
    attachments: data.attachments ? parseAttachments(data.attachments) : [],
    properties: data,
    blockedBy: data.blocked_by ? parseLinks(data.blocked_by) : [],
    blocks: data.blocks ? parseLinks(data.blocks) : [],
    relates: data.relates ? parseLinks(data.relates) : [],
    parent: data.parent ? (parseLinks(data.parent)[0] ?? null) : null,
  };
}

/**
 * Desktop adapter for the shared {@link BoardSurface}. Loads a `.board` JSON view
 * + scans its card-notes (markdown files), normalizes them, and maps the board's
 * actions onto the local filesystem (tauri).
 */
export function BoardView({
  boardPath,
  boardRelativePath,
  readOnly = false,
}: {
  boardPath: string;
  boardRelativePath: string;
  readOnly?: boolean;
}) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const prompt = usePrompt();
  const confirm = useConfirm();
  const rootPath = state.workspace?.rootPath ?? "";

  const [config, setConfig] = useState<BoardConfig | null>(null);
  const [rawCards, setRawCards] = useState<BoardCard[]>([]);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [error, setError] = useState("");
  const [viewState, setViewState] = useState<BoardPersonalViewState>({ version: 1 });
  const [snapshotState, setSnapshotState] = useState<BoardSnapshotState>("loading");
  const configRef = useRef<BoardConfig | null>(null);
  const rawCardsRef = useRef(rawCards);
  rawCardsRef.current = rawCards;
  const loadedViewKey = useRef("");
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const snapshotTrustedRef = useRef(false);
  const loadSequenceRef = useRef(0);
  const mutationDisabled = readOnly || snapshotState !== "ready";
  const assertWritable = useCallback(() => {
    if (readOnlyRef.current) throw new Error(t`This board is read-only.`);
    if (!snapshotTrustedRef.current) {
      throw new Error(t`The latest board snapshot could not be loaded. Editing is disabled until refresh succeeds.`);
    }
  }, []);

  const cardsDir = boardRelativePath.replace(/\.board$/i, "");
  const boardName = basename(cardsDir);

  const load = useCallback(async () => {
    const sequence = ++loadSequenceRef.current;
    // A refresh is a new snapshot generation, so revoke trust before its first
    // async read. This closes over already-open prompts as well as actions that
    // are still running: their dynamic guards must not write against the old
    // snapshot while the filesystem is being re-read. Only the latest
    // generation may restore trust after both config and cards load.
    snapshotTrustedRef.current = false;
    setSnapshotState("loading");
    if (!tauri.isAvailable) {
      snapshotTrustedRef.current = false;
      setSnapshotState("stale");
      setError("Board view is available in the desktop app.");
      return;
    }
    try {
      const cfg = parseBoardDocumentConfig(await tauri.readBoardFile(boardPath), boardName) as BoardConfig;
      const [nextCards, nextTemplates] = await Promise.all([
        tauri.scanBoardCards(rootPath, cfg.id),
        tauri.scanCardTemplates(rootPath, cardsDir).catch(() => []),
      ]);
      if (sequence !== loadSequenceRef.current) return;
      configRef.current = cfg;
      setConfig(cfg);
      setRawCards(nextCards);
      setTemplates(nextTemplates);
      snapshotTrustedRef.current = true;
      setSnapshotState("ready");
      setError("");
    } catch (e) {
      if (sequence !== loadSequenceRef.current) return;
      snapshotTrustedRef.current = false;
      setSnapshotState("stale");
      setError(
        `${t`The latest board snapshot could not be loaded. Editing is disabled until refresh succeeds.`} ${String(e)}`,
      );
    }
  }, [boardPath, boardName, rootPath, cardsDir]);

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
          "x-client-type": "desktop",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    },
    [cloudCtx],
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
  const commentProps = useMemo<Partial<BoardSurfaceProps>>(() => {
    if (!cloudCtx) return {};
    return {
      loadComments: async (cardId: string): Promise<BoardComment[]> => {
        const docId = await resolveDocId(cardId);
        return cloudJson<BoardComment[]>(`/documents/${docId}/comments`);
      },
      loadActivity: async (cardId: string): Promise<BoardActivityEvent[]> => {
        const docId = await resolveDocId(cardId);
        const response = await cloudJson<{ events: BoardActivityEvent[] }>(
          `/documents/${docId}/activity?limit=100`,
        );
        return response.events;
      },
      addComment: async (cardId: string, body: string, parentId?: string): Promise<BoardComment> => {
        assertWritable();
        const docId = await resolveDocId(cardId);
        assertWritable();
        return cloudJson<BoardComment>(`/documents/${docId}/comments`, "POST", { body, parentId });
      },
      updateComment: async (commentId: string, body: string): Promise<BoardComment> => {
        assertWritable();
        return cloudJson<BoardComment>(`/comments/${commentId}`, "PATCH", { body });
      },
      deleteComment: async (commentId: string): Promise<void> => {
        assertWritable();
        await cloudJson<void>(`/comments/${commentId}`, "DELETE");
      },
      toggleReaction: async (commentId: string, emoji: string): Promise<BoardComment> => {
        assertWritable();
        return cloudJson<BoardComment>(`/comments/${commentId}/reactions`, "POST", { emoji });
      },
      resolveComment: async (commentId: string, resolved: boolean): Promise<BoardComment> => {
        assertWritable();
        return cloudJson<BoardComment>(`/comments/${commentId}/resolve`, "POST", { resolved });
      },
      currentUser: state.syncUsername || undefined,
    };
  }, [assertWritable, cloudCtx, cloudJson, resolveDocId, state.syncUsername]);

  const cards: BoardViewCard[] = useMemo(
    () =>
      rawCards.map((c) => ({
        id: c.path,
        relationKey: c.relativePath,
        columnKey: c.status,
        position: c.position,
        title: c.title,
        icon: c.icon ?? null,
        priority: c.priority ?? null,
        assignee: c.assignee ?? null,
        swimlaneKey: c.properties?.swimlane || null,
        start: c.start ?? null,
        due: c.due ?? null,
        reminder: c.reminder ?? null,
        archived: c.archived ?? false,
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
            project: config.project,
            doneColumn: config.doneColumn,
            colorColumns: config.colorColumns,
            viewType: config.viewType,
            calendarMode: config.calendarMode,
            fields: config.fields,
            labels: config.labels,
            ticketKey: config.ticketKey,
            swimlaneBy: normalizeSwimlaneBy(config.swimlaneBy),
            swimlanes: config.swimlanes,
            swimlaneMigration: config.swimlaneMigration,
            groupBy: normalizeGroupBy(config.groupBy),
          }
        : { title: boardName, columns: [] },
    [config, boardName],
  );

  const viewStorageKey = useMemo(
    () =>
      config
        ? boardPersonalViewStorageKey({
            identity: state.syncUsername,
            workspace: rootPath || "local",
            board: config.id,
          })
        : "",
    [config, rootPath, state.syncUsername],
  );

  useEffect(() => {
    if (!config || !viewStorageKey || loadedViewKey.current === viewStorageKey) return;
    loadedViewKey.current = viewStorageKey;
    setViewState(
      loadBoardPersonalViewState(
        window.localStorage,
        viewStorageKey,
        boardPersonalViewDefaults(viewConfig),
      ),
    );
  }, [config, viewConfig, viewStorageKey]);

  const updateViewState = useCallback(
    (patch: Partial<BoardPersonalViewState>) => {
      setViewState((current) => {
        const next = mergeBoardPersonalViewState(current, patch);
        if (viewStorageKey) saveBoardPersonalViewState(window.localStorage, viewStorageKey, next);
        return next;
      });
    },
    [viewStorageKey],
  );

  const actionViewConfig = useMemo<BoardViewConfig>(
    () => ({
      ...viewConfig,
      groupBy: viewState.groupBy ?? viewConfig.groupBy,
      swimlaneBy:
        viewState.swimlaneBy ?? (viewState.groupBy ? undefined : viewConfig.swimlaneBy),
    }),
    [viewConfig, viewState.groupBy, viewState.swimlaneBy],
  );

  const saveConfig = useCallback(
    async (next: BoardConfig, throwOnError = false) => {
      try {
        assertWritable();
        await tauri.writeBoardFile(boardPath, JSON.stringify(next, null, 2));
        configRef.current = next;
        setConfig(next);
        await load();
      } catch (e) {
        await load().catch(() => undefined);
        setError(String(e));
        if (throwOnError) throw e;
      }
    },
    [assertWritable, boardPath, load],
  );

  const writeNew = useCallback(
    async (slug: string, content: string): Promise<string> => {
      let rel = `${cardsDir}/${slug}.md`;
      assertWritable();
      try {
        await tauri.createEntry(rootPath, rel, "markdown");
      } catch {
        rel = `${cardsDir}/${slug}-${rand()}.md`;
        assertWritable();
        await tauri.createEntry(rootPath, rel, "markdown");
      }
      const path = `${rootPath}/${rel}`;
      assertWritable();
      await tauri.writeFile(path, content);
      dispatch({ type: "UPDATE_WORKSPACE", workspace: await tauri.openWorkspace(rootPath) });
      return path;
    },
    [assertWritable, rootPath, cardsDir, dispatch],
  );

  const actions: BoardActions = useMemo(
    () => ({
      refresh: () => load(),
      setConfig: async (patch) => {
        const latest = configRef.current;
        if (!latest) return;
        await saveConfig({ ...latest, ...patch }, true);
      },
      createCard: async (colKey, title, initial) => {
        if (!config || !rootPath) return;
        const laneKey = activeBoardLaneKey(actionViewConfig);
        const targetLane = newCardLaneValue(laneKey, colKey, initial);
        const pos =
          cards
            .filter((card) => boardLaneValueOf(card, actionViewConfig) === targetLane)
            .reduce((max, card) => Math.max(max, card.position), -1) + 1;
        const data: Record<string, string> = {
          title,
          board: config.id,
          status: laneKey === "status" ? targetLane : config.columns[0]?.key ?? "todo",
          position: String(pos),
        };
        const content = applyBoardCardPatch(
          applyBoardCardPatch(
            writeFrontmatter("", data),
            cardPatchForLaneValue(laneKey, targetLane),
          ),
          initial ?? {},
        );
        const path = await writeNew(slugify(title), content);
        await load();
        return path;
      },
      updateCard: async (id, patch) => {
        try {
          const content = applyBoardCardPatch(await tauri.readFile(id), patch);
          assertWritable();
          await tauri.writeFile(id, content);
          setRawCards((current) =>
            current.map((card) => (card.path === id ? updatedBoardCard(card, content) : card)),
          );
          setError("");
        } catch (e) {
          setError(String(e));
          throw e;
        }
      },
      updateCards: async (updates, onProgress) => {
        try {
          let completed = 0;
          for (const update of updates) {
            assertWritable();
            const content = applyBoardCardPatch(await tauri.readFile(update.cardId), update.patch);
            assertWritable();
            await tauri.writeFile(
              update.cardId,
              content,
            );
            completed += 1;
            onProgress?.(completed, updates.length);
          }
          await load();
        } catch (e) {
          await load();
          setError(String(e));
          throw e;
        }
      },
      moveCard: async (id, toCol, index) => {
        if (!config) return;
        const laneKey = activeBoardLaneKey(actionViewConfig);
        const moved = rawById.get(id);
        if (!moved) return;
        try {
          if (laneKey !== "status") {
            const movedCard = cards.find((card) => card.id === id);
            if (!movedCard || boardLaneValueOf(movedCard, actionViewConfig) === toCol) return;
            const content = applyBoardCardPatch(
              await tauri.readFile(id),
              cardPatchForLaneValue(laneKey, toCol),
            );
            assertWritable();
            await tauri.writeFile(
              id,
              content,
            );
            await load();
            return;
          }
          const target = rawCards.filter((c) => c.status === toCol && c.path !== id).sort((a, b) => a.position - b.position);
          const at = Math.max(0, Math.min(index, target.length));
          target.splice(at, 0, moved);
          for (let i = 0; i < target.length; i++) {
            assertWritable();
            const c = target[i];
            if (c.path !== id && c.position === i && c.status === toCol) continue;
            const { data, body } = parseFrontmatter(await tauri.readFile(c.path));
            assertWritable();
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
          assertWritable();
          const ws = await tauri.trashEntry(rootPath, raw.relativePath);
          dispatch({ type: "UPDATE_WORKSPACE", workspace: ws });
          await load();
        } catch (e) {
          setError(String(e));
          throw e;
        }
      },
      deleteCards: async (cardsToDelete) => {
        if (cardsToDelete.length === 0) return false;
        if (!(await confirm(t`Delete ${cardsToDelete.length} cards? They move to the trash.`))) return false;
        try {
          let ws = null;
          for (const card of cardsToDelete) {
            assertWritable();
            const raw = rawById.get(card.id);
            if (!raw) continue;
            ws = await tauri.trashEntry(rootPath, raw.relativePath);
          }
          if (ws) dispatch({ type: "UPDATE_WORKSPACE", workspace: ws });
          await load();
          return true;
        } catch (e) {
          await load();
          setError(String(e));
          throw e;
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
          delete next.swimlane;
          let rel = `${cardsDir}/.templates/${slugify(name)}.md`;
          assertWritable();
          try {
            await tauri.createEntry(rootPath, rel, "markdown");
          } catch {
            rel = `${cardsDir}/.templates/${slugify(name)}-${rand()}.md`;
            assertWritable();
            await tauri.createEntry(rootPath, rel, "markdown");
          }
          assertWritable();
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
        const latest = configRef.current;
        if (!latest || fromKey === toKey) return;
        const cols = [...latest.columns];
        const from = cols.findIndex((c) => c.key === fromKey);
        const to = cols.findIndex((c) => c.key === toKey);
        if (from < 0 || to < 0) return;
        const [m] = cols.splice(from, 1);
        cols.splice(to, 0, m);
        await saveConfig({ ...latest, columns: cols });
      },
      addColumn: async (name) => {
        const latest = configRef.current;
        if (!latest) return;
        let key = slugify(name);
        const taken = new Set(latest.columns.map((c) => c.key));
        while (taken.has(key)) key = `${key}-${rand().slice(0, 2)}`;
        await saveConfig({ ...latest, columns: [...latest.columns, { key, name }] });
      },
      renameColumn: async (key) => {
        const initial = configRef.current;
        if (!initial) return;
        const col = initial.columns.find((c) => c.key === key);
        const name = (await prompt(t`Rename column`, col?.name))?.trim();
        if (!name) return;
        const latest = configRef.current;
        if (!latest?.columns.some((column) => column.key === key)) return;
        await saveConfig({ ...latest, columns: latest.columns.map((c) => (c.key === key ? { ...c, name } : c)) });
      },
      deleteColumn: async (key) => {
        const initial = configRef.current;
        if (!initial || initial.columns.length <= 1) return;
        const col = initial.columns.find((c) => c.key === key);
        const colName = col?.name ?? key;
        const initialFallback = initial.columns.find((c) => c.key !== key)!;
        const initialCards = rawCardsRef.current.filter((c) => c.status === key);
        const msg =
          initialCards.length > 0
            ? t`Delete column "${colName}"? Its ${initialCards.length} card(s) move to "${initialFallback.name}".`
            : t`Delete column "${colName}"?`;
        if (!(await confirm(msg))) return;
        try {
          const latest = configRef.current;
          const fallback = latest?.columns.find((c) => c.key !== key);
          if (!latest?.columns.some((c) => c.key === key) || !fallback || fallback.key !== initialFallback.key) {
            throw new Error(t`Board statuses changed while the confirmation was open. Try again.`);
          }
          const inCol = rawCardsRef.current.filter((c) => c.status === key);
          for (const c of inCol) {
            assertWritable();
            const { data, body } = parseFrontmatter(await tauri.readFile(c.path));
            assertWritable();
            await tauri.writeFile(c.path, writeFrontmatter(body, { ...data, status: fallback.key }));
          }
          assertWritable();
          await saveConfig({ ...latest, columns: latest.columns.filter((c) => c.key !== key) });
        } catch (e) {
          setError(String(e));
        }
      },
      setColumnColor: async (key, color) => {
        const latest = configRef.current;
        if (!latest) return;
        await saveConfig({ ...latest, columns: latest.columns.map((c) => (c.key === key ? { ...c, color } : c)) });
      },
      setColumnLimit: async (key) => {
        const initial = configRef.current;
        if (!initial) return;
        const col = initial.columns.find((c) => c.key === key);
        const raw = await prompt(t`WIP limit (blank to clear)`, col?.limit != null ? String(col.limit) : "");
        if (raw === null) return;
        const n = parseInt(raw.trim(), 10);
        const limit = raw.trim() === "" || Number.isNaN(n) || n <= 0 ? null : n;
        const latest = configRef.current;
        if (!latest?.columns.some((column) => column.key === key)) return;
        await saveConfig({ ...latest, columns: latest.columns.map((c) => (c.key === key ? { ...c, limit } : c)) });
      },
      toggleDoneColumn: async (key) => {
        const latest = configRef.current;
        if (!latest) return;
        const doneColumn = (latest.doneColumn ?? DEFAULT_DONE_COLUMN) === key ? undefined : key;
        await saveConfig({ ...latest, doneColumn });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assertWritable, config, actionViewConfig, cards, rawCards, rawById, rootPath, cardsDir, load, saveConfig, writeNew, prompt, confirm, dispatch],
  );

  const createFromTemplate = useCallback(
    async (colKey: string, templateId: string) => {
      if (!config || !rootPath) return;
      const tpl = templates.find((tp) => tp.path === templateId);
      if (!tpl) return;
      try {
        const laneKey = activeBoardLaneKey(actionViewConfig);
        const { data, body } = parseFrontmatter(await tauri.readFile(tpl.path));
        const pos =
          cards
            .filter((card) => boardLaneValueOf(card, actionViewConfig) === colKey)
            .reduce((max, card) => Math.max(max, card.position), -1) + 1;
        const next: Record<string, string> = {
          ...data,
          title: tpl.name,
          board: config.id,
          status: laneKey === "status" ? colKey : config.columns[0]?.key ?? "todo",
          position: String(pos),
        };
        // Templates do not carry a previous board's custom-lane identity.
        // A custom active lane is assigned explicitly by the patch below.
        delete next.swimlane;
        const content = applyBoardCardPatch(
          writeFrontmatter(body, next),
          cardPatchForLaneValue(laneKey, colKey),
        );
        await writeNew(slugify(tpl.name), content);
        await load();
      } catch (e) {
        setError(String(e));
      }
    },
    [config, actionViewConfig, rootPath, templates, cards, writeNew, load],
  );

  const loadNotes = useCallback(async (id: string) => {
    try {
      return parseFrontmatter(await tauri.readFile(id)).body;
    } catch {
      return "";
    }
  }, []);

  const surfaceActions = useMemo<BoardActions>(() => {
    return guardBoardActions(
      actions,
      () => readOnlyRef.current || !snapshotTrustedRef.current,
    );
  }, [actions]);

  if (!config && snapshotState === "stale") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-stone-50 p-8 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <ExclamationTriangleIcon className="h-5 w-5" />
        </span>
        <p role="alert" className="max-w-lg break-words text-sm leading-6 text-stone-600">
          {error}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          title={t`Refresh`}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-dark px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          <ArrowPathIcon className="h-4 w-4" />
          {t`Refresh`}
        </button>
      </div>
    );
  }

  return (
    <BoardSurface
      config={viewConfig}
      cards={cards}
      actions={surfaceActions}
      viewState={viewState}
      onViewStateChange={updateViewState}
      error={error}
      templates={templates.map((tp) => ({ id: tp.path, name: tp.name }))}
      createFromTemplate={createFromTemplate}
      loadNotes={loadNotes}
      {...(mutationDisabled
        ? {
            loadComments: commentProps.loadComments,
            loadActivity: commentProps.loadActivity,
            currentUser: commentProps.currentUser,
          }
        : commentProps)}
      fullscreen={state.focusMode}
      onToggleFullscreen={() => dispatch({ type: "TOGGLE_FOCUS_MODE" })}
      renderMarkdownToContainer={renderToContainer}
      renderMarkdownToHtml={renderMarkdownToHtml}
      peekComponent={BoardPeek}
      readOnly={mutationDisabled}
    />
  );
}
