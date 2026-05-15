import Link from 'next/link'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

import { auth } from '@/auth'
import { CaseRiskBadge } from '@/components/case-risk-badge'
import { LegalDisclaimer } from '@/components/legal-disclaimer'
import { IconArrowRight, IconPlus } from '@/components/ui/icons'
import { humanizeCategory } from '@/lib/checkmate'
import { type Database, type Json } from '@/lib/db_types'
import { DashboardCards } from '@/components/checkmate/DashboardCards'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'

type CaseRow = Database['public']['Tables']['cases']['Row']
type ReportRow = Database['public']['Tables']['risk_reports']['Row']

function asStringArray(value: Json) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export default async function DashboardPage() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  if (!session?.user?.id) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center px-6 py-16">
        <GlassCard className="w-full p-10">
          <span className="mb-5 inline-block rounded-full border border-cm-green/30 bg-cm-green/10 px-3 py-1 text-xs font-medium text-cm-green">
            Personal risk assistant
          </span>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Check messages, links, bills, and offers before they cost you.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/50">
            Paste suspicious text or a URL and get a plain-English risk readout,
            possible red flags, and suggested next steps.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <GradientButton href="/sign-in" variant="primary">
              Sign in
            </GradientButton>
            <GradientButton href="/sign-up" variant="secondary">
              Create account
            </GradientButton>
          </div>
        </GlassCard>
      </div>
    )
  }

  const supabase = createServerComponentClient<Database, 'public', any>({
    cookies: () => cookieStore
  })

  const { data: cases } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .throwOnError()

  const caseRows = (cases ?? []) as CaseRow[]
  const caseIds = caseRows.map(item => item.id)
  const { data: reports } = caseIds.length
    ? await supabase
        .from('risk_reports')
        .select('*')
        .in('case_id', caseIds)
        .order('created_at', { ascending: false })
        .throwOnError()
    : { data: [] }

  const reportByCase = new Map<string, ReportRow>()
  ;((reports ?? []) as ReportRow[]).forEach(report => {
    if (!reportByCase.has(report.case_id))
      reportByCase.set(report.case_id, report)
  })

  const total = caseRows.length
  const highRisk = caseRows.filter(item =>
    ['high', 'very_high'].includes(item.risk_level)
  ).length
  const averageScore = total
    ? Math.round(
        caseRows.reduce((sum, item) => sum + item.risk_score, 0) / total
      )
    : 0

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header row */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="mb-3 inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/50">
            CheckMate dashboard
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Your risk checks
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/40">
            Review active cases, risk signals, and suggested next steps before
            replying, clicking, paying, or sharing information.
          </p>
        </div>
        <GradientButton href="/cases/new" variant="primary">
          <IconPlus className="mr-1.5 h-4 w-4" />
          New case
        </GradientButton>
      </section>

      {/* Stats */}
      <DashboardCards
        total={total}
        highRisk={highRisk}
        averageScore={averageScore}
      />

      {/* Cases list */}
      <GlassCard className="overflow-hidden">
        <div className="border-b border-white/8 px-5 py-4">
          <h2 className="text-sm font-medium text-white">Recent cases</h2>
        </div>
        {caseRows.length ? (
          <div className="divide-y divide-white/5">
            {caseRows.map(item => {
              const report = reportByCase.get(item.id)
              const flags = report ? asStringArray(report.red_flags) : []
              return (
                <article
                  key={item.id}
                  className="grid gap-4 px-5 py-5 transition-colors hover:bg-white/3 lg:grid-cols-[1fr_180px_120px_32px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/cases/${item.id}`}
                        className="truncate text-sm font-medium text-white transition hover:text-cm-green"
                      >
                        {item.title}
                      </Link>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] capitalize text-white/50">
                        {humanizeCategory(item.category)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-6 text-white/40">
                      {report?.summary ?? 'No report summary yet.'}
                    </p>
                    {flags[0] ? (
                      <p className="mt-1 text-xs text-white/30">
                        First red flag: {flags[0]}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/30">
                      Risk
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <CaseRiskBadge level={item.risk_level} />
                      <span className="font-mono text-sm text-white/60">
                        {item.risk_score}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/30">
                      Status
                    </p>
                    <p className="mt-2 text-sm capitalize text-white/60">
                      {item.status}
                    </p>
                  </div>
                  <Link
                    href={`/cases/${item.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 transition hover:border-cm-green/30 hover:text-cm-green"
                    aria-label="View case details"
                  >
                    <IconArrowRight />
                  </Link>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <h3 className="text-base font-medium text-white">No cases yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/40">
              Start with a suspicious text, invoice, job message, rental
              listing, marketplace note, or URL.
            </p>
            <div className="mt-6 flex justify-center">
              <GradientButton href="/cases/new" variant="primary">
                Create your first case
              </GradientButton>
            </div>
          </div>
        )}
      </GlassCard>

      <LegalDisclaimer variant="default" className="mb-4" />
    </div>
  )
}
