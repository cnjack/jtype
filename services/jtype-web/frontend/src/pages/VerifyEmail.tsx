import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { api } from '../api'
import { AuthCard, JTypeWordmark } from '@shared/components'
import { CheckCircleIcon, ExclamationCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

type State = 'verifying' | 'success' | 'error'

export function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [state, setState] = useState<State>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage(t`This verification link is missing its token.`)
      return
    }
    let cancelled = false
    api
      .verifyEmail(token)
      .then(() => {
        if (!cancelled) setState('success')
      })
      .catch((err) => {
        if (!cancelled) {
          setState('error')
          setMessage(err instanceof Error ? err.message : t`Verification failed`)
        }
      })
    return () => { cancelled = true }
  }, [token, message])

  return (
    <AuthCard
      title={
        state === 'success' ? t`Email verified` :
        state === 'error' ? t`Verification failed` :
        t`Verifying…`
      }
      subtitle={
        state === 'success' ? t`Your email address is now confirmed.` :
        state === 'error' ? message :
        t`Confirming your email address.`
      }
      icon={
        state === 'success' ? <CheckCircleIcon className="h-6 w-6" /> :
        state === 'error' ? <ExclamationCircleIcon className="h-6 w-6" /> :
        <EnvelopeIcon className="h-6 w-6" />
      }
      footer={
        <p className="mt-5 text-center text-sm text-stone-500">
          <JTypeWordmark variant="dark" />
        </p>
      }
    >
      {state !== 'verifying' && (
        <button
          onClick={() => navigate('/workspaces')}
          className="toolbar-button toolbar-button-primary h-10 w-full justify-center"
        >
          <Trans>Continue</Trans>
        </button>
      )}
    </AuthCard>
  )
}
