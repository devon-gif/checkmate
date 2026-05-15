import 'server-only'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { analyzeCase } from '@/lib/checkmate'
import { type Database } from '@/lib/db_types'

export async function POST(req: Request) {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  const isAuthenticated = Boolean(session?.user?.id)

  const body = (await req.json()) as {
    input_text?: string
    text?: string
    input_url?: string
    url?: string
    category_hint?: string
  }

  const text = (body.input_text ?? body.text ?? '').trim()
  const url = (body.input_url ?? body.url ?? '').trim()
  const categoryHint = body.category_hint?.trim()

  if (!text && !url) {
    return NextResponse.json(
      { error: 'Provide pasted text, a URL, or both.' },
      { status: 400 }
    )
  }

  // Run analysis (AI with deterministic fallback) — always, for guests too
  const analysis = await analyzeCase({ text, url, categoryHint })

  // ── Guest path: return result without persisting ──────────────────────────
  if (!isAuthenticated) {
    return NextResponse.json({
      saved: false,
      case_id: null,
      category: analysis.category,
      risk_score: analysis.risk_score,
      risk_level: analysis.risk_level,
      summary: analysis.summary,
      red_flags: analysis.red_flags,
      recommended_actions: analysis.recommended_actions,
      safe_reply: analysis.safe_reply,
      disclaimer: analysis.disclaimer
    })
  }

  // ── Authenticated path: persist everything to Supabase ────────────────────
  const supabase = createRouteHandlerClient<Database, 'public', any>({
    cookies: () => cookieStore
  })

  // Upsert user row (handles first-login race condition)
  await supabase
    .from('users')
    .upsert({
      id: session!.user.id,
      email: session!.user.email ?? null,
      full_name: session!.user.user_metadata?.full_name ?? null,
      avatar_url: session!.user.user_metadata?.avatar_url ?? null
    })
    .throwOnError()

  const titleSource =
    text || url?.replace(/^https?:\/\//, '') || 'New risk check'
  const title = titleSource.slice(0, 72)

  // 1. Create case record
  const { data: createdCase } = await supabase
    .from('cases')
    .insert({
      user_id: session!.user.id,
      category: analysis.category,
      status: 'open',
      title,
      risk_level: analysis.risk_level,
      risk_score: analysis.risk_score
    })
    .select('*')
    .single()
    .throwOnError()

  // 2. Save original submitted text / link as a case message
  const messageContent = [text, url].filter(Boolean).join('\n\nURL: ')
  await supabase
    .from('case_messages')
    .insert({
      case_id: createdCase.id,
      user_id: session!.user.id,
      sender_role: 'user',
      content: messageContent
    })
    .throwOnError()

  // 3. Save structured risk report
  const { data: report } = await supabase
    .from('risk_reports')
    .insert({
      case_id: createdCase.id,
      summary: analysis.summary,
      risk_score: analysis.risk_score,
      risk_level: analysis.risk_level,
      red_flags: analysis.red_flags,
      recommended_actions: analysis.recommended_actions,
      safe_reply: analysis.safe_reply,
      disclaimer: analysis.disclaimer,
      sources: [
        ...(text ? [{ type: 'text', value: text }] : []),
        ...analysis.detected_urls.map(value => ({ type: 'url', value }))
      ]
    })
    .select('*')
    .single()
    .throwOnError()

  // 4. Record usage event (non-fatal)
  await supabase
    .from('usage_events')
    .insert({
      user_id: session!.user.id,
      event_type: 'check_created',
      cost_estimate: 0
    })
    .throwOnError()

  // 5. Return full report — case_id enables client to link to /cases/[id]
  return NextResponse.json({
    saved: true,
    case_id: createdCase.id,
    case: createdCase,
    report,
    category: analysis.category,
    risk_score: analysis.risk_score,
    risk_level: analysis.risk_level,
    summary: analysis.summary,
    red_flags: analysis.red_flags,
    recommended_actions: analysis.recommended_actions,
    safe_reply: analysis.safe_reply,
    disclaimer: analysis.disclaimer
  })
}
