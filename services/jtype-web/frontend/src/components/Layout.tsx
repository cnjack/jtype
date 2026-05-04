import { useEffect, useState, type FormEvent } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import {
  api,
  type DeviceInfo,
  type ProfileResponse,
  type StorageUsageResponse,
} from '../api'
import { useAuth } from './AuthContext'
import { AdminDialog } from '../pages/Admin'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    void loadWorkspaces()
  }, [user])

  async function loadWorkspaces() {
    await api.listWorkspaces()
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const userInitial = (user?.username || 'J').charAt(0).toUpperCase()

  return (
    <div className="grid h-screen grid-rows-[64px_minmax(0,1fr)] overflow-hidden bg-[#f5f8f6] text-zinc-950">
      <header className="relative z-50 flex items-center justify-between gap-4 overflow-visible border-b border-black/[0.04] bg-white/85 px-5 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            to="/workspaces"
            className="select-none rounded-lg px-1 py-0.5 transition hover:bg-[#e8f6f2]"
            style={{ fontFamily: "'Arial Black', 'Segoe UI', Arial, sans-serif", fontSize: 18, fontWeight: 900, letterSpacing: 0 }}
          >
            <span className="text-[#8d939d]">[</span>
            <span className="text-brand">J</span>
            <span className="text-[#0d0d0c]">TYPE</span>
            <span className="text-[#8d939d]">]</span>
          </Link>
        </div>

        <div className="relative">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white shadow-sm shadow-brand/20 transition hover:bg-brand-dark"
            onClick={() => setUserMenuOpen(open => !open)}
            aria-label="User menu"
          >
            {userInitial}
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-12 z-[100] w-56 overflow-hidden rounded-xl border border-black/[0.06] bg-[#fbfdfb] p-1 shadow-2xl shadow-stone-900/15">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-zinc-950">{user?.username}</p>
                <p className="text-xs text-zinc-500">{user?.role}</p>
              </div>
              <button
                className="menu-row"
                type="button"
                onClick={() => {
                  setSettingsOpen(true)
                  setUserMenuOpen(false)
                }}
              >
                <SettingsIcon />
                Settings
              </button>
              {user?.role === 'admin' && (
                <button
                  className="menu-row"
                  type="button"
                  onClick={() => {
                    setAdminOpen(true)
                    setUserMenuOpen(false)
                  }}
                >
                  <ShieldIcon />
                  Admin
                </button>
              )}
              <button className="menu-row text-red-700 hover:text-red-800" type="button" onClick={handleLogout}>
                <LogoutIcon />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-0 min-h-0 overflow-hidden">
        <Outlet context={{ refreshWorkspaces: loadWorkspaces }} />
      </main>

      {settingsOpen && <UserSettingsDialog onClose={() => setSettingsOpen(false)} />}
      {adminOpen && <AdminDialog onClose={() => setAdminOpen(false)} />}
    </div>
  )
}

function UserSettingsDialog({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [storage, setStorage] = useState<StorageUsageResponse | null>(null)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.getProfile().then(p => {
      setProfile(p)
      setDisplayName(p.displayName || '')
      setEmail(p.email || '')
    })
    api.getStorage().then(setStorage)
    api.getDevices().then(setDevices)
  }, [])

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    await api.updateProfile({ displayName: displayName || undefined, email: email || undefined })
    setMessage('Profile updated')
    setTimeout(() => setMessage(''), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/35 px-5 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Settings" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="grid h-[min(720px,92vh)] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/70 bg-[#fbfdfb] shadow-2xl shadow-stone-900/25 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-r border-black/[0.04] bg-[#f7faf8] p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-stone-500">Account</p>
          <div className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand shadow-sm shadow-emerald-950/5 ring-1 ring-brand/10">Profile</div>
        </aside>
        <main className="min-h-0 overflow-y-auto p-8">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold text-zinc-950">Settings</h2>
              <p className="mt-1 text-sm text-zinc-500">Manage your JType Cloud account and connected devices.</p>
            </div>
            <button className="subtle-button" type="button" onClick={onClose}>Close</button>
          </div>

          {!profile ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          ) : (
            <div className="max-w-3xl space-y-8">
              {message && <p className="rounded-lg bg-[#e8f6f2] px-3 py-2 text-sm font-semibold text-brand">{message}</p>}
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <SettingsField label="Username" value={profile.username} disabled />
                <SettingsField label="Display name" value={displayName} onChange={setDisplayName} />
                <SettingsField label="Email" value={email} onChange={setEmail} type="email" />
                <button type="submit" className="sidebar-action bg-brand text-white hover:bg-brand-dark hover:text-white">Save profile</button>
              </form>

              {storage && (
                <section>
                  <h3 className="text-sm font-semibold text-zinc-950">Storage</h3>
                  <div className="mt-3 rounded-2xl bg-[#f7faf8] p-5 ring-1 ring-black/[0.04]">
                    <div className="mb-2 flex justify-between text-sm text-zinc-500">
                      <span>{formatBytes(storage.totalUsedBytes)} used</span>
                      <span>{formatBytes(storage.totalBudgetBytes)} total</span>
                    </div>
                    <div className="h-2 rounded-full bg-white">
                      <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(100, (storage.totalUsedBytes / Math.max(1, storage.totalBudgetBytes)) * 100)}%` }} />
                    </div>
                  </div>
                </section>
              )}

              {devices.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-zinc-950">Connected devices</h3>
                  <div className="mt-3 space-y-2">
                    {devices.map(device => (
                      <div key={device.deviceId} className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-3 text-sm ring-1 ring-black/[0.04]">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-zinc-950">{device.deviceId.slice(0, 8)}...</span>
                          <span className="block truncate text-xs text-zinc-500">{device.workspaceName}</span>
                        </span>
                        <span className="text-xs text-zinc-400">{new Date(device.updatedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function SettingsField({ label, value, onChange, type = 'text', disabled = false }: {
  label: string
  value: string
  onChange?: (value: string) => void
  type?: string
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        className="field-input"
      />
    </label>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}
