import { useState, useEffect, type FormEvent } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useSearchParams } from 'react-router-dom'
import { api, setToken, setStoredUsername, getStoredUsername } from '../api'
import type { DeviceRequest } from '../api'
import { AuthCard, JTypeWordmark, OTPInput } from '@shared/components'
import {
  ComputerDesktopIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

export function DeviceOAuth() {
  const [searchParams] = useSearchParams()
  const [userCode, setUserCode] = useState(searchParams.get('code') || '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loggedInName, setLoggedInName] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [request, setRequest] = useState<DeviceRequest | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('jtype.token')
    if (token) {
      setIsLoggedIn(true)
      setLoggedInName(getStoredUsername() || '')
      api.me().catch(() => {
        localStorage.removeItem('jtype.token')
        setIsLoggedIn(false)
        setLoggedInName('')
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
      setLoggedInName(res.username)
      // Keep status empty so the consent-details effect runs after login.
      setStatus('')
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
      setStatus(t`Access approved. You can return to the app that requested access.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Authorization failed`)
    } finally {
      setLoading(false)
    }
  }

  // Full-scope authorization is never automatic. Resolve the verified client
  // identity and requested scope, then require an explicit Allow click.
  const codeComplete = userCode.replace(/\D/g, '').length === 6
  useEffect(() => {
    if (!codeComplete || !isLoggedIn || status) {
      setRequest(null)
      return
    }
    let cancelled = false
    setError('')
    void api.getDeviceRequest(userCode).then(
      (value) => {
        if (!cancelled) setRequest(value)
      },
      (err) => {
        if (!cancelled) {
          setRequest(null)
          setError(err instanceof Error ? err.message : t`Authorization request not found`)
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [codeComplete, isLoggedIn, status, userCode])

  const copyCode = () => {
    if (!userCode) return
    navigator.clipboard?.writeText(userCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const icon = (
    <ComputerDesktopIcon className="h-6 w-6" />
  )

  return (
    <AuthCard
      title={t`Authorize device`}
      subtitle={t`Review and approve an app requesting access to JType`}
      icon={icon}
      footer={
        <p className="mt-5 text-center text-xs text-stone-400">
          <JTypeWordmark variant="dark" />
        </p>
      }
    >
      {/* OTP input — unified with brand design system */}
      <OTPInput
        value={userCode}
        onChange={setUserCode}
        onComplete={(v) => { void v }}
        error={!!error}
        autoFocus
        ariaLabel={t`Device code`}
      />
      <p className="otp-hint mt-3 text-center text-xs text-stone-500">
        {copied ? <Trans>Copied</Trans> : (
          <button type="button" onClick={copyCode} className="font-semibold text-brand hover:underline">
            <Trans>Copy code</Trans>
          </button>
        )}
      </p>

      {/* Logged-in / logged-out sections separated by a divider */}
      <div className="mt-6 border-t border-black/[0.06] pt-5">
        {isLoggedIn ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 text-sm text-stone-600">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft font-bold text-brand-dark">
                {loggedInName.charAt(0).toUpperCase() || '?'}
              </span>
              <Trans>Signed in as <b className="text-stone-800">{loggedInName}</b></Trans>
            </div>

            {request && !status && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-stone-700">
                <p className="font-semibold text-stone-900">
                  {request.clientName} <Trans>requests access to your JType account.</Trans>
                </p>
                {request.scope === 'full' ? (
                  <>
                    <p className="mt-2 font-semibold text-amber-800">
                      <Trans>Full account access</Trans>
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-5 text-stone-600">
                      <li><Trans>View and manage all cloud workspaces you can access</Trans></li>
                      <li><Trans>Read, create, update, and delete documents and kanban cards</Trans></li>
                      <li><Trans>Use your workspace and administrator permissions</Trans></li>
                    </ul>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-stone-600">
                    <Trans>Read and manage your documents and kanban boards.</Trans>
                  </p>
                )}
              </div>
            )}

            {status && (
              <p className="flex items-start gap-2 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-dark">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{status}</span>
              </p>
            )}
            {error && (
              <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button
              onClick={handleApprove}
              disabled={loading || !codeComplete || !request}
              className="toolbar-button toolbar-button-primary h-10 justify-center disabled:opacity-50"
            >
              {loading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
              {loading
                ? t`Authorizing...`
                : request?.scope === 'full'
                  ? t`Allow full access`
                  : t`Allow access`}
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <p className="text-center text-xs text-stone-500">
              <Trans>Sign in to approve this device</Trans>
            </p>
            <div>
              <label htmlFor="do-username" className="field-label mb-1.5 block">
                <Trans>Username</Trans>
              </label>
              <input
                id="do-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="sync-input h-10"
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="do-password" className="field-label mb-1.5 block">
                <Trans>Password</Trans>
              </label>
              <input
                id="do-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="sync-input h-10"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="toolbar-button toolbar-button-primary h-10 justify-center"
            >
              {loading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
              {loading ? t`Please wait...` : isRegister ? t`Register & authorize` : t`Sign in & authorize`}
            </button>

            <p className="text-center text-sm text-stone-500">
              {isRegister ? <Trans>Already have an account?</Trans> : <Trans>Don't have an account?</Trans>}{' '}
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="font-medium text-brand hover:underline"
              >
                {isRegister ? <Trans>Sign in</Trans> : <Trans>Register</Trans>}
              </button>
            </p>
          </form>
        )}
      </div>
    </AuthCard>
  )
}
