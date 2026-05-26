import 'server-only'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { areAdminToolsEnabled, isAdminEmail } from '@/lib/admin/access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GENERIC_RESPONSE = {
  ok: true,
  message: 'If this email is authorized, a sign-in link will be sent.'
}

function appBaseUrl(req: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, '')

  const url = new URL(req.url)
  return url.origin
}

function supabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export async function POST(req: Request) {
  if (!areAdminToolsEnabled()) {
    return NextResponse.json(
      { error: 'admin_tools_unavailable' },
      { status: 404 }
    )
  }

  let body: { email?: unknown }
  try {
    body = (await req.json()) as { email?: unknown }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 })
  }

  if (!isAdminEmail(email)) {
    return NextResponse.json(GENERIC_RESPONSE)
  }

  const supabase = supabaseAuthClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'auth_not_configured' },
      { status: 503 }
    )
  }

  // Point Supabase at the CLIENT-SIDE `/auth/callback` bridge, not the
  // server-only `/api/auth/callback` route.
  //
  // Supabase magic links may come back with `?code=…` (PKCE flow) or
  // `#access_token=…` (implicit / hash flow). Hash fragments never reach
  // the server, so a route handler can't establish the session for them.
  // The client component at /auth/callback handles BOTH shapes and then
  // navigates to ?next=.
  //
  // ⚠ Supabase project setting requirement (one-time, in dashboard):
  //   Authentication → URL Configuration → Redirect URLs must include
  //     https://checkray.app/auth/callback
  //     http://localhost:3000/auth/callback
  //   If those entries are missing, Supabase silently falls back to the
  //   project's Site URL and the magic link will land in the wrong place.
  const redirectTo = new URL('/auth/callback', appBaseUrl(req))
  redirectTo.searchParams.set('next', '/admin')

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo.toString()
    }
  })

  if (error) {
    console.error('[admin-magic-link] signInWithOtp failed:', error.message)
    return NextResponse.json(
      { error: 'magic_link_failed' },
      { status: 500 }
    )
  }

  return NextResponse.json(GENERIC_RESPONSE)
}
