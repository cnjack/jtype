// Data wiring between the jtype document API and the shared board model —
// the embed's equivalent of WebBoardView's load/save logic
// (services/jtype-web/frontend/src/pages/WebBoardView.tsx), kept in pure
// functions so the mapping is unit-testable without a component tree.
import { parseFrontmatter } from '@shared/lib/frontmatter'
import {
  applyBoardCardPatch,
  bodyExcerpt,
  countTasks,
  parseAttachments,
  parseLinks,
  parseTagList,
  pickCustomFields,
  resolveTags,
  normalizeGroupBy,
  normalizeSwimlaneBy,
  type BoardViewCard,
  type BoardViewConfig,
  type BoardDocumentConfig,
} from '@shared/lib/board'
import type { JTypeBoardDataClient, JTypeCloudDocument } from './client'
import { JTypeBoardError, resolveBoardDoc } from './resolveBoard'

/** Shape of the `.board` JSON config document (mirrors WebBoardView). */
export type BoardConfigJSON = BoardDocumentConfig

export type CardMeta = { id: string; relativePath: string; content: string; contentHash: string }

export type BoardSnapshot = {
  config: BoardConfigJSON
  boardDocId: string
  boardRelativePath: string
  boardDir: string
  boardDoc: { content: string; contentHash: string }
  cards: BoardViewCard[]
  metaByPath: Map<string, CardMeta>
}

/** Adapt the `.board` JSON to the shared surface's view config. */
export function toViewConfig(config: BoardConfigJSON, boardDir: string): BoardViewConfig {
  return {
    title: config.title || boardDir,
    columns: config.columns,
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
}

/** Build a view card from a card document; null when it belongs to another board. */
export function cardFromDoc(
  doc: Pick<JTypeCloudDocument, 'relativePath' | 'title' | 'content'>,
  config: BoardConfigJSON,
): BoardViewCard | null {
  const fm = parseFrontmatter(doc.content)
  if (fm.data.board !== config.id) return null
  const tasks = countTasks(fm.body)
  return {
    id: doc.relativePath,
    relationKey: doc.relativePath,
    columnKey: fm.data.status || '',
    position: Number(fm.data.position ?? 0),
    title: fm.data.title || doc.title || doc.relativePath,
    icon: fm.data.icon || null,
    priority: fm.data.priority || null,
    assignee: fm.data.assignee || null,
    swimlaneKey: fm.data.swimlane || null,
    due: fm.data.due || null,
    tags: resolveTags(fm.data.tags ? parseTagList(fm.data.tags) : [], config.labels),
    notes: fm.body,
    taskDone: tasks.done,
    taskTotal: tasks.total,
    excerpt: bodyExcerpt(fm.body),
    attachments: fm.data.attachments ? parseAttachments(fm.data.attachments) : [],
    custom: pickCustomFields(fm.data, config.fields),
    blockedBy: fm.data.blocked_by ? parseLinks(fm.data.blocked_by) : [],
    blocks: fm.data.blocks ? parseLinks(fm.data.blocks) : [],
    relates: fm.data.relates ? parseLinks(fm.data.relates) : [],
    parent: fm.data.parent ? (parseLinks(fm.data.parent)[0] ?? null) : null,
  }
}

/**
 * Apply a surface card patch to a card document's content, returning the new
 * document content (same field mapping as WebBoardView's updateCard).
 */
export function applyCardPatch(content: string, patch: Partial<BoardViewCard>): string {
  return applyBoardCardPatch(content, patch)
}

/** View-preference keys a read-only embed may adjust locally (never persisted). */
export const LOCAL_VIEW_KEYS = ['viewType', 'groupBy', 'swimlaneBy', 'calendarMode'] as const
export type LocalViewPatch = Partial<Pick<BoardConfigJSON, (typeof LOCAL_VIEW_KEYS)[number]>>

/**
 * Accumulate a surface `setConfig` patch into the local view override a
 * read-only board keeps across polls (merged over each fresh server snapshot,
 * so switching to Table doesn't snap back on the next 30s poll). Only
 * view-preference keys are retained — a viewer must not locally rewrite
 * columns/labels — and an explicitly-undefined key still lands (that's how
 * the surface clears `swimlaneBy`).
 */
export function applyLocalViewPatch(current: LocalViewPatch, patch: Record<string, unknown>): LocalViewPatch {
  const next: Record<string, unknown> = { ...current }
  for (const k of LOCAL_VIEW_KEYS) {
    if (k in patch) next[k] = patch[k]
  }
  return next as LocalViewPatch
}

/** Per-instance fetch cache: docId → last seen contentHash + document. */
export type DocCache = Map<string, { contentHash: string; doc: JTypeCloudDocument }>

/**
 * One full board read: list documents, resolve the `.board` doc, then fetch the
 * config + every card doc under the board folder — but only re-download
 * documents whose `contentHash` changed since the previous snapshot (the list
 * endpoint carries the hash), so the 30s poll stays cheap on quiet boards.
 */
export async function loadBoardSnapshot(
  client: JTypeBoardDataClient,
  workspaceId: string,
  boardRef: string,
  cache: DocCache,
): Promise<BoardSnapshot> {
  const docs = await client.listDocuments(workspaceId)
  const resolved = resolveBoardDoc(docs, boardRef)

  const getCached = async (docId: string, listHash: string): Promise<JTypeCloudDocument> => {
    const hit = cache.get(docId)
    if (hit && hit.contentHash === listHash) return hit.doc
    const doc = await client.getDocument(workspaceId, docId)
    cache.set(docId, { contentHash: doc.contentHash, doc })
    return doc
  }

  const boardItem = docs.find((d) => d.id === resolved.boardDocId)!
  const boardDocFull = await getCached(boardItem.id, boardItem.contentHash)
  let config: BoardConfigJSON
  try {
    config = JSON.parse(boardDocFull.content) as BoardConfigJSON
    if (!config || typeof config !== 'object' || !Array.isArray(config.columns)) {
      throw new Error('missing columns')
    }
  } catch (e) {
    throw new JTypeBoardError('board_config_invalid', `${resolved.boardRelativePath}: ${String(e)}`)
  }

  const cardItems = docs.filter(
    (d) =>
      d.relativePath.startsWith(`${resolved.boardDir}/`) &&
      d.relativePath.toLowerCase().endsWith('.md'),
  )
  const loaded = await Promise.all(
    cardItems.map(async (d) => ({ item: d, doc: await getCached(d.id, d.contentHash) })),
  )

  const metaByPath = new Map<string, CardMeta>()
  const cards: BoardViewCard[] = []
  for (const { item, doc } of loaded) {
    const card = cardFromDoc(doc, config)
    if (!card) continue
    metaByPath.set(doc.relativePath, {
      id: item.id,
      relativePath: doc.relativePath,
      content: doc.content,
      contentHash: doc.contentHash,
    })
    cards.push(card)
  }

  // Drop cache entries for documents that no longer exist (unbounded growth
  // otherwise — deleted cards would pin their last content forever).
  const liveIds = new Set(docs.map((d) => d.id))
  for (const id of [...cache.keys()]) if (!liveIds.has(id)) cache.delete(id)

  return {
    config,
    boardDocId: resolved.boardDocId,
    boardRelativePath: resolved.boardRelativePath,
    boardDir: resolved.boardDir,
    boardDoc: { content: boardDocFull.content, contentHash: boardDocFull.contentHash },
    cards,
    metaByPath,
  }
}
