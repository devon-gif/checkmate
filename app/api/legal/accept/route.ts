import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  TERMS_VERSION,
  PRIVACY_VERSION,
  AI_DISCLOSURE_VERSION,
  ACCEPTABLE_USE_VERSION
} from '@/lib/legalCopy'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  // Require authentication
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Collect IP and user-agent
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null

  const userAgent = req.headers.get('user-agent') || null

  // Insert acceptance record using service-role bypass via API
  // (The service role key is available on the server; user can only insert their own record)
  const { error } = await supabase.from('user_legal_acceptances').insert({
    user_id: session.user.id,
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
    ai_disclosure_version: AI_DISCLOSURE_VERSION,
    acceptable_use_version: ACCEPTABLE_USE_VERSION,
    ip_address: ip,
    user_agent: userAgent
  })

  if (error) {
    console.error('[legal/accept] insert error:', error)
    return NextResponse.json(
      { error: 'Failed to record acceptance' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
