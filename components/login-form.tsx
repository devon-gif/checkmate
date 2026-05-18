'use client'

import * as React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

import { Button } from '@/components/ui/button'
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
      toast.error(error.message)
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
          <div className="flex flex-col gap-y-1">
            <Label>Email</Label>
            <Input
              name="email"
              type="email"
              value={formState.email}
              onChange={e =>
                setFormState(prev => ({
                  ...prev,
                  email: e.target.value
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-y-1">
            <Label>Password</Label>
            <Input
              name="password"
              type="password"
              value={formState.password}
              onChange={e =>
                setFormState(prev => ({
                  ...prev,
                  password: e.target.value
                }))
              }
            />
          </div>
        </fieldset>

        {action === 'sign-up' && (
          <div className="mt-4">
            <ConsentCheckbox
              checked={consentChecked}
              onCheckedChange={setConsentChecked}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="mt-4 flex items-center">
          <Button
            disabled={isLoading || (action === 'sign-up' && !consentChecked)}
          >
            {isLoading && <IconSpinner className="mr-2 animate-spin" />}
            {action === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </Button>
          <p className="ml-4">
            {action === 'sign-in' ? (
              <>
                Don&apos;t have an account?{' '}
                <Link href={`/sign-up${nextParam}`} className="font-medium">
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link href={`/sign-in${nextParam}`} className="font-medium">
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
