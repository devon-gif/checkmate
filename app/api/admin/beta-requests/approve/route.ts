/**
 * POST /api/admin/beta-requests/approve
 *
 * Approves a pending beta request:
 *   1. Updates beta_requests.status = 'approved' + audit fields
 *   2. Upserts the corresponding beta_access row (the user's actual grant)
 *
 * Body:
 *   { id: <uuid>, plan: 'beta_basic' | 'beta_plus' | 'beta_family', expiration?: '30'|'60'|'90'|'none' }
 *
 * The DB writes are not transactional across two tables (PostgREST limits),
 * but we do beta_access FIRST so that "approved" is only ever set on
 * beta_requests if the grant actually landed. If the grant fails, the
 * request stays pending and the admin can retry without orphaned state.
 *
 * Admin-gated identically to the other /api/admin/* routes (404/401/403).
 */
import 'server-only'

import { NextResponse } from 'next/server'

import { getAdminAccess } from '@/lib/admin/access'
import {
  betaServiceClient,
  isBetaPlan,
  normalizeBetaEmail,
  type BetaPlan
} from '@/lib/billing/beta-access'
import { sendBetaApprovalEmail } from '@/lib/billing/beta-approval-email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const EXPIRATION_DAYS = new Set(['30', '60', '90', 'none'])

function adminErrorResponse(reason: 'disabled' | 'unauthenticated' | 'forbidden') {
  if (reason === 'disabled') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (reason === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}

function expiresAtFor(value: string) {
  if (value === 'none') return null
  const days = Number(value)
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export async function POST(req: Request) {
  const access = await getAdminAccess()
  if (!access.ok) return adminErrorResponse(access.reason)

  let body: { id?: unknown; plan?: unknown; expiration?: unknown }
  try {
    body = (await req.json()) as {
      id?: unknown
      plan?: unknown
      expiration?: unknown
    }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id : ''
  const plan = body.plan
  const expiration =
    typeof body.expiration === 'string' ? body.expiration : '30'

  if (!id) {
    return NextResponse.json(
      { error: 'invalid_id', message: 'Request id is required.' },
      { status: 400 }
    )
  }
  if (!isBetaPlan(plan)) {
    return NextResponse.json(
      {
        error: 'invalid_plan',
        message: 'Plan must be beta_basic, beta_plus, or beta_family.'
      },
      { status: 400 }
    )
  }
  if (!EXPIRATION_DAYS.has(expiration)) {
    return NextResponse.json(
      { error: 'invalid_expiration', message: 'Expiration is invalid.' },
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

  // 1. Look up the request and grab its email + name. We bail if the
  //    row is already approved/rejected to avoid double-grants on a
  //    stale UI. `name` flows into the approval email greeting.
  const { data: reqRow, error: reqErr } = await sb
    .from('beta_requests' as any)
    .select('id,email,name,status')
    .eq('id', id)
    .maybeSingle()

  if (reqErr) {
    console.error('[admin/beta-requests/approve] lookup failed:', reqErr.message)
    return NextResponse.json(
      { error: 'lookup_failed', message: reqErr.message },
      { status: 500 }
    )
  }
  if (!reqRow) {
    return NextResponse.json(
      { error: 'not_found', message: 'Request not found.' },
      { status: 404 }
    )
  }
  const requestRow = reqRow as {
    id: string
    email: string
    name: string | null
    status: string
  }
  if (requestRow.status !== 'pending') {
    return NextResponse.json(
      {
        error: 'already_resolved',
        message: `Request is already ${requestRow.status}.`
      },
      { status: 409 }
    )
  }

  const email = normalizeBetaEmail(requestRow.email)
  if (!email) {
    return NextResponse.json(
      { error: 'invalid_email', message: 'Stored email is empty or invalid.' },
      { status: 400 }
    )
  }

  // 2. Upsert the beta_access grant FIRST. If this fails, the request
  //    stays pending and the admin sees the error in the UI — much
  //    better than marking it approved with no actual access row.
  const grantPayload = {
    email,
    plan,
    status: 'active' as const,
    expires_at: expiresAtFor(expiration),
    notes: `Approved from beta request ${requestRow.id} by ${access.email}`,
    created_by: access.userId,
    revoked_at: null,
    revoked_by: null
  }

  const { data: existing } = await sb
    .from('beta_access' as any)
    .select('id')
    .eq('email', email)
    .maybeSingle()

  const grantResult = existing
    ? await sb
        .from('beta_access' as any)
        .update(grantPayload)
        .eq('email', email)
        .select('id,email,plan,status,expires_at,notes,created_at,updated_at')
        .maybeSingle()
    : await sb
        .from('beta_access' as any)
        .insert(grantPayload)
        .select('id,email,plan,status,expires_at,notes,created_at,updated_at')
        .maybeSingle()

  if (grantResult.error) {
    console.error(
      '[admin/beta-requests/approve] beta_access write failed:',
      grantResult.error.message
    )
    return NextResponse.json(
      {
        error: 'grant_failed',
        message: grantResult.error.message
      },
      { status: 500 }
    )
  }

  // 3. Send the approval email. We do NOT roll back the grant on email
  //    failure — beta_access is the durable record. The admin UI shows
  //    a partial-success message when this returns ok=false; admins can
  //    re-send the email via /api/admin/beta-testers/resend-approval.
  const grantedRow = grantResult.data as
    | { email: string; plan: BetaPlan; expires_at: string | null }
    | null
  let emailSent = false
  let emailError: string | null = null
  if (grantedRow) {
    const sendResult = await sendBetaApprovalEmail({
      toEmail: grantedRow.email,
      toName: requestRow.name,
      plan: grantedRow.plan,
      expiresAt: grantedRow.expires_at
    })
    emailSent = sendResult.ok
    if (!sendResult.ok) emailError = sendResult.message
  }

  // 4. Mark the request approved. If this fails, the user already has
  //    beta access — log loudly but return success so the admin doesn't
  //    keep re-clicking and double-granting.
  const { error: markErr } = await sb
    .from('beta_requests' as any)
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: access.email
    })
    .eq('id', id)

  if (markErr) {
    console.error(
      '[admin/beta-requests/approve] request mark-approved failed (grant already applied):',
      markErr.message
    )
  }

  return NextResponse.json({
    email_sent: emailSent,
    email_error: emailError,
    ok: true,
    betaAccess: grantResult.data,
    request_id: id,
    request_mark_warning: markErr ? markErr.message : null
  })
}
