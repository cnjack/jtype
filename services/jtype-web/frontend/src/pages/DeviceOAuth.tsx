import { useState, useEffect, type FormEvent } from 'react'
import { t, Trans } from '@lingui/macro'
import { useSearchParams } from 'react-router-dom'
import { api, setToken, setStoredUsername } from '../api'

export function DeviceOAuth() {
  const [searchParams] = useSearchParams()
  const [userCode, setUserCode] = useState(searchParams.get('code') || '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('jtype.token')
    if (token) {
      setIsLoggedIn(true)
      api.me().catch(() => {
        localStorage.removeItem('jtype.token')
        setIsLoggedIn(false)
      })
    }
  }, [])

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setStatus('')
    setLoading(true)
    try {
      const res = isRegister
        ? await api.register(username, password, `${username} Docs`)
        : await api.login(username, password)
      setToken(res.token)
      setStoredUsername(res.username)
      setIsLoggedIn(true)
      setStatus(t`Signed in. Ready to authorize device.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Authentication failed`)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    setError('')
    setStatus('')
    setLoading(true)
    try {
      await api.approveDevice(userCode)
      setStatus(t`Device authorized! You can return to the JType desktop app.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Authorization failed`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-white">
          <Trans>Authorize Desktop</Trans>
        </h2>
        <p className="mb-6 text-center text-sm text-zinc-500">
          <Trans>Enter the code shown in your JType desktop app</Trans>
        </p>

        <div className="mb-6">
          <label htmlFor="device-code" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <Trans>Device Code</Trans>
          </label>
          <input
            id="device-code"
            type="text"
            value={userCode}
            onChange={e => setUserCode(e.target.value)}
            placeholder={t`e.g. 456478`}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        {!isLoggedIn ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label htmlFor="do-username" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <Trans>Username</Trans>
              </label>
              <input
                id="do-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="do-password" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <Trans>Password</Trans>
              </label>
              <input
                id="do-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? t`Please wait...` : isRegister ? t`Register & Authorize` : t`Sign in & Authorize`}
            </button>

            <p className="text-center text-sm text-zinc-500">
              {isRegister ? t`Already have an account?` : t`Don't have an account?`}{' '}
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="font-medium text-brand hover:underline"
              >
                {isRegister ? t`Sign in` : t`Register`}
              </button>
            </p>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            {status && <p className="text-sm text-green-600 dark:text-green-400">{status}</p>}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              onClick={handleApprove}
              disabled={loading || !userCode}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? t`Authorizing...` : t`Authorize Device`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
