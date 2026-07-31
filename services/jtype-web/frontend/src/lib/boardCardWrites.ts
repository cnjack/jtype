import {
  applyBoardCardPatch,
  type BoardViewCard,
} from '@shared/lib/board'

export type WebBoardCardMeta = {
  id: string
  relativePath: string
  content: string
  contentHash: string
}

export type WebBoardCardMetaRef = {
  current: Map<string, WebBoardCardMeta>
}

type SaveCardRequest = {
  relativePath: string
  content: string
  baseContentHash: string
  baseContent: string
}

type SaveCardResponse = {
  content: string
  contentHash: string
}

type SaveCardDocument = (request: SaveCardRequest) => Promise<SaveCardResponse>

/**
 * Save one card from the latest metadata snapshot and advance the ref before
 * the next queued write can start. This keeps rapid field edits compositional
 * even when React has not committed the state update between queue tasks.
 */
export async function saveBoardCardPatch(
  metaRef: WebBoardCardMetaRef,
  relativePath: string,
  patch: Partial<BoardViewCard>,
  saveDocument: SaveCardDocument,
): Promise<Map<string, WebBoardCardMeta> | null> {
  const meta = metaRef.current.get(relativePath)
  if (!meta) return null

  const content = applyBoardCardPatch(meta.content, patch)
  const saved = await saveDocument({
    relativePath,
    content,
    baseContentHash: meta.contentHash,
    baseContent: meta.content,
  })
  const currentMeta = metaRef.current.get(relativePath)
  if (!currentMeta) return null

  const nextMeta = new Map(metaRef.current)
  nextMeta.set(relativePath, {
    ...currentMeta,
    content: saved.content,
    contentHash: saved.contentHash,
  })
  metaRef.current = nextMeta
  return nextMeta
}
