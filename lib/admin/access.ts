/**
 * lib/admin/access.ts
 *
 * Server-only helper for admin access control.
 * MVP approach: email whitelist via ADMIN_EMAILS env var.
 *
 * Usage:
 *   const access = await getAdminAccess()
 *   await requireAdmin()
 *
 * To add yourself as admin, set in .env.local:
 *   ENABLE_ADMIN_TOOLS=true
 *   ADMIN_EMAILS=you@example.com,colleague@example.com
 */
import 'server-only'

import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'

import { auth } from '@/auth'

export type AdminAccess =
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: 'disabled' | 'unauthenticated' | 'forbidden' }

/** Returns the email → lowercase whitelist from ADMIN_EMAILS env var. */
function getAdminEmailList(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

/** Checks an arbitrary email against the server-only admin allowlist. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmailList().includes(email.trim().toLowerCase())
}

/** True when all admin tools are enabled by the server env flag. */
export function areAdminToolsEnabled(): boolean {
  return process.env.ENABLE_ADMIN_TOOLS === 'true'
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

export async function getAdminAccess(): Promise<AdminAccess> {
  if (!areAdminToolsEnabled()) {
    return { ok: false, reason: 'disabled' }
  }

  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (!session?.user?.id || !session.user.email) {
    return { ok: false, reason: 'unauthenticated' }
  }

  if (!isAdminEmail(session.user.email)) {
    return { ok: false, reason: 'forbidden' }
  }

  return {
    ok: true,
    userId: session.user.id,
    email: session.user.email
  }
}

/**
 * Call this at the top of any admin server component or route handler.
 * Redirects to the admin login if unauthenticated; hides admin tools
 * (404) when disabled or the email is not on the allowlist.
 */
export async function requireAdmin(): Promise<{ userId: string; email: string }> {
  const access = await getAdminAccess()
  if (access.ok) {
    return { userId: access.userId, email: access.email }
  }

  if (access.reason === 'unauthenticated') {
    redirect('/admin/login')
  }

  notFound()
}

// ─── Admin billing test mode ──────────────────────────────────────────────
//
// The admin billing test panel at /admin/billing-test lets a whitelisted
// admin flip their own user_billing row through every plan state for
// dashboard / access-gate testing without going through Stripe Checkout.
// It is doubly gated:
//
//   1. ENABLE_ADMIN_TOOLS=true must be set server-side.
//   2. The signed-in user's email must be in ADMIN_EMAILS.
//
// Both checks must pass — the flag alone is not enough, and the
// allowlist alone is not enough. NEVER use a NEXT_PUBLIC_ prefix on
// either of these — they are server-only and must not be exposed in
// the client bundle.

/**
 * Returns true only when BOTH the feature flag is on AND the current
 * session belongs to a user in ADMIN_EMAILS. Used by the admin footer
 * link visibility check and the page/route gates.
 */
export async function canUseAdminBillingTest(): Promise<boolean> {
  const access = await getAdminAccess()
  return access.ok
}

/**
 * Legacy alias for `areAdminToolsEnabled()` retained so any older call
 * sites that imported `isAdminBillingTestEnabled` keep compiling.
 *
 * @deprecated use areAdminToolsEnabled
 */
export function isAdminBillingTestEnabled(): boolean {
  return areAdminToolsEnabled()
}
