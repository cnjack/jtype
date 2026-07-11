// Instance-based client for the jtype cloud document API — the subset the board
// embed needs. Modeled on services/jtype-web/frontend/src/api.ts but with the
// two embed blockers fixed by construction:
//   - no module singleton: every instance carries its own baseUrl + token;
//   - no localStorage / window.location: everything comes from the constructor.
// A host that must keep the jtype token server-side implements
// {@link JTypeBoardDataClient} itself (proxying through its own backend) and
// passes it as the `client` prop — the component has no code path that bypasses
// the injected client.

export type JTypeDocumentListItem = {
  id: string
  relativePath: string
  title: string
  isPublished: boolean
  contentHash: string
  updatedClock: number
  versionId: string | null
}

export type JTypeCloudDocument = {
  relativePath: string
  title: string
  isPublished: boolean
  content: string
  contentHash: string
  versionId: string
  updatedClock: number
}

export type JTypeSaveDocumentRequest = {
  relativePath: string
  title?: string
  content: string
  baseContentHash?: string
  baseContent?: string
}

export type JTypeSaveDocumentResponse = {
  relativePath: string
  contentHash: string
  updatedClock: number
  mergeStatus: 'accepted' | 'merged' | 'unchanged'
}

export type LiveSubscriptionHandlers = {
  /** A board event arrived. Payload is deliberately opaque — refetch. */
  onEvent: () => void
  /** The stream is connected and delivering. */
  onUp: () => void
  /**
   * The stream failed or ended. `permanent: true` means retrying is pointless
   * for this credential (e.g. the server rejected the token's scope) and the
   * board should settle on polling.
   */
  onDown: (info: { permanent: boolean; reason: string }) => void
}

/**
 * Everything the board embed calls. `createJTypeClient` is the direct
 * (baseUrl + token) implementation; hosts can substitute their own proxy-backed
 * implementation so no jtype token ever reaches the browser.
 */
export interface JTypeBoardDataClient {
  listDocuments(workspaceId: string): Promise<JTypeDocumentListItem[]>
  getDocument(workspaceId: string, docId: string): Promise<JTypeCloudDocument>
  saveDocument(workspaceId: string, req: JTypeSaveDocumentRequest): Promise<JTypeSaveDocumentResponse>
  /** Optional: enables the card Delete action. Absent → deleting fails visibly. */
  deleteDocument?(workspaceId: string, docId: string): Promise<void>
  /**
   * Optional: subscribe to a board's live SSE feed
   * (`GET /api/v1/workspaces/:id/boards/:boardRef/events`, `boardRef` = the
   * board's logical id from its `.board` config). Since PR #45
   * (kanban-unification-v2, commit a4d2a31) the server rejects anything but a
   * full-scope session token on the live WS/SSE surfaces — an mcp-scoped token
   * gets 403. Implementations must surface that as
   * `onDown({ permanent: true })` so the board falls back to *visible* polling
   * instead of pretending to be live. Returns an unsubscribe function.
   */
  subscribeBoardEvents?(
    workspaceId: string,
    boardRef: string,
    handlers: LiveSubscriptionHandlers,
  ): () => void
}

/**
 * Typed API failure. `code` is the server's typed error string (body `error`
 * field) when present, else a generic `http_<status>` / `network_error`.
 * The message never contains the token.
 */
export class JTypeApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string) {
    super(`jtype API error${status ? ` ${status}` : ''}: ${code}`)
    this.name = 'JTypeApiError'
    this.status = status
    this.code = code
  }
}

export type CreateClientOptions = {
  /** Origin of the jtype server, e.g. `https://jtype.nightc.com`. */
  baseUrl: string
  /** A session token (typically mcp-scoped, minted via the OAuth device flow). */
  token: string
  /** Override fetch (tests, custom agents). Defaults to the global fetch. */
  fetchImpl?: typeof fetch
}

export function createJTypeClient(opts: CreateClientOptions): JTypeBoardDataClient {
  const base = (opts.baseUrl ?? '').replace(/\/+$/, '')
  const token = opts.token
  // Bind lazily so a fetch polyfill installed after client creation still works.
  const doFetch: typeof fetch = opts.fetchImpl ?? ((...args) => fetch(...args))
  if (!base) throw new JTypeApiError(0, 'base_url_required')
  if (!token) throw new JTypeApiError(0, 'token_required')

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response
    try {
      res = await doFetch(`${base}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init.headers ?? {}),
        },
      })
    } catch {
      // Never rethrow the raw error: some runtimes embed the request (and thus
      // the Authorization header) in fetch failure messages.
      throw new JTypeApiError(0, 'network_error')
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new JTypeApiError(res.status, body?.error || `http_${res.status}`)
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  return {
    listDocuments: (workspaceId) =>
      request<JTypeDocumentListItem[]>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/documents`),
    getDocument: (workspaceId, docId) =>
      request<JTypeCloudDocument>(
        `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(docId)}`,
      ),
    saveDocument: (workspaceId, req) =>
      request<JTypeSaveDocumentResponse>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/documents/save`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    deleteDocument: (workspaceId, docId) =>
      request<void>(
        `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(docId)}`,
        { method: 'DELETE' },
      ),
    subscribeBoardEvents: (workspaceId, boardRef, handlers) => {
      const ctrl = new AbortController()
      let stopped = false
      void (async () => {
        let res: Response
        try {
          // `?token=` because the SSE endpoint authenticates via query (an
          // EventSource can't set headers; the server mirrors its WS feed).
          // Trade-off documented in the README: the token can land in server
          // access logs — same exposure as jtype's own web client.
          res = await doFetch(
            `${base}/api/v1/workspaces/${encodeURIComponent(workspaceId)}/boards/${encodeURIComponent(boardRef)}/events?token=${encodeURIComponent(token)}`,
            { signal: ctrl.signal, headers: { Accept: 'text/event-stream' } },
          )
        } catch {
          if (!stopped) handlers.onDown({ permanent: false, reason: 'network_error' })
          return
        }
        if (res.status === 401 || res.status === 403) {
          // Post-#45 scope gate: live WS/SSE is full-session only; an
          // mcp-scoped token always gets 403 here. Permanent for this token.
          if (!stopped) handlers.onDown({ permanent: true, reason: 'live_forbidden_for_token' })
          return
        }
        if (!res.ok || !res.body) {
          if (!stopped) handlers.onDown({ permanent: false, reason: `http_${res.status}` })
          return
        }
        if (stopped) return
        handlers.onUp()
        try {
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buf = ''
          for (;;) {
            const { done, value } = await reader.read()
            if (done || stopped) break
            buf += decoder.decode(value, { stream: true })
            let idx: number
            while ((idx = buf.indexOf('\n\n')) >= 0) {
              const frame = buf.slice(0, idx)
              buf = buf.slice(idx + 2)
              if (!stopped && frame.split('\n').some((l) => l.startsWith('data:'))) handlers.onEvent()
            }
          }
        } catch {
          /* aborted or mid-stream error — fall through to onDown */
        }
        if (!stopped) handlers.onDown({ permanent: false, reason: 'stream_closed' })
      })()
      return () => {
        stopped = true
        ctrl.abort()
      }
    },
  }
}
