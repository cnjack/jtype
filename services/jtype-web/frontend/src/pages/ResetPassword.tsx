import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { api } from '../api'
import { AuthCard, JTypeWordmark } from '@shared/components'
import { ExclamationCircleIcon, ArrowPathIcon, KeyIcon } from '@heroicons/react/24/outline'

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) setError(t`This reset link is missing its token.`)
  }, [token, setError])

  const mismatchMsg = t`The passwords you entered do not match`
  const tooShortMsg = t`Password must be at least 8 characters`

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError(mismatchMsg)
      return
    }
    if (password.length < 8) {
      setError(tooShortMsg)
      return
    }
    setSubmitting(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Reset failed`)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <AuthCard
        title={t`Password reset`}
        subtitle={t`Your password has been changed. You can sign in now.`}
        icon={<KeyIcon className="h-6 w-6" />}
        footer={
          <p className="mt-5 text-center text-sm text-stone-500">
            <JTypeWordmark variant="dark" />
          </p>
        }
      >
        <button
          onClick={() => navigate('/login')}
          className="toolbar-button toolbar-button-primary h-10 w-full justify-center"
        >
          <Trans>Back to sign in</Trans>
        </button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={t`Choose a new password`}
      subtitle={t`Enter a new password for your JType account.`}
      icon={<KeyIcon className="h-6 w-6" />}
      footer={
        <p className="mt-5 text-center text-sm text-stone-500">
          <JTypeWordmark variant="dark" />
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="reset-password" className="field-label mb-1.5 block"><Trans>New password</Trans></label>
          <input
            id="reset-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sync-input h-10"
            placeholder={t`At least 8 characters`}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label htmlFor="reset-confirm" className="field-label mb-1.5 block"><Trans>Confirm password</Trans></label>
          <input
            id="reset-confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="sync-input h-10"
            placeholder={t`Re-enter new password`}
            autoComplete="new-password"
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
          disabled={submitting || !token}
          className="toolbar-button toolbar-button-primary mt-1 h-10 justify-center"
        >
          {submitting && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
          <Trans>Reset password</Trans>
        </button>
      </form>
    </AuthCard>
  )
}
