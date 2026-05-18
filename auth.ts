import 'server-only'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Server-side session lookup.
 *
 * IMPORTANT: this is called from the root `<Header />` in `app/layout.tsx`,
 * so it runs on EVERY route including public marketing pages. It must
 * NEVER throw — if Supabase env vars are missing or the auth call fails,
 * we return `null` (treated as "logged out") and the page still renders.
 */
export const auth = async ({
  cookieStore
}: {
  cookieStore: ReturnType<typeof cookies>
}) => {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[auth] Supabase public env vars missing — treating user as logged out.'
      )
    }
    return null
  }

  try {
    const supabase = createServerComponentClient({
      cookies: () => cookieStore
    })
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('[auth] getSession error:', error.message)
      return null
    }
    return data.session
  } catch (err) {
    console.error(
      '[auth] unexpected failure, treating as logged out:',
      err instanceof Error ? err.message : String(err)
    )
    return null
  }
}
