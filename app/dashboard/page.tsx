import Link from 'next/link'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

import { auth } from '@/auth'
import { CaseRiskBadge } from '@/components/case-risk-badge'
import { IconArrowRight, IconPlus } from '@/components/ui/icons'
import { humanizeCategory } from '@/lib/checkmate-shared'
import { type Database, type Json } from '@/lib/db_types'
import { resolvePlanLimits } from '@/lib/billing/plan-limits'
import { hasAnyPlanPriceId } from '@/lib/billing/stripe'
import { DashboardCards } from '@/components/checkmate/DashboardCards'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'
import {
  BillingStatusCard,
  type BillingStatus
} from '@/components/checkmate/BillingStatusCard'
import { ScamWatchCard } from '@/components/checkmate/ScamWatchCard'
import { UpgradeButton } from '@/components/checkmate/UpgradeButton'
import {
  ensureNotificationPreferences,
  getNotificationPreferences
} from '@/lib/notifications/preferences'

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
  searchParams?: { billing?: string; checkout?: string }
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

  // Note: we deliberately do NOT use .throwOnError() here. Empty tables, RLS
  // blocks, or transient Supabase errors must degrade to an empty dashboard
  // state rather than render a 500 page.
  const { data: cases, error: casesError } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (casesError) {
    console.error('[dashboard] cases query failed:', casesError.message)
  }

  const caseRows = (cases ?? []) as CaseRow[]
  const caseIds = caseRows.map(item => item.id)
  const { data: reports, error: reportsError } = caseIds.length
    ? await supabase
        .from('risk_reports')
        .select('*')
        .in('case_id', caseIds)
        .order('created_at', { ascending: false })
    : { data: [], error: null }

  if (reportsError) {
    console.error('[dashboard] risk_reports query failed:', reportsError.message)
  }

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

  // Usage: checks this calendar month (used by both the top stats grid and the
  // billing status card). The previous "Free checks today / 25" stat was stale
  // — the access gate is monthly, not daily.
  const now = new Date()
  const since1stOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: checksUsedThisMonth } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('event_type', 'check_created')
    .gte('created_at', since1stOfMonth)

  // Billing status
  const { data: billingRow } = await supabase
    .from('subscriptions' as any)
    .select('status, trial_ends_at, plan, stripe_customer_id')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Also check user_billing (preferred, created by access.ts on first check)
  const { data: userBillingRow } = await supabase
    .from('user_billing' as any)
    .select('status, trial_ends_at, plan, stripe_customer_id')
    .eq('user_id', session.user.id)
    .maybeSingle()

  // Prefer user_billing row; fall back to subscriptions.
  //
  // Status mapping (keep in sync with lib/billing/access.ts checkAccess):
  //   - 'active'    paid subscription in good standing
  //   - 'trialing'  inside an open trial window
  //   - 'past_due'  paid plan with a payment issue
  //   - 'free'      no active sub, no open trial — entitled to the Free
  //                 plan's 1 check / month. This is the default for new
  //                 signed-up users; we surface "Free 0 / 1" immediately
  //                 instead of "Checking plan status".
  //   - 'expired'   has hit a hard cap and needs to upgrade
  //   - 'unknown'   reserved for genuine "we couldn't fetch the row"
  //                 errors; not used for the new-user case any more.
  const subAny = (userBillingRow ?? billingRow) as any
  let billingStatus: BillingStatus = 'free'
  if (subAny?.status === 'active') {
    billingStatus = 'active'
  } else if (subAny?.status === 'trialing') {
    const trialEnd = subAny.trial_ends_at ? new Date(subAny.trial_ends_at) : null
    // Trial row exists; if the window is open use 'trialing', otherwise
    // the user has effectively been downgraded to Free.
    billingStatus = trialEnd && new Date() < trialEnd ? 'trialing' : 'free'
  } else if (subAny?.status === 'past_due') {
    billingStatus = 'past_due'
  } else {
    // Any other state — no row, inactive, canceled — render as
    // Free until the user upgrades. The access gate enforces the 1 / mo
    // cap; this is purely the dashboard's friendly default.
    billingStatus = 'free'
  }

  const stripeConfigured = hasAnyPlanPriceId()

  // Ensure notification_preferences row exists (no-op if already created).
  // Wrapped because a missing migration on this table must not 500 the page.
  let notifPrefs: Awaited<ReturnType<typeof getNotificationPreferences>> | null = null
  try {
    await ensureNotificationPreferences(session.user.id)
    notifPrefs = await getNotificationPreferences(session.user.id, cookieStore)
  } catch (err) {
    console.error('[dashboard] notification_preferences unavailable:', err)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Billing success banner */}
      {(searchParams?.checkout === 'success' || searchParams?.billing === 'success') && (
        <div className="rounded-xl border border-cm-green/30 bg-cm-green/10 px-4 py-3 text-sm text-cm-green">
          {billingStatus === 'trialing'
            ? 'Your 7-day trial is active. Welcome to CheckRay.'
            : 'Your subscription is now active. Welcome to CheckRay.'}
        </div>
      )}

      {/* Hero row */}
      <section className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.03] to-transparent px-6 py-8 sm:px-8">
        {/* Ambient glow */}
        <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/4 translate-x-1/4 rounded-full bg-cm-green/8 blur-[80px]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-cm-green/25 bg-cm-green/8 px-3 py-1 text-xs font-medium text-cm-green">
              <span className="h-1.5 w-1.5 rounded-full bg-cm-green" />
              CheckRay dashboard
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Welcome back to CheckRay
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
              Ask Ray to check suspicious texts, emails, job offers, bills, links, and rental listings before you click, pay, reply, or apply.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
            <GradientButton href="/cases/new" variant="primary">
              <IconPlus className="h-4 w-4" />
              New check
            </GradientButton>
            {/* "Upgrade now" is hidden for active, paid-trial, and past-due
                users; BillingStatusCard handles those billing states. */}
            {billingStatus !== 'active' &&
              billingStatus !== 'trialing' &&
              billingStatus !== 'past_due' && (
              <UpgradeButton stripeConfigured={stripeConfigured} />
            )}
          </div>
        </div>
      </section>

      {/* Stats + billing card use the shared `resolvePlanLimits` helper
          so they never disagree with the access gate. The helper returns
          `display === null` for Family / legacy-trial plans (= "Unlimited
          fair-use" in the UI), and a real number for Free/Basic/Plus.
          The previous `PLAN_MONTHLY_LIMIT[plan] ?? 1` pattern was
          buggy: `null ?? 1 === 1`, which silently downgraded Family to
          the Free fallback of 1. */}
      {(() => {
        const planForDisplay =
          billingStatus === 'trialing' && subAny?.plan === 'trial'
            ? 'trial'
            : (subAny?.plan ?? 'free')
        const limits = resolvePlanLimits(planForDisplay)
        return (
          <>
            <DashboardCards
              total={total}
              highRisk={highRisk}
              averageScore={averageScore}
              checksUsed={checksUsedThisMonth ?? 0}
              checksLimit={limits.display}
            />

            {/* Billing status */}
            <BillingStatusCard
              status={billingStatus}
              trialEndsAt={subAny?.trial_ends_at ?? null}
              stripeConfigured={stripeConfigured}
              plan={subAny?.plan ?? 'free'}
              checksUsed={checksUsedThisMonth ?? 0}
              checksLimit={limits.display}
              hasStripeCustomer={Boolean(subAny?.stripe_customer_id)}
            />
          </>
        )
      })()}

      {/* Weekly Scam Watch preference */}
      <ScamWatchCard
        initialEnabled={notifPrefs?.weekly_email_enabled ?? true}
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

      {/* Disclaimer */}
      <p className="mb-4 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-white/25">
        CheckRay can be wrong. Results are informational only — not legal, financial, medical, or professional advice. Always verify through official sources before acting.
      </p>
    </div>
  )
}
