/**
 * POST /api/admin/billing-test/set-plan
 *
 * Admin-only billing state override. Flips the signed-in admin's own
 * `user_billing` row to a chosen plan/status combination so we can test
 * dashboard UI, access-gate behaviour, and billing copy without going
 * through Stripe Checkout for every state.
 *
 * Triple-gated:
 *   1. ENABLE_ADMIN_BILLING_TEST_TOOLS=true (server env)        → 404 otherwise
 *   2. Authenticated session                                    → 401 otherwise
 *   3. Signed-in user's email is in ADMIN_EMAILS                → 403 otherwise
 *
 * Writes to `user_billing` (the canonical source dashboard + access gate
 * read). NEVER touches Stripe: does not create/cancel subscriptions, does
 * not modify provider customer/subscription IDs. Real Stripe billing is
 * untouched; this is purely an app-state override.
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import {
  canUseAdminBillingTest,
  isAdminBillingTestEnabled,
  isAdminUser
} from '@/lib/admin/access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ─── Plan state machine (admin-only) ──────────────────────────────────────

type AdminPlanState =
  | 'free'
  | 'basic'
  | 'plus'
  | 'family'
  | 'trial_basic'
  | 'trial_plus'
  | 'trial_family'
  | 'past_due'
  | 'canceled'

const VALID_STATES: AdminPlanState[] = [
  'free',
  'basic',
  'plus',
  'family',
  'trial_basic',
  'trial_plus',
  'trial_family',
  'past_due',
  'canceled'
]

interface BillingPatch {
  plan?: string
  status: 'trialing' | 'active' | 'past_due' | 'inactive' | 'canceled'
  trial_ends_at?: string | null
}

/**
 * Map an admin-chosen state to the user_billing patch.
 * Uses the same plan strings the dashboard / access gate read.
 *
 * `past_due` keeps the user's existing paid plan if present; otherwise
 * defaults to 'plus' so the test surface still renders the right copy.
 */
function patchForState(
  state: AdminPlanState,
  currentPlan: string | null | undefined
): BillingPatch {
  const sevenDaysFromNow = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString()

  switch (state) {
    case 'free':
      return { plan: 'free', status: 'inactive', trial_ends_at: null }
    case 'basic':
      return { plan: 'basic', status: 'active', trial_ends_at: null }
    case 'plus':
      return { plan: 'plus', status: 'active', trial_ends_at: null }
    case 'family':
      return { plan: 'family', status: 'active', trial_ends_at: null }
    case 'trial_basic':
      return { plan: 'basic', status: 'trialing', trial_ends_at: sevenDaysFromNow }
    case 'trial_plus':
      return { plan: 'plus', status: 'trialing', trial_ends_at: sevenDaysFromNow }
    case 'trial_family':
      return { plan: 'family', status: 'trialing', trial_ends_at: sevenDaysFromNow }
    case 'past_due': {
      // Preserve the existing paid plan so the dashboard renders the
      // right plan name alongside the payment-issue copy. Default to
      // 'plus' if the user has no paid plan today.
      const keep =
        currentPlan && currentPlan !== 'free' && currentPlan !== 'trial'
          ? currentPlan
          : 'plus'
      return { plan: keep, status: 'past_due' }
    }
    case 'canceled':
      // Treated identically to a Stripe deletion: downgrade to Free
      // without touching saved cases or reports.
      return { plan: 'free', status: 'inactive', trial_ends_at: null }
  }
}

// ─── Service-role Supabase client ─────────────────────────────────────────

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

// ─── Handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Gate 1: feature flag. Return 404 so a probe can't even detect the
  // route exists in environments where it should be invisible.
  if (!isAdminBillingTestEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Gate 2: authenticated user.
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Gate 3: admin allowlist. Compose with canUseAdminBillingTest to
  // re-verify the flag too (defence in depth).
  const allowed = await canUseAdminBillingTest()
  if (!allowed) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  // Re-verify the admin check independently so a logic bug in
  // canUseAdminBillingTest can't accidentally widen access.
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Parse + validate body.
  let body: { state?: string }
  try {
    body = (await req.json()) as { state?: string }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const state = body.state
  if (typeof state !== 'string' || !(VALID_STATES as string[]).includes(state)) {
    return NextResponse.json(
      {
        error: 'invalid_state',
        message: `state must be one of: ${VALID_STATES.join(', ')}`
      },
      { status: 400 }
    )
  }

  const sb = serviceClient()
  if (!sb) {
    return NextResponse.json(
      { error: 'supabase_not_configured' },
      { status: 503 }
    )
  }

  // Read the current row so we can preserve the existing paid plan for
  // the 'past_due' state and keep real Stripe IDs (we never erase those).
  const { data: current } = await sb
    .from('user_billing' as any)
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  const currentRow = current as any
  const patch = patchForState(state as AdminPlanState, currentRow?.plan ?? null)

  // Build the upsert payload. NEVER set stripe_customer_id or
  // stripe_subscription_id from here — those are real Stripe data and the
  // admin override is app-state-only.
  const payload: Record<string, unknown> = {
    user_id: session.user.id,
    plan: patch.plan ?? currentRow?.plan ?? 'free',
    status: patch.status
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'trial_ends_at')) {
    // Schema requires trial_ends_at NOT NULL with a default; we set it
    // to a far-future date for trial states and to now() for non-trial
    // states (the column default would otherwise persist a stale value).
    payload.trial_ends_at =
      patch.trial_ends_at ?? new Date().toISOString()
  }
  // Clear cancel_at_period_end so the dashboard doesn't show stale flags.
  payload.cancel_at_period_end = false

  const { error: upsertError } = await sb
    .from('user_billing' as any)
    .upsert(payload, { onConflict: 'user_id' })

  if (upsertError) {
    console.error(
      '[admin/billing-test/set-plan] upsert failed:',
      upsertError.message
    )
    return NextResponse.json(
      { error: 'write_failed', message: upsertError.message },
      { status: 500 }
    )
  }

  const hasRealStripeData = Boolean(
    currentRow?.stripe_customer_id || currentRow?.stripe_subscription_id
  )

  return NextResponse.json({
    ok: true,
    state,
    applied: payload,
    warning: hasRealStripeData
      ? 'This user has real Stripe customer/subscription IDs. The admin override changes app billing state only; it does NOT cancel or modify the real Stripe subscription. Use the Stripe dashboard if you need to change billing.'
      : null
  })
}
