/**
 * app/admin/tickets/page.tsx  — Admin support ticket queue
 *
 * Force dynamic: uses Supabase service role and must not be prerendered.
 */
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { TicketStatusSelect } from './TicketStatusSelect'
import {
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketCategory
} from '@/lib/support/types'
import { requireAdmin } from '@/lib/admin/access'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const STATUS_FILTERS = ['all', ...TICKET_STATUSES] as const

const CATEGORY_FILTERS: Array<{ value: 'all' | TicketCategory; label: string }> = [
  { value: 'all', label: 'All categories' },
  { value: 'cancellation', label: TICKET_CATEGORY_LABELS.cancellation },
  { value: 'refund_request', label: TICKET_CATEGORY_LABELS.refund_request },
  { value: 'billing', label: TICKET_CATEGORY_LABELS.billing },
  { value: 'technical_issue', label: TICKET_CATEGORY_LABELS.technical_issue },
  { value: 'account_access', label: TICKET_CATEGORY_LABELS.account_access },
  { value: 'report_question', label: TICKET_CATEGORY_LABELS.report_question },
  {
    value: 'suspicious_result_feedback',
    label: TICKET_CATEGORY_LABELS.suspicious_result_feedback
  },
  { value: 'other', label: TICKET_CATEGORY_LABELS.other }
]

export default async function AdminTicketsPage({
  searchParams
}: {
  searchParams?: { status?: string; category?: string }
}) {
  await requireAdmin()

  const sb = adminClient()
  const statusFilter = searchParams?.status ?? 'open'
  const categoryFilter = searchParams?.category ?? 'all'

  function buildHref(over: Partial<{ status: string; category: string }>) {
    const next = new URLSearchParams()
    next.set('status', over.status ?? statusFilter)
    next.set('category', over.category ?? categoryFilter)
    return `/admin/tickets?${next.toString()}`
  }

  let query = (sb as any)
    .from('support_tickets')
    .select('id, user_id, email, subject, message, status, category, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }
  if (categoryFilter !== 'all') {
    query = query.eq('category', categoryFilter)
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
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map(s => (
            <a
              key={s}
              href={buildHref({ status: s })}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-cm-green/20 text-cm-green'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {s === 'all'
                ? 'all'
                : TICKET_STATUS_LABELS[s as keyof typeof TICKET_STATUS_LABELS] ?? s}
            </a>
          ))}
        </div>
      </div>

      {/* Category filter chips (cancellation / refund / etc.) */}
      <div className="flex flex-wrap gap-1">
        {CATEGORY_FILTERS.map(c => (
          <a
            key={c.value}
            href={buildHref({ category: c.value })}
            className={`rounded-full border px-3 py-1 text-[11px] transition ${
              categoryFilter === c.value
                ? 'border-cm-green/40 bg-cm-green/10 text-cm-green'
                : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'
            }`}
          >
            {c.label}
          </a>
        ))}
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
