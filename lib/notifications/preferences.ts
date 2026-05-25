import 'server-only'
/**
 * lib/notifications/preferences.ts
 *
 * Server-side helpers for reading and upserting notification_preferences rows.
 * The table is not yet in db_types.ts so queries use `as any` casts.
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/db_types'

export interface NotificationPreferences {
  id: string
  user_id: string
  weekly_email_enabled: boolean
  unsubscribed_at: string | null
  created_at: string
  updated_at: string
}

/** Default row values for a new user. */
const DEFAULTS = {
  weekly_email_enabled: true,
  unsubscribed_at: null
} as const

/**
 * Get notification preferences for a user.
 * Returns null if no row exists yet.
 * Uses the server-component cookie client (read-only safe).
 */
export async function getNotificationPreferences(
  userId: string,
  cookieStore: ReturnType<typeof cookies>
): Promise<NotificationPreferences | null> {
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
  const { data } = await supabase
    .from('notification_preferences' as any)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return (data as NotificationPreferences | null) ?? null
}

/**
 * Upsert notification preferences for a user.
 * Creates a default row if none exists; updates fields if provided.
 * Uses service-role client so it works from server actions / API routes.
 */
export async function upsertNotificationPreferences(
  userId: string,
  patch: Partial<Pick<NotificationPreferences, 'weekly_email_enabled' | 'unsubscribed_at'>>
): Promise<NotificationPreferences | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data, error } = await (supabase as any)
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        ...DEFAULTS,
        ...patch,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id', ignoreDuplicates: false }
    )
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[notifications] upsert error', error.message)
    return null
  }
  return (data as NotificationPreferences | null) ?? null
}

/**
 * Ensure a default notification_preferences row exists for this user.
 * Safe to call on every dashboard load — only inserts if no row exists.
 */
export async function ensureNotificationPreferences(
  userId: string
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  await (supabase as any)
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        ...DEFAULTS
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
}
