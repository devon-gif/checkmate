/**
 * app/admin/reviews/page.tsx — Admin feedback review queue
 *
 * Shows all case_feedback rows newest-first with full case/report context.
 * Admins can set status and notes via inline forms that call
 * PATCH /api/admin/feedback/[id].
 */
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

import { GlassCard } from '@/components/checkmate/GlassCard'
import { CaseRiskBadge } from '@/components/case-risk-badge'
import { requireAdmin } from '@/lib/admin/access'
import { humanizeCategory } from '@/lib/checkmate-shared'
import { AdminFeedbackRow } from './AdminFeedbackRow'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const metadata = {
  title: 'Feedback Reviews | CheckRay Admin',
  robots: { index: false, follow: false }
}

type RatingFilter = 'all' | 'accurate' | 'not_right'
type StatusFilter = 'all' | 'unreviewed' | 'reviewed' | 'false_positive' | 'false_negative' | 'needs_rule_update' | 'needs_prompt_update'

const RATING_FILTERS: Array<{ value: RatingFilter; label: string }> = [
  { value: 'all', label: 'All ratings' },
  { value: 'accurate', label: 'Accurate' },
  { value: 'not_right', label: 'Not right' }
]

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'unreviewed', label: 'Unreviewed' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'false_positive', label: 'False positive' },
  { value: 'false_negative', label: 'False negative' },
  { value: 'needs_rule_update', label: 'Needs rule update' },
  { value: 'needs_prompt_update', label: 'Needs prompt update' }
]

export default async function AdminReviewsPage({
  searchParams
}: {
  searchParams?: { rating?: string; status?: string }
}) {
  await requireAdmin()

  const sb = adminClient()
  const ratingFilter = (searchParams?.rating ?? 'all') as RatingFilter
  const statusFilter = (searchParams?.status ?? 'unreviewed') as StatusFilter

  function buildHref(over: Partial<{ rating: string; status: string }>) {
    const p = new URLSearchParams()
    p.set('rating', over.rating ?? ratingFilter)
    p.set('status', over.status ?? statusFilter)
    return `/admin/reviews?${p.toString()}`
  }

  // Fetch feedback rows with joined case + report data via service role
  let query = (sb as any)
    .from('case_feedback')
    .select(`
      id,
      case_id,
      user_id,
      rating,
      reason,
      note,
      admin_status,
      admin_notes,
      created_at,
      updated_at,
      cases (
        id,
        title,
        category,
        risk_level,
        risk_score,
        input_text,
        input_url,
        created_at
      ),
      risk_reports!inner (
        summary,
        red_flags,
        recommended_actions
      )
    `)
    .order('created_at', { ascending: false })
    .limit(150)

  // Supabase join alias — risk_reports is via case_id FK chain; try without inner first
  // We'll do the join manually if needed. Using left join approach:
  if (ratingFilter !== 'all') {
    query = query.eq('rating', ratingFilter)
  }
  if (statusFilter === 'unreviewed') {
    query = query.is('admin_status', null)
  } else if (statusFilter !== 'all') {
    query = query.eq('admin_status', statusFilter)
  }

  const { data: rows, error } = await query

  if (error) {
    console.error('[admin/reviews] fetch error:', error.message)
  }

  const feedback = (rows ?? []) as Array<{
    id: string
    case_id: string
    user_id: string
    rating: 'accurate' | 'not_right'
    reason: string | null
    note: string | null
    admin_status: string | null
    admin_notes: string | null
    created_at: string
    updated_at: string
    cases: {
      id: string
      title: string
      category: string
      risk_level: string
      risk_score: number
      input_text: string | null
      input_url: string | null
      created_at: string
    } | null
    risk_reports: Array<{
      summary: string | null
      red_flags: unknown
      recommended_actions: unknown
    }>
  }>

  const total = feedback.length
  const unreviewed = feedback.filter(f => !f.admin_status).length
  const notRight = feedback.filter(f => f.rating === 'not_right').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Feedback Reviews</h1>
          <p className="mt-1 text-sm text-white/50">
            {total} feedback entries · {unreviewed} unreviewed · {notRight} &ldquo;not right&rdquo;
          </p>
        </div>
      </div>

      {/* Filters */}
      <GlassCard className="px-5 py-4">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/30">Rating</p>
            <div className="flex flex-wrap gap-2">
              {RATING_FILTERS.map(({ value, label }) => (
                <Link
                  key={value}
                  href={buildHref({ rating: value })}
                  className={[
                    'rounded-full border px-3 py-1 text-xs transition',
                    ratingFilter === value
                      ? 'border-cm-green/50 bg-cm-green/10 text-cm-green'
                      : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white/70'
                  ].join(' ')}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/30">Admin status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map(({ value, label }) => (
                <Link
                  key={value}
                  href={buildHref({ status: value })}
                  className={[
                    'rounded-full border px-3 py-1 text-xs transition',
                    statusFilter === value
                      ? 'border-cm-green/50 bg-cm-green/10 text-cm-green'
                      : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white/70'
                  ].join(' ')}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Rows */}
      {feedback.length === 0 ? (
        <GlassCard className="px-6 py-10 text-center">
          <p className="text-sm text-white/40">No feedback matches this filter.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {feedback.map(fb => (
            <AdminFeedbackRow key={fb.id} fb={fb} />
          ))}
        </div>
      )}
    </div>
  )
}
