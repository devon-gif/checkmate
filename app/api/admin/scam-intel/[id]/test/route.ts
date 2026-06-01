/**
 * POST /api/admin/scam-intel/[id]/test
 *
 * Admin-only. Runs an example message through the EXISTING analyzer pipeline
 * (the same `analyzeCase` Ray uses live) to verify whether Ray currently
 * detects a scam-intel pattern, then records the result on the row.
 *
 * Gated identically to the other /api/admin/* routes (404 / 401 / 403).
 *
 * SAFETY — this is a read-only probe of the analyzer:
 *   - Does NOT consume user quota (no billing/access call).
 *   - Does NOT create a user case or risk_report.
 *   - Does NOT send email or call Stripe/billing/auth.
 *   - Does NOT change live scoring — scoring uses the in-code catalog
 *     (lib/analyzer/scam-intel-catalog.ts); a passing test does not promote a
 *     pattern. See docs/SCAM_INTEL.md.
 *   - Never logs example_text — only pattern id, level, score, category, pass.
 *
 * Body (all optional except example_text):
 *   example_text          string  — the message to analyze (required)
 *   expected_risk_level   string  — low | medium | high | very_high | needs_more_info
 *   expected_category     string  — one of the case categories
 *   persist               boolean — default true; save result back to the row
 */
import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getAdminAccess } from '@/lib/admin/access'
import { analyzeCase } from '@/lib/checkmate'
import { riskLevels, caseCategories } from '@/lib/checkmate-shared'
import { type Database } from '@/lib/db_types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

  const exampleText = typeof body.example_text === 'string' ? body.example_text.trim() : ''
  if (!exampleText) {
    return NextResponse.json({ error: 'example_text_required' }, { status: 400 })
  }

  const expectedRiskLevel =
    typeof body.expected_risk_level === 'string' && riskLevels.includes(body.expected_risk_level as any)
      ? (body.expected_risk_level as string)
      : null
  if (body.expected_risk_level !== undefined && body.expected_risk_level !== null && !expectedRiskLevel) {
    return NextResponse.json({ error: 'invalid_expected_risk_level' }, { status: 400 })
  }

  const expectedCategory =
    typeof body.expected_category === 'string' &&
    body.expected_category.trim() &&
    caseCategories.includes(body.expected_category.trim() as any)
      ? body.expected_category.trim()
      : null
  if (
    typeof body.expected_category === 'string' &&
    body.expected_category.trim() &&
    !expectedCategory
  ) {
    return NextResponse.json({ error: 'invalid_expected_category' }, { status: 400 })
  }

  const persist = body.persist !== false

  // Run the SAME analyzer pipeline Ray uses live. No billing, no case, no email.
  let analysis
  try {
    analysis = await analyzeCase({ text: exampleText })
  } catch (err) {
    console.error('[admin/scam-intel/test] analyzer error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'analyzer_failed' }, { status: 500 })
  }

  const levelPass = expectedRiskLevel ? analysis.risk_level === expectedRiskLevel : null
  const categoryPass = expectedCategory ? analysis.category === expectedCategory : null
  // Overall pass requires every set expectation to match. With no expectations
  // set, `pass` is null (informational run only).
  const checks = [levelPass, categoryPass].filter(v => v !== null) as boolean[]
  const pass = checks.length ? checks.every(Boolean) : null

  const testResult = {
    tested_at: new Date().toISOString(),
    expected_risk_level: expectedRiskLevel,
    expected_category: expectedCategory,
    actual_risk_level: analysis.risk_level,
    actual_risk_score: analysis.risk_score,
    actual_category: analysis.category,
    summary: analysis.summary,
    red_flags: analysis.red_flags,
    used_fallback: analysis.used_fallback,
    level_pass: levelPass,
    category_pass: categoryPass,
    pass
  }

  if (persist) {
    const sb = serviceClient()
    const update: Record<string, unknown> = {
      example_text: exampleText,
      last_tested_at: testResult.tested_at,
      last_test_result: testResult
    }
    if (expectedRiskLevel !== null) update.expected_risk_level = expectedRiskLevel
    if (expectedCategory !== null) update.expected_category = expectedCategory

    const { error } = await sb.from('scam_intel').update(update).eq('id', id)
    if (error) {
      console.error(`[admin/scam-intel/test] persist failed code=${error.code ?? 'none'} message=${error.message}`)
      // Still return the result — the test ran; only persistence failed.
      return NextResponse.json({ ok: true, persisted: false, result: testResult })
    }
  }

  // Safe log: id, level, score, category, pass — never example_text.
  console.log(
    `[admin/scam-intel/test] pattern=${id} ` +
      `level=${testResult.actual_risk_level} score=${testResult.actual_risk_score} ` +
      `category=${testResult.actual_category} pass=${pass === null ? 'n/a' : pass}`
  )

  return NextResponse.json({ ok: true, persisted: persist, result: testResult })
}
