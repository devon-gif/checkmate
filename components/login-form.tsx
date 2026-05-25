'use client'

import * as React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

import { IconSpinner } from '@/components/ui/icons'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ConsentCheckbox } from './consent-checkbox'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const supabaseConfigured =
  typeof process !== 'undefined' &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  action: 'sign-in' | 'sign-up'
}

export function LoginForm({
  className,
  action = 'sign-in',
  ...props
}: LoginFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()
  // Preserve ?next= when toggling between sign-in and sign-up
  const [nextParam, setNextParam] = React.useState('')
  const [formState, setFormState] = React.useState<{
    email: string
    password: string
  }>({
    email: '',
    password: ''
  })
  const [consentChecked, setConsentChecked] = React.useState(false)
  // Tracks the specific "already registered" case so we can show an inline
  // banner with actionable Sign In / Reset Password links instead of a plain toast.
  const [alreadyRegistered, setAlreadyRegistered] = React.useState(false)

  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('next')
    setNextParam(p && p.startsWith('/') ? `?next=${encodeURIComponent(p)}` : '')
  }, [])

  // Guard: if Supabase is not configured, show a friendly message instead of
  // crashing with "supabaseUrl is required!". All hooks are called above.
  if (!supabaseConfigured) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
        <p className="font-medium text-white/80 mb-1">Auth is not configured</p>
        <p>NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.</p>
      </div>
    )
  }

  // Create a Supabase client — only reached when env vars are confirmed present.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const supabase = createClientComponentClient()

  const signIn = async () => {
    const { email, password } = formState
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return error
  }

  const signUp = async () => {
    const { email, password } = formState
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/api/auth/callback` }
    })

    if (!error && !data.session)
      toast.success('Check your inbox to confirm your email address!')

    // Record legal acceptance after successful sign-up (best-effort)
    if (!error && data.session) {
      try {
        await fetch('/api/legal/accept', { method: 'POST' })
      } catch {
        // Non-fatal: acceptance will be re-prompted on next login if missing
      }
    }

    return error
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

    const error = action === 'sign-in' ? await signIn() : await signUp()

    if (error) {
      setIsLoading(false)
      // Supabase returns "User already registered" when the email exists.
      // Show a persistent inline banner with actionable links rather than
      // a dismissable toast that the user might miss.
      if (
        action === 'sign-up' &&
        error.message.toLowerCase().includes('user already registered')
      ) {
        setAlreadyRegistered(true)
      } else {
        toast.error(error.message)
      }
      return
    }

    setIsLoading(false)
    // Redirect to ?next= param if present, otherwise to the dashboard
    const next = new URLSearchParams(window.location.search).get('next')
    router.push(next && next.startsWith('/') ? next : '/dashboard')
    router.refresh()
  }

  return (
    <div {...props}>
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

        {/* TODO: add /reset-password route (Supabase resetPasswordForEmail flow)
             so the link below can point to a real page. For now it is omitted. */}
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
              {/* Uncomment once /reset-password is built:
              <Link
                href="/reset-password"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-white/20 hover:text-white/80"
              >
                Reset password
              </Link>
              */}
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
                <Link href={`/sign-up${nextParam}`} className="font-medium text-white/70 underline underline-offset-4 hover:text-cm-green">
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link href={`/sign-in${nextParam}`} className="font-medium text-white/70 underline underline-offset-4 hover:text-cm-green">
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
