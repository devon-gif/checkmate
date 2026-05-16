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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: '2024-06-20' as any,
      typescript: true
    })
  : null

/** Stripe Price ID for the Pro monthly plan. */
export const STRIPE_PRICE_ID: string | null =
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO ?? null

/** Canonical app URL used for Stripe redirect URLs. */
export const APP_URL: string =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
