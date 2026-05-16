/**
 * lib/db/log-usage-event.ts
 *
 * Records a usage event in Supabase.
 * Non-fatal — errors are logged but not propagated.
 */

import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/db_types'

export interface LogUsageEventInput {
  userId: string
  eventType: string
  caseId?: string
  costEstimate?: number
}

export async function logUsageEvent(
  supabase: SupabaseClient<Database>,
  { userId, eventType, caseId, costEstimate = 0 }: LogUsageEventInput
): Promise<void> {
  const { error } = await supabase.from('usage_events').insert({
    user_id: userId,
    event_type: eventType,
    case_id: caseId ?? null,
    cost_estimate: costEstimate
  })

  if (error) {
    console.error('[db/log-usage-event] usage_events insert error:', error)
  }
}
