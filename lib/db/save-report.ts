/**
 * lib/db/save-report.ts
 *
 * Inserts a structured risk report into Supabase.
 * Returns the created report row, or null on error.
 */

import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/db_types'
import type { RiskAnalysis } from '@/lib/analysis/types'
import { ANALYSIS_DISCLAIMER } from '@/lib/checkmate-shared'

type Row = Database['public']['Tables']['risk_reports']['Row']

/**
 * Safe DB error shape surfaced to callers — `code` + `message` only, never
 * `details`/`hint` (which can echo failing row values / private text).
 */
export interface SafeDbError {
  code: string | null
  message: string
}

export interface SaveReportInput {
  caseId: string
  userId: string
  analysis: RiskAnalysis
  submittedText: string
  /** Optional sink for the safe DB error when the insert fails. */
  onDbError?: (err: SafeDbError) => void
}

export async function saveReport(
  supabase: SupabaseClient<Database>,
  { caseId, userId, analysis, submittedText, onDbError }: SaveReportInput
): Promise<Row | null> {
  const { data: report, error } = await supabase
    .from('risk_reports')
    .insert({
      case_id: caseId,
      user_id: userId,
      category: analysis.category,
      summary: analysis.summary,
      risk_score: analysis.risk_score,
      risk_level: analysis.risk_level,
      red_flags: analysis.red_flags,
      recommended_actions: analysis.recommended_actions,
      safe_reply: analysis.safe_reply,
      disclaimer: analysis.disclaimer ?? ANALYSIS_DISCLAIMER,
      model_used: analysis.used_fallback
        ? 'fallback'
        : (process.env.CHECKMATE_ANALYZER_MODEL ?? 'gpt-4o-mini'),
      sources: [
        ...(submittedText ? [{ type: 'text', value: submittedText }] : []),
        ...analysis.detected_urls.map(value => ({ type: 'url', value }))
      ]
    })
    .select('*')
    .single()

  if (error || !report) {
    // code + message only — never details/hint (can echo private row values).
    const safe: SafeDbError = {
      code: error?.code ?? null,
      message: error?.message ?? 'risk_reports insert returned no row'
    }
    console.error(
      `[db/save-report] risk_reports insert failed code=${safe.code ?? 'none'} message=${safe.message}`
    )
    onDbError?.(safe)
    return null
  }

  return report
}
