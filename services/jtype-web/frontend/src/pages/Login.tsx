import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
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
  const [submitting, setSubmitting] = useState(false)
  const { login, register, user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      navigate('/workspaces', { replace: true })
    }
  }, [loading, navigate, user])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isRegister) {
        await register(username, password)
      } else {
        await login(username, password)
      }
      navigate('/workspaces')
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Something went wrong`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8f6]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
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
            <Trans>Your Markdown workspace,<br />synced to the cloud.</Trans>
          </h1>
          <p className="text-base leading-relaxed text-white/80">
            <Trans>Local-first notes with cloud sync, publishing, and AI-ready indexing.</Trans>
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <CloudArrowUpIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold"><Trans>Cloud Sync</Trans></p>
                <p className="text-sm text-white/70">
                  <Trans>Keep your vaults in sync across all devices.</Trans>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <BoltIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold"><Trans>AI-Ready</Trans></p>
                <p className="text-sm text-white/70">
                  <Trans>Indexed and ready for intelligent assistance.</Trans>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <LockClosedIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold"><Trans>Local-First</Trans></p>
                <p className="text-sm text-white/70">
                  <Trans>Your files stay on your machine. Always.</Trans>
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/50"><Trans>© {new Date().getFullYear()} JType</Trans></p>
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
              {isRegister ? <Trans>Create account</Trans> : <Trans>Welcome back</Trans>}
            </h2>
            <p className="mb-6 text-sm text-stone-500">
              {isRegister
                ? <Trans>Sign up to start syncing your vaults.</Trans>
                : <Trans>Sign in to your JType Cloud account.</Trans>}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="field-label mb-1.5 block"
                >
                  <Trans>Username</Trans>
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="sync-input h-10"
                  placeholder={t`Enter your username`}
                />
              </div>
              <div>
                <label
                  htmlFor="login-password"
                  className="field-label mb-1.5 block"
                >
                  <Trans>Password</Trans>
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="sync-input h-10"
                  placeholder={t`Enter your password`}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="toolbar-button toolbar-button-primary mt-1 h-10 justify-center"
              >
                {submitting
                  ? <Trans>Please wait...</Trans>
                  : isRegister
                    ? <Trans>Create account</Trans>
                    : <Trans>Sign in</Trans>}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-stone-500">
              {isRegister
                ? <Trans>Already have an account?</Trans>
                : <Trans>Don't have an account?</Trans>}{' '}
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="font-semibold text-brand hover:underline"
              >
                {isRegister ? <Trans>Sign in</Trans> : <Trans>Register</Trans>}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
