/**
 * lib/db/save-case.ts
 *
 * Inserts a case record and its initial user message into Supabase.
 * Returns the created case row, or null on error.
 */

import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/db_types'
import type { RiskAnalysis } from '@/lib/analysis/types'

type Row = Database['public']['Tables']['cases']['Row']

/**
 * Safe DB error shape surfaced to callers. We deliberately expose ONLY the
 * Postgres/PostgREST error `code` and `message` — never `details` or `hint`,
 * which on a constraint violation can echo the failing row's values (e.g. the
 * case title / email subject) and would leak private text into logs.
 */
export interface SafeDbError {
  code: string | null
  message: string
}

export interface SaveCaseInput {
  userId: string
  analysis: RiskAnalysis
  submittedText: string
  submittedUrl: string
  source?: string
  title?: string
  /** Optional sink for the safe DB error when the insert fails. */
  onDbError?: (err: SafeDbError) => void
}

export async function saveCase(
  supabase: SupabaseClient<Database>,
  { userId, analysis, submittedText, submittedUrl, source = 'web', title, onDbError }: SaveCaseInput
): Promise<Row | null> {
  const titleSource =
    submittedText || submittedUrl.replace(/^https?:\/\//, '') || 'New risk check'
  const caseTitle = (title || titleSource).slice(0, 72)
  const inputType = submittedUrl ? (submittedText ? 'text_and_url' : 'url') : 'text'

  const { data: createdCase, error } = await supabase
    .from('cases')
    .insert({
      user_id: userId,
      category: analysis.category,
      status: 'open',
      title: caseTitle,
      risk_level: analysis.risk_level,
      risk_score: analysis.risk_score,
      input_text: submittedText || null,
      input_url: submittedUrl || null,
      input_type: inputType,
      source
    })
    .select('*')
    .single()

  if (error || !createdCase) {
    // Log code + message ONLY. Never log `error.details`/`error.hint`: on a
    // check-constraint violation those echo the failing row (incl. the case
    // title / email subject) and would leak private text.
    const safe: SafeDbError = {
      code: error?.code ?? null,
      message: error?.message ?? 'cases insert returned no row'
    }
    console.error(
      `[db/save-case] cases insert failed code=${safe.code ?? 'none'} message=${safe.message}`
    )
    onDbError?.(safe)
    return null
  }

  // Save submitted content as the opening case message (non-fatal)
  const messageContent = [submittedText, submittedUrl].filter(Boolean).join('\n\nURL: ')
  await supabase.from('case_messages').insert({
    case_id: createdCase.id,
    user_id: userId,
    sender_role: 'user',
    content: messageContent
  })

  return createdCase
}
