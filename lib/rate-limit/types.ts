/**
 * lib/rate-limit/types.ts
 *
 * Rate limit types stub — not yet enforced.
 * See RATE_LIMITING_TODO.md for implementation plan.
 */

export type RateLimitKey =
  | 'anon_analyze_ip'       // anonymous /api/analyze-case per IP
  | 'anon_support_ip'       // anonymous /api/support/submit per IP
  | 'user_analyze'          // per-user analyze (handled by billing gate)
  | 'admin_action'          // admin mutation endpoints

export interface RateLimitConfig {
  key: RateLimitKey
  /** Max requests allowed in the window. */
  limit: number
  /** Window duration in seconds. */
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  /** Human-readable reason if blocked. */
  reason?: string
}
