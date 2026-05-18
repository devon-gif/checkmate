/**
 * lib/env.ts
 *
 * Soft environment validation.
 *
 * IMPORTANT: this module MUST NOT throw at runtime. It is imported by
 * server entry points that may be reached on Vercel before all env vars
 * are configured. Throwing here would convert a missing optional key
 * into "Application error: a server-side exception" on the homepage.
 *
 * Public marketing pages must keep rendering even if Supabase / OpenAI /
 * Stripe env vars are absent. Routes that actually need a key check at
 * call-time and return a friendly error.
 *
 * Usage:
 *   import '@/lib/env'  // warns about missing vars; never throws
 *   import { hasSupabasePublicEnv, hasOpenAIEnv } from '@/lib/env'
 */

const PUBLIC_SUPABASE: string[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
]

const RECOMMENDED: string[] = ['OPENAI_API_KEY', 'CHECKMATE_ANALYZER_MODEL']

// Warn once per process, not on every import.
const globalAny = globalThis as unknown as { __checkrayEnvWarned?: boolean }

if (!globalAny.__checkrayEnvWarned) {
  globalAny.__checkrayEnvWarned = true

  for (const key of PUBLIC_SUPABASE) {
    if (!process.env[key]) {
      console.warn(
        `[env] Public Supabase var missing: ${key}. Auth/dashboard features ` +
          'will be disabled. Public marketing pages will continue to render.'
      )
    }
  }

  for (const key of RECOMMENDED) {
    if (!process.env[key]) {
      console.warn(
        `[env] Recommended var missing: ${key}. ` +
          (key === 'OPENAI_API_KEY'
            ? 'The deterministic fallback analyzer will run instead.'
            : 'Falling back to defaults where possible.')
      )
    }
  }
}

// ─── Capability flags ────────────────────────────────────────────────────────
// Use these at call-time inside routes/server actions to decide whether to
// proceed or return a friendly "feature unavailable" response.

export const hasSupabasePublicEnv = (): boolean =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

export const hasSupabaseServiceEnv = (): boolean =>
  Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY && hasSupabasePublicEnv()
  )

export const hasOpenAIEnv = (): boolean =>
  Boolean(process.env.OPENAI_API_KEY)

export const hasStripeEnv = (): boolean =>
  Boolean(process.env.STRIPE_SECRET_KEY)
