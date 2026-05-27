import 'server-only'

import { NextResponse } from 'next/server'

import { getAdminAccess } from '@/lib/admin/access'
import { betaServiceClient, normalizeBetaEmail } from '@/lib/billing/beta-access'

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
    body = await req.json()
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

  const { error } = await sb
    .from('beta_access' as any)
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: access.userId
    })
    .eq('email', email)

  if (error) {
    console.error('[admin/beta-testers/revoke] update failed:', error.message)
    return NextResponse.json(
      { error: 'write_failed', message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
