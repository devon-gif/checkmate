'use client'

/**
 * components/checkmate/PricingCards.tsx
 *
 * Pricing cards for Free, Basic, and Plus plans.
 * Includes a monthly/yearly billing period toggle.
 * Reads stripeConfigured from props (passed from server component).
 */

import { useState } from 'react'

import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'
import { PLAN_PRICING } from '@/lib/billing/plans'

interface Props {
  stripeConfigured: boolean
}

type BillingPeriod = 'monthly' | 'yearly'

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 flex-shrink-0 text-cm-green"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function PricingCards({ stripeConfigured }: Props) {
  const [period, setPeriod] = useState<BillingPeriod>('monthly')

  const basicPrice = period === 'yearly'
    ? PLAN_PRICING.basic!.monthlyEquivalent!
    : PLAN_PRICING.basic!.monthly!

  const plusPrice = period === 'yearly'
    ? PLAN_PRICING.plus!.monthlyEquivalent!
    : PLAN_PRICING.plus!.monthly!

  const basicBilled = period === 'yearly'
    ? `Billed $${PLAN_PRICING.basic!.yearly}/year`
    : 'Billed monthly'

  const plusBilled = period === 'yearly'
    ? `Billed $${PLAN_PRICING.plus!.yearly}/year`
    : 'Billed monthly'

  return (
    <div className="flex flex-col gap-8">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-1 self-center rounded-full border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => setPeriod('monthly')}
          className={`rounded-full px-5 py-1.5 text-sm font-medium transition ${
            period === 'monthly'
              ? 'bg-white/10 text-white'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setPeriod('yearly')}
          className={`flex items-center gap-2 rounded-full px-5 py-1.5 text-sm font-medium transition ${
            period === 'yearly'
              ? 'bg-white/10 text-white'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          Yearly
          <span className="rounded-full border border-cm-green/40 bg-cm-green/10 px-2 py-0.5 text-[10px] font-semibold text-cm-green">
            Save 20%
          </span>
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Free */}
        <GlassCard className="flex flex-col gap-6 p-6">
          <div>
            <h2 className="text-base font-semibold text-white">Free</h2>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-3xl font-bold text-white">$0</span>
              <span className="mb-0.5 text-sm text-white/40">/ month</span>
            </div>
            <p className="mt-1 text-sm text-white/40">
              Try CheckRay without signing up.
            </p>
          </div>
          <ul className="flex flex-1 flex-col gap-2">
            {[
              '1 check per month',
              'Risk score',
              'Common red flags',
              'Suggested next steps',
              'Results not saved'
            ].map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
          <GradientButton href="/cases/new" variant="secondary" className="w-full">
            Try your free check
          </GradientButton>
        </GlassCard>

        {/* Basic */}
        <GlassCard className="flex flex-col gap-6 p-6">
          <div>
            <h2 className="text-base font-semibold text-white">Basic</h2>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-3xl font-bold text-white">
                ${basicPrice.toFixed(2)}
              </span>
              <span className="mb-0.5 text-sm text-white/40">/ month</span>
            </div>
            <p className="mt-0.5 text-xs text-white/30">{basicBilled}</p>
            <p className="mt-1 text-sm text-white/40">
              For individuals who need regular checks.
            </p>
          </div>
          <ul className="flex flex-1 flex-col gap-2">
            {[
              '25 checks per month',
              'Saved check history',
              'Safer reply drafts',
              'Dashboard',
              'Email support',
              '7-day free trial'
            ].map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
          {stripeConfigured ? (
            <TrialStartButton variant="secondary" label="Start 7-day trial" />
          ) : (
            <GradientButton href="/sign-up" variant="secondary" className="w-full">
              Start 7-day trial
            </GradientButton>
          )}
        </GlassCard>

        {/* Plus */}
        <GlassCard className="flex flex-col gap-6 p-6 ring-1 ring-cm-green/40 shadow-[0_0_32px_rgba(122,226,207,0.08)]">
          <div>
            <span className="mb-3 inline-block rounded-full border border-cm-green/30 bg-cm-green/10 px-2 py-0.5 text-[11px] font-medium text-cm-green">
              Most popular
            </span>
            <h2 className="text-base font-semibold text-white">Plus</h2>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-3xl font-bold text-white">
                ${plusPrice.toFixed(2)}
              </span>
              <span className="mb-0.5 text-sm text-white/40">/ month</span>
            </div>
            <p className="mt-0.5 text-xs text-white/30">{plusBilled}</p>
            <p className="mt-1 text-sm text-white/40">
              For power users who want maximum protection.
            </p>
          </div>
          <ul className="flex flex-1 flex-col gap-2">
            {[
              'Unlimited fair-use checks',
              'Saved check history',
              'Safer reply drafts',
              'Priority analysis',
              'Dashboard',
              'Priority support',
              '7-day free trial'
            ].map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
          {stripeConfigured ? (
            <TrialStartButton variant="primary" label="Start 7-day trial" />
          ) : (
            <GradientButton href="/sign-up" variant="primary" className="w-full">
              Start 7-day trial
            </GradientButton>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

// ─── Trial start button (Stripe checkout) ─────────────────────────────────────

function TrialStartButton({
  variant,
  label
}: {
  variant: 'primary' | 'secondary'
  label: string
}) {
  async function handleClick() {
    const res = await fetch('/api/billing/create-checkout-session', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  return (
    <GradientButton variant={variant} onClick={handleClick} className="w-full">
      {label}
    </GradientButton>
  )
}
