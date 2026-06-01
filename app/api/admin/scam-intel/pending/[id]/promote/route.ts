/**
 * POST /api/admin/scam-intel/pending/[id]/promote
 *
 * Admin-only. Promote a reviewed pending source into the curated `scam_intel`
 * catalog. The admin supplies the final, reviewed pattern fields (name,
 * category, severity, confidence, description, signals, recommended_action,
 * source_type, source_url). On success:
 *   1. inserts a row into scam_intel
 *   2. marks the pending row review_status='promoted' and links it via
 *      promoted_scam_intel_id
 *
 * IMPORTANT — scoring is NOT affected by this:
 *   Promotion writes a reviewed row into the scam_intel TABLE, which the admin
 *   UI reads. Live analyzer scoring still uses ONLY the in-code catalog
 *   (lib/analyzer/scam-intel-catalog.ts). A promoted DB row does not change any
 *   risk score until a human mirrors it into that in-code catalog. See
 *   docs/SCAM_INTEL.md.
 *
 * SAFETY: service-role only; `notes` never logged.
 */
import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getAdminAccess } from '@/lib/admin/access'
import { type Database } from '@/lib/db_types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
const CONFIDENCES = ['low', 'medium', 'high'] as const

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

function normalizeSignals(input: unknown): string[] {
  if (Array.isArray(input)) return input.map(s => String(s).trim()).filter(Boolean)
  if (typeof input === 'string') return input.split('\n').map(s => s.trim()).filter(Boolean)
  return []
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await getAdminAccess()
  if (!access.ok) return adminErrorResponse(access.reason)

  const pendingId = params.id
  if (!pendingId) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (!category) return NextResponse.json({ error: 'category_required' }, { status: 400 })

  const severity = SEVERITIES.includes(body.severity as any) ? (body.severity as string) : 'medium'
  const confidence = CONFIDENCES.includes(body.confidence as any) ? (body.confidence as string) : 'medium'

  const sb = serviceClient()

  // 1. Insert the reviewed pattern into the curated catalog table.
  const { data: created, error: insertErr } = await sb
    .from('scam_intel')
    .insert({
      name,
      category,
      severity,
      confidence,
      status: 'active',
      description: typeof body.description === 'string' ? body.description : '',
      recommended_action: typeof body.recommended_action === 'string' ? body.recommended_action : '',
      source_type: typeof body.source_type === 'string' && body.source_type.trim() ? body.source_type.trim() : 'curated',
      source_url: typeof body.source_url === 'string' && body.source_url.trim() ? body.source_url.trim() : null,
      signals: normalizeSignals(body.signals)
    })
    .select('id')
    .single()

  if (insertErr || !created) {
    console.error(`[admin/scam-intel/pending] promote insert failed code=${insertErr?.code ?? 'none'} message=${insertErr?.message ?? 'no row'}`)
    if (insertErr?.code === '23505') {
      return NextResponse.json({ error: 'duplicate_name' }, { status: 409 })
    }
    return NextResponse.json({ error: 'promote_failed' }, { status: 500 })
  }

  // 2. Mark the pending row promoted and link it to the new catalog row.
  const { error: updateErr } = await sb
    .from('scam_intel_pending')
    .update({ review_status: 'promoted', promoted_scam_intel_id: created.id })
    .eq('id', pendingId)

  if (updateErr) {
    // The catalog row was created; surface a soft warning but still report ok
    // so the admin sees the promotion. Re-running promote would 409 on name.
    console.error(`[admin/scam-intel/pending] promote status update failed code=${updateErr.code ?? 'none'} message=${updateErr.message}`)
    return NextResponse.json({ ok: true, scam_intel_id: created.id, warning: 'pending_status_update_failed' })
  }

  return NextResponse.json({ ok: true, scam_intel_id: created.id })
}
