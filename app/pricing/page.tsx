/**
 * app/pricing/page.tsx
 *
 * Simple MVP pricing page.
 * Reads NEXT_PUBLIC_STRIPE_PRICE_ID_PRO at build time to determine whether
 * Stripe is configured. If not, the CTA falls back to a disabled state.
 */
import Link from 'next/link'

import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'
import { UpgradeButton } from '@/components/checkmate/UpgradeButton'

const stripeConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO)

export const metadata = {
  title: 'Pricing — CheckRay',
  description:
    'One free check, a 7-day trial, then a simple Pro plan. No contracts.'
}

const tiers = [
  {
    name: 'Free check',
    price: '$0',
    description: 'Try CheckRay without signing up.',
    features: [
      '1 risk check — no account required',
      'Full red-flag breakdown',
      'Plain-English risk summary',
      'Results not saved'
    ],
    cta: 'Try now',
    ctaHref: '/try',
    highlight: false
  },
  {
    name: '7-day trial',
    price: 'Free',
    description: 'Create an account to unlock your trial.',
    features: [
      'Unlimited checks for 7 days',
      'Results saved to your dashboard',
      'Case history and risk timeline',
      'No credit card required'
    ],
    cta: 'Start free trial',
    ctaHref: '/sign-up',
    highlight: false
  },
  {
    name: 'Pro',
    price: '$9',
    priceSuffix: '/ month',
    description: 'For individuals who want ongoing protection.',
    features: [
      'Unlimited risk checks',
      'Full case history',
      'Risk reports saved forever',
      'Priority AI analysis',
      'Cancel anytime'
    ],
    cta: 'Upgrade to Pro',
    ctaHref: null, // handled by UpgradeButton (client component)
    highlight: true
  }
]

export default function PricingPage({
  searchParams
}: {
  searchParams: { billing?: string }
}) {
  const wasCancelled = searchParams?.billing === 'cancelled'

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-16 sm:px-6">
      {/* Header */}
      <div className="text-center">
        <span className="mb-4 inline-block rounded-full border border-cm-green/30 bg-cm-green/10 px-3 py-1 text-xs font-medium text-cm-green">
          Simple pricing
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Protect yourself before you reply
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/50">
          One free check. A 7-day trial. Then a flat monthly rate. No contracts,
          no per-check fees.
        </p>
        {wasCancelled && (
          <p className="mt-4 text-sm text-yellow-400">
            Checkout cancelled. No charge was made.
          </p>
        )}
      </div>

      {/* Tier cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {tiers.map(tier => (
          <GlassCard
            key={tier.name}
            className={`flex flex-col gap-6 p-6 ${
              tier.highlight
                ? 'ring-1 ring-cm-green/40 shadow-[0_0_32px_rgba(122,226,207,0.08)]'
                : ''
            }`}
          >
            <div>
              {tier.highlight && (
                <span className="mb-3 inline-block rounded-full border border-cm-green/30 bg-cm-green/10 px-2 py-0.5 text-[11px] font-medium text-cm-green">
                  Most popular
                </span>
              )}
              <h2 className="text-base font-semibold text-white">{tier.name}</h2>
              <div className="mt-1 flex items-end gap-1">
                <span className="text-3xl font-bold text-white">{tier.price}</span>
                {tier.priceSuffix && (
                  <span className="mb-0.5 text-sm text-white/40">{tier.priceSuffix}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-white/40">{tier.description}</p>
            </div>

            <ul className="flex flex-1 flex-col gap-2">
              {tier.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-cm-green"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <div>
              {tier.ctaHref ? (
                <GradientButton
                  href={tier.ctaHref}
                  variant={tier.highlight ? 'primary' : 'secondary'}
                  className="w-full"
                >
                  {tier.cta}
                </GradientButton>
              ) : (
                <UpgradeButton stripeConfigured={stripeConfigured} />
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Fine print */}
      <p className="text-center text-xs text-white/25">
        Refunds are handled manually via Stripe for the MVP. Contact us if you
        need a refund.{' '}
        <Link href="/contact" className="underline underline-offset-2 hover:text-white/50">
          Contact support
        </Link>
        .
      </p>
    </div>
  )
}
