/**
 * lib/admin/access.ts
 *
 * Server-only helper for admin access control.
 * MVP approach: email whitelist via ADMIN_EMAILS env var.
 *
 * Usage:
 *   const ok   = await isAdminUser()
 *   await requireAdmin()   // redirects to /dashboard if not admin
 *
 * To add yourself as admin, set in .env.local:
 *   ADMIN_EMAILS=you@example.com,colleague@example.com
 */
import 'server-only'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

import { auth } from '@/auth'

/** Returns the email → lowercase whitelist from ADMIN_EMAILS env var. */
function getAdminEmailList(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

/** Returns true if the currently logged-in user is in the admin whitelist. */
export async function isAdminUser(): Promise<boolean> {
  const whitelist = getAdminEmailList()
  if (whitelist.length === 0) return false

  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (!session?.user?.email) return false

  return whitelist.includes(session.user.email.toLowerCase())
}

/**
 * Call this at the top of any admin server component or route handler.
 * Redirects to /dashboard if the user is not an admin.
 */
export async function requireAdmin(): Promise<void> {
  const ok = await isAdminUser()
  if (!ok) {
    redirect('/dashboard')
  }
}

// ─── Admin billing test mode ──────────────────────────────────────────────
//
// The admin billing test panel at /admin/billing-test lets a whitelisted
// admin flip their own user_billing row through every plan state for
// dashboard / access-gate testing without going through Stripe Checkout.
// It is doubly gated:
//
//   1. ENABLE_ADMIN_BILLING_TEST_TOOLS=true must be set server-side.
//   2. The signed-in user's email must be in ADMIN_EMAILS.
//
// Both checks must pass — the flag alone is not enough, and the
// allowlist alone is not enough. NEVER use a NEXT_PUBLIC_ prefix on
// either of these — they are server-only and must not be exposed in
// the client bundle.

/** True when admin billing test tools are enabled by the server env flag. */
export function isAdminBillingTestEnabled(): boolean {
  return process.env.ENABLE_ADMIN_BILLING_TEST_TOOLS === 'true'
}

/**
 * Returns true only when BOTH the feature flag is on AND the current
 * session belongs to a user in ADMIN_EMAILS. Used by the admin footer
 * link visibility check and the page/route gates.
 */
export async function canUseAdminBillingTest(): Promise<boolean> {
  if (!isAdminBillingTestEnabled()) return false
  return isAdminUser()
}
