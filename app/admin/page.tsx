export const dynamic = 'force-dynamic'

import Link from 'next/link'

import { GlassCard } from '@/components/checkmate/GlassCard'
import { requireAdmin } from '@/lib/admin/access'

const CARDS = [
  {
    title: 'Billing Test',
    description: 'Switch your own CheckRay billing state without touching Stripe.',
    href: '/admin/billing-test'
  },
  {
    title: 'Dashboard',
    description: 'Verify the customer-facing plan and usage display.',
    href: '/dashboard'
  },
  {
    title: 'Pricing',
    description: 'Review live pricing CTAs and checkout entry points.',
    href: '/pricing'
  },
  {
    title: 'New Case',
    description: 'Run a check against the selected plan and usage limit.',
    href: '/cases/new'
  },
  {
    title: 'Customers',
    description: 'Inspect customer records and billing cache rows.',
    href: '/admin/customers'
  },
  {
    title: 'Support Tickets',
    description: 'Review support requests and billing questions.',
    href: '/admin/tickets'
  }
]

export const metadata = {
  title: 'Admin | CheckRay',
  robots: { index: false, follow: false }
}

export default async function AdminOverviewPage() {
  const admin = await requireAdmin()

  return (
    <div className="space-y-8">
      <header>
        <span className="mb-3 inline-block rounded-full border border-cm-green/30 bg-cm-green/10 px-3 py-1 text-xs font-medium text-cm-green">
          Admin tools enabled
        </span>
        <h1 className="text-2xl font-bold text-white">CheckRay Admin</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
          Signed in as {admin.email}. Use these tools to test billing states,
          dashboard access, and pricing flows.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CARDS.map(card => (
          <Link key={card.href} href={card.href} className="group block">
            <GlassCard className="h-full p-6 transition group-hover:border-cm-green/35 group-hover:bg-white/[0.04]">
              <h2 className="text-base font-semibold text-white">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/45">
                {card.description}
              </p>
              <p className="mt-5 text-xs font-medium text-cm-green">
                Open
              </p>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  )
}
