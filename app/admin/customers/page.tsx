/**
 * app/admin/customers/page.tsx  — Customer list with search
 *
 * Force dynamic: uses Supabase service role and must not be prerendered.
 */
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { requireAdmin } from '@/lib/admin/access'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function AdminCustomersPage({
  searchParams
}: {
  searchParams?: { q?: string }
}) {
  await requireAdmin()

  const sb = adminClient()
  const query = (searchParams?.q ?? '').trim()

  // Fetch users from auth.users via admin API
  const { data: { users: authUsers = [] } } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 200
  })

  // Optionally filter by email
  const filtered = query
    ? authUsers.filter(u =>
        (u.email ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : authUsers

  // Pull per-user billing rows in bulk (best-effort)
  const { data: billingRows } = await (sb as any)
    .from('user_billing')
    .select('user_id, plan, trial_ends_at, subscription_status')

  const billingMap: Record<string, any> = {}
  for (const row of billingRows ?? []) {
    billingMap[row.user_id] = row
  }

  // Pull case counts per user
  const { data: caseCounts } = await sb
    .from('cases')
    .select('user_id')

  const caseCountMap: Record<string, number> = {}
  for (const row of caseCounts ?? []) {
    caseCountMap[row.user_id] = (caseCountMap[row.user_id] ?? 0) + 1
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="mt-1 text-sm text-white/40">
            {filtered.length} of {authUsers.length} users
          </p>
        </div>

        <form method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by email…"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-cm-green/50"
          />
          <button
            type="submit"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-cm-green/40 hover:text-white"
          >
            Search
          </button>
        </form>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="text-left text-xs uppercase tracking-widest text-white/30">
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Cases</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-white/30"
                >
                  No users found.
                </td>
              </tr>
            )}
            {filtered.map(u => {
              const billing = billingMap[u.id]
              const plan = billing?.plan ?? '—'
              const cases = caseCountMap[u.id] ?? 0
              const joined = u.created_at
                ? new Date(u.created_at).toLocaleDateString()
                : '—'
              return (
                <tr
                  key={u.id}
                  className="border-b border-white/5 transition hover:bg-white/5"
                >
                  <td className="px-5 py-3 font-medium text-white">
                    {u.email ?? u.id}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        plan === 'pro'
                          ? 'bg-cm-green/20 text-cm-green'
                          : plan === 'trial'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-white/60">{cases}</td>
                  <td className="px-5 py-3 text-white/40">{joined}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/customers/${u.id}`}
                      className="text-cm-green hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </GlassCard>
    </div>
  )
}
