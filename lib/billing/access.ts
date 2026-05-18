/**
 * lib/billing/access.ts
 *
 * Central access-control helper for CheckRay.
 *
 * Returns an AccessResult describing whether a visitor may run an analysis,
 * what tier they are on, and how many checks they have used.
 *
 * Anonymous visitors   → 1 free check total (tracked by anonymous_checks table)
 * New signed-up users  → 7-day free trial (user_billing row auto-created)
 * Paying users         → unlimited (status = 'active')
 * Expired trials       → blocked until subscribed
 *
 * Cookie: checkray_anonymous_id  — opaque UUID stored for 90 days.
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { PLAN_MONTHLY_LIMIT, type PlanId } from '@/lib/billing/plans'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccessStatus =
  | 'anonymous_free'    // anonymous, has not yet used their free check
  | 'anonymous_used'    // anonymous, free check already consumed — must sign up
  | 'trialing'          // logged in, trial window open
  | 'active'            // logged in, paid subscription active
  | 'expired'           // logged in, trial ended or subscription canceled
  | 'blocked'           // catch-all for any other blocked state

export interface AccessResult {
  canAnalyze: boolean
  accessStatus: AccessStatus
  plan: PlanId | null
  checksUsed: number
  checksLimit: number | null
  trialEndsAt?: string | null
  reason?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Browser cookie name used to identify anonymous visitors. */
export const ANON_COOKIE_NAME = 'checkray_anonymous_id'

const TRIAL_DAYS = 7
const ANON_LIMIT = 1

// ─── Service-role Supabase client ─────────────────────────────────────────────

/**
 * Returns a service-role Supabase client, or null if envs are missing.
 * Returning null (rather than throwing) lets callers degrade gracefully —
 * a missing env on Vercel must not cause the homepage / new-case page to 500.
 */
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn(
      '[billing/access] Supabase service-role env vars missing; running in permissive fallback mode.'
    )
    return null
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

/**
 * Permissive fallback used whenever Supabase is unreachable or misconfigured.
 * Keeps the user moving instead of locking them out of the product.
 */
function permissiveAnonResult(): AccessResult {
  return {
    canAnalyze: true,
    accessStatus: 'anonymous_free',
    plan: null,
    checksUsed: 0,
    checksLimit: ANON_LIMIT
  }
}

// ─── Main access check ───────────────────────────────────────────────────────

export async function checkAccess({
  userId,
  anonymousId
}: {
  userId?: string | null
  anonymousId?: string | null
}): Promise<AccessResult> {
  try {
    return await checkAccessInner({ userId, anonymousId })
  } catch (err) {
    console.error('[billing/access] checkAccess failed, falling back permissive:', err)
    return permissiveAnonResult()
  }
}

