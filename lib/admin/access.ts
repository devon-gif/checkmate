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
