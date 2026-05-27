export const dynamic = 'force-dynamic'

import Link from 'next/link'

import { GlassCard } from '@/components/checkmate/GlassCard'
import { listBetaAccess, listBetaRequests } from '@/lib/billing/beta-access'
import {
  areAdminToolsEnabled,
  isAdminEmail,
  requireAdmin
} from '@/lib/admin/access'
import { BetaTestersPanel } from './BetaTestersPanel'
import { PendingBetaRequestsPanel } from './PendingBetaRequestsPanel'

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

// Small server-side helper for the diagnostics panel. We only ever read
// public env values + flags here — never secrets. The whole panel is only
// rendered after `requireAdmin()` succeeds.
function diagnosticsSnapshot(email: string) {
  return {
    enableAdminTools: areAdminToolsEnabled(),
    enableAdminToolsRaw: process.env.ENABLE_ADMIN_TOOLS ?? '(unset)',
    currentEmail: email,
    emailAllowed: isAdminEmail(email),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '(unset)',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? '(unset)',
    // Just the count of admin emails — never the full list — so an admin
    // can verify ADMIN_EMAILS isn't empty in this environment without
    // accidentally disclosing every admin address.
    adminEmailCount: (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean).length
  }
}

export default async function AdminOverviewPage() {
  // requireAdmin() returns { userId, email } on success, otherwise it
  // either redirects to /admin/login (no session) or calls notFound()
  // (admin tools disabled OR email not on allowlist).
  const admin = await requireAdmin()
  const diag = diagnosticsSnapshot(admin.email)
  // Fetch both the granted-beta-testers list AND the inbound public
  // request queue. Each call is independent and degrades to [] on
  // error, so a missing migration on one table never breaks the page.
  const [betaUsers, betaRequests] = await Promise.all([
    listBetaAccess(),
    listBetaRequests()
  ])

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

      {/* Diagnostics — admin-only. Renders inside requireAdmin() gate so
          a non-admin can never see these values. We never print secrets
          (no Stripe / Supabase / OpenAI keys, no full ADMIN_EMAILS list);
          only flags and public URLs. */}
      <GlassCard className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            Admin diagnostics
          </h2>
          <span className="rounded-full border border-yellow-400/25 bg-yellow-400/8 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-yellow-300/80">
            admin-only
          </span>
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-white/40">
              Current user
            </dt>
            <dd className="mt-1 font-mono text-white/80">{diag.currentEmail}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-white/40">
              Email on allowlist
            </dt>
            <dd className="mt-1 font-mono">
              {diag.emailAllowed ? (
                <span className="text-cm-green">yes</span>
              ) : (
                <span className="text-red-400">no</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-white/40">
              ENABLE_ADMIN_TOOLS
            </dt>
            <dd className="mt-1 font-mono">
              {diag.enableAdminTools ? (
                <span className="text-cm-green">true</span>
              ) : (
                <span className="text-red-400">
                  {String(diag.enableAdminToolsRaw)}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-white/40">
              ADMIN_EMAILS entries
            </dt>
            <dd className="mt-1 font-mono text-white/80">
              {diag.adminEmailCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-white/40">
              NEXT_PUBLIC_APP_URL
            </dt>
            <dd className="mt-1 font-mono text-white/70">{diag.appUrl}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-white/40">
              NEXT_PUBLIC_SITE_URL
            </dt>
            <dd className="mt-1 font-mono text-white/70">{diag.siteUrl}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-white/35">
          Secrets are never shown here. Magic links use{' '}
          <code className="rounded bg-white/5 px-1 py-0.5 text-white/55">
            {diag.appUrl}/auth/callback?next=/admin
          </code>{' '}
          — make sure that URL is in your Supabase project&apos;s{' '}
          <em>Authentication → Redirect URLs</em> allowlist.
        </p>
      </GlassCard>

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

      {/* Pending beta requests appear ABOVE the granted testers list so
          new work-to-do is the first thing the admin sees on this page.
          BetaTestersPanel stays below for granting access manually by
          email (e.g. for friends or testers who never used /beta). */}
      <PendingBetaRequestsPanel requests={betaRequests} />

      <BetaTestersPanel betaUsers={betaUsers} />
    </div>
  )
}
