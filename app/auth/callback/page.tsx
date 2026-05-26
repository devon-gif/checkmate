'use client'

/**
 * app/auth/callback/page.tsx
 *
 * Client-side Supabase auth callback bridge.
 *
 * Why this exists (and is a Client Component, not a server route):
 *
 *   Supabase magic links and OAuth callbacks come back in one of two
 *   shapes depending on the project's auth flow setting:
 *
 *     PKCE / auth-code flow:   .../auth/callback?code=XXX&next=/admin
 *     Implicit / hash flow:    .../auth/callback?next=/admin#access_token=YYY&refresh_token=ZZZ&type=magiclink
 *
 *   URL fragments (#…) are NEVER sent to the server, so a server-only
 *   /api/auth/callback can ONLY handle the PKCE shape. The hash shape
 *   has to be parsed in the browser. That is why this page exists.
 *
 *   `createClientComponentClient()` ships with `detectSessionInUrl: true`,
 *   so on mount it parses the hash, calls setSession internally, and
 *   the `@supabase/auth-helpers-nextjs` cookie writer persists the
 *   session into cookies. Subsequent server components see the session.
 *
 * Required redirect-allowlist entries in the Supabase project:
 *   - https://checkray.app/auth/callback
 *   - http://localhost:3000/auth/callback   (local dev)
 *
 * The `next` query param is preserved across both flows so the user
 * lands back at /admin (or wherever) after sign-in.
 */

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function isSafeRelativePath(value: string | null | undefined): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  )
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [statusText, setStatusText] = React.useState('Signing you in…')
  const [errorText, setErrorText] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const supabase = createClientComponentClient()

    const nextParam = searchParams?.get('next') ?? null
    const next = isSafeRelativePath(nextParam) ? nextParam : '/dashboard'

    // Surface Supabase auth errors that come back in the query string
    // (e.g. ?error=access_denied&error_description=…). These are sent
    // by Supabase when the magic link is expired / already used / etc.
    const queryError =
      searchParams?.get('error_description') ?? searchParams?.get('error')
    if (queryError) {
      setErrorText(queryError)
      setStatusText('We could not sign you in.')
      return
    }

    async function run() {
      try {
        // ── PKCE / auth-code flow: ?code=... ────────────────────────────
        const code = searchParams?.get('code') ?? null
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (cancelled) return
          if (error) {
            setErrorText(error.message)
            setStatusText('We could not sign you in.')
            return
          }
          router.replace(next)
          return
        }

        // ── Implicit / hash flow: #access_token=... ─────────────────────
        // createClientComponentClient parses the hash itself on construction
        // (detectSessionInUrl is true by default) and persists the session
        // via the auth-helpers cookie writer. We just need to wait one
        // tick for that to happen, then confirm we have a session.
        //
        // If for some reason auto-detect didn't catch it (older browser,
        // race condition, project misconfig), fall back to parsing the
        // hash manually and calling setSession.
        const hash = typeof window !== 'undefined' ? window.location.hash : ''

        if (hash && hash.includes('access_token')) {
          // Give the helper a tick to do its thing.
          await new Promise(resolve => setTimeout(resolve, 50))

          let { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            // Manual fallback — strip the leading '#' and parse k/v pairs.
            const params = new URLSearchParams(hash.replace(/^#/, ''))
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')
            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              })
              if (cancelled) return
              if (error) {
                setErrorText(error.message)
                setStatusText('We could not sign you in.')
                return
              }
              const fresh = await supabase.auth.getSession()
              session = fresh.data.session
            }
          }

          if (cancelled) return
          if (session) {
            // Strip the hash so it doesn't follow us into /admin and
            // confuse the browser/back button.
            try {
              window.history.replaceState(
                null,
                '',
                window.location.pathname + window.location.search
              )
            } catch {
              // Non-fatal — replaceState is supported everywhere we care.
            }
            router.replace(next)
            return
          }
        }

        // ── No code and no hash: nothing to do here. ────────────────────
        // Either the user landed on /auth/callback directly, or both
        // flows failed silently. Send them to sign-in with a hint.
        if (!cancelled) {
          setErrorText('Missing auth payload — try requesting a new link.')
          setStatusText('We could not sign you in.')
        }
      } catch (err) {
        if (cancelled) return
        setErrorText(
          err instanceof Error ? err.message : 'Unexpected error during sign-in.'
        )
        setStatusText('We could not sign you in.')
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center bg-deep px-4 py-16 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur">
        <p className="text-base font-medium text-white">{statusText}</p>
        {errorText ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-red-300/80">
              {errorText}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href="/admin/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:text-white"
              >
                Request a new admin link
              </a>
              <a
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm text-white/55 transition hover:border-white/20 hover:text-white/80"
              >
                Go to regular sign-in
              </a>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-white/45">
            One moment while we finish setting up your session.
          </p>
        )}
      </div>
    </div>
  )
}
