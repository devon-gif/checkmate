import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isSafeRelativePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  )
}

function jsonError(message: string, status = 400, code = 'auth_error') {
  return NextResponse.json({ error: message, code }, { status })
}

export async function POST(req: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error('[auth/sign-up] Supabase public env vars are missing')
    return jsonError(
      'Account creation is temporarily unavailable. Please try again shortly.',
      503,
      'auth_not_configured'
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid signup request.', 400, 'invalid_request')
  }

  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : ''
  const password = typeof record.password === 'string' ? record.password : ''
  const next = isSafeRelativePath(record.next) ? record.next : '/dashboard'

  if (!email || !email.includes('@')) {
    return jsonError('Enter a valid email address.', 400, 'invalid_email')
  }

  if (password.length < 6) {
    return jsonError(
      'Password must be at least 6 characters.',
      400,
      'invalid_password'
    )
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  ).replace(/\/$/, '')
  const callbackUrl = new URL('/api/auth/callback', appUrl)
  callbackUrl.searchParams.set('next', next)

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl.toString()
      }
    })

    if (error) {
      console.warn('[auth/sign-up] Supabase rejected signup:', error.message)
      const status = error.status && error.status >= 400 && error.status < 500 ? error.status : 400
      return jsonError(error.message, status, error.code ?? 'sign_up_failed')
    }

    return NextResponse.json({
      ok: true,
      requiresConfirmation: !data.session
    })
  } catch (err) {
    console.error(
      '[auth/sign-up] Supabase request failed:',
      err instanceof Error ? err.message : String(err)
    )
    return jsonError(
      'We could not reach the account service. Please try again in a moment.',
      503,
      'auth_unavailable'
    )
  }
}
