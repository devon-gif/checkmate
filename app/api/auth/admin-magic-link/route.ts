import 'server-only'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { areAdminToolsEnabled, isAdminEmail } from '@/lib/admin/access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Generic "we got something, can't say more for privacy reasons" response.
 * Used when the email submitted is NOT on the admin allowlist, so that
 * we don't reveal which addresses are admin to anyone enumerating.
 */
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
  // ── Safe debug log (no secrets) ────────────────────────────────────────
  // These get printed once per request into Vercel function logs so the
  // operator can answer "why did my admin magic link not send?" without
  // any client-side disclosure. Email value is masked for the request log.
  const enabled = areAdminToolsEnabled()

  if (!enabled) {
    console.warn(
      '[admin-magic-link] request rejected: ENABLE_ADMIN_TOOLS is not set to "true". ' +
        `current=${JSON.stringify(process.env.ENABLE_ADMIN_TOOLS ?? null)}`
    )
    return NextResponse.json(
      { error: 'admin_tools_disabled', message: 'Admin tools are not enabled.' },
      { status: 404 }
    )
  }

  let body: { email?: unknown }
  try {
    body = (await req.json()) as { email?: unknown }
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be JSON.' },
      { status: 400 }
    )
  }

  const submittedEmail =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!submittedEmail) {
    return NextResponse.json(
      { error: 'email_required', message: 'Email is required.' },
      { status: 400 }
    )
  }

  const allowedEmail = isAdminEmail(submittedEmail)

  // Safe debug print — email is masked (local-part first char + domain).
  const maskedEmail = submittedEmail.replace(
    /^(.).*?(@.*)$/,
    (_m, first: string, domain: string) => `${first}***${domain}`
  )
  console.log(
    `[admin-magic-link] request received: email=${maskedEmail} ` +
      `admin_tools_enabled=${enabled} admin_email_match=${allowedEmail}`
  )

  if (!allowedEmail) {
    // Return the generic response so we don't reveal who is admin.
    return NextResponse.json(GENERIC_RESPONSE)
  }

  const supabase = supabaseAuthClient()
  if (!supabase) {
    console.error(
      '[admin-magic-link] Supabase public env vars missing — cannot send link.'
    )
    return NextResponse.json(
      {
        error: 'auth_not_configured',
        message: 'Auth is not configured on this deployment.'
      },
      { status: 503 }
    )
  }

  // Point Supabase at the CLIENT-SIDE `/auth/callback` bridge, not the
  // server-only `/api/auth/callback` route.
  //
  // Supabase magic links may come back with `?code=…` (PKCE flow) or
  // `#access_token=…` (implicit / hash flow). Hash fragments never reach
  // the server, so a route handler cannot establish the session for them.
  // The client component at /auth/callback handles BOTH shapes and then
  // navigates to ?next=.
  //
  // ⚠ Supabase project setting requirement (one-time, in dashboard):
  //   Authentication → URL Configuration → Redirect URLs must include
  //     https://checkray.app/auth/callback
  //     https://www.checkray.app/auth/callback
  //     http://localhost:3000/auth/callback
  //   If those entries are missing, Supabase silently falls back to the
  //   project's Site URL and the magic link will land in the wrong place.
  const redirectTo = new URL('/auth/callback', appBaseUrl(req))
  redirectTo.searchParams.set('next', '/admin')

  console.log(
    `[admin-magic-link] sending OTP with redirectTo=${redirectTo.toString()}`
  )

  const { error } = await supabase.auth.signInWithOtp({
    email: submittedEmail,
    options: {
      emailRedirectTo: redirectTo.toString()
    }
  })

  if (error) {
    console.error(
      `[admin-magic-link] supabase signInWithOtp failed: ${error.message}`
    )
    return NextResponse.json(
      {
        error: 'supabase_otp_failed',
        message: 'Could not send the admin sign-in link.'
      },
      { status: 502 }
    )
  }

  console.log(
    `[admin-magic-link] OTP sent successfully for email=${maskedEmail}`
  )
  return NextResponse.json(GENERIC_RESPONSE)
}
