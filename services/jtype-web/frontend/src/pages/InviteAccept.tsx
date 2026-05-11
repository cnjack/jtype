import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircleIcon, ExclamationCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { api, getStoredToken, type InvitePreview } from '../api'

type PageState = 'loading' | 'pending' | 'accepted' | 'revoked' | 'error'

export function InviteAccept() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [state, setState] = useState<PageState>('loading')
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const isLoggedIn = !!getStoredToken()

  useEffect(() => {
    if (!token) {
      setState('error')
      setErrorMessage('No invite token provided.')
      return
    }
    api
      .previewInvite(token)
      .then((data) => {
        setPreview(data)
        setState(data.status === 'accepted' ? 'accepted' : data.status === 'revoked' ? 'revoked' : 'pending')
      })
      .catch(() => {
        setState('error')
        setErrorMessage('This invite link is invalid or has expired.')
      })
  }, [token])

  async function handleAccept() {
    if (!token || accepting) return
    setAccepting(true)
    try {
      const workspace = await api.acceptInvite(token)
      navigate(`/workspaces/${workspace.id}`, { replace: true })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to accept invite.')
      setState('error')
    } finally {
      setAccepting(false)
    }
  }

  function handleLoginRedirect() {
    navigate(`/login?return=/invites/${token}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f8f6] px-4">
      <div className="w-full max-w-md rounded-2xl border border-black/[0.06] bg-white p-10 shadow-xl shadow-stone-900/10">
        {/* Logo */}
        <div
          className="mb-8 select-none text-brand"
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: -0.5,
          }}
        >
          <span className="opacity-40">[</span>
          <span>J</span>
          <span className="opacity-80">TYPE</span>
          <span className="opacity-40">]</span>
        </div>

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="text-sm text-zinc-500">Loading invite…</p>
          </div>
        )}

        {state === 'pending' && preview && (
          <>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef7f4]">
              <UserGroupIcon className="h-6 w-6 text-brand" />
            </div>
            <h1 className="mb-1 text-2xl font-semibold text-zinc-950">You're invited</h1>
            <p className="mb-6 text-sm leading-6 text-zinc-500">
              <strong className="text-zinc-950">{preview.invitedByUsername}</strong> has invited you
              to join{' '}
              <strong className="text-zinc-950">{preview.workspaceName}</strong> as{' '}
              <span className="inline-block rounded-md bg-[#eef7f4] px-1.5 py-0.5 text-xs font-semibold capitalize text-brand">
                {preview.role}
              </span>
              .
            </p>

            {errorMessage && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {isLoggedIn ? (
              <button
                type="button"
                disabled={accepting}
                onClick={handleAccept}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:opacity-60"
              >
                {accepting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <CheckCircleIcon className="h-4 w-4" />
                )}
                {accepting ? 'Joining…' : 'Accept invitation'}
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleLoginRedirect}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90"
                >
                  Log in to accept
                </button>
                <p className="text-center text-xs text-zinc-400">
                  Don't have an account?{' '}
                  <Link to={`/login?register=true&return=/invites/${token}`} className="text-brand hover:underline">
                    Sign up
                  </Link>
                </p>
              </div>
            )}
          </>
        )}

        {state === 'accepted' && (
          <>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef7f4]">
              <CheckCircleIcon className="h-6 w-6 text-brand" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold text-zinc-950">Already accepted</h1>
            <p className="mb-6 text-sm text-zinc-500">
              This invite has already been accepted. You can go to your workspaces.
            </p>
            <Link
              to="/workspaces"
              className="flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90"
            >
              Go to workspaces
            </Link>
          </>
        )}

        {(state === 'revoked' || state === 'error') && (
          <>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
              <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold text-zinc-950">
              {state === 'revoked' ? 'Invite revoked' : 'Invalid invite'}
            </h1>
            <p className="mb-6 text-sm text-zinc-500">
              {state === 'revoked'
                ? 'This invite link has been revoked and is no longer valid.'
                : errorMessage || 'This invite link is invalid or has expired.'}
            </p>
            <Link
              to="/"
              className="flex w-full items-center justify-center rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
            >
              Go to home
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
