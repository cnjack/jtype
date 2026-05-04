import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogPanel } from '@headlessui/react'
import { api, type AdminUser, type AdminWorkspace, type AdminDomain, type AdminStats } from '../api'

type AdminTab = 'users' | 'workspaces' | 'domains'

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
    <Dialog open onClose={onClose} className="relative z-50" aria-label="Admin">
      <div className="fixed inset-0 bg-stone-950/35 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-5 py-6">
        <DialogPanel className="grid h-[min(720px,92vh)] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/70 bg-[#fbfdfb] shadow-2xl shadow-stone-900/25 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-r border-black/[0.04] bg-[#f7faf8] p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-stone-500">Admin</p>
          <AdminNavButton active={tab === 'users'} onClick={() => setTab('users')} label="Users" />
          <AdminNavButton active={tab === 'workspaces'} onClick={() => setTab('workspaces')} label="Cloud workspaces" />
          <AdminNavButton active={tab === 'domains'} onClick={() => setTab('domains')} label="Domains" />
        </aside>

        <main className="min-h-0 overflow-y-auto p-8">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold text-zinc-950">Admin</h2>
              <p className="mt-1 text-sm text-zinc-500">Manage users, cloud workspaces, domains, and service activity.</p>
            </div>
            <button className="subtle-button" type="button" onClick={onClose}>Close</button>
          </div>

          <div className="max-w-4xl space-y-6">
            {stats && (
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Users" value={stats.totalUsers} />
                <StatCard label="Cloud workspaces" value={stats.totalWorkspaces} />
                <StatCard label="Documents" value={stats.totalDocuments} />
                <StatCard label="Domains" value={stats.totalDomains} />
              </section>
            )}

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-950">{adminTabTitle(tab)}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{adminTabDescription(tab)}</p>
                </div>
                {loading && <span className="text-xs font-semibold text-stone-400">Loading...</span>}
              </div>

              {tab === 'users' && <UsersTable users={users} onToggleUser={toggleUser} />}
              {tab === 'workspaces' && <WorkspacesTable workspaces={workspaces} />}
              {tab === 'domains' && <DomainsTable domains={domains} />}
            </section>
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
      headers={['Username', 'Role', 'Cloud workspaces', 'Status', 'Actions']}
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
              {user.enabled ? 'Active' : 'Disabled'}
            </span>
          </td>
          <td className="px-4 py-3">
            <button className="text-xs font-semibold text-brand hover:text-brand-dark" type="button" onClick={() => onToggleUser(user)}>
              {user.enabled ? 'Disable' : 'Enable'}
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
      headers={['Name', 'Owner', 'Members', 'Documents']}
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
      headers={['Domain', 'User', 'Status', 'SSL']}
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
                  No records.
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
  if (tab === 'users') return 'Users'
  if (tab === 'workspaces') return 'Cloud workspaces'
  return 'Domains'
}

function adminTabDescription(tab: AdminTab): string {
  if (tab === 'users') return 'Review accounts, roles, and enabled status.'
  if (tab === 'workspaces') return 'Inspect cloud workspace ownership and document counts.'
  return 'Review published custom domains and SSL state.'
}
