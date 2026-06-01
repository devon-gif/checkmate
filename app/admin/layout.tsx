/**
 * app/admin/layout.tsx
 *
 * Admin section layout. Individual admin pages and API routes own their
 * server-side access checks so /admin/login can remain reachable.
 */
import Link from 'next/link'

const NAV_LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/billing-test', label: 'Billing Test' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/tickets', label: 'Tickets' },
  { href: '/admin/reviews', label: 'Feedback Reviews' },
  { href: '/admin/scam-intel', label: 'Scam Intelligence' }
]

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
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
