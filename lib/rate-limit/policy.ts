/**
 * lib/rate-limit/policy.ts
 *
 * Rate limit policy definitions stub — not yet enforced.
 * When implementing, import these into middleware or route handlers.
 *
 * See RATE_LIMITING_TODO.md for implementation options (Upstash, DB, Edge).
 */

import type { RateLimitConfig } from './types'

/** Anonymous /api/analyze-case — 5 attempts / hour / IP */
export const ANON_ANALYZE_POLICY: RateLimitConfig = {
  key: 'anon_analyze_ip',
  limit: 5,
  windowSeconds: 3600
}

/** Anonymous /api/support/submit — 5 submissions / hour / IP */
export const ANON_SUPPORT_POLICY: RateLimitConfig = {
  key: 'anon_support_ip',
  limit: 5,
  windowSeconds: 3600
}

/**
 * Stub check function — currently always allows.
 * Replace body with real implementation (Upstash, DB counter, etc.)
 */
export async function checkRateLimit(
  _config: RateLimitConfig,
  _identifier: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  // TODO: implement with Upstash Redis or Supabase counter
  // For now, always allow — billing gate provides the real usage cap.
  return {
    allowed: true,
    remaining: _config.limit,
    resetAt: new Date(Date.now() + _config.windowSeconds * 1000)
  }
}
