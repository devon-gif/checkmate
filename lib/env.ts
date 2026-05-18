/**
 * lib/env.ts
 *
 * Runtime environment variable validation.
 * Import this at the top of any server entry point (e.g. route handlers)
 * to get loud, descriptive errors instead of silent runtime failures.
 *
 * Usage:
 *   import '@/lib/env'  // throws at module-load time if required vars missing
 */

const REQUIRED: string[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
]

const RECOMMENDED: string[] = ['OPENAI_API_KEY', 'CHECKMATE_ANALYZER_MODEL']
const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build'

for (const key of REQUIRED) {
  if (!process.env[key]) {
    if (isProductionBuild) {
      console.warn(
        `[env] Warning: required runtime environment variable not set during build: ${key}. ` +
          'Runtime routes that need it will fail until it is configured.'
      )
      continue
    }

    throw new Error(
      `[env] Missing required environment variable: ${key}\n` +
        'Add it to .env.local (local dev) or your deployment environment.'
    )
  }
}

for (const key of RECOMMENDED) {
  if (!process.env[key]) {
    console.warn(
      `[env] Warning: recommended environment variable not set: ${key}. ` +
        'The deterministic fallback analyzer will be used if OPENAI_API_KEY is absent.'
    )
  }
}
