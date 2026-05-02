import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type WorkspaceSummary } from '../api'

export function Dashboard() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorkspaces()
  }, [])

  async function loadWorkspaces() {
    try {
      const res = await api.listWorkspaces()
      setWorkspaces(res.workspaces)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return
    await api.createWorkspace(newName.trim())
    setNewName('')
    loadWorkspaces()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Cloud vaults</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-white">Workspaces</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Each workspace maps one vault to its documents, publishing identity, storage usage, and domain bindings.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/80 p-1 shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.04] dark:bg-zinc-900/80">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New workspace name"
            className="h-10 rounded-xl border-0 bg-transparent px-3 text-sm outline-none placeholder:text-zinc-400 dark:text-white"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Create
          </button>
        </div>
      </div>

      {workspaces.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-emerald-900/10 bg-white/70 p-12 text-center shadow-sm shadow-emerald-950/5 dark:border-zinc-700 dark:bg-zinc-900/70">
          <p className="text-zinc-500">No workspaces yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {workspaces.map(ws => (
            <article
              key={ws.id}
              className="group rounded-[28px] bg-white/85 p-6 shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/10 dark:bg-zinc-900/85"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link to={`/workspaces/${ws.id}`} className="text-lg font-semibold text-zinc-950 hover:text-brand dark:text-white">
                    {displayWorkspaceName(ws)}
                  </Link>
                  {shouldShowPublishTitle(ws) && <p className="mt-1 text-sm text-zinc-500">{ws.publishTitle}</p>}
                </div>
                <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{ws.role}</span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
                <Metric label="Documents" value={`${ws.documentCount} docs`} />
                <Metric label="Used" value={formatBytes(ws.storageUsedBytes)} />
                <Metric label="Limit" value={formatBytes(ws.storageBudgetBytes)} />
              </div>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs text-zinc-500">
                  <span>Vault space</span>
                  <span>{Math.round((ws.storageUsedBytes / Math.max(1, ws.storageBudgetBytes)) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#eef3f1]">
                  <div
                    className="h-2 rounded-full bg-brand"
                    style={{ width: `${Math.min(100, (ws.storageUsedBytes / Math.max(1, ws.storageBudgetBytes)) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link className="workspace-card-link" to={`/workspaces/${ws.id}`} state={{ section: 'documents' }}>Documents</Link>
                <Link className="workspace-card-link" to={`/workspaces/${ws.id}`} state={{ section: 'publishing' }}>Publishing</Link>
                <Link className="workspace-card-link" to={`/workspaces/${ws.id}`} state={{ section: 'domains' }}>Domains</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-1 font-semibold text-zinc-900 dark:text-white">{value}</p>
    </div>
  )
}

function displayWorkspaceName(ws: WorkspaceSummary): string {
  if (ws.name === '.jtype') return ws.publishTitle || 'JType Vault'
  return ws.name
}

function shouldShowPublishTitle(ws: WorkspaceSummary): boolean {
  return Boolean(ws.publishTitle && ws.publishTitle.toLowerCase() !== displayWorkspaceName(ws).toLowerCase())
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
    </div>
  )
}
