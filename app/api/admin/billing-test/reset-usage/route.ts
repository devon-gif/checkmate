/**
 * POST /api/admin/billing-test/reset-usage
 *
 * Deletes the signed-in admin's `usage_events` rows for the CURRENT
 * calendar month so we can re-test monthly-limit behaviour without
 * waiting for the next month.
 *
 * Does NOT delete saved cases or risk reports — those live in `cases`
 * and `risk_reports`. Only `usage_events` is touched.
 *
 * Triple-gated identically to set-plan:
 *   1. ENABLE_ADMIN_BILLING_TEST_TOOLS=true → 404 otherwise
 *   2. Authenticated session                → 401 otherwise
 *   3. Email in ADMIN_EMAILS                → 403 otherwise
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import {
  canUseAdminBillingTest,
  isAdminBillingTestEnabled,
  isAdminUser
} from '@/lib/admin/access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export async function POST() {
  if (!isAdminBillingTestEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!(await canUseAdminBillingTest()) || !(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const sb = serviceClient()
  if (!sb) {
    return NextResponse.json(
      { error: 'supabase_not_configured' },
      { status: 503 }
    )
  }

  // Boundary: start of the current calendar month, UTC. The access gate
  // uses the same boundary so deleting >= monthStart resets the counter
  // exactly.
  const now = new Date()
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString()

  const { error } = await sb
    .from('usage_events' as any)
    .delete()
    .eq('user_id', session.user.id)
    .eq('event_type', 'check_created')
    .gte('created_at', monthStart)

  if (error) {
    console.error(
      '[admin/billing-test/reset-usage] delete failed:',
      error.message
    )
    return NextResponse.json(
      { error: 'delete_failed', message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, since: monthStart })
}
