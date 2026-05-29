/**
 * lib/feedback-token.ts
 *
 * Server-only. HMAC-SHA256 sign/verify for email feedback links.
 *
 * Every inbound email reply includes two feedback links:
 *   GET /api/feedback/email?caseId=<uuid>&rating=accurate&token=<hex32>
 *   GET /api/feedback/email?caseId=<uuid>&rating=not_right&token=<hex32>
 *
 * The token is derived as:
 *   HMAC-SHA256(FEEDBACK_SIGNING_SECRET, caseId).hex.slice(0, 32)
 *
 * The same token covers both rating directions for the same case —
 * clicking "Not right" after "Accurate" simply updates the existing row.
 *
 * Security properties:
 *   - Without the secret an attacker cannot forge a valid token for any caseId.
 *   - The secret never leaves the server (no NEXT_PUBLIC_ prefix).
 *   - Verification uses timingSafeEqual to prevent timing attacks.
 *   - If FEEDBACK_SIGNING_SECRET is not set, signFeedbackToken returns null
 *     so callers omit feedback links rather than throwing or leaking.
 */
import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Derive a 32-char hex HMAC token for a caseId.
 * Returns null when FEEDBACK_SIGNING_SECRET is absent — callers should
 * silently omit the feedback links rather than throwing.
 */
export function signFeedbackToken(caseId: string): string | null {
  const secret = process.env.FEEDBACK_SIGNING_SECRET
  if (!secret) return null
  return createHmac('sha256', secret).update(caseId).digest('hex').slice(0, 32)
}

/**
 * Verify that `token` is the correct HMAC for `caseId`.
 * Returns false for any mismatch, bad length, or missing secret.
 */
export function verifyFeedbackToken(caseId: string, token: string): boolean {
  const secret = process.env.FEEDBACK_SIGNING_SECRET
  if (!secret || typeof token !== 'string' || token.length !== 32) return false
  try {
    const expected = createHmac('sha256', secret).update(caseId).digest('hex').slice(0, 32)
    // Use Uint8Array to satisfy timingSafeEqual's ArrayBufferView constraint
    const a = new Uint8Array(Buffer.from(expected, 'ascii'))
    const b = new Uint8Array(Buffer.from(token, 'ascii'))
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
