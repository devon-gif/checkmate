import 'server-only'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isSafeRelativePath(value: string | null | undefined): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  )
}

function signInErrorRedirect(requestUrl: URL, reason: string) {
  const url = new URL('/sign-in', requestUrl.origin)
  url.searchParams.set('authError', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  // Supabase email-confirmation links return here with a one-time auth code.
  // We must exchange that code for a cookie-backed session BEFORE sending the
  // user to a protected route such as /dashboard.
  const requestUrl = new URL(request.url)

  const providerError =
    requestUrl.searchParams.get('error_description') ??
    requestUrl.searchParams.get('error')
  if (providerError) {
    console.warn('[auth/callback] provider returned an auth error')
    return signInErrorRedirect(requestUrl, 'confirmation_failed')
  }

  const code = requestUrl.searchParams.get('code')
  if (!code) {
    console.warn('[auth/callback] missing auth code')
    return signInErrorRedirect(requestUrl, 'missing_code')
  }

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({
    cookies: () => cookieStore
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.warn('[auth/callback] code exchange failed:', error.message)
    return signInErrorRedirect(requestUrl, 'confirmation_failed')
  }

  // Respect a validated `next` param so a user who began from a protected
  // page returns there after confirmation. New accounts default to dashboard.
  const next = requestUrl.searchParams.get('next')
  const redirectTo = isSafeRelativePath(next) ? next : '/dashboard'

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
}
