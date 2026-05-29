/**
 * POST /api/billing/customer-portal
 *
 * Creates a Stripe Customer Portal session so the user can manage
 * their subscription (upgrade, cancel, update payment method).
 *
 * Returns { url } on success.
 * Requires an authenticated session and an existing Stripe customer.
 */
import 'server-only'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { type Database } from '@/lib/db_types'
import { stripe, APP_URL } from '@/lib/billing/stripe'

export async function POST() {
  // Guard: Stripe not configured
  if (!stripe) {
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

  const supabase = createRouteHandlerClient<Database, 'public', any>({
    cookies: () => cookieStore
  })

  // Look up Stripe customer ID. Prefer user_billing (the billing source of
  // truth, always upserted by the webhook), then fall back to the
  // subscriptions mirror so either source resolves a customer.
  // user_billing is not in the generated Database types; cast to any (the
  // webhook handler reads it the same way).
  const { data: billing } = await (supabase as any)
    .from('user_billing')
    .select('stripe_customer_id')
    .eq('user_id', session.user.id)
    .maybeSingle()

  let customerId: string | null | undefined =
    (billing as { stripe_customer_id?: string | null } | null)?.stripe_customer_id

  if (!customerId) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('provider_customer_id')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    customerId = sub?.provider_customer_id
  }

  if (!customerId) {
    return NextResponse.json(
      { error: 'no_customer', message: 'No billing account found. Subscribe first.' },
      { status: 404 }
    )
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${APP_URL}/dashboard`
  })

  return NextResponse.json({ url: portalSession.url })
}
