'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

import { IconSpinner } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AdminLoginFormProps {
  redirectTo: string
}

export function AdminLoginForm({ redirectTo }: AdminLoginFormProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isPasswordLoading, setIsPasswordLoading] = React.useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isLoading = isPasswordLoading || isGoogleLoading

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPasswordLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      setError(signInError.message)
      setIsPasswordLoading(false)
      return
    }

    const res = await fetch('/api/admin/session', {
      method: 'GET',
      cache: 'no-store'
    })

    if (res.ok) {
      router.push(redirectTo)
      router.refresh()
      return
    }

    await supabase.auth.signOut()

    if (res.status === 404) {
      setError('Admin tools are not available.')
    } else if (res.status === 403) {
      setError('This account is not authorized for admin access.')
    } else {
      setError('Unable to verify admin access. Please try again.')
    }

    setIsPasswordLoading(false)
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    setError(null)

    const callbackUrl = new URL('/api/auth/callback', window.location.origin)
    callbackUrl.searchParams.set('next', '/admin/login')

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString()
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
          or use password
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-white/70">Password</Label>
          <Input
            name="password"
            type="password"
            value={password}
            placeholder="Password"
            autoComplete="current-password"
            required
            onChange={event => setPassword(event.target.value)}
            className="border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-cm-green/50 focus:ring-cm-green/20"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cm-green px-6 py-3 text-sm font-semibold text-cm-bg shadow-[0_0_24px_rgba(122,226,207,0.3)] transition-all hover:bg-cm-green/90 hover:shadow-[0_0_36px_rgba(122,226,207,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPasswordLoading && <IconSpinner className="animate-spin" />}
          Sign in with email
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
