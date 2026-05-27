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
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[billing/beta-access] list failed:', error.message)
    return []
  }

  return (data ?? []) as BetaAccessRow[]
}
