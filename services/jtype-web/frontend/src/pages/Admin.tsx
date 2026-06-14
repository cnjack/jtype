import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogPanel } from '@headlessui/react'
import {
  api,
  type AdminUser,
  type AdminWorkspace,
  type AdminDomain,
  type AdminStats,
  type StorageSettings as StorageSettingsData,
} from '../api'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'

type AdminTab = 'users' | 'workspaces' | 'domains' | 'storage'

export function Admin() {
  const navigate = useNavigate()

  return <AdminDialog onClose={() => navigate('/workspaces')} />
}

export function AdminDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<AdminTab>('users')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([])
  const [domains, setDomains] = useState<AdminDomain[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.adminStats().then(setStats)
  }, [])

  useEffect(() => {
    // The storage tab manages its own loading; the table tabs load here.
    if (tab === 'storage') return
    setLoading(true)
    const load =
      tab === 'users'
        ? api.adminUsers().then(setUsers)
        : tab === 'workspaces'
          ? api.adminWorkspaces().then(setWorkspaces)
          : api.adminDomains().then(setDomains)

    load.finally(() => setLoading(false))
  }, [tab])

  async function toggleUser(user: AdminUser) {
    await api.adminUpdateUser(user.id, { enabled: !user.enabled })
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, enabled: !u.enabled } : u))
  }

  return (
      <Dialog open onClose={onClose} className="relative z-50" aria-label={t`Admin`}>
      <div className="fixed inset-0 bg-stone-950/35 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-5 py-6">
        <DialogPanel className="grid h-[min(720px,92vh)] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/70 bg-[#fbfdfb] shadow-2xl shadow-stone-900/25 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-r border-black/[0.04] bg-[#f7faf8] p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-stone-500"><Trans>Admin</Trans></p>
          <AdminNavButton active={tab === 'users'} onClick={() => setTab('users')} label={t`Users`} />
          <AdminNavButton active={tab === 'workspaces'} onClick={() => setTab('workspaces')} label={t`Cloud workspaces`} />
          <AdminNavButton active={tab === 'domains'} onClick={() => setTab('domains')} label={t`Domains`} />
          <AdminNavButton active={tab === 'storage'} onClick={() => setTab('storage')} label={t`Storage`} />
        </aside>

        <main className="min-h-0 overflow-y-auto p-8">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold text-zinc-950"><Trans>Admin</Trans></h2>
              <p className="mt-1 text-sm text-zinc-500">
                {tab === 'storage'
                  ? <Trans>Configure server object storage. Saved values override the JTYPED_STORAGE_* environment variables and apply immediately.</Trans>
                  : <Trans>Manage users, cloud workspaces, domains, and service activity.</Trans>}
              </p>
            </div>
            <button className="subtle-button" type="button" onClick={onClose}><Trans>Close</Trans></button>
          </div>

          <div className="max-w-4xl space-y-6">
            {tab === 'storage' ? (
              <StorageSettingsPanel />
            ) : (
              <>
                {stats && (
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label={t`Users`} value={stats.totalUsers} />
                    <StatCard label={t`Cloud workspaces`} value={stats.totalWorkspaces} />
                    <StatCard label={t`Documents`} value={stats.totalDocuments} />
                    <StatCard label={t`Domains`} value={stats.totalDomains} />
                  </section>
                )}

                <section>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-950">{adminTabTitle(tab)}</h3>
                      <p className="mt-1 text-xs text-zinc-500">{adminTabDescription(tab)}</p>
                    </div>
                    {loading && <span className="text-xs font-semibold text-stone-400"><Trans>Loading...</Trans></span>}
                  </div>

                  {tab === 'users' && <UsersTable users={users} onToggleUser={toggleUser} />}
                  {tab === 'workspaces' && <WorkspacesTable workspaces={workspaces} />}
                  {tab === 'domains' && <DomainsTable domains={domains} />}
                </section>
              </>
            )}
          </div>
        </main>
      </DialogPanel>
    </div>
  </Dialog>
  )
}

function AdminNavButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
        active
          ? 'bg-white text-brand shadow-sm shadow-emerald-950/5 ring-1 ring-brand/10'
          : 'text-stone-600 hover:bg-white/70 hover:text-stone-950'
      }`}
    >
      {label}
    </button>
  )
}

function UsersTable({ users, onToggleUser }: { users: AdminUser[]; onToggleUser: (user: AdminUser) => void }) {
  return (
    <AdminTable
      headers={[t`Username`, t`Role`, t`Cloud workspaces`, t`Status`, t`Actions`]}
      empty={users.length === 0}
    >
      {users.map(user => (
        <tr key={user.id} className="border-t border-black/[0.05]">
          <td className="px-4 py-3 font-semibold text-zinc-950">{user.username}</td>
          <td className="px-4 py-3">
            <span className={`status-chip ${user.role === 'admin' ? 'status-chip-warning' : 'status-chip-neutral'}`}>
              {user.role}
            </span>
          </td>
          <td className="px-4 py-3 text-stone-600">{user.workspaceCount}</td>
          <td className="px-4 py-3">
            <span className={`text-xs font-semibold ${user.enabled ? 'text-brand' : 'text-red-600'}`}>
              {user.enabled ? t`Active` : t`Disabled`}
            </span>
          </td>
          <td className="px-4 py-3">
            <button className="text-xs font-semibold text-brand hover:text-brand-dark" type="button" onClick={() => onToggleUser(user)}>
              {user.enabled ? t`Disable` : t`Enable`}
            </button>
          </td>
        </tr>
      ))}
    </AdminTable>
  )
}

function WorkspacesTable({ workspaces }: { workspaces: AdminWorkspace[] }) {
  return (
    <AdminTable
      headers={[t`Name`, t`Owner`, t`Members`, t`Documents`]}
      empty={workspaces.length === 0}
    >
      {workspaces.map(workspace => (
        <tr key={workspace.id} className="border-t border-black/[0.05]">
          <td className="px-4 py-3 font-semibold text-zinc-950">{workspace.name}</td>
          <td className="px-4 py-3 text-stone-600">{workspace.ownerUsername || '-'}</td>
          <td className="px-4 py-3 text-stone-600">{workspace.memberCount}</td>
          <td className="px-4 py-3 text-stone-600">{workspace.documentCount}</td>
        </tr>
      ))}
    </AdminTable>
  )
}

function DomainsTable({ domains }: { domains: AdminDomain[] }) {
  return (
    <AdminTable
      headers={[t`Domain`, t`User`, t`Status`, t`SSL`]}
      empty={domains.length === 0}
    >
      {domains.map(domain => (
        <tr key={domain.id} className="border-t border-black/[0.05]">
          <td className="px-4 py-3 font-semibold text-zinc-950">{domain.domain}</td>
          <td className="px-4 py-3 text-stone-600">{domain.username}</td>
          <td className="px-4 py-3">
            <span className={`text-xs font-semibold ${domain.status === 'verified' ? 'text-brand' : 'text-amber-600'}`}>
              {domain.status}
            </span>
          </td>
          <td className="px-4 py-3 text-xs font-semibold text-stone-500">{domain.sslStatus || '-'}</td>
        </tr>
      ))}
    </AdminTable>
  )
}

function AdminTable({ headers, empty, children }: { headers: string[]; empty: boolean; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/[0.05]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-[#f7faf8] text-xs uppercase text-stone-500">
            <tr>
              {headers.map(header => (
                <th key={header} className="px-4 py-3 font-semibold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empty ? (
              <tr className="border-t border-black/[0.05]">
                <td className="px-4 py-8 text-center text-sm text-stone-400" colSpan={headers.length}>
                  <Trans>No records.</Trans>
                </td>
              </tr>
            ) : children}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#f7faf8] p-4 ring-1 ring-black/[0.04]">
      <div className="text-2xl font-semibold text-zinc-950">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase text-stone-500">{label}</div>
    </div>
  )
}

function adminTabTitle(tab: AdminTab): string {
  if (tab === 'users') return t`Users`
  if (tab === 'workspaces') return t`Cloud workspaces`
  return t`Domains`
}

function adminTabDescription(tab: AdminTab): string {
  if (tab === 'users') return t`Review accounts, roles, and enabled status.`
  if (tab === 'workspaces') return t`Inspect cloud workspace ownership and document counts.`
  if (tab === 'domains') return t`Review published custom domains and SSL state.`
  return t`Configure server object storage.`
}

function StorageSettingsPanel() {
  const [settings, setSettings] = useState<StorageSettingsData | null>(null)
  const [endpoint, setEndpoint] = useState('')
  const [bucket, setBucket] = useState('')
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [region, setRegion] = useState('')
  const [localDir, setLocalDir] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  function apply(s: StorageSettingsData) {
    setSettings(s)
    setEndpoint(s.endpoint)
    setBucket(s.bucket)
    setAccessKey(s.accessKey)
    setRegion(s.region)
    setLocalDir(s.localDir)
    setSecretKey('')
  }

  useEffect(() => {
    api.getStorageSettings().then(apply).catch(err => setMessage({ kind: 'err', text: String(err?.message || err) }))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const updated = await api.updateStorageSettings({
        endpoint,
        bucket,
        accessKey,
        region,
        localDir,
        ...(secretKey.trim() ? { secretKey } : {}),
      })
      apply(updated)
      setMessage({ kind: 'ok', text: t`Storage settings saved and applied.` })
    } catch (err) {
      setMessage({ kind: 'err', text: String(err instanceof Error ? err.message : err) })
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
    return <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
  }

  const usingS3 = endpoint.trim() !== ''

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {message && (
        <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${message.kind === 'ok' ? 'bg-[#e8f6f2] text-brand' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </p>
      )}

      <div className="flex items-center gap-2">
        <span className="field-label">{t`Active backend`}</span>
        <span className="status-chip status-chip-neutral">
          {settings.activeBackend === 's3' ? t`S3-compatible` : t`Local filesystem`}
        </span>
      </div>

      <StorageField
        label={t`S3 endpoint`}
        value={endpoint}
        onChange={setEndpoint}
        placeholder={t`https://s3.example.com — leave blank to use local files`}
        source={settings.sources.endpoint}
      />

      {usingS3 ? (
        <>
          <StorageField label={t`Bucket`} value={bucket} onChange={setBucket} source={settings.sources.bucket} />
          <StorageField label={t`Access key`} value={accessKey} onChange={setAccessKey} source={settings.sources.accessKey} />
          <StorageField
            label={t`Secret key`}
            value={secretKey}
            onChange={setSecretKey}
            type="password"
            placeholder={settings.secretKeySet ? t`•••••••• — leave blank to keep current` : t`Enter secret key`}
            source={settings.sources.secretKey}
          />
          <StorageField label={t`Region`} value={region} onChange={setRegion} source={settings.sources.region} />
        </>
      ) : (
        <StorageField label={t`Local directory`} value={localDir} onChange={setLocalDir} source={settings.sources.localDir} />
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="sidebar-action bg-brand text-white hover:bg-brand-dark hover:text-white">
          {saving ? t`Saving...` : t`Save storage settings`}
        </button>
        {usingS3 && <span className="text-xs text-stone-500"><Trans>Saving verifies the connection before applying.</Trans></span>}
      </div>
    </form>
  )
}

function StorageField({ label, value, onChange, type = 'text', placeholder, source }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  source?: string
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-2">
        <span className="field-label">{label}</span>
        {source === 'env' && (
          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            {t`from env`}
          </span>
        )}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="field-input"
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  )
}
