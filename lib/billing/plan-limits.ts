/**
 * lib/billing/plan-limits.ts
 *
 * Single source of truth for "what's the limit for a plan and how should
 * the UI render it." Every billing-aware surface in CheckRay should call
 * `resolvePlanLimits(plan)` rather than reaching into PLAN_MONTHLY_LIMIT
 * directly, because the old pattern
 *
 *     PLAN_MONTHLY_LIMIT[plan] ?? 1
 *
 * was wrong for Family / open-trial plans whose RAW entry is `null` (the
 * "unlimited" sentinel). `null ?? 1` evaluates to `1`, which silently
 * downgraded Family users to the Free fallback in the dashboard.
 *
 * The helper separates two concepts:
 *
 *   internal  — the hard numeric cap the access gate enforces. ALWAYS a
 *               real integer so Family users can't run an abusive number
 *               of checks; 500/mo is the safety net.
 *
 *   display   — what the UI should put in the denominator of "X / Y
 *               checks this month". `null` means "show the user
 *               'Unlimited fair-use'" rather than a fraction.
 *
 * Past-due and unknown statuses are handled here too so the dashboard
 * and the access gate never disagree about who is allowed to run a check.
 */

import { PLAN_MONTHLY_LIMIT as RAW, type PlanId } from './plans'

/** Hard safety cap for plans we present as "Unlimited fair-use". */
export const FAIR_USE_CAP = 500

/**
 * Plans that the UI must render as "Unlimited fair-use" instead of a
 * numeric fraction. The access gate still enforces FAIR_USE_CAP for
 * these so a malicious account can't hit the API in a loop.
 */
const UNLIMITED_DISPLAY_PLANS = new Set<string>([
  'family',
  'family_yearly',
  'beta_family',
  // Legacy in-app trial rows pre-date the Stripe trial flow. Treat them
  // as unlimited-display so the dashboard copy stays correct, but the
  // FAIR_USE_CAP still applies so they can't run unbounded checks.
  'trial'
])

export interface PlanLimits {
  /** Hard numeric cap the access gate enforces. Always a real integer. */
  internal: number
  /**
   * What the UI should render as the denominator. `null` is the
   * "show as unlimited fair-use" sentinel.
   */
  display: number | null
  /** Human-readable label for the display layer. */
  displayLabel: string
  /** True when the plan should be shown as Unlimited fair-use. */
  isUnlimitedDisplay: boolean
}

/**
 * Resolve plan → limits. The lookup never returns null for `internal`;
 * if you pass an unknown plan it falls back to the Free plan's cap (1).
 * Family / family_yearly / legacy trial always get the fair-use cap.
 */
export function resolvePlanLimits(
  plan: string | null | undefined
): PlanLimits {
  // We deliberately do NOT coalesce `plan` to 'free' before the
  // unlimited-display check — `'family'` must be preserved verbatim.
  // The previous `PLAN_MONTHLY_LIMIT[plan] ?? 1` pattern was unsafe
  // because it merged "plan unknown" and "plan has null limit" into
  // one branch.
  const key = (typeof plan === 'string' && plan.length > 0
    ? plan
    : 'free') as PlanId

  const isUnlimitedDisplay = UNLIMITED_DISPLAY_PLANS.has(key)
  const raw = RAW[key]

  const internal = isUnlimitedDisplay
    ? FAIR_USE_CAP
    : typeof raw === 'number'
      ? raw
      : // Unknown plan AND not on the unlimited-display list: fall back to
        // the Free cap so the user gets the most conservative behaviour.
        typeof RAW.free === 'number'
        ? RAW.free
        : 1

  return {
    internal,
    display: isUnlimitedDisplay ? null : internal,
    displayLabel: isUnlimitedDisplay
      ? 'Unlimited fair-use'
      : String(internal),
    isUnlimitedDisplay
  }
}

export interface CanCreateCheckArgs {
  plan: string | null | undefined
  status: string | null | undefined
  usedThisMonth: number
}

export interface CanCreateCheckResult {
  allowed: boolean
  /** Stable machine-readable reason; null when allowed. */
  reason:
    | 'past_due'
    | 'monthly_limit_reached'
    | 'fair_use_cap_reached'
    | null
  /** Human copy suitable for the UI / API error message. */
  reasonText: string | null
  limits: PlanLimits
}

/**
 * Shared "can this user run another check this month?" check, used by
 * both the /api/analyze-case server gate and (indirectly, via the
 * dashboard) the UI display. Past-due users are billing-blocked even if
 * they have quota left; everyone else is quota-blocked at `internal`.
 */
export function canCreateCheck({
  plan,
  status,
  usedThisMonth
}: CanCreateCheckArgs): CanCreateCheckResult {
  const limits = resolvePlanLimits(plan)

  if (status === 'past_due') {
    return {
      allowed: false,
      reason: 'past_due',
      reasonText:
        'Your last payment failed. Update your card in the billing portal to keep using CheckRay.',
      limits
    }
  }

  if (usedThisMonth >= limits.internal) {
    if (limits.isUnlimitedDisplay) {
      return {
        allowed: false,
        reason: 'fair_use_cap_reached',
        reasonText:
          "You've reached the fair-use limit for this month. Contact support if you need more.",
        limits
      }
    }
    return {
      allowed: false,
      reason: 'monthly_limit_reached',
      reasonText: `You've used all ${limits.internal} checks for this month. Your limit resets at the start of next month.`,
      limits
    }
  }

  return { allowed: true, reason: null, reasonText: null, limits }
}
