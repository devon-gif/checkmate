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

  // Standalone bar rendered AFTER <Footer/> in app/layout.tsx. We don't
  // sit inside the footer DOM any more — that file is in the client
  // bundle via chat-panel→FooterText and would refuse our server-only
  // import. Visible to admins only; non-admins render `null` above.
  return (
    <div className="border-t border-yellow-400/15 bg-yellow-400/[0.03] px-4 py-2 text-center">
      <Link
        href="/admin/billing-test"
        className="text-xs font-medium text-yellow-300/80 transition-colors hover:text-yellow-200"
        title="Admin billing test panel (admin-only)"
      >
        Admin tools
      </Link>
    </div>
  )
}
