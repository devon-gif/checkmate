/**
 * POST /api/feedback
 *
 * Submit or update feedback for a case the authenticated user owns.
 * Uses an upsert so re-submitting replaces the previous rating.
 *
 * Body:
 *   case_id   string  (required)
 *   rating    'accurate' | 'not_right'  (required)
 *   reason    string | null  (required when rating = 'not_right')
 *   note      string | null  (optional)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

import { type Database } from '@/lib/db_types'

const VALID_RATINGS = ['accurate', 'not_right'] as const
const VALID_REASONS = [
  'too_risky',
  'not_risky_enough',
  'missed_red_flag',
  'wrong_category',
  'confusing_explanation',
  'other'
] as const

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database, 'public', any>({ cookies: () => cookieStore })

  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    case_id,
    rating,
    reason = null,
    note = null
  } = body as Record<string, unknown>

  if (typeof case_id !== 'string' || !case_id) {
    return NextResponse.json({ error: 'case_id is required' }, { status: 400 })
  }

  if (!VALID_RATINGS.includes(rating as (typeof VALID_RATINGS)[number])) {
    return NextResponse.json(
      { error: 'rating must be accurate or not_right' },
      { status: 400 }
    )
  }

  if (rating === 'not_right') {
    if (reason !== null && !VALID_REASONS.includes(reason as (typeof VALID_REASONS)[number])) {
      return NextResponse.json({ error: 'Invalid reason value' }, { status: 400 })
    }
  }

  if (note !== null && typeof note !== 'string') {
    return NextResponse.json({ error: 'note must be a string or null' }, { status: 400 })
  }

  // Verify the case belongs to the authenticated user (RLS will also enforce
  // this, but an explicit check gives a clean 403 rather than a silent empty).
  const { data: caseRow, error: caseErr } = await supabase
    .from('cases')
    .select('id')
    .eq('id', case_id)
    .eq('user_id', session.user.id)
    .single()

  if (caseErr || !caseRow) {
    return NextResponse.json(
      { error: 'Case not found or access denied' },
      { status: 403 }
    )
  }

  type FeedbackInsert = Database['public']['Tables']['case_feedback']['Insert']

  const payload: FeedbackInsert = {
    case_id,
    user_id: session.user.id,
    rating: rating as 'accurate' | 'not_right',
    reason: (rating === 'not_right' ? reason : null) as
      | 'too_risky'
      | 'not_risky_enough'
      | 'missed_red_flag'
      | 'wrong_category'
      | 'confusing_explanation'
      | 'other'
      | null,
    note: typeof note === 'string' && note.trim() ? note.trim() : null
  }

  // Try insert first; on unique-conflict fall back to update.
  const { error: insertErr } = await supabase
    .from('case_feedback')
    .insert(payload)

  if (insertErr) {
    if (insertErr.code === '23505') {
      // Unique constraint violation — update existing row
      const { error: updateErr } = await supabase
        .from('case_feedback')
        .update({
          rating: payload.rating,
          reason: payload.reason,
          note: payload.note,
          updated_at: new Date().toISOString()
        })
        .eq('case_id', case_id)
        .eq('user_id', session.user.id)

      if (updateErr) {
        console.error('[feedback] update error:', updateErr.message)
        return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
      }
    } else {
      console.error('[feedback] insert error:', insertErr.message)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
