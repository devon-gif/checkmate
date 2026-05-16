import 'server-only'
import '@/lib/env'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/auth'
import { analyzeCase } from '@/lib/checkmate'
import { caseCategories, ANALYSIS_DISCLAIMER } from '@/lib/checkmate-shared'
import { type Database } from '@/lib/db_types'
import { saveCase } from '@/lib/db/save-case'
import { saveReport } from '@/lib/db/save-report'
import { logUsageEvent } from '@/lib/db/log-usage-event'

// ─── Request validation ───────────────────────────────────────────────────────

const requestSchema = z.object({
  // Primary field names
  input_text: z.string().max(20_000).optional(),
  input_url: z.string().max(2_000).optional(),
  category_hint: z
    .enum([...caseCategories, 'email'] as [string, ...string[]])
    .optional(),
  // Legacy aliases for backwards compat
  text: z.string().max(20_000).optional(),
  url: z.string().max(2_000).optional()
})

// ─── POST /api/analyze-case ───────────────────────────────────────────────────

export async function POST(req: Request) {
  // 1. Parse + validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request.', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { input_text, text, input_url, url, category_hint } = parsed.data
  const submittedText = (input_text ?? text ?? '').trim()
  const submittedUrl = (input_url ?? url ?? '').trim()
  const categoryHint = category_hint?.trim()

  if (!submittedText && !submittedUrl) {
    return NextResponse.json(
      { error: 'Provide pasted text, a URL, or both.' },
      { status: 400 }
    )
  }

  // 2. Session check — done BEFORE the AI call so rate limits gate compute cost
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  const isAuthenticated = Boolean(session?.user?.id)

  // Create the Supabase client once — shared by rate-limit check and DB writes.
  const supabase = createRouteHandlerClient<Database, 'public', any>({
    cookies: () => cookieStore
  })

  // ── Rate limit: authenticated users — 25 checks per rolling 24 h ──────────
  const FREE_TIER_DAILY_LIMIT = 25
  if (isAuthenticated) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session!.user.id)
      .eq('event_type', 'check_created')
      .gte('created_at', since)

    if ((count ?? 0) >= FREE_TIER_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: 'Daily limit reached.',
          detail: `Free accounts are limited to ${FREE_TIER_DAILY_LIMIT} checks per 24 hours. Try again later.`,
          retry_after: 'PT24H'
        },
        { status: 429 }
      )
    }
  }

  // 3. Run analysis (AI with deterministic fallback) — always, guests included
  const analysis = await analyzeCase({
    text: submittedText,
    url: submittedUrl,
    categoryHint
  })

  // Canonical nested report shape
  const report = {
    category: analysis.category,
    risk_score: analysis.risk_score,
    risk_level: analysis.risk_level,
    summary: analysis.summary,
    red_flags: analysis.red_flags,
    recommended_actions: analysis.recommended_actions,
    safe_reply: analysis.safe_reply,
    disclaimer: analysis.disclaimer ?? ANALYSIS_DISCLAIMER
  }

  // 4. Guest path: return result without persisting ───────────────────────────
  if (!isAuthenticated) {
    return NextResponse.json({
      saved: false,
      save_reason: 'not_authenticated' as const,
      case_id: null,
      report_id: null,
      used_fallback: analysis.used_fallback,
      report
    })
  }

  // ── Authenticated path: persist everything to Supabase ────────────────────
  // Wrapped in try/catch so a DB failure never swallows the analysis result.
  try {
    // a. Upsert user row (handles first-login race condition)
    await supabase.from('users').upsert({
      id: session!.user.id,
      email: session!.user.email ?? null,
      full_name: session!.user.user_metadata?.full_name ?? null,
      avatar_url: session!.user.user_metadata?.avatar_url ?? null
    })

    // b. Create case + opening message
    const createdCase = await saveCase(supabase, {
      userId: session!.user.id,
      analysis,
      submittedText,
      submittedUrl
    })

    if (!createdCase) {
      return NextResponse.json({
        saved: false,
        save_reason: 'supabase_error' as const,
        save_error: 'Failed to save case.',
        case_id: null,
        report_id: null,
        used_fallback: analysis.used_fallback,
        report
      })
    }

    // c. Save structured risk report
    const savedReport = await saveReport(supabase, {
      caseId: createdCase.id,
      userId: session!.user.id,
      analysis,
      submittedText
    })

    if (!savedReport) {
      return NextResponse.json({
        saved: false,
        save_reason: 'supabase_error' as const,
        save_error: 'Failed to save report.',
        case_id: createdCase.id,
        report_id: null,
        used_fallback: analysis.used_fallback,
        report
      })
    }

    // d. Record usage event (non-fatal)
    await logUsageEvent(supabase, {
      userId: session!.user.id,
      eventType: 'check_created',
      caseId: createdCase.id
    })

    // e. Return full response — IDs allow client to link to /cases/[id]
    return NextResponse.json({
      saved: true,
      save_reason: null,
      case_id: createdCase.id,
      report_id: savedReport.id,
      used_fallback: analysis.used_fallback,
      report
    })
  } catch (err) {
    // Unexpected DB error — still return the analysis so the user sees results
    console.error('[analyze-case] unexpected DB error:', err)
    return NextResponse.json({
      saved: false,
      save_reason: 'supabase_error' as const,
      save_error: 'Unexpected error saving to database.',
      case_id: null,
      report_id: null,
      used_fallback: analysis.used_fallback,
      report
    })
  }
}
