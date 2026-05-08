import { StrictMode } from 'react'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './components/AuthContext'
import { PromptDialogProvider } from './components/PromptDialogContext'
import { Layout } from './components/Layout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Admin } from './pages/Admin'
import { Workspace } from './pages/Workspace'
import { DeviceOAuth } from './pages/DeviceOAuth'
import { api } from './api'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PromptDialogProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/oauth/device" element={<DeviceOAuth />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<WorkspaceRedirect />} />
              <Route path="/workspaces" element={<WorkspaceRedirect />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/workspaces/:workspaceId" element={<Workspace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PromptDialogProvider>
    </AuthProvider>
  </StrictMode>,
)

function WorkspaceRedirect() {
  const navigate = useNavigate()
  const [empty, setEmpty] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.listWorkspaces().then(res => {
      if (res.workspaces[0]) {
        navigate(`/workspaces/${res.workspaces[0].id}`, { replace: true })
      } else {
        setEmpty(true)
      }
    })
  }, [navigate])

  async function createWorkspace() {
    const name = workspaceName.trim()
    if (!name || creating) return
    setCreating(true)
    setError('')
    try {
      const workspace = await api.createWorkspace(name)
      navigate(`/workspaces/${workspace.id}`, { replace: true })
    } catch (err) {
      setError(String(err))
    } finally {
      setCreating(false)
    }
  }

  if (!empty) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center bg-[#fbfdfb]">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-zinc-950">Create a cloud workspace</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Start with a private cloud workspace for web editing, sync, publishing, and collaboration.
        </p>
        <div className="mt-6 flex gap-2">
          <input
            className="sync-input text-left"
            value={workspaceName}
            onChange={event => setWorkspaceName(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && createWorkspace()}
            placeholder="Workspace name"
            aria-label="Workspace name"
          />
          <button
            className="sidebar-action shrink-0"
            type="button"
            disabled={!workspaceName.trim() || creating}
            onClick={createWorkspace}
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
        {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}
      </div>
    </div>
  )
}

