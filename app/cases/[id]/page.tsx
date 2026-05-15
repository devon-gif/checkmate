import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

import { auth } from '@/auth'
import { RiskReport } from '@/components/risk-report'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'
import { CaseRiskBadge } from '@/components/case-risk-badge'
import { IconArrowRight } from '@/components/ui/icons'
import { humanizeCategory } from '@/lib/checkmate-shared'
import { type Database, type Json } from '@/lib/db_types'
import type { RiskReportData } from '@/components/risk-report'
import type { CaseCategory, RiskLevel } from '@/lib/checkmate-shared'

function asStringArray(v: Json): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string')
    : []
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props) {
  return { title: `Case ${params.id.slice(0, 8)}… — CheckMate` }
}

export default async function CaseDetailPage({ params }: Props) {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  // RLS requires authentication — redirect guests to sign-in with return URL
  if (!session?.user?.id) {
    redirect(`/sign-in?next=/cases/${params.id}`)
  }

  const supabase = createServerComponentClient<Database, 'public', any>({
    cookies: () => cookieStore
  })

  // Fetch case — RLS ensures this returns null if the case belongs to another user
  const { data: caseRow } = await supabase
    .from('cases')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!caseRow) {
    notFound()
  }

  // Fetch the risk report
  const { data: reportRow } = await supabase
    .from('risk_reports')
    .select('*')
    .eq('case_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Fetch original submitted content
  const { data: messages } = await supabase
    .from('case_messages')
    .select('content, sender_role, created_at')
    .eq('case_id', params.id)
    .eq('sender_role', 'user')
    .order('created_at', { ascending: true })
    .limit(1)

  const submittedContent = messages?.[0]?.content ?? null

  // Build typed report for the display component
  const reportData: RiskReportData | null = reportRow
    ? {
        category: caseRow.category as CaseCategory,
        risk_score: caseRow.risk_score,
        risk_level: caseRow.risk_level as RiskLevel,
        summary: reportRow.summary ?? '',
        red_flags: asStringArray(reportRow.red_flags),
        recommended_actions: asStringArray(reportRow.recommended_actions),
        safe_reply: reportRow.safe_reply ?? '',
        disclaimer: reportRow.disclaimer ?? '',
        case_id: caseRow.id
      }
    : null

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-white/40">
        <Link href="/dashboard" className="transition hover:text-white/70">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-white/60">Case detail</span>
      </nav>

      {/* Case header */}
      <GlassCard className="mb-6 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CaseRiskBadge level={caseRow.risk_level} />
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] capitalize text-white/50">
                {humanizeCategory(caseRow.category)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] capitalize text-white/50">
                {caseRow.status}
              </span>
            </div>
            <h1 className="truncate text-base font-semibold text-white">
              {caseRow.title}
            </h1>
            <p className="text-xs text-white/40">
              Checked {formatDate(caseRow.created_at)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-2xl font-bold text-white">
              {caseRow.risk_score}
              <span className="ml-0.5 text-sm text-white/30">/100</span>
            </span>
          </div>
        </div>

        {/* Submitted content preview */}
        {submittedContent && (
          <details className="mt-4">
            <summary className="cursor-pointer select-none text-xs text-white/40 transition hover:text-white/60">
              Show submitted content
            </summary>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-white/8 bg-white/3 p-4 font-mono text-xs leading-relaxed text-white/60">
              {submittedContent}
            </pre>
          </details>
        )}
      </GlassCard>

      {/* Risk report */}
      {reportData ? (
        <RiskReport report={reportData} />
      ) : (
        <GlassCard className="p-8 text-center">
          <p className="text-sm text-white/40">
            No risk report found for this case.
          </p>
        </GlassCard>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <GradientButton href="/cases/new" variant="primary">
          Check another
        </GradientButton>
        <GradientButton href="/dashboard" variant="secondary">
          Back to dashboard
        </GradientButton>
      </div>
    </div>
  )
}
