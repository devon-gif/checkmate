import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { type Database } from '@/lib/db_types'
import { upsertNotificationPreferences } from '@/lib/notifications/preferences'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { weekly_email_enabled?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.weekly_email_enabled !== 'boolean') {
    return NextResponse.json(
      { error: 'weekly_email_enabled must be a boolean' },
      { status: 400 }
    )
  }

  const patch = body.weekly_email_enabled
    ? { weekly_email_enabled: true, unsubscribed_at: null }
    : { weekly_email_enabled: false, unsubscribed_at: new Date().toISOString() }

  const prefs = await upsertNotificationPreferences(session.user.id, patch as any)
  if (!prefs) {
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, prefs })
}
