import { useEffect, useState, type FormEvent } from 'react'
import { api, type ProfileResponse, type StorageUsageResponse, type DeviceInfo } from '../api'

export function Settings() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [storage, setStorage] = useState<StorageUsageResponse | null>(null)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [siteTitle, setSiteTitle] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.getProfile().then(p => {
      setProfile(p)
      setDisplayName(p.displayName || '')
      setEmail(p.email || '')
      setSiteTitle(p.siteTitle)
    })
    api.getStorage().then(setStorage)
    api.getDevices().then(setDevices)
  }, [])

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    await api.updateProfile({ displayName: displayName || undefined, email: email || undefined })
    setMsg('Profile updated')
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleSiteSubmit(e: FormEvent) {
    e.preventDefault()
    await api.updateSite({ siteTitle })
    setMsg('Site settings updated')
    setTimeout(() => setMsg(''), 3000)
  }

  if (!profile) return null

  return (
    <div className="max-w-2xl">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>

      {msg && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          {msg}
        </div>
      )}

      {/* Profile section */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-800 dark:text-zinc-200">Profile</h2>
        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
          <Field label="Username" value={profile.username} disabled />
          <Field label="Display Name" value={displayName} onChange={setDisplayName} />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <button type="submit" className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Save profile
          </button>
        </form>
      </section>

      {/* Site section */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-800 dark:text-zinc-200">Publishing</h2>
        <form onSubmit={handleSiteSubmit} className="flex flex-col gap-4">
          <Field label="Site Title" value={siteTitle} onChange={setSiteTitle} />
          <button type="submit" className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Save site
          </button>
        </form>
      </section>

      {/* Storage section */}
      {storage && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-zinc-800 dark:text-zinc-200">Storage</h2>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
              {formatBytes(storage.totalUsedBytes)} / {formatBytes(storage.totalBudgetBytes)} used
            </div>
            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-2 rounded-full bg-brand"
                style={{ width: `${Math.min(100, (storage.totalUsedBytes / storage.totalBudgetBytes) * 100)}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Devices section */}
      {devices.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-800 dark:text-zinc-200">Connected Devices</h2>
          <div className="space-y-2">
            {devices.map(d => (
              <div key={d.deviceId} className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-white">{d.deviceId.slice(0, 8)}...</div>
                  <div className="text-xs text-zinc-500">{d.workspaceName}</div>
                </div>
                <div className="text-xs text-zinc-400">{new Date(d.updatedAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', disabled = false }: {
  label: string; value: string; onChange?: (v: string) => void; type?: string; disabled?: boolean
}) {
  const id = `field-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        disabled={disabled}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:disabled:bg-zinc-800"
      />
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}
