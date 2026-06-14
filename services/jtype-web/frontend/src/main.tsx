import { StrictMode, Suspense, lazy } from 'react'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { I18nProvider } from '@lingui/react'
import './index.css'
import { AuthProvider } from './components/AuthContext'
import { PromptDialogProvider } from '@shared/components/PromptDialogContext'
import {
  i18n,
  activateLocale,
  ensureLocaleActivated,
  getDefaultLocale,
  setLocaleMessagesLoader,
  type SupportedLocale,
} from '@shared/i18n'
import { Layout } from './components/Layout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Admin } from './pages/Admin'
import { Workspace } from './pages/Workspace'
import { Kanban } from './pages/Kanban'
import { DeviceOAuth } from './pages/DeviceOAuth'
import { InviteAccept } from './pages/InviteAccept'
import { AiConnections } from './pages/AiConnections'
import { DownloadPromo } from './components/DownloadPromo'
import { api } from './api'

import { HelpSkeleton } from './help/HelpSkeleton'

const HelpApp = lazy(() => import('./help/HelpApp'))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPlatformMessages(locale: SupportedLocale): Promise<Record<string, unknown>> {
  const platformMod: any = await import(`./i18n/locales/${locale}/messages.mjs`)
  const platformMessages =
    platformMod.messages ?? platformMod.default?.messages ?? platformMod.default ?? {}
  return platformMessages
}

function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider i18n={i18n}>
        <AuthProvider>
          <PromptDialogProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route
                  path="/help/*"
                  element={
                    <Suspense fallback={<HelpSkeleton />}>
                      <HelpApp />
                    </Suspense>
                  }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/oauth/device" element={<DeviceOAuth />} />
                <Route path="/invites/:token" element={<InviteAccept />} />
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<WorkspaceRedirect />} />
                  <Route path="/workspaces" element={<WorkspaceRedirect />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/ai" element={<AiConnections />} />
                  <Route path="/workspaces/:workspaceId" element={<Workspace />} />
                  <Route path="/workspaces/:workspaceId/kanban" element={<Kanban />} />
                </Route>
              </Routes>
              <DownloadPromo />
            </BrowserRouter>
          </PromptDialogProvider>
        </AuthProvider>
      </I18nProvider>
    </StrictMode>,
  )
}

async function bootstrap() {
  ensureLocaleActivated('en')
  setLocaleMessagesLoader(loadPlatformMessages)

  const locale = getDefaultLocale()

  try {
    await activateLocale(locale)
  } catch (error) {
    console.error('Failed to initialize web locale, falling back to English.', error)
    await activateLocale('en')
  }

  renderApp()
}

void bootstrap().catch(error => {
  console.error('Failed to bootstrap web app i18n.', error)
  renderApp()
})

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

