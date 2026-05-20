/**
 * lib/billing/stripe.ts
 *
 * Stripe client — gracefully handles missing env vars so the app builds
 * and runs without Stripe configured. When STRIPE_SECRET_KEY is absent,
 * `stripe` is null and billing routes return a "not configured" response.
 */
import 'server-only'

import Stripe from 'stripe'

export const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20' as any,
      typescript: true
    })
  : null

/** Canonical app URL used for Stripe redirect URLs. */
export const APP_URL: string =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ─── Per-plan Stripe price IDs ───────────────────────────────────────────────

/**
 * The four plan keys we expose at checkout. Maps to the canonical PlanId
 * values stored on `user_billing.plan` after a successful subscription.
 */
export type CheckoutPlanKey =
  | 'basic_monthly'
  | 'basic_yearly'
  | 'plus_monthly'
  | 'plus_yearly'

/**
 * Resolve a plan key → Stripe price ID at call-time. Reading env at call-
 * time (not module-load time) means missing IDs never crash the build.
 *
 * Falls back to the legacy `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO` for
 * `basic_monthly` so deployments that still use the old single-price
 * setup keep working.
 */
export function getPriceIdForPlan(plan: CheckoutPlanKey): string | null {
  switch (plan) {
    case 'basic_monthly':
      return (
        process.env.STRIPE_BASIC_MONTHLY_PRICE_ID ??
        process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO ??
        null
      )
    case 'basic_yearly':
      return process.env.STRIPE_BASIC_YEARLY_PRICE_ID ?? null
    case 'plus_monthly':
      return process.env.STRIPE_PLUS_MONTHLY_PRICE_ID ?? null
    case 'plus_yearly':
      return process.env.STRIPE_PLUS_YEARLY_PRICE_ID ?? null
  }
}

/**
 * Reverse lookup: given a Stripe price ID returned by a webhook, figure
 * out which canonical plan it belongs to. Returns null when the price ID
 * is not one we recognise (e.g. a coupon-applied add-on or a price from
 * a different env). Webhook handlers fall back to leaving `plan` alone
 * in that case.
 */
export function planIdForPriceId(priceId: string | null | undefined): string | null {
  if (!priceId) return null
  const map: Array<[string | undefined, string]> = [
    [process.env.STRIPE_BASIC_MONTHLY_PRICE_ID, 'basic'],
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO, 'basic'], // legacy alias
    [process.env.STRIPE_BASIC_YEARLY_PRICE_ID, 'basic_yearly'],
    [process.env.STRIPE_PLUS_MONTHLY_PRICE_ID, 'plus'],
    [process.env.STRIPE_PLUS_YEARLY_PRICE_ID, 'plus_yearly']
  ]
  for (const [envValue, planId] of map) {
    if (envValue && envValue === priceId) return planId
  }
  return null
}

/**
 * True when ANY plan price ID is configured. Use this to decide whether
 * the pricing page should render Stripe checkout buttons or the
 * "Billing setup pending" placeholder. NEVER blocks public page render.
 */
export function hasAnyPlanPriceId(): boolean {
  return Boolean(
    process.env.STRIPE_BASIC_MONTHLY_PRICE_ID ||
      process.env.STRIPE_BASIC_YEARLY_PRICE_ID ||
      process.env.STRIPE_PLUS_MONTHLY_PRICE_ID ||
      process.env.STRIPE_PLUS_YEARLY_PRICE_ID ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO
  )
}

/**
 * Legacy export kept for backwards compatibility. New code should call
 * `getPriceIdForPlan('basic_monthly')` instead.
 *
 * @deprecated use getPriceIdForPlan
 */
export const STRIPE_PRICE_ID: string | null =
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO ??
  process.env.STRIPE_BASIC_MONTHLY_PRICE_ID ??
  null
