import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import {
  Cog6ToothIcon,
  XMarkIcon,
  BoltIcon,
  TrashIcon,
  CommandLineIcon,
  PaperAirplaneIcon,
  SignalIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { api, getStoredToken, type Webhook, type WebhookCreated } from '../api'

type Section = 'webhooks' | 'mcp'

const NAV: { id: Section; label: string; description: string; icon: typeof BoltIcon }[] = [
  { id: 'webhooks', label: 'Webhooks', description: 'Push or live (SSE) pull', icon: BoltIcon },
  { id: 'mcp', label: 'MCP access', description: 'Agent address · this board', icon: CommandLineIcon },
]

/**
 * Board-level settings, opened from the gear button in the board header. Mirrors
 * the Workspace Settings modal (left nav + scrollable main). Houses the webhook
 * config (push + SSE pull) and a board-scoped MCP address — both keyed to this
 * board's logical id.
 */
export function BoardSettingsDialog({
  workspaceId,
  board,
  boardTitle,
  onClose,
}: {
  workspaceId: string
  board: string | null
  boardTitle?: string
  onClose: () => void
}) {
  const [section, setSection] = useState<Section>('webhooks')
  return (
    <Dialog open onClose={onClose} className="relative z-40">
      <div className="fixed inset-0 bg-stone-950/35 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center px-5 py-6">
        <DialogPanel className="grid h-[min(620px,90vh)] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/70 bg-[#fbfdfb] shadow-2xl shadow-stone-900/25 md:grid-cols-[200px_minmax(0,1fr)]">
          <aside className="hidden flex-col border-r border-black/[0.04] bg-[#f4f8f6] p-4 md:flex">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
                <Cog6ToothIcon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-medium text-zinc-800">{boardTitle || 'Board'}</div>
                <div className="text-[11px] text-zinc-500">Board settings</div>
              </div>
            </div>
            <nav className="space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon
                const active = section === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition ${
                      active
                        ? 'bg-white font-medium text-brand shadow-sm shadow-emerald-950/5 ring-1 ring-brand/10'
                        : 'text-zinc-600 hover:bg-white/80 hover:text-zinc-950'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[13px]">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <span className="ml-6 block text-[11px] font-normal text-zinc-500">{item.description}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          <main className="min-h-0 overflow-y-auto p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-zinc-950">{NAV.find((n) => n.id === section)?.label}</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {section === 'webhooks'
                    ? 'Notify external services when cards on this board change.'
                    : 'Connect an AI agent to just this board.'}
                </p>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100" aria-label="Close">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            {section === 'webhooks' ? (
              <WebhooksPanel workspaceId={workspaceId} board={board} />
            ) : (
              <McpPanel workspaceId={workspaceId} board={board} />
            )}
          </main>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setDone(true)
          window.setTimeout(() => setDone(false), 1200)
        })
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/40 hover:text-brand-dark"
    >
      {done ? <CheckIcon className="h-3.5 w-3.5 text-brand" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
      {label ?? (done ? 'Copied' : 'Copy')}
    </button>
  )
}

// `kanban:card-created` fires once, on a card's first save; `kanban:card-updated`
// fires on every later edit (status/priority/assignee/due/content change) — the
// two never fire for the same save (see fire_card_webhook in document.rs). `*`
// subscribes to both plus anything the backend adds later.
const WEBHOOK_EVENTS: { value: string; label: string }[] = [
  { value: 'kanban:card-created', label: 'Card created' },
  { value: 'kanban:card-updated', label: 'Card updated' },
  { value: '*', label: 'All events (*)' },
]

function WebhooksPanel({ workspaceId, board }: { workspaceId: string; board: string | null }) {
  const [mode, setMode] = useState<'push' | 'pull'>('push')
  return (
    <>
      <div className="mb-5 inline-flex gap-1 rounded-xl bg-stone-100 p-1">
        <ModeTab active={mode === 'push'} onClick={() => setMode('push')} icon={PaperAirplaneIcon} label="Push (HTTP)" />
        <ModeTab active={mode === 'pull'} onClick={() => setMode('pull')} icon={BoltIcon} label="Pull (SSE)" />
      </div>
      {mode === 'push' ? <PushWebhooks workspaceId={workspaceId} board={board} /> : <PullStream workspaceId={workspaceId} board={board} />}
    </>
  )
}

function ModeTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof BoltIcon; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
        active ? 'bg-white font-medium text-brand-dark shadow-sm' : 'text-stone-500 hover:text-stone-700'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

