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
import { stripe, STRIPE_PRICE_ID, APP_URL } from '@/lib/billing/stripe'

export async function POST() {
  // Guard: Stripe not configured
  if (!stripe || !STRIPE_PRICE_ID) {
    return NextResponse.json(
      { error: 'billing_not_configured', message: 'Billing is not configured yet.' },
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
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    // Pass user_id in metadata so the webhook can update the DB
    subscription_data: {
      metadata: { supabase_user_id: userId },
      trial_period_days: undefined // trial is managed in our DB, not Stripe
    },
    client_reference_id: userId,
    success_url: `${APP_URL}/dashboard?billing=success`,
    cancel_url: `${APP_URL}/pricing?billing=cancelled`
  })

  return NextResponse.json({ url: checkoutSession.url })
}
