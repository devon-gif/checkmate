'use client'

import * as React from 'react'

import { IconSpinner } from '@/components/ui/icons'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ConsentCheckbox } from './consent-checkbox'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  action: 'sign-in' | 'sign-up'
}

type AuthApiPayload = {
  ok?: boolean
  error?: string
  code?: string
  requiresConfirmation?: boolean
}

function isSafeRelativePath(value: string | null | undefined): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  )
}

function getDestinationFromLocation() {
  if (typeof window === 'undefined') return '/dashboard'

  const params = new URLSearchParams(window.location.search)
  const candidate = params.get('next') ?? params.get('redirectedFrom')
  return isSafeRelativePath(candidate) ? candidate : '/dashboard'
}

async function postAuth(
  endpoint: '/api/auth/sign-in' | '/api/auth/sign-up',
  body: Record<string, unknown>
) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body)
    })

    const payload = (await response.json().catch(() => ({}))) as AuthApiPayload

    if (!response.ok) {
      return {
        error:
          payload.error ||
          'CheckRay could not complete that request. Please try again.'
      }
    }

    return { payload }
  } catch {
    return {
      error:
        'CheckRay could not reach the account service. Please check your connection and try again.'
    }
  }
}

export function LoginForm({
  className,
  action = 'sign-in',
  ...props
}: LoginFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()
  const [nextParam, setNextParam] = React.useState('')
  const [formState, setFormState] = React.useState<{
    email: string
    password: string
  }>({
    email: '',
    password: ''
  })
  const [consentChecked, setConsentChecked] = React.useState(false)
  const [confirmationEmail, setConfirmationEmail] = React.useState<string | null>(
    null
  )
  const [alreadyRegistered, setAlreadyRegistered] = React.useState(false)

  React.useEffect(() => {
    const destination = getDestinationFromLocation()
    setNextParam(
      destination !== '/dashboard'
        ? `?next=${encodeURIComponent(destination)}`
        : ''
    )
  }, [])

  const signIn = async () => {
    const { email, password } = formState
    return postAuth('/api/auth/sign-in', { email, password })
  }

  const signUp = async () => {
    const { email, password } = formState
    const destination = getDestinationFromLocation()

    const result = await postAuth('/api/auth/sign-up', {
      email,
      password,
      next: destination
    })

    if (result.error) return result

    const requiresConfirmation = !!result.payload?.requiresConfirmation

    if (requiresConfirmation) {
      toast.success('Account created — check your inbox to confirm your email.')
    } else {
      try {
        await fetch('/api/legal/accept', {
          method: 'POST',
          credentials: 'same-origin'
        })
      } catch {
        // Non-fatal: acceptance will be re-prompted if it was not recorded.
      }
    }

    return {
      payload: result.payload,
      requiresConfirmation,
      email
    }
  }

  const handleOnSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault()

    if (action === 'sign-up' && !consentChecked) {
      toast.error(
        'You must agree to the Terms of Service, Privacy Policy, and AI Disclosure to sign up.'
      )
      return
    }

    setIsLoading(true)

    if (action === 'sign-in') {
      const result = await signIn()

      if (result.error) {
        setIsLoading(false)
        toast.error(result.error)
        return
      }

      setIsLoading(false)
      router.push(getDestinationFromLocation())
      router.refresh()
      return
    }

    const result = await signUp()

    if (result.error) {
      setIsLoading(false)
      if (result.error.toLowerCase().includes('already registered')) {
        setAlreadyRegistered(true)
      } else {
        toast.error(result.error)
      }
      return
    }

    setIsLoading(false)

    if (result.requiresConfirmation) {
      setConfirmationEmail(result.email ?? formState.email)
      return
    }

    router.push(getDestinationFromLocation())
    router.refresh()
  }

  if (confirmationEmail) {
    return (
      <div
        {...props}
        role="status"
        className={`rounded-2xl border border-cm-green/25 bg-cm-green/[0.06] p-5 ${className ?? ''}`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cm-green/15 text-cm-green">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-white">Check your email</h2>
        <p className="mt-2 text-sm leading-6 text-white/55">
          We sent a confirmation link to{' '}
          <span className="font-medium text-white/80">{confirmationEmail}</span>.
          Click that link to finish creating your account. We&apos;ll sign you in
          and take you to your CheckRay dashboard automatically.
        </p>
        <p className="mt-3 text-xs leading-5 text-white/35">
          If you don&apos;t see it, check spam or promotions and give it a minute
          to arrive.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/sign-in${nextParam}`}
            className="inline-flex items-center justify-center rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-xs font-medium text-white/65 transition hover:border-white/20 hover:text-white"
          >
            Go to sign in
          </Link>
          <button
            type="button"
            onClick={() => setConfirmationEmail(null)}
            className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium text-white/40 transition hover:text-white/65"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={className} {...props}>
      <form onSubmit={handleOnSubmit}>
        <fieldset className="flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-1.5">
            <Label className="text-sm font-medium text-white/70">Email</Label>
            <Input
              name="email"
              type="email"
              value={formState.email}
              placeholder="you@example.com"
              autoComplete="email"
              required
              onChange={e => {
                setAlreadyRegistered(false)
                setFormState(prev => ({ ...prev, email: e.target.value }))
              }}
              className="border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-cm-green/50 focus:ring-cm-green/20"
            />
          </div>
          <div className="flex flex-col gap-y-1.5">
            <Label className="text-sm font-medium text-white/70">Password</Label>
            <Input
              name="password"
              type="password"
              value={formState.password}
              placeholder="••••••••"
              autoComplete={action === 'sign-in' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              onChange={e =>
                setFormState(prev => ({
                  ...prev,
                  password: e.target.value
                }))
              }
              className="border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-cm-green/50 focus:ring-cm-green/20"
            />
          </div>
        </fieldset>

        {action === 'sign-up' && (
          <div className="mt-5">
            <ConsentCheckbox
              checked={consentChecked}
              onCheckedChange={setConsentChecked}
              disabled={isLoading}
              className="text-white/50"
            />
          </div>
        )}

        {alreadyRegistered && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-4 py-3.5 text-sm"
          >
            <p className="font-medium text-yellow-300">
              That email already has a CheckRay account.
            </p>
            <p className="mt-1 text-white/50">
              Sign in instead, or reset your password if you&apos;ve forgotten it.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/sign-in${nextParam}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cm-green/30 bg-cm-green/10 px-3 py-1.5 text-xs font-semibold text-cm-green transition hover:bg-cm-green/20"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="submit"
            disabled={isLoading || (action === 'sign-up' && !consentChecked)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cm-green px-6 py-3 text-sm font-semibold text-cm-bg shadow-[0_0_24px_rgba(122,226,207,0.3)] transition-all hover:bg-cm-green/90 hover:shadow-[0_0_36px_rgba(122,226,207,0.45)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {isLoading && <IconSpinner className="animate-spin" />}
            {action === 'sign-in' ? 'Sign In' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-white/40">
            {action === 'sign-in' ? (
              <>
                Don&apos;t have an account?{' '}
                <Link
                  href={`/sign-up${nextParam}`}
                  className="font-medium text-white/70 underline underline-offset-4 hover:text-cm-green"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link
                  href={`/sign-in${nextParam}`}
                  className="font-medium text-white/70 underline underline-offset-4 hover:text-cm-green"
                >
                  Sign In
                </Link>
              </>
            )}
          </p>
        </div>
      </form>
    </div>
  )
}
