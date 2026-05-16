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

export interface SaveReportInput {
  caseId: string
  userId: string
  analysis: RiskAnalysis
  submittedText: string
}

export async function saveReport(
  supabase: SupabaseClient<Database>,
  { caseId, userId, analysis, submittedText }: SaveReportInput
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
    console.error('[db/save-report] risk_reports insert error:', error)
    return null
  }

  return report
}
