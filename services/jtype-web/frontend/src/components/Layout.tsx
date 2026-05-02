import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="flex w-64 flex-col border-r border-zinc-200 bg-zinc-50 px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-8">
          <div
            className="select-none"
            style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace", fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}
          >
            <span className="text-zinc-400">[</span>
            <span className="text-[#0F766E]">J</span>
            <span className="text-zinc-900">TYPE</span>
            <span className="text-zinc-400">]</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <SidebarLink to="/dashboard">Dashboard</SidebarLink>
          <SidebarLink to="/settings">Settings</SidebarLink>
          {user?.role === 'admin' && <SidebarLink to="/admin">Admin</SidebarLink>}
        </div>
        <div className="mt-auto border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="mb-2 text-sm text-zinc-500">{user?.username}</div>
          <button
            onClick={handleLogout}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}

function SidebarLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand/10 text-brand dark:bg-brand/20'
            : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
