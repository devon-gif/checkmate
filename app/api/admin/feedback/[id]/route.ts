/**
 * PATCH /api/admin/feedback/[id]
 *
 * Admin-only. Update admin_status and/or admin_notes on a feedback row.
 * Requires ENABLE_ADMIN_TOOLS=true and ADMIN_EMAILS containing the caller's email.
 * Uses service role to bypass RLS.
 *
 * Body (all optional):
 *   admin_status  string — one of the valid status values
 *   admin_notes   string | null
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { requireAdmin } from '@/lib/admin/access'
import { type Database } from '@/lib/db_types'

const VALID_ADMIN_STATUSES = [
  'reviewed',
  'false_positive',
  'false_negative',
  'needs_rule_update',
  'needs_prompt_update'
] as const

type AdminStatus = (typeof VALID_ADMIN_STATUSES)[number]

function serviceClient() {
  return createClient<Database, 'public', any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // requireAdmin() redirects or throws notFound() on unauthorized access
  await requireAdmin()

  const feedbackId = params.id
  if (!feedbackId) {
    return NextResponse.json({ error: 'Missing feedback id' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { admin_status, admin_notes } = body as Record<string, unknown>

  if (
    admin_status !== undefined &&
    !VALID_ADMIN_STATUSES.includes(admin_status as AdminStatus)
  ) {
    return NextResponse.json({ error: 'Invalid admin_status' }, { status: 400 })
  }

  if (admin_notes !== undefined && admin_notes !== null && typeof admin_notes !== 'string') {
    return NextResponse.json({ error: 'admin_notes must be a string or null' }, { status: 400 })
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }
  if (admin_status !== undefined) updatePayload.admin_status = admin_status
  if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes

  const sb = serviceClient()
  const { error } = await sb
    .from('case_feedback')
    .update(updatePayload)
    .eq('id', feedbackId)

  if (error) {
    console.error('[admin/feedback] update error:', error.message)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
