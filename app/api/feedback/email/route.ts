/**
 * app/api/feedback/email/route.ts
 *
 * Token-authenticated (no session required) feedback endpoint for email replies.
 *
 * GET  /api/feedback/email?caseId=<uuid>&rating=accurate|not_right&token=<hex32>
 *   - Verifies HMAC token via FEEDBACK_SIGNING_SECRET
 *   - Upserts a case_feedback row (source='email', conflict on token → update rating)
 *   - Hashes the request IP for lightweight abuse tracking
 *   - Redirects to /feedback/email?r=ok            (accurate)
 *                  /feedback/email?r=form&…        (not_right — show form)
 *                  /feedback/email?r=invalid        (bad token / params)
 *
 * POST /api/feedback/email
 *   Body (JSON): { caseId, token, reason?, note? }
 *   - Verifies token again
 *   - Updates reason + note on the existing row
 *   - Returns { ok: true }
 *
 * Never exposes FEEDBACK_SIGNING_SECRET or full scam text to the client.
 */
import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { createHash } from 'node:crypto'

import { verifyFeedbackToken } from '@/lib/feedback-token'
import { type Database } from '@/lib/db_types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://checkray.app').replace(/\/$/, '')

const VALID_RATINGS = ['accurate', 'not_right'] as const
const VALID_REASONS = [
  'too_risky',
  'not_risky_enough',
  'missed_red_flag',
  'wrong_category',
  'confusing_explanation',
  'other'
] as const

type Rating = (typeof VALID_RATINGS)[number]
type Reason = (typeof VALID_REASONS)[number]

function serviceClient() {
  return createClient<Database, 'public', any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

// ── GET — record feedback from link click ─────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const caseId = searchParams.get('caseId') ?? ''
  const rating = searchParams.get('rating') ?? ''
  const token = searchParams.get('token') ?? ''

  const badParams =
    !caseId ||
    !token ||
    !VALID_RATINGS.includes(rating as Rating)

  if (badParams || !verifyFeedbackToken(caseId, token)) {
    return NextResponse.redirect(`${APP_URL}/feedback/email?r=invalid`)
  }

  const headersList = headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = headersList.get('user-agent') ?? null

  const sb = serviceClient()

  // Upsert — if the user clicks both buttons the later click wins.
  // onConflict: 'token' requires the token unique index created in migration.
  const { error } = await sb
    .from('case_feedback')
    .upsert(
      {
        case_id: caseId,
        token,
        rating: rating as Rating,
        source: 'email',
        ip_hash: hashIp(ip),
        user_agent: userAgent,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'token' }
    )

  if (error) {
    console.error('[feedback/email GET] upsert error:', error.message)
    return NextResponse.redirect(`${APP_URL}/feedback/email?r=error`)
  }

  if (rating === 'not_right') {
    const params = new URLSearchParams({ r: 'form', caseId, token })
    return NextResponse.redirect(`${APP_URL}/feedback/email?${params.toString()}`)
  }

  return NextResponse.redirect(`${APP_URL}/feedback/email?r=ok`)
}

// ── POST — submit thumbs-down reason + note from form ─────────────────────

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    caseId,
    token,
    reason = null,
    note = null
  } = body as Record<string, unknown>

  if (typeof caseId !== 'string' || !caseId) {
    return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
  }
  if (typeof token !== 'string' || !token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }
  if (!verifyFeedbackToken(caseId, token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }
  if (reason !== null && !VALID_REASONS.includes(reason as Reason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }
  if (note !== null && typeof note !== 'string') {
    return NextResponse.json({ error: 'note must be a string or null' }, { status: 400 })
  }

  const sb = serviceClient()
  const { error } = await sb
    .from('case_feedback')
    .update({
      reason: (reason as Reason | null) ?? null,
      note: typeof note === 'string' && note.trim() ? note.trim() : null,
      updated_at: new Date().toISOString()
    })
    .eq('token', token)

  if (error) {
    console.error('[feedback/email POST] update error:', error.message)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
