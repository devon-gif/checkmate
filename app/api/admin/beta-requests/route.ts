/**
 * GET /api/admin/beta-requests
 *
 * Lists every beta request (newest first) for the /admin pending-requests
 * panel. Admin-gated identically to the other /api/admin/* routes:
 *   1. ENABLE_ADMIN_TOOLS=true (server env)  → 404 otherwise
 *   2. authenticated session                  → 401 otherwise
 *   3. email in ADMIN_EMAILS                  → 403 otherwise
 *
 * Read-only. Approval/rejection happens via the sibling `/approve` and
 * `/reject` routes so each state transition is explicit and auditable.
 */
import 'server-only'

import { NextResponse } from 'next/server'

import { getAdminAccess } from '@/lib/admin/access'
import { listBetaRequests } from '@/lib/billing/beta-access'

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

export async function GET() {
  const access = await getAdminAccess()
  if (!access.ok) return adminErrorResponse(access.reason)

  const requests = await listBetaRequests()
  return NextResponse.json({ ok: true, requests })
}
