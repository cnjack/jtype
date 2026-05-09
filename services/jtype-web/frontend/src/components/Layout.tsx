import { useEffect, useState, type FormEvent } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  Dialog,
  DialogPanel,
} from '@headlessui/react'
import {
  api,
  type DeviceInfo,
  type ProfileResponse,
  type StorageUsageResponse,
} from '../api'
import { useAuth } from './AuthContext'
import { AdminDialog } from '../pages/Admin'
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  ArrowLeftOnRectangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export function Layout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true })
    }
  }, [loading, navigate, user])

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f8f6]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

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

        <Menu as="div" className="relative">
          <MenuButton
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white shadow-sm shadow-brand/20 transition hover:bg-brand-dark"
            aria-label="User menu"
          >
            {userInitial}
          </MenuButton>
          <MenuItems className="absolute right-0 top-12 z-[100] w-56 overflow-hidden rounded-xl border border-black/[0.06] bg-[#fbfdfb] p-1 shadow-2xl shadow-stone-900/15 focus:outline-none">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold text-zinc-950">{user?.username}</p>
              <p className="text-xs text-zinc-500">{user?.role}</p>
            </div>
            <MenuItem>
              <button
                className="menu-row"
                type="button"
                onClick={() => setSettingsOpen(true)}
              >
                <Cog6ToothIcon className="h-4 w-4" />
                Settings
              </button>
            </MenuItem>
            {user?.role === 'admin' && (
              <MenuItem>
                <button
                  className="menu-row"
                  type="button"
                  onClick={() => setAdminOpen(true)}
                >
                  <ShieldCheckIcon className="h-4 w-4" />
                  Admin
                </button>
              </MenuItem>
            )}
            <MenuItem>
              <button className="menu-row text-red-700 hover:text-red-800" type="button" onClick={handleLogout}>
                <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                Sign out
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
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
    <Dialog open onClose={onClose} className="relative z-50" aria-label="Settings">
      <div className="fixed inset-0 bg-stone-950/35 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-5 py-6">
        <DialogPanel className="grid h-[min(720px,92vh)] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/70 bg-[#fbfdfb] shadow-2xl shadow-stone-900/25 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-r border-black/[0.04] bg-[#f7faf8] p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-stone-500">Account</p>
          <div className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand shadow-sm shadow-emerald-950/5 ring-1 ring-brand/10">Profile</div>
        </aside>
        <main className="soft-scrollbar min-h-0 overflow-y-auto p-8">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold text-zinc-950">Settings</h2>
              <p className="mt-1 text-sm text-zinc-500">Manage your JType Cloud account and connected devices.</p>
            </div>
            <button className="subtle-button aspect-square px-0" type="button" title="Close" onClick={onClose}><XMarkIcon className="h-4 w-4" /></button>
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
                        <span className="shrink-0 text-xs text-zinc-400">{formatDeviceUpdatedAt(device.updatedAt)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </DialogPanel>
    </div>
  </Dialog>
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

function formatDeviceUpdatedAt(value: string): string {
  const trimmed = value?.trim()
  if (!trimmed) return 'Last seen recently'

  const normalized = trimmed.includes('T')
    ? trimmed
    : trimmed.replace(' ', 'T')
  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) return 'Last seen recently'

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
