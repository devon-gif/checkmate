import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { PlanId } from '@/lib/billing/plans'

export type BetaPlan = 'beta_basic' | 'beta_plus' | 'beta_family'

export interface BetaAccessRow {
  id: string
  email: string
  plan: BetaPlan
  status: 'active' | 'revoked'
  expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const BETA_PLANS: BetaPlan[] = [
  'beta_basic',
  'beta_plus',
  'beta_family'
]

export function normalizeBetaEmail(email: string | null | undefined) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function isBetaPlan(value: unknown): value is BetaPlan {
  return typeof value === 'string' && BETA_PLANS.includes(value as BetaPlan)
}

export function betaPlanToBasePlan(plan: BetaPlan): PlanId {
  switch (plan) {
    case 'beta_basic':
      return 'basic'
    case 'beta_plus':
      return 'plus'
    case 'beta_family':
      return 'family'
  }
}

export function betaPlanLabel(plan: BetaPlan) {
  switch (plan) {
    case 'beta_basic':
      return 'Beta — Basic'
    case 'beta_plus':
      return 'Beta — Plus'
    case 'beta_family':
      return 'Beta — Family Protection'
  }
}

export function isBetaAccessActive(
  row: Pick<BetaAccessRow, 'status' | 'expires_at'> | null | undefined,
  now = new Date()
) {
  if (!row || row.status !== 'active') return false
  if (!row.expires_at) return true

  const expiresAt = new Date(row.expires_at)
  if (Number.isNaN(expiresAt.getTime())) return false
  return expiresAt > now
}

export function betaServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export async function getActiveBetaAccessForEmail(
  email: string | null | undefined,
  supabase?: SupabaseClient
): Promise<BetaAccessRow | null> {
  const normalized = normalizeBetaEmail(email)
  if (!normalized) return null

  const sb = supabase ?? betaServiceClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('beta_access' as any)
    .select('id,email,plan,status,expires_at,notes,created_at,updated_at')
    .eq('email', normalized)
    .maybeSingle()

  if (error) {
    console.error('[billing/beta-access] lookup failed:', error.message)
    return null
  }

  const row = data as BetaAccessRow | null
  return isBetaAccessActive(row) ? row : null
}

export async function listBetaAccess(supabase?: SupabaseClient) {
  const sb = supabase ?? betaServiceClient()
  if (!sb) return []

  const { data, error } = await sb
    .from('beta_access' as any)
    .select('id,email,plan,status,expires_at,notes,created_at,updated_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[billing/beta-access] list failed:', error.message)
    return []
  }

  const now = new Date()
  return ((data ?? []) as BetaAccessRow[]).filter(row =>
    isBetaAccessActive(row, now)
  )
}

// ─── Public beta-request queue (manual approval) ───────────────────────────

export type BetaRequestStatus = 'pending' | 'approved' | 'rejected'

export interface BetaRequestRow {
  id: string
  name: string
  email: string
  use_case: string
  note: string | null
  status: BetaRequestStatus
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

/**
 * List all beta requests, newest first. Admin-only consumer; the caller
 * is responsible for the auth gate. Returns an empty array on any DB
 * issue (and logs the cause) — the admin page must not crash if the
 * beta_requests migration hasn't been applied yet on this environment.
 */
export async function listBetaRequests(
  supabase?: SupabaseClient
): Promise<BetaRequestRow[]> {
  const sb = supabase ?? betaServiceClient()
  if (!sb) return []

  const { data, error } = await sb
    .from('beta_requests' as any)
    .select(
      'id,name,email,use_case,note,status,reviewed_at,reviewed_by,created_at,updated_at'
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      '[billing/beta-access] beta_requests list failed:',
      error.message
    )
    return []
  }

  return (data ?? []) as BetaRequestRow[]
}
