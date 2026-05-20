/**
 * app/admin/page.tsx  — Admin overview / stats dashboard
 *
 * Force dynamic: this page calls Supabase with the service role key and
 * must never be statically prerendered. (Also works around a Next 13.4
 * RSC manifest bug when a global-error boundary is present.)
 */
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { GlassCard } from '@/components/checkmate/GlassCard'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}
function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <GlassCard className="p-6">
      <p className="text-xs font-medium uppercase tracking-widest text-white/40">
        {label}
      </p>
      <p
        className={`mt-2 text-4xl font-bold tabular-nums ${accent ? 'text-cm-green' : 'text-white'}`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </GlassCard>
  )
}

export default async function AdminOverviewPage() {
  const sb = adminClient()

  // Run all counts in parallel
  const [
    { count: totalUsers },
    { count: totalCases },
    { count: checks7d },
    { count: openTickets },
    { data: planBreakdown }
  ] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb.from('cases').select('*', { count: 'exact', head: true }),
    sb
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),
    (sb as any)
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
    (sb as any)
      .from('user_billing' as any)
      .select('plan, count:plan')
  ])

  // Summarise plan counts from raw rows (fallback if group-by not available)
  const planMap: Record<string, number> = {}
  if (Array.isArray(planBreakdown)) {
    for (const row of planBreakdown as any[]) {
      const p = (row.plan as string) ?? 'unknown'
      planMap[p] = (planMap[p] ?? 0) + 1
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="mt-1 text-sm text-white/40">Live counts from Supabase.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total users" value={totalUsers ?? '—'} accent />
        <StatCard label="Total cases" value={totalCases ?? '—'} />
        <StatCard
          label="Checks (7 d)"
          value={checks7d ?? '—'}
          sub="usage_events"
        />
        <StatCard
          label="Open tickets"
          value={openTickets ?? '—'}
          sub="support tickets"
        />
      </div>

      {/* Plan breakdown */}
      <GlassCard className="p-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
          Plan breakdown
        </p>
        {Object.keys(planMap).length === 0 ? (
          <p className="text-sm text-white/30">No billing rows found.</p>
        ) : (
          <div className="flex flex-wrap gap-6">
            {Object.entries(planMap).map(([plan, count]) => (
              <div key={plan}>
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-xs text-white/40 capitalize">{plan}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Quick nav */}
      <GlassCard className="p-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
          Quick links
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/customers"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-cm-green/40 hover:text-white"
          >
            → View all customers
          </a>
          <a
            href="/admin/tickets"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-cm-green/40 hover:text-white"
          >
            → View support tickets
          </a>
        </div>
      </GlassCard>
    </div>
  )
}
