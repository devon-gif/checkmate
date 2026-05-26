/**
 * lib/billing/plans.ts
 *
 * Canonical plan constants for CheckRay.
 * Single source of truth for plan names, limits, and pricing.
 * Import from here everywhere — do not hard-code plan strings inline.
 */

// ─── Plan identifiers ─────────────────────────────────────────────────────────

export type PlanId = 'free' | 'basic' | 'basic_yearly' | 'plus' | 'plus_yearly' | 'family' | 'family_yearly' | 'trial'

// ─── Monthly check limits ─────────────────────────────────────────────────────

/**
 * Hard numeric monthly cap per plan, in checks/month.
 *
 * IMPORTANT: prefer `resolvePlanLimits()` from `./plan-limits` over a
 * direct lookup. Family is a real number here (500, the fair-use cap)
 * because the access gate needs a number to enforce against abuse —
 * but the UI must render Family as "Unlimited fair-use", not "0 / 500".
 * `resolvePlanLimits()` handles that split correctly.
 *
 * Historical note: this map used to set `family` and `family_yearly` to
 * `null` as an "unlimited" sentinel. The dashboard then did
 * `PLAN_MONTHLY_LIMIT[plan] ?? 1`, which silently collapsed Family back
 * to the Free fallback of 1 — bug. The new shape (always-number) and
 * the helper above avoid that whole class of mistake.
 *
 * `trial` keeps its `null` because the legacy in-app trial branch in
 * `lib/billing/access.ts` reads `PLAN_MONTHLY_LIMIT[planId] ?? null`
 * and treats `null` as "skip counting, allow". Stripe-managed trials
 * on Basic/Plus/Family use the paid plan's cap directly, not this row.
 */
export const PLAN_MONTHLY_LIMIT: Record<PlanId, number | null> = {
  free: 1,
  trial: null, // legacy in-app trial: unlimited inside its window
  basic: 10,
  basic_yearly: 10,
  plus: 50,
  plus_yearly: 50,
  // Family: 500/month is the internal fair-use safety net. The UI shows
  // "Unlimited fair-use" via resolvePlanLimits().display === null.
  family: 500,
  family_yearly: 500
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
    monthly: 4.99,
    yearly: 47.88,
    monthlyEquivalent: 3.99,
    yearlySavingsLabel: 'Save 20%'
  },
  plus: {
    monthly: 9.99,
    yearly: 95.88,
    monthlyEquivalent: 7.99,
    yearlySavingsLabel: 'Save 20%'
  },
  family: {
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
      offerDescription: 'Stay for $3.49/month',
      discountedMonthly: 3.49,
      durationMonths: null,
      stripeCouponEnvKey: 'STRIPE_COUPON_BASIC_SAVE_1'
    },
    {
      label: 'Try our lowest price',
      offerDescription: '$1.99/month for 3 months',
      discountedMonthly: 1.99,
      durationMonths: 3,
      stripeCouponEnvKey: 'STRIPE_COUPON_BASIC_SAVE_2'
    }
  ],
  plus: [
    {
      label: 'Stay at a discount',
      offerDescription: 'Stay for $6.99/month',
      discountedMonthly: 6.99,
      durationMonths: null,
      stripeCouponEnvKey: 'STRIPE_COUPON_PLUS_SAVE_1'
    },
    {
      label: 'Try our lowest price',
      offerDescription: '$4.99/month for 3 months',
      discountedMonthly: 4.99,
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
