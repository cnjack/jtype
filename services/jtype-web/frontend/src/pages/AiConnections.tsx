import { useEffect, useState } from 'react'
import { SparklesIcon, ClipboardDocumentIcon, TrashIcon, KeyIcon } from '@heroicons/react/24/outline'
import { api, McpToken } from '../api'

/** Manage how AI agents (Claude, Cursor, jcode, …) connect to this account's
 *  notes & kanban via the built-in MCP server. */
export function AiConnections() {
  const [tokens, setTokens] = useState<McpToken[]>([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mcpUrl = `${window.location.origin}/mcp`

  async function load() {
    try {
      const r = await api.listTokens()
      setTokens(r.tokens)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function generate() {
    setError(null)
    setCreating(true)
    try {
      const r = await api.createToken({ label: label.trim() || 'MCP token', ttlDays: 90 })
      setNewToken(r.token)
      setLabel('')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setCreating(false)
    }
  }

  async function revoke(t: McpToken) {
    if (!window.confirm('Revoke this token? Any client using it will stop working.')) return
    try {
      await api.revokeToken(t.id)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    }
  }

  const copy = (text: string) => navigator.clipboard?.writeText(text)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2">
        <SparklesIcon className="h-6 w-6 text-brand" />
        <h1 className="text-2xl font-semibold text-[#0d0d0c]">AI Connections</h1>
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        Connect Claude, Cursor, Cline, or jcode to your notes &amp; kanban through the built-in MCP server.
      </p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Server URL + OAuth */}
      <section className="mt-6 rounded-xl border border-black/[0.06] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#0d0d0c]">Your MCP server</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Recommended: paste this URL into an OAuth-capable client (Claude, Cursor) — you&apos;ll approve in the browser, no token to copy.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            readOnly
            value={mcpUrl}
            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm"
          />
          <button
            onClick={() => copy(mcpUrl)}
            className="inline-flex items-center gap-1 rounded-lg border border-brand bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <ClipboardDocumentIcon className="h-4 w-4" /> Copy
          </button>
        </div>
      </section>

      {/* Token for clients that can't OAuth */}
      <section className="mt-5 rounded-xl border border-black/[0.06] bg-white p-5">
        <div className="flex items-center gap-2">
          <KeyIcon className="h-5 w-5 text-brand-dark" />
          <h2 className="text-sm font-semibold text-[#0d0d0c]">Access token</h2>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          For clients that only accept a static header (e.g. jcode). Tokens are <b>mcp</b>-scoped (notes &amp; kanban only,
          never admin) and expire in 90 days.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. jcode on my laptop)"
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <button
            onClick={generate}
            disabled={creating}
            className="rounded-lg border border-brand bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {creating ? 'Generating…' : 'Generate token'}
          </button>
        </div>

        {newToken && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800">Copy it now — it won&apos;t be shown again.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-white px-2 py-1.5 font-mono text-xs">{newToken}</code>
              <button onClick={() => copy(newToken)} className="rounded-lg border border-amber-400 px-2 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                Copy
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Existing tokens */}
      <section className="mt-5 rounded-xl border border-black/[0.06] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#0d0d0c]">Active tokens &amp; sessions</h2>
        {loading ? (
          <p className="mt-3 text-sm text-zinc-400">Loading…</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                <th className="py-2">Scope</th>
                <th className="py-2">Label</th>
                <th className="py-2">Expires</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} className="border-t border-zinc-100">
                  <td className="py-2.5">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${t.scope === 'mcp' ? 'bg-[#e8f6f2] text-brand-dark' : 'bg-zinc-100 text-zinc-600'}`}>
                      {t.scope}
                    </span>
                    {t.current && <span className="ml-2 text-xs text-zinc-400">current</span>}
                  </td>
                  <td className="py-2.5 text-zinc-700">{t.label || <span className="text-zinc-400">—</span>}</td>
                  <td className="py-2.5 text-zinc-500">{t.expiresAt ? t.expiresAt.slice(0, 10) : 'never'}</td>
                  <td className="py-2.5 text-right">
                    {!t.current && (
                      <button onClick={() => revoke(t)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700">
                        <TrashIcon className="h-3.5 w-3.5" /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
