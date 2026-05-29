/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe webhook events and keeps the subscriptions table in sync.
 *
 * Events handled:
 *   checkout.session.completed          — capture customer + subscription IDs
 *   customer.subscription.created       — set status + period + plan
 *   customer.subscription.updated       — update status + period + plan
 *   customer.subscription.deleted       — mark canceled
 *   invoice.payment_succeeded           — promote to active, refresh period_end
 *   invoice.payment_failed              — mark past_due
 *
 * Requires STRIPE_WEBHOOK_SECRET in env.
 * If Stripe env vars are absent the endpoint returns 503 without crashing.
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { stripe, planIdForPriceId } from '@/lib/billing/stripe'

// ─── Service-role Supabase client ─────────────────────────────────────────────
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ─── Resolve user_id from a Stripe customer id ────────────────────────────────
// Invoice/deletion events don't always carry our metadata, so we map the
// Stripe customer id back to a user. We try `user_billing` (the billing
// source of truth, always upserted) FIRST, then fall back to the
// `subscriptions` mirror so older rows still resolve. Returns null if neither
// table knows the customer. Never throws.
async function userIdForCustomer(
  sb: ReturnType<typeof serviceClient>,
  customerId: string | null | undefined
): Promise<string | null> {
  if (!customerId) return null

  const { data: billingRow } = await (sb as any)
    .from('user_billing')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .limit(1)
    .maybeSingle()
  if (billingRow?.user_id) return billingRow.user_id as string

  const { data: subRows } = await sb
    .from('subscriptions')
    .select('user_id')
    .eq('provider_customer_id', customerId)
    .limit(1)
  return subRows?.[0]?.user_id ?? null
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

  // ─── Idempotency ledger ─────────────────────────────────────────────────────
  // Stripe retries deliveries on any non-2xx response, and a given event.id can
  // arrive more than once. Record each event.id BEFORE processing; a unique
  // (primary-key) violation means we've already handled it → short-circuit with
  // a 200 so Stripe stops retrying and we don't re-run side effects.
  const { error: ledgerError } = await (sb as any)
    .from('stripe_webhook_events')
    .insert({ id: event.id, type: event.type })
  if (ledgerError) {
    if (ledgerError.code === '23505') {
      // Duplicate delivery — already processed. Acknowledge and stop.
      return NextResponse.json({ received: true, duplicate: true })
    }
    // Any other ledger error (e.g. table missing in an unmigrated env) is
    // logged but non-fatal: fall through and process the event so we never
    // drop a real event just because the ledger write failed.
    console.error('[stripe/webhook] Idempotency ledger insert failed:', ledgerError.code)
  }

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
          // Upsert (not update) so the row is created if the new-user
          // trigger never seeded one. Keyed on user_id (unique constraint
          // added in migration 20260529150000). user_billing remains the
          // source of truth for plan/access; this keeps subscriptions a
          // reliable customer-id / audit mirror.
          await sb
            .from('subscriptions')
            .upsert(
              {
                user_id: userId,
                provider: 'stripe',
                provider_customer_id: customerId,
                provider_subscription_id: subscriptionId ?? null
              } as any,
              { onConflict: 'user_id' }
            )
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id ?? sub.metadata?.user_id
        if (!userId) break

        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id

        // current_period_end/start moved to items in newer Stripe API versions
        const subAny = sub as any
        const periodEnd: number | undefined =
          subAny.current_period_end ?? sub.items?.data?.[0]?.current_period_end
        const periodStart: number | undefined =
          subAny.current_period_start ?? sub.items?.data?.[0]?.current_period_start
        // `trial_end` is set by Stripe when the sub is in trial. Surface it
        // into `user_billing.trial_ends_at` so the access gate and the
        // dashboard can show "Trial ends DATE" and grant paid-plan limits
        // for the trial window. (Without this, the access gate would see
        // status='trialing' with no end timestamp and close the trial.)
        const trialEnd: number | undefined =
          (sub as any).trial_end ?? undefined

        // Derive canonical plan id from the subscription's first price.
        // Two metadata-based fallbacks exist for when the price ID lookup
        // misses (e.g. coupon-applied prices, or new price IDs the
        // deployment hasn't picked up yet):
        //   1. legacy `checkout_plan_key` field e.g. 'basic_monthly'
        //   2. new `plan` + `interval` pair from create-checkout-session
        const priceId = sub.items?.data?.[0]?.price?.id ?? null
        const planFromPrice = planIdForPriceId(priceId)
        const checkoutKeyToPlanId: Record<string, string> = {
          basic_monthly: 'basic',
          basic_yearly: 'basic_yearly',
          plus_monthly: 'plus',
          plus_yearly: 'plus_yearly',
          family_monthly: 'family',
          family_yearly: 'family_yearly'
        }
        const planFromCheckoutKey =
          typeof sub.metadata?.checkout_plan_key === 'string'
            ? checkoutKeyToPlanId[sub.metadata.checkout_plan_key] ?? null
            : null
        const planFromPlanInterval = (() => {
          const base =
            typeof sub.metadata?.plan === 'string' ? sub.metadata.plan : null
          const interval =
            sub.metadata?.interval === 'yearly' ? 'yearly' : 'monthly'
          if (!base || !['basic', 'plus', 'family'].includes(base)) return null
          return interval === 'yearly' ? `${base}_yearly` : base
        })()
        const resolvedPlan =
          planFromPrice ?? planFromCheckoutKey ?? planFromPlanInterval

        // Include user_id so this can upsert (create-if-missing) rather than
        // silently no-op when the new-user trigger never seeded a row.
        // Only columns that exist in the subscriptions schema are written —
        // provider_price_id / interval are intentionally omitted (no such
        // columns). user_billing stays the source of truth for plan/access.
        const sharedUpdate: Record<string, unknown> = {
          user_id: userId,
          provider: 'stripe',
          provider_customer_id: customerId ?? null,
          provider_subscription_id: sub.id,
          status: sub.status,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
          current_period_start: periodStart
            ? new Date(periodStart * 1000).toISOString()
            : null,
          cancel_at_period_end: sub.cancel_at_period_end
        }
        if (resolvedPlan) sharedUpdate.plan = resolvedPlan

        await sb
          .from('subscriptions')
          .upsert(sharedUpdate as any, { onConflict: 'user_id' })

        // Mirror canonical fields into user_billing (preferred source for
        // dashboard reads). `trial_ends_at` is written from Stripe's
        // `trial_end` only when present — we deliberately don't overwrite
        // an existing trial_ends_at with null when Stripe sends an
        // updated event after the trial converted to active.
        const userBillingPayload: Record<string, unknown> = {
          user_id: userId,
          plan: resolvedPlan ?? undefined,
          status: sub.status === 'active' ? 'active' : sub.status,
          stripe_customer_id: customerId ?? undefined,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null
        }
        if (trialEnd != null) {
          userBillingPayload.trial_ends_at = new Date(trialEnd * 1000).toISOString()
        }
        await (sb as any)
          .from('user_billing')
          .upsert(userBillingPayload, { onConflict: 'user_id' })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        // On deletion we look up by metadata first, falling back to the
        // Stripe customer ID — necessary because portal-driven cancellations
        // may not propagate our metadata into the deletion event.
        let userId: string | null =
          sub.metadata?.supabase_user_id ?? sub.metadata?.user_id ?? null
        if (!userId) {
          const customerId =
            typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
          userId = await userIdForCustomer(sb, customerId)
        }
        if (!userId) break

        // Downgrade — do NOT delete saved cases/reports. The user keeps
        // their history; the Free plan still gives them 1 check / month.
        await sb
          .from('subscriptions')
          .update({ status: 'canceled' } as any)
          .eq('user_id', userId)

        await (sb as any)
          .from('user_billing')
          .update({ status: 'inactive', plan: 'free' })
          .eq('user_id', userId)
        break
      }

      case 'invoice.payment_succeeded': {
        // Promote subscription to active and refresh period_end.
        const inv = event.data.object as Stripe.Invoice
        const customerId =
          typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
        if (!customerId) break

        // Resolve user via user_billing first, then subscriptions mirror.
        const userId = await userIdForCustomer(sb, customerId)
        if (!userId) break

        const periodEnd = (inv as any).lines?.data?.[0]?.period?.end as
          | number
          | undefined

        await sb
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null
          } as any)
          .eq('user_id', userId)

        await (sb as any)
          .from('user_billing')
          .update({
            status: 'active',
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null
          })
          .eq('user_id', userId)
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const customerId =
          typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
        if (!customerId) break

        // Resolve user via user_billing first, then subscriptions mirror.
        const userId = await userIdForCustomer(sb, customerId)
        if (!userId) break

        await sb
          .from('subscriptions')
          .update({ status: 'past_due' } as any)
          .eq('user_id', userId)

        await (sb as any)
          .from('user_billing')
          .update({ status: 'past_due' })
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
