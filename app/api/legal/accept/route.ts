import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  TERMS_VERSION,
  PRIVACY_VERSION,
  AI_DISCLOSURE_VERSION,
  ACCEPTABLE_USE_VERSION
} from '@/lib/legalCopy'

const LEGAL_CACHE_COOKIE = 'cm_legal_ok'
const CURRENT_VERSIONS_KEY = `${TERMS_VERSION}|${PRIVACY_VERSION}|${AI_DISCLOSURE_VERSION}`

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null

  const userAgent = req.headers.get('user-agent') || null

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
    return NextResponse.json({ error: 'Failed to record acceptance' }, { status: 500 })
  }

  // Set the middleware cache cookie so the fast-path kicks in immediately
  // and the user isn't redirected to /legal-update on their next request
  const response = NextResponse.json({ success: true })
  response.cookies.set(LEGAL_CACHE_COOKIE, CURRENT_VERSIONS_KEY, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 5,
    path: '/'
  })

  return response
}
