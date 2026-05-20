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
  'plus_yearly'
]

export async function POST(req: Request) {
  // Guard: Stripe not configured
  if (!stripe) {
    return NextResponse.json(
      { error: 'billing_not_configured', message: 'Billing is not configured yet.' },
      { status: 503 }
    )
  }

  // Parse plan param. Default to basic_monthly so legacy callers that
  // POST with no body keep working.
  let plan: CheckoutPlanKey = 'basic_monthly'
  try {
    const body = await req.json().catch(() => ({}))
    if (typeof body.plan === 'string' && (VALID_PLANS as string[]).includes(body.plan)) {
      plan = body.plan as CheckoutPlanKey
    }
  } catch {
    // Empty body is fine — fall back to default.
  }

  const priceId = getPriceIdForPlan(plan)
  if (!priceId) {
    return NextResponse.json(
      {
        error: 'price_not_configured',
        message: `The ${plan} price is not set up yet. Please contact support.`
      },
      { status: 503 }
    )
  }

  // Auth required
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
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

    // Persist customer ID immediately so webhooks can match it
    await supabase
      .from('subscriptions')
      .update({ provider_customer_id: customerId } as any)
      .eq('user_id', userId)
  }

  // Create checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // Pass user_id + plan in metadata so the webhook can update the DB.
    // The plan key is also embedded so a price-ID lookup miss in the
    // webhook still has a fallback source of truth.
    subscription_data: {
      metadata: {
        supabase_user_id: userId,
        checkout_plan_key: plan
      },
      trial_period_days: undefined // trial is managed in our DB, not Stripe
    },
    metadata: {
      supabase_user_id: userId,
      checkout_plan_key: plan
    },
    client_reference_id: userId,
    success_url: `${APP_URL}/dashboard?billing=success`,
    cancel_url: `${APP_URL}/pricing?billing=cancelled`
  })

  return NextResponse.json({ url: checkoutSession.url })
}
