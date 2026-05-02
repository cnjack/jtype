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
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Workspaces</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New workspace name"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Create
          </button>
        </div>
      </div>

      {workspaces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500">No workspaces yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map(ws => (
            <Link
              key={ws.id}
              to={`/workspaces/${ws.id}`}
              className="rounded-xl border border-zinc-200 p-5 transition hover:border-brand/40 hover:shadow-sm dark:border-zinc-800 dark:hover:border-brand/40"
            >
              <h3 className="font-semibold text-zinc-900 dark:text-white">{ws.name}</h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                <span>{ws.documentCount} docs</span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">{ws.role}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
    </div>
  )
}
