/**
 * GET /api/cron/scam-intel-digest  — DISABLED STUB (Scam Intel v2)
 *
 * A non-active skeleton for a future daily scam-intel digest. It does NOT
 * scrape anything and does NOT change analyzer scoring. For now it only counts
 * pending/approved rows and returns JSON.
 *
 * Gating:
 *   - Returns 404 unless ENABLE_SCAM_INTEL_CRON=true (feature is off by default).
 *   - If CRON_SECRET is set, the request must send `Authorization: Bearer
 *     <CRON_SECRET>`; otherwise the call is rejected 401.
 *
 * FUTURE WORK (intentionally not built yet): any automated ingestion must write
 * to scam_intel_pending and REQUIRE admin review before promotion. Automation
 * must never write to the in-code catalog or change scoring. See
 * docs/SCAM_INTEL.md.
 */
import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { type Database } from '@/lib/db_types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function serviceClient() {
  return createClient<Database, 'public', any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // Feature flag — off by default.
  if (process.env.ENABLE_SCAM_INTEL_CRON !== 'true') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Optional shared-secret check for scheduler calls.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const sb = serviceClient()

  async function count(reviewStatus: string): Promise<number> {
    const { count, error } = await sb
      .from('scam_intel_pending')
      .select('id', { count: 'exact', head: true })
      .eq('review_status', reviewStatus)
    if (error) {
      console.error(`[cron/scam-intel-digest] count(${reviewStatus}) failed code=${error.code ?? 'none'} message=${error.message}`)
      return 0
    }
    return count ?? 0
  }

  const [pending, reviewed, promoted, rejected] = await Promise.all([
    count('pending'),
    count('reviewed'),
    count('promoted'),
    count('rejected')
  ])

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    enabled: true,
    note: 'Stub digest — no scraping, no scoring impact. Promotion requires admin review.',
    counts: { pending, reviewed, promoted, rejected }
  })
}
