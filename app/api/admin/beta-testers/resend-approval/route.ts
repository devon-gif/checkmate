/**
 * POST /api/admin/beta-testers/resend-approval
 *
 * Resends the "you're approved for the CheckRay beta" email to an
 * existing active beta tester. Useful when the original send failed
 * (e.g. Resend outage during the initial grant) or the user lost the
 * email and asked the admin to re-send.
 *
 * Body: { email: string }
 *
 * No DB writes happen here — the beta_access row is read but not
 * modified, so calling this repeatedly is safe and idempotent.
 *
 * Admin-gated identically to the other /api/admin/* routes (404 / 401 / 403).
 */
import 'server-only'

import { NextResponse } from 'next/server'

import { getAdminAccess } from '@/lib/admin/access'
import {
  betaServiceClient,
  isBetaAccessActive,
  isBetaPlan,
  normalizeBetaEmail,
  type BetaAccessRow
} from '@/lib/billing/beta-access'
import { sendBetaApprovalEmail } from '@/lib/billing/beta-approval-email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function adminErrorResponse(reason: 'disabled' | 'unauthenticated' | 'forbidden') {
  if (reason === 'disabled') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (reason === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}

export async function POST(req: Request) {
  const access = await getAdminAccess()
  if (!access.ok) return adminErrorResponse(access.reason)

  let body: { email?: unknown }
  try {
    body = (await req.json()) as { email?: unknown }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = normalizeBetaEmail(
    typeof body.email === 'string' ? body.email : ''
  )
  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'invalid_email', message: 'A valid email is required.' },
      { status: 400 }
    )
  }

  const sb = betaServiceClient()
  if (!sb) {
    return NextResponse.json(
      { error: 'supabase_not_configured' },
      { status: 503 }
    )
  }

  const { data, error } = await sb
    .from('beta_access' as any)
    .select('id,email,plan,status,expires_at,notes,created_at,updated_at')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.error(
      '[admin/beta-testers/resend-approval] lookup failed:',
      error.message
    )
    return NextResponse.json(
      { error: 'lookup_failed', message: error.message },
      { status: 500 }
    )
  }

  const row = data as BetaAccessRow | null
  if (!row) {
    return NextResponse.json(
      {
        error: 'not_found',
        message: 'No beta access row found for that email.'
      },
      { status: 404 }
    )
  }
  if (!isBetaPlan(row.plan)) {
    return NextResponse.json(
      {
        error: 'invalid_plan',
        message: `Unexpected plan value: ${row.plan}`
      },
      { status: 500 }
    )
  }
  if (!isBetaAccessActive(row)) {
    return NextResponse.json(
      {
        error: 'inactive',
        message:
          'This beta access is no longer active. Grant a fresh beta access first.'
      },
      { status: 409 }
    )
  }

  const sendResult = await sendBetaApprovalEmail({
    toEmail: row.email,
    plan: row.plan,
    expiresAt: row.expires_at
  })

  if (!sendResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        email_sent: false,
        email_error: sendResult.message
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true, email_sent: true })
}
