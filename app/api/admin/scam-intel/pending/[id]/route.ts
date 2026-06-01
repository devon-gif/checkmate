/**
 * PATCH /api/admin/scam-intel/pending/[id]
 *
 * Admin-only. Update a pending source — primarily its review_status
 * (pending | reviewed | rejected | promoted) and/or its suspected fields and
 * notes. Gated identically to the sibling routes.
 *
 * SAFETY: service-role only; `notes` is never logged; nothing here changes
 * analyzer scoring.
 */
import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getAdminAccess } from '@/lib/admin/access'
import { type Database } from '@/lib/db_types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REVIEW_STATUSES = ['pending', 'reviewed', 'rejected', 'promoted'] as const
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await getAdminAccess()
  if (!access.ok) return adminErrorResponse(access.reason)

  const id = params.id
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (body.review_status !== undefined) {
    if (!REVIEW_STATUSES.includes(body.review_status as any)) {
      return NextResponse.json({ error: 'invalid_review_status' }, { status: 400 })
    }
    update.review_status = body.review_status
  }
  if (body.source_url !== undefined) {
    update.source_url =
      typeof body.source_url === 'string' && body.source_url.trim() ? body.source_url.trim() : null
  }
  if (body.suspected_category !== undefined) {
    update.category =
      typeof body.suspected_category === 'string' && body.suspected_category.trim()
        ? body.suspected_category.trim()
        : null
  }
  if (body.suspected_severity !== undefined) {
    if (body.suspected_severity !== null && !SEVERITIES.includes(body.suspected_severity as any)) {
      return NextResponse.json({ error: 'invalid_suspected_severity' }, { status: 400 })
    }
    update.severity = body.suspected_severity ?? null
  }
  if (body.notes !== undefined) {
    update.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 })
  }

  const sb = serviceClient()
  const { data, error } = await sb
    .from('scam_intel_pending')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error(`[admin/scam-intel/pending] update failed code=${error.code ?? 'none'} message=${error.message}`)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, source: data })
}
