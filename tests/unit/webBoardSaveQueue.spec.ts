import { expect, test } from '@playwright/test'
import { parseFrontmatter, writeFrontmatter } from '../../shared/lib/frontmatter'
import {
  saveBoardCardPatch,
  type WebBoardCardMeta,
} from '../../services/jtype-web/frontend/src/lib/boardCardWrites'

test('queued web card writes advance their base content and hash before React rerenders', async () => {
  const relativePath = 'roadmap/queued-edits.md'
  const initialContent = writeFrontmatter('Body', {
    title: 'Queued edits',
    board: 'roadmap',
    status: 'todo',
    priority: 'none',
  })
  const metaRef = {
    current: new Map<string, WebBoardCardMeta>([
      [
        relativePath,
        {
          id: 'doc-queued-edits',
          relativePath,
          content: initialContent,
          contentHash: 'hash-0',
        },
      ],
    ]),
  }
  const requests: Array<{
    content: string
    baseContent: string
    baseContentHash: string
  }> = []
  let version = 0
  const saveDocument = async (request: {
    relativePath: string
    content: string
    baseContent: string
    baseContentHash: string
  }) => {
    requests.push(request)
    version += 1
    return { content: request.content, contentHash: `hash-${version}` }
  }

  await saveBoardCardPatch(metaRef, relativePath, { columnKey: 'doing' }, saveDocument)
  await saveBoardCardPatch(metaRef, relativePath, { priority: 'high' }, saveDocument)

  expect(requests).toHaveLength(2)
  expect(requests[1]?.baseContentHash).toBe('hash-1')
  expect(requests[1]?.baseContent).toBe(requests[0]?.content)
  expect(parseFrontmatter(requests[1]!.content).data).toMatchObject({
    status: 'doing',
    priority: 'high',
  })
})
