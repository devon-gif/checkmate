/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe webhook events and keeps the subscriptions table in sync.
 *
 * Events handled:
 *   checkout.session.completed          — capture customer + subscription IDs
 *   customer.subscription.created       — set status + period
 *   customer.subscription.updated       — update status + period
 *   customer.subscription.deleted       — mark canceled
 *
 * Requires STRIPE_WEBHOOK_SECRET in env.
 * If Stripe env vars are absent the endpoint returns 503 without crashing.
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { stripe } from '@/lib/billing/stripe'

// ─── Service-role Supabase client ─────────────────────────────────────────────
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ─── Webhook handler ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'billing_not_configured' },
      { status: 503 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set.')
    return NextResponse.json(
      { error: 'webhook_not_configured' },
      { status: 503 }
    )
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('[stripe/webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  const sb = serviceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id ?? session.metadata?.supabase_user_id
        if (!userId) break

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id

        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id

        if (customerId) {
          await sb
            .from('subscriptions')
            .update({
              provider_customer_id: customerId,
              provider_subscription_id: subscriptionId ?? null
            } as any)
            .eq('user_id', userId)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id

        // current_period_end/start moved to items in newer Stripe API versions
        const subAny = sub as any
        const periodEnd: number | undefined =
          subAny.current_period_end ?? sub.items?.data?.[0]?.current_period_end
        const periodStart: number | undefined =
          subAny.current_period_start ?? sub.items?.data?.[0]?.current_period_start

        await sb
          .from('subscriptions')
          .update({
            provider_customer_id: customerId ?? null,
            provider_subscription_id: sub.id,
            status: sub.status,
            plan: 'pro',
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
            current_period_start: periodStart
              ? new Date(periodStart * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end
          } as any)
          .eq('user_id', userId)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        await sb
          .from('subscriptions')
          .update({ status: 'canceled' } as any)
          .eq('user_id', userId)
        break
      }

      default:
        // Unhandled event type — not an error
        break
    }
  } catch (err) {
    console.error(`[stripe/webhook] Error handling event ${event.type}:`, err)
    return NextResponse.json({ error: 'Internal error processing event.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
