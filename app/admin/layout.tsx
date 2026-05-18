/**
 * app/admin/layout.tsx
 *
 * Admin section layout — guards every /admin/* route.
 * Redirects to /dashboard if the user is not in ADMIN_EMAILS.
 */
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/access'

const NAV_LINKS = [
  { href: '/admin', label: '⬡ Overview' },
  { href: '/admin/customers', label: '👤 Customers' },
  { href: '/admin/tickets', label: '🎫 Tickets' },
]

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  // Throws a redirect if not admin — no auth state needed in children.
  await requireAdmin()

  return (
    <div className="flex min-h-screen flex-col bg-cm-bg text-white">
      {/* Top admin bar */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold tracking-widest text-cm-green uppercase">
              CheckMate Admin
            </span>
            <nav className="flex gap-4">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-white/60 transition hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-white/40 transition hover:text-white/70"
          >
            ← Back to app
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  )
}
