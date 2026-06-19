import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useAuth } from '../components/AuthContext'
import { api, type AuthResponse } from '../api'
import { AuthCard, JTypeWordmark, OTPInput } from '@shared/components'
import { SUPPORTED_LOCALES, LOCALE_LABELS, activateLocale, type SupportedLocale } from '@shared/i18n'
import { useLingui } from '@lingui/react'
import {
  CloudArrowUpIcon,
  BoltIcon,
  LockClosedIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'

export function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Forgot-password mini-form (shown when "Forgot password?" is clicked).
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  // Login method for the email case: 'otp' (default for email — send a code,
  // verify, done) or 'password' (opt-in via "Use password instead").
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState('')
  const { login, register, completeLogin, user, loading } = useAuth()
  const navigate = useNavigate()
  // When signing in with an email, OTP is the default method; the user can opt
  // into password via "Use password instead". Username sign-in is always password.
  const isEmailSignIn = !isRegister && username.includes('@')
  const useOtp = isEmailSignIn && loginMethod === 'otp'

  useEffect(() => {
    if (!loading && user) {
      navigate('/workspaces', { replace: true })
    }
  }, [loading, navigate, user])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // OTP mode drives its own send/verify buttons; a stray Enter must not
    // attempt a (passwordless) password login.
    if (useOtp) return
    setError('')
    setSubmitting(true)
    try {
      if (isRegister) {
        await register(username, password, email.trim() || undefined)
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

  async function handleForgot(e: FormEvent) {
    e.preventDefault()
    setForgotSubmitting(true)
    try {
      await api.forgotPassword(forgotEmail)
      setForgotSent(true)
    } catch {
      // The endpoint is anti-enumeration: it never reveals whether the email
      // exists. Show the same success message regardless.
      setForgotSent(true)
    } finally {
      setForgotSubmitting(false)
    }
  }

  // OTP login — send the 6-digit code to the email typed in the username field.
  async function handleOtpSend(e?: FormEvent) {
    e?.preventDefault()
    setOtpError('')
    setOtpSending(true)
    try {
      await api.loginOtpSend(username)
      setOtpSent(true)
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : t`Failed to send code`)
    } finally {
      setOtpSending(false)
    }
  }

  // OTP login — verify the code (auto-triggered when all 6 digits are filled).
  // On success the user is logged in directly; no password step.
  async function handleOtpVerify(code: string) {
    setOtpError('')
    setOtpVerifying(true)
    try {
      const res: AuthResponse = await api.loginOtpVerify(username, code)
      completeLogin(res)
      navigate('/workspaces')
    } catch (err) {
      setOtpCode('')
      setOtpError(err instanceof Error ? err.message : t`Verification failed`)
    } finally {
      setOtpVerifying(false)
    }
  }

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8f6]">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-brand" />
      </div>
    )
  }

  // Brand panel content for the split layout.
  const brand = (
    <>
      <JTypeWordmark variant="light" />
      <div className="max-w-md">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          <Trans>Your Markdown workspace,<br />synced to the cloud.</Trans>
        </h1>
        <p className="text-base leading-relaxed text-white/80">
          <Trans>Local-first notes with cloud sync, publishing, and AI-ready indexing.</Trans>
        </p>
        <div className="mt-8 space-y-4">
          <Feature
            icon={<CloudArrowUpIcon className="h-5 w-5" />}
            title={t`Cloud Sync`}
            desc={t`Keep your vaults in sync across all devices.`}
          />
          <Feature
            icon={<BoltIcon className="h-5 w-5" />}
            title={t`AI-Ready`}
            desc={t`Indexed and ready for intelligent assistance.`}
          />
          <Feature
            icon={<LockClosedIcon className="h-5 w-5" />}
            title={t`Local-First`}
            desc={t`Your files stay on your machine. Always.`}
          />
        </div>
      </div>
      <p className="text-xs text-white/50"><Trans>© {new Date().getFullYear()} JType</Trans></p>
    </>
  )

  const submitLabel = submitting
    ? (isRegister ? t`Creating...` : t`Signing in...`)
    : (isRegister ? t`Create account` : t`Sign in`)

  return (
    <>
      <LocaleSwitcher />
      <AuthCard
        brand={brand}
        title={isRegister ? t`Create account` : t`Welcome back`}
      subtitle={isRegister ? t`Sign up to start syncing your vaults.` : t`Sign in to your JType Cloud account.`}
      footer={
        <p className="mt-5 text-center text-sm text-stone-500">
          {isRegister ? <Trans>Already have an account?</Trans> : <Trans>Don't have an account?</Trans>}{' '}
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError('') }}
            className="font-semibold text-brand hover:underline"
          >
            {isRegister ? <Trans>Sign in</Trans> : <Trans>Register</Trans>}
          </button>
        </p>
      }
    >
      {/* Segmented tab — login / register switch */}
      <div className="seg" data-active={isRegister ? '1' : '0'}>
        <div className="seg-slider" />
        <button
          type="button"
          className={!isRegister ? 'active' : ''}
          onClick={() => { setIsRegister(false); setError('') }}
        >
          <Trans>Sign in</Trans>
        </button>
        <button
          type="button"
          className={isRegister ? 'active' : ''}
          onClick={() => { setIsRegister(true); setError('') }}
        >
          <Trans>Register</Trans>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="login-username" className="field-label mb-1.5 block">
            <Trans>Username</Trans>
          </label>
          <input
            id="login-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="sync-input h-10"
            placeholder={isRegister ? t`Enter your username` : t`Username or email`}
            autoComplete="username"
          />
        </div>
        {/* Password OR email-code block.
            - Username / register: always password.
            - Email sign-in: defaults to OTP (send code → verify). A "Use password
              instead" link reveals the password field for the same email. */}
        {useOtp ? (
          otpSent ? (
            <div className="flex flex-col gap-3">
              <label className="field-label mb-0.5 block"><Trans>Enter the 6-digit code</Trans></label>
              <OTPInput
                value={otpCode}
                onChange={setOtpCode}
                onComplete={handleOtpVerify}
                error={!!otpError}
                size="sm"
                autoFocus
                ariaLabel={t`Login code`}
              />
              {otpVerifying && (
                <p className="flex items-center gap-2 text-sm text-brand">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <Trans>Verifying…</Trans>
                </p>
              )}
              {otpError && (
                <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{otpError}</span>
                </p>
              )}
              <button
                type="button"
                onClick={() => handleOtpSend()}
                disabled={otpSending}
                className="text-left text-xs font-semibold text-brand hover:underline"
              >
                {otpSending ? t`Sending…` : t`Resend code`}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-stone-600">
                <Trans>We'll send a 6-digit sign-in code to this email.</Trans>
              </p>
              {otpError && (
                <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{otpError}</span>
                </p>
              )}
              <button
                type="button"
                onClick={() => handleOtpSend()}
                disabled={otpSending}
                className="toolbar-button toolbar-button-primary h-10 justify-center"
              >
                {otpSending && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                <Trans>Send code</Trans>
              </button>
            </div>
          )
        ) : (
          <div>
            <label htmlFor="login-password" className="field-label mb-1.5 block">
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
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>
        )}

        {/* Email field — registration only (optional, enables password reset) */}
        {isRegister && (
          <div>
            <label htmlFor="login-email" className="field-label mb-1.5 block">
              <Trans>Email</Trans>{' '}
              <span className="font-normal normal-case text-stone-400">(<Trans>optional</Trans>)</span>
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="sync-input h-10"
              placeholder={t`you@example.com`}
              autoComplete="email"
            />
          </div>
        )}

        {/* Remember + forgot password row (login only) */}
        {!isRegister && (
          <div className="-mt-1 flex items-center justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-stone-700">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-[15px] w-[15px] accent-[#008884]"
              />
              <Trans>Remember me</Trans>
            </label>
            <button
              type="button"
              className="text-xs font-semibold text-brand hover:underline"
              onClick={() => { setForgotOpen((v) => !v); setForgotSent(false) }}
            >
              <Trans>Forgot password?</Trans>
            </button>
          </div>
        )}
        {/* Method switch for email sign-in: toggle between OTP and password. */}
        {isEmailSignIn && !forgotOpen && (
          <div className="-mt-2 text-center">
            {useOtp ? (
              <button
                type="button"
                className="text-xs font-semibold text-brand hover:underline"
                onClick={() => { setLoginMethod('password'); setOtpError(''); setOtpSent(false); setOtpCode('') }}
              >
                <Trans>Use password instead</Trans>
              </button>
            ) : (
              <button
                type="button"
                className="text-xs font-semibold text-brand hover:underline"
                onClick={() => { setLoginMethod('otp'); setOtpError(''); setOtpSent(false); setOtpCode('') }}
              >
                <Trans>Sign in with email code</Trans>
              </button>
            )}
          </div>
        )}
        {forgotOpen && !isRegister && (
          forgotSent ? (
            <p className="-mt-2 flex items-start gap-2 rounded-lg bg-[#e8f6f2] px-3 py-2 text-xs text-brand">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span><Trans>If an account exists for that email, a reset link is on its way.</Trans></span>
            </p>
          ) : (
            <form onSubmit={handleForgot} className="-mt-2 rounded-lg border border-black/[0.06] bg-stone-50 p-3">
              <label htmlFor="forgot-email" className="field-label mb-1.5 block"><Trans>Account email</Trans></label>
              <div className="flex gap-2">
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="sync-input h-9"
                  placeholder={t`you@example.com`}
                  autoComplete="email"
                />
                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="toolbar-button toolbar-button-primary h-9 shrink-0 px-3"
                >
                  {forgotSubmitting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <Trans>Send</Trans>}
                </button>
              </div>
            </form>
          )
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {/* The primary submit button is the password sign-in / register action.
            OTP mode has its own Send-code / auto-verify controls, so hide it. */}
        {!useOtp && (
          <button
            type="submit"
            disabled={submitting}
            className="toolbar-button toolbar-button-primary mt-1 h-10 justify-center"
          >
            {submitting && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </button>
        )}
      </form>
    </AuthCard>
    </>
  )
}

function LocaleSwitcher() {
  const { i18n } = useLingui()
  const current = (i18n.locale || 'en') as SupportedLocale
  return (
    <div className="fixed right-5 top-5 z-50">
      <Menu>
        <MenuButton
          title={t`Language`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.06] bg-white/90 text-stone-500 shadow-sm shadow-emerald-950/5 backdrop-blur transition hover:bg-brand-soft hover:text-brand-dark"
        >
          <GlobeAltIcon className="h-5 w-5" />
        </MenuButton>
        <MenuItems className="absolute right-0 mt-2 w-40 origin-top-right rounded-xl border border-black/[0.06] bg-white p-1 shadow-lg shadow-stone-900/10 outline-none">
          {SUPPORTED_LOCALES.map((locale) => (
            <MenuItem key={locale}>
              {({ active }) => (
                <button
                  type="button"
                  onClick={() => void activateLocale(locale)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                    active ? 'bg-brand-soft text-brand-dark' : 'text-stone-700'
                  }`}
                >
                  <span>{LOCALE_LABELS[locale]}</span>
                  {locale === current && <CheckIcon className="h-4 w-4 text-brand" />}
                </button>
              )}
            </MenuItem>
          ))}
        </MenuItems>
      </Menu>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-white/10 p-2 text-white">{icon}</div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-white/70">{desc}</p>
      </div>
    </div>
  )
}
