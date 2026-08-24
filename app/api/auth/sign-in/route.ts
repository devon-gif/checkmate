import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function jsonError(message: string, status = 400, code = 'auth_error') {
  return NextResponse.json({ error: message, code }, { status })
}

function isTransportFailure(error: { message?: string; status?: number }) {
  const message = (error.message || '').toLowerCase()
  return (
    error.status === 0 ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('enotfound') ||
    message.includes('econnrefused') ||
    message.includes('etimedout')
  )
}

export async function POST(req: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error('[auth/sign-in] Supabase public env vars are missing')
    return jsonError(
      'Sign in is temporarily unavailable. Please try again shortly.',
      503,
      'auth_not_configured'
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid sign-in request.', 400, 'invalid_request')
  }

  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : ''
  const password = typeof record.password === 'string' ? record.password : ''

  if (!email || !email.includes('@') || !password) {
    return jsonError('Enter your email and password.', 400, 'invalid_credentials')
  }

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (isTransportFailure(error)) {
        console.error('[auth/sign-in] Supabase is unreachable:', error.message)
        return jsonError(
          'The account service is temporarily unavailable. Please try again shortly.',
          503,
          'auth_unavailable'
        )
      }

      console.warn('[auth/sign-in] Supabase rejected sign in:', error.message)
      const status = error.status && error.status >= 400 && error.status < 500 ? error.status : 400
      return jsonError(error.message, status, error.code ?? 'sign_in_failed')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(
      '[auth/sign-in] Supabase request failed:',
      err instanceof Error ? err.message : String(err)
    )
    return jsonError(
      'The account service is temporarily unavailable. Please try again shortly.',
      503,
      'auth_unavailable'
    )
  }
}
