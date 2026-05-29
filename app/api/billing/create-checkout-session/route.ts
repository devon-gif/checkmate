/**
 * POST /api/billing/create-checkout-session
 *
 * Creates a Stripe Checkout session for the Pro subscription.
 * Returns { url } on success, or an error if Stripe is not configured.
 *
 * Requires an authenticated session.
 */
import 'server-only'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { type Database } from '@/lib/db_types'
import {
  stripe,
  APP_URL,
  getPriceIdForPlan,
  type CheckoutPlanKey
} from '@/lib/billing/stripe'

const VALID_PLANS: CheckoutPlanKey[] = [
  'basic_monthly',
  'basic_yearly',
  'plus_monthly',
  'plus_yearly',
  'family_monthly',
  'family_yearly'
]

const VALID_BASE_PLANS = ['basic', 'plus', 'family'] as const
type BasePlan = (typeof VALID_BASE_PLANS)[number]
type Interval = 'monthly' | 'yearly'

export async function POST(req: Request) {
  // Guard: Stripe not configured
  if (!stripe) {
    return NextResponse.json(
      { error: 'billing_not_configured', message: 'Billing is not configured yet.' },
      { status: 503 }
    )
  }

  // ── Parse plan + interval from the request body. ─────────────────────────
  //
  // Two body shapes are accepted for backwards compatibility:
  //   1. { plan: 'basic_monthly' }                       — legacy combined key
  //   2. { plan: 'basic', interval: 'monthly' | 'yearly' } — new explicit form
  //
  // Empty body falls back to basic / monthly so old callers (the previous
  // "Upgrade now" button with no payload) keep working without changes.
  let combined: CheckoutPlanKey = 'basic_monthly'
  let basePlan: BasePlan = 'basic'
  let interval: Interval = 'monthly'

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>))

    if (
      typeof body.plan === 'string' &&
      (VALID_PLANS as string[]).includes(body.plan)
    ) {
      // Legacy combined key like 'basic_monthly'.
      combined = body.plan as CheckoutPlanKey
      const idx = combined.lastIndexOf('_')
      basePlan = combined.slice(0, idx) as BasePlan
      interval = combined.slice(idx + 1) as Interval
    } else if (
      typeof body.plan === 'string' &&
      (VALID_BASE_PLANS as readonly string[]).includes(body.plan)
    ) {
      // New explicit form { plan, interval }.
      basePlan = body.plan as BasePlan
      interval =
        body.interval === 'yearly' ? 'yearly' : 'monthly'
      combined = `${basePlan}_${interval}` as CheckoutPlanKey
    }
  } catch {
    // Empty body is fine — fall back to the defaults above.
  }

  const priceId = getPriceIdForPlan(combined)
  if (!priceId) {
    return NextResponse.json(
      {
        error: 'price_not_configured',
        message: `The ${combined} price is not set up yet. Please contact support.`
      },
      { status: 503 }
    )
  }

  // Auth required
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (!session?.user?.id) {
    // Send the client to /sign-up while preserving the pricing-page intent.
    return NextResponse.json(
      {
        error: 'Unauthorized.',
        message: 'You must be signed in to start checkout.',
        redirect_to: '/sign-up?next=/pricing'
      },
      { status: 401 }
    )
  }

  const userId = session.user.id
  const userEmail = session.user.email ?? undefined

  const supabase = createRouteHandlerClient<Database, 'public', any>({
    cookies: () => cookieStore
  })

  // Find existing Stripe customer ID if the user has one
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('provider_customer_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let customerId: string | undefined = sub?.provider_customer_id ?? undefined

  // Create Stripe customer if needed
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { supabase_user_id: userId }
    })
    customerId = customer.id

    // Persist customer ID immediately so webhooks can match it.
    // Upsert (not update) so the row is created if the new-user trigger
    // never seeded one — otherwise this write silently no-ops and the
    // customer ID is lost. Keyed on user_id (unique constraint added in
    // migration 20260529150000).
    await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          provider: 'stripe',
          provider_customer_id: customerId
        } as any,
        { onConflict: 'user_id' }
      )
  }

  // Create checkout session.
  //
  // Metadata is duplicated onto both the Checkout Session AND
  // subscription_data so the webhook can recover user / plan / interval
  // from either the `checkout.session.completed` event or the
  // `customer.subscription.created` event, whichever fires first.
  //
  // We carry BOTH the legacy `supabase_user_id` / `checkout_plan_key`
  // fields (existing webhook handler reads these) AND the new
  // `user_id` / `plan` / `interval` fields requested by the spec.
  const subscriptionMetadata = {
    supabase_user_id: userId,
    user_id: userId,
    checkout_plan_key: combined,
    plan: basePlan,
    interval
  } as const

  // 7-day free trial for all paid subscriptions (Basic / Plus / Family).
  // Stripe will auto-charge after the trial window unless the user cancels.
  // Free plan is not a Stripe subscription at all, so it never reaches here.
  const TRIAL_PERIOD_DAYS = 7

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: subscriptionMetadata,
      trial_period_days: TRIAL_PERIOD_DAYS
    },
    // Card is required so Stripe can auto-charge when the trial ends.
    // 'always' tells Stripe to collect a payment method even for trial-only
    // sessions; this is the default for subscription mode but we set it
    // explicitly so future Stripe API changes don't quietly skip card entry.
    payment_method_collection: 'always',
    metadata: subscriptionMetadata,
    client_reference_id: userId,
    success_url: `${APP_URL}/dashboard?checkout=success`,
    cancel_url: `${APP_URL}/pricing?checkout=cancelled`
  })

  return NextResponse.json({ url: checkoutSession.url })
}
