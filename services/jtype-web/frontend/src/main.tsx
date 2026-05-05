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

  useEffect(() => {
    api.listWorkspaces().then(res => {
      if (res.workspaces[0]) {
        navigate(`/workspaces/${res.workspaces[0].id}`, { replace: true })
      } else {
        setEmpty(true)
      }
    })
  }, [navigate])

  if (!empty) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center bg-[#fbfdfb]">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-zinc-950">Create a cloud workspace</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Use the workspace switcher in the header to create your first cloud workspace.
        </p>
      </div>
    </div>
  )
}

