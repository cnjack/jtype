import type { JTypeDocumentListItem } from './client'

/**
 * Typed board-embed failure. Rendered as an explicit error state — never a
 * blank board.
 */
export class JTypeBoardError extends Error {
  readonly code:
    | 'board_not_found'
    | 'board_ref_ambiguous'
    | 'board_config_invalid'
    | 'props_invalid'
  /** For `board_ref_ambiguous`: the matching `.board` paths. */
  readonly candidates: string[]
  constructor(code: JTypeBoardError['code'], detail?: string, candidates: string[] = []) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'JTypeBoardError'
    this.code = code
    this.candidates = candidates
  }
}

export type BoardResolution = {
  boardDocId: string
  boardRelativePath: string
  /** Folder holding the board's card `.md` documents. */
  boardDir: string
}

/**
 * Resolve a host-supplied `boardRef` to the workspace's `.board` config doc.
 * The host only knows a name (what jcode Cloud's kanban link stores) or a
 * relative path; resolution order:
 *   1. exact relativePath match (`boardRef` itself, or `boardRef` + `.board`);
 *   2. unique basename match anywhere in the workspace
 *      (any folder containing `<boardRef>.board`).
 * Multiple basename matches → `board_ref_ambiguous` listing the candidates
 * (pass the full path to disambiguate); none → `board_not_found`.
 */
export function resolveBoardDoc(docs: JTypeDocumentListItem[], boardRef: string): BoardResolution {
  const ref = boardRef.trim().replace(/^\.?\//, '')
  if (!ref) throw new JTypeBoardError('board_not_found', 'empty boardRef')
  const refLower = ref.toLowerCase()
  const wanted = refLower.endsWith('.board') ? refLower : `${refLower}.board`

  const boards = docs.filter((d) => d.relativePath.toLowerCase().endsWith('.board'))

  const exact = boards.find((d) => {
    const p = d.relativePath.toLowerCase()
    return p === refLower || p === wanted
  })
  if (exact) return toResolution(exact)

  const byName = boards.filter((d) => {
    const p = d.relativePath.toLowerCase()
    return p.endsWith(`/${wanted}`)
  })
  if (byName.length === 1) return toResolution(byName[0]!)
  if (byName.length > 1) {
    throw new JTypeBoardError(
      'board_ref_ambiguous',
      `"${boardRef}" matches ${byName.length} boards`,
      byName.map((d) => d.relativePath),
    )
  }
  throw new JTypeBoardError('board_not_found', `no .board document matches "${boardRef}"`)
}

function toResolution(doc: JTypeDocumentListItem): BoardResolution {
  return {
    boardDocId: doc.id,
    boardRelativePath: doc.relativePath,
    boardDir: doc.relativePath.replace(/\.board$/i, ''),
  }
}
