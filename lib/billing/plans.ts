/**
 * lib/billing/plans.ts
 *
 * Canonical plan constants for CheckRay.
 * Single source of truth for plan names, limits, and pricing.
 * Import from here everywhere — do not hard-code plan strings inline.
 */

// ─── Plan identifiers ─────────────────────────────────────────────────────────

export type PlanId = 'free' | 'basic' | 'basic_yearly' | 'plus' | 'plus_yearly' | 'trial'

// ─── Monthly check limits ─────────────────────────────────────────────────────

/** null = unlimited fair-use (no hard cap, abuse policy applies) */
export const PLAN_MONTHLY_LIMIT: Record<PlanId, number | null> = {
  free: 1,
  trial: null, // unlimited during trial window
  basic: 25,
  basic_yearly: 25,
  plus: null,
  plus_yearly: null
}

// ─── Pricing (in USD) ─────────────────────────────────────────────────────────

export interface PlanPrice {
  monthly: number | null  // null = free
  yearly: number | null   // null = not applicable / free
  /** Effective per-month when billed yearly */
  monthlyEquivalent: number | null
  /** Human-readable savings label e.g. "Save 20%" */
  yearlySavingsLabel: string | null
}

export const PLAN_PRICING: Partial<Record<PlanId, PlanPrice>> = {
  free: {
    monthly: 0,
    yearly: 0,
    monthlyEquivalent: 0,
    yearlySavingsLabel: null
  },
  basic: {
    monthly: 9.99,
    yearly: 95.88,
    monthlyEquivalent: 7.99,
    yearlySavingsLabel: 'Save 20%'
  },
  plus: {
    monthly: 19.99,
    yearly: 191.88,
    monthlyEquivalent: 15.99,
    yearlySavingsLabel: 'Save 20%'
  }
}

// ─── Trial ────────────────────────────────────────────────────────────────────

export const TRIAL_DAYS = 7

// ─── Cancellation save offers ─────────────────────────────────────────────────

export interface CancellationOffer {
  label: string
  /** Coupon discount description shown to the user */
  offerDescription: string
  /** Monthly price after discount */
  discountedMonthly: number
  /** Duration in months (null = permanent) */
  durationMonths: number | null
  /** Stripe coupon ID to apply — set via env var when Stripe is wired up */
  stripeCouponEnvKey: string
}

export const CANCELLATION_OFFERS: Record<'basic' | 'plus', [CancellationOffer, CancellationOffer]> = {
  basic: [
    {
      label: 'Stay at a discount',
      offerDescription: 'Stay for $6.99/month',
      discountedMonthly: 6.99,
      durationMonths: null,
      stripeCouponEnvKey: 'STRIPE_COUPON_BASIC_SAVE_1'
    },
    {
      label: 'Try our lowest price',
      offerDescription: '$2.99/month for 3 months',
      discountedMonthly: 2.99,
      durationMonths: 3,
      stripeCouponEnvKey: 'STRIPE_COUPON_BASIC_SAVE_2'
    }
  ],
  plus: [
    {
      label: 'Stay at a discount',
      offerDescription: 'Stay for $12.99/month',
      discountedMonthly: 12.99,
      durationMonths: null,
      stripeCouponEnvKey: 'STRIPE_COUPON_PLUS_SAVE_1'
    },
    {
      label: 'Try our lowest price',
      offerDescription: '$8.99/month for 3 months',
      discountedMonthly: 8.99,
      durationMonths: 3,
      stripeCouponEnvKey: 'STRIPE_COUPON_PLUS_SAVE_2'
    }
  ]
}

// ─── Cancellation survey ──────────────────────────────────────────────────────

export const CANCELLATION_REASONS = [
  'Too expensive',
  'I don\'t use it enough',
  'I only needed it once',
  'Results were not helpful',
  'I had technical issues',
  'I found another tool',
  'Privacy concerns',
  'Other'
] as const

export type CancellationReason = typeof CANCELLATION_REASONS[number]
