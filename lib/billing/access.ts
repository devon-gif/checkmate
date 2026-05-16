/**
 * lib/billing/access.ts
 *
 * Central access-control helper for CheckRay.
 *
 * Returns an AccessResult describing whether a visitor may run an analysis,
 * what tier they are on, and how many checks they have used.
 *
 * Anonymous visitors  → 1 free check total (tracked by cm_anon_id cookie)
 * New signed-up users → 7-day free trial (subscriptions row auto-created)
 * Paying users        → unlimited (status = 'active')
 * Expired trials      → blocked until subscribed
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccessStatus =
  | 'anonymous_free'
  | 'trialing'
  | 'active'
  | 'expired'
  | 'blocked'

export interface AccessResult {
  canAnalyze: boolean
  accessStatus: AccessStatus
  checksUsed: number
  checksLimit: number | null
  trialEndsAt?: string | null
  reason?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIAL_DAYS = 7
const ANON_LIMIT = 1

// ─── Service-role Supabase client ─────────────────────────────────────────────

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      '[billing/access] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

// ─── Main access check ───────────────────────────────────────────────────────

export async function checkAccess({
  userId,
  anonymousId
}: {
  userId?: string | null
  anonymousId?: string | null
}): Promise<AccessResult> {
  const sb = serviceClient()

  // ── Anonymous path ──────────────────────────────────────────────────────────
  if (!userId) {
    if (!anonymousId) {
      // No cookie yet — this is a brand-new visitor, allow and they'll get a
      // cookie set after the check completes.
      return {
        canAnalyze: true,
        accessStatus: 'anonymous_free',
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
        accessStatus: 'blocked',
        checksUsed: used,
        checksLimit: ANON_LIMIT,
        reason:
          "You've used your free check. Create a free account to start your 7-day trial."
      }
    }

    return {
      canAnalyze: true,
      accessStatus: 'anonymous_free',
      checksUsed: used,
      checksLimit: ANON_LIMIT
    }
  }

  // ── Authenticated path ──────────────────────────────────────────────────────
  const { data: existing } = await sb
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let sub: any = existing

  // Auto-create a trial subscription for new users
  if (!sub) {
    const now = new Date()
    const trialEnds = new Date(
      now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
    )

    const { data: created, error: insertError } = await sb
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan: 'trial',
        status: 'trialing',
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString()
      } as any)
      .select()
      .single()

    if (insertError) {
      console.error('[billing/access] Failed to create trial subscription:', insertError)
      return {
        canAnalyze: false,
        accessStatus: 'blocked',
        checksUsed: 0,
        checksLimit: null,
        reason: 'Could not initialise your trial. Please try signing out and back in.'
      }
    }

    sub = created
  }

  const now = new Date()

  // Active paid subscription
  if (sub.status === 'active') {
    return {
      canAnalyze: true,
      accessStatus: 'active',
      checksUsed: 0,
      checksLimit: null,
      trialEndsAt: null
    }
  }

  // Trialing — check whether trial window is still open
  if (sub.status === 'trialing') {
    const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null
    if (trialEnd && now < trialEnd) {
      const daysLeft = Math.ceil(
        (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        canAnalyze: true,
        accessStatus: 'trialing',
        checksUsed: 0,
        checksLimit: null,
        trialEndsAt: sub.trial_ends_at,
        reason: `Trial active — ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining.`
      }
    }

    // Trial window has closed
    return {
      canAnalyze: false,
      accessStatus: 'expired',
      checksUsed: 0,
      checksLimit: null,
      trialEndsAt: sub.trial_ends_at,
      reason:
        'Your free trial has ended. Subscribe to continue using CheckRay.'
    }
  }

  // Any other status (canceled, past_due, unpaid, inactive)
  return {
    canAnalyze: false,
    accessStatus: 'expired',
    checksUsed: 0,
    checksLimit: null,
    reason: 'Your subscription is inactive. Subscribe to continue using CheckRay.'
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
    await (sb as any).from('anonymous_checks').insert({ anonymous_id: anonymousId })
  } catch (err) {
    console.error('[billing/access] Failed to record anonymous check:', err)
  }
}
