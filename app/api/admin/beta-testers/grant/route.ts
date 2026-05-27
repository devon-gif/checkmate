import 'server-only'

import { NextResponse } from 'next/server'

import { getAdminAccess } from '@/lib/admin/access'
import {
  betaServiceClient,
  isBetaPlan,
  normalizeBetaEmail
} from '@/lib/billing/beta-access'

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

  let body: {
    email?: unknown
    plan?: unknown
    expiration?: unknown
    notes?: unknown
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = normalizeBetaEmail(
    typeof body.email === 'string' ? body.email : ''
  )
  const plan = body.plan
  const expiration =
    typeof body.expiration === 'string' ? body.expiration : '30'
  const notes =
    typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null

  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'invalid_email', message: 'A valid email is required.' },
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

  const payload = {
    email,
    plan,
    status: 'active',
    expires_at: expiresAtFor(expiration),
    notes,
    created_by: access.userId,
    revoked_at: null,
    revoked_by: null
  }

  const { data: existing } = await sb
    .from('beta_access' as any)
    .select('id')
    .eq('email', email)
    .maybeSingle()

  const result = existing
    ? await sb
        .from('beta_access' as any)
        .update(payload)
        .eq('email', email)
        .select('id,email,plan,status,expires_at,notes,created_at,updated_at')
        .maybeSingle()
    : await sb
        .from('beta_access' as any)
        .insert(payload)
        .select('id,email,plan,status,expires_at,notes,created_at,updated_at')
        .maybeSingle()

  if (result.error) {
    console.error('[admin/beta-testers/grant] write failed:', result.error.message)
    return NextResponse.json(
      { error: 'write_failed', message: result.error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, betaAccess: result.data })
}
