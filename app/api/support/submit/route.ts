/**
 * app/api/support/submit/route.ts
 *
 * POST /api/support/submit — public support ticket submission
 * Works for both authenticated and unauthenticated users.
 */
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const body = await req.json()
  const { email, subject, message, category } = body as {
    email?: string
    subject?: string
    message?: string
    category?: string
  }

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: 'Subject and message are required.' },
      { status: 400 }
    )
  }

  // Try to get authenticated user (optional)
  let userId: string | null = null
  let resolvedEmail = email?.trim() || null

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      userId = session.user.id
      resolvedEmail = resolvedEmail ?? session.user.email ?? null
    }
  } catch {
    // Not logged in — proceed anonymously
  }

  const validCategories = ['general', 'billing', 'cancellation', 'bug', 'feature', 'other']
  const safeCategory = validCategories.includes(category ?? '') ? category! : 'general'

  const sb = serviceClient()
  const { error } = await (sb as any).from('support_tickets').insert({
    user_id: userId,
    email: resolvedEmail,
    subject: subject.trim(),
    message: message.trim(),
    category: safeCategory,
    status: 'open'
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
