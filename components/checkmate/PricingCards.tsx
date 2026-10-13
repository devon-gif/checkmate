'use client'

/**
 * components/checkmate/PricingCards.tsx
 *
 * Simple monthly-only pricing: Free, Basic, and Plus.
 * Reads stripeConfigured from props (passed from server component).
 */

import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'
import { PLAN_PRICING } from '@/lib/billing/plans'

interface Props {
  basicConfigured: boolean
  plusConfigured: boolean
}

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

export function PricingCards({ basicConfigured, plusConfigured }: Props) {
  const basicPrice = PLAN_PRICING.basic!.monthly!
  const plusPrice = PLAN_PRICING.plus!.monthly!

  return (
    <div className="flex flex-col gap-8">
      {/* Cards grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Free */}
        <GlassCard className="flex flex-col gap-6 p-6">
          <div>
            <h2 className="text-base font-semibold text-white">Free</h2>
            <div className="mt-2 flex min-h-[3rem] items-end gap-1">
              <span className="text-4xl font-bold leading-none text-white">$0</span>
              <span className="mb-0.5 text-sm text-white/40">/mo</span>
            </div>
            <p className="mt-1.5 text-sm text-white/40">
              Try CheckRay without signing up.
            </p>
          </div>
          <ul className="flex flex-1 flex-col gap-2">
            {[
              '3 checks per month',
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
            Try one free check
          </GradientButton>
        </GlassCard>

        {/* Basic */}
        <GlassCard className="flex flex-col gap-6 p-6">
          <div>
            <h2 className="text-base font-semibold text-white">Basic</h2>
            <div className="mt-2 flex min-h-[3rem] items-end gap-1">
              <span className="text-4xl font-bold leading-none text-white">
                ${basicPrice.toFixed(2)}
              </span>
              <span className="mb-0.5 text-sm text-white/40">/mo</span>
            </div>
            <p className="mt-1 text-xs text-white/30">Billed monthly</p>
            <p className="mt-1.5 text-sm text-white/40">
              For individuals who need regular checks.
            </p>
          </div>
          <ul className="flex flex-1 flex-col gap-2">
            {[
              '10 checks per month',
              'Basic risk score',
              'Basic red flags',
              'Saved reports',
              'Safer reply drafts',
              'Weekly Scam Watch emails',
              '7-day free trial'
            ].map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
          {basicConfigured ? (
            <TrialStartButton
              variant="secondary"
              label="Start 7-day free trial"
              plan="basic_monthly"
            />
          ) : (
            <GradientButton href="/sign-up" variant="secondary" className="w-full">
              Start 7-day free trial
            </GradientButton>
          )}
          <p className="-mt-2 text-center text-[11px] text-white/35">
            Card required. Cancel anytime before day 7.
          </p>
        </GlassCard>

        {/* Plus */}
        <GlassCard className="flex flex-col gap-6 p-6 ring-1 ring-cm-green/40 shadow-[0_0_32px_rgba(122,226,207,0.08)]">
          <div>
            <span className="mb-3 inline-block rounded-full border border-cm-green/30 bg-cm-green/10 px-2 py-0.5 text-[11px] font-medium text-cm-green">
              Most popular
            </span>
            <h2 className="text-base font-semibold text-white">Plus</h2>
            <div className="mt-2 flex min-h-[3rem] items-end gap-1">
              <span className="text-4xl font-bold leading-none text-white">
                ${plusPrice.toFixed(2)}
              </span>
              <span className="mb-0.5 text-sm text-white/40">/mo</span>
            </div>
            <p className="mt-1 text-xs text-white/30">Billed monthly</p>
            <p className="mt-1.5 text-sm text-white/40">
              For power users who want maximum protection.
            </p>
          </div>
          <ul className="flex flex-1 flex-col gap-2">
            {[
              '50 checks per month',
              'Everything in Basic',
              'Chrome extension access',
              'Trusted Circle sharing',
              'More detailed verification steps',
              'Email & text workflows (early access)',
              '7-day free trial'
            ].map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
          {plusConfigured ? (
            <TrialStartButton
              variant="primary"
              label="Start 7-day free trial"
              plan="plus_monthly"
            />
          ) : (
            <GradientButton href="/sign-up" variant="primary" className="w-full">
              Start 7-day free trial
            </GradientButton>
          )}
          <p className="-mt-2 text-center text-[11px] text-white/35">
            Card required. Cancel anytime before day 7.
          </p>
        </GlassCard>


      </div>
    </div>
  )
}

// ─── Trial start button (Stripe checkout) ─────────────────────────────────────

type CheckoutPlanKey = 'basic_monthly' | 'plus_monthly'

function TrialStartButton({
  variant,
  label,
  plan
}: {
  variant: 'primary' | 'secondary'
  label: string
  plan: CheckoutPlanKey
}) {
  async function handleClick() {
    // Use the existing monthly Checkout route without exposing legacy
    // yearly or Family products to new visitors.
    const idx = plan.lastIndexOf('_')
    const basePlan = plan.slice(0, idx)
    const interval = plan.slice(idx + 1)

    try {
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: basePlan, interval })
      })

      // 401 → not signed in. Route to sign-up while preserving the user's
      // intent to land back on /pricing. Use the route's hint if present.
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}))
        window.location.href =
          typeof data.redirect_to === 'string'
            ? data.redirect_to
            : '/sign-up?next=/pricing'
        return
      }

      const data = await res.json().catch(() => ({}))
      if (data.url) {
        window.location.href = data.url
        return
      }

      // Friendly fallback if Stripe / a price ID is not configured.
      // eslint-disable-next-line no-alert
      window.alert(
        data.message ?? 'Checkout is not available right now. Please try again.'
      )
    } catch {
      // eslint-disable-next-line no-alert
      window.alert('Network error. Please try again.')
    }
  }

  return (
    <GradientButton variant={variant} onClick={handleClick} className="w-full">
      {label}
    </GradientButton>
  )
}
