/**
 * POST /api/admin/beta-requests/reject
 *
 * Rejects a pending beta request without granting beta_access. This is
 * intentionally a no-op on the beta_access table — rejection is purely
 * a state change + audit on beta_requests.
 *
 * Body: { id: <uuid>, reason?: string }
 *
 * Admin-gated identically to the other /api/admin/* routes (404/401/403).
 */
import 'server-only'

import { NextResponse } from 'next/server'

import { getAdminAccess } from '@/lib/admin/access'
import { betaServiceClient } from '@/lib/billing/beta-access'

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

  let body: { id?: unknown }
  try {
    body = (await req.json()) as { id?: unknown }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) {
    return NextResponse.json(
      { error: 'invalid_id', message: 'Request id is required.' },
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

  // Conditional update so a stale UI can't reject an already-decided row.
  const { data, error } = await sb
    .from('beta_requests' as any)
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: access.email
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id,status')
    .maybeSingle()

  if (error) {
    console.error('[admin/beta-requests/reject] update failed:', error.message)
    return NextResponse.json(
      { error: 'update_failed', message: error.message },
      { status: 500 }
    )
  }

  if (!data) {
    // Either the row doesn't exist or it's already approved/rejected.
    return NextResponse.json(
      {
        error: 'not_pending',
        message: 'Request not found or already resolved.'
      },
      { status: 409 }
    )
  }

  return NextResponse.json({ ok: true, request_id: id })
}