function PushWebhooks({ workspaceId, board }: { workspaceId: string; board: string | null }) {
  const [hooks, setHooks] = useState<Webhook[]>([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>(['kanban:card-created', 'kanban:card-updated'])
  const [revealed, setRevealed] = useState<WebhookCreated | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.listWebhooks(workspaceId).then(setHooks).catch((e) => setError(String(e)))
  }, [workspaceId])
  useEffect(() => { load() }, [load])

  const toggleEvent = (e: string) => setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))

  const create = async () => {
    if (!board || !name.trim() || !url.trim() || events.length === 0) return
    try {
      const created = await api.createWebhook(workspaceId, {
        name: name.trim(),
        targetUrl: url.trim(),
        boardRef: board,
        eventTypes: events,
      })
      setRevealed(created); setName(''); setUrl(''); setError(''); load()
    } catch (e) { setError(String(e)) }
  }
  const remove = async (id: string) => {
    try { await api.deleteWebhook(workspaceId, id); load() } catch (e) { setError(String(e)) }
  }

  // Webhooks for this board only — this dialog is always opened from a specific
  // board, so scoping to "all boards" here would create workspace-wide hooks
  // from a per-board entry point. Every board gets its own Settings → Webhooks.
  const boardHooks = hooks.filter((h) => h.boardRef === board)

  return (
    <>
      <p className="mb-3 text-xs text-stone-500">POST a signed payload to your URL when a card on this board changes.</p>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      {revealed && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          <div className="font-medium">Signing secret — shown once, copy it now:</div>
          <code className="break-all">{revealed.secret}</code>
        </div>
      )}
      <ul className="mb-4 space-y-1.5">
        {boardHooks.map((h) => (
          <li key={h.id} className="flex items-center gap-2 rounded-lg border border-stone-100 bg-white p-2.5 text-xs">
            <span className={`h-1.5 w-1.5 flex-none rounded-full ${h.lastStatus === 'ok' ? 'bg-emerald-500' : h.lastStatus ? 'bg-red-400' : 'bg-stone-300'}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-zinc-800">{h.name}</div>
              <div className="truncate text-zinc-500">{h.targetUrl}</div>
              <div className="text-zinc-400">{h.eventTypes.join(', ')}{h.lastStatus ? ` · last: ${h.lastStatus}` : ''}</div>
            </div>
            <button onClick={() => remove(h.id)} className="rounded p-1 text-zinc-400 hover:text-red-600" title="Delete"><TrashIcon className="h-4 w-4" /></button>
          </li>
        ))}
        {boardHooks.length === 0 && <li className="rounded-lg border border-dashed border-stone-200 p-3 text-center text-xs text-zinc-400">No webhooks yet.</li>}
      </ul>
      {board ? (
        <form onSubmit={(e) => { e.preventDefault(); void create() }} className="space-y-2 rounded-xl border border-dashed border-stone-200 bg-stone-50/60 p-3">
          <div className="text-xs font-medium text-stone-600">Add webhook</div>
          <input className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm" placeholder="Name (e.g. CI notifier)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm" placeholder="https://…  (HTTPS only)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
            {WEBHOOK_EVENTS.map((ev) => (
              <label key={ev.value} className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={events.includes(ev.value)} onChange={() => toggleEvent(ev.value)} className="accent-brand" /> {ev.label}
              </label>
            ))}
          </div>
          <div className="flex items-center justify-end">
            <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark">Create</button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-stone-500">This board has no id yet — open it once so a board config is saved, then webhooks become available.</p>
      )}
      <p className="mt-3 text-[11px] text-stone-400">Payloads are HMAC-SHA256 signed; the secret is shown once on create.</p>
    </>
  )
}

function PullStream({ workspaceId, board }: { workspaceId: string; board: string | null }) {
  const [connected, setConnected] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState('')
  const esRef = useRef<EventSource | null>(null)

  const path = board ? `/api/v1/workspaces/${workspaceId}/boards/${encodeURIComponent(board)}/events` : ''
  const fullUrl = board ? `${window.location.origin}${path}` : ''

  const disconnect = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    setConnected(false)
  }, [])
  useEffect(() => () => disconnect(), [disconnect])

  const connect = () => {
    if (!board) return
    disconnect()
    setError('')
    const es = new EventSource(`${path}?token=${encodeURIComponent(getStoredToken())}`)
    es.onopen = () => setConnected(true)
    es.onmessage = (e) => setLog((prev) => [e.data, ...prev].slice(0, 30))
    es.onerror = () => { setError('Stream disconnected — the server closes idle streams; reconnect to resume.'); setConnected(false) }
    esRef.current = es
  }

  if (!board) {
    return <p className="text-xs text-stone-500">This board has no id yet — open it once so a board config is saved, then the live stream becomes available.</p>
  }

  return (
    <>
      <p className="mb-3 text-xs text-stone-500">No public URL needed — your client holds a connection open and receives card changes live over Server-Sent Events.</p>
      <div className="mb-1 text-[11px] text-stone-500">Stream endpoint</div>
      <div className="mb-3 flex gap-2">
        <input readOnly value={fullUrl} className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 font-mono text-xs text-stone-700" />
        <CopyButton value={fullUrl} />
      </div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] text-stone-500">Auth</span>
        <code className="flex-1 truncate rounded-lg bg-stone-100 px-2.5 py-1.5 text-[11px] text-stone-600">?token=&lt;your session token&gt;  (EventSource can't set headers)</code>
      </div>
      <div className="mb-3 flex items-center gap-2">
        {connected ? (
          <button onClick={disconnect} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/40 hover:text-brand-dark">
            <SignalIcon className="h-3.5 w-3.5 text-emerald-500" /> Connected — disconnect
          </button>
        ) : (
          <button onClick={connect} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark">
            <BoltIcon className="h-3.5 w-3.5" /> Connect &amp; test
          </button>
        )}
        <span className="text-[11px] text-stone-400">Streams kanban:card-created / kanban:card-updated for this board.</span>
      </div>
      {error && <p className="mb-2 text-[11px] text-amber-600">{error}</p>}
      <div className="max-h-44 overflow-auto rounded-lg border border-stone-100 bg-[#0f1715] p-2.5 font-mono text-[11px] leading-relaxed text-emerald-100">
        {log.length === 0 ? (
          <span className="text-stone-500">Waiting for events… edit a card on this board to see one arrive.</span>
        ) : (
          log.map((line, i) => <div key={i} className="truncate">{line}</div>)
        )}
      </div>
    </>
  )
}

function McpPanel({ workspaceId, board }: { workspaceId: string; board: string | null }) {
  const [token, setToken] = useState('')
  const [minting, setMinting] = useState(false)
  const [error, setError] = useState('')
  // workspace_id/board are path segments on the connection URL itself — the
  // server reads them and fills them into tool calls that omit them, and
  // tells the agent about the pin in its `initialize` response. There's no
  // "defaults" field in the MCP client config schema, so pinning has to live
  // in the URL, not in extra JSON keys a client would silently ignore.
  const endpoint = board
    ? `${window.location.origin}/mcp/kanban/${encodeURIComponent(workspaceId)}/${encodeURIComponent(board)}`
    : `${window.location.origin}/mcp/kanban`

  const generate = async () => {
    setMinting(true); setError('')
    try { setToken((await api.mintMcpToken()).token) } catch (e) { setError(String(e)) } finally { setMinting(false) }
  }

  const config = JSON.stringify(
    {
      mcpServers: {
        [`jtype-${board ?? 'board'}`]: {
          url: endpoint,
          headers: { Authorization: `Bearer ${token || '<run “Generate token” first>'}` },
        },
      },
    },
    null,
    2,
  )

  return (
    <>
      <div className="mb-1 text-[11px] text-stone-500">MCP endpoint</div>
      <div className="mb-3 flex gap-2">
        <input readOnly value={endpoint} className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 font-mono text-xs text-stone-700" />
        <CopyButton value={endpoint} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-md bg-brand-soft px-2 py-1 text-[11px] text-brand-dark">workspace {workspaceId.slice(0, 8)}…</span>
        <span className="rounded-md bg-brand-soft px-2 py-1 text-[11px] text-brand-dark">board {board ?? '—'}</span>
        <span className="rounded-md bg-stone-100 px-2 py-1 text-[11px] text-stone-500">scope: mcp · 90d</span>
      </div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-stone-500">Copy into your MCP client — workspace + board pre-pinned</span>
        <CopyButton value={config} label="Copy config" />
      </div>
      <pre className="mb-3 max-h-52 overflow-auto rounded-lg bg-[#0f1715] p-3 font-mono text-[11px] leading-relaxed text-emerald-100">{config}</pre>
      {error && <p className="mb-2 text-[11px] text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button onClick={() => void generate()} disabled={minting} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-60">
          <CommandLineIcon className="h-3.5 w-3.5" /> {minting ? 'Generating…' : 'Generate MCP token'}
        </button>
        {token && <span className="text-[11px] text-emerald-600">Token minted — copy the config above (shown once).</span>}
      </div>
      <p className="mt-3 text-[11px] text-stone-400">
        The workspace + board are pinned via path segments on the URL above, not a client-side default — tools
        (list_cards, create_card, move_card…) fall back to them whenever a call omits workspace_id/board, and the
        agent is told about the pin on connect.
      </p>
    </>
  )
}
