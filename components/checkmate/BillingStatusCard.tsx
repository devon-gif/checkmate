'use client'

/**
 * components/checkmate/BillingStatusCard.tsx
 *
 * Small card shown on the dashboard that displays the user's current
 * billing/trial status and provides upgrade or portal CTA buttons.
 *
 * Props are plain serialisable values so the parent Server Component can
 * compute them from the DB and pass them down without sending the full
 * subscription row to the client.
 */

import { useState, type ReactNode } from 'react'

import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'

export type BillingStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'free'
  | 'expired'
  | 'unknown'

interface Props {
  status: BillingStatus
  trialEndsAt?: string | null
  /** true when NEXT_PUBLIC_STRIPE_PRICE_ID_PRO is present server-side */
  stripeConfigured: boolean
  /** PlanId from user_billing e.g. 'trial' | 'basic' | 'plus' | 'free' */
  plan?: string | null
  /** Checks used this calendar month */
  checksUsed?: number
  /** Monthly check limit (null = unlimited) */
  checksLimit?: number | null
  /** true when the current billing row has a real Stripe customer id */
  hasStripeCustomer?: boolean
}

function daysUntil(iso: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )
}

export function BillingStatusCard({
  status,
  trialEndsAt,
  stripeConfigured,
  plan,
  checksUsed = 0,
  checksLimit,
  hasStripeCustomer = false
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The upgrade flow on the dashboard sends the user to /pricing so they
  // pick a plan + billing interval explicitly. The actual Stripe Checkout
  // POST happens from the pricing card buttons. This avoids a "what does
  // Upgrade subscribe me to?" UX trap that the old direct-POST had.
  function handleUpgrade() {
    window.location.href = '/pricing'
  }

  async function handlePortal() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/customer-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.message ?? 'Could not open billing portal.')
        setLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const daysLeft = trialEndsAt ? daysUntil(trialEndsAt) : null

  // Resolve which plan branch to render. Treat the yearly SKUs the same as
  // their monthly equivalents — the user-facing copy doesn't differ.
  const isPlus = plan === 'plus' || plan === 'plus_yearly'
  const isBasic = plan === 'basic' || plan === 'basic_yearly'
  const isFamily = plan === 'family' || plan === 'family_yearly'

  // Dot color: green for active subscription, yellow for trialing, neutral
  // for free/unknown (not an alarming red — the user still has access),
  // red only for hard expired states.
  const dotColor =
    status === 'active'
      ? 'bg-cm-green shadow-[0_0_6px_theme(colors.cm-green)]'
      : status === 'trialing'
        ? 'bg-yellow-400 shadow-[0_0_6px_theme(colors.yellow.400)]'
        : status === 'past_due'
          ? 'bg-orange-500 shadow-[0_0_6px_theme(colors.orange.500)]'
        : status === 'expired'
          ? 'bg-red-500 shadow-[0_0_6px_theme(colors.red.500)]'
          : 'bg-white/40'

  // ── Per-status header block. EXACTLY ONE branch renders — no fallthrough
  // doubles like the previous version had for `unknown`.
  let header: ReactNode = null

  if (status === 'active' && isFamily) {
    header = (
      <>
        <p className="text-sm font-medium text-white">Family Protection</p>
        <p className="mt-0.5 text-xs text-white/40">
          Unlimited fair-use checks for households, caregivers, parents,
          and anyone helping loved ones avoid costly scams.
        </p>
      </>
    )
  } else if (status === 'active' && isPlus) {
    header = (
      <>
        <p className="text-sm font-medium text-white">
          Plus plan
          {checksLimit != null && (
            <span className="ml-2 text-xs font-normal text-white/50">
              {checksUsed}/{checksLimit} checks this month
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-white/40">
          {checksLimit != null
            ? `${checksLimit} checks per month.`
            : '50 checks per month.'}
        </p>
      </>
    )
  } else if (status === 'active' && isBasic) {
    header = (
      <>
        <p className="text-sm font-medium text-white">
          Basic plan
          {checksLimit != null && (
            <span className="ml-2 text-xs font-normal text-white/50">
              {checksUsed}/{checksLimit} checks this month
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-white/40">
          {checksLimit != null
            ? `${checksLimit} checks per month.`
            : 'Checks included.'}
        </p>
      </>
    )
  } else if (status === 'active') {
    // Active but unknown plan (e.g. webhook race) — generic copy.
    header = (
      <>
        <p className="text-sm font-medium text-white">Plan active</p>
        <p className="mt-0.5 text-xs text-white/40">Risk checks included.</p>
      </>
    )
  } else if (status === 'past_due') {
    const planName = isFamily
      ? 'Family'
      : isPlus
        ? 'Plus'
        : isBasic
          ? 'Basic'
          : 'Paid'
    header = (
      <>
        <p className="text-sm font-semibold text-white">
          Payment issue on {planName}
          {checksLimit != null && (
            <span className="ml-2 text-xs font-normal text-white/50">
              {checksUsed}/{checksLimit} checks this month
            </span>
          )}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-orange-200/75">
          Your billing status is past due. Update your payment method to keep
          your paid access active.
        </p>
      </>
    )
  } else if (status === 'trialing') {
    // Paid trial (Basic/Plus/Family) or legacy unlimited in-app trial.
    // Show plan-specific copy + paid plan limit, falling back to the
    // generic "Free trial / unlimited" copy only for legacy rows where
    // plan === 'trial'.
    const trialPlanName = isFamily
      ? 'Family'
      : isPlus
        ? 'Plus'
        : isBasic
          ? 'Basic'
          : null
    const trialEndDateLabel =
      trialEndsAt && !Number.isNaN(new Date(trialEndsAt).getTime())
        ? new Date(trialEndsAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : null

    if (trialPlanName) {
      header = (
        <>
          <p className="text-sm font-medium text-white">
            {trialPlanName} trial
            {checksLimit != null && (
              <span className="ml-2 text-xs font-normal text-white/50">
                {checksUsed}/{checksLimit} checks this month
              </span>
            )}
            {daysLeft !== null && (
              <span className="ml-1.5 text-yellow-400">
                {daysLeft === 0
                  ? '— ends today'
                  : `— ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-white/40">
            {trialEndDateLabel
              ? `Trial ends ${trialEndDateLabel}. Card on file — Stripe charges automatically unless you cancel.`
              : 'Card on file — Stripe charges automatically unless you cancel.'}
          </p>
        </>
      )
    } else {
      header = (
        <>
          <p className="text-sm font-medium text-white">
            Free trial
            {daysLeft !== null && (
              <span className="ml-1.5 text-yellow-400">
                {daysLeft === 0
                  ? '— expires today'
                  : `— ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-white/40">
            Unlimited checks during your trial. Subscribe to continue after it ends.
          </p>
        </>
      )
    }
  } else if (status === 'expired') {
    // Trial ended OR free-tier monthly limit reached. Either way the user is
    // on the Free plan now — soft messaging, not "blocked forever".
    header = (
      <>
        <p className="text-sm font-semibold text-white">
          Your trial ended. You&apos;re now on Free.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          You still get 3 checks per month. Upgrade to Basic, Plus, or Family for more checks, saved reports, and weekly Scam Watch.
        </p>
      </>
    )
  } else if (status === 'free') {
    header = (
      <>
        <p className="text-sm font-semibold text-white">
          Free plan
          {checksLimit != null && (
            <span className="ml-2 text-xs font-normal text-white/45">
              {checksUsed} / {checksLimit} check{checksLimit === 1 ? '' : 's'} this month
            </span>
          )}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          You get 3 checks per month. Upgrade for more checks, saved reports,
          weekly Scam Watch, and priority features.
        </p>
      </>
    )
  } else {
    // status === 'unknown' — single safe branch, no double-render. The card
    // appears while plan status is being determined (e.g. first-page load
    // before the user_billing row is created).
    header = (
      <>
        <p className="text-sm font-medium text-white">Checking plan status</p>
        <p className="mt-0.5 text-xs text-white/40">One moment…</p>
      </>
    )
  }

  // Action button: subscribed users get the portal. Paid trial users
  // (Stripe `trialing` on Basic/Plus/Family) get the portal too — they
  // are paying customers in trial, not free users, so they should manage
  // billing rather than see an "Upgrade now" CTA.
  const isPaidTrial =
    status === 'trialing' && (isBasic || isPlus || isFamily)
  const canOpenPortal =
    (status === 'active' || status === 'past_due' || isPaidTrial) &&
    stripeConfigured &&
    hasStripeCustomer

  const isPaidState = status === 'active' || status === 'past_due' || isPaidTrial

  const action = canOpenPortal ? (
    <GradientButton
      variant="secondary"
      onClick={handlePortal}
      disabled={loading}
    >
      {loading ? 'Loading...' : 'Manage billing'}
    </GradientButton>
  ) : isPaidState ? (
    <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/45">
      Manage billing unavailable
    </span>
  ) : stripeConfigured ? (
    <button
      type="button"
      onClick={handleUpgrade}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition-all hover:brightness-110 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? 'Loading...' : 'Upgrade now'}
    </button>
  ) : (
    <a
      href="/pricing"
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition-all hover:brightness-110 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
    >
      Upgrade now
    </a>
  )

  return (
    <GlassCard className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${dotColor}`} />
        <div>
          {header}
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {action}
        <a
          href="/support?category=cancellation"
          className="text-xs text-white/30 transition hover:text-white/60 underline underline-offset-2"
        >
          Need help with billing or cancellation?
        </a>
      </div>
    </GlassCard>
  )
}
