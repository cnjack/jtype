import { useEffect, useState } from 'react'
import { api, type AdminUser, type AdminWorkspace, type AdminDomain, type AdminStats } from '../api'

export function Admin() {
  const [tab, setTab] = useState<'users' | 'workspaces' | 'domains'>('users')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([])
  const [domains, setDomains] = useState<AdminDomain[]>([])

  useEffect(() => {
    api.adminStats().then(setStats)
  }, [])

  useEffect(() => {
    if (tab === 'users') api.adminUsers().then(setUsers)
    else if (tab === 'workspaces') api.adminWorkspaces().then(setWorkspaces)
    else if (tab === 'domains') api.adminDomains().then(setDomains)
  }, [tab])

  async function toggleUser(user: AdminUser) {
    await api.adminUpdateUser(user.id, { enabled: !user.enabled })
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, enabled: !u.enabled } : u))
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">Admin</h1>

      {/* Stats cards */}
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Users" value={stats.totalUsers} />
          <StatCard label="Workspaces" value={stats.totalWorkspaces} />
          <StatCard label="Documents" value={stats.totalDocuments} />
          <StatCard label="Domains" value={stats.totalDomains} />
        </div>
      )}

      {/* Tab navigation */}
      <div className="mb-6 flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {(['users', 'workspaces', 'domains'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Users table */}
      {tab === 'users' && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Username</th>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Role</th>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Workspaces</th>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Status</th>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${u.role === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{u.workspaceCount}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${u.enabled ? 'text-green-600' : 'text-red-600'}`}>
                      {u.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleUser(u)}
                      className="text-xs text-brand hover:underline"
                    >
                      {u.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Workspaces table */}
      {tab === 'workspaces' && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Owner</th>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Members</th>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Documents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {workspaces.map(ws => (
                <tr key={ws.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{ws.name}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{ws.ownerUsername || '—'}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{ws.memberCount}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{ws.documentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Domains table */}
      {tab === 'domains' && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Domain</th>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">User</th>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Status</th>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">SSL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {domains.map(d => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{d.domain}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{d.username}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${d.status === 'verified' ? 'text-green-600' : 'text-amber-600'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{d.sslStatus || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</div>
      <div className="text-sm text-zinc-500">{label}</div>
    </div>
  )
}
