/**
 * app/admin/tickets/page.tsx  — Admin support ticket queue
 *
 * Force dynamic: uses Supabase service role and must not be prerendered.
 */
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { TicketStatusSelect } from './TicketStatusSelect'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const STATUS_FILTERS = ['all', 'open', 'in_progress', 'resolved', 'closed']

export default async function AdminTicketsPage({
  searchParams
}: {
  searchParams?: { status?: string }
}) {
  const sb = adminClient()
  const statusFilter = searchParams?.status ?? 'open'

  let query = (sb as any)
    .from('support_tickets')
    .select('id, user_id, email, subject, message, status, category, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data: tickets } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
          <p className="mt-1 text-sm text-white/40">
            {tickets?.length ?? 0} ticket{(tickets?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1">
          {STATUS_FILTERS.map(s => (
            <a
              key={s}
              href={`/admin/tickets${s === 'all' ? '?status=all' : `?status=${s}`}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-cm-green/20 text-cm-green'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {s}
            </a>
          ))}
        </div>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="text-left text-xs uppercase tracking-widest text-white/30">
              <th className="px-5 py-3">Subject</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">From</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {!tickets?.length && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-white/30">
                  No tickets.
                </td>
              </tr>
            )}
            {(tickets ?? []).map((t: any) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-5 py-3">
                  <p className="font-medium text-white">{t.subject}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-white/30">
                    {t.message}
                  </p>
                </td>
                <td className="px-5 py-3 text-white/50">{t.category}</td>
                <td className="px-5 py-3 text-white/50">
                  {t.email ?? (t.user_id ? (
                    <a
                      href={`/admin/customers/${t.user_id}`}
                      className="text-cm-green hover:underline"
                    >
                      View user →
                    </a>
                  ) : 'Anonymous')}
                </td>
                <td className="px-5 py-3">
                  <TicketStatusSelect ticketId={t.id} currentStatus={t.status} />
                </td>
                <td className="px-5 py-3 text-white/30">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  )
}
