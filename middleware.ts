import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'
import {
  TERMS_VERSION,
  PRIVACY_VERSION,
  AI_DISCLOSURE_VERSION
} from '@/lib/legalCopy'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Cookie that caches the legal acceptance check result.
 * Value is a composite of all current legal versions: "terms|privacy|ai".
 * Max-age: 5 minutes. After expiry the middleware re-queries the DB.
 * When legal versions change, the value won't match and the DB is re-queried.
 */
const LEGAL_CACHE_COOKIE = 'cm_legal_ok'
const LEGAL_CACHE_MAX_AGE = 60 * 5 // 5 minutes

const CURRENT_VERSIONS_KEY = `${TERMS_VERSION}|${PRIVACY_VERSION}|${AI_DISCLOSURE_VERSION}`

/**
 * Routes that are always public — no auth or legal check required.
 * The homepage `/` is intentionally public.
 */
const PUBLIC_PATHS = [
  '/',
  '/sign-in',
  '/sign-up',
  '/create-account',
  '/reset-password',
  '/terms',
  '/privacy',
  '/disclaimer',
  '/ai-disclosure',
  '/acceptable-use',
  '/contact',
  '/legal-update',
  '/try',
  '/demo'
]

/**
 * Routes that require an authenticated session.
 * Everything else is public unless added here.
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/cases',
  '/settings',
  '/account',
  '/billing'
]

function isPublicPath(pathname: string) {
  // Exact match for "/" to avoid catching everything
  if (pathname === '/') return true
  return PUBLIC_PATHS.some(p => p !== '/' && pathname.startsWith(p))
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired — required for Server Components
  const {
    data: { session }
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Redirect unauthenticated users ONLY when they try to access protected routes
  if (!session && isProtectedPath(pathname)) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/sign-in'
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // For authenticated users on non-public paths, verify legal acceptance
  if (session?.user && !isPublicPath(pathname)) {
    // Fast path: cache cookie present and matches current versions → skip DB
    const cached = req.cookies.get(LEGAL_CACHE_COOKIE)?.value
    if (cached === CURRENT_VERSIONS_KEY) {
      return res
    }

    // Slow path: query the DB
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

    if (needsAcceptance) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/legal-update'
      return NextResponse.redirect(redirectUrl)
    }

    // Acceptance is current — set cache cookie to avoid DB queries for next 5 min
    res.cookies.set(LEGAL_CACHE_COOKIE, CURRENT_VERSIONS_KEY, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: LEGAL_CACHE_MAX_AGE,
      path: '/'
    })
  }

  return res
}

export const config = {
  matcher: [
    '/((?!share|api|_next/static|_next/image|favicon.ico).*)'
  ]
}
