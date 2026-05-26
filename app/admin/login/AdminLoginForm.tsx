'use client'

import * as React from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

import { IconSpinner } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AdminLoginForm() {
  const supabase = createClientComponentClient()
  const [email, setEmail] = React.useState('')
  const [isEmailLoading, setIsEmailLoading] = React.useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)

  const isLoading = isEmailLoading || isGoogleLoading

  function adminCallbackUrl() {
    const callbackUrl = new URL('/api/auth/callback', window.location.origin)
    callbackUrl.searchParams.set('next', '/admin/login')
    return callbackUrl.toString()
  }

  async function handleEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsEmailLoading(true)
    setError(null)
    setMessage(null)

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: adminCallbackUrl()
      }
    })

    if (signInError) {
      setError(signInError.message)
      setIsEmailLoading(false)
      return
    }

    setMessage('Check your email for the admin sign-in link.')
    setIsEmailLoading(false)
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    setError(null)
    setMessage(null)

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: adminCallbackUrl()
      }
    })

    if (oauthError) {
      setError(oauthError.message)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/25 bg-red-400/8 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="rounded-xl border border-cm-green/25 bg-cm-green/8 px-4 py-3 text-sm text-cm-green"
        >
          {message}
        </div>
      )}

      <button
        type="button"
        disabled={isLoading}
        onClick={handleGoogleSignIn}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGoogleLoading && <IconSpinner className="animate-spin" />}
        Continue with Google
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] font-medium uppercase tracking-widest text-white/30">
          or use email
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-white/70">Email</Label>
          <Input
            name="email"
            type="email"
            value={email}
            placeholder="devonavich0@gmail.com"
            autoComplete="email"
            required
            onChange={event => setEmail(event.target.value)}
            className="border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-cm-green/50 focus:ring-cm-green/20"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cm-green px-6 py-3 text-sm font-semibold text-cm-bg shadow-[0_0_24px_rgba(122,226,207,0.3)] transition-all hover:bg-cm-green/90 hover:shadow-[0_0_36px_rgba(122,226,207,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEmailLoading && <IconSpinner className="animate-spin" />}
          Email me an admin sign-in link
        </button>
      </form>

      <p className="text-center text-sm text-white/40">
        <Link
          href="/"
          className="font-medium text-white/65 underline underline-offset-4 transition hover:text-cm-green"
        >
          Back to homepage
        </Link>
      </p>
    </div>
  )
}
