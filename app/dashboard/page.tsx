import Link from 'next/link'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

import { auth } from '@/auth'
import { CaseRiskBadge } from '@/components/case-risk-badge'
import { LegalDisclaimer } from '@/components/legal-disclaimer'
import { IconArrowRight, IconPlus } from '@/components/ui/icons'
import { humanizeCategory } from '@/lib/checkmate-shared'
import { type Database, type Json } from '@/lib/db_types'
import { DashboardCards } from '@/components/checkmate/DashboardCards'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'
import {
  BillingStatusCard,
  type BillingStatus
} from '@/components/checkmate/BillingStatusCard'

type CaseRow = Database['public']['Tables']['cases']['Row']
type ReportRow = Database['public']['Tables']['risk_reports']['Row']

function asStringArray(value: Json) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: { billing?: string }
}) {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  if (!session?.user?.id) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center px-6 py-16">
        <GlassCard className="w-full p-10">
          <span className="mb-5 inline-block rounded-full border border-cm-green/30 bg-cm-green/10 px-3 py-1 text-xs font-medium text-cm-green">
            Meet Ray, your risk-check assistant
          </span>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Ask Ray before you reply, click, pay, or share.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/50">
            Paste suspicious text or a URL and Ray gives you a plain-English
            risk readout, possible red flags, and suggested next steps.
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

  // Usage: checks in the last 24 h
  const FREE_TIER_DAILY_LIMIT = 25
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: checksUsedToday } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('event_type', 'check_created')
    .gte('created_at', since24h)

  // Billing status
  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, plan')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const subAny = subRow as any
  let billingStatus: BillingStatus = 'unknown'
  if (subAny?.status === 'active') {
    billingStatus = 'active'
  } else if (subAny?.status === 'trialing') {
    const trialEnd = subAny.trial_ends_at ? new Date(subAny.trial_ends_at) : null
    billingStatus = trialEnd && new Date() < trialEnd ? 'trialing' : 'expired'
  } else if (subRow) {
    billingStatus = 'expired'
  } else {
    // No subscription row yet — first visit, trial will be created on first check
    billingStatus = 'trialing'
  }

  const stripeConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header row */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          {searchParams?.billing === 'success' && (
            <div className="mb-4 rounded-xl border border-cm-green/30 bg-cm-green/10 px-4 py-3 text-sm text-cm-green">
              Your Pro subscription is now active. Welcome to CheckRay Pro.
            </div>
          )}
          <span className="mb-3 inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/50">
            CheckRay dashboard
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {total === 0
              ? `Welcome to CheckRay`
              : `Your risk checks`}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/40">
            {total === 0
              ? `Ask Ray to check a suspicious text, email, job offer, bill, link, or rental listing. Results save here automatically.`
              : `Review active cases, risk signals Ray noticed, and suggested next steps.`}
          </p>
        </div>
        <GradientButton href="/cases/new" variant="primary">
          <IconPlus className="mr-1.5 h-4 w-4" />
          New check
        </GradientButton>
      </section>

      {/* Stats */}
      <DashboardCards
        total={total}
        highRisk={highRisk}
        averageScore={averageScore}
        checksUsed={checksUsedToday ?? 0}
        checksLimit={FREE_TIER_DAILY_LIMIT}
      />

      {/* Billing status */}
      <BillingStatusCard
        status={billingStatus}
        trialEndsAt={subAny?.trial_ends_at ?? null}
        stripeConfigured={stripeConfigured}
      />

      {/* Cases list */}
      <GlassCard className="overflow-hidden">
        <div className="border-b border-white/8 px-5 py-4">
          <h2 className="text-sm font-medium text-white">Recent checks</h2>
        </div>
        {caseRows.length ? (
          <div className="divide-y divide-white/5">
            {caseRows.map(item => {
              const report = reportByCase.get(item.id)
              const flags = report ? asStringArray(report.red_flags) : []
              return (
                <article
                  key={item.id}
                  className="grid gap-4 px-5 py-5 transition-colors hover:bg-white/3 lg:grid-cols-[1fr_180px_140px_90px]"
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
                      Date
                    </p>
                    <p className="mt-2 text-xs text-white/50">
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-start pt-0.5">
                    <Link
                      href={`/cases/${item.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 transition hover:border-cm-green/30 hover:text-cm-green"
                    >
                      Open
                      <IconArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <h3 className="text-base font-medium text-white">No checks yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/40">
              Paste a suspicious message, invoice, job offer, rental listing, or
              URL and ask Ray to check it for red flags.
            </p>
            <div className="mt-6 flex justify-center">
              <GradientButton href="/cases/new" variant="primary">
                Ask Ray for your first check
              </GradientButton>
            </div>
          </div>
        )}
      </GlassCard>

      <LegalDisclaimer variant="default" className="mb-4" />
    </div>
  )
}
