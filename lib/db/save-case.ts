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

export interface SaveCaseInput {
  userId: string
  analysis: RiskAnalysis
  submittedText: string
  submittedUrl: string
}

export async function saveCase(
  supabase: SupabaseClient<Database>,
  { userId, analysis, submittedText, submittedUrl }: SaveCaseInput
): Promise<Row | null> {
  const titleSource =
    submittedText || submittedUrl.replace(/^https?:\/\//, '') || 'New risk check'
  const title = titleSource.slice(0, 72)
  const inputType = submittedUrl ? (submittedText ? 'text_and_url' : 'url') : 'text'

  const { data: createdCase, error } = await supabase
    .from('cases')
    .insert({
      user_id: userId,
      category: analysis.category,
      status: 'open',
      title,
      risk_level: analysis.risk_level,
      risk_score: analysis.risk_score,
      input_text: submittedText || null,
      input_url: submittedUrl || null,
      input_type: inputType,
      source: 'web'
    })
    .select('*')
    .single()

  if (error || !createdCase) {
    console.error('[db/save-case] cases insert error:', error)
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
