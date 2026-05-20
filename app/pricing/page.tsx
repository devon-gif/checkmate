/**
 * app/pricing/page.tsx
 *
 * CheckRay pricing page — Free, Basic, Plus.
 * Billing period toggle (monthly/yearly) is handled inside PricingCards.
 */
import Link from 'next/link'

import { PricingCards } from '@/components/checkmate/PricingCards'
import { hasAnyPlanPriceId } from '@/lib/billing/stripe'

export const metadata = {
  title: 'Pricing — CheckRay',
  description:
    'Free check, Basic at $9.99/mo, Plus at $19.99/mo. 7-day free trial. No contracts.'
}

export default function PricingPage({
  searchParams
}: {
  searchParams?: { billing?: string }
}) {
  const wasCancelled = searchParams?.billing === 'cancelled'
  const stripeConfigured = hasAnyPlanPriceId()

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
          One free check a month. A 7-day trial when you sign up. Then pick the
          plan that fits. No contracts, cancel any time.
        </p>
        {wasCancelled && (
          <p className="mt-4 text-sm text-yellow-400">
            Checkout cancelled. No charge was made.
          </p>
        )}
      </div>

      {/* Pricing cards with monthly/yearly toggle */}
      <PricingCards stripeConfigured={stripeConfigured} />

      {/* Fair-use note */}
      <p className="mx-auto max-w-xl text-center text-xs text-white/25">
        Unlimited plans are subject to fair-use limits to prevent abuse.
        Refunds are handled manually — contact us if you need one.{' '}
        <Link
          href="/contact"
          className="underline underline-offset-2 hover:text-white/50"
        >
          Contact support
        </Link>
        .
      </p>
    </div>
  )
}
