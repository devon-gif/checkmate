import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Minimal, edge-safe middleware.
//
// Hardening rules (do not relax without review):
// - Public marketing pages (/, /pricing, /sign-in, /sign-up, etc.) are NOT
//   in the matcher, so middleware never runs for them. This prevents a
//   middleware crash from taking down the homepage.
// - We never call the database from middleware. Legal acceptance is
//   enforced inside the protected layouts/pages instead.
// - We never read private env vars (SUPABASE_SERVICE_ROLE_KEY,
//   OPENAI_API_KEY, STRIPE_SECRET_KEY, etc.) here.
// - All Supabase calls are wrapped in try/catch so a missing or
//   misconfigured env var on Vercel cannot trigger
//   MIDDLEWARE_INVOCATION_FAILED. On error we let the request through;
//   the protected page itself can re-check auth server-side.
// ---------------------------------------------------------------------------

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/cases',
  '/settings',
  '/account',
  '/billing',
  '/admin'
]

const PUBLIC_PATHS = ['/admin/login']

function isProtectedPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return false

  return PROTECTED_PREFIXES.some(
    p => pathname === p || pathname.startsWith(p + '/')
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Defence in depth: even though the matcher excludes public paths, bail
  // out fast for anything that is not explicitly protected.
  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  const res = NextResponse.next()

  try {
    const supabase = createMiddlewareClient({ req, res })
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = pathname.startsWith('/admin')
        ? '/admin/login'
        : '/sign-in'
      redirectUrl.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (err) {
    // Never throw out of middleware — that turns into a 500 for the user.
    // Log a short, secret-free message and let the request through; the
    // protected page will perform its own server-side auth check.
    console.error(
      '[middleware] auth check failed, allowing request:',
      err instanceof Error ? err.message : String(err)
    )
  }

  return res
}

export const config = {
  // Run middleware ONLY for protected app sections. Everything else
  // (homepage, marketing, legal pages, sign-in/up, share links, api,
  // _next assets) is excluded so a middleware fault cannot break them.
  matcher: [
    '/dashboard/:path*',
    '/cases/:path*',
    '/settings/:path*',
    '/account/:path*',
    '/billing/:path*',
    '/admin/:path*'
  ]
}
