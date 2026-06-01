/**
 * /api/admin/scam-intel/pending
 *
 *   GET  — list scam-intel pending sources (newest first)
 *   POST — create a new pending source (admin pastes a link / notes)
 *
 * Admin-gated identically to the other /api/admin/* routes:
 *   1. ENABLE_ADMIN_TOOLS=true (server env)  → 404 otherwise
 *   2. authenticated session                  → 401 otherwise
 *   3. email in ADMIN_EMAILS                  → 403 otherwise
 *
 * SAFETY:
 *   - Reached only via the service-role client (scam_intel_pending has a
 *     no-public-access RLS policy).
 *   - `notes` may contain pasted user-report text — it is NEVER logged.
 *   - Nothing here affects analyzer scoring. A pending source only influences
 *     scoring after an admin promotes it AND a human mirrors it into the
 *     in-code catalog. See docs/SCAM_INTEL.md.
 */
import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getAdminAccess } from '@/lib/admin/access'
import { type Database } from '@/lib/db_types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SOURCE_TYPES = [
  'ftc',
  'fbi_ic3',
  'cisa',
  'phishtank',
  'openphish',
  'linkedin',
  'reddit',
  'user_report',
  'other'
] as const

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const

function adminErrorResponse(reason: 'disabled' | 'unauthenticated' | 'forbidden') {
  if (reason === 'disabled') return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (reason === 'unauthenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}

function serviceClient() {
  return createClient<Database, 'public', any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const access = await getAdminAccess()
  if (!access.ok) return adminErrorResponse(access.reason)

  const sb = serviceClient()
  const { data, error } = await sb
    .from('scam_intel_pending')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(`[admin/scam-intel/pending] list failed code=${error.code ?? 'none'} message=${error.message}`)
    return NextResponse.json({ error: 'list_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sources: data ?? [] })
}

export async function POST(req: NextRequest) {
  const access = await getAdminAccess()
  if (!access.ok) return adminErrorResponse(access.reason)

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const sourceType = typeof body.source_type === 'string' ? body.source_type.trim() : ''
  if (!SOURCE_TYPES.includes(sourceType as any)) {
    return NextResponse.json({ error: 'invalid_source_type' }, { status: 400 })
  }

  const suspectedSeverity =
    typeof body.suspected_severity === 'string' && SEVERITIES.includes(body.suspected_severity as any)
      ? (body.suspected_severity as string)
      : null

  const insert = {
    source_type: sourceType,
    source_url: typeof body.source_url === 'string' && body.source_url.trim() ? body.source_url.trim() : null,
    // `category`/`severity` columns hold the SUSPECTED values for a pending row.
    category: typeof body.suspected_category === 'string' && body.suspected_category.trim() ? body.suspected_category.trim() : null,
    severity: suspectedSeverity,
    notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
    review_status: 'pending'
  }

  const sb = serviceClient()
  const { data, error } = await sb.from('scam_intel_pending').insert(insert).select('*').single()

  if (error) {
    // Note: notes intentionally excluded from the log.
    console.error(`[admin/scam-intel/pending] create failed code=${error.code ?? 'none'} message=${error.message}`)
    return NextResponse.json({ error: 'create_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, source: data })
}
