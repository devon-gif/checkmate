import 'server-only'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore
    })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Respect the `next` param so sign-in from /try or /cases/new lands correctly.
  // Default to /dashboard if no next param is provided.
  const next = requestUrl.searchParams.get('next')
  const redirectTo = next && next.startsWith('/') ? next : '/dashboard'

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
}

