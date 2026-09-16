import { useState, useEffect } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import type { DeviceRequest } from '../api'
import { useAuth } from '../components/AuthContext'
import { AuthCard, JTypeWordmark, OTPInput } from '@shared/components'
import {
  ComputerDesktopIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export function DeviceOAuth() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [userCode, setUserCode] = useState(searchParams.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [request, setRequest] = useState<DeviceRequest | null>(null)

  // Authorization requires a signed-in account. Visitors arriving straight from
  // a CLI deep link are sent to the sign-in page first, then bounced back here
  // with the device code intact via the `next` parameter.
  useEffect(() => {
    if (authLoading || user) return
    const target = `${window.location.pathname}${window.location.search}`
    navigate(`/login?next=${encodeURIComponent(target)}`, { replace: true })
  }, [authLoading, navigate, user])

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
    if (!codeComplete || !user || status) {
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
  }, [codeComplete, status, user, userCode])

  const copyCode = () => {
    if (!userCode) return
    navigator.clipboard?.writeText(userCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  // After approving, nothing on this page is actionable anymore. Browsers only
  // honor window.close() for script-opened tabs; when the CLI flow had the user
  // open the URL manually the call is a no-op, so fall back to the dashboard
  // instead of leaving a dead authorization card on screen.
  const handleClose = () => {
    window.close()
    window.setTimeout(() => navigate('/workspaces'), 300)
  }

  const icon = (
    <ComputerDesktopIcon className="h-6 w-6" />
  )

  // Session is being restored or the sign-in redirect is in flight.
  if (authLoading || !user) {
    return (
      <AuthCard
        title={t`Authorize device`}
        subtitle={t`Sign in to JType to continue authorizing this device.`}
        icon={icon}
        footer={
          <p className="mt-5 text-center text-xs text-stone-400">
            <JTypeWordmark variant="dark" />
          </p>
        }
      >
        <div className="flex flex-col items-center gap-3 py-6">
          <ArrowPathIcon className="h-6 w-6 animate-spin text-brand" />
        </div>
      </AuthCard>
    )
  }

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
      {status ? (
        /* Completion state — the code inputs and Allow controls no longer
           apply and would only invite a second, ambiguous interaction. */
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-2 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-dark">
            <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{status}</span>
          </p>
          <button
            onClick={handleClose}
            className="toolbar-button toolbar-button-primary h-10 justify-center"
          >
            <XMarkIcon className="h-4 w-4" />
            <Trans>Close this page</Trans>
          </button>
        </div>
      ) : (
        <>
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

          <div className="mt-6 border-t border-black/[0.06] pt-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5 text-sm text-stone-600">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft font-bold text-brand-dark">
                  {user.username.charAt(0).toUpperCase() || '?'}
                </span>
                <Trans>Signed in as <b className="text-stone-800">{user.username}</b></Trans>
              </div>

              {request && (
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
          </div>
        </>
      )}
    </AuthCard>
  )
}
