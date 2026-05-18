/**
 * app/api/admin/notes/route.ts
 *
 * POST /api/admin/notes — add internal support note for a user (admin only)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { isAdminUser } from '@/lib/admin/access'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { userId, note } = body as { userId?: string; note?: string }

  if (!userId || !note?.trim()) {
    return NextResponse.json(
      { error: 'userId and note are required' },
      { status: 400 }
    )
  }

  // Get current admin user id for attribution
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  const adminUserId = session?.user?.id ?? null

  const sb = serviceClient()
  const { error } = await (sb as any).from('support_notes').insert({
    user_id: userId,
    admin_user_id: adminUserId,
    note: note.trim()
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
