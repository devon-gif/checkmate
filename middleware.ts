import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'
import {
  TERMS_VERSION,
  PRIVACY_VERSION,
  AI_DISCLOSURE_VERSION
} from '@/lib/legalCopy'

// Public paths that never require legal acceptance check
const PUBLIC_PATHS = [
  '/sign-in',
  '/sign-up',
  '/terms',
  '/privacy',
  '/disclaimer',
  '/ai-disclosure',
  '/acceptable-use',
  '/contact',
  '/legal-update'
]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session }
  } = await supabase.auth.getSession()

  // Redirect unauthenticated users to sign-in
  if (
    !session &&
    !req.url.includes('/sign-in') &&
    !req.url.includes('/sign-up')
  ) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/sign-in'
    redirectUrl.searchParams.set(`redirectedFrom`, req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // For authenticated users on app paths, check legal acceptance
  if (session?.user && !isPublicPath(req.nextUrl.pathname)) {
    const { data: acceptance } = await supabase
      .from('user_legal_acceptances')
      .select('terms_version, privacy_version, ai_disclosure_version')
      .eq('user_id', session.user.id)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const needsAcceptance =
      !acceptance ||
      acceptance.terms_version !== TERMS_VERSION ||
      acceptance.privacy_version !== PRIVACY_VERSION ||
      acceptance.ai_disclosure_version !== AI_DISCLOSURE_VERSION

    if (needsAcceptance && req.nextUrl.pathname !== '/legal-update') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/legal-update'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - share (publicly shared chats)
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!share|api|_next/static|_next/image|favicon.ico).*)'
  ]
}
