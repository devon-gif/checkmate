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
import { checkAccess, recordAnonymousCheck, ANON_COOKIE_NAME } from '@/lib/billing/access'

// ─── Request validation ───────────────────────────────────────────────────────

const requestSchema = z.object({
  // Primary field names
  input_text: z.string().min(1).max(20_000).optional(),
  input_url: z.string().min(1).max(2_000).optional(),
  category_hint: z
    .enum([...caseCategories, 'email'] as [string, ...string[]])
    .optional(),
  // Legacy aliases for backwards compat
  text: z.string().min(1).max(20_000).optional(),
  url: z.string().min(1).max(2_000).optional()
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

  if (submittedText && submittedText.length < 10 && !submittedUrl) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Input is too short to analyse. Please provide more context.' },
      { status: 400 }
    )
  }

  // 2. Session check — done BEFORE the AI call so rate limits gate compute cost
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  const isAuthenticated = Boolean(session?.user?.id)

  // Read anonymous ID cookie (if present)
  const anonymousId: string | null = cookieStore.get(ANON_COOKIE_NAME)?.value ?? null

  // Create the Supabase client once — shared by rate-limit check and DB writes.
  const supabase = createRouteHandlerClient<Database, 'public', any>({
    cookies: () => cookieStore
  })

  // ── Access / billing gate ─────────────────────────────────────────────────
  const access = await checkAccess({
    userId: session?.user?.id ?? null,
    anonymousId
  })

  if (!access.canAnalyze) {
    return NextResponse.json(
      {
        error: 'usage_limit_reached',
        message: access.reason ?? 'Analysis limit reached.',
        access
      },
      { status: 402 }
    )
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
    // Generate an anonymous ID if none exists yet
    const anonId = anonymousId ?? crypto.randomUUID()

    // Record this check (non-fatal)
    await recordAnonymousCheck(anonId)

    const response = NextResponse.json({
      saved: false,
      save_reason: 'not_authenticated' as const,
      case_id: null,
      report_id: null,
      used_fallback: analysis.used_fallback,
      report,
      access: {
        ...access,
        checksUsed: (access.checksUsed ?? 0) + 1
      }
    })

    // Persist anonymous ID in cookie for future requests (90-day TTL)
    if (!anonymousId) {
      response.cookies.set(ANON_COOKIE_NAME, anonId, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 90,
        path: '/'
      })
    }

    return response
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
      report,
      access
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