async function checkAccessInner({
  userId,
  anonymousId
}: {
  userId?: string | null
  anonymousId?: string | null
}): Promise<AccessResult> {
  const sb = serviceClient()
  if (!sb) return permissiveAnonResult()

  // ── Anonymous path ──────────────────────────────────────────────────────────
  if (!userId) {
    if (!anonymousId) {
      // Brand-new visitor — no cookie yet. Allow and we'll set the cookie after.
      return {
        canAnalyze: true,
        accessStatus: 'anonymous_free',
        plan: null,
        checksUsed: 0,
        checksLimit: ANON_LIMIT
      }
    }

    const { count } = await sb
      .from('anonymous_checks' as any)
      .select('id', { count: 'exact', head: true })
      .eq('anonymous_id', anonymousId)

    const used = count ?? 0

    if (used >= ANON_LIMIT) {
      return {
        canAnalyze: false,
        accessStatus: 'anonymous_used',
        plan: null,
        checksUsed: used,
        checksLimit: ANON_LIMIT,
        reason:
          "You've used your free check. Create a free account to start your 7-day trial."
      }
    }

    return {
      canAnalyze: true,
      accessStatus: 'anonymous_free',
      plan: null,
      checksUsed: used,
      checksLimit: ANON_LIMIT
    }
  }

  // ── Authenticated path ──────────────────────────────────────────────────────
  const { data: billing } = await sb
    .from('user_billing' as any)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  let row: any = billing

  // Auto-create a trial row for new users
  if (!row) {
    const now = new Date()
    const trialEnds = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

    const { data: created, error: insertError } = await sb
      .from('user_billing' as any)
      .insert({
        user_id: userId,
        plan: 'trial',
        status: 'trialing',
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('[billing/access] Failed to create user_billing row:', insertError)
      return {
        canAnalyze: false,
        accessStatus: 'blocked',
        plan: null,
        checksUsed: 0,
        checksLimit: null,
        reason:
          'Could not initialise your trial. Please try signing out and back in.'
      }
    }

    row = created
  }

  const now = new Date()

  // Resolve the canonical PlanId from the stored plan string
  const planId = (row.plan ?? 'trial') as PlanId
  const monthlyLimit = PLAN_MONTHLY_LIMIT[planId] ?? null

  // Active paid subscription — enforce monthly limit for basic plan
  if (row.status === 'active') {
    // Count checks used this calendar month
    let checksUsedThisMonth = 0
    if (monthlyLimit !== null) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { count } = await sb
        .from('usage_events' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('event_type', 'check_created')
        .gte('created_at', monthStart)
      checksUsedThisMonth = count ?? 0
    }

    if (monthlyLimit !== null && checksUsedThisMonth >= monthlyLimit) {
      return {
        canAnalyze: false,
        accessStatus: 'blocked',
        plan: planId,
        checksUsed: checksUsedThisMonth,
        checksLimit: monthlyLimit,
        reason: `You've used all ${monthlyLimit} checks for this month. Your limit resets at the start of next month.`
      }
    }

    return {
      canAnalyze: true,
      accessStatus: 'active',
      plan: planId,
      checksUsed: checksUsedThisMonth,
      checksLimit: monthlyLimit,
      trialEndsAt: null
    }
  }

  // Trialing — check whether trial window is still open
  if (row.status === 'trialing') {
    const trialEnd = row.trial_ends_at ? new Date(row.trial_ends_at) : null
    if (trialEnd && now < trialEnd) {
      const daysLeft = Math.ceil(
        (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        canAnalyze: true,
        accessStatus: 'trialing',
        plan: 'trial',
        checksUsed: 0,
        checksLimit: null,
        trialEndsAt: row.trial_ends_at,
        reason: `Trial active — ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining.`
      }
    }

    // Trial window has closed — update status
    await sb
      .from('user_billing' as any)
      .update({ status: 'inactive' })
      .eq('user_id', userId)

    return {
      canAnalyze: false,
      accessStatus: 'expired',
      plan: 'trial',
      checksUsed: 0,
      checksLimit: null,
      trialEndsAt: row.trial_ends_at,
      reason: 'Your free trial has ended. Upgrade to continue using CheckRay.'
    }
  }

  // Any other status (canceled, past_due, inactive)
  return {
    canAnalyze: false,
    accessStatus: 'expired',
    plan: planId,
    checksUsed: 0,
    checksLimit: null,
    reason: 'Your subscription is inactive. Upgrade to continue using CheckRay.'
  }
}

// ─── Anonymous check recorder ────────────────────────────────────────────────

/**
 * Records one anonymous check for the given anonymous_id.
 * Call this AFTER the analysis completes successfully.
 * Non-fatal — errors are logged but not propagated.
 */
export async function recordAnonymousCheck(anonymousId: string): Promise<void> {
  try {
    const sb = serviceClient()
    if (!sb) return
    await (sb as any).from('anonymous_checks').insert({ anonymous_id: anonymousId })
  } catch (err) {
    console.error('[billing/access] Failed to record anonymous check:', err)
  }
}
