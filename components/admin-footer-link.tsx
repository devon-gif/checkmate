/**
 * components/admin-footer-link.tsx
 *
 * Small "Admin tools" link rendered in the footer. Visible ONLY when:
 *   - ENABLE_ADMIN_BILLING_TEST_TOOLS=true (server-only env flag), AND
 *   - the signed-in user's email is in ADMIN_EMAILS.
 *
 * Server-only: this never ships to the client bundle, and the visibility
 * check happens server-side so a normal user can't reveal the link by
 * tampering with cookies / localStorage.
 */
import 'server-only'

import Link from 'next/link'

import { canUseAdminBillingTest } from '@/lib/admin/access'

export async function AdminFooterLink() {
  const allowed = await canUseAdminBillingTest()
  if (!allowed) return null

  return (
    <>
      <div className="w-0.25 h-4 mx-6 bg-white/20 max-md:hidden" />
      <Link
        href="/admin/billing-test"
        className="text-description-3 text-yellow-300/70 transition-colors hover:text-yellow-200"
        title="Admin billing test panel (admin-only)"
      >
        Admin tools
      </Link>
    </>
  )
}
