import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import {
  CloudArrowUpIcon,
  BoltIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'

export function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await register(username, password)
      } else {
        await login(username, password)
      }
      navigate('/workspaces')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between bg-brand p-12 text-white lg:flex">
        <div>
          <div
            className="select-none"
            style={{
              fontFamily:
                "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            <span className="opacity-60">[</span>
            <span className="text-white">J</span>
            <span className="text-white/90">TYPE</span>
            <span className="opacity-60">]</span>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Your Markdown workspace,
            <br />
            synced to the cloud.
          </h1>
          <p className="text-base leading-relaxed text-white/80">
            Local-first notes with cloud sync, publishing, and AI-ready indexing.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <CloudArrowUpIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Cloud Sync</p>
                <p className="text-sm text-white/70">
                  Keep your vaults in sync across all devices.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <BoltIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI-Ready</p>
                <p className="text-sm text-white/70">
                  Indexed and ready for intelligent assistance.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <LockClosedIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Local-First</p>
                <p className="text-sm text-white/70">
                  Your files stay on your machine. Always.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/50">© {new Date().getFullYear()} JType</p>
      </div>

      {/* Right: form panel */}
      <div className="flex flex-1 items-center justify-center bg-[#f5f8f6] p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <div
              className="select-none text-brand"
              style={{
                fontFamily:
                  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: -0.5,
              }}
            >
              <span className="text-stone-400">[</span>
              <span className="text-brand">J</span>
              <span className="text-stone-900">TYPE</span>
              <span className="text-stone-400">]</span>
            </div>
          </div>

          <div className="rounded-2xl border border-black/[0.06] bg-white p-8 shadow-sm shadow-emerald-950/5">
            <h2 className="mb-1 text-2xl font-bold text-stone-900">
              {isRegister ? 'Create account' : 'Welcome back'}
            </h2>
            <p className="mb-6 text-sm text-stone-500">
              {isRegister
                ? 'Sign up to start syncing your vaults.'
                : 'Sign in to your JType Cloud account.'}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="field-label mb-1.5 block"
                >
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="sync-input h-10"
                  placeholder="Enter your username"
                />
              </div>
              <div>
                <label
                  htmlFor="login-password"
                  className="field-label mb-1.5 block"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="sync-input h-10"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="toolbar-button toolbar-button-primary mt-1 h-10 justify-center"
              >
                {loading
                  ? 'Please wait...'
                  : isRegister
                    ? 'Create account'
                    : 'Sign in'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-stone-500">
              {isRegister
                ? 'Already have an account?'
                : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="font-semibold text-brand hover:underline"
              >
                {isRegister ? 'Sign in' : 'Register'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
