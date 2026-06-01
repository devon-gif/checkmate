/**
 * PATCH /api/admin/scam-intel/[id]
 *
 * Admin-only. Update an existing scam_intel pattern (edit fields and/or toggle
 * status). Gated identically to the sibling list/create route.
 *
 * Editing here updates the admin catalog only — the analyzer scores against the
 * in-code catalog, so admin edits never silently change live risk scoring.
 *
 * Body (all optional): name, category, severity, confidence, status,
 * description, recommended_action, source_type, source_url, signals.
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
const STATUSES = ['active', 'inactive', 'archived'] as const

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

  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()
  if (typeof body.category === 'string' && body.category.trim()) update.category = body.category.trim()
  if (typeof body.description === 'string') update.description = body.description
  if (typeof body.recommended_action === 'string') update.recommended_action = body.recommended_action
  if (typeof body.source_type === 'string' && body.source_type.trim()) update.source_type = body.source_type.trim()
  if (body.source_url !== undefined) {
    update.source_url =
      typeof body.source_url === 'string' && body.source_url.trim() ? body.source_url.trim() : null
  }
  if (body.signals !== undefined) update.signals = normalizeSignals(body.signals)

  if (body.severity !== undefined) {
    if (!SEVERITIES.includes(body.severity as any)) {
      return NextResponse.json({ error: 'invalid_severity' }, { status: 400 })
    }
    update.severity = body.severity
  }
  if (body.confidence !== undefined) {
    if (!CONFIDENCES.includes(body.confidence as any)) {
      return NextResponse.json({ error: 'invalid_confidence' }, { status: 400 })
    }
    update.confidence = body.confidence
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as any)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
    }
    update.status = body.status
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 })
  }

  const sb = serviceClient()
  const { data, error } = await sb.from('scam_intel').update(update).eq('id', id).select('*').single()

  if (error) {
    console.error(`[admin/scam-intel] update failed code=${error.code ?? 'none'} message=${error.message}`)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'duplicate_name' }, { status: 409 })
    }
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, pattern: data })
}
