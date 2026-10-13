/**
 * app/pricing/page.tsx
 *
 * CheckRay pricing page — Free, Basic $4.99/mo, Plus $9.99/mo.
 */
import Link from 'next/link'

import { PricingCards } from '@/components/checkmate/PricingCards'
import { stripe, getPriceIdForPlan } from '@/lib/billing/stripe'

export const metadata = {
  title: 'Pricing — CheckRay',
  description:
    'Free checks, Basic at $4.99/month for 10 checks, or Plus at $9.99/month for 50 checks. No annual commitment.'
}

export default function PricingPage({
  searchParams
}: {
  searchParams?: { billing?: string; checkout?: string }
}) {
  const wasCancelled =
    searchParams?.checkout === 'cancelled' ||
    searchParams?.billing === 'cancelled'
  const basicConfigured = Boolean(stripe && getPriceIdForPlan('basic_monthly'))
  const plusConfigured = Boolean(stripe && getPriceIdForPlan('plus_monthly'))

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-16 sm:px-6">
      {/* Header */}
      <div className="text-center">
        <span className="mb-4 inline-block rounded-full border border-cm-green/30 bg-cm-green/10 px-3 py-1 text-xs font-medium text-cm-green">
          Simple pricing
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Simple protection before you click, pay, reply, or apply.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/50">
          Start free, then choose the level of Ray that fits how often you need a second look. No contracts, cancel any time.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/35">
          Text it. Email it. Check it in Chrome. Ray gives you a plain-English risk readout before you act.
        </p>
        {wasCancelled && (
          <p className="mt-4 text-sm text-yellow-400">
            Checkout cancelled. No charge was made.
          </p>
        )}
      </div>

      {/* Monthly-only plans; existing legacy/yearly subscribers retain their plans. */}
      <PricingCards basicConfigured={basicConfigured} plusConfigured={plusConfigured} />

      {/* Support note */}
      <p className="mx-auto max-w-xl text-center text-xs text-white/25">
        Monthly limits reset at the start of each calendar month.
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
