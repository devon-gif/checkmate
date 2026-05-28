/**
 * lib/db/user-lookup.ts
 *
 * "Given an email address, give me the auth user id." Used by the
 * inbound-email route (no Supabase session — we only have the sender).
 *
 * Lookup order:
 *   1. `public.users` (citext email column, indexed via the PK chain).
 *      This is the cheap, normal path — every signed-in user gets a row
 *      here once they hit /api/analyze-case (the route upserts it).
 *
 *   2. Fall back to scanning `auth.users` via `auth.admin.listUsers`.
 *      Only used when the beta tester has been granted access but has
 *      never signed in or run a web check, so no `public.users` row
 *      exists yet. listUsers paginates 1k at a time — this is fine for
 *      MVP scale; replace with a server-side function lookup before
 *      this grows past a few thousand auth.users.
 *
 *   3. Optionally upsert a fresh `public.users` row so downstream code
 *      (usage_events, cases, risk_reports — all of which FK to
 *      `public.users.id`) can write cleanly.
 *
 * NEVER throws. Returns `null` when nothing usable is found and logs the
 * cause — callers route through the "unknown_sender" outcome.
 */
import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export interface FoundUser {
  id: string
  email: string
}

/**
 * Lowercase + trim. Emails in `public.users` are citext so case doesn't
 * matter for lookup, but we normalize for the auth.users scan path.
 */
export function normalizeUserEmail(
  email: string | null | undefined
): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

interface FindUserOptions {
  /**
   * If true, attempt to upsert a `public.users` row when the email is
   * found in `auth.users` but not in `public.users`. Defaults to true
   * because every downstream write (usage_events, cases) requires a
   * `public.users.id` foreign key.
   */
  ensurePublicUserRow?: boolean
}

export async function findUserByEmail(
  supabase: SupabaseClient,
  email: string | null | undefined,
  options: FindUserOptions = {}
): Promise<FoundUser | null> {
  const normalized = normalizeUserEmail(email)
  if (!normalized || !normalized.includes('@')) return null

  // ── Step 1: cheap lookup in public.users (citext) ────────────────────────
  const { data: existing, error: existingErr } = await supabase
    .from('users' as any)
    .select('id, email')
    .eq('email', normalized)
    .maybeSingle()

  if (existingErr) {
    console.error(
      '[db/user-lookup] public.users select failed:',
      existingErr.message
    )
    // Don't bail — try auth.users next. A schema-cache miss shouldn't
    // black-hole an inbound email for a real user.
  }

  if (existing && (existing as any).id) {
    return {
      id: (existing as any).id as string,
      email: ((existing as any).email as string) ?? normalized
    }
  }

  // ── Step 2: scan auth.users via admin API ────────────────────────────────
  // We page through up to 5 pages of 1000 each — covers ~5k users which
  // is more than enough at MVP scale. Beyond that, swap this for a
  // server-side function that does an indexed email lookup.
  let authMatch: { id: string; email: string } | null = null
  try {
    const adminAuth = (supabase as any).auth?.admin
    if (adminAuth?.listUsers) {
      const MAX_PAGES = 5
      const PER_PAGE = 1000
      for (let page = 1; page <= MAX_PAGES; page++) {
        const { data, error } = await adminAuth.listUsers({
          page,
          perPage: PER_PAGE
        })
        if (error) {
          console.error(
            `[db/user-lookup] auth.admin.listUsers page ${page} failed:`,
            error.message
          )
          break
        }
        const users = (data?.users ?? []) as Array<{
          id?: string
          email?: string | null
        }>
        const hit = users.find(
          u => typeof u.email === 'string' && u.email.toLowerCase() === normalized
        )
        if (hit?.id && hit.email) {
          authMatch = { id: hit.id, email: hit.email }
          break
        }
        if (users.length < PER_PAGE) break
      }
    }
  } catch (err) {
    console.error(
      '[db/user-lookup] auth.users scan threw (non-fatal):',
      err instanceof Error ? err.message : String(err)
    )
  }

  if (!authMatch) return null

  // ── Step 3: backfill public.users so downstream writes don't FK-fail ─────
  const shouldBackfill = options.ensurePublicUserRow !== false
  if (shouldBackfill) {
    const { error: upsertErr } = await supabase
      .from('users' as any)
      .upsert(
        { id: authMatch.id, email: authMatch.email },
        { onConflict: 'id' }
      )
    if (upsertErr) {
      console.error(
        '[db/user-lookup] public.users backfill failed (non-fatal):',
        upsertErr.message
      )
      // We still return the auth match — callers can decide whether to
      // proceed with case/report writes (which require public.users).
    }
  }

  return { id: authMatch.id, email: authMatch.email }
}
